import { isAssignedFlightCrew, getAssignedCrewField } from './flightCrewAccess.js';

export const FLIGHT_PURPOSES = [
  ['company_transport', 'Company transport'], ['line_inspection', 'Line inspection'],
  ['sling_work', 'Sling work'], ['training', 'Training'],
  ['maintenance_test', 'Maintenance test'], ['other', 'Other'],
];
export const flightStage = (record = {}) => {
  const status = String(record.status || 'pending_release').toLowerCase();
  if (status === 'accepted' && record.notifiedForCompletion) return 'submitted';
  return ({ draft: 'pending_release', ongoing: 'pending_release', released: 'pending_acceptance' })[status] || status;
};
export const FLIGHT_STAGES = {
  pending_release: { label: 'Preparation', next: 'Mechanic preparation', crew: 'assignedMechanic', action: 'release', button: 'Save & Release to Pilot', tab: 'component' },
  returned_to_mechanic: { label: 'Returned to mechanic', next: 'Preparation correction', crew: 'assignedMechanic', action: 'release', button: 'Save & Release Again', tab: 'component' },
  pending_acceptance: { label: 'Awaiting pilot acceptance', next: 'Pilot acceptance', crew: 'assignedPilot', action: 'accept', button: 'Accept Aircraft', tab: 'info' },
  accepted: { label: 'Flight details', next: 'Mechanic flight details and completion', crew: 'assignedMechanic', action: 'complete', button: 'Complete Flight Log', tab: 'destinations' },
  returned_to_pilot: { label: 'Flight details correction', next: 'Mechanic flight details and completion', crew: 'assignedMechanic', action: 'complete', button: 'Complete Flight Log', tab: 'destinations' },
  submitted: { label: 'Post-flight review', next: 'Mechanic review and closure', crew: 'assignedMechanic', action: 'complete', button: 'Review & Close Flight Record', tab: 'workdone' },
  completed: { label: 'Closed', next: 'Record closed', crew: null, tab: 'info' },
};
export const nextFlightStep = (record = {}) => FLIGHT_STAGES[flightStage(record)] || FLIGHT_STAGES.pending_release;
export const needsMyFlightAction = (user, record) =>
  isAssignedFlightCrew(user, record) && getAssignedCrewField(user) === nextFlightStep(record).crew;

export const preflightSignatureForRelease = (record = {}, inspections = []) => {
  const mechanicId = String(record.assignedMechanic?.userId || '');
  if (!mechanicId) return '';
  const certified = inspections.filter(pre => ['released', 'completed'].includes(pre.status) && String(pre.releasedBy?.userId || '') === mechanicId);
  const signature = certified.find(pre => pre.releasedBy?.signature)?.releasedBy.signature;
  if (signature) return signature;
  return certified.length && String(record.initialInspectionSignature?.userId || '') === mechanicId
    ? record.initialInspectionSignature?.signature || '' : '';
};

export const pilotAcceptance = (user, record = {}, inspections = []) => {
  if (getAssignedCrewField(user) !== 'assignedPilot') return null;
  if (!isAssignedFlightCrew(user, record)) return { message: `Only the assigned pilot (${record.assignedPilot?.name || 'unassigned'}) can accept this record.` };
  if (flightStage(record) !== 'pending_acceptance') return { message: ['accepted', 'submitted', 'completed', 'returned_to_pilot'].includes(flightStage(record)) ? 'Pilot acceptance is complete. The record is read-only.' : 'Waiting for the mechanic to release the flight log.' };
  const certified = inspection => String(inspection.releasedBy?.userId || '') === String(record.assignedMechanic?.userId || '') && Boolean(record.assignedMechanic?.userId);
  const preInspection = inspections.find(inspection => inspection.status === 'released' && certified(inspection));
  const canAcceptFlight = inspections.length > 0 && inspections.every(inspection => inspection.status === 'completed' && certified(inspection) && String(inspection.acceptedBy?.userId || '') === String(record.assignedPilot?.userId || ''));
  return { preInspection, canAcceptFlight, message: preInspection ? 'Review and accept Pre-Flight, then accept the Flight Log. Each acceptance requires only your signature and six-digit PIN.' : canAcceptFlight ? 'Pre-Flight is accepted. Sign and enter your six-digit PIN to accept the Flight Log.' : 'Waiting for the mechanic to certify the linked Pre-Flight inspection.' };
};
// Inspection activity advances the flight version without changing form values.
// Preserve unsaved fields only when the underlying flight data still matches.
export const flightDraftBaseChanged = (previous, current) => {
  const normalize = value => {
    if (Array.isArray(value)) return value.map(normalize);
    if (!value || typeof value !== 'object') return value;
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, normalize(value[key])]));
  };
  const base = record => Object.fromEntries(Object.entries(record || {}).filter(([key]) =>
    !['__v', 'updatedAt', 'workflowHistory', 'pendingNotifications'].includes(key)));
  return JSON.stringify(normalize(base(previous))) !== JSON.stringify(normalize(base(current)));
};
export const flightEditPermissions = (user, record = {}) => {
  const stage = flightStage(record);
  const assigned = isAssignedFlightCrew(user, record);
  const mechanic = getAssignedCrewField(user) === 'assignedMechanic';
  const preparation = ['pending_release', 'returned_to_mechanic'].includes(stage);
  const flight = ['accepted', 'returned_to_pilot'].includes(stage);
  const maintenance = assigned && mechanic && (preparation || flight || stage === 'submitted');
  return { preparation: assigned && mechanic && preparation, flight: assigned && mechanic && (preparation || flight || stage === 'submitted'), maintenance,
    canSave: maintenance, canReturn: assigned && mechanic && ['pending_acceptance', 'submitted'].includes(stage),
    canAmend: assigned && mechanic && stage === 'completed' };
};
