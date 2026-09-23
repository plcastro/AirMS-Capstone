const { AsyncLocalStorage } = require("async_hooks");

const requestContext = new AsyncLocalStorage();

const normalizePlatform = (value = "") => {
  const normalized = String(value || "").trim().toUpperCase();
  if (normalized === "WEB" || normalized === "MOBILE") {
    return normalized;
  }
  return null;
};

const normalizeBase = (value = "") => {
  const normalized = String(value || "").trim().toUpperCase();
  if (["MANILA", "CEBU", "CDO"].includes(normalized)) {
    return normalized;
  }
  return null;
};

const parseHeaderText = (value = "") =>
  String(value || "")
    .trim()
    .slice(0, 240);

const parseCoordinate = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const requestContextMiddleware = (req, _res, next) => {
  const store = {
    requestId: req.headers["x-request-id"] || null,
    sessionId: req.headers["x-session-id"] || null,
    platform:
      normalizePlatform(req.headers["x-platform"]) ||
      normalizePlatform(req.body?.client),
    base: normalizeBase(req.headers["x-base"]),
    ipAddress: req.ip || req.socket?.remoteAddress || null,
    userAgent: req.headers["user-agent"] || null,
    devicePlatform: parseHeaderText(req.headers["x-device-platform"]),
    deviceModel: parseHeaderText(req.headers["x-device-model"]),
    locationText: parseHeaderText(req.headers["x-location-text"]),
    locationLatitude: parseCoordinate(req.headers["x-location-latitude"]),
    locationLongitude: parseCoordinate(req.headers["x-location-longitude"]),
  };

  requestContext.run(store, next);
};

const getRequestContext = () => requestContext.getStore() || {};

const updateRequestContext = (updates = {}) => {
  const store = requestContext.getStore();
  if (!store) {
    return;
  }

  if (Object.prototype.hasOwnProperty.call(updates, "sessionId")) {
    store.sessionId = updates.sessionId || store.sessionId || null;
  }
  if (Object.prototype.hasOwnProperty.call(updates, "platform")) {
    const platform = normalizePlatform(updates.platform);
    store.platform = platform || store.platform || null;
  }
  if (Object.prototype.hasOwnProperty.call(updates, "base")) {
    const base = normalizeBase(updates.base);
    store.base = base || store.base || null;
  }
  if (Object.prototype.hasOwnProperty.call(updates, "devicePlatform")) {
    store.devicePlatform =
      parseHeaderText(updates.devicePlatform) || store.devicePlatform || "";
  }
  if (Object.prototype.hasOwnProperty.call(updates, "deviceModel")) {
    store.deviceModel =
      parseHeaderText(updates.deviceModel) || store.deviceModel || "";
  }
  if (Object.prototype.hasOwnProperty.call(updates, "locationText")) {
    store.locationText =
      parseHeaderText(updates.locationText) || store.locationText || "";
  }
  if (Object.prototype.hasOwnProperty.call(updates, "locationLatitude")) {
    store.locationLatitude =
      parseCoordinate(updates.locationLatitude) ?? store.locationLatitude ?? null;
  }
  if (Object.prototype.hasOwnProperty.call(updates, "locationLongitude")) {
    store.locationLongitude =
      parseCoordinate(updates.locationLongitude) ??
      store.locationLongitude ??
      null;
  }
};

const markAuditLogged = () => {
  const store = requestContext.getStore();
  if (store) {
    store.auditLogged = true;
  }
};

const hasAuditLogged = () => {
  const store = requestContext.getStore();
  return Boolean(store?.auditLogged);
};

module.exports = {
  requestContextMiddleware,
  getRequestContext,
  markAuditLogged,
  hasAuditLogged,
  updateRequestContext,
  normalizePlatform,
  normalizeBase,
};
