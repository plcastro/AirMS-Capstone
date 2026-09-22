import { timeMinutes } from './flightLegTimes.js';
export const HOUR_FIELDS = ['airframe', 'engine', 'gearBoxMain', 'gearBoxTail', 'rotorMain', 'rotorTail'];
export const B412_HOUR_COMPONENTS = ['engine1', 'engine2', 'mrGearbox', 'tr90Gearbox', 'tr42Gearbox'];
export const flightDateText = value => value instanceof Date ? value.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : value || '';
export const automaticFlightUsage = (legs = [], extra = 0) => {
  let minutes = 0;
  const complete = legs.length > 0 && legs.every(leg => {
    const on = timeMinutes(leg.flightTimeOn), off = timeMinutes(leg.flightTimeOff);
    if (on === null || off === null) return false;
    minutes += (on - off + 1440) % 1440;
    return true;
  });
  return { hours: complete ? (Math.round(minutes / 60 * 100) / 100).toFixed(2) : '',
    landings: legs.length + Math.max(0, Math.floor(Number(extra) || 0)) };
};
export const populateFlightInputs = record => {
  const { hours, landings } = automaticFlightUsage(record.legs, record.additionalLandings);
  const thisFlightData = { ...record.componentData?.thisFlightData, ...Object.fromEntries(HOUR_FIELDS.map(key => [key, hours])), landingCycle: String(landings) };
  const date = flightDateText(record.date);
  const signature = record.initialInspectionSignature?.signature || '';
  const result = { ...record, date, componentData: { ...record.componentData, thisFlightData } };
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
