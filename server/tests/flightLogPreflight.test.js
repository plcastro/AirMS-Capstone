const test = require('node:test');
const assert = require('node:assert/strict');
const { resolvePreflightConfirmation } = require('../utils/flightLogPreflight');
const { pickFlightLogPayloadForRequest } = require('../utils/flightLogPayload');
const FlightLog = require('../models/flightLogModel');
const actorId = '000000000000000000000001';
const users = { findById(id) { assert.equal(id, actorId); return { select() { return { lean: async () => ({ firstName: 'Juan', lastName: 'Cruz' }) }; } }; } };
const confirmation = { status: 'confirmed', signature: 'data:image/png;base64,c2lnbmF0dXJl', remarks: '', resolution: '' };

test('pre-flight confirmation rejects unsigned and unresolved inspections', async () => {
  for (const value of [null, {}, { ...confirmation, status: 'on_hold' }, { ...confirmation, signature: '' }, { ...confirmation, remarks: 'Leak' }]) {
    assert.ok((await resolvePreflightConfirmation(value, actorId, users)).error);
  }
  assert.equal((await resolvePreflightConfirmation(undefined, actorId, users)).value, undefined);
});

test('pre-flight confirmation keeps resolution history and trusts the authenticated signer', async () => {
  const { value } = await resolvePreflightConfirmation({ ...confirmation, userId: 'forged', name: 'Forged', recordedAt: '2000-01-01', remarks: ' Leak ', resolution: ' Repaired and reinspected ' }, actorId, users);
  assert.equal(value.userId, actorId); assert.equal(value.name, 'Juan Cruz');
  assert.equal(value.remarks, 'Leak'); assert.equal(value.resolution, 'Repaired and reinspected');
  assert.ok(value.recordedAt instanceof Date);
  for (const aircraftType of ['AS350B3e', 'B412EP']) {
    const log = new FlightLog({ aircraftType, rpc: 'RP-C123', preFlightInspection: value });
    await log.validate();
    const restored = new FlightLog(JSON.parse(JSON.stringify(log)));
    assert.equal(restored.preFlightInspection.signature, confirmation.signature);
    assert.equal(restored.preFlightInspection.resolution, value.resolution);
  }
});

test('generic edits cannot overwrite a recorded pre-flight signature', () => {
  for (const jobTitle of ['Mechanic', 'Maintenance Manager', 'Pilot']) {
    const payload = pickFlightLogPayloadForRequest({ user: { jobTitle } }, { preFlightInspection: { ...confirmation, signature: 'forged' } }, 'update');
    assert.equal(payload.preFlightInspection, undefined);
  }
});
