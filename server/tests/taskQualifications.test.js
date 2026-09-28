const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const { createTaskQualificationService } = require('../services/qualificationEngine/taskQualificationService');
const owner = '111111111111111111111111', other = '222222222222222222222222';
const person = { _id: owner, firstName: 'Juan', lastName: 'Cruz', jobTitle: 'Mechanic' };
const certificate = () => ({ _id: '333333333333333333333333', personnelId: owner, status: 'VERIFIED', reviewedBy: other,
  reviewedAt: new Date('2026-01-01'), normalizedData: { aircraftRatings: ['B412EP'], expiryDate: '2027-01-01', limitations: [] } });
const query = value => ({ select() { return this; }, lean: async () => value });
function serviceFixture({ sources = [certificate()], fleetType = 'Bell 412 EP', monitorType = 'B412EP', who = person } = {}) {
  let asOf = new Date('2026-09-28T00:00:00Z');
  const queries = [];
  return { queries, clock: date => { asOf = new Date(date); }, service: createTaskQualificationService({
    aircraft: { findOne: filter => { queries.push(filter); return query(fleetType ? { type: fleetType } : null); } },
    monitoring: { findOne: filter => { queries.push(filter); return query(monitorType ? { aircraftType: monitorType } : null); } },
    users: { findById: () => query(who), find: () => query(who ? [who] : []) },
    certificates: { find: () => query(sources) }, now: () => asOf,
  }) };
}

test('task qualification resolves the actual registration and covers custom tasks with all-task eligibility', async () => {
  const f = serviceFixture();
  const result = await f.service.assertQualified({ aircraft: ' rp-c1234 ', assignedTo: owner, title: 'Any custom repair', aircraftType: 'FORGED' });
  assert.equal(result.qualified, true);
  assert.equal(result.decision.allTasksAllowed, true);
  assert.deepEqual(f.queries, [{ tailNum: 'RP-C1234' }, { aircraft: 'RP-C1234' }]);
  const options = await f.service.list('RP-C1234');
  assert.equal(options[0].qualified, true);
  assert.equal(options[0].decision, undefined); // Do not disclose private certificate evidence in the picker.
});

test('automatic acceptance supports task assignment only with valid server decision evidence', async () => {
  const source = { ...certificate(), reviewedBy: null, reviewedAt: null,
    verificationMethod: 'AUTOMATIC', verifiedAt: new Date('2026-01-01'),
    verificationDecision: { eligible: true, policyVersion: require('../config/certificateAutomationPolicy').version,
      certificateId: certificate()._id, personnelId: owner, sourceSha256: 'a'.repeat(64), reasons: [] } };
  const f = serviceFixture({ sources: [source] });
  assert.equal((await f.service.assertQualified({ aircraft: 'RP-C1234', assignedTo: owner })).qualified, true);
  assert.equal((await f.service.list('RP-C1234'))[0].qualified, true);
  source.verificationDecision.eligible = false;
  await assert.rejects(f.service.assertQualified({ aircraft: 'RP-C1234', assignedTo: owner }), error => error.status === 422);
  assert.equal((await f.service.list('RP-C1234'))[0].qualified, false);
});

test('AS350B3 certificates allow assignment to an AS350B3e registration', async () => {
  const source = certificate();
  source.normalizedData.aircraftRatings = ['AS350B3'];
  const f = serviceFixture({ fleetType: 'AS350B3e', monitorType: 'AS350B3', sources: [source] });
  assert.equal((await f.service.assertQualified({ aircraft: 'RP-C1234', assignedTo: owner })).qualified, true);
  assert.equal((await f.service.list('RP-C1234'))[0].qualified, true);
});

test('unverified, expired, revoked, foreign and restricted sources fail on the server', async () => {
  for (const source of [null, { ...certificate(), status: 'PENDING_REVIEW' }, { ...certificate(), status: 'REVOKED' },
    { ...certificate(), personnelId: other }, { ...certificate(), normalizedData: { ...certificate().normalizedData, expiryDate: '2025-01-01' } },
    { ...certificate(), normalizedData: { ...certificate().normalizedData, limitations: ['Inspection only'] } }]) {
    const f = serviceFixture({ sources: source ? [source] : [] });
    await assert.rejects(f.service.assertQualified({ aircraft: 'RP-C1234', assignedTo: owner, qualified: true, confirmBusyMechanic: true }), error => error.status === 422 && error.code === 'AIRCRAFT_QUALIFICATION_REQUIRED');
    assert.equal((await f.service.list('RP-C1234'))[0].qualified, false);
  }
});

test('missing, unknown or conflicting aircraft records cannot be inferred from client values', async () => {
  for (const options of [{ fleetType: '', monitorType: '' }, { fleetType: 'B412', monitorType: '' }, { fleetType: 'AS350B3', monitorType: 'B412EP' }, { fleetType: 'AS350B3e', monitorType: '' }]) {
    await assert.rejects(serviceFixture(options).service.assertQualified({ aircraft: 'RP-C1234', assignedTo: owner, aircraftType: 'B412EP' }), error => error.status === 422);
  }
  assert.equal((await serviceFixture({ fleetType: '' }).service.assertQualified({ aircraft: 'RP-C1234', assignedTo: owner })).qualified, true);
  await assert.rejects(serviceFixture().service.list({ $ne: '' }), error => error.status === 400);
});

