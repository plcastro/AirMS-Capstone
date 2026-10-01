const test = require('node:test');
const assert = require('node:assert/strict');
const { populateFlightInputs, automaticFlightUsage, HOUR_FIELDS } = require('../../shared/flightAutomaticInputs');
const { confirmInspection, checklistValues, checklistKeys } = require('../utils/flightInspectionConfirmation');
const { flightEditPermissions, nextFlightStep } = require('../../shared/flightWorkflow');
const { transition } = require('../utils/flightWorkflowRules');
const pilot = { id: 'pilot', jobTitle: 'Pilot' }, mechanic = { id: 'mechanic', jobTitle: 'Mechanic' };
const crew = { assignedPilot: { userId: pilot.id }, assignedMechanic: { userId: mechanic.id } };
const legs = [{ totalTimeOff: '01:15', flightTimeOff: '23:30', flightTimeOn: '00:45' }, { totalTimeOff: '00:30', flightTimeOff: '08:00', flightTimeOn: '08:30' }];

test('component hours use the original per-leg duration table, landings cannot fall below legs, and engine cycles stay manual', () => {
  const source = { legs, additionalLandings: 2, componentData: { thisFlightData: { airframe: '999', landingCycle: '-4', cycleN1: '.2', cycleN2: '.3', usage: '0.5' } } };
  const result = populateFlightInputs(source);
  for (const key of HOUR_FIELDS) assert.equal(result.componentData.thisFlightData[key], '1.8');
  assert.equal(result.componentData.thisFlightData.landingCycle, '4');
  assert.equal(result.componentData.thisFlightData.cycleN1, '.2');
  assert.equal(result.componentData.thisFlightData.usage, '0.5');
  assert.equal(automaticFlightUsage(legs, -10).landings, 2);
  assert.equal(automaticFlightUsage([...legs, {}]).hours, '');
  assert.equal(source.componentData.thisFlightData.airframe, '999');
});

