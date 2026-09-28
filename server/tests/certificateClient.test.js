const test = require('node:test');
const assert = require('node:assert/strict');
const { certificateDraft, certificateCorrections, certificateSummaryFields, certificateSummaryCorrections, reassessCertificates, createCertificateApi, uploadCertificateFiles } = require('../../shared/certificateClient');

test('simplified certificate form submits only holder, type and qualifications without wiping stored metadata', () => {
  assert.deepEqual(certificateSummaryFields.map(([key]) => key), ['holderName', 'certificateType', 'qualifications']);
  const draft = certificateDraft({ holderName: 'Alex Santos', certificateType: 'Training', qualifications: ['AS350B3e'], limitations: ['Engine not included'], expiryDate: '2010-01-01' });
  assert.deepEqual(certificateSummaryCorrections(draft), { holderName: 'Alex Santos', certificateType: 'Training', qualifications: ['AS350B3e'] });
});

test('old pending certificates are rechecked sequentially and navigation stops the queue', async () => {
  let current = true;
  const calls = [];
  const result = await reassessCertificates([{ id: 'new', needsReassessment: false }, { id: 'old1', needsReassessment: true }, { id: 'old2', needsReassessment: true }], async record => {
    calls.push(record.id); current = false; return { data: { certificate: { id: record.id, status: 'VERIFIED' } } };
  }, () => current);
  assert.deepEqual(calls, ['old1']);
  assert.equal(result[0].status, 'VERIFIED');
  await assert.rejects(reassessCertificates([{ needsReassessment: true }, { needsReassessment: true }], async () => { throw Object.assign(Error('Retry later'), { status: 429 }); }), /Retry later/);
});

test('multiple certificates upload sequentially and preserve successes around invalid or failed files', async () => {
  const files = [
    { name: 'first.pdf', size: 100 }, { name: 'large.jpg', size: 5 * 1024 * 1024 },
    { name: 'invalid.exe', size: 100 }, { name: 'damaged.png', size: 100 }, { name: 'last.jpeg', size: 100 },
  ];
  const calls = [], progress = [];
  let active = 0;
  const results = await uploadCertificateFiles({ files, makeForm: file => file,
    onProgress: (index, total) => progress.push([index, total]),
    send: async file => {
      assert.equal(active++, 0); calls.push(file.name);
      await new Promise(resolve => setImmediate(resolve)); active--;
      if (file.name === 'damaged.png') throw Object.assign(Error('Unreadable image'), { status: 422 });
      return { data: { id: file.name, status: 'PENDING_REVIEW' } };
    },
  });
  assert.deepEqual(calls, ['first.pdf', 'damaged.png', 'last.jpeg']);
  assert.deepEqual(results.map(item => item.status), ['uploaded', 'failed', 'failed', 'failed', 'uploaded']);
  assert.equal(results[4].record.id, 'last.jpeg');
  assert.equal(results[3].message, 'Unreadable image');
  assert.deepEqual(progress, files.map((_, index) => [index + 1, 5]));
});

test('batch uploads stop on rate limits or lost access and report remaining files as skipped', async () => {
  for (const status of [401, 403, 429]) {
    let calls = 0;
    const results = await uploadCertificateFiles({ files: ['a.pdf', 'b.pdf', 'c.pdf'].map(name => ({ name })), makeForm: file => file,
      send: async file => {
        calls++;
        if (calls === 2) throw Object.assign(Error('Retry later'), { status });
        return { data: { id: file.name } };
      },
    });
    assert.equal(calls, 2);
    assert.deepEqual(results.map(item => item.status), ['uploaded', 'failed', 'skipped']);
    assert.match(results[2].message, /Retry later/);
  }
});

test('leaving a mechanic profile stops the remaining upload queue', async () => {
  let current = true, calls = 0;
  const results = await uploadCertificateFiles({ files: [{ name: 'a.pdf' }, { name: 'b.pdf' }], makeForm: file => file,
    isCurrent: () => current, send: async () => { calls++; current = false; return { data: { id: 'saved' } }; },
  });
  assert.equal(calls, 1);
  assert.equal(results[0].record.id, 'saved');
});

