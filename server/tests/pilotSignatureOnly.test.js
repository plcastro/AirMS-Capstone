const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const Pre = require('../models/preInspectionModel');
const Post = require('../models/postInspectionModel');
const Flight = require('../models/flightLogModel');
const { checklistValues } = require('../utils/flightInspectionConfirmation');
const pilot = { id: '000000000000000000000001', jobTitle: 'Pilot' };
const mechanicId = '000000000000000000000002';
const signature = 'data:image/png;base64,verified';
const { pilotAcceptance } = require('../../shared/flightWorkflow');

test('pilot acceptance buttons follow release, Pre-Flight signing and flight-log signing in order', () => {
  const record = { status: 'pending_acceptance', assignedPilot: { userId: pilot.id }, assignedMechanic: { userId: mechanicId } };
  const pre = { _id: 'inspection', status: 'released', releasedBy: { userId: mechanicId } };
  const first = pilotAcceptance(pilot, record, [pre]);
  assert.equal(first.preInspection, pre);
  assert.equal(first.canAcceptFlight, false);
  const accepted = { ...pre, status: 'completed', acceptedBy: { userId: pilot.id } };
  const second = pilotAcceptance(pilot, record, [accepted]);
  assert.equal(second.preInspection, undefined);
  assert.equal(second.canAcceptFlight, true);
  assert.equal(pilotAcceptance(pilot, { ...record, status: 'accepted' }, [accepted]).canAcceptFlight, undefined);
  assert.equal(pilotAcceptance({ ...pilot, id: mechanicId }, record, [pre]).preInspection, undefined);
  assert.equal(pilotAcceptance(pilot, { ...record, status: 'pending_release' }, [pre]).preInspection, undefined);
  assert.equal(pilotAcceptance(pilot, record, []).canAcceptFlight, false);
  assert.equal(pilotAcceptance(pilot, record, [{ ...pre, releasedBy: { userId: 'former mechanic' } }]).preInspection, undefined);
  assert.equal(pilotAcceptance({ id: mechanicId, jobTitle: 'Mechanic' }, record, [pre]), null);
  assert.equal(pilotAcceptance(pilot, record, [accepted, pre]).canAcceptFlight, false);
});

function harness(aircraftType = 'AS350B3e') {
  const log = new Flight({ rpc: 'RP-CTEST', aircraftType, status: 'pending_acceptance',
    assignedPilot: { userId: pilot.id, name: 'Pilot' }, assignedMechanic: { userId: mechanicId, name: 'Mechanic' },
    __v: 2, workflowHistory: [] });
  const initial = { flightLogId: log._id, rpc: log.rpc, aircraftType, date: '09/25/2026',
    status: 'released', fob: '120', releasedBy: { userId: mechanicId, signature }, __v: 1,
    confirmation: { allGood: true }, ...checklistValues('pre', aircraftType, true) };
  const record = new Pre(initial);
  let saved, signingCalls = 0;
  const inspectionModel = Model => ({ schema: Model.schema, findById: async () => record,
    findOneAndUpdate: async (_filter, update) => {
      const document = new Pre({ ...record.toObject(), ...update.$set });
      await document.validate(); saved = document.toObject(); return document;
    } });
  const dependencies = {
    mongoose: { startSession: async () => ({ withTransaction: async callback => callback(), endSession: async () => {} }) },
    '../models/preInspectionModel': inspectionModel(Pre),
    '../models/postInspectionModel': inspectionModel(Post),
    '../models/flightLogModel': { findById: async () => log },
    './flightWorkflowController': {
      catchRequest: handler => async (req, res) => { try { await handler(req, res); } catch (error) { res.status(error.status || 500).json({ message: error.message }); } },
      persistVersion: async () => { await log.validate(); },
      applyChanges: async () => { throw Error('Pilot attempted to change flight data'); },
    },
    '../utils/flightWorkflowSigning': { verifyWorkflowSigner: async req => {
      assert.equal(req.body.pin, '123456'); assert.equal(req.body.signature, signature); signingCalls++;
      return { userId: pilot.id, name: 'Pilot', title: 'Pilot', signature, timestamp: new Date().toISOString() };
    } },
    '../utils/flightWorkflowNotificationOutbox': { flushFlightNotifications: async () => {} },
  };
  const file = path.join(__dirname, '../controllers/flightInspectionWorkflowController.js');
  const localRequire = createRequire(file), module = { exports: {} };
  vm.compileFunction(fs.readFileSync(file, 'utf8'), ['require', 'module', 'exports'], { filename: file })(
    name => Object.hasOwn(dependencies, name) ? dependencies[name] : localRequire(name), module, module.exports);
  return { record, log, saved: () => saved, signingCalls: () => signingCalls,
    async call(kind = 'pre', body = {}) {
      const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
      await module.exports.edit(kind)({ user: pilot, params: { id: String(record._id), flightId: String(log._id) },
        body: { expectedVersion: 1, status: 'completed', signature, pin: '123456', ...body } }, res);
      return res;
    } };
}

test('pilot pre-flight acceptance needs only signature/PIN and preserves mechanic data for both aircraft types', async () => {
  for (const type of ['AS350B3e', 'B412EP']) {
    const h = harness(type);
    const response = await h.call('pre', {
      changes: { fob: '999', date: '01/01/2000', b412Data: { checks: {} }, releasedBy: { name: 'Forged' } },
      flightChanges: { controlNo: 'Changed' }, comment: 'Unapproved pilot edit',
    });
    assert.equal(response.statusCode, 200, JSON.stringify(response.body));
    assert.equal(h.signingCalls(), 1);
    assert.equal(h.saved().status, 'completed');
    assert.equal(h.saved().fob, '120');
    assert.equal(h.saved().date, '09/25/2026');
    assert.equal(String(h.saved().releasedBy.userId), mechanicId);
    assert.equal(String(h.saved().acceptedBy.userId), pilot.id);
    assert.equal(h.saved().acceptedBy.signature, signature);
    assert.equal(h.saved().workflowHistory.at(-1).comment, '');
    assert.equal(h.log.workflowHistory.at(-1).comment, '');
    assert.equal(h.saved().pin, undefined);
    if (type === 'B412EP') assert.deepEqual(h.saved().b412Data.checks, h.record.toObject().b412Data.checks);
  }
});

test('pilots cannot save inspection data, return inspections, confirm checklists or sign Post-Flight', async () => {
  for (const [kind, body] of [
    ['pre', { status: 'released', changes: { fob: '999' } }],
    ['pre', { action: 'return', comment: 'Return' }],
    ['pre', { confirmation: { allGood: true } }],
    ['post', {}],
  ]) {
    const h = harness(), response = await h.call(kind, body);
    assert.equal(response.statusCode, 403, JSON.stringify(response.body));
    assert.equal(h.signingCalls(), 0);
    assert.equal(h.saved(), undefined);
  }
});
