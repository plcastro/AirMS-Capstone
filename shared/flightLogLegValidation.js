const isValidFlightLogLegDate = (value) => {
  if (value instanceof Date) return !Number.isNaN(value.getTime());
  if (typeof value !== "string") return false;

  const date = value.trim();
  const displayDate = date.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  const inputDate = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!displayDate && !inputDate) return false;

  const year = Number(displayDate ? displayDate[3] : inputDate[1]);
  const month = Number(displayDate ? displayDate[1] : inputDate[2]);
  const day = Number(displayDate ? displayDate[2] : inputDate[3]);
  const parsed = new Date(year, month - 1, day);

  return (
    parsed.getFullYear() === year &&
    parsed.getMonth() === month - 1 &&
    parsed.getDate() === day
  );
};

const hasCompleteFlightLogLegs = (legs) =>
  Array.isArray(legs) &&
  legs.length > 0 &&
  legs.every(
    (leg) =>
      isValidFlightLogLegDate(leg?.date) &&
      Array.isArray(leg?.stations) &&
      leg.stations.length > 0 &&
      leg.stations.every(
        (station) =>
          Boolean(String(station?.from || "").trim()) &&
          Boolean(String(station?.to || "").trim()),
      ),
  );

module.exports = { hasCompleteFlightLogLegs, isValidFlightLogLegDate };