test('assignment rechecks expiry on the current business date and rejects non-mechanics', async () => {
  const f = serviceFixture();
  await f.service.assertQualified({ aircraft: 'RP-C1234', assignedTo: owner });
  f.clock('2027-01-01T16:00:00Z');
  await assert.rejects(f.service.assertQualified({ aircraft: 'RP-C1234', assignedTo: owner }), error => error.status === 422);
  for (const who of [null, { ...person, jobTitle: 'Pilot' }]) await assert.rejects(serviceFixture({ who }).service.assertQualified({ aircraft: 'RP-C1234', assignedTo: owner }), error => error.status === 422);
});

function controllerFixture({ deny = false, existingStatus = 'Pending' } = {}) {
  const filename = path.resolve(__dirname, '../controllers/taskController.js'), nativeRequire = createRequire(filename);
  const calls = [];
  let existing = { id: 'TASK-1', title: 'Repair', aircraft: 'RP-C1234', assignedTo: owner, assignedToName: 'Juan Cruz', status: existingStatus,
    startDateTime: '2030-01-01T01:00:00Z', endDateTime: '2030-01-01T02:00:00Z' };
  class Task {
    constructor(data) { Object.assign(this, data); }
    toObject() { return { ...this }; }
    set(data) { Object.assign(this, data); }
    async save() { calls.push('save'); existing = this; }
    static find() { return query([]); }
    static async findOne() { return new Task(existing); }
    static async updateOne() { calls.push('cleanup'); }
  }
  const stubs = {
    '../models/taskModel': Task,
    '../services/qualificationEngine/taskQualificationService': { createTaskQualificationService: () => ({ assertQualified: async task => {
      calls.push(['qualification', task.aircraft, task.assignedTo]);
      if (deny) throw Object.assign(Error('Certificate required'), { status: 422, code: 'AIRCRAFT_QUALIFICATION_REQUIRED' });
      return { name: 'Verified Name' };
    } }) },
    './logsController': { auditLog: async () => calls.push('audit') },
    '../utils/taskNotificationService': { createTaskNotifications: async () => calls.push('notify') },
    './maintenanceLogController': { syncMaintenanceLogFromTask: async () => calls.push('sync'), removeMaintenanceLogForTask: async () => {} },
    '../utils/realtimeEvents': { publishTypedForRecipients: async () => {} },
  };
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), { require: name => stubs[name] || nativeRequire(name), module, exports: module.exports, console: { error() {} }, Date, setTimeout, clearTimeout }, { filename });
  const response = () => ({ statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });
  return { controller: module.exports, calls, response, existing: () => existing };
}

test('task creation rejects forged eligibility before save, synchronization, workload override or notifications', async () => {
  const f = controllerFixture({ deny: true }), res = f.response();
  await f.controller.createTask({ user: { id: other, jobTitle: 'Maintenance Manager' }, body: { ...f.existing(), qualified: true, confirmBusyMechanic: true } }, res);
  assert.equal(res.statusCode, 422);
  assert.equal(res.body.code, 'AIRCRAFT_QUALIFICATION_REQUIRED');
  assert.deepEqual(f.calls, [['qualification', 'RP-C1234', owner]]);
});

test('task creation requires assignment permission and uses the database mechanic name', async () => {
  const f = controllerFixture(), denied = f.response();
  await f.controller.createTask({ user: { id: owner, jobTitle: 'Mechanic' }, body: f.existing() }, denied);
  assert.equal(denied.statusCode, 403); assert.equal(f.calls.length, 0);
  const res = f.response();
  await f.controller.createTask({ user: { id: other, jobTitle: 'Maintenance Manager' }, body: { ...f.existing(), assignedToName: 'FORGED' } }, res);
  assert.equal(res.statusCode, 201);
  assert.equal(res.body.data.assignedToName, 'Verified Name');
  assert.ok(f.calls.indexOf('save') > f.calls.findIndex(call => Array.isArray(call)));
});

test('reassignment, aircraft changes and starting/finishing work require current eligibility', async () => {
  for (const body of [{ assignedTo: other }, { aircraft: 'RP-C9999' }, { status: 'Ongoing' }, { status: 'Turned in' }]) {
    const f = controllerFixture({ deny: true }), res = f.response();
    await f.controller.updateTask({ user: { id: other, jobTitle: 'Maintenance Manager' }, params: { id: 'TASK-1' }, body }, res);
    assert.equal(res.statusCode, 422);
    assert.equal(f.calls.includes('save'), false);
  }
});

test('mechanics cannot change aircraft/assignee or update others; managers can review historical work after expiry', async () => {
  for (const [user, body] of [[{ id: other, jobTitle: 'Mechanic' }, { status: 'Ongoing' }], [{ id: owner, jobTitle: 'Mechanic' }, { assignedTo: other }]]) {
    const f = controllerFixture(), res = f.response();
    await f.controller.updateTask({ user, params: { id: 'TASK-1' }, body }, res);
    assert.equal(res.statusCode, 403); assert.equal(f.calls.includes('save'), false);
  }
  const f = controllerFixture({ deny: true, existingStatus: 'Turned in' }), res = f.response();
  await f.controller.updateTask({ user: { id: other, jobTitle: 'Maintenance Manager' }, params: { id: 'TASK-1' }, body: { status: 'Approved' } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(f.calls.some(call => Array.isArray(call)), false);
});
