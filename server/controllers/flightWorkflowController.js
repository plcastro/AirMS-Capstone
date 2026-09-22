const { b412WorkflowComponents } = require('../../shared/b412WorkflowComponents');
const { populateFlightInputs } = require('../../shared/flightAutomaticInputs');
const { confirmInspection } = require('../utils/flightInspectionConfirmation');
const mongoose = require('mongoose');
const FlightLog = require('../models/flightLogModel');
const Pre = require('../models/preInspectionModel');
const Post = require('../models/postInspectionModel');
const Parts = require('../models/partsMonitoringModel');
const Defect = require('../models/flightDefectModel');
const Authorization = require('../models/flightCrewAuthorizationModel');
const User = require('../models/userModel');
const {
  fail,
  plain,
  checkVersion,
  transition,
  editableChanges,
  eventFor
} = require('../utils/flightWorkflowRules');
const {
  verifyWorkflowSigner
} = require('../utils/flightWorkflowSigning');
const {
  reviewTotals,
  validateLegs,
  numeric,
  monitoringReconciliation
} = require('../utils/flightWorkflowTotals');
const {
  resolveFlightLogCrew
} = require('../utils/flightLogCrew');
const {
  isB412AircraftType
} = require('../utils/flightLogPayload');
const {
  flightStage
} = require('../../shared/flightWorkflow');
const {
  isAssignedFlightCrew,
  getAssignedCrewField
} = require('../../shared/flightCrewAccess');
const {
  pendingFlightNotification,
  flushFlightNotifications
} = require('../utils/flightWorkflowNotificationOutbox');
const {
  processDataWithFormulas,
  getToday
} = require('../utils/partsMonitoringFormulas');
const catchRequest = handler => async (req, res) => {
  try {
    await handler(req, res);
  } catch (error) {
    const unsupported = /Transaction numbers are only allowed|replica set|does not support retryable writes/i.test(error.message || '');
    const status = unsupported ? 503 : error.status || (['ValidationError', 'CastError'].includes(error.name) ? 400 : error.name === 'VersionError' ? 409 : 500);
    res.status(status).json({
      success: false,
      message: unsupported ? 'This operation requires MongoDB transactions (a replica set or Atlas). No partial workflow changes were saved.' : status === 500 ? 'Unable to save the flight record. Your draft has been retained; try again.' : error.message,
      missing: error.missing,
      currentVersion: error.currentVersion
    });
  }
};
const load = async (id, session = null) => {
  const record = await FlightLog.findById(id).session(session);
  if (!record) throw fail('Flight log not found.', 404);
  return record;
};
const requireCrew = (req, log) => {
  if (!isAssignedFlightCrew(req.user, log)) throw fail('Only the assigned pilot and mechanic may change this flight record.', 403);
};
const inspectionSignoffErrors = (log, links, requireAccepted = true, requirePost = false) => {
  const missing = [];
  if (!links.preInspections.length) missing.push('Add the linked Pre-Flight inspection.');
  for (const pre of links.preInspections) {
    if (!['released', 'completed'].includes(pre.status) || String(pre.releasedBy?.userId || '') !== String(log.assignedMechanic?.userId || '')) missing.push('The current assigned mechanic must certify every Pre-Flight inspection. Return earlier certifications for correction if the crew changed.');
    if (requireAccepted && (pre.status !== 'completed' || String(pre.acceptedBy?.userId || '') !== String(log.assignedPilot?.userId || ''))) missing.push('The current assigned pilot must accept every Pre-Flight inspection.');
  }
  if (requirePost && (!links.postInspections.length || links.postInspections.some(post => post.status !== 'completed' || String(post.releasedBy?.userId || '') !== String(log.assignedMechanic?.userId || '')))) missing.push('The current assigned mechanic must complete every Post-Flight inspection.');
  return [...new Set(missing)];
};
const related = async (record, session = null) => {
  const rpc = String(record.rpc).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const queries = [Pre.find({
    flightLogId: record._id
  }).sort({
    createdAt: -1
  }).session(session).lean(), Post.find({
    flightLogId: record._id
  }).sort({
    createdAt: -1
  }).session(session).lean(), Parts.findOne({
    aircraft: {
      $regex: `^${rpc}$`,
      $options: 'i'
    }
  }).session(session), Defect.find({
    rpc: record.rpc.toUpperCase()
  }).sort({
    createdAt: -1
  }).session(session).lean()];
  // MongoDB does not support parallel operations within a transaction.
  const values = [];
  if (session) {
    for (const query of queries) values.push(await query);
  } else values.push(...(await Promise.all(queries)));
  const [preInspections, postInspections, monitoring, defects] = values;
  return {
    preInspections,
    postInspections,
    monitoring,
    defects
  };
};
const readiness = (record, links) => {
  const missing = [],
    warnings = [];
  if (!record.assignedPilot?.userId) missing.push('Assign a pilot.');
  if (!record.assignedMechanic?.userId) missing.push('Assign a mechanic.');
  if (!record.flightPurpose) missing.push('Choose the flight purpose.');
  if (!record.controlNo?.trim()) missing.push('Enter a control number.');
  if (!record.date || Number.isNaN(new Date(record.date).getTime())) missing.push('Enter a valid flight date.');
  if (!links.monitoring) missing.push('Create the aircraft Parts Monitoring record.');else {
    for (const row of reviewTotals(record, links.monitoring).totals) {
      if (row.broughtForward === null) missing.push(`${row.item}: enter the brought-forward value in Parts Monitoring.`);
    }
  }
  if (links.preInspections.some(pre => pre.confirmation?.allGood === false)) missing.push('Pre-Flight discrepancies are on hold. Resolve them and confirm the inspection before release.');
  const blockingDefects = links.defects.filter(d => d.status === 'open' || d.status === 'deferred' && (!d.dueDate || new Date(d.dueDate).getTime() <= Date.now()));
  if (blockingDefects.length) missing.push(`${blockingDefects.length} open or overdue aircraft defect(s) need maintenance disposition before release.`);
  const currentParts = links.monitoring ? processDataWithFormulas((links.monitoring.parts || []).map(plain), {
    ...plain(links.monitoring.referenceData),
    today: getToday(),
    aircraftType: links.monitoring.aircraftType
  }) : [];
  for (const item of currentParts) {
    if (item.rowType === 'header') continue;
    if (numeric(item.timeRemaining) !== null && numeric(item.timeRemaining) <= 0 || numeric(item.daysRemaining) !== null && numeric(item.daysRemaining) < 0) missing.push(`Maintenance due: ${item.componentName}.`);
  }
  if (!links.preInspections.length) warnings.push('Create and complete the linked Pre-Flight inspection.');
  if (!links.postInspections.length) warnings.push('A linked Post-Flight inspection is required for closure.');
  if (links.defects.some(d => d.status === 'deferred')) warnings.push('Review deferred defect limitations before flight.');
  return {
    missing,
    warnings,
    monitoringAvailable: Boolean(links.monitoring),
    aircraftStatus: [...links.preInspections, ...links.postInspections].some(record => record.confirmation?.allGood === false) ? 'Inspection discrepancy hold' : blockingDefects.length ? 'Maintenance hold' : links.defects.some(d => d.status === 'deferred') ? 'Deferred defects — review limitations' : 'No open defects recorded'
  };
};
const applyChanges = async (record, req) => {
  const source = req.body.changes || req.body;
  const changes = editableChanges(plain(record), req.user, source);
  const crew = await resolveFlightLogCrew(req, changes, record);
  if (crew.error) throw fail(crew.error);
  delete changes.assignedPilot;
  delete changes.assignedMechanic;
  Object.assign(changes, crew.assignments);
  const before = {};
  for (const [key, value] of Object.entries(changes)) {
    before[key] = plain(record[key]);
    record.set(key, value);
  }
  if (getAssignedCrewField(req.user) === 'assignedMechanic') {
    const populated = populateFlightInputs(record.toObject());
    for (const key of ['componentData', 'b412Data', 'fuelServicing', 'oilServicing']) if (populated[key] !== undefined) record.set(key, populated[key]);
  }
  return Object.fromEntries(Object.keys(changes).map(key => [key, {
    before: before[key],
    after: plain(record[key])
  }]));
};
const persistVersion = async (record, originalVersion, session = null) => {
  await record.validate();
  const data = record.toObject();
  delete data._id;
  delete data.__v;
  delete data.createdAt;
  delete data.updatedAt;
  delete data.pendingNotifications;
  const unset = {};
  for (const field of ['releasedBy', 'acceptedBy', 'submittedBy', 'completedBy']) {
    if (record[field] == null) { delete data[field]; unset[field] = 1; }
  }
  const event = pendingFlightNotification(record, originalVersion);
  const saved = await FlightLog.findOneAndUpdate({
    _id: record._id,
    __v: originalVersion
  }, {
    $set: data,
    ...(Object.keys(unset).length ? { $unset: unset } : {}),
    $inc: {
      __v: 1
    },
    ...(event ? {
      $push: {
        pendingNotifications: event
      }
    } : {})
  }, {
    returnDocument: 'after',
    runValidators: true,
    session
  });
  if (!saved) throw fail('This record was updated by someone else. Reload and review your draft.', 409);
  return saved;
};
const notify = async (_previous, saved) => {
  try {
    await flushFlightNotifications(saved._id);
  } catch {/* The durable outbox retries after a delivery failure. */}
};
const workspace = catchRequest(async (req, res) => {
  const flightLog = await load(req.params.id);
  const links = await related(flightLog);
  res.json({
    success: true,
    data: {
      flightLog,
      preInspections: links.preInspections,
      postInspections: links.postInspections,
      defects: links.defects,
      readiness: readiness(flightLog, links),
      history: flightLog.workflowHistory || [],
      amendments: flightLog.amendments || []
    }
  });
});
const review = catchRequest(async (req, res) => {
  const log = await load(req.params.id);
  requireCrew(req, log);
  checkVersion(log, req.body.expectedVersion);
  await applyChanges(log, req);
  const links = await related(log);
  const result = reviewTotals(log, links.monitoring);
  result.monitoringReconciliation = monitoringReconciliation(log, links.monitoring);
  result.missing.push(...inspectionSignoffErrors(log, links, true, false));
  result.postFlightConfirmationRequired = true;
  res.json({
    success: true,
    data: result
  });
});
const save = catchRequest(async (req, res) => {
  const log = await load(req.params.id);
  requireCrew(req, log);
  if (getAssignedCrewField(req.user) !== 'assignedMechanic') throw fail('Pilots may only sign Pre-Flight and flight-log acceptance.', 403);
  if (flightStage(log) === 'completed') throw fail('Closed records require a recorded amendment.');
  checkVersion(log, req.body.expectedVersion ?? req.body.__v);
  const version = log.__v || 0;
  const changes = await applyChanges(log, req);
  if (!Object.keys(changes).length) return res.json({
    success: true,
    data: log,
    message: 'No editable changes.'
  });
  log.workflowHistory.push(eventFor(log, 'save_draft', req.user, changes));
  const saved = await persistVersion(log, version);
  await notify(null, saved);
  res.json({
    success: true,
    data: saved,
    message: 'Draft saved.'
  });
});
const action = actionName => catchRequest(async (req, res) => {
  let log = await load(req.params.id);
  requireCrew(req, log);
  if (actionName === 'complete' && log.status === 'completed' && log.completionReceipt) {
    if (getAssignedCrewField(req.user) !== 'assignedMechanic') throw fail('Only the assigned mechanic can complete this record.', 403);
    return res.json({
      success: true,
      data: log,
      receipt: log.completionReceipt,
      replayed: true
    });
  }
  checkVersion(log, req.body.expectedVersion);
  const next = transition(log, req.user, actionName);
  const previous = plain(log);
  const version = log.__v || 0;
  const changes = await applyChanges(log, req);
  const comment = String(req.body.comment || '').trim();
  if (actionName === 'return' && !comment) throw fail('Explain what needs correcting.');
  const signingRequest = actionName === 'complete' && req.body.postFlightConfirmation?.appendSignature && log.initialInspectionSignature?.signature
    ? { ...req, body: { ...req.body, signature: log.initialInspectionSignature.signature } } : req;
  const signer = actionName === 'return' ? null : await verifyWorkflowSigner(signingRequest, log, actionName);
  const links = await related(log);
  if (['release', 'accept'].includes(actionName)) {
    const missing = readiness(log, links).missing;
    missing.push(...inspectionSignoffErrors(log, links, actionName === 'accept'));
    if (missing.length) throw fail(missing.join('\n'), 400, {
      missing
    });
  }
  if (actionName === 'release') {
    log.monitoringBaseline = {
      id: String(links.monitoring._id),
      referenceData: plain(links.monitoring.referenceData)
    };
    log.releasedBy = signer;
    log.acceptedBy = undefined;
    log.submittedBy = undefined;
    log.notifiedForCompletion = false;
  }
  if (actionName === 'accept') log.acceptedBy = signer;
  if (actionName === 'submit') {
    const validation = validateLegs(log);
    if (validation.missing.length) throw fail(validation.missing.join('\n'), 400, {
      missing: validation.missing
    });
    if (!log.noDefectsReported && !log.remarks?.trim() && !links.defects.some(d => String(d.flightLogId) === String(log._id))) throw fail('Report any discrepancies or explicitly confirm no defects were reported.');
    log.legs = validation.legs;
    log.submittedBy = signer;
    log.notifiedForCompletion = true;
  }
  if (actionName === 'return') {
    if (next === 'returned_to_mechanic') {
      log.releasedBy = undefined;
      log.acceptedBy = undefined;
      log.submittedBy = undefined;
    } else log.submittedBy = undefined;
    log.notifiedForCompletion = false;
  }
  log.status = next;
  if (actionName !== 'complete') {
    log.workflowHistory.push(eventFor(log, actionName, req.user, changes, comment, signer));
    log = await persistVersion(log, version);
  } else {
    // Retrying a transaction must begin with an unchanged candidate document.
    const candidate = log.toObject();
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const current = await load(req.params.id, session);
        checkVersion(current, version);
        log = new FlightLog(candidate);
        const currentLinks = await related(current, session);
        if (req.body.postFlightConfirmation?.allGood !== true || req.body.postFlightConfirmation?.appendSignature !== true) throw fail('Confirm that all Post-Flight inspection items are satisfactory and append your signature before closing.');
        if (!currentLinks.postInspections.length) throw fail('Add the linked Post-Flight inspection.');
        for (let index = 0; index < currentLinks.postInspections.length; index++) {
          const post = new Post(currentLinks.postInspections[index]);
          if (post.confirmation?.allGood === false && !String(req.body.postFlightConfirmation.resolution || '').trim()) throw fail('Describe how the Post-Flight discrepancies were resolved.');
          confirmInspection(post, 'post', true, req.body.postFlightConfirmation.resolution || '', signer, req.user);
          const data = post.toObject(); delete data._id; delete data.__v; delete data.createdAt; delete data.updatedAt;
          const savedPost = await Post.findOneAndUpdate({ _id: post._id, __v: post.__v || 0 }, { $set: data, $inc: { __v: 1 } }, { session, returnDocument: 'after', runValidators: true });
          if (!savedPost) throw fail('The Post-Flight inspection changed. Reload and review it.', 409);
          currentLinks.postInspections[index] = savedPost;
        }
        const review = reviewTotals(log, currentLinks.monitoring);
        review.missing.push(...inspectionSignoffErrors(log, currentLinks, true, true));
        if (review.missing.length) throw fail(review.missing.join('\n'), 400, {
          missing: review.missing
        });
        if (monitoringReconciliation(current, currentLinks.monitoring).required) throw fail('Parts Monitoring usage changed since release. Review and sign the monitoring reconciliation before closing.', 409);
        log.legs = review.legs;
        if (isB412AircraftType(log.aircraftType)) { log.b412Data.componentData = review.componentData; log.componentData = b412WorkflowComponents(review.componentData); } else log.componentData = review.componentData;
        const monitoring = currentLinks.monitoring;
        const refs = {
          ...plain(monitoring.referenceData),
          ...review.mapped,
          today: getToday()
        };
        monitoring.referenceData = refs;
        monitoring.parts = processDataWithFormulas((monitoring.parts || []).map(plain), {
          ...refs,
          aircraftType: monitoring.aircraftType
        });
        monitoring.lastUpdated = new Date();
        monitoring.updatedBy = signer.name;
        await monitoring.save({
          session
        });
        log.completedBy = signer;
        log.completionReceipt = {
          flightLogId: String(log._id),
          completedAt: new Date().toISOString(),
          monitoringId: String(monitoring._id),
          totals: review.totals,
          version: version + 1
        };
        log.workflowHistory.push(eventFor(log, actionName, req.user, changes, comment, signer));
        log = await persistVersion(log, version, session);
      });
    } finally {
      await session.endSession();
    }
  }
  await notify(previous, log, req);
  res.json({
    success: true,
    data: log,
    message: `${actionName === 'complete' ? 'Flight record closed' : 'Flight record updated'}.`
  });
});
const reconcile = catchRequest(async (req, res) => {
  const log = await load(req.params.id);
  requireCrew(req, log);
  checkVersion(log, req.body.expectedVersion);
  if (getAssignedCrewField(req.user) !== 'assignedMechanic' || !['accepted', 'returned_to_pilot', 'submitted'].includes(flightStage(log))) throw fail('The assigned mechanic reconciles monitoring during final review.', 403);
  const comment = String(req.body.comment || '').trim();
  if (!comment) throw fail('Explain the monitoring change and confirm this flight usage has not already been posted.');
  const links = await related(log);
  if (!links.monitoring) throw fail('Create the aircraft Parts Monitoring record before reconciliation.');
  const comparison = monitoringReconciliation(log, links.monitoring);
  if (!comparison.required) return res.json({
    success: true,
    data: log,
    message: 'Monitoring usage is already current.'
  });
  const signer = await verifyWorkflowSigner(req, log, 'monitoring_reconciliation');
  log.monitoringBaseline = {
    id: String(links.monitoring._id),
    referenceData: plain(links.monitoring.referenceData)
  };
  log.workflowHistory.push(eventFor(log, 'monitoring_reconciled', req.user, comparison, comment, signer));
  const saved = await persistVersion(log, log.__v || 0);
  await notify(null, saved);
  res.json({
    success: true,
    data: saved,
    message: 'Monitoring baseline reconciled. Review the updated totals before completion.'
  });
});

