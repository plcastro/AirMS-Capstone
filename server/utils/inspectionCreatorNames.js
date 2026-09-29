const User = require("../models/userModel");

const isUserId = (value) => /^[a-f\d]{24}$/i.test(String(value || ""));

// Resolve creators in one query while preserving the stored ID for ownership.
async function withInspectionCreatorNames(records, users = User) {
  const ids = [...new Set(records.map((record) => record.createdBy).filter(isUserId))];
  const creators = ids.length
    ? await users.find({ _id: { $in: ids } }).select("firstName lastName").lean()
    : [];
  const names = new Map(creators.map((user) => [
    String(user._id).toLowerCase(),
    [user.firstName, user.lastName].map((part) => String(part || "").trim()).filter(Boolean).join(" "),
  ]));
  return records.map((record) => ({
    ...record,
    createdByName: isUserId(record.createdBy)
      ? names.get(String(record.createdBy).toLowerCase()) || "Unknown user"
      : String(record.createdBy || "").trim() || "Unknown user",
  }));
}

module.exports = { withInspectionCreatorNames };
