const test = require('node:test');
const assert = require('node:assert/strict');
const { populateFlightInputs, automaticFlightUsage, HOUR_FIELDS } = require('../../shared/flightAutomaticInputs');
const { confirmInspection, checklistValues } = require('../utils/flightInspectionConfirmation');
const { flightEditPermissions, nextFlightStep } = require('../../shared/flightWorkflow');
const { transition } = require('../utils/flightWorkflowRules');
const pilot = { id: 'pilot', jobTitle: 'Pilot' }, mechanic = { id: 'mechanic', jobTitle: 'Mechanic' };
const crew = { assignedPilot: { userId: pilot.id }, assignedMechanic: { userId: mechanic.id } };
const legs = [{ flightTimeOff: '23:30', flightTimeOn: '00:45' }, { flightTimeOff: '08:00', flightTimeOn: '08:30' }];

test('hours come from summed flight minutes, landings cannot fall below legs, and engine cycles stay manual', () => {
  const source = { legs, additionalLandings: 2, componentData: { thisFlightData: { airframe: '999', landingCycle: '-4', cycleN1: '.2', cycleN2: '.3', usage: '0.5' } } };
  const result = populateFlightInputs(source);
  for (const key of HOUR_FIELDS) assert.equal(result.componentData.thisFlightData[key], '1.75');
  assert.equal(result.componentData.thisFlightData.landingCycle, '4');
  assert.equal(result.componentData.thisFlightData.cycleN1, '.2');
  assert.equal(result.componentData.thisFlightData.usage, '0.5');
  assert.equal(automaticFlightUsage(legs, -10).landings, 2);
  assert.equal(automaticFlightUsage([...legs, {}]).hours, '');
  assert.equal(source.componentData.thisFlightData.airframe, '999');
});

test('both B412 engines derive hours while engine cycles and sling usage remain distinct', () => {
  const result = populateFlightInputs({ legs, aircraftType: 'B412EP', b412Data: { componentData: { thisFlightData: { engine1: { cycle: '2' }, engine2: { cycle: '3' }, sling: '4' } } } });
  for (const engine of ['engine1', 'engine2']) assert.equal(result.b412Data.componentData.thisFlightData[engine].tsn, '1.75');
  assert.equal(result.b412Data.componentData.thisFlightData.engine2.cycle, '3');
  assert.equal(result.b412Data.componentData.thisFlightData.sling, '4');
});

test('servicing rows follow the basic date and verified initial signature, including newly added legs', () => {
  const signature = { signature: 'data:image/png;base64,verified', userId: mechanic.id };
  const result = populateFlightInputs({ legs, date: '09/21/2026', initialInspectionSignature: signature, fuelServicing: [{ mainAdd: '40', signature: 'untrusted' }], oilServicing: [{ engineRem: 'MIN', engineTot: 'MAX' }] });
  for (const field of ['fuelServicing', 'oilServicing']) for (const row of result[field]) {
    assert.equal(row.date, '09/21/2026'); assert.equal(row.signature, signature.signature);
  }
  assert.equal(result.oilServicing[0].engineRem, 'MIN'); assert.equal(result.fuelServicing[0].mainAdd, '40');
});

test('a Yes checks every AS350 and B412 inspection item; a No records an unsigned hold', () => {
  for (const kind of ['pre', 'post']) for (const aircraftType of ['AS350B3e', 'B412EP']) {
    const record = { aircraftType, workflowHistory: [] };
    const signer = { userId: mechanic.id, signature: 'verified' };
    confirmInspection(record, kind, true, '', signer, mechanic);
    const expected = checklistValues(kind, aircraftType, true);
    for (const [key, value] of Object.entries(expected)) assert.deepEqual(record[key], value);
    assert.equal(record.status, kind === 'pre' ? 'released' : 'completed');
    assert.equal(record.releasedBy.userId, mechanic.id);
    confirmInspection(record, kind, false, 'Oil leak requires investigation', null, mechanic);
    assert.equal(record.status, 'pending'); assert.equal(record.confirmation.allGood, false);
    assert.deepEqual(record.releasedBy, {}); assert.equal(record.workflowHistory.length, 2);
    assert.throws(() => confirmInspection(record, kind, false, '', null, mechanic));
    assert.throws(() => confirmInspection(record, kind, true, '', null, mechanic));
  }
});