// An amendment is an additional signed entry. It never edits a closed snapshot
// or silently rewrites usage already posted to the maintenance ledger.
const amend = catchRequest(async (req, res) => {
  const log = await load(req.params.id);
  requireCrew(req, log);
  checkVersion(log, req.body.expectedVersion);
  if (log.status !== 'completed') throw fail('Amendments are for closed flight records.');
  if (getAssignedCrewField(req.user) !== 'assignedMechanic') throw fail('Pilots may only sign acceptance.', 403);
  const comment = String(req.body.comment || '').trim();
  const correction = req.body.correction;
  if (!comment || !correction?.field || !String(correction.after ?? '').trim()) throw fail('Select the record section, enter the correction, and explain the reason.');
  const pilot = getAssignedCrewField(req.user) === 'assignedPilot';
  const fields = pilot ? [] : ['flight_details', 'maintenance_work', 'servicing', 'discrepancies'];
  if (!fields.includes(correction.field)) throw fail('The responsible pilot or mechanic must certify this correction.', 403);
  if (req.body.affectsUsage === true) throw fail('Usage corrections require maintenance-ledger reconciliation. Record the issue as an amendment and reconcile through Parts Monitoring before another release.');
  const signer = await verifyWorkflowSigner(req, log, 'amendment');
  const entry = {
    section: correction.field,
    correction: String(correction.after).trim(),
    reason: comment,
    at: new Date().toISOString(),
    signer,
    originalVersion: log.__v || 0
  };
  log.amendments.push(entry);
  log.workflowHistory.push(eventFor(log, 'amend', req.user, {
    amendment: entry
  }, comment, signer));
  const saved = await persistVersion(log, log.__v || 0);
  await notify(log, saved, req);
  res.json({
    success: true,
    data: saved
  });
});
const defects = catchRequest(async (req, res) => {
  const log = await load(req.params.id);
  requireCrew(req, log);
  if (log.status === 'completed') throw fail('Open the current flight record to report or resolve aircraft defects.');
  if (getAssignedCrewField(req.user) !== 'assignedMechanic') throw fail('Only the assigned mechanic enters discrepancies.', 403);
  checkVersion(log, req.body.expectedVersion);
  let defect = req.params.defectId ? await Defect.findById(req.params.defectId) : new Defect({
    flightLogId: log._id,
    rpc: log.rpc.toUpperCase(),
    reportedBy: req.user.id
  });
  if (!defect || defect.rpc !== log.rpc.toUpperCase()) throw fail('Aircraft defect not found.', 404);
  if (req.params.defectId) checkVersion(defect, req.body.defectVersion);
  const before = plain(defect);
  const status = req.body.status || 'open';
  if (!['open', 'rectified', 'deferred'].includes(status)) throw fail('Select a valid defect status.');
  if (req.params.defectId && getAssignedCrewField(req.user) !== 'assignedMechanic') throw fail('Only the assigned mechanic may change defect dispositions.', 403);
  if (!req.params.defectId) {
    defect.description = String(req.body.description || '').trim();
    defect.evidence = String(req.body.evidence || '').trim();
  }
  if (!defect.description) throw fail('Describe the defect.');
  if (defect.evidence && !/^https:\/\//.test(defect.evidence)) throw fail('Evidence links must use HTTPS.');
  if (status !== 'open') {
    if (getAssignedCrewField(req.user) !== 'assignedMechanic') throw fail('Only the assigned mechanic can certify defect dispositions.', 403);
    if (!String(req.body.resolution || '').trim()) throw fail('Record the corrective work or deferral limitations.');
    if (status === 'deferred' && (!String(req.body.deferralReference || '').trim() || !req.body.dueDate || !(new Date(req.body.dueDate).getTime() > Date.now()))) throw fail('A deferral needs its approved basis and a future correction deadline.');
    defect.signedBy = await verifyWorkflowSigner(req, log, `defect_${status}`);
  } else defect.signedBy = null;
  defect.status = status;
  defect.resolution = String(req.body.resolution || '').trim();
  defect.deferralReference = String(req.body.deferralReference || '').trim();
  defect.dueDate = status === 'deferred' ? req.body.dueDate : null;
  defect.history.push({
    at: new Date().toISOString(),
    actorId: req.user.id,
    before: {
      status: before.status,
      resolution: before.resolution,
      dueDate: before.dueDate
    },
    after: {
      status,
      resolution: defect.resolution,
      dueDate: defect.dueDate
    },
    signer: defect.signedBy
  });
  log.workflowHistory.push(eventFor(log, 'defect', req.user, {
    defectId: String(defect._id),
    status
  }));
  const defectData = defect.toObject();
  const isNewDefect = defect.isNew;
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      // Use a fresh document on each driver retry; no duplicated history/version.
      if (isNewDefect) {
        defect = new Defect(defectData);
        await defect.save({
          session
        });
      } else {
        const update = {
          ...defectData
        };
        delete update._id;
        delete update.__v;
        delete update.createdAt;
        delete update.updatedAt;
        defect = await Defect.findOneAndUpdate({
          _id: defectData._id,
          __v: defectData.__v || 0
        }, {
          $set: update,
          $inc: {
            __v: 1
          }
        }, {
          session,
          returnDocument: 'after',
          runValidators: true
        });
        if (!defect) throw fail('The defect changed. Reload before recording its disposition.', 409);
      }
      await persistVersion(log, log.__v || 0, session);
    });
  } finally {
    await session.endSession();
  }
  await notify(log, {
    ...plain(log),
    updatedAt: new Date()
  }, req);
  res.json({
    success: true,
    data: defect
  });
});
const canManageAuthority = req => ['superadmin', 'maintenance manager'].includes(String(req.user?.jobTitle || '').toLowerCase()) || String(req.user?.access || '').toLowerCase() === 'superadmin';
const authorizations = catchRequest(async (req, res) => {
  if (!canManageAuthority(req)) throw fail('Only the maintenance manager or superadmin can manage signing authorizations.', 403);
  if (req.method === 'GET') {
    const [records, crew] = await Promise.all([Authorization.find().lean(), User.find({
      jobTitle: {
        $in: ['Pilot', 'Mechanic']
      },
      status: 'active'
    }).select('firstName lastName jobTitle licenseNo').lean()]);
    return res.json({
      success: true,
      data: {
        records,
        crew
      }
    });
  }
  const user = await User.findById(req.body.userId);
  if (!user || !['Pilot', 'Mechanic'].includes(user.jobTitle) || !user.licenseNo) throw fail('Choose an active pilot or mechanic with an account license number.');
  if (user.status !== 'active' && req.body.active !== false || !String(req.body.reference || '').trim() || !String(req.body.licenseType || '').trim() || !Number.isFinite(new Date(req.body.validUntil).getTime()) || req.body.active !== false && !(new Date(req.body.validUntil).getTime() > Date.now())) throw fail('Enter the license type, verified authority reference, and future expiry for active authorizations.');
  const aircraft = (req.body.aircraft || []).map(rpc => String(rpc).trim().toUpperCase()).filter(rpc => /^RP-C\d+$/.test(rpc));
  if (!aircraft.length) throw fail('Specify at least one authorized RP-C registration.');
  let record = await Authorization.findOne({
    userId: user._id
  });
  if (record) checkVersion(record, req.body.expectedVersion);else record = new Authorization({
    userId: user._id
  });
  record.history.push({
    at: new Date().toISOString(),
    actorId: req.user.id,
    previous: {
      aircraft: record.aircraft,
      validUntil: record.validUntil,
      active: record.active,
      reference: record.reference
    }
  });
  Object.assign(record, {
    aircraft,
    licenseNo: user.licenseNo,
    licenseType: req.body.licenseType,
    validUntil: req.body.validUntil,
    reference: req.body.reference,
    active: req.body.active !== false,
    recordedBy: req.user.id
  });
  await record.save();
  res.json({
    success: true,
    data: record
  });
});
module.exports = {
  workspace,
  review,
  save,
  action,
  amend,
  reconcile,
  defects,
  authorizations,
  readiness,
  related,
  persistVersion,
  applyChanges,
  catchRequest
};
