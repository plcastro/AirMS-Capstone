import { applyFlightLogHours, totalFlightHours, flightLandingCycles } from './flightLogTimes.js';
export const HOUR_FIELDS = ['airframe', 'engine', 'gearBoxMain', 'gearBoxTail', 'rotorMain', 'rotorTail'];
export const B412_HOUR_COMPONENTS = ['engine1', 'engine2', 'mrGearbox', 'tr90Gearbox', 'tr42Gearbox'];
export const flightDateText = value => value instanceof Date ? value.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : value || '';
export const automaticFlightUsage = (legs = [], extra = 0) => {
  // Component hours use the original per-leg Total Time (FLIGHT) conversion
  // table, shared with the entry forms, rather than elapsed ON/OFF hundredths.
  return { hours: totalFlightHours(legs), landings: flightLandingCycles(legs, extra) };
};
export const populateFlightInputs = record => {
  const { hours, landings } = automaticFlightUsage(record.legs, record.additionalLandings);
  const date = flightDateText(record.date);
  const signature = record.initialInspectionSignature?.signature || record.preFlightInspection?.signature || '';
  const result = { ...applyFlightLogHours(record), date };
  for (const key of ['fuelServicing', 'oilServicing']) result[key] = (record.legs || []).map((_, i) => ({ ...record[key]?.[i], date, ...(signature ? { signature } : {}) }));
  if (/412/.test(record.aircraftType || '')) {
    const component = record.b412Data?.componentData || {};
    const usage = { ...component.thisFlightData, airframe: hours, landingCycle: String(landings) };
    for (const key of B412_HOUR_COMPONENTS) usage[key] = { ...usage[key], tsn: hours, tso: hours };
    const fuelServicing = Array.from({ length: 6 }, (_, i) => {
      const previous = record.b412Data?.fuelServicing?.[i] || {}, row = result.fuelServicing[i];
      return row ? { ...previous, contCheck: row.contCheck || '', mainTankRemaining: row.mainRemG || '', mainTankAdded: row.mainAdd || '', mainTankTotal: row.mainTotal || '', refuellerName: row.refuelerName || '', signature: row.signature || '' } : previous;
    });
    const oilServicing = Array.from({ length: 2 }, (_, i) => {
      const previous = record.b412Data?.oilServicing?.[i] || {}, row = result.oilServicing[i];
      if (!row) return previous;
      const next = { ...previous, mechanicSignature: row.signature || '' };
      for (const [key, prefix] of [['engine1', 'engine'], ['mrGearbox', 'mrGbox'], ['tr90Gearbox', 'trGbox']]) next[key] = { ...next[key], remaining: row[`${prefix}Rem`] || '', added: row[`${prefix}Add`] || '', total: row[`${prefix}Tot`] || '' };
      return next;
    });
    result.b412Data = { ...record.b412Data, componentData: { ...component, thisFlightData: usage }, fuelServicing, oilServicing };
  }
  return result;
};
