const getTimeValue = (value) => {
  if (!value) return 0;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
};

export const getTaskIdentifier = (task = {}) => task.id || task._id || "";

export const isSameTask = (left, right) =>
  String(getTaskIdentifier(left)) === String(getTaskIdentifier(right));

export const sortTasksByCreatedDesc = (tasks = []) =>
  [...tasks].sort((left, right) => {
    const leftTime = getTimeValue(left?.createdAt || left?.date);
    const rightTime = getTimeValue(right?.createdAt || right?.date);

    if (rightTime !== leftTime) {
      return rightTime - leftTime;
    }

    return String(getTaskIdentifier(right)).localeCompare(
      String(getTaskIdentifier(left)),
    );
  });

export const toValidTaskDate = (value, fallback = new Date()) => {
  const parsed = new Date(value);
  if (!value || Number.isNaN(parsed.getTime())) {
    return new Date(fallback);
  }

  return parsed;
};
