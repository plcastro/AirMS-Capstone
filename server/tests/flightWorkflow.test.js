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
const leg = () => ({ date: '09/20/2026', stations: [{ from: 'A', to: 'B' }], passengers: '0', totalTimeOff: '01:30', flightTimeOff: '08:00', flightTimeOn: '09:30', blockTimeOff: '07:50', blockTimeOn: '09:40' });
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
  record.legs[0].passengers = '1.5';
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
  const signingRequests = [];
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
  const pre = { status: 'completed', releasedBy: { userId: mechanicId, signature: 'data:image/png;base64,preflight' }, acceptedBy: { userId: pilotId } };
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
    '../../shared/flightLogBroughtForward': require('../../shared/flightLogBroughtForward'),
    '../../shared/flightAutomaticInputs': require('../../shared/flightAutomaticInputs'),
    '../../shared/flightLogDates': require('../../shared/flightLogDates'),
    '../utils/flightInspectionConfirmation': require('../utils/flightInspectionConfirmation'),
    '../../shared/b412WorkflowComponents': require('../../shared/b412WorkflowComponents'),
    mongoose: { startSession: async () => ({ endSession: async () => {}, withTransaction: async fn => { const before = clone({ state, monitoring, post }); try { await fn(); } catch (e) { state = before.state; monitoring = before.monitoring; post = before.post; throw e; } } }) },
    '../models/flightLogModel': Flight,
    '../models/preInspectionModel': { find: () => query(() => [pre]) },
    '../models/postInspectionModel': Post,
    '../models/partsMonitoringModel': { findOne: () => query(() => { const doc = new Doc(monitoring); doc.save = async () => { monitoring = doc.toObject(); }; return doc; }) },
    '../models/flightDefectModel': { find: () => query(() => []) },
    '../utils/flightWorkflowRules': rules, '../utils/flightWorkflowTotals': totals,
    '../utils/flightWorkflowSigning': { verifyWorkflowSigner: async (req) => {
      signingRequests.push(clone(req.body));
      if (req.body.pin === '999999') throw rules.fail('Incorrect signing PIN.', 403);
      signed++;
      return { name: 'Mechanic', userId: mechanicId, signature: req.body.signature || 'verified', timestamp: '2026-09-20T10:00:00Z' };
    } },
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
    const handler = ['workspace', 'review', 'save'].includes(action) ? module.exports[action] : module.exports.action(action);
    await handler({ params: { id: state._id }, user, body: { expectedVersion: 4, changes: {}, postFlightConfirmation: { allGood: true, appendSignature: true }, ...body } }, response); return response;
  };
  return { call, state: () => state, monitoring: () => monitoring, signed: () => signed, signingRequests, failWrite: () => { failFinalWrite = true; }, pre, post: () => post };
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

test('original component-hour conversion survives save, review and closure for both layouts', async () => {
  for (const aircraftType of ['AS350B3e', 'B412EP']) {
    const h = controllerHarness(), record = h.state();
    record.aircraftType = aircraftType;
    record.componentData.broughtForwardData.rotorMain = '10';
    h.monitoring().referenceData.mrbTT = 10;
    if (aircraftType === 'B412EP') {
      Object.assign(h.monitoring().referenceData, { eng1TT: 200, eng1Cycles: 30, eng2TT: 400, eng2Cycles: 40 });
      record.monitoringBaseline.referenceData = clone(h.monitoring().referenceData);
      record.b412Data = { componentData: { thisFlightData: { engine1: { cycle: '.2' }, engine2: { cycle: '.3' } } } };
    }
    record.monitoringBaseline.referenceData = clone(h.monitoring().referenceData);
    const legs = Array.from({ length: 3 }, () => ({ ...leg(), totalTimeOff: '00:20', flightTimeOn: '08:21' }));
    const saved = await h.call('save', { changes: { legs } });
    assert.equal(saved.statusCode, 200, JSON.stringify(saved.body));
    assert.equal(h.state().componentData.thisFlightData.airframe, '0.9');
    assert.equal(h.state().componentData.toDateData.airframe, '100.9');
    assert.equal(h.state().componentData.thisFlightData.landingCycle, '3');
    const review = await h.call('review', { expectedVersion: 5 });
    assert.equal(review.statusCode, 200, JSON.stringify(review.body));
    assert.deepEqual(review.body.data.missing, []);
    assert.equal(review.body.data.mapped.acftTT, 100.9);
    const closed = await h.call('complete', { expectedVersion: 5 });
    assert.equal(closed.statusCode, 200, JSON.stringify(closed.body));
    assert.equal(h.monitoring().referenceData.acftTT, 100.9);
    assert.ok(h.state().legs.every(row => row.totalTimeOff === '00:20'));
    assert.equal(h.state().componentData.thisFlightData.rotorMain, '0.9');
    assert.equal(h.state().componentData.toDateData.rotorMain, '10.9');
    if (aircraftType === 'B412EP') assert.equal(h.monitoring().referenceData.eng2TT, 400.9);
  }
});

