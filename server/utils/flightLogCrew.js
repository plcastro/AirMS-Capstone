const User = require("../models/userModel");
const { isPilotFlightLogRequest } = require("./flightLogPayload");

const crewName = (user) => `${user.firstName || ""} ${user.lastName || ""}`.trim();

// Resolve IDs against the user directory instead of trusting names or roles
// supplied by a client. Keep existing assignments usable if a user goes inactive.
const resolveFlightLogCrew = async (req, payload, existing = null, users = User) => {
  const field = isPilotFlightLogRequest(req) ? "assignedMechanic" : "assignedPilot";
  const role = field === "assignedPilot" ? "Pilot" : "Mechanic";
  const assignments = {};

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
        assignments[field] = { userId: String(user._id), name: crewName(user) };
      }
    }
  }

  // The creator chooses the opposite crew member in the form. Record their
  // own side from their authenticated identity for the return handoff.
  if (!existing && /^[a-f\d]{24}$/i.test(String(req.user?.id || ""))) {
    const creator = await users.findOne({ _id: String(req.user.id), status: "active" })
      .select("firstName lastName jobTitle").lean();
    const ownField = creator?.jobTitle === "Pilot"
      ? "assignedPilot"
      : creator?.jobTitle === "Mechanic" ? "assignedMechanic" : null;
    if (ownField && ownField !== field) {
      assignments[ownField] = { userId: String(creator._id), name: crewName(creator) };
    }
  }

  return { assignments };
};

module.exports = { crewName, resolveFlightLogCrew };
