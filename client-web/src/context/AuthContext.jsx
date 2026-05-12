import React, { createContext, useState, useEffect, useRef } from "react";
import { API_BASE } from "../utils/API_BASE";

export const AuthContext = createContext();

const INACTIVITY_LIMIT_MS = 30 * 60 * 1000;
const WARNING_DURATION_MS = 10 * 60 * 1000;

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

  // =========================
  // STORAGE (SESSION ONLY)
  // =========================
  const getStorage = () => sessionStorage;

  const getStoredToken = () => sessionStorage.getItem("token");

  const persistAuthState = (normalizedUser, token) => {
    const storage = sessionStorage;
    storage.setItem("currentUser", JSON.stringify(normalizedUser));
    storage.setItem("token", token);
  };

  const clearAuthStorage = () => {
    sessionStorage.removeItem("currentUser");
    sessionStorage.removeItem("token");
  };

  // =========================
  // USER NORMALIZATION
  // =========================
  const normalizeUser = (userData) => ({
    ...userData,
    id: userData.id || userData._id || null,
    jobTitle: userData.jobTitle ? userData.jobTitle.trim().toLowerCase() : null,
    access: userData.access ? userData.access.trim().toLowerCase() : null,
    sessions: Array.isArray(userData.sessions) ? userData.sessions : [],
  });

  // =========================
  // TOKEN HELPERS
  // =========================
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

  // =========================
  // TIMERS
  // =========================
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

  // =========================
  // TOKEN REFRESH
  // =========================
  const refreshAccessToken = async () => {
    const response = await fetch(`${API_BASE}/api/user/refresh-token`, {
      method: "POST",
      credentials: "include",
    });

    if (!response.ok) throw new Error("Failed to refresh token");

    const data = await response.json();
    if (!data.token) throw new Error("No token received");

    sessionStorage.setItem("token", data.token);
    scheduleTokenExpiryLogout(data.token, logoutUser);

    return data.token;
  };

  // =========================
  // LOAD USER ON START
  // =========================
  useEffect(() => {
    const loadUser = async () => {
      try {
        const storedUser = sessionStorage.getItem("currentUser");
        let token = sessionStorage.getItem("token");

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
        setUser(parsedUser ? normalizeUser(parsedUser) : null);
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

  // =========================
  // LOGIN
  // =========================
  const loginUser = async (userData, token) => {
    if (!token) return;

    const normalized = normalizeUser({
      ...userData,
      isOnline: true,
      online: true,
      platform: "web",
    });

    setUser(normalized);
    persistAuthState(normalized, token);
    scheduleTokenExpiryLogout(token, logoutUser);
  };

  // =========================
  // LOGOUT
  // =========================
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
          headers: { Authorization: `Bearer ${token}` },
          credentials: "include",
        });
      }

      setUser(null);
      clearAuthStorage();
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // AUTH HELPERS
  // =========================
  const getValidToken = async () => {
    const token = getStoredToken();

    if (token && isTokenValid(token)) {
      scheduleTokenExpiryLogout(token, logoutUser);
      return token;
    }

    return await refreshAccessToken();
  };

  const getAuthHeader = async () => {
    const token = await getValidToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // =========================
  // ACTIVITY LISTENERS
  // =========================
  useEffect(() => {
    if (!user) {
      clearInactivityTimers();
      setShowSessionTimeoutWarning(false);
      return;
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

    events.forEach((e) => window.addEventListener(e, recordActivity));

    return () => {
      events.forEach((e) => window.removeEventListener(e, recordActivity));
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
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
