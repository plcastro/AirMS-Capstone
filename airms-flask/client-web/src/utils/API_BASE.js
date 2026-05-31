const normalizedOrigin =
  typeof window !== "undefined" && window.location
    ? window.location.origin
    : "http://127.0.0.1:5000";

export const API_BASE = normalizedOrigin;