test('workspace displays servicing signatures from verified linked inspections on older flight records', async () => {
  const h = controllerHarness();
  h.pre.confirmation = { allGood: true };
  h.pre.releasedBy.signature = 'data:image/png;base64,verified';
  const response = await h.call('workspace');
  assert.equal(response.statusCode, 200, JSON.stringify(response.body));
  const shown = response.body.data.flightLog;
  for (const key of ['fuelServicing', 'oilServicing']) assert.equal(shown[key][0].signature, h.pre.releasedBy.signature);
  assert.equal(shown.initialInspectionSignature.signature, h.pre.releasedBy.signature);
  assert.equal(h.state().initialInspectionSignature, undefined);
});


test('workspace fills missing brought-forward values from monitoring and save persists them', async () => {
  for (const aircraftType of ['AS350B3e', 'B412EP']) {
    const h = controllerHarness(), record = h.state();
    record.aircraftType = aircraftType;
    record.status = 'pending_release';
    delete record.monitoringBaseline;
    record.componentData.broughtForwardData = {};
    Object.assign(h.monitoring().referenceData, { gbmTT: 60, gbtTT: 70, mrbTT: 80, trbTT: 90, eng1TT: 210, eng2TT: 310, eng1Cycles: 0, eng2Cycles: 42 });
    const response = await h.call('workspace');
    assert.equal(response.statusCode, 200, JSON.stringify(response.body));
    const displayed = response.body.data.flightLog;
    assert.equal(displayed.componentData.broughtForwardData.airframe, 100);
    assert.equal(displayed.componentData.broughtForwardData.rotorMain, 80);
    assert.equal(displayed.componentData.broughtForwardData.rotorTail, 90);
    assert.equal(displayed.componentData.broughtForwardData.engine, aircraftType === 'B412EP' ? 210 : 200);
    assert.equal(displayed.componentData.toDateData.airframe, '101.5');
    assert.deepEqual(record.componentData.broughtForwardData, {});
    const saved = await h.call('save', { changes: { componentData: { ...displayed.componentData, broughtForwardData: { airframe: 99999 } } } });
    assert.equal(saved.statusCode, 200, JSON.stringify(saved.body));
    assert.equal(h.state().componentData.broughtForwardData.airframe, 100);
    if (aircraftType === 'B412EP') {
      assert.equal(h.state().componentData.broughtForwardData.cycleN1, 0);
      assert.equal(h.state().b412Data.componentData.broughtForwardData.engine2.tsn, 310);
    }
  }
});

test('monitoring updates do not replace released snapshots or closed flight history', async () => {
  const h = controllerHarness();
  h.monitoring().referenceData.acftTT = 900;
  const released = await h.call('workspace');
  assert.equal(released.body.data.flightLog.componentData.broughtForwardData.airframe, 100);
  h.state().status = 'completed';
  h.state().componentData.broughtForwardData.airframe = '87';
  const closed = await h.call('workspace');
  assert.equal(closed.body.data.flightLog.componentData.broughtForwardData.airframe, '87');
});


