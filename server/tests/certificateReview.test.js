const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { once } = require('node:events');
const { createCertificateReviewService, businessDate } = require('../services/certificates/certificateReviewService');
const { validateCorrections, normalizeReviewData, reviewErrors } = require('../services/certificates/certificateReviewData');
const { createCertificateController } = require('../controllers/certificateController');
const { createCertificateRouter } = require('../routes/certificateRoute');
const Certificate = require('../models/certificateRecordModel');
const Audit = require('../models/certificateAuditModel');
const { parseCertificateFields } = require('../services/certificates/certificateFieldParser');

const owner = '111111111111111111111111', manager = '222222222222222222222222', id = '333333333333333333333333';
const other = '444444444444444444444444', secondId = '555555555555555555555555';
const req = (jobTitle = 'mechanic', userId = owner) => ({ user: { id: userId, jobTitle } });
const reviewer = () => req('maintenance manager', manager);
const fields = () => ({ holderName: 'Juan Dela Cruz', certificateType: 'Certificate of Training', certificateNumber: 'CERT-001',
  issuingAuthority: 'Training school', issueDate: '2025-01-01', expiryDate: '2027-01-01', doesNotExpire: false,
  aircraftRatings: ['Bell 412 EP'], unknownAircraftRatings: [], qualifications: [], taskAuthorizations: [], limitations: [],
  warnings: [{ code: 'LOW_OCR_CONFIDENCE' }], rawText: 'Original certificate text', confidence: 0.5,
  originalExtractedFields: { holderName: ['Juan Dela Cruz'], aircraftRatings: ['Bell 412 EP'] }, requiresManualReview: true });
const pending = () => ({ _id: id, personnelId: owner, uploadedBy: owner, status: 'PENDING_REVIEW', processingStatus: 'UPLOADED', revision: 1,
  file: { provider: 'local', key: 'private.png', originalName: 'certificate.png', mimeType: 'image/png', size: 100, sha256: 'a'.repeat(64) } });

function fixture(options = {}) {
  let state = new Map([[id, pending()]]), events = [], current = new Date('2026-09-28T01:00:00Z');
  let reads = 0, failAudit = false;
  const calls = [];
  const query = fn => {
    let session;
    const result = { select: () => result, sort: () => result, session: value => { session = value; return result; }, lean: async () => structuredClone(fn(session)) };
    return result;
  };
  const table = session => session?.records || state;
  const matches = (record, filter) => Object.entries(filter).every(([key, value]) => String(record[key]) === String(value));
  const records = {
    findById: key => query(session => table(session).get(String(key)) || null),
    find: filter => query(session => [...table(session).values()].filter(record => matches(record, filter))),
    findOneAndUpdate: (filter, update, settings) => query(() => {
      calls.push({ filter, update, settings });
      const rows = table(settings.session), row = [...rows.values()].find(record => matches(record, filter));
      if (!row) return null;
      Object.assign(row, structuredClone(update.$set));
      if (update.$inc) row.revision += update.$inc.revision;
      return row;
    }),
  };
  const service = createCertificateReviewService({ records,
    users: {
      findById: key => query(() => options.missingUser ? null : { _id: key, jobTitle: options.role || 'Mechanic', firstName: 'Juan', lastName: 'Dela Cruz' }),
      find: filter => query(() => [{ _id: owner, firstName: 'Juan', lastName: 'Cruz' }, { _id: other, firstName: 'Ana', lastName: 'Reyes' }].filter(person => !filter._id || person._id === filter._id)),
    },
    audit: { create: async (items, settings) => {
      if (failAudit) throw Error('Audit unavailable');
      for (const item of items) { await new Audit(item).validate(); settings.session.events.push(structuredClone(item)); }
    } },
    transaction: async callback => {
      const session = { records: structuredClone(state), events: structuredClone(events) };
      await callback(session);
      state = session.records; events = session.events;
    },
    now: () => current,
    readCertificate: async () => {
      reads++;
      if (options.readError) throw options.readError;
      const record = state.get(id);
      const analysis = { sourceRevision: record.revision, sourceSha256: record.file.sha256,
        certificateData: { ...fields(), ...options.fields }, extraction: { rawText: 'Original certificate text', pages: [] },
        holderMatch: { status: 'LIKELY_MATCH', suggestedPersonnelId: owner } };
      if (options.onRead) options.onRead(record, analysis);
      return analysis;
    },
    matchHolder: async (request, holderName) => ({ status: 'LIKELY_MATCH', holderName, suggestedPersonnelId: owner }),
  });
  return { service, calls, reads: () => reads, events: () => events, record: () => state.get(id),
    add: record => state.set(record._id, record), clock: date => { current = new Date(date); }, failAudit: () => { failAudit = true; } };
}
const analyze = f => f.service.analyze(req(), id, { expectedRevision: f.record().revision });
const confirmBody = f => ({ expectedRevision: f.record().revision, confirmedPersonnelId: owner, sourceReviewed: true, reviewNote: 'Compared the source image, name, aircraft and dates.' });
const confirm = f => f.service.confirm(reviewer(), id, confirmBody(f));

