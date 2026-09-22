export const flightLogDateText = value => {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? '' :
    `${String(value.getMonth() + 1).padStart(2, '0')}/${String(value.getDate()).padStart(2, '0')}/${value.getFullYear()}`;
  const text = String(value ?? '').trim();
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/);
  if (iso) return `${iso[2]}/${iso[3]}/${iso[1]}`;
  const display = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  return display ? `${display[1].padStart(2, '0')}/${display[2].padStart(2, '0')}/${display[3]}` : text;
};

export const syncFlightLogDates = record => {
  const date = flightLogDateText(record.date);
  const legs = (record.legs || []).map(leg => ({ ...leg, date }));
  const result = { ...record, legs };
  for (const key of ['fuelServicing', 'oilServicing']) {
    const rows = record[key] || [];
    result[key] = Array.from({ length: Math.max(legs.length, rows.length) }, (_, index) => ({ ...rows[index], date }));
  }
  // Keep the Basic Information value's type, including mobile's Date object.
  return result;
};
