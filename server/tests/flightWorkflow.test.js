const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const rules = require('../utils/flightWorkflowRules');
const totals = require('../utils/flightWorkflowTotals');
const stages = require('../../shared/flightWorkflow');

const pilotId = '000000000000000000000001', mechanicId = '000000000000000000000002';
const pilot = { id: pilotId, jobTitle: 'Pilot' }, mechanic = { id: mechanicId, jobTitle: 'Mechanic' };
const leg = () => ({ date: '09/20/2026', stations: [{ from: 'A', to: 'B' }], passengers: '0', flightTimeOff: '08:00', flightTimeOn: '09:30', blockTimeOff: '07:50', blockTimeOn: '09:40' });
const log = () => ({ _id: '000000000000000000000003', __v: 4, rpc: 'RP-C1234', aircraftType: 'AS350B3e', status: 'submitted', date: '09/20/2026', controlNo: 'FL-TEST', flightPurpose: 'company_transport',
  assignedPilot: { userId: pilotId, name: 'Pilot' }, assignedMechanic: { userId: mechanicId, name: 'Mechanic' },
  componentData: { broughtForwardData: { airframe: '100' }, thisFlightData: { airframe: '1.5', engine: '1.5', cycleN1: '0.2', cycleN2: '0.3', landingCycle: '1' }, toDateData: { airframe: '99999' } },
  monitoringBaseline: { id: 'monitor', referenceData: { acftTT: 100, engTT: 200, n1Cycles: 30, n2Cycles: 40, landings: 50 } },
  legs: [leg()], workItems: [], workflowHistory: [], amendments: [] });

test('unsaved forms can follow inspection activity but must not silently adopt concurrently changed flight data', () => {
  const original = log();
  const activity = { ...original, __v: 5, updatedAt: new Date().toISOString(), workflowHistory: [{ action: 'pre_save_draft' }] };
  assert.equal(stages.flightDraftBaseChanged(original, activity), false);
  assert.equal(stages.flightDraftBaseChanged(original, { ...activity, legs: [{ ...leg(), passengers: '2' }] }), true);
  assert.equal(stages.flightDraftBaseChanged(original, { ...activity, status: 'completed' }), true);
});

test('only the assigned crew can perform each transition, with pilot input limited to acceptance', () => {
  const record = log();
  for (const [stage, actor, action, next] of [
    ['pending_release', mechanic, 'release', 'pending_acceptance'], ['pending_acceptance', pilot, 'accept', 'accepted'],
    ['accepted', mechanic, 'complete', 'completed'], ['submitted', mechanic, 'complete', 'completed'],
    ['pending_acceptance', mechanic, 'return', 'returned_to_mechanic'], ['submitted', mechanic, 'return', 'returned_to_mechanic'],
    ['returned_to_pilot', mechanic, 'complete', 'completed'], ['returned_to_mechanic', mechanic, 'release', 'pending_acceptance'],
  ]) assert.equal(rules.transition({ ...record, status: stage }, actor, action), next);
  assert.throws(() => rules.transition(record, pilot, 'complete'), { status: 403 });
  assert.throws(() => rules.transition(record, { id: 'unassigned', jobTitle: 'Mechanic' }, 'complete'), { status: 403 });
  assert.throws(() => rules.transition({ ...record, status: 'completed' }, mechanic, 'release'), { status: 409 });
  assert.equal(stages.needsMyFlightAction(mechanic, record), true);
  assert.equal(stages.needsMyFlightAction(pilot, record), false);
});

