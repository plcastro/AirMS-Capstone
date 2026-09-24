export const getLogAircraftRegistration = (record = {}) =>
  String(record.rpc || record.aircraft || "")
    .trim()
    .toUpperCase() || "Unassigned aircraft";

const getRecordDate = (record) =>
  record.date || record.dateAdded || record.createdAt || "";

const getDateValue = (value) => {
  if (!value) return 0;
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
};

const getActivityDate = (record) =>
  [record.updatedAt, record.createdAt, record.dateAdded, record.date].find(
    (value) => value && !Number.isNaN(new Date(value).getTime()),
  ) || "";

export const sortLogsByLatestActivity = (records = []) =>
  [...records].sort((left, right) => {
    const difference =
      getDateValue(getActivityDate(right)) - getDateValue(getActivityDate(left));
    return difference || String(right._id || right.id || "").localeCompare(
      String(left._id || left.id || ""),
    );
  });

// Build from the full record list so record-level filters never hide aircraft.
export const groupAircraftLogs = (records = [], sortBy = "rpc") => {
  const groups = new Map();

  records.forEach((record) => {
    const rpc = getLogAircraftRegistration(record);
    const latestDate = getRecordDate(record);
    const latestActivity = getActivityDate(record);
    const group = groups.get(rpc);

    if (!group) {
      groups.set(rpc, {
        rpc,
        aircraftType: record.aircraftType || "",
        base: record.base || "",
        count: 1,
        latestDate,
        latestActivity,
      });
      return;
    }

    group.count += 1;
    group.aircraftType ||= record.aircraftType || "";
    group.base ||= record.base || "";
    if (getDateValue(latestDate) > getDateValue(group.latestDate)) {
      group.latestDate = latestDate;
    }
    if (getDateValue(latestActivity) > getDateValue(group.latestActivity)) {
      group.latestActivity = latestActivity;
    }
  });

  return [...groups.values()].sort((left, right) => {
    if (sortBy === "latestActivity") {
      const activityDifference =
        getDateValue(right.latestActivity) - getDateValue(left.latestActivity);
      if (activityDifference) return activityDifference;
    }
    return left.rpc.localeCompare(right.rpc, undefined, { numeric: true });
  });
};
