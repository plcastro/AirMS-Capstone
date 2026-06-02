import { API_BASE } from "./API_BASE";

let socket = null;
let reconnectTimeout = null;
let shutdownTimeout = null;
let closedByManager = false;
let reconnectAttempt = 0;
let activeToken = "";

const listeners = new Set();

const buildWsUrl = (token) => {
  const rawBase = String(API_BASE || "").trim();
  const httpBase =
    rawBase ||
    (typeof window !== "undefined" && window.location
      ? window.location.origin
      : "");
  if (!httpBase) return null;

  const wsBase = httpBase.replace(/^http/i, (match) =>
    match.toLowerCase() === "https" ? "wss" : "ws",
  );
  try {
    const url = new URL(wsBase);
    url.searchParams.set("token", token);
    return url.toString();
  } catch {
    return null;
  }
};

const getStoredToken = () =>
  localStorage.getItem("currentUserToken") ||
  localStorage.getItem("token") ||
  sessionStorage.getItem("token") ||
  "";

const notifyListeners = (payload) => {
  listeners.forEach((listener) => {
    try {
      listener(payload);
    } catch (error) {
      console.error("Realtime listener failed:", error);
    }
  });
};

const clearReconnectTimer = () => {
  if (reconnectTimeout) {
    window.clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }
};

const clearShutdownTimer = () => {
  if (shutdownTimeout) {
    window.clearTimeout(shutdownTimeout);
    shutdownTimeout = null;
  }
};

const getReconnectDelayMs = () => {
  const base = Math.min(1000 * 2 ** reconnectAttempt, 10000);
  const jitter = Math.floor(Math.random() * 400);
  return base + jitter;
};

const ensureConnection = () => {
  clearShutdownTimer();
  const token = getStoredToken();
  if (!token || listeners.size === 0) return;

  if (
    socket &&
    (socket.readyState === WebSocket.OPEN ||
      socket.readyState === WebSocket.CONNECTING) &&
    activeToken === token
  ) {
    return;
  }

  if (socket && socket.readyState === WebSocket.OPEN) {
    try {
      socket.close();
    } catch {
      // no-op
    }
  }

  closedByManager = false;
  activeToken = token;
  const wsUrl = buildWsUrl(token);
  if (!wsUrl) return;
  socket = new WebSocket(wsUrl);

  socket.onopen = () => {
    reconnectAttempt = 0;
  };

  socket.onmessage = (event) => {
    try {
      const payload = JSON.parse(event.data || "{}");
      notifyListeners(payload);
    } catch (error) {
      console.error("Realtime websocket parse error:", error);
    }
  };

  socket.onerror = () => {
    try {
      socket?.close();
    } catch {
      // no-op
    }
  };

  socket.onclose = () => {
    socket = null;
    activeToken = "";
    if (closedByManager || listeners.size === 0) return;

    reconnectAttempt += 1;
    clearReconnectTimer();
    reconnectTimeout = window.setTimeout(
      ensureConnection,
      getReconnectDelayMs(),
    );
  };
};

export const subscribeRealtime = (listener) => {
  listeners.add(listener);
  clearShutdownTimer();
  ensureConnection();

  return () => {
    listeners.delete(listener);
    if (listeners.size > 0) return;

    // Graceful idle shutdown avoids noisy "closed before established"
    // logs during React dev strict-mode effect re-runs.
    clearShutdownTimer();
    shutdownTimeout = window.setTimeout(() => {
      if (listeners.size > 0) return;
      closedByManager = true;
      clearReconnectTimer();
      reconnectAttempt = 0;
      activeToken = "";
      if (socket && socket.readyState === WebSocket.OPEN) {
        try {
          socket.close();
        } catch {
          // no-op
        }
      }
      socket = null;
    }, 2000);
  };
};

export const reconnectRealtime = () => {
  clearReconnectTimer();
  reconnectAttempt = 0;
  if (listeners.size === 0) return;
  ensureConnection();
};