test('signed preparation is preserved while mechanics can edit flight details and pilots cannot', () => {
  const record = log(); record.workItems = [{ phase: 'preparation', workDone: 'Certified preparation' }];
  record.workflowHistory = [{ action: 'release', snapshot: { fuelServicing: [{ date: '09/20/2026', mainAdd: '50' }] } }];
  const changes = rules.editableChanges(record, mechanic, { status: 'completed', releasedBy: { name: 'Forged' }, legs: [], workItems: [{ phase: 'preparation', workDone: 'Rewritten' }, { phase: 'post_flight', workDone: 'New work' }], fuelServicing: [] });
  assert.equal(changes.status, undefined); assert.equal(changes.releasedBy, undefined); assert.deepEqual(changes.legs, []);
  assert.deepEqual(rules.editableChanges(record, pilot, { legs: [], remarks: 'changed', componentData: {} }), {});
  assert.equal(changes.workItems[0].workDone, 'Certified preparation');
  assert.equal(changes.workItems[1].workDone, 'New work');
  assert.equal(changes.fuelServicing[0].mainAdd, '50');
  assert.deepEqual(rules.editableChanges({ ...record, status: 'completed' }, mechanic, { remarks: 'overwrite' }), {});
  assert.throws(() => rules.checkVersion(record, 3), { status: 409 });
  assert.throws(() => rules.checkVersion(record, undefined), { status: 409 });
});

test('server calculates authoritative totals, rejects missing values, and handles overnight legs', () => {
  const record = log(), monitoring = { referenceData: record.monitoringBaseline.referenceData };
  const review = totals.reviewTotals(record, monitoring);
  assert.deepEqual(review.missing, []);
  assert.equal(review.mapped.acftTT, 101.5);
  assert.equal(review.componentData.toDateData.airframe, '101.5');
  assert.equal(totals.numeric('  '), null); assert.equal(totals.numeric('0'), 0);
  record.componentData.thisFlightData.cycleN1 = '';
  assert.ok(totals.reviewTotals(record, monitoring).missing.some(x => x.includes('N1 cycles')));
  record.legs = [{ ...leg(), flightTimeOff: '23:30', flightTimeOn: '01:00', blockTimeOff: '23:20', blockTimeOn: '01:10' }, {}];
  assert.equal(totals.validateLegs(record).flightHours, 1.5);
  assert.equal(totals.validateLegs(record).legs.length, 1);
  record.legs[0].passengers = '';
  assert.ok(totals.validateLegs(record).missing.some(x => x.includes('passenger')));
});

test('B412 totals never substitute airframe usage for an unknown engine and detect legacy reference changes', () => {
  const record = { ...log(), aircraftType: 'B412EP', b412Data: { componentData: { thisFlightData: { airframe: '1.5', landingCycle: '1', engine1: { tsn: '1.5', cycle: '1' }, engine2: { tsn: '1.5', cycle: '1' } } } } };
  const referenceData = { acftTT: 100, landings: 20, referenceCells: { L2: 200, H2: 30, H3: 40 } };
  assert.ok(totals.reviewTotals(record, { referenceData }).missing.some(x => x.includes('Engine 2 TSN: Parts Monitoring')));
  record.monitoringBaseline = { id: 'monitor', referenceData };
  assert.equal(totals.monitoringReconciliation(record, { _id: 'monitor', referenceData: { ...referenceData, today: 'new date' } }).required, false);
  assert.equal(totals.monitoringReconciliation(record, { _id: 'monitor', referenceData: { ...referenceData, referenceCells: { ...referenceData.referenceCells, L2: 201 } } }).required, true);
});

