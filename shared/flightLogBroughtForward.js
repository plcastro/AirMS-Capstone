import { mapAircraftReferenceToBroughtForward, mapAircraftReferenceToB412 } from './flightLogPartsMonitoring.js';
import { b412WorkflowComponents } from './b412WorkflowComponents.js';
import { applyFlightLogHours } from './flightLogTimes.js';

export const monitoringBroughtForward = (aircraft = {}) => {
  const standard = mapAircraftReferenceToBroughtForward(aircraft);
  if (!/412/.test(aircraft.aircraftType || '')) return standard;
  const carried = mapAircraftReferenceToB412(aircraft);
  return b412WorkflowComponents(carried, { broughtForwardData: standard }).broughtForwardData;
};

// Closed logs retain their historical totals. Released logs use the monitoring
// snapshot captured at release, so later flights cannot change their baseline.
export const populateMonitoringBroughtForward = (record, monitoring) => {
  if (record.status === 'completed') return record;
  const source = record.monitoringBaseline?.referenceData
    ? { referenceData: record.monitoringBaseline.referenceData }
    : monitoring;
  if (!source?.referenceData) return record;
  const aircraft = { ...source, aircraftType: record.aircraftType || monitoring?.aircraftType };
  const next = {
    ...record,
    componentData: {
      ...record.componentData,
      broughtForwardData: monitoringBroughtForward(aircraft),
    },
  };
  if (/412/.test(aircraft.aircraftType || '')) {
    const carried = mapAircraftReferenceToB412(aircraft);
    next.b412Data = { ...record.b412Data, componentData: { ...carried, ...record.b412Data?.componentData, broughtForwardData: carried.broughtForwardData } };
  }
  return applyFlightLogHours(next);
};