test('pilots have no form or amendment privileges and cannot submit or complete a flight', () => {
  for (const status of ['pending_release', 'pending_acceptance', 'accepted', 'submitted', 'completed']) {
    const log = { ...crew, status }, permissions = flightEditPermissions(pilot, log);
    for (const key of ['preparation', 'flight', 'maintenance', 'canSave', 'canReturn', 'canAmend']) assert.equal(permissions[key], false);
    assert.throws(() => transition(log, pilot, 'complete'));
    assert.throws(() => transition(log, pilot, 'submit'));
  }
  assert.equal(nextFlightStep({ status: 'accepted' }).crew, 'assignedMechanic');
  assert.equal(transition({ ...crew, status: 'pending_acceptance' }, pilot, 'accept'), 'accepted');
});

test('bulk confirmation persists every checkbox through the actual aircraft inspection schemas', async () => {
  const models = { pre: require('../models/preInspectionModel'), post: require('../models/postInspectionModel') };
  for (const [kind, Model] of Object.entries(models)) for (const aircraftType of ['AS350B3e', 'B412EP']) {
    const record = new Model({ rpc: 'RP-CTEST', aircraftType, date: '09/21/2026' });
    confirmInspection(record, kind, true, '', { userId: mechanic.id, signature: 'verified' }, mechanic);
    await record.validate();
    const restored = new Model(JSON.parse(JSON.stringify(record)));
    const expected = checklistValues(kind, aircraftType, true);
    if (expected.b412Data) for (const key of Object.keys(expected.b412Data.checks)) assert.equal(restored.b412Data.checks[key], true);
    else for (const key of Object.keys(expected)) assert.equal(restored[key], true);
    assert.equal(restored.confirmation.allGood, true);
  }
});

test('the New Entry confirmation endpoint verifies Yes on the server and stores no PIN', async () => {
  const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
  let saved, verifications = 0;
  const dependencies = {
    '../models/flightInspectionConfirmationModel': { create: async values => { saved = values; return { ...values, _id: 'ticket' }; } },
    '../models/partsMonitoringModel': { findOne: async ({ aircraft }) => aircraft === 'RP-CTEST' ? { aircraftType: 'AS350B3e' } : null },
    './flightWorkflowController': { catchRequest: require('../controllers/flightWorkflowController').catchRequest },
    '../utils/flightWorkflowSigning': { verifyWorkflowSigner: async req => { verifications++; assert.equal(req.body.pin, '123456'); return { userId: mechanic.id, signature: 'verified' }; } },
    '../utils/flightWorkflowRules': require('../utils/flightWorkflowRules'),
    '../utils/flightLogPayload': require('../utils/flightLogPayload'),
  };
  const file = path.join(__dirname, '../controllers/flightEntryConfirmationController.js'), module = { exports: {} };
  vm.compileFunction(fs.readFileSync(file, 'utf8'), ['require', 'module', 'exports'], { filename: file })(name => dependencies[name], module, module.exports);
  const call = async (user, body) => {
    const res = { statusCode: 200, status(value) { this.statusCode = value; return this; }, json(value) { this.body = value; return this; } };
    await module.exports({ user, body }, res); return res;
  };
  assert.equal((await call(pilot, { rpc: 'RP-CTEST', allGood: true, pin: '123456' })).statusCode, 403);
  assert.equal(verifications, 0);
  const yes = await call(mechanic, { rpc: 'rp-ctest', allGood: true, pin: '123456', signature: 'untrusted' });
  assert.equal(yes.statusCode, 201); assert.equal(verifications, 1); assert.equal(saved.signer.signature, 'verified'); assert.equal(saved.pin, undefined);
  assert.equal((await call(mechanic, { rpc: 'RP-CTEST', allGood: false })).statusCode, 400);
  assert.equal((await call(mechanic, { rpc: 'RP-CTEST', allGood: false, remarks: 'Oil leak' })).statusCode, 201);
  assert.equal(saved.signer, null); assert.equal(verifications, 1); assert.equal(saved.allGood, false);
});