// In-memory transaction double tests controller order, version enforcement,
// rollback error propagation and retry behavior without accessing a live database.
const clone = value => JSON.parse(JSON.stringify(value));
function controllerHarness() {
  let state = log(); let monitoring = { _id: 'monitor', aircraftType: 'AS350B3e', referenceData: clone(state.monitoringBaseline.referenceData), parts: [] };
  let failFinalWrite = false, signed = 0;
  class Doc {
    constructor(value) { Object.assign(this, clone(value)); }
    set(key, value) { this[key] = value; }
    toObject() { return clone(this); }
    async validate() {}
  }
  const query = read => ({ session() { return this; }, sort() { return this; }, lean() { return Promise.resolve(read()); }, then(resolve, reject) { return Promise.resolve().then(read).then(resolve, reject); } });
  class Flight extends Doc {
    static findById() { return query(() => new Flight(state)); }
    static async findOneAndUpdate(filter, update) {
      if (failFinalWrite) throw Error('Simulated final write failure');
      if (filter.__v !== state.__v) return null;
      state = { ...state, ...clone(update.$set), __v: state.__v + 1 };
      for (const key of Object.keys(update.$unset || {})) delete state[key];
      return new Flight(state);
    }
  }
  const pre = { status: 'completed', releasedBy: { userId: mechanicId }, acceptedBy: { userId: pilotId } };
  let post = { _id: 'post', __v: 0, aircraftType: 'AS350B3e', status: 'pending', releasedBy: {}, workflowHistory: [] };
  class Post extends Doc {
    static find() { return query(() => [clone(post)]); }
    static async findOneAndUpdate(filter, update) {
      if (filter.__v !== post.__v) return null;
      post = { ...post, ...clone(update.$set), __v: post.__v + 1 };
      return new Post(post);
    }
  }
  const dependencies = {
    '../../shared/flightAutomaticInputs': require('../../shared/flightAutomaticInputs'),
    '../utils/flightInspectionConfirmation': require('../utils/flightInspectionConfirmation'),
    '../../shared/b412WorkflowComponents': require('../../shared/b412WorkflowComponents'),
    mongoose: { startSession: async () => ({ endSession: async () => {}, withTransaction: async fn => { const before = clone({ state, monitoring, post }); try { await fn(); } catch (e) { state = before.state; monitoring = before.monitoring; post = before.post; throw e; } } }) },
    '../models/flightLogModel': Flight,
    '../models/preInspectionModel': { find: () => query(() => [pre]) },
    '../models/postInspectionModel': Post,
    '../models/partsMonitoringModel': { findOne: () => query(() => { const doc = new Doc(monitoring); doc.save = async () => { monitoring = doc.toObject(); }; return doc; }) },
    '../models/flightDefectModel': { find: () => query(() => []) },
    '../models/flightCrewAuthorizationModel': {}, '../models/userModel': {},
    '../utils/flightWorkflowRules': rules, '../utils/flightWorkflowTotals': totals,
    '../utils/flightWorkflowSigning': { verifyWorkflowSigner: async () => { signed++; return { name: 'Mechanic', userId: mechanicId, signature: 'verified', timestamp: '2026-09-20T10:00:00Z' }; } },
    '../utils/flightLogCrew': { resolveFlightLogCrew: async () => ({ assignments: {} }) },
    '../utils/flightLogPayload': require('../utils/flightLogPayload'),
    '../../shared/flightWorkflow': stages, '../../shared/flightCrewAccess': require('../../shared/flightCrewAccess'),
    '../utils/flightWorkflowNotificationOutbox': { pendingFlightNotification: () => null, flushFlightNotifications: async () => {} },
    '../utils/partsMonitoringFormulas': { getToday: () => '2026-09-20', processDataWithFormulas: rows => rows },
  };
  const file = path.join(__dirname, '../controllers/flightWorkflowController.js'), module = { exports: {} };
  vm.compileFunction(fs.readFileSync(file, 'utf8'), ['require', 'module', 'exports'], { filename: file })(name => { assert.ok(Object.hasOwn(dependencies, name), name); return dependencies[name]; }, module, module.exports);
  const call = async (action, body = {}, user = mechanic) => {
    const response = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(value) { this.body = value; return this; } };
    await module.exports.action(action)({ params: { id: state._id }, user, body: { expectedVersion: 4, changes: {}, postFlightConfirmation: { allGood: true, appendSignature: true }, ...body } }, response); return response;
  };
  return { call, state: () => state, monitoring: () => monitoring, signed: () => signed, failWrite: () => { failFinalWrite = true; }, pre, post: () => post };
}

test('completion calculates and posts once; replay returns the same receipt without signing or incrementing twice', async () => {
  const h = controllerHarness(), first = await h.call('complete');
  assert.equal(first.statusCode, 200); assert.equal(h.state().status, 'completed');
  assert.equal(h.monitoring().referenceData.acftTT, 101.5); assert.equal(h.state().__v, 5);
  const replay = await h.call('complete');
  assert.equal(replay.body.replayed, true); assert.deepEqual(replay.body.receipt, h.state().completionReceipt);
  assert.equal(h.signed(), 1); assert.equal(h.monitoring().referenceData.acftTT, 101.5);
  assert.equal(h.post().status, 'completed'); assert.equal(h.post().confirmation.allGood, true); assert.equal(h.post().__v, 1);
});