function automaticFixture(options = {}) {
  const rawText = 'Certificate of Training\nHolder Name: Juan Dela Cruz\nCertificate Number: AUTO-123\nAircraft Ratings: Bell 412 EP\nIssue Date: 2025-01-01\nExpiry Date: 2027-01-01';
  const extraction = { rawText, pages: [{ page: 1, method: 'OCR', confidence: 0.99, text: rawText }] };
  return fixture({ ...options, fields: { ...parseCertificateFields(extraction), ...options.fields }, onRead(record, analysis) {
    analysis.extraction = structuredClone(extraction);
    analysis.holderMatch = { status: 'LIKELY_MATCH', suggestedPersonnelId: owner, candidates: [{ personnelId: owner, score: 1 }] };
    options.onRead?.(record, analysis);
  } });
}

test('clear complete readings are accepted automatically without a reviewer, with atomic audit and actual eligibility', async () => {
  const f = automaticFixture();
  const result = await analyze(f);
  assert.equal(result.certificate.status, 'VERIFIED');
  assert.equal(result.certificate.verificationMethod, 'AUTOMATIC');
  assert.equal(result.certificate.reviewedBy, null);
  assert.equal(result.certificate.reviewedAt, null);
  assert.ok(result.certificate.verifiedAt);
  assert.equal(result.preview, null);
  assert.deepEqual(result.certificate.verificationDecision.reasons, []);
  assert.equal(result.certificate.analysis.certificateData.requiresManualReview, true); // Original draft evidence is preserved.
  assert.equal((await f.service.qualifications(req(), owner)).results[1].qualified, true);
  assert.deepEqual(f.events().map(item => item.action), ['AUTO_VERIFIED']);
  assert.equal(f.events()[0].details.sourceReviewed, undefined);
  assert.equal(f.events()[0].details.qualificationDecision.results[1].allTasksAllowed, true);
  await new Certificate(f.record()).validate();
  await assert.rejects(analyze(f), error => error.status === 409);
  await f.service.disposition(reviewer(), id, { expectedRevision: 2, reviewNote: 'Withdrawn source.' }, 'REVOKED');
  assert.equal((await f.service.qualifications(req(), owner)).results[1].qualified, false);
});

test('automatic acceptance accepts clear embedded PDF text without inventing an OCR score', async () => {
  const f = automaticFixture({ onRead(record, analysis) {
    analysis.extraction.pages[0].method = 'PDF_TEXT'; analysis.extraction.pages[0].confidence = null;
    analysis.certificateData.evidence.forEach(item => { item.method = 'PDF_TEXT'; item.confidence = null; });
  } });
  assert.equal((await analyze(f)).certificate.status, 'VERIFIED');
});

