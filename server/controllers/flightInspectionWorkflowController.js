const mongoose = require('mongoose');
const { confirmInspection } = require('../utils/flightInspectionConfirmation');
const { populateFlightInputs } = require('../../shared/flightAutomaticInputs');
const Pre = require('../models/preInspectionModel');
const Post = require('../models/postInspectionModel');
const FlightLog = require('../models/flightLogModel');
const {
  catchRequest,
  persistVersion,
  applyChanges
} = require('./flightWorkflowController');
const {
  fail,
  plain,
  checkVersion,
  eventFor
} = require('../utils/flightWorkflowRules');
const {
  verifyWorkflowSigner
} = require('../utils/flightWorkflowSigning');
const {
  isAssignedFlightCrew,
  getAssignedCrewField
} = require('../../shared/flightCrewAccess');
const {
  withInspectionCrew,
  pickInspectionUpdates
} = require('../utils/inspectionFlightCrew');
const {
  isB412AircraftType
} = require('../utils/flightLogPayload');
const {
  isAS350AircraftType
} = require('../utils/b412PreInspection');
const {
  flightStage
} = require('../../shared/flightWorkflow');
const {
  numeric
} = require('../utils/flightWorkflowTotals');
const {
  flushFlightNotifications
} = require('../utils/flightWorkflowNotificationOutbox');
const AS = require('../../shared/as350InspectionChecklist.json');
const BP = require('../../shared/b412PreInspectionChecklist.json');
const BO = require('../../shared/b412PostInspectionChecklist.json');
const getChecks = (kind, record) => isB412AircraftType(record.aircraftType) ? (kind === 'pre' ? BP : BO).sections.flatMap(s => s.items).filter(i => record.b412Data?.checks?.[i.key] !== true) : AS[kind].filter(i => record[i.key] !== true);
const edit = kind => catchRequest(async (req, res) => {
  const Model = kind === 'pre' ? Pre : Post;
  const record = await Model.findById(req.params.id);
  if (!record) throw fail('Inspection not found.', 404);
  if (req.params.flightId && String(record.flightLogId) !== String(req.params.flightId)) throw fail('This inspection belongs to another flight record.', 409);
  const log = await FlightLog.findById(record.flightLogId);
  if (!isAssignedFlightCrew(req.user, log)) throw fail('Only the linked flight record’s assigned crew may update this inspection.', 403);
  if (log.status === 'completed') throw fail('Closed flight records require a signed amendment.');
  checkVersion(record, req.body.expectedVersion ?? req.body.__v);
  const previous = plain(record),
    version = record.__v || 0;
  const mechanic = getAssignedCrewField(req.user) === 'assignedMechanic';
  const stage = flightStage(log);
  const preparation = ['pending_release', 'returned_to_mechanic'].includes(stage);
  if (!isB412AircraftType(record.aircraftType) && !isAS350AircraftType(record.aircraftType)) throw fail('No supported checklist is configured for this aircraft type.');
  const next = req.body.status || record.status;
  if (!mechanic && !(kind === 'pre' && record.status === 'released' && next === 'completed' && !req.body.action && !req.body.confirmation)) throw fail('Pilots may only sign acceptance of Pre-Flight inspections.', 403);
  if (!['pending', 'released', 'completed'].includes(next)) throw fail('Unknown inspection stage.');
  const returning = req.body.action === 'return';
  const changes = pickInspectionUpdates(req.body.changes || req.body, Model);
  for (const key of ['status', 'releasedBy', 'acceptedBy', 'workflowHistory', 'confirmation']) delete changes[key];
  if (!mechanic) for (const key of Object.keys(changes)) delete changes[key];
  let flightChanges = {};
  if (req.body.confirmation) {
    if (!mechanic) throw fail('The mechanic confirms inspection results.', 403);
    if (req.body.flightChanges) {
      checkVersion(log, req.body.flightExpectedVersion);
      flightChanges = await applyChanges(log, { ...req, body: { changes: req.body.flightChanges } });
    }
    if (kind === 'pre' && !preparation) throw fail('Return the flight record to preparation before correcting Pre-Flight.');
    if (kind === 'post' && !['accepted', 'submitted', 'returned_to_pilot'].includes(stage)) throw fail('Post-Flight confirmation follows pilot acceptance.');
    const { allGood, remarks, resolution } = req.body.confirmation;
    if (allGood && record.confirmation?.allGood === false && !String(resolution || '').trim()) throw fail('Describe how the inspection discrepancies were resolved.');
    const signer = allGood ? await verifyWorkflowSigner(req, log, `${kind}_confirmed_all`) : null;
    for (const [key, value] of Object.entries(changes)) record.set(key, value);
    confirmInspection(record, kind, allGood, allGood ? resolution || '' : remarks, signer, req.user);
    if (kind === 'pre' && allGood) {
      log.initialInspectionSignature = signer;
      const populated = populateFlightInputs(log.toObject());
      log.fuelServicing = populated.fuelServicing; log.oilServicing = populated.oilServicing;
      if (populated.b412Data) log.b412Data = populated.b412Data;
    }
  } else if (returning) {
    if (kind === 'post' && !mechanic) throw fail('The assigned mechanic must return Post-Flight for correction.', 403);
    if (!String(req.body.comment || '').trim()) throw fail('Explain the inspection correction.');
    if (kind === 'pre' && !preparation) throw fail('Return the flight record to mechanic preparation before correcting its Pre-Flight certification.');
    record.status = 'pending';
    record.releasedBy = {};
    record.acceptedBy = {};
    record.confirmation = null;
  } else {
    if (record.status === 'completed') throw fail('Return the inspection for correction before editing signed information.');
    if (record.status === 'pending') {
      if (kind === 'pre' && !preparation) throw fail('Pre-Flight preparation is locked after flight release.');
      if (kind === 'post' && !['accepted', 'submitted', 'returned_to_pilot'].includes(stage)) throw fail('Post-Flight is entered after aircraft acceptance.');
      for (const [key, value] of Object.entries(changes)) record.set(key, value);
    } else if (next !== 'completed') throw fail('Released inspection information is locked. Return it for correction.');
    if (next !== record.status) {
      if (kind === 'pre' && !(record.status === 'pending' && next === 'released' && mechanic || record.status === 'released' && next === 'completed' && !mechanic)) throw fail('The mechanic releases Pre-Flight; the pilot accepts it.', 403);
      if (kind === 'pre' && next === 'completed' && (stage !== 'pending_acceptance' || String(record.releasedBy?.userId) !== String(log.assignedMechanic?.userId))) throw fail('The current assigned mechanic must release this inspection and flight record before pilot acceptance.', 409);
      if (kind === 'post' && (!mechanic || next !== 'completed' || !['accepted', 'submitted', 'returned_to_pilot'].includes(log.status))) throw fail('The assigned mechanic completes Post-Flight after aircraft acceptance.', 403);
      const missing = getChecks(kind, record).map(item => item.title);
      if (kind === 'pre' && !record.confirmation?.allGood && (numeric(record.fob) === null || numeric(record.fob) < 0)) missing.push('Fuel on board (a nonnegative quantity)');
      if (missing.length) throw fail(`Complete the inspection: ${missing.join(', ')}.`, 400, {
        missing
      });
      const signer = await verifyWorkflowSigner(req, log, `${kind}_${next}`);
      record[kind === 'pre' && next === 'completed' ? 'acceptedBy' : 'releasedBy'] = signer;
      record.status = next;
      record.workflowHistory.push({
        ...eventFor(record, `${kind}_${next}`, req.user, changes, req.body.comment, signer),
        flightLogId: String(log._id)
      });
    }
  }
  if (returning) record.workflowHistory.push(eventFor(record, 'return', req.user, {}, req.body.comment));else if (!req.body.confirmation && next === previous.status) record.workflowHistory.push(eventFor(record, `${kind}_save_draft`, req.user, Object.fromEntries(Object.keys(changes).map(key => [key, {
    before: previous[key],
    after: plain(record[key])
  }]))));
  log.workflowHistory.push(eventFor(log, `${kind}_${returning ? 'returned' : record.status}`, req.user, {
    ...flightChanges,
    inspectionId: String(record._id),
    inspectionVersion: version + 1
  }, req.body.comment || req.body.confirmation?.remarks || req.body.confirmation?.resolution || ''));
  const session = await mongoose.startSession();
  let saved;
  try {
    await session.withTransaction(async () => {
      const object = record.toObject();
      delete object._id;
      delete object.__v;
      delete object.createdAt;
      delete object.updatedAt;
      saved = await Model.findOneAndUpdate({
        _id: record._id,
        __v: version
      }, {
        $set: object,
        $inc: {
          __v: 1
        }
      }, {
        session,
        returnDocument: 'after',
        runValidators: true
      });
      if (!saved) throw fail('The inspection changed. Reload it before saving.', 409);
      await persistVersion(log, log.__v || 0, session);
    });
  } finally {
    await session.endSession();
  }
  try {
    await flushFlightNotifications(log._id);
  } catch {/* Notification failures do not undo a committed inspection. */}
  res.json({
    success: true,
    data: withInspectionCrew(saved, log),
    message: 'Inspection saved.'
  });
});
const create = catchRequest(async (req, res) => {
  const log = await FlightLog.findById(req.params.id);
  if (!isAssignedFlightCrew(req.user, log) || getAssignedCrewField(req.user) !== 'assignedMechanic') throw fail('The assigned mechanic creates linked inspections.', 403);
  if (log.status === 'completed') throw fail('Choose an open flight record.');
  if (!['pending_release', 'returned_to_mechanic'].includes(flightStage(log))) throw fail('Create linked inspections during flight preparation.');
  if (!isB412AircraftType(log.aircraftType) && !isAS350AircraftType(log.aircraftType)) throw fail('No supported inspection checklist is configured for this aircraft type.');
  checkVersion(log, req.body.expectedVersion);
  const initial = log.toObject();
  const session = await mongoose.startSession();
  let pre, post;
  try {
    await session.withTransaction(async () => {
      const current = new FlightLog(initial);
      if ((await Pre.exists({
        flightLogId: log._id
      }).session(session)) || (await Post.exists({
        flightLogId: log._id
      }).session(session))) throw fail('This flight already has linked inspections. Open those inspections to continue.', 409);
      const payload = {
        flightLogId: log._id,
        aircraftType: log.aircraftType,
        rpc: log.rpc,
        date: log.date,
        createdBy: req.user.id,
        status: 'pending',
        ...(isB412AircraftType(log.aircraftType) ? {
          b412Data: {
            checks: {}
          }
        } : {})
      };
      const draft = pickInspectionUpdates(req.body.changes || {}, Pre);
      for (const field of ['status', 'releasedBy', 'acceptedBy', 'workflowHistory', 'confirmation']) delete draft[field];
      [pre] = await Pre.create([{
        ...draft,
        ...payload,
        ...(draft.b412Data ? {
          b412Data: draft.b412Data
        } : {})
      }], {
        session
      });
      [post] = await Post.create([{
        ...payload,
        preInspectionId: pre._id,
        linkedFromPreFlight: true
      }], {
        session
      });
      current.workflowHistory.push(eventFor(current, 'inspections_created', req.user, {
        preId: String(pre._id),
        postId: String(post._id)
      }));
      await persistVersion(current, log.__v || 0, session);
    });
  } finally {
    await session.endSession();
  }
  try {
    await flushFlightNotifications(log._id);
  } catch {/* Durable notification remains queued. */}
  res.status(201).json({
    success: true,
    data: {
      pre,
      post
    }
  });
});
const createLegacy = (req, res) => {
  req.params.id = req.body.flightLogId;
  return create(req, res);
};
const remove = (_req, res) => res.status(409).json({
  success: false,
  message: 'Flight inspection records and their sign-off history are retained. Return an open inspection for correction or record an amendment to a completed flight.'
});
module.exports = {
  edit,
  create,
  createLegacy,
  remove,
  getChecks
};
