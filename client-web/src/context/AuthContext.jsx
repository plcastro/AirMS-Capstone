import React, { createContext, useState, useEffect, useRef } from "react";
import { API_BASE } from "../utils/API_BASE";

export const AuthContext = createContext();

const INACTIVITY_LIMIT_MS = 30 * 60 * 1000;
const WARNING_DURATION_MS = 10 * 60 * 1000;
const SESSION_META_KEY = "authSessionMeta";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSessionTimeoutWarning, setShowSessionTimeoutWarning] =
    useState(false);
  const [warningSecondsRemaining, setWarningSecondsRemaining] = useState(
    WARNING_DURATION_MS / 1000,
  );

  const inactivityWarningTimeoutRef = useRef(null);
  const inactivityLogoutTimeoutRef = useRef(null);
  const warningCountdownIntervalRef = useRef(null);
  const tokenExpiryTimeoutRef = useRef(null);

  const getStoredToken = () => sessionStorage.getItem("token");

  const normalizeUser = (userData) => ({
    ...userData,
    id: userData.id || userData._id || null,
    jobTitle: userData.jobTitle ? userData.jobTitle.trim().toLowerCase() : null,
    access: userData.access ? userData.access.trim().toLowerCase() : null,
    sessions: Array.isArray(userData.sessions) ? userData.sessions : [],
  });

  const persistAuthState = (normalizedUser, token) => {
    sessionStorage.setItem("currentUser", JSON.stringify(normalizedUser));
    sessionStorage.setItem("token", token);

    // persist only if "remember me" was used
    if (normalizedUser?.rememberMe) {
      localStorage.setItem("currentUser", JSON.stringify(normalizedUser));
      localStorage.setItem("token", token);
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

  const clearAuthStorage = () => {
    sessionStorage.removeItem("currentUser");
    sessionStorage.removeItem("token");
    localStorage.removeItem(SESSION_META_KEY);
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

    const timeLeft = INACTIVITY_LIMIT_MS - elapsed;
    if (timeLeft <= 0) return logoutUser();

    const warningDelay = Math.max(timeLeft - WARNING_DURATION_MS, 0);

    inactivityWarningTimeoutRef.current = setTimeout(() => {
      startWarningCountdown(
        Math.ceil(Math.min(WARNING_DURATION_MS, timeLeft) / 1000),
      );
    }, warningDelay);

    inactivityLogoutTimeoutRef.current = setTimeout(() => {
      logoutUser();
    }, timeLeft);
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
    const response = await fetch(`${API_BASE}/api/user/refresh-token`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...buildSessionHeaders(),
      },
    });

    const text = await response.text(); // 👈 IMPORTANT FIX

    let data;
    try {
      data = JSON.parse(text);
    } catch (err) {
      console.error("Refresh returned non-JSON:", text); // THIS stops "<html>" crash issue
      throw new Error("Failed to refresh token (invalid response)");
    }

    if (!response.ok) {
      throw new Error(data?.message || "Failed to refresh token");
    }

    if (!data.token) {
      throw new Error("No token received");
    }

    sessionStorage.setItem("token", data.token);
    scheduleTokenExpiryLogout(data.token, logoutUser);

    return data.token;
  };

  useEffect(() => {
    const loadUser = async () => {
      try {
        let storedUser =
          sessionStorage.getItem("currentUser") ||
          localStorage.getItem("currentUser");

        let token =
          sessionStorage.getItem("token") || localStorage.getItem("token");

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
          persistAuthState(normalizeUser(normalizedFromToken), token);
        }
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

  const loginUser = async (userData, token, options = {}) => {
    if (!token) return;

    const normalized = normalizeUser({
      ...userData,
      isOnline: true,
      online: true,
      platform: "web",
      base: options.base || userData.base,
      sessionId: options.sessionId || userData.sessionId,
      rememberMe: options.rememberMe,
    });

    setUser(normalized);
    persistSessionMeta({
      base: normalized.base,
      sessionId: normalized.sessionId,
      platform: "WEB",
    });
    persistAuthState(normalized, token);
    scheduleTokenExpiryLogout(token, logoutUser);
  };

  const logoutUser = async () => {
    try {
      setLoading(true);
      setShowSessionTimeoutWarning(false);

      clearInactivityTimers();
      clearTokenExpiryTimer();

      const token = sessionStorage.getItem("token");

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

      setUser(null);
      clearAuthStorage();
    } finally {
      setLoading(false);
    }
  };

  const getValidToken = async () => {
    const token = getStoredToken(); // ✅ MUST define it here

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

    events.forEach((eventName) => {
      window.addEventListener(eventName, recordActivity);
    });

    return () => {
      events.forEach((eventName) => {
        window.removeEventListener(eventName, recordActivity);
      });
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
        token: sessionStorage.getItem("token"),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
