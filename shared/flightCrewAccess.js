const normalizeCrewRole = (user = {}) =>
  String(user.jobTitle || user.role || user.access || "").trim().toLowerCase().replace(/[\s-]+/g, " ");

export const getAssignedCrewField = (user = {}) => {
  const role = normalizeCrewRole(user);
  if (role === "pilot") return "assignedPilot";
  if (role === "mechanic") return "assignedMechanic";
  return null;
};

export const isAssignedFlightCrew = (user, record) => {
  if (!user || !record) return false;
  const field = getAssignedCrewField(user);
  const userId = user.id || user._id || user.userId;
  const assignedId = field && record[field]?.userId;
  return Boolean(userId && assignedId && String(userId) === String(assignedId));
};

export const CREW_ACCESS_MESSAGE = "Only the assigned pilot or mechanic can update this record.";