test('overdue monitoring is advisory and a blank flight purpose permits release and acceptance', async () => {
  const h = controllerHarness();
  h.state().status = 'pending_release';
  h.state().flightPurpose = '';
  h.monitoring().parts = [
    { componentName: 'Certificate', daysRemaining: '-195' },
    { componentName: 'Inspection', timeRemaining: '0' },
    { componentName: 'Future inspection', timeRemaining: '40', daysRemaining: '20' },
    { componentName: 'Unknown hours', timeRemaining: '', daysRemaining: '' },
    { rowType: 'header', componentName: 'Section', timeRemaining: '-1' },
  ];
  const workspace = await h.call('workspace');
  assert.deepEqual(workspace.body.data.readiness.missing, []);
  assert.equal(workspace.body.data.readiness.maintenanceDue.length, 2);
  assert.ok(workspace.body.data.readiness.warnings.some(message => message.includes('2 overdue maintenance')));
  const release = await h.call('release');
  assert.equal(release.statusCode, 200, JSON.stringify(release.body));
  assert.equal(h.state().status, 'pending_acceptance');
  assert.equal(h.state().flightPurpose, '');
  const accept = await h.call('accept', { expectedVersion: 5 }, pilot);
  assert.equal(accept.statusCode, 200, JSON.stringify(accept.body));
  assert.equal(h.state().status, 'accepted');
});

test('optional purpose and monitoring warnings do not bypass an inspection discrepancy hold', async () => {
  const h = controllerHarness();
  h.state().status = 'pending_release';
  h.state().flightPurpose = '';
  h.pre.confirmation = { allGood: false };
  h.monitoring().parts = [{ componentName: 'Inspection', timeRemaining: '-5' }];
  const response = await h.call('release');
  assert.equal(response.statusCode, 400);
  assert.ok(response.body.missing.some(message => message.includes('Pre-Flight discrepancies')));
  assert.ok(response.body.missing.every(message => !message.includes('Maintenance due') && !message.includes('flight purpose')));
  assert.equal(h.state().status, 'pending_release');
});


test('pilot flight acceptance signs the stored record without saving form edits or comments', async () => {
  const h = controllerHarness();
  h.state().status = 'pending_acceptance';
  const before = clone(h.state());
  const response = await h.call('accept', {
    signature: 'data:image/png;base64,pilot', pin: '123456',
    changes: { controlNo: 'CHANGED', flightPurpose: 'other', legs: [], componentData: {}, assignedMechanic: { userId: pilotId } },
    comment: 'Pilot-entered record change',
  }, pilot);
  assert.equal(response.statusCode, 200, JSON.stringify(response.body));
  assert.equal(h.state().status, 'accepted');
  for (const field of ['controlNo', 'flightPurpose', 'legs', 'componentData', 'assignedMechanic']) assert.deepEqual(h.state()[field], before[field]);
  assert.equal(h.state().workflowHistory.at(-1).comment, '');
  assert.deepEqual(h.state().workflowHistory.at(-1).changes, {});
  assert.equal(h.state().pin, undefined);
});


test('flights close without ON/OFF clocks and default blank passenger counts to zero for both aircraft types', async () => {
  for (const aircraftType of ['AS350B3e', 'B412EP']) {
    const h = controllerHarness(), record = h.state();
    record.aircraftType = aircraftType;
    record.legs = [undefined, ''].map(passengers => ({ ...leg(), passengers, flightTimeOn: '', flightTimeOff: '', blockTimeOn: '', blockTimeOff: '', totalTimeOff: '00:30', totalTimeOn: '00:45' }));
    if (aircraftType === 'B412EP') {
      Object.assign(h.monitoring().referenceData, { eng1TT: 200, eng1Cycles: 30, eng2TT: 400, eng2Cycles: 40 });
      record.monitoringBaseline.referenceData = clone(h.monitoring().referenceData);
      record.b412Data = { componentData: { thisFlightData: { engine1: { cycle: '0.2' }, engine2: { cycle: '0.3' } } } };
    }
    const reviewed = await h.call('review');
    assert.equal(reviewed.statusCode, 200);
    assert.deepEqual(reviewed.body.data.missing, []);
    assert.equal(reviewed.body.data.mapped.acftTT, 101);
    const closed = await h.call('complete');
    assert.equal(closed.statusCode, 200, JSON.stringify(closed.body));
    assert.equal(h.monitoring().referenceData.acftTT, 101);
    assert.ok(h.state().legs.every(row => row.passengers === '0' && row.totalTimeOff === '00:30' && row.totalTimeOn === '00:45'));
  }
});