test('unclear, incomplete, conflicting and mismatched readings return reasons instead of automatic acceptance', async () => {
  const cases = [
    { onRead: (record, data) => { data.extraction.pages[0].confidence = 0.94; } },
    { onRead: (record, data) => { data.extraction.pages.push({ page: 2, method: 'OCR', text: '', confidence: 0.99 }); } },
    { onRead: (record, data) => { data.extraction.pages[0].alternateText = 'conflicting text'; data.extraction.pages[0].alternateConfidence = 0.7; } },
    { onRead: (record, data) => { data.extraction.pages[0].method = 'UNSUPPORTED'; } },
    { fields: { expiryDate: null } }, { fields: { holderName: null } },
    { fields: { aircraftRatings: ['Bell 412'] } }, { fields: { limitations: ['Engine not included'] } },
    { fields: { evidence: [] } }, { fields: { warnings: [{ code: 'CONFLICTING_VALUES', field: 'certificateNumber' }] } },
    { onRead: (record, data) => { data.holderMatch.status = 'AMBIGUOUS'; } },
    { onRead: (record, data) => { data.holderMatch.suggestedPersonnelId = other; } },
    { onRead: (record, data) => { data.holderMatch.candidates[0].score = 0.97; } },
  ];
  for (const options of cases) {
    const f = automaticFixture(options), result = await analyze(f);
    assert.equal(result.certificate.status, 'PENDING_REVIEW');
    assert.ok(result.certificate.verificationDecision.reasons.length);
    assert.equal((await f.service.qualifications(req(), owner)).results.some(item => item.qualified), false);
  }
});

test('automatic acceptance cannot bypass audit failure, stale sources, expiry or provenance checks', async () => {
  const rollback = automaticFixture(); rollback.failAudit();
  await assert.rejects(analyze(rollback), /Audit unavailable/);
  assert.equal(rollback.record().revision, 1);
  assert.equal(rollback.record().status, 'PENDING_REVIEW');
  const stale = automaticFixture({ onRead: record => { record.revision++; } });
  await assert.rejects(analyze(stale), error => error.status === 409);
  assert.equal(stale.record().status, 'PENDING_REVIEW');
  const f = automaticFixture(); await analyze(f);
  f.clock('2027-01-01T16:00:00Z');
  assert.equal((await f.service.qualifications(req(), owner)).results[1].qualified, false);
  f.clock('2026-09-28T01:00:00Z');
  f.record().verificationDecision.certificateId = secondId;
  assert.equal((await f.service.qualifications(req(), owner)).results[1].qualified, false);
  const corrected = automaticFixture({ fields: { holderName: null } }); await analyze(corrected);
  await corrected.service.correct(req(), id, { expectedRevision: 2, corrections: { holderName: 'Juan Dela Cruz' }, reviewNote: 'Corrected name.' });
  assert.equal(corrected.record().status, 'PENDING_REVIEW'); // Client edits cannot manufacture automatic evidence.
});

test('analysis is pending and provisional; low confidence needs explicit authorized confirmation', async () => {
  const f = fixture();
  const result = await analyze(f);
  assert.equal(result.certificate.status, 'PENDING_REVIEW');
  assert.equal(result.certificate.revision, 2);
  assert.equal(result.certificate.reviewedBy, null);
  assert.deepEqual(result.certificate.normalizedData.aircraftRatings, ['B412EP']);
  assert.equal(result.preview.provisional, true);
  assert.equal(result.preview.grantsQualifications, false);
  assert.equal(result.preview.results.find(item => item.aircraft === 'B412EP').allTasksAllowed, true);
  assert.equal((await f.service.qualifications(req(), owner)).results.some(item => item.qualified), false);
  const verified = await confirm(f);
  assert.equal(verified.status, 'VERIFIED');
  assert.equal(verified.reviewedBy, manager);
  assert.equal(verified.analysis.certificateData.confidence, 0.5);
  const actual = await f.service.qualifications(req(), owner);
  assert.equal(actual.results.find(item => item.aircraft === 'B412EP').allTasksAllowed, true);
  assert.equal(actual.results.find(item => item.aircraft === 'AS350B3').qualified, false);
  assert.deepEqual(f.events().map(event => event.action), ['ANALYZED', 'VERIFIED']);
  assert.equal(f.events()[1].details.sourceReviewed, true);
  assert.equal(f.events()[1].details.qualificationDecision.results[1].ruleCode, 'VERIFIED_AIRCRAFT_CERTIFICATE_ALL_TASKS');
  await new Certificate(f.record()).validate();
});

