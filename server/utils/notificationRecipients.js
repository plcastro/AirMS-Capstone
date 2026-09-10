const UserModel = require("../models/userModel");

const ROLE_TO_JOB_TITLE = {
  "maintenance manager": "Maintenance Manager",
  "officer-in-charge": "Officer-In-Charge",
  mechanic: "Mechanic",
  "warehouse staff": "Warehouse Staff",
  pilot: "Pilot",
  superadmin: "Superadmin",
};

const normalizeRole = (role = "") => String(role || "").trim().toLowerCase();

const uniqueStrings = (values = []) => [
  ...new Set(
    values
      .filter((value) => value !== undefined && value !== null && value !== "")
      .map((value) => String(value)),
  ),
];

const uniqueRoles = (roles = []) => [
  ...new Set(roles.map(normalizeRole).filter(Boolean)),
];

const escapeRegex = (value = "") =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getUserIdsForRoles = async (roles = []) => {
  const jobTitles = uniqueRoles(roles)
    .map((role) => ROLE_TO_JOB_TITLE[role])
    .filter(Boolean);

  if (!jobTitles.length) {
    return [];
  }

  const users = await UserModel.find({
    status: "active",
    $or: jobTitles.map((jobTitle) => ({
      jobTitle: {
        $regex: `^${escapeRegex(jobTitle)}$`,
        $options: "i",
      },
    })),
  })
    .select("_id")
    .lean();

  return users.map((user) => String(user._id));
};

const resolveNotificationRecipientUserIds = async ({
  recipientUsers = [],
  recipientRoles = [],
  excludedUsers = [],
} = {}) => {
  const roleUserIds = await getUserIdsForRoles(recipientRoles);
  const excluded = new Set(uniqueStrings(excludedUsers));

  return uniqueStrings([...recipientUsers, ...roleUserIds]).filter(
    (userId) => !excluded.has(String(userId)),
  );
};

module.exports = {
  getUserIdsForRoles,
  normalizeRole,
  resolveNotificationRecipientUserIds,
  uniqueRoles,
  uniqueStrings,
};
