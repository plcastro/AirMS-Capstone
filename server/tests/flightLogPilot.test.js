const test = require('node:test');
const assert = require('node:assert/strict');
const { resolveAssignedPilot } = require('../utils/flightLogPilot');
const { pickFlightLogPayloadForRequest } = require('../utils/flightLogPayload');
const FlightLog = require('../models/flightLogModel');
const id = '000000000000000000000001';
const directory = [{ _id: id, firstName: 'Juan', lastName: 'Dela Cruz', jobTitle: 'Pilot', status: 'active' }];
const users = { findOne(query) { return { select() { return { async lean() { return directory.find(user => Object.entries(query).every(([key, value]) => user[key] === value)) || null; } }; } }; } };

test('assigned pilot is resolved against active pilot accounts and ignores client-supplied names', async () => {
  const result = await resolveAssignedPilot({ userId: id, name: 'Forged' }, null, users);
  assert.deepEqual(result.value, { userId: id, name: 'Juan Dela Cruz' });
  for (const selection of ['bad', { userId: { $ne: null } }, '000000000000000000000002', undefined]) {
    assert.ok((await resolveAssignedPilot(selection, null, users)).error);
  }
  for (const [key, value] of [['status', 'inactive'], ['jobTitle', 'Mechanic']]) {
    const original = directory[0][key]; directory[0][key] = value;
    assert.ok((await resolveAssignedPilot(id, null, users)).error);
    directory[0][key] = original;
  }
});

test('unchanged historical pilot assignments and optional clearing remain supported', async () => {
  const existing = { userId: '000000000000000000000002', name: 'Former Pilot' };
  assert.deepEqual((await resolveAssignedPilot({ userId: existing.userId, name: 'Forged' }, existing, users)).value, existing);
  assert.equal((await resolveAssignedPilot(null, existing, users)).value, null);
});

test('assigned pilot survives create/update filtering and both aircraft schemas', async () => {
  const assignedPilot = { userId: id, name: 'Juan Dela Cruz' };
  for (const jobTitle of ['Mechanic', 'Maintenance Manager', 'Pilot']) for (const operation of ['create', 'update']) {
    assert.deepEqual(pickFlightLogPayloadForRequest({ user: { jobTitle } }, { assignedPilot }, operation).assignedPilot, assignedPilot);
  }
  for (const aircraftType of ['AS350B3e', 'B412EP']) {
    const record = new FlightLog({ aircraftType, rpc: 'RP-C1234', assignedPilot });
    await record.validate();
    const restored = new FlightLog(JSON.parse(JSON.stringify(record)));
    assert.equal(String(restored.assignedPilot.userId), id);
    assert.equal(restored.assignedPilot.name, assignedPilot.name);
    assert.equal(new FlightLog({ aircraftType, rpc: 'RP-C1234' }).assignedPilot, null);
  }
});

test('pilot-options query exposes only active pilot IDs and names', async () => {
  const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
  const file = path.join(__dirname, '../utils/flightLogPilot.js');
  const module = { exports: {} };
  const stub = { find(query) {
    assert.deepEqual(query, { jobTitle: 'Pilot', status: 'active' });
    return { select(fields) {
      assert.equal(fields, 'firstName lastName');
      return { sort() { return { lean: async () => [{ ...directory[0], email: 'not-returned@example.com' }] }; } };
    } };
  } };
  vm.compileFunction(fs.readFileSync(file, 'utf8'), ['require', 'module', 'exports'], { filename: file })(() => stub, module, module.exports);
  let response;
  await module.exports.getAssignedPilotOptions({}, { json(value) { response = value; }, status() { return this; } });
  assert.deepEqual(response, { success: true, data: [{ userId: id, name: 'Juan Dela Cruz' }] });
});