test('corrections preserve OCR evidence, normalize aliases and recompute both aircraft previews', async () => {
  const f = fixture({ fields: { holderName: 'Jvan Dela Cruz', aircraftRatings: [], unknownAircraftRatings: ['B412 EF'] } });
  await analyze(f);
  await assert.rejects(confirm(f), error => error.status === 422);
  const result = await f.service.correct(req(), id, { expectedRevision: 2,
    corrections: { holderName: 'Juan Dela Cruz', aircraftRatings: ['Bell 412 EP', 'Eurocopter AS350 B3'] }, reviewNote: 'Fixed OCR errors against the source.' });
  assert.equal(result.certificate.analysis.certificateData.holderName, 'Jvan Dela Cruz');
  assert.equal(result.certificate.normalizedData.holderName, 'Juan Dela Cruz');
  assert.deepEqual(result.certificate.normalizedData.aircraftRatings, ['B412EP', 'AS350B3']);
  assert.equal(result.certificate.holderMatch.holderName, 'Juan Dela Cruz');
  assert.equal(result.preview.results.every(item => item.allTasksAllowed), true);
  assert.equal(f.events()[1].details.before.holderName, 'Jvan Dela Cruz');
  await confirm(f);
  assert.equal((await f.service.qualifications(req(), owner)).results.every(item => item.qualified), true);
});

test('permissions, explicit owner selection and source acknowledgment prevent automatic verification', async () => {
  const f = fixture();
  await assert.rejects(f.service.analyze(req('mechanic', other), id, { expectedRevision: 1 }), error => error.status === 403);
  assert.equal(f.reads(), 0);
  await analyze(f);
  for (const role of ['mechanic', 'pilot', 'officer-in-charge', 'warehouse personnel']) {
    await assert.rejects(f.service.confirm(req(role), id, confirmBody(f)), error => error.status === 403);
  }
  await assert.rejects(f.service.confirm(reviewer(), id, { ...confirmBody(f), sourceReviewed: false }), error => error.status === 400);
  await assert.rejects(f.service.confirm(reviewer(), id, { ...confirmBody(f), confirmedPersonnelId: other }), error => error.status === 409);
  await assert.rejects(f.service.qualifications(req('mechanic', other), owner), error => error.status === 403);
  await assert.rejects(f.service.correct(req('mechanic', other), id, { expectedRevision: 2, corrections: { holderName: 'Other' }, reviewNote: 'Correction' }), error => error.status === 403);
  assert.equal(f.record().status, 'PENDING_REVIEW');
  assert.equal((await f.service.confirm(req('superadmin', manager), id, confirmBody(f))).status, 'VERIFIED');
});

test('stale corrections/confirmations and concurrent analysis cannot overwrite later revisions', async () => {
  const f = fixture();
  await analyze(f);
  const old = confirmBody(f);
  await f.service.correct(req(), id, { expectedRevision: 2, corrections: { certificateNumber: 'CORRECT' }, reviewNote: 'Read number from original.' });
  await assert.rejects(f.service.confirm(reviewer(), id, old), error => error.status === 409);
  await assert.rejects(f.service.correct(req(), id, { expectedRevision: 2, corrections: { certificateNumber: 'STALE' }, reviewNote: 'Old review' }), error => error.status === 409);
  assert.equal(f.record().normalizedData.certificateNumber, 'CORRECT');
  const concurrent = fixture({ onRead: record => { record.revision++; } });
  await assert.rejects(analyze(concurrent), error => error.status === 409);
  assert.equal(concurrent.record().processingStatus, 'UPLOADED');
  assert.deepEqual(concurrent.events(), []);
});

test('auditing and verification share a transaction and audit failure rolls back eligibility', async () => {
  const f = fixture();
  await analyze(f);
  f.failAudit();
  await assert.rejects(confirm(f), /Audit unavailable/);
  assert.equal(f.record().status, 'PENDING_REVIEW');
  assert.equal(f.record().revision, 2);
  assert.equal(f.events().length, 1);
  assert.equal((await f.service.qualifications(req(), owner)).results.some(item => item.qualified), false);
  assert.ok(f.calls.every(call => call.settings.session && call.settings.runValidators));
});

