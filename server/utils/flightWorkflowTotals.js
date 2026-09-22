const { isValidFlightLogLegDate } = require('../../shared/flightLogLegValidation');
const { populateFlightInputs, HOUR_FIELDS } = require('../../shared/flightAutomaticInputs');
const {
  isB412AircraftType
} = require('./flightLogPayload');
const {
  plain
} = require('./flightWorkflowRules');
const numeric = value => value == null || typeof value === 'boolean' || !String(value).trim() ? null : Number.isFinite(Number(String(value).replace(/,/g, ''))) ? Number(String(value).replace(/,/g, '')) : null;
const baselineFor = (reference, target, b412) => {
  const canonical = numeric(reference[target]);
  if (canonical !== null || !b412) return canonical;
  const addresses = { acftTT: 'L3', landings: 'J1', eng1TT: 'L2', eng1TSO: 'J2', eng1Cycles: 'H2', eng2TT: 'N2', eng2TSO: 'J3', eng2Cycles: 'H3', usage: 'N3' };
  const address = addresses[target];
  const cell = Object.entries(reference.referenceCells || {}).find(([key]) => key.toUpperCase() === address)?.[1];
  return numeric(cell);
};
const get = (object, path) => path.split('.').reduce((value, key) => value?.[key], object);
const put = (object, path, value) => {
  const parts = path.split('.');
  let cursor = object;
  parts.slice(0, -1).forEach(key => {
    cursor[key] ||= {};
    cursor = cursor[key];
  });
  cursor[parts.at(-1)] = value;
};
const STANDARD = [['airframe', 'acftTT', 'Airframe hours', true], ['engine', 'engTT', 'Engine hours', true], ['cycleN1', 'n1Cycles', 'N1 cycles', true], ['cycleN2', 'n2Cycles', 'N2 cycles', true], ['landingCycle', 'landings', 'Landings', true], ['gearBoxMain', 'gbmTT', 'Main gearbox hours'], ['gearBoxTail', 'gbtTT', 'Tail gearbox hours'], ['rotorMain', 'mrbTT', 'Main rotor hours'], ['rotorTail', 'trbTT', 'Tail rotor hours'], ['usage', 'usage', 'Sling usage']];
const B412 = [['airframe', 'acftTT', 'Airframe hours', true], ['landingCycle', 'landings', 'Landings', true], ['engine1.tsn', 'eng1TT', 'Engine 1 TSN', true], ['engine1.tso', 'eng1TSO', 'Engine 1 TSO'], ['engine1.cycle', 'eng1Cycles', 'Engine 1 cycles', true], ['engine2.tsn', 'eng2TT', 'Engine 2 TSN', true], ['engine2.tso', 'eng2TSO', 'Engine 2 TSO'], ['engine2.cycle', 'eng2Cycles', 'Engine 2 cycles', true], ['mrGearbox.tsn', 'gbmTT', 'Main gearbox TSN'], ['mrGearbox.tso', 'gbmTSO', 'Main gearbox TSO'], ['tr90Gearbox.tsn', 'gbtTT', '90° gearbox TSN'], ['tr90Gearbox.tso', 'gbtTSO', '90° gearbox TSO'], ['tr42Gearbox.tsn', 'gbt42TT', '42° gearbox TSN'], ['tr42Gearbox.tso', 'gbt42TSO', '42° gearbox TSO'], ['sling', 'usage', 'Sling usage'], ['others', 'others', 'Other usage']];
const minutes = value => {
  const match = String(value || '').trim().match(/^(\d{1,2}):?(\d{2})$/);
  return match && +match[1] < 24 && +match[2] < 60 ? +match[1] * 60 + +match[2] : null;
};
const validateLegs = record => {
  const missing = [];
  let flightMinutes = 0;
  // Bell 412's printed layout has unused placeholder rows. Ignore only wholly
  // empty rows; a partially entered leg must still produce actionable errors.
  const legs = (record.legs || []).filter(leg => (leg.stations || []).some(s => String(s.from || '').trim() || String(s.to || '').trim()) || ['date', 'blockTimeOn', 'blockTimeOff', 'flightTimeOn', 'flightTimeOff', 'passengers'].some(key => String(leg[key] ?? '').trim())).map((leg, i) => {
    const row = {
      ...plain(leg)
    };
    const label = `Leg ${i + 1}`;
    if (!leg.stations?.length || leg.stations.some(s => !s.from?.trim() || !s.to?.trim())) missing.push(`${label}: complete every From/To station.`);
    if (!isValidFlightLogLegDate(leg.date)) missing.push(`${label}: enter a valid date.`);
    for (const [on, off, total, name] of [['flightTimeOn', 'flightTimeOff', 'totalTimeOff', 'flight'], ['blockTimeOn', 'blockTimeOff', 'totalTimeOn', 'block']]) {
      const arrival = minutes(leg[on]),
        departure = minutes(leg[off]);
      if (arrival === null || departure === null) {
        missing.push(`${label}: enter ${name} ON/OFF times as HH:mm (24-hour).`);
        continue;
      }
      const elapsed = (arrival - departure + 1440) % 1440;
      if (name === 'flight' && elapsed === 0) missing.push(`${label}: flight ON/OFF times must show a positive duration.`);
      row[total] = String(Math.round(elapsed / 60 * 100) / 100);
      if (name === 'flight') flightMinutes += elapsed;
    }
    if (numeric(row.totalTimeOn) !== null && numeric(row.totalTimeOff) > numeric(row.totalTimeOn)) missing.push(`${label}: flight duration exceeds block duration.`);
    if (numeric(leg.passengers) === null || numeric(leg.passengers) < 0 || !Number.isInteger(numeric(leg.passengers))) missing.push(`${label}: enter the passenger count, including 0.`);
    return row;
  });
  if (!legs.length) missing.push('Add at least one flight leg.');
  return {
    legs,
    missing,
    flightHours: Math.round(flightMinutes / 60 * 100) / 100
  };
};
const reviewTotals = (record, monitoring) => {
  const b412 = isB412AircraftType(record.aircraftType);
  const populated = populateFlightInputs(plain(record));
  const source = plain(b412 ? populated.b412Data?.componentData : populated.componentData) || {};
  const reference = plain(monitoring?.referenceData) || {};
  const rows = [],
    missing = [],
    toDate = {},
    broughtForward = {},
    mapped = {};
  const legReview = validateLegs(record);
  if (!monitoring) missing.push('Create a Parts Monitoring record for this aircraft.');
  for (const [path, target, item, required] of b412 ? B412 : STANDARD) {
    const baseline = baselineFor(reference, target, b412);
    const increment = numeric(get(source.thisFlightData, path));
    if (!required && baseline === null && (increment === null || HOUR_FIELDS.includes(path) || /\.(tsn|tso)$/.test(path))) continue;
    if (baseline === null) missing.push(`${item}: Parts Monitoring brought-forward value is missing.`);
    if (increment === null) missing.push(`${item}: enter this flight's value, including 0 if none.`);
    if (baseline !== null && baseline < 0 || increment !== null && increment < 0) missing.push(`${item}: values cannot be negative.`);
    if (path === 'landingCycle' && increment !== null && !Number.isInteger(increment)) missing.push('Landings must be a whole number.');
    const total = baseline === null || increment === null ? null : Math.round((baseline + increment) * 10000) / 10000;
    rows.push({
      item,
      path,
      monitoringField: target,
      broughtForward: baseline,
      thisFlight: increment,
      toDate: total
    });
    if (baseline !== null) put(broughtForward, path, String(baseline));
    if (total !== null) {
      put(toDate, path, String(total));
      mapped[target] = total;
    }
  }
  if (!legReview.missing.length && numeric(get(source.thisFlightData, 'airframe')) !== null && Math.abs(numeric(source.thisFlightData.airframe) - legReview.flightHours) > 0.06) missing.push(`Airframe hours for this flight must match the flight legs (${legReview.flightHours.toFixed(2)} hours, allowing rounding).`);
  if (b412) {
    mapped.engTT = mapped.eng1TT;
    mapped.n1Cycles = mapped.eng1Cycles;
    mapped.n2Cycles = mapped.eng2Cycles;
  }
  return {
    totals: rows,
    missing: [...legReview.missing, ...missing],
    mapped,
    componentData: {
      ...source,
      broughtForwardData: broughtForward,
      toDateData: toDate
    },
    legs: legReview.legs
  };
};
const usageReference = (record, reference = {}) => Object.fromEntries((isB412AircraftType(record.aircraftType) ? B412 : STANDARD).map(([, target]) => [target, baselineFor(reference, target, isB412AircraftType(record.aircraftType))]));
const monitoringReconciliation = (record, monitoring) => {
  const previous = usageReference(record, record.monitoringBaseline?.referenceData || {});
  const current = usageReference(record, plain(monitoring?.referenceData) || {});
  return {
    required: !record.monitoringBaseline || String(record.monitoringBaseline.id) !== String(monitoring?._id) || JSON.stringify(previous) !== JSON.stringify(current),
    previous,
    current
  };
};
module.exports = {
  numeric,
  get,
  put,
  STANDARD,
  B412,
  validateLegs,
  reviewTotals,
  usageReference,
  monitoringReconciliation
};
