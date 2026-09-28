import { syncFlightLogDates } from './flightLogDates.js';
export const FLIGHT_HOUR_FIELDS = ['airframe', 'gearBoxMain', 'gearBoxTail', 'rotorMain', 'rotorTail', 'engine'];
export const FLIGHT_TIME_FIELDS = ['blockTimeOn', 'blockTimeOff', 'flightTimeOn', 'flightTimeOff', 'totalTimeOn', 'totalTimeOff'];
export const isTotalTimeField = field => field === 'totalTimeOn' || field === 'totalTimeOff';

export const parseFlightTime = (value, duration = false) => {
  const match = String(value ?? '').match(/^(\d{2}):(\d{2})$/);
  if (!match || Number(match[2]) > 59 || (!duration && Number(match[1]) > 23)) return null;
  return Number(match[1]) * 60 + Number(match[2]);
};
export const flightTimeDisplay = (value, duration = false) => {
  const text = String(value ?? '').trim();
  if (!text || text.includes(':')) return text;
  if (!duration && /^\d{4}$/.test(text)) return `${text.slice(0, 2)}:${text.slice(2)}`;
  // Older logs stored total durations as decimal hours. Keep their saved
  // values intact, but show hours/minutes when opening the new editor.
  if (duration && /^\d+(\.\d+)?$/.test(text) && Number(text) < 100) {
    const minutes = Math.round(Number(text) * 60);
    return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
  }
  return text;
};
export const editFlightTimePart = (value, part, text) => {
  if (/^\d{1,2}:\d{1,2}$/.test(text)) return text.split(':').map(s => s.padStart(2, '0')).join(':');
  const values = String(value || ':').split(':');
  const parts = [values[0] || '', values[1] || ''];
  parts[part] = String(text).replace(/\D/g, '').slice(0, 2);
  return parts.every(s => !s) ? '' : parts.join(':');
};
export const padFlightTimePart = (value, part) => {
  const parts = String(value || ':').split(':');
  if (parts[part]) parts[part] = parts[part].padStart(2, '0');
  return parts.every(s => !s) ? '' : parts.join(':');
};
export const minutesToFlightHours = minutes => {
  if (!Number.isInteger(minutes) || minutes < 0) return null;
  // Exact table provided by the user, including 27–33 minutes = 0.5.
  const tenth = [2, 8, 14, 20, 26, 33, 39, 45, 51, 57, 60].findIndex(limit => minutes % 60 <= limit);
  return (Math.floor(minutes / 60) * 10 + tenth) / 10;
};
export const totalFlightHours = (legs = []) => {
  if (!legs.length) return '';
  let tenths = 0;
  for (const leg of legs) {
    const minutes = parseFlightTime(flightTimeDisplay(leg.totalTimeOff, true), true);
    if (minutes === null) return '';
    tenths += Math.round(minutesToFlightHours(minutes) * 10);
  }
  return (tenths / 10).toFixed(1);
};
export const requiredFlightTimeError = legs => {
  if (!Array.isArray(legs) || !legs.length) return 'Add a leg and enter Total Time (FLIGHT).';
  const index = legs.findIndex(leg => parseFlightTime(flightTimeDisplay(leg?.totalTimeOff, true), true) === null);
  return index < 0 ? '' : `Leg ${index + 1}: Total Time (FLIGHT) is required. Enter hours and minutes as HH:mm (minutes 00–59).`;
};
export const normalizeAdditionalLandings = value => {
  const count = Math.floor(Number(value));
  return Number.isSafeInteger(count) ? Math.max(0, count) : 0;
};
export const flightLandingCycles = (legs = [], extra = 0) => legs.length + normalizeAdditionalLandings(extra);
export const applyFlightLogHours = record => {
  const hours = totalFlightHours(record.legs);
  const component = record.componentData || {};
  const thisFlightData = { ...component.thisFlightData };
  const toDateData = { ...component.toDateData };
  const additionalLandings = normalizeAdditionalLandings(record.additionalLandings);
  for (const key of [...FLIGHT_HOUR_FIELDS, 'landingCycle']) {
    const increment = key === 'landingCycle' ? String(flightLandingCycles(record.legs, additionalLandings)) : hours;
    thisFlightData[key] = increment;
    const baseline = component.broughtForwardData?.[key];
    toDateData[key] = increment === '' || baseline == null || String(baseline).trim() === '' || !Number.isFinite(Number(baseline))
      ? '' : String(Math.round((Number(baseline) + Number(increment)) * 10000) / 10000);
  }
  return syncFlightLogDates({ ...record, additionalLandings, componentData: { ...component, thisFlightData, toDateData } });
};
