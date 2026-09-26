const test = require('node:test');
const assert = require('node:assert/strict');
const { flightLogDateText, syncFlightLogDates } = require('../../shared/flightLogDates');
const { applyFlightLogHours } = require('../../shared/flightLogTimes');
const FlightLog = require('../models/flightLogModel');

test('child dates use the Basic Information calendar date without changing its original type', () => {
  const date = new Date(2026, 8, 22);
  for (const value of [date, '2026-09-22', '2026-09-22T00:00:00.000Z', '9/22/2026']) assert.equal(flightLogDateText(value), '09/22/2026');
  const source = { date, legs: [{ date: 'old', totalTimeOff: '01:00' }], fuelServicing: [{ date: 'old fuel', mainAdd: '20', signature: 'fuel signature' }], oilServicing: [{ date: 'old oil', engineAdd: '1', signature: 'oil signature' }] };
  const result = syncFlightLogDates(source);
  assert.equal(result.date, date);
  for (const key of ['legs', 'fuelServicing', 'oilServicing']) assert.equal(result[key][0].date, '09/22/2026');
  assert.equal(result.fuelServicing[0].mainAdd, '20');
  assert.equal(result.oilServicing[0].signature, 'oil signature');
  assert.equal(source.legs[0].date, 'old');
  assert.deepEqual(syncFlightLogDates(result), result);
});

test('changing or clearing the Basic Information date updates every row, including newly added legs', () => {
  const original = syncFlightLogDates({ date: '09/22/2026', legs: [{ totalTimeOff: '01:00' }] });
  const changed = syncFlightLogDates({ ...original, date: '09/23/2026', legs: [...original.legs, { totalTimeOff: '00:30' }] });
  for (const key of ['legs', 'fuelServicing', 'oilServicing']) {
    assert.equal(changed[key].length, 2);
    assert.ok(changed[key].every(row => row.date === '09/23/2026'));
    assert.ok(syncFlightLogDates({ ...changed, date: '' })[key].every(row => row.date === ''));
  }
});

test('server-calculated dates persist for both aircraft types alongside times and servicing data', async () => {
  for (const aircraftType of ['AS350B3e', 'B412EP']) {
    const log = new FlightLog(applyFlightLogHours({ aircraftType, rpc: 'RP-C1234', date: '09/22/2026', legs: [{ date: 'forged', totalTimeOff: '01:39' }], fuelServicing: [{ date: 'forged' }], oilServicing: [{ date: 'forged' }] }));
    await log.validate();
    const restored = new FlightLog(JSON.parse(JSON.stringify(log)));
    for (const key of ['legs', 'fuelServicing', 'oilServicing']) assert.equal(restored[key][0].date, '09/22/2026');
    assert.equal(restored.componentData.thisFlightData.airframe, '1.6');
  }
});

test('fuel and oil inherit the preflight signature on existing and newly added leg rows', () => {
  const signature = 'data:image/png;base64,verified';
  for (const field of ['initialInspectionSignature', 'preFlightInspection']) {
    const original = { date: '09/24/2026', legs: [{}, {}], [field]: { signature }, fuelServicing: [{ mainAdd: '40' }], oilServicing: [{ engineAdd: '1' }] };
    const next = syncFlightLogDates(original);
    for (const key of ['fuelServicing', 'oilServicing']) {
      assert.equal(next[key].length, 2);
      assert.ok(next[key].every(row => row.signature === signature));
      assert.equal(original[key][0].signature, undefined);
    }
    assert.equal(next.fuelServicing[0].mainAdd, '40');
    assert.equal(next.oilServicing[0].engineAdd, '1');
    assert.deepEqual(syncFlightLogDates(next), next);
  }
});


test('new and existing blank passenger counts default to zero while entered counts are preserved', async () => {
  const source = { date: '09/25/2026', legs: [undefined, null, '', '  ', 0, '0', '7'].map(passengers => ({ passengers, totalTimeOff: '00:30' })) };
  const result = syncFlightLogDates(source);
  assert.deepEqual(result.legs.map(leg => leg.passengers), ['0', '0', '0', '0', '0', '0', '7']);
  assert.equal(source.legs[2].passengers, '');
  assert.deepEqual(syncFlightLogDates(result), result);
  const flight = new FlightLog({ rpc: 'RP-CTEST', aircraftType: 'AS350B3e', legs: [{}] });
  assert.equal(flight.legs[0].passengers, '0');
});