test('expiry is re-evaluated using Manila date and multiple verified sources can cover an aircraft', async () => {
  const f = fixture({ fields: { expiryDate: '2026-09-28' } });
  await analyze(f); await confirm(f);
  assert.equal((await f.service.qualifications(req(), owner)).results[1].qualified, true);
  f.clock('2026-09-28T16:00:00Z');
  assert.equal(businessDate(new Date('2026-09-28T16:00:00Z')), '2026-09-29');
  assert.equal((await f.service.qualifications(req(), owner)).results[1].qualified, false);
  f.add({ ...structuredClone(f.record()), _id: secondId, normalizedData: { ...f.record().normalizedData, expiryDate: '2028-01-01' } });
  const combined = await f.service.qualifications(req(), owner);
  assert.equal(combined.results[1].qualified, true);
  assert.deepEqual(combined.results[1].sourceCertificates, [secondId]);
  f.add({ ...structuredClone(f.record()), _id: secondId, status: 'REVOKED', normalizedData: { ...f.record().normalizedData, expiryDate: '2028-01-01' } });
  assert.equal((await f.service.qualifications(req(), owner)).results[1].qualified, false);
});

test('verified restrictions and expired certificates never grant all-task eligibility', async () => {
  for (const data of [{ limitations: ['Inspection only'] }, { expiryDate: '2025-06-01' }, { issueDate: '2026-12-01' }]) {
    const f = fixture({ fields: data });
    await analyze(f); await confirm(f);
    assert.equal(f.record().status, 'VERIFIED');
    assert.equal((await f.service.qualifications(req(), owner)).results.some(item => item.allTasksAllowed), false);
  }
});

test('missing expiry/aircraft/name and malformed corrections require resolution, never client eligibility fields', async () => {
  const extracted = fields();
  assert.equal(reviewErrors(normalizeReviewData({ ...extracted, unknownAircraftRatings: ['B412'] })).length, 1);
  for (const corrections of [{ expiryDate: '2026-02-30' }, { aircraftRatings: 'B412EP' }, { status: 'VERIFIED' }, { reviewedBy: manager }, { __proto__: null, doesNotExpire: 'true' }, { limitations: [null] }]) assert.throws(() => validateCorrections(corrections), error => error.status === 400);
  for (const changes of [{ expiryDate: null }, { aircraftRatings: [] }, { holderName: null }, { expiryDate: '2024-01-01' }, { doesNotExpire: true }]) {
    assert.ok(reviewErrors(normalizeReviewData(extracted, changes)).length);
  }
  assert.deepEqual(reviewErrors(normalizeReviewData(extracted, { expiryDate: null, doesNotExpire: true })), []);
  const f = fixture();
  await assert.rejects(f.service.analyze(req(), id, { expectedRevision: 1, status: 'VERIFIED' }), error => error.status === 400);
  await assert.rejects(f.service.analyze(req(), id, { expectedRevision: '1' }), error => error.status === 400);
  await analyze(f);
  await assert.rejects(f.service.confirm(reviewer(), id, { ...confirmBody(f), reviewedBy: other }), error => error.status === 400);
  assert.equal(f.record().reviewedBy, undefined);
});

test('failed reading is audited without granting eligibility; resource contention leaves revision unchanged', async () => {
  const f = fixture({ readError: Object.assign(Error('unreadable'), { status: 422 }) });
  await assert.rejects(analyze(f), /unreadable/);
  assert.equal(f.record().processingStatus, 'FAILED');
  assert.equal(f.record().status, 'PENDING_REVIEW');
  assert.equal(f.events()[0].action, 'ANALYSIS_FAILED');
  const busy = fixture({ readError: Object.assign(Error('busy'), { status: 429 }) });
  await assert.rejects(analyze(busy), /busy/);
  assert.equal(busy.record().revision, 1);
});

test('saved analysis and verified records are protected from reruns and edits; previews do not write', async () => {
  const f = fixture();
  await analyze(f);
  await assert.rejects(analyze(f), error => error.status === 409);
  await f.service.preview(req(), id, { expectedRevision: 2 });
  assert.equal(f.record().revision, 2);
  assert.equal(f.events().length, 1);
  await confirm(f);
  await assert.rejects(confirm(f), error => error.status === 409);
  await assert.rejects(f.service.correct(req(), id, { expectedRevision: 3, corrections: { limitations: [] }, reviewNote: 'Change' }), error => error.status === 409);
});