test('uploads are read automatically in sequence and preserve accepted and uncertain outcomes', async () => {
  const calls = [];
  const results = await uploadCertificateFiles({ files: [{ name: 'clear.pdf' }, { name: 'unclear.jpg' }], makeForm: item => item,
    send: async file => { calls.push(`upload:${file.name}`); return { data: { id: file.name, revision: 1 } }; },
    analyze: async record => { calls.push(`read:${record.id}`); return { data: { certificate: { ...record, revision: 2, status: record.id === 'clear.pdf' ? 'VERIFIED' : 'PENDING_REVIEW' } } }; },
  });
  assert.deepEqual(calls, ['upload:clear.pdf', 'read:clear.pdf', 'upload:unclear.jpg', 'read:unclear.jpg']);
  assert.deepEqual(results.map(item => item.record.status), ['VERIFIED', 'PENDING_REVIEW']);
});

test('reading failures retain the saved original and reading rate limits stop the rest of the queue', async () => {
  for (const status of [422, 429]) {
    const results = await uploadCertificateFiles({ files: [{ name: 'a.pdf' }, { name: 'b.pdf' }], makeForm: item => item,
      send: async file => ({ data: { id: file.name, revision: 1 } }),
      analyze: async () => { throw Object.assign(Error('Reading unavailable'), { status }); },
    });
    assert.equal(results[0].status, 'uploaded');
    assert.equal(results[0].record.id, 'a.pdf');
    assert.match(results[0].message, /File saved/);
    assert.equal(results[1].status, status === 429 ? 'skipped' : 'uploaded');
  }
});

test('navigation after upload prevents reading or uploading for the abandoned selection', async () => {
  let current = true, reads = 0;
  const results = await uploadCertificateFiles({ files: [{ name: 'a.pdf' }, { name: 'b.pdf' }], makeForm: item => item,
    isCurrent: () => current, send: async () => { current = false; return { data: { id: 'saved' } }; },
    analyze: async () => { reads++; },
  });
  assert.equal(results.length, 1); assert.equal(reads, 0);
});
test('review fields round-trip arrays and dates without losing certificate limitations', () => {
  const source = { holderName: 'Juan Cruz', aircraftRatings: ['AS350B3', 'B412EP'], expiryDate: '2027-01-01', limitations: ['Inspection only', 'Daylight'], doesNotExpire: false };
  const draft = certificateDraft(source);
  const correction = certificateCorrections(draft);
  assert.deepEqual(correction.aircraftRatings, source.aircraftRatings);
  assert.deepEqual(correction.limitations, source.limitations);
  assert.equal(correction.expiryDate, source.expiryDate);
  assert.equal(correction.issueDate, null);
});
test('certificate client sends authenticated multipart without a JSON content type and handles stale reviews', async t => {
  const calls = [];
  t.mock.method(global, 'fetch', async (url, options) => { calls.push({ url, options }); return { ok: true, json: async () => ({ data: { id: 'certificate' } }) }; });
  const api = createCertificateApi('https://airms.example', async () => ({ Authorization: 'Bearer test', 'Content-Type': 'application/json' }));
  const form = new FormData(); form.append('file', new Blob(['document']), 'certificate.pdf');
  await api('/personnel/mechanic', { method: 'POST', body: form, multipart: true });
  assert.equal(calls[0].options.headers['Content-Type'], undefined);
  assert.equal(calls[0].options.headers.Authorization, 'Bearer test');
  assert.equal(calls[0].options.body, form);
  await api('/record/confirm', { method: 'POST', body: { expectedRevision: 2 } });
  assert.equal(calls[1].options.headers['Content-Type'], 'application/json');
  assert.equal(calls[1].options.headers['x-action-confirmed'], 'true');
  global.fetch = async () => ({ ok: false, status: 409, json: async () => ({ message: 'Reload the certificate.' }) });
  await assert.rejects(api('/record/confirm', { method: 'POST', body: {} }), error => error.status === 409 && error.message === 'Reload the certificate.');
});
