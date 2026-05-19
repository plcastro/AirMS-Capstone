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