test('both B412 engines derive hours while engine cycles and sling usage remain distinct', () => {
  const result = populateFlightInputs({ legs, aircraftType: 'B412EP', b412Data: { componentData: { thisFlightData: { engine1: { cycle: '2' }, engine2: { cycle: '3' }, sling: '4' } } } });
  for (const engine of ['engine1', 'engine2']) assert.equal(result.b412Data.componentData.thisFlightData[engine].tsn, '1.8');
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

test('signing needs every AS350 and B412 item checked or flagged; nothing is auto-ticked; a No records an unsigned hold', () => {
  for (const kind of ['pre', 'post']) for (const aircraftType of ['AS350B3e', 'B412EP']) {
    const record = { aircraftType, workflowHistory: [] };
    const signer = { userId: mechanic.id, signature: 'verified' };
    assert.throws(() => confirmInspection({ aircraftType, workflowHistory: [] }, kind, true, '', signer, mechanic), /not checked/);
    assert.throws(() => confirmInspection({ aircraftType, workflowHistory: [] }, kind, true, '', signer, mechanic, { checked: checklistKeys(kind, aircraftType).slice(1) }), /not checked/);
    confirmInspection(record, kind, true, '', signer, mechanic, { checked: checklistKeys(kind, aircraftType) });
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
    confirmInspection(record, kind, true, '', { userId: mechanic.id, signature: 'verified' }, mechanic, { checked: checklistKeys(kind, aircraftType) });
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
    '../utils/flightWorkflowSigning': { verifyWorkflowSigner: async req => { verifications++; assert.equal(req.body.pin, '123456'); return { userId: req.user.id, signature: 'verified' }; } },
    '../utils/flightWorkflowRules': require('../utils/flightWorkflowRules'),
    '../utils/flightInspectionConfirmation': require('../utils/flightInspectionConfirmation'),
    '../utils/flightLogPayload': require('../utils/flightLogPayload'),
    '../../shared/flightLogCreationAccess': require('../../shared/flightLogCreationAccess'),
  };
  const file = path.join(__dirname, '../controllers/flightEntryConfirmationController.js'), module = { exports: {} };
  vm.compileFunction(fs.readFileSync(file, 'utf8'), ['require', 'module', 'exports'], { filename: file })(name => dependencies[name], module, module.exports);
  const all = checklistKeys('pre', 'AS350B3e');
  const call = async (user, rawBody) => {
    const body = { checked: all, ...rawBody };
    const res = { statusCode: 200, status(value) { this.statusCode = value; return this; }, json(value) { this.body = value; return this; } };
    await module.exports({ user, body }, res); return res;
  };
  assert.equal((await call(pilot, { rpc: 'RP-CTEST', allGood: true, pin: '123456' })).statusCode, 403);
  assert.equal(verifications, 0);
  const yes = await call(mechanic, { rpc: 'rp-ctest', allGood: true, pin: '123456', signature: 'untrusted' });
  assert.equal(yes.statusCode, 201); assert.equal(verifications, 1); assert.equal(saved.signer.signature, 'verified'); assert.equal(saved.pin, undefined);
  // An incomplete checklist without flags is a valid draft, not an error.
  assert.equal((await call(mechanic, { rpc: 'RP-CTEST', allGood: false, checked: all.slice(2) })).statusCode, 201);
  assert.match(saved.remarks, /draft/i); assert.equal(saved.allGood, false);
  assert.equal((await call(mechanic, { rpc: 'RP-CTEST', allGood: false, checked: undefined })).statusCode, 400);
  assert.equal((await call(mechanic, { rpc: 'RP-CTEST', allGood: false, remarks: 'Oil leak', checked: [] })).statusCode, 201);
  assert.equal((await call(mechanic, { rpc: 'RP-CTEST', allGood: true, pin: '123456', checked: all.slice(1) })).statusCode, 400);
  assert.equal((await call(mechanic, { rpc: 'RP-CTEST', allGood: true, pin: '123456', discrepancies: { [all[0]]: { note: 'Cracked panel' } } })).statusCode, 400);
  const flagged = await call(mechanic, { rpc: 'RP-CTEST', allGood: false, checked: all.slice(1), discrepancies: { [all[0]]: { note: 'Cracked panel' }, bogus: { note: 'ignored' } } });
  assert.equal(flagged.statusCode, 201); assert.deepEqual(Object.keys(saved.discrepancies), [all[0]]); assert.equal(saved.allGood, false);
  assert.equal(saved.signer, null); assert.equal(verifications, 1); assert.equal(saved.allGood, false);
  const manager = { id: 'manager', jobTitle: 'Maintenance Manager' };
  assert.equal((await call(manager, { rpc: 'RP-CTEST', allGood: true, pin: '123456' })).statusCode, 201);
  assert.equal(saved.userId, manager.id); assert.equal(saved.signer.userId, manager.id);
  assert.equal(saved.pin, undefined); assert.equal(verifications, 2);
  for (const jobTitle of ['Pilot', 'Admin', 'Engineer']) {
    assert.equal((await call({ id: 'other', jobTitle }, { rpc: 'RP-CTEST', allGood: true, pin: '123456', role: 'Maintenance Manager' })).statusCode, 403);
  }
  assert.equal(verifications, 2);
});

test('flagged items hold the inspection until each is resolved with a description; a flag can be left unchecked', () => {
  for (const kind of ['pre', 'post']) for (const aircraftType of ['AS350B3e', 'B412EP']) {
    const keys = checklistKeys(kind, aircraftType), flagged = keys[0];
    const signer = { userId: mechanic.id, signature: 'verified' };
    const record = { aircraftType, workflowHistory: [] };
    confirmInspection(record, kind, false, '', null, mechanic, { checked: keys.slice(1), discrepancies: { [flagged]: { note: 'Cracked panel' }, invalid: { note: 'dropped' } } });
    assert.deepEqual(Object.keys(record.discrepancies), [flagged]);
    assert.equal(record.status, 'pending'); assert.equal(record.confirmation.allGood, false);
    assert.match(record.confirmation.remarks, /Cracked panel/);
    assert.throws(() => confirmInspection(record, kind, true, '', signer, mechanic, { checked: keys }), /flagged discrepancies/);
    confirmInspection(record, kind, true, 'Panel replaced', signer, mechanic, { checked: keys });
    assert.equal(record.discrepancies[flagged].resolved, true); assert.equal(record.discrepancies[flagged].resolution, 'Panel replaced');
    assert.equal(record.status, kind === 'pre' ? 'released' : 'completed');
  }
});

test('a plain draft (nothing flagged) can be signed later without resolution text', () => {
  const keys = checklistKeys('pre', 'AS350B3e'), record = { aircraftType: 'AS350B3e', workflowHistory: [] };
  confirmInspection(record, 'pre', false, '', null, mechanic, { checked: keys.slice(2), draft: true });
  assert.equal(record.confirmation.allGood, false); assert.equal(record.confirmation.draft, true);
  assert.match(record.confirmation.remarks, /draft/i);
  confirmInspection(record, 'pre', true, '', { userId: mechanic.id, signature: 'verified' }, mechanic, { checked: keys });
  assert.equal(record.status, 'released'); assert.equal(record.confirmation.allGood, true);
});
