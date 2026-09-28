export const defaultPassengerCount = value => value == null || String(value).trim() === '' ? '0' : String(value);

export const timeMinutes = value => {
  const match = String(value || '').trim().match(/^(\d{1,2}):?(\d{2})$/);
  return match && Number(match[1]) < 24 && Number(match[2]) < 60 ? Number(match[1]) * 60 + Number(match[2]) : null;
};
export const legDuration = (leg, kind) => {
  const arrival = timeMinutes(leg?.[`${kind}TimeOn`]);
  const departure = timeMinutes(leg?.[`${kind}TimeOff`]);
  if (arrival === null || departure === null) return '';
  return (Math.round(((arrival - departure + 1440) % 1440) / 60 * 100) / 100).toFixed(2);
};
export const isLegTotal = key => key === 'totalTimeOn' || key === 'totalTimeOff';
export const legFieldDisplay = (leg, key) => isLegTotal(key) ? legDuration(leg, key === 'totalTimeOn' ? 'block' : 'flight') : leg?.[key] ?? '';
