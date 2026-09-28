const test = require('node:test');
const assert = require('node:assert/strict');
const { FLIGHT_HOUR_FIELDS, parseFlightTime, flightTimeDisplay, editFlightTimePart, padFlightTimePart, minutesToFlightHours, totalFlightHours, applyFlightLogHours } = require('../../shared/flightLogTimes');

test('time fields retain the separator, accept numeric parts and paste, and distinguish clocks from durations', () => {
  assert.equal(editFlightTimePart('', 0, '1'), '1:');
  assert.equal(padFlightTimePart('1:', 0), '01:');
  assert.equal(editFlightTimePart('01:', 1, '39'), '01:39');
  assert.equal(editFlightTimePart('01:39', 1, ''), '01:');
  assert.equal(editFlightTimePart('01:39', 0, '2:45'), '02:45');
  assert.equal(editFlightTimePart('01:39', 1, 'ab45'), '01:45');
  assert.equal(parseFlightTime('23:59'), 1439);
  assert.equal(parseFlightTime('24:00'), null);
  assert.equal(parseFlightTime('25:00', true), 1500);
  assert.equal(parseFlightTime('00:60', true), null);
  assert.equal(parseFlightTime('00:00', true), 0);
  for (const value of ['', ':', '01:', ':39', '-1:20']) assert.equal(parseFlightTime(value, true), null);
  assert.equal(flightTimeDisplay('0800'), '08:00');
  assert.equal(flightTimeDisplay('1.5', true), '01:30');
});

test('conversion matches every minute in the user-provided table and carries whole hours', () => {
  const bands = [[0, 2, 0], [3, 8, .1], [9, 14, .2], [15, 20, .3], [21, 26, .4], [27, 33, .5], [34, 39, .6], [40, 45, .7], [46, 51, .8], [52, 57, .9], [58, 60, 1]];
  for (const [min, max, expected] of bands) for (let minute = min; minute <= max; minute++) {
    assert.equal(minutesToFlightHours(minute), expected, String(minute));
    assert.equal(minutesToFlightHours(minute + 120), Number((expected + 2).toFixed(1)));
  }
});

test('six component hours sum converted Total Time Flight inputs, with cycles and other fields preserved', () => {
  const legs = [{ totalTimeOff: '01:39', totalTimeOn: '09:00', flightTimeOn: '12:00', flightTimeOff: '08:00' }, { totalTimeOff: '00:20' }];
  assert.equal(totalFlightHours(legs), '1.9');
  assert.equal(totalFlightHours([{ totalTimeOff: '00:20' }, { totalTimeOff: '00:20' }, { totalTimeOff: '00:20' }]), '0.9');
  assert.equal(totalFlightHours([...legs, { totalTimeOff: '' }]), '');
  assert.equal(totalFlightHours([{ totalTimeOff: '00:60' }]), '');
  const record = { legs, additionalLandings: 3, componentData: { broughtForwardData: { airframe: '100' }, thisFlightData: { airframe: '999', cycleN1: '2', cycleN2: '3', usage: '4', landingCycle: '5' } } };
  const result = applyFlightLogHours(record);
  for (const key of FLIGHT_HOUR_FIELDS) assert.equal(result.componentData.thisFlightData[key], '1.9');
  assert.equal(result.componentData.toDateData.airframe, '101.9');
  assert.equal(result.componentData.toDateData.engine, '');
  assert.equal(result.componentData.thisFlightData.cycleN1, '2');
  assert.equal(result.componentData.thisFlightData.usage, '4');
  assert.equal(result.componentData.thisFlightData.landingCycle, '5');
  assert.equal(record.componentData.thisFlightData.airframe, '999');
  assert.deepEqual(applyFlightLogHours(result), result);
});

