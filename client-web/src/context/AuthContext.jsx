import React, { createContext, useEffect, useRef, useState } from "react";
import { API_BASE } from "../utils/API_BASE";

export const AuthContext = createContext();

const INACTIVITY_LIMIT_MS = 1 * 60 * 1000;
const WARNING_DURATION_MS = 15 * 1000;
const SESSION_META_KEY = "authSessionMeta";
const SESSION_TIMING_KEY = "authSessionTiming";
const REMEMBER_ME_KEY = "rememberMe";
const AUTH_SYNC_KEY = "authSyncEvent";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSessionTimeoutWarning, setShowSessionTimeoutWarning] =
    useState(false);
  const [warningSecondsRemaining, setWarningSecondsRemaining] = useState(
    WARNING_DURATION_MS / 1000,
  );
  const [rememberMePreference, setRememberMePreferenceState] = useState(
    localStorage.getItem(REMEMBER_ME_KEY) === "true",
  );

  const syncChannelRef = useRef(null);
  const inactivityWarningTimeoutRef = useRef(null);
  const inactivityLogoutTimeoutRef = useRef(null);
  const warningCountdownIntervalRef = useRef(null);
  const tokenExpiryTimeoutRef = useRef(null);
  const refreshTokenPromiseRef = useRef(null);
  const sessionEndedRef = useRef(false);

  const getStoredToken = () =>
    sessionStorage.getItem("token") || localStorage.getItem("token");

  const normalizeUser = (userData) => ({
    ...userData,
    id: userData.id || userData._id || null,
    jobTitle: userData.jobTitle ? userData.jobTitle.trim().toLowerCase() : null,
    access: userData.access ? userData.access.trim().toLowerCase() : null,
  });

  const publishAuthSync = (payload) => {
    const eventPayload = { ...payload, at: Date.now() };
    try {
      localStorage.setItem(AUTH_SYNC_KEY, JSON.stringify(eventPayload));
    } catch {
      // no-op
    }
    try {
      syncChannelRef.current?.postMessage(eventPayload);
    } catch {
      // no-op
    }
  };

  const persistSessionMeta = (meta = {}) => {
    const sessionMeta = {
      base: meta.base || "UNKNOWN",
      sessionId: meta.sessionId || null,
      platform: meta.platform || "WEB",
    };
    localStorage.setItem(SESSION_META_KEY, JSON.stringify(sessionMeta));
    return sessionMeta;
  };

  const getSessionMeta = () => {
    try {
      return JSON.parse(localStorage.getItem(SESSION_META_KEY) || "{}");
    } catch {
      return {};
    }
  };

  const persistAuthState = (normalizedUser, token, rememberMe) => {
    sessionStorage.setItem("currentUser", JSON.stringify(normalizedUser));
    sessionStorage.setItem("token", token);
    if (rememberMe) {
      localStorage.setItem("currentUser", JSON.stringify(normalizedUser));
      localStorage.setItem("token", token);
      localStorage.setItem(REMEMBER_ME_KEY, "true");
    } else {
      localStorage.removeItem("currentUser");
      localStorage.removeItem("token");
      localStorage.setItem(REMEMBER_ME_KEY, "false");
    }
  };

  const clearAuthStorage = () => {
    sessionStorage.removeItem("currentUser");
    sessionStorage.removeItem("token");
    sessionStorage.removeItem(SESSION_TIMING_KEY);
    localStorage.removeItem("currentUser");
    localStorage.removeItem("token");
    localStorage.removeItem(SESSION_META_KEY);
    localStorage.removeItem(SESSION_TIMING_KEY);
    localStorage.setItem(REMEMBER_ME_KEY, "false");
  };

  const isTokenValid = (token) => {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      return payload.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  };

  const getTokenPayload = (token) => {
    try {
      return JSON.parse(atob(token.split(".")[1]));
    } catch {
      return null;
    }
  };

  const getTokenExpiryTime = (token) => {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      return payload.exp * 1000;
    } catch {
      return null;
    }
  };
  const persistSessionTiming = (token, source = "unknown", options = {}) => {
    const { restartFullWindow = false } = options;
    const now = Date.now();
    const tokenExpiresAt = getTokenExpiryTime(token);
    const expiresAt = restartFullWindow
      ? now + INACTIVITY_LIMIT_MS
      : tokenExpiresAt || now + INACTIVITY_LIMIT_MS;
    const payload = {
      source,
      startedAt: now,
      expiresAt,
      remainingSeconds: Math.max(0, Math.floor((expiresAt - now) / 1000)),
      updatedAt: now,
    };
    sessionStorage.setItem(SESSION_TIMING_KEY, JSON.stringify(payload));
    if (rememberMePreference) {
      localStorage.setItem(SESSION_TIMING_KEY, JSON.stringify(payload));
    } else {
      localStorage.removeItem(SESSION_TIMING_KEY);
    }
  };

  const clearInactivityTimers = () => {
    clearTimeout(inactivityWarningTimeoutRef.current);
    clearTimeout(inactivityLogoutTimeoutRef.current);
    clearInterval(warningCountdownIntervalRef.current);
    inactivityWarningTimeoutRef.current = null;
    inactivityLogoutTimeoutRef.current = null;
    warningCountdownIntervalRef.current = null;
  };

  const clearTokenExpiryTimer = () => {
    clearTimeout(tokenExpiryTimeoutRef.current);
    tokenExpiryTimeoutRef.current = null;
  };

  const scheduleTokenExpiryLogout = (token, onExpire) => {
    clearTokenExpiryTimer();
    const expiryAt = getTokenExpiryTime(token);
    if (!expiryAt) return onExpire();
    const msRemaining = expiryAt - Date.now();
    if (msRemaining <= 0) return onExpire();
    tokenExpiryTimeoutRef.current = setTimeout(onExpire, msRemaining);
  };

  const startWarningCountdown = (seconds) => {
    setWarningSecondsRemaining(seconds);
    setShowSessionTimeoutWarning(true);
    clearInterval(warningCountdownIntervalRef.current);
    warningCountdownIntervalRef.current = setInterval(() => {
      setWarningSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(warningCountdownIntervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const scheduleInactivityTimers = (elapsed = 0) => {
    clearInactivityTimers();
    if (!user) return;

    const safeElapsed = Math.max(0, Number(elapsed) || 0);
    const warningLeadTimeMs = WARNING_DURATION_MS;
    const warningStartAfterMs =
      INACTIVITY_LIMIT_MS - warningLeadTimeMs - safeElapsed;
    const autoLogoutAfterMs = INACTIVITY_LIMIT_MS - safeElapsed;

    const triggerWarning = (remainingMs) => {
      const remainingSeconds = Math.max(1, Math.ceil(remainingMs / 1000));
      startWarningCountdown(remainingSeconds);
    };

    if (warningStartAfterMs <= 0) {
      triggerWarning(Math.max(1000, autoLogoutAfterMs));
    } else {
      inactivityWarningTimeoutRef.current = setTimeout(() => {
        triggerWarning(warningLeadTimeMs);
      }, warningStartAfterMs);
    }
  };

  const forceLogoutOnce = (broadcast = true) => {
    if (sessionEndedRef.current) return;
    sessionEndedRef.current = true;
    setShowSessionTimeoutWarning(false);
    clearInactivityTimers();
    clearTokenExpiryTimer();
    setUser(null);
    clearAuthStorage();
    setRememberMePreferenceState(false);
    if (broadcast) {
      publishAuthSync({ type: "LOGOUT" });
    }
  };

  const recordActivity = () => {
    if (!user) return;
    setShowSessionTimeoutWarning(false);
    scheduleInactivityTimers(0);
  };

  const buildSessionHeaders = () => {
    const sessionMeta = getSessionMeta();
    return {
      "x-platform": sessionMeta.platform || "WEB",
      ...(sessionMeta.base ? { "x-base": sessionMeta.base } : {}),
      ...(sessionMeta.sessionId
        ? { "x-session-id": sessionMeta.sessionId }
        : {}),
    };
  };

  const refreshAccessToken = async () => {
    if (refreshTokenPromiseRef.current) {
      return refreshTokenPromiseRef.current;
    }

    refreshTokenPromiseRef.current = (async () => {
      const response = await fetch(`${API_BASE}/api/user/refresh-token`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...buildSessionHeaders(),
        },
      });
      const text = await response.text();
      let data = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        throw new Error("Failed to refresh token (invalid response)");
      }

      if (!response.ok) {
        const backendMessage = String(data?.message || "");
        if (
          response.status === 401 ||
          response.status === 403 ||
          backendMessage.toLowerCase().includes("session is no longer active")
        ) {
          forceLogoutOnce(true);
        }
        throw new Error(data?.message || "Failed to refresh token");
      }

      if (!data.token) throw new Error("No token received");

      sessionEndedRef.current = false;
      sessionStorage.setItem("token", data.token);
      if (rememberMePreference) {
        localStorage.setItem("token", data.token);
      } else {
        localStorage.removeItem("token");
      }
      persistSessionTiming(data.token, "refresh");
      publishAuthSync({ type: "TOKEN_REFRESH", token: data.token });
      scheduleTokenExpiryLogout(data.token, logoutUser);
      return data.token;
    })();

    try {
      return await refreshTokenPromiseRef.current;
    } finally {
      refreshTokenPromiseRef.current = null;
    }
  };

  const logoutUser = async (options = {}) => {
    const { broadcast = true } = options;
    const token = getStoredToken();
    try {
      sessionEndedRef.current = true;
      setLoading(true);
      setShowSessionTimeoutWarning(false);
      clearInactivityTimers();
      clearTokenExpiryTimer();
      setUser(null);
      clearAuthStorage();
      setRememberMePreferenceState(false);
      if (broadcast) {
        publishAuthSync({ type: "LOGOUT" });
      }

      if (token) {
        await fetch(`${API_BASE}/api/user/logout`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            ...buildSessionHeaders(),
          },
          credentials: "include",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const getValidToken = async () => {
    if (sessionEndedRef.current) {
      return null;
    }
    const token = getStoredToken();
    if (token && isTokenValid(token)) {
      scheduleTokenExpiryLogout(token, logoutUser);
      return token;
    }
    return await refreshAccessToken();
  };

  const getAuthHeader = async () => {
    const token = await getValidToken();
    return token
      ? {
          Authorization: `Bearer ${token}`,
          ...buildSessionHeaders(),
        }
      : {};
  };

  const loginUser = async (userData, token, options = {}) => {
    if (!token) return;
    sessionEndedRef.current = false;
    const rememberMe = Boolean(options.rememberMe);
    const normalized = normalizeUser({
      ...userData,
      isOnline: true,
      online: true,
      platform: "web",
      base: options.base || userData.base,
      sessionId: options.sessionId || userData.sessionId,
    });
    setUser(normalized);
    setRememberMePreferenceState(rememberMe);
    persistSessionMeta({
      base: normalized.base,
      sessionId: normalized.sessionId,
      platform: "WEB",
    });
    persistAuthState(normalized, token, rememberMe);
    persistSessionTiming(token, "login");
    publishAuthSync({ type: "LOGIN", token, user: normalized, rememberMe });
    scheduleTokenExpiryLogout(token, logoutUser);
  };

  const updateRememberMePreference = async (
    rememberMe,
    { revokePersistentTokens = false } = {},
  ) => {
    const currentToken = await getValidToken();
    if (!currentToken) throw new Error("No active session");
    const sessionMeta = getSessionMeta();
    const response = await fetch(`${API_BASE}/api/user/session-preference`, {
      method: "PUT",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${currentToken}`,
        ...(sessionMeta?.sessionId
          ? { "x-session-id": sessionMeta.sessionId }
          : {}),
        ...(sessionMeta?.base ? { "x-base": sessionMeta.base } : {}),
        "x-platform": "WEB",
      },
      body: JSON.stringify({ rememberMe, revokePersistentTokens }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(
        payload?.message || "Failed to update session preference",
      );
    }

    const tokenToKeep =
      sessionStorage.getItem("token") || localStorage.getItem("token");
    if (rememberMe) {
      localStorage.setItem(REMEMBER_ME_KEY, "true");
      if (user) localStorage.setItem("currentUser", JSON.stringify(user));
      if (tokenToKeep) localStorage.setItem("token", tokenToKeep);
      if (tokenToKeep) {
        localStorage.setItem(
          SESSION_TIMING_KEY,
          sessionStorage.getItem(SESSION_TIMING_KEY) || "",
        );
      }
    } else {
      localStorage.setItem(REMEMBER_ME_KEY, "false");
      localStorage.removeItem("currentUser");
      localStorage.removeItem("token");
      localStorage.removeItem(SESSION_TIMING_KEY);
    }
    if (tokenToKeep) persistSessionTiming(tokenToKeep, "remember-me-update");
    setRememberMePreferenceState(rememberMe);
    publishAuthSync({ type: "REMEMBER_ME_UPDATED", rememberMe });
    return payload;
  };

  useEffect(() => {
    if (typeof BroadcastChannel !== "undefined") {
      syncChannelRef.current = new BroadcastChannel("airms-auth-sync");
      syncChannelRef.current.onmessage = (event) => {
        const payload = event?.data || {};
        if (payload.type === "LOGOUT") {
          sessionEndedRef.current = true;
          setUser(null);
          clearAuthStorage();
          setRememberMePreferenceState(false);
        }
        if (payload.type === "TOKEN_REFRESH" && payload.token) {
          sessionStorage.setItem("token", payload.token);
          if (rememberMePreference) {
            localStorage.setItem("token", payload.token);
          }
          persistSessionTiming(payload.token, "sync-refresh");
        }
      };
    }

    const onStorage = (event) => {
      if (event.key !== AUTH_SYNC_KEY || !event.newValue) return;
      try {
        const payload = JSON.parse(event.newValue);
        if (payload.type === "LOGOUT") {
          sessionEndedRef.current = true;
          setUser(null);
          clearAuthStorage();
          setRememberMePreferenceState(false);
          return;
        }
        if (payload.type === "LOGIN" && payload.user && payload.token) {
          setUser(normalizeUser(payload.user));
          sessionStorage.setItem("currentUser", JSON.stringify(payload.user));
          sessionStorage.setItem("token", payload.token);
          setRememberMePreferenceState(Boolean(payload.rememberMe));
          persistSessionTiming(payload.token, "sync-login");
          return;
        }
        if (payload.type === "REMEMBER_ME_UPDATED") {
          setRememberMePreferenceState(Boolean(payload.rememberMe));
        }
      } catch {
        // no-op
      }
    };

    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("storage", onStorage);
      syncChannelRef.current?.close();
      syncChannelRef.current = null;
    };
  }, [rememberMePreference]);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const remembered = localStorage.getItem(REMEMBER_ME_KEY) === "true";
        setRememberMePreferenceState(remembered);

        let storedUser =
          sessionStorage.getItem("currentUser") ||
          localStorage.getItem("currentUser");
        let token = getStoredToken();

        if (!storedUser && !token) {
          setUser(null);
          return;
        }

        if (!storedUser && token) {
          token = await refreshAccessToken();
        }

        const parsedUser = storedUser ? JSON.parse(storedUser) : null;
        if (token && isTokenValid(token) && parsedUser) {
          setUser(normalizeUser(parsedUser));
          persistSessionTiming(token, "restore", { restartFullWindow: true });
          scheduleTokenExpiryLogout(token, logoutUser);
          return;
        }

        token = await refreshAccessToken();
        const payload = getTokenPayload(token);
        const normalizedFromToken =
          parsedUser ||
          (payload?.id
            ? {
                id: payload.id,
                username: payload.username,
                email: payload.email,
                jobTitle: payload.jobTitle,
                access: payload.access,
                base: payload.base,
                sessionId: payload.sessionId,
              }
            : null);

        setUser(
          normalizedFromToken ? normalizeUser(normalizedFromToken) : null,
        );
        if (normalizedFromToken) {
          persistAuthState(
            normalizeUser(normalizedFromToken),
            token,
            remembered,
          );
        }
        persistSessionTiming(token, "restore-refresh", {
          restartFullWindow: true,
        });
        scheduleTokenExpiryLogout(token, logoutUser);
      } catch (err) {
        console.error("Auth load error:", err);
        clearAuthStorage();
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  useEffect(() => {
    if (!user) {
      clearInactivityTimers();
      setShowSessionTimeoutWarning(false);
      return undefined;
    }
    scheduleInactivityTimers(0);
    const events = [
      "mousemove",
      "mousedown",
      "keydown",
      "scroll",
      "touchstart",
      "click",
    ];
    events.forEach((eventName) =>
      window.addEventListener(eventName, recordActivity),
    );
    return () => {
      events.forEach((eventName) =>
        window.removeEventListener(eventName, recordActivity),
      );
      clearInactivityTimers();
    };
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        loginUser,
        logoutUser,
        getValidToken,
        refreshAccessToken,
        getAuthHeader,
        loading,
        showSessionTimeoutWarning,
        warningSecondsRemaining,
        continueSession: recordActivity,
        token: getStoredToken(),
        rememberMePreference,
        updateRememberMePreference,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
