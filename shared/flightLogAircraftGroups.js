export const flightLogAircraftKey = log => String(log?.rpc || '').trim().toUpperCase() || 'Unassigned aircraft';

export function flightLogLastUpdated(log) {
  for (const value of [log.updatedAt, log.createdAt, log.date]) {
    const time = value ? new Date(value).getTime() : NaN;
    if (Number.isFinite(time)) return time;
  }
  return 0;
}

export function groupFlightLogsByAircraft(logs = []) {
  const groups = new Map();
  for (const log of logs) {
    const aircraft = flightLogAircraftKey(log);
    const updatedAt = flightLogLastUpdated(log);
    if (!groups.has(aircraft)) groups.set(aircraft, { aircraft, logs: [], updatedAt: 0, aircraftType: '' });
    const group = groups.get(aircraft);
    group.logs.push(log);
    if (!group.aircraftType || updatedAt > group.updatedAt) group.aircraftType = log.aircraftType || group.aircraftType;
    group.updatedAt = Math.max(group.updatedAt, updatedAt);
  }
  return [...groups.values()].sort((a, b) => b.updatedAt - a.updatedAt || a.aircraft.localeCompare(b.aircraft));
}