test('reviewers may reject pending records or revoke verified sources with an immutable reasoned audit', async () => {
  const f = fixture();
  await analyze(f); await confirm(f);
  const body = { expectedRevision: 3, reviewNote: 'Issuing authority withdrew this certificate.' };
  await assert.rejects(f.service.disposition(req(), id, body, 'REVOKED'), error => error.status === 403);
  await f.service.disposition(reviewer(), id, body, 'REVOKED');
  assert.equal(f.record().status, 'REVOKED');
  assert.ok(f.record().revokedAt);
  assert.equal((await f.service.qualifications(req(), owner)).results.some(result => result.qualified), false);
  assert.equal(f.events().at(-1).action, 'REVOKED');
  assert.equal(f.events().at(-1).details.reviewNote, body.reviewNote);
  await assert.rejects(f.service.disposition(reviewer(), id, body, 'REVOKED'), error => error.status === 409);
  const pending = fixture();
  await pending.service.disposition(reviewer(), id, { expectedRevision: 1, reviewNote: 'Not a certificate.' }, 'REJECTED');
  await assert.rejects(analyze(pending), error => error.status === 409);
  assert.equal(pending.record().status, 'REJECTED');
});

test('certificate directory shows only the caller to mechanics and names only to managers', async () => {
  const f = fixture();
  assert.deepEqual(await f.service.directory(req()), [{ id: owner, name: 'Juan Cruz' }]);
  const directory = await f.service.directory(reviewer());
  assert.equal(directory.length, 2);
  assert.deepEqual(Object.keys(directory[0]).sort(), ['id', 'name']);
  await assert.rejects(f.service.directory(req('pilot')), error => error.status === 403);
});

test('review HTTP workflow enforces authentication, body size, revisions and reviewer permission', async t => {
  const f = fixture(), app = express();
  app.use(express.json({ limit: '10mb' })); // Exercise the actual application's pre-parsed body case.
  const authenticate = (request, response, next) => {
    if (!request.headers['test-role']) return response.sendStatus(401);
    request.user = req(request.headers['test-role'], request.headers['test-role'] === 'mechanic' ? owner : manager).user;
    next();
  };
  app.use('/api/certificates', createCertificateRouter({ authenticate, controller: createCertificateController(undefined, undefined, f.service) }));
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }));
  const base = `http://127.0.0.1:${server.address().port}/api/certificates`;
  const send = (path, body, role = 'mechanic', method = 'POST', confirmed = true) => fetch(`${base}${path}`, {
    method, headers: { 'content-type': 'application/json', ...(role ? { 'test-role': role } : {}), ...(confirmed ? { 'x-action-confirmed': 'true' } : {}) }, body: JSON.stringify(body),
  });
  assert.equal((await send(`/${id}/analyze`, { expectedRevision: 1 }, null)).status, 401);
  assert.equal((await send(`/${id}/analyze`, { expectedRevision: 1 }, 'mechanic', 'POST', false)).status, 400);
  assert.equal((await send(`/${id}/analyze`, { expectedRevision: 1 })).status, 200);
  const preview = await send(`/${id}/preview`, { expectedRevision: 2 });
  assert.equal(preview.status, 200);
  assert.equal(preview.headers.get('cache-control'), 'private, no-store');
  assert.equal((await send(`/${id}/review`, { expectedRevision: 2, reviewNote: 'x'.repeat(70000) }, 'mechanic', 'PATCH')).status, 413);
  assert.equal((await send(`/${id}/confirm`, confirmBody(f))).status, 403);
  assert.equal((await send(`/${id}/confirm`, confirmBody(f), 'maintenance manager')).status, 200);
  const actual = await fetch(`${base}/personnel/${owner}/qualifications`, { headers: { 'test-role': 'mechanic' } });
  assert.equal(actual.status, 200);
  assert.equal((await actual.json()).data.results[1].allTasksAllowed, true);
});