test('optional clock values are validated when supplied and component duration is still required', () => {
  const noClocks = { ...leg(), flightTimeOn: '', flightTimeOff: '', blockTimeOn: '', blockTimeOff: '', passengers: '' };
  assert.deepEqual(totals.validateLegs({ legs: [noClocks, { passengers: '0' }] }).missing, []);
  assert.equal(totals.validateLegs({ legs: [noClocks, { passengers: '0' }] }).legs.length, 1);
  assert.deepEqual(totals.validateLegs({ legs: [{ ...noClocks, flightTimeOn: '08:00' }] }).missing, []);
  assert.ok(totals.validateLegs({ legs: [{ ...noClocks, flightTimeOn: '25:00' }] }).missing.some(item => item.includes('ON time')));
  for (const passengers of ['-1', '1.5', 'invalid']) assert.ok(totals.validateLegs({ legs: [{ ...noClocks, passengers }] }).missing.some(item => item.includes('passenger')));
  assert.ok(totals.validateLegs({ legs: [{ ...noClocks, totalTimeOff: '' }] }).missing.some(item => item.includes('Total Time (FLIGHT)')));
});


test('release reuses the current mechanic pre-flight signature with only a PIN, including older logs', async () => {
  for (const aircraftType of ['AS350B3e', 'B412EP']) {
    const h = controllerHarness();
    h.state().status = 'pending_release';
    h.state().aircraftType = aircraftType;
    h.pre.status = 'released';
    if (aircraftType === 'B412EP') Object.assign(h.monitoring().referenceData, { eng1TT: 200, eng1Cycles: 30, eng2TT: 400, eng2Cycles: 40 });
    // These older records have only the signature on their linked inspection.
    assert.equal(h.state().initialInspectionSignature, undefined);
    const response = await h.call('release', { pin: '123456', signature: 'client-signature-must-not-be-used' });
    assert.equal(response.statusCode, 200, JSON.stringify(response.body));
    assert.equal(h.signingRequests[0].signature, h.pre.releasedBy.signature);
    assert.equal(h.signingRequests[0].pin, '123456');
    assert.equal(h.state().releasedBy.signature, h.pre.releasedBy.signature);
    assert.equal(h.state().workflowHistory.at(-1).signer.signature, h.pre.releasedBy.signature);
    assert.equal(h.state().status, 'pending_acceptance');
    assert.equal(h.state().releasedBy.pin, undefined);
    assert.equal(h.state().pin, undefined);
  }
});

test('release rejects an incorrect PIN and never substitutes another mechanic signature', async () => {
  const wrongPin = controllerHarness();
  wrongPin.state().status = 'pending_release';
  const rejected = await wrongPin.call('release', { pin: '999999' });
  assert.equal(rejected.statusCode, 403);
  assert.equal(wrongPin.state().status, 'pending_release');
  assert.equal(wrongPin.state().__v, 4);
  for (const missingSignature of [true, false]) {
    const h = controllerHarness();
    h.state().status = 'pending_release';
    if (missingSignature) delete h.pre.releasedBy.signature;
    else h.pre.releasedBy.userId = pilotId;
    const response = await h.call('release', { pin: '123456', signature: 'data:image/png;base64,client' });
    assert.equal(response.statusCode, 400);
    assert.match(response.body.message, /sign the linked Pre-Flight/);
    assert.equal(h.signingRequests.length, 0);
    assert.equal(h.state().status, 'pending_release');
  }
});

test('release signature selection prefers the certified inspection and excludes signatures from earlier crew', () => {
  const record = { assignedMechanic: { userId: mechanicId }, initialInspectionSignature: { userId: mechanicId, signature: 'initial' } };
  const pre = { status: 'released', releasedBy: { userId: mechanicId, signature: 'latest' } };
  assert.equal(stages.preflightSignatureForRelease(record, [pre]), 'latest');
  assert.equal(stages.preflightSignatureForRelease(record, [{ ...pre, releasedBy: { userId: mechanicId } }]), 'initial');
  assert.equal(stages.preflightSignatureForRelease(record, [{ ...pre, status: 'pending' }]), '');
  assert.equal(stages.preflightSignatureForRelease(record, [{ ...pre, releasedBy: { userId: pilotId, signature: 'former' } }]), '');
});
