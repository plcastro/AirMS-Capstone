const ALLOWED_FLIGHT_LOG_PAYLOAD_FIELDS = new Set([
  "aircraftType",
  "rpc",
  "date",
  "controlNo",
  "sling",
  "remarks",
  "legs",
  "fuelServicing",
  "oilServicing",
  "workItems",
  "componentData",
  "componentTimes",
  "b412Data",
  "createdBy",
  "createdByName",
  "createdByUserId",
  "status",
  "notifiedForCompletion",
  "broughtForwardLocked",
  "releasedBy",
  "acceptedBy",
  "dateAdded",
]);

// Pilots supply the aircraft identity when opening a log, then work only in
// Destination/s and Discrepancy/Remarks. Mechanic form data and workflow
// signatures are deliberately excluded even when a client submits its whole
// local form object.
const PILOT_CREATE_FLIGHT_LOG_FIELDS = new Set([
  "aircraftType",
  "rpc",
  "date",
  "controlNo",
  "sling",
  "remarks",
  "legs",
  // Read-only monitoring totals are populated automatically when the pilot
  // selects an aircraft, even though the component tabs are not available.
  "componentData",
  "b412Data",
  "createdByName",
]);

const PILOT_UPDATE_FLIGHT_LOG_FIELDS = new Set([
  "sling",
  "remarks",
  "legs",
  "b412Data",
  // The existing Notify Mechanic action uses the generic update endpoint.
  "notifiedForCompletion",
]);

const normalizeFlightLogRole = (value = "") =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, " ");

const isB412AircraftType = (aircraftType = "") => {
  const normalized = String(aircraftType || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

  return normalized.includes("B412EP") || normalized.includes("BELL412EP");
};

const getTrustedFlightLogRole = (req = {}) => {
  const user = req?.user;
  if (!user || typeof user !== "object") return "";

  return normalizeFlightLogRole(
    user.jobTitle || user.role || user.access,
  );
};

const isPilotFlightLogRequest = (req = {}) =>
  getTrustedFlightLogRole(req) === "pilot";

const hasSuperadminFlightLogAccess = (req = {}) => {
  const user = req?.user;
  if (!user || typeof user !== "object") return false;

  return (
    normalizeFlightLogRole(user.jobTitle) === "superadmin" ||
    normalizeFlightLogRole(user.access) === "superadmin"
  );
};

const isRestrictedPilotFlightLogRequest = (req = {}) =>
  isPilotFlightLogRequest(req) && !hasSuperadminFlightLogAccess(req);

const MECHANIC_FLIGHT_LOG_ROLES = new Set([
  "mechanic",
  "engineer",
  "maintenance manager",
  "head of maintenance",
  "superadmin",
  "admin",
]);

const isMechanicFlightLogRequest = (req = {}) =>
  hasSuperadminFlightLogAccess(req) ||
  MECHANIC_FLIGHT_LOG_ROLES.has(getTrustedFlightLogRole(req));

const canEditFlightLogRequest = (req = {}) =>
  isRestrictedPilotFlightLogRequest(req) || isMechanicFlightLogRequest(req);

const pickFields = (body, allowedFields) => {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(body).filter(([field]) => allowedFields.has(field)),
  );
};

const pickPilotB412Data = (b412Data, operation) => {
  if (operation === "update" && b412Data === null) {
    return {};
  }

  if (
    b412Data === undefined ||
    typeof b412Data !== "object" ||
    Array.isArray(b412Data)
  ) {
    return b412Data;
  }

  const allowedFields = new Set([
    "passengerRows",
    "discrepancyRemarks",
    ...(operation === "create" ? ["serialNumber", "componentData"] : []),
  ]);

  return pickFields(b412Data, allowedFields);
};

const mergePilotB412Update = (existingB412Data, pilotB412Update) => {
  if (
    !pilotB412Update ||
    typeof pilotB412Update !== "object" ||
    Array.isArray(pilotB412Update)
  ) {
    return pilotB412Update;
  }

  const existing =
    typeof existingB412Data?.toObject === "function"
      ? existingB412Data.toObject()
      : existingB412Data || {};

  return { ...existing, ...pilotB412Update };
};

const pickFlightLogPayloadForRequest = (
  req,
  body,
  operation = "update",
) => {
  const isPilot = isRestrictedPilotFlightLogRequest(req);
  const pilotAllowedFields =
    operation === "create"
      ? PILOT_CREATE_FLIGHT_LOG_FIELDS
      : PILOT_UPDATE_FLIGHT_LOG_FIELDS;
  const payload = pickFields(
    body,
    isPilot ? pilotAllowedFields : ALLOWED_FLIGHT_LOG_PAYLOAD_FIELDS,
  );

  if (isPilot && Object.prototype.hasOwnProperty.call(payload, "b412Data")) {
    if (operation === "create" && !isB412AircraftType(payload.aircraftType)) {
      delete payload.b412Data;
    } else {
      payload.b412Data = pickPilotB412Data(payload.b412Data, operation);
    }
  }

  // A pilot may trigger the established false -> true notification workflow,
  // but cannot reset the flag through a generic form save.
  if (
    isPilot &&
    operation === "update" &&
    payload.notifiedForCompletion !== true
  ) {
    delete payload.notifiedForCompletion;
  }

  return payload;
};

const hasCompleteFlightLogLegs = (legs) =>
  Array.isArray(legs) &&
  legs.length > 0 &&
  legs.every((leg) => {
    const hasValidDate =
      Boolean(leg?.date) && !Number.isNaN(new Date(leg.date).getTime());
    const hasCompleteRoute =
      Array.isArray(leg?.stations) &&
      leg.stations.length > 0 &&
      leg.stations.every(
        (station) =>
          String(station?.from || "").trim() &&
          String(station?.to || "").trim(),
      );

    return hasValidDate && hasCompleteRoute;
  });

module.exports = {
  ALLOWED_FLIGHT_LOG_PAYLOAD_FIELDS,
  PILOT_CREATE_FLIGHT_LOG_FIELDS,
  PILOT_UPDATE_FLIGHT_LOG_FIELDS,
  canEditFlightLogRequest,
  getTrustedFlightLogRole,
  hasSuperadminFlightLogAccess,
  hasCompleteFlightLogLegs,
  isB412AircraftType,
  isMechanicFlightLogRequest,
  isPilotFlightLogRequest,
  isRestrictedPilotFlightLogRequest,
  mergePilotB412Update,
  normalizeFlightLogRole,
  pickPilotB412Data,
  pickFlightLogPayloadForRequest,
};