test('closure requires explicit Post-Flight confirmation and resolution of an existing inspection hold', async () => {
  const h = controllerHarness();
  assert.equal((await h.call('complete', { postFlightConfirmation: null })).statusCode, 400);
  assert.equal(h.monitoring().referenceData.acftTT, 100);
  h.post().confirmation = { allGood: false, remarks: 'Inspect oil leak' };
  assert.equal((await h.call('complete')).statusCode, 400);
  assert.equal(h.post().confirmation.allGood, false);
  const completed = await h.call('complete', { postFlightConfirmation: { allGood: true, appendSignature: true, resolution: 'Leak corrected and reinspection satisfactory' } });
  assert.equal(completed.statusCode, 200); assert.equal(h.post().status, 'completed');
});

test('failed final log write rolls back monitoring and stale versions never enter completion', async () => {
  const h = controllerHarness(); h.failWrite();
  assert.equal((await h.call('complete')).statusCode, 500);
  assert.equal(h.monitoring().referenceData.acftTT, 100); assert.equal(h.state().status, 'submitted');
  assert.equal(h.post().status, 'pending'); assert.equal(h.post().__v, 0);
  const stale = controllerHarness(); assert.equal((await stale.call('complete', { expectedVersion: 3 })).statusCode, 409);
  assert.equal(stale.signed(), 0); assert.equal(stale.monitoring().referenceData.acftTT, 100);
});

test('a former assignee inspection signature cannot satisfy the current crew completion requirement', async () => {
  const h = controllerHarness(); h.pre.acceptedBy.userId = 'former-pilot';
  const response = await h.call('complete');
  assert.equal(response.statusCode, 400); assert.ok(response.body.message.includes('current assigned pilot'));
  assert.equal(h.state().status, 'submitted'); assert.equal(h.monitoring().referenceData.acftTT, 100);
});

test('corrections clear the affected current sign-off and audit digests bind amendment text', async () => {
  const h = controllerHarness(); h.state().submittedBy = { name: 'Pilot', userId: pilotId };
  const response = await h.call('return', { comment: 'Fix passenger information' });
  assert.equal(response.statusCode, 200);
  assert.equal(h.state().submittedBy, undefined);
  assert.equal(h.state().status, 'returned_to_mechanic');
  const signer = { name: 'Pilot', userId: pilotId }, record = log();
  const first = rules.eventFor(record, 'amend', pilot, { correction: 'A' }, 'Reason', signer);
  const second = rules.eventFor(record, 'amend', pilot, { correction: 'B' }, 'Reason', signer);
  assert.notEqual(first.digest, second.digest);
});

test('B412 closure posts both engines and aligns the common-form projection with authoritative totals', async () => {
  const h = controllerHarness(), record = h.state();
  record.aircraftType = 'B412EP';
  Object.assign(h.monitoring().referenceData, { eng1TT: 200, eng1Cycles: 30, eng2TT: 400, eng2Cycles: 40 });
  record.monitoringBaseline.referenceData = clone(h.monitoring().referenceData);
  record.b412Data = { componentData: { thisFlightData: { airframe: '1.5', landingCycle: '1', engine1: { tsn: '1.5', cycle: '0.2' }, engine2: { tsn: '1.5', cycle: '0.3' } } } };
  const response = await h.call('complete');
  assert.equal(response.statusCode, 200);
  assert.equal(h.monitoring().referenceData.eng1TT, 201.5);
  assert.equal(h.monitoring().referenceData.eng2TT, 401.5);
  assert.equal(h.state().b412Data.componentData.toDateData.engine2.tsn, '401.5');
  assert.equal(h.state().componentData.toDateData.engine, '201.5');
});
