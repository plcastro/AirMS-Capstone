const crypto = require('node:crypto');
const {
  flightStage,
  flightEditPermissions
} = require('../../shared/flightWorkflow');
const {
  getAssignedCrewField,
  isAssignedFlightCrew
} = require('../../shared/flightCrewAccess');
const {
  isB412AircraftType
} = require('./flightLogPayload');
const fail = (message, status = 400, details = {}) => Object.assign(new Error(message), {
  status,
  ...details
});
const plain = value => value?.toObject ? value.toObject() : value;
const business = value => {
  if (value instanceof Date) return value.toISOString();
  if (value?.toHexString) return value.toHexString();
  if (Array.isArray(value)) return value.map(business);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(plain(value)).filter(([key]) => !['_id', '__v', 'updatedAt', 'createdAt'].includes(key)).sort(([a], [b]) => a.localeCompare(b)).map(([key, child]) => [key, business(child)]));
  return value;
};
const same = (a, b) => JSON.stringify(business(a)) === JSON.stringify(business(b));
const checkVersion = (record, expected) => {
  if (!Number.isInteger(expected) || expected !== (record.__v || 0)) throw fail('This record has changed. Keep your draft, reload the latest version, and review before saving.', 409, {
    currentVersion: record.__v || 0
  });
};
const transition = (record, user, action) => {
  if (!isAssignedFlightCrew(user, record)) throw fail('Only the assigned pilot or mechanic can update this flight record.', 403);
  const stage = flightStage(record);
  const mechanic = getAssignedCrewField(user) === 'assignedMechanic';
  const transitions = {
    release: {
      stages: ['pending_release', 'returned_to_mechanic'],
      mechanic: true,
      next: 'pending_acceptance'
    },
    accept: {
      stages: ['pending_acceptance'],
      mechanic: false,
      next: 'accepted'
    },
    submit: {
      stages: ['accepted', 'returned_to_pilot'],
      mechanic: true,
      next: 'submitted'
    },
    complete: {
      stages: ['accepted', 'returned_to_pilot', 'submitted'],
      mechanic: true,
      next: 'completed'
    }
  };
  if (action === 'return') {
    if (mechanic && ['pending_acceptance', 'submitted'].includes(stage)) return 'returned_to_mechanic';
    throw fail('This flight record cannot be returned at this stage.', 409);
  }
  if (action === 'amend' && stage === 'completed' && mechanic) return 'completed';
  const rule = transitions[action];
  if (!rule || rule.mechanic !== mechanic) throw fail('This action requires the responsible crew member.', 403);
  if (!rule.stages.includes(stage)) throw fail('This action is unavailable at the current stage.', 409);
  return rule.next;
};

// Whole forms are accepted, but only fields editable at this stage are applied.
// Signed sections must be returned for correction before they can change.
const editableChanges = (record, user, input = {}) => {
  const permissions = flightEditPermissions(user, record);
  const mechanic = getAssignedCrewField(user) === 'assignedMechanic';
  const result = {};
  const allow = (keys, enabled) => {
    if (enabled) keys.forEach(key => {
      if (Object.hasOwn(input, key)) result[key] = input[key];
    });
  };
  allow(['date', 'controlNo', 'flightPurpose', 'purposeDetails'], permissions.preparation);
  allow(['legs', 'remarks', 'sling', 'noDefectsReported', 'additionalLandings'], permissions.flight);
  allow(['componentData', 'fuelServicing', 'oilServicing', 'workItems'], permissions.maintenance);
  if (permissions.preparation) allow([mechanic ? 'assignedPilot' : 'assignedMechanic'], true);
  if (result.componentData && !permissions.preparation) {
    result.componentData = {
      ...plain(result.componentData),
      broughtForwardData: plain(record.componentData)?.broughtForwardData
    };
  }
  if (result.workItems && !permissions.preparation) {
    const prepared = (record.workItems || []).filter(item => item.phase !== 'post_flight');
    const post = result.workItems.filter(item => item.phase === 'post_flight');
    result.workItems = [...prepared.map(plain), ...post];
  }
  if (!permissions.preparation && record.inspectionFlow !== 'confirmation') {
    // Servicing already certified at release is retained; post-flight rows append.
    for (const field of ['fuelServicing', 'oilServicing']) {
      if (result[field]) {
        const signed = record.workflowHistory?.findLast?.(event => event.action === 'release')?.snapshot?.[field] || (record[field] || []).map(plain);
        result[field] = [...signed, ...result[field].slice(signed.length)];
      }
    }
  }
  if (isB412AircraftType(record.aircraftType) && input.b412Data && typeof input.b412Data === 'object') {
    const original = plain(record.b412Data) || {};
    const next = {
      ...original
    };
    if (permissions.flight) for (const field of ['passengerRows', 'discrepancyRemarks']) if (Object.hasOwn(input.b412Data, field)) next[field] = input.b412Data[field];
    if (permissions.maintenance) {
      if (Object.hasOwn(input.b412Data, 'componentData')) next.componentData = input.b412Data.componentData;
      // The shared work list is authoritative; the legacy three-row adapter must
      // never overwrite work certified in an earlier phase.
      if (result.workItems) next.correctionItems = result.workItems.slice(0, 3).map(item => ({
        category: item.selectedWorkTypes?.join(', ') || item.description || '',
        date: item.date || '',
        aircraftTotalTime: item.aircraft || '',
        workDone: item.workDone || '',
        nameSign: item.name || '',
        certificateNo: item.certificateNumber || ''
      }));else if (permissions.preparation && Object.hasOwn(input.b412Data, 'correctionItems')) next.correctionItems = input.b412Data.correctionItems;
      if (!permissions.preparation && next.componentData) next.componentData = {
        ...plain(next.componentData),
        broughtForwardData: original.componentData?.broughtForwardData
      };
      if (permissions.preparation) for (const field of ['serialNumber', 'fuelServicing', 'oilServicing']) if (Object.hasOwn(input.b412Data, field)) next[field] = input.b412Data[field];
      if (record.inspectionFlow === 'confirmation') for (const field of ['fuelServicing', 'oilServicing']) if (Object.hasOwn(input.b412Data, field)) next[field] = input.b412Data[field];
    }
    result.b412Data = next;
  }
  return Object.fromEntries(Object.entries(result).filter(([key, value]) => !same(record[key], value)));
};
const snapshot = record => {
  const data = {
    ...plain(record)
  };
  for (const key of ['workflowHistory', 'amendments', 'completionReceipt', 'pendingNotifications', '__v']) delete data[key];
  return data;
};
const eventFor = (record, action, user, changes = {}, comment = '', signer = null) => {
  const state = snapshot(record);
  return {
    action,
    at: new Date().toISOString(),
    actorId: String(user.id || user._id),
    actorName: signer?.name || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
    version: (record.__v || 0) + 1,
    comment,
    changes,
    ...(signer ? {
      signer,
      snapshot: state,
      digestScope: 'action-comment-changes-snapshot-signer-v1',
      digest: crypto.createHash('sha256').update(JSON.stringify({ action, comment, changes, snapshot: state, signer })).digest('hex')
    } : {})
  };
};
module.exports = {
  fail,
  plain,
  same,
  business,
  checkVersion,
  transition,
  editableChanges,
  snapshot,
  eventFor
};
