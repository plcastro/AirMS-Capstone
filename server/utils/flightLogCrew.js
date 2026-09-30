const User = require("../models/userModel");
const { isPilotFlightLogRequest } = require("./flightLogPayload");
const { getAssignedCrewField } = require("../../shared/flightCrewAccess");

const crewName = (user) => `${user.firstName || ""} ${user.lastName || ""}`.trim();
const crewAssignment = (user) => ({
  userId: String(user._id),
  name: crewName(user),
  firstName: String(user.firstName || "").trim(),
  lastName: String(user.lastName || "").trim(),
});

// Resolve IDs against the user directory instead of trusting names or roles
// supplied by a client. Keep existing assignments usable if a user goes inactive.
const resolveFlightLogCrew = async (req, payload, existing = null, users = User) => {
  const fields = [isPilotFlightLogRequest(req) ? "assignedMechanic" : "assignedPilot"];
  const assignments = {};

  for (const field of fields) {
    const role = field === "assignedPilot" ? "Pilot" : "Mechanic";
    if (Object.hasOwn(payload, field)) {
      const selected = payload[field];
      if (selected === null || selected === "") {
        assignments[field] = null;
      } else {
        const userId = typeof selected === "string" ? selected : selected?.userId;
        if (typeof userId !== "string" || !/^[a-f\d]{24}$/i.test(userId)) {
          return { error: `Select a valid assigned ${role.toLowerCase()}.` };
        }
        if (String(existing?.[field]?.userId || "") === userId) {
          assignments[field] = existing[field];
        } else {
          const user = await users.findOne({
            _id: userId,
            status: "active",
            jobTitle: role,
          }).select("firstName lastName").lean();
          if (!user) return { error: `The assigned ${role.toLowerCase()} must be an active ${role.toLowerCase()}.` };
          assignments[field] = crewAssignment(user);
        }
      }
    }
  }

  // The creator chooses the opposite crew member in the form. Record their
  // own side from their authenticated identity for the return handoff.
  if (!existing && /^[a-f\d]{24}$/i.test(String(req.user?.id || ""))) {
    const creator = await users.findOne({ _id: String(req.user.id), status: "active" })
      .select("firstName lastName jobTitle").lean();
    const ownField = creator ? getAssignedCrewField(creator) : null;
    if (ownField && !fields.includes(ownField)) {
      assignments[ownField] = crewAssignment(creator);
    }
  }

  return { assignments };
};

module.exports = { crewName, resolveFlightLogCrew };