test('flight-log update persists server-derived hours rather than supplied component totals', async () => {
  const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
  const file = path.join(__dirname, '../controllers/flightLogController.js');
  const localRequire = require('node:module').createRequire(file);
  let saved;
  const existing = { _id: 'log', status: 'pending_release', rpc: 'RP-C1234', componentData: { broughtForwardData: { airframe: '100' } }, legs: [] };
  const stubs = {
    '../models/flightLogModel': { findById: async () => existing, findByIdAndUpdate: async (_id, values) => { saved = values; return { ...existing, ...values }; } },
    '../utils/flightLogNotificationService': { createFlightLogNotifications: async () => {} },
    './logsController': { auditLog: async () => {} },
  };
  const module = { exports: {} };
  vm.compileFunction(fs.readFileSync(file, 'utf8'), ['require', 'module', 'exports'], { filename: file })(name => stubs[name] || localRequire(name), module, module.exports);
  const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
  await module.exports.updateFlightLog({ user: { id: 'manager', jobTitle: 'Maintenance Manager' }, params: { id: 'log' }, body: {
    legs: [{ totalTimeOff: '01:39', totalTimeOn: '02:00' }],
    additionalLandings: -5,
    componentData: { broughtForwardData: { airframe: '100' }, thisFlightData: { airframe: '999', cycleN1: '2', landingCycle: '-99' } },
  } }, res);
  assert.equal(res.statusCode, 200, JSON.stringify(res.body));
  for (const key of FLIGHT_HOUR_FIELDS) assert.equal(saved.componentData.thisFlightData[key], '1.6');
  assert.equal(saved.componentData.toDateData.airframe, '101.6');
  assert.equal(saved.legs[0].totalTimeOff, '01:39');
  assert.equal(saved.additionalLandings, 0);
  assert.equal(saved.componentData.thisFlightData.landingCycle, '1');
  await module.exports.updateFlightLog({ user: { id: 'manager', jobTitle: 'Maintenance Manager' }, params: { id: 'log' }, body: {
    legs: [{ totalTimeOff: '01:39' }], additionalLandings: 2,
  } }, res);
  assert.equal(saved.additionalLandings, 2);
  assert.equal(saved.componentData.thisFlightData.landingCycle, '3');
  await module.exports.updateFlightLog({ user: { id: 'manager', jobTitle: 'Maintenance Manager' }, params: { id: 'log' }, body: {
    date: '09/23/2026', legs: [{ totalTimeOff: '01:39', date: 'old' }], fuelServicing: [{ date: 'wrong' }], oilServicing: [{ date: 'wrong' }],
  } }, res);
  assert.equal(res.statusCode, 200);
  for (const key of ['legs', 'fuelServicing', 'oilServicing']) assert.equal(saved[key][0].date, '09/23/2026');
  for (const totalTimeOff of ['', '01:', '00:60']) {
    saved = null;
    await module.exports.updateFlightLog({ user: { id: 'manager', jobTitle: 'Maintenance Manager' }, params: { id: 'log' }, body: { legs: [{ totalTimeOff }] } }, res);
    assert.equal(res.statusCode, 400);
    assert.match(res.body.message, /Leg 1: Total Time \(FLIGHT\) is required/);
    assert.equal(saved, null);
  }
  for (const jobTitle of ['Mechanic', 'Maintenance Manager', 'Pilot']) {
    await module.exports.createFlightLog({ user: { id: 'creator', jobTitle }, body: { rpc: 'RP-C1234', legs: [{ totalTimeOff: '' }] } }, res);
    assert.equal(res.statusCode, 400);
    assert.match(res.body.message, /Total Time \(FLIGHT\) is required/);
  }
  for (const [action, status] of [['releaseFlightLog', 'pending_release'], ['completeFlightLog', 'accepted']]) {
    existing.status = status;
    await module.exports[action]({ user: { id: 'manager', jobTitle: 'Maintenance Manager' }, params: { id: 'log' }, body: {} }, res);
    assert.equal(res.statusCode, 400);
    assert.match(res.body.message, /enter Total Time \(FLIGHT\)/);
  }
});

test('Total Time Flight is required on every leg and identifies the incomplete leg', () => {
  const { requiredFlightTimeError } = require('../../shared/flightLogTimes');
  assert.equal(requiredFlightTimeError([{ totalTimeOff: '00:00' }, { totalTimeOff: '01:39' }]), '');
  assert.equal(requiredFlightTimeError([{ totalTimeOff: '1.5' }]), '');
  assert.match(requiredFlightTimeError([]), /Add a leg/);
  for (const totalTimeOff of ['', ' ', '01:', ':30', '00:60', 'invalid']) {
    assert.match(requiredFlightTimeError([{ totalTimeOff: '01:00' }, { totalTimeOff }]), /Leg 2:/);
  }
});

test('landing cycles follow leg count plus persisted extras and can never fall below the legs', () => {
  const { flightLandingCycles, normalizeAdditionalLandings } = require('../../shared/flightLogTimes');
  const legs = [{ totalTimeOff: '01:00' }, { totalTimeOff: '00:30' }];
  assert.equal(flightLandingCycles(legs), 2);
  assert.equal(flightLandingCycles(legs, 3), 5);
  assert.equal(flightLandingCycles([...legs, {}], 3), 6);
  assert.equal(flightLandingCycles(legs.slice(1), 3), 4);
  for (const extra of [-10, undefined, '', 'invalid', Infinity]) assert.equal(flightLandingCycles(legs, extra), 2);
  assert.equal(normalizeAdditionalLandings(2.8), 2);
  const record = applyFlightLogHours({ legs, additionalLandings: 2, componentData: { broughtForwardData: { landingCycle: '100' }, thisFlightData: { landingCycle: '999' } } });
  assert.equal(record.componentData.thisFlightData.landingCycle, '4');
  assert.equal(record.componentData.toDateData.landingCycle, '104');
  assert.equal(applyFlightLogHours({ ...record, additionalLandings: 0 }).componentData.thisFlightData.landingCycle, '2');
});

test('additional landings survive payload filtering and model persistence', async () => {
  const { pickFlightLogPayloadForRequest } = require('../utils/flightLogPayload');
  const FlightLog = require('../models/flightLogModel');
  for (const jobTitle of ['Mechanic', 'Maintenance Manager']) for (const operation of ['create', 'update']) {
    const payload = pickFlightLogPayloadForRequest({ user: { jobTitle } }, { additionalLandings: 3 }, operation);
    assert.equal(payload.additionalLandings, 3);
  }
  const record = new FlightLog({ rpc: 'RP-C1234', additionalLandings: 3 });
  await record.validate();
  assert.equal(new FlightLog(JSON.parse(JSON.stringify(record))).additionalLandings, 3);
});
