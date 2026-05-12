const { AsyncLocalStorage } = require("async_hooks");

const requestContext = new AsyncLocalStorage();

const normalizePlatform = (value = "") => {
  const normalized = String(value || "").trim().toUpperCase();
  if (normalized === "WEB" || normalized === "MOBILE") {
    return normalized;
  }
  return "UNKNOWN";
};

const normalizeBase = (value = "") => {
  const normalized = String(value || "").trim().toUpperCase();
  if (["MANILA", "CEBU", "CDO"].includes(normalized)) {
    return normalized;
  }
  return "UNKNOWN";
};

const requestContextMiddleware = (req, _res, next) => {
  const store = {
    requestId: req.headers["x-request-id"] || null,
    sessionId: req.headers["x-session-id"] || null,
    platform: normalizePlatform(req.headers["x-platform"]),
    base: normalizeBase(req.headers["x-base"]),
    ipAddress: req.ip || req.socket?.remoteAddress || null,
    userAgent: req.headers["user-agent"] || null,
  };

  requestContext.run(store, next);
};

const getRequestContext = () => requestContext.getStore() || {};

module.exports = {
  requestContextMiddleware,
  getRequestContext,
  normalizePlatform,
  normalizeBase,
};
