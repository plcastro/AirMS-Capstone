const assert = require('node:assert/strict');
const test = require('node:test');
const {
  describeHistoryEvent,
  describeAmendment,
  EMPTY_VALUE,
} = require('../../shared/flightHistoryFormat');

test('before/after diffs become one row per changed leaf field', () => {
  const event = describeHistoryEvent({
    action: 'save_draft', at: '2026-09-20T10:00:00Z', actorName: 'Assigned Mechanic', version: 3,
    changes: {
      controlNo: { before: 'CN-1', after: 'CN-2' },
      componentData: {
        before: { thisFlight: { airframe: 1.2, engine: 1.2 } },
        after: { thisFlight: { airframe: 1.5, engine: 1.2 } },
      },
      remarks: { before: '', after: 'Checked' },
    },
  });
  assert.equal(event.title, 'Save draft');
  assert.equal(event.changedBy, 'Assigned Mechanic');
  assert.deepEqual(event.rows, [
    { field: 'Control No', before: 'CN-1', after: 'CN-2' },
    { field: 'Component Data › This Flight › Airframe', before: '1.2', after: '1.5' },
    { field: 'Remarks', before: EMPTY_VALUE, after: 'Checked' },
  ]);
});

test('detail-only events, people, ids and signature images are readable', () => {
  const event = describeHistoryEvent({
    action: 'created', signer: { name: 'Pilot One', signature: 'data:image/png;base64,AAAA' },
    changes: {
      rpc: 'RP-C1234',
      assignedPilot: { name: 'Pilot One', userId: 'abc' },
      inspectionId: '64b000000000000000000000',
      confirmation: { allGood: true, remarks: '' },
    },
  });
  assert.equal(event.changedBy, 'Pilot One');
  assert.deepEqual(event.rows.map((row) => [row.field, row.after]), [
    ['Rpc', 'RP-C1234'],
    ['Assigned Pilot', 'Pilot One'],
    ['Confirmation › All Good', 'Yes'],
  ]);
  assert.ok(!JSON.stringify(event).includes('base64'));
});

test('missing or malformed history data never throws', () => {
  for (const changes of [undefined, null, 'text', [], {}, { legs: { before: null, after: [] } }]) {
    const event = describeHistoryEvent({ changes });
    assert.deepEqual(event.rows, []);
    assert.equal(event.at, EMPTY_VALUE);
    assert.equal(event.changedBy, 'Unknown user');
  }
  assert.equal(describeAmendment({}).rows[0].after, EMPTY_VALUE);
});

test('large diffs are capped with a count of hidden rows', () => {
  const before = Object.fromEntries(Array.from({ length: 50 }, (_, i) => [`f${i}`, i]));
  const after = Object.fromEntries(Array.from({ length: 50 }, (_, i) => [`f${i}`, i + 1]));
  const event = describeHistoryEvent({ changes: { data: { before, after } } });
  assert.equal(event.rows.length, 40);
  assert.equal(event.hiddenCount, 10);
});
