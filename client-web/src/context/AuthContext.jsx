import React, { createContext, useState, useEffect, useRef } from "react";
import { API_BASE } from "../utils/API_BASE";

export const AuthContext = createContext();
const INACTIVITY_LIMIT_MS = 30 * 60 * 1000;
const WARNING_DURATION_MS = 10 * 60 * 1000;
const AUTH_PERSISTENCE_KEY = "authPersistence";

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
  const persistenceModeRef = useRef("session");

  const normalizeUser = (userData) => ({
    ...userData,
    id: userData.id || userData._id || null,
    jobTitle: userData.jobTitle ? userData.jobTitle.trim().toLowerCase() : null,
    access: userData.access ? userData.access.trim().toLowerCase() : null,
  });

  const getStorageByMode = (mode) =>
    mode === "local" ? localStorage : sessionStorage;

  const getStoredPersistenceMode = () => {
    const mode = localStorage.getItem(AUTH_PERSISTENCE_KEY);
    return mode === "local" ? "local" : "session";
  };

  const setPersistenceMode = (mode) => {
    const safeMode = mode === "local" ? "local" : "session";
    persistenceModeRef.current = safeMode;
    localStorage.setItem(AUTH_PERSISTENCE_KEY, safeMode);
  };

  const persistAuthState = (normalizedUser, token) => {
    const mode = persistenceModeRef.current;
    const activeStorage = getStorageByMode(mode);
    const inactiveStorage = getStorageByMode(mode === "local" ? "session" : "local");

    activeStorage.setItem("currentUser", JSON.stringify(normalizedUser));
    activeStorage.setItem("token", token);
    inactiveStorage.removeItem("currentUser");
    inactiveStorage.removeItem("token");
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
    if (inactivityWarningTimeoutRef.current) {
      clearTimeout(inactivityWarningTimeoutRef.current);
      inactivityWarningTimeoutRef.current = null;
    }
    if (inactivityLogoutTimeoutRef.current) {
      clearTimeout(inactivityLogoutTimeoutRef.current);
      inactivityLogoutTimeoutRef.current = null;
    }
    if (warningCountdownIntervalRef.current) {
      clearInterval(warningCountdownIntervalRef.current);
      warningCountdownIntervalRef.current = null;
    }
  };

  const clearTokenExpiryTimer = () => {
    if (tokenExpiryTimeoutRef.current) {
      clearTimeout(tokenExpiryTimeoutRef.current);
      tokenExpiryTimeoutRef.current = null;
    }
  };

  const clearAuthStorage = () => {
    localStorage.removeItem("currentUser");
    localStorage.removeItem("token");
    sessionStorage.removeItem("currentUser");
    sessionStorage.removeItem("token");
    localStorage.removeItem(AUTH_PERSISTENCE_KEY);
  };

  const scheduleTokenExpiryLogout = (token, onExpire) => {
    clearTokenExpiryTimer();

    const expiryAt = getTokenExpiryTime(token);
    if (!expiryAt) {
      onExpire();
      return;
    }

    const msRemaining = expiryAt - Date.now();
    if (msRemaining <= 0) {
      onExpire();
      return;
    }

    tokenExpiryTimeoutRef.current = setTimeout(() => {
      onExpire();
    }, msRemaining);
  };

  const startWarningCountdown = (seconds) => {
    const safeSeconds = Math.max(0, seconds);
    setWarningSecondsRemaining(safeSeconds);
    setShowSessionTimeoutWarning(true);

    if (warningCountdownIntervalRef.current) {
      clearInterval(warningCountdownIntervalRef.current);
    }

    warningCountdownIntervalRef.current = setInterval(() => {
      setWarningSecondsRemaining((previousSeconds) => {
        if (previousSeconds <= 1) {
          clearInterval(warningCountdownIntervalRef.current);
          warningCountdownIntervalRef.current = null;
          return 0;
        }
        return previousSeconds - 1;
      });
    }, 1000);
  };

  const scheduleInactivityTimers = (elapsedInMs = 0) => {
    clearInactivityTimers();

    if (!user) {
      setShowSessionTimeoutWarning(false);
      return;
    }

    const timeLeftBeforeLogout = INACTIVITY_LIMIT_MS - elapsedInMs;
    if (timeLeftBeforeLogout <= 0) {
      logoutUser();
      return;
    }

    const warningDelay = Math.max(
      timeLeftBeforeLogout - WARNING_DURATION_MS,
      0,
    );

    inactivityWarningTimeoutRef.current = setTimeout(() => {
      startWarningCountdown(
        Math.ceil(Math.min(WARNING_DURATION_MS, timeLeftBeforeLogout) / 1000),
      );
    }, warningDelay);

    inactivityLogoutTimeoutRef.current = setTimeout(() => {
      logoutUser();
    }, timeLeftBeforeLogout);
  };

  const recordActivity = () => {
    if (!user) {
      return;
    }

    setShowSessionTimeoutWarning(false);
    scheduleInactivityTimers(0);
  };

  const continueSession = () => {
    recordActivity();
  };

  const refreshAccessToken = async () => {
    const response = await fetch(`${API_BASE}/api/user/refresh-token`, {
      method: "POST",
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("Failed to refresh token");
    }

    const data = await response.json();
    if (!data.token) {
      throw new Error("No refreshed token received");
    }

    const activeStorage = getStorageByMode(persistenceModeRef.current);
    activeStorage.setItem("token", data.token);
    scheduleTokenExpiryLogout(data.token, () => logoutUser());
    return data.token;
  };

  useEffect(() => {
    const loadUser = async () => {
      try {
        const persistedMode = getStoredPersistenceMode();
        setPersistenceMode(persistedMode);
        const primaryStorage = getStorageByMode(persistedMode);
        const fallbackStorage = getStorageByMode(
          persistedMode === "local" ? "session" : "local",
        );

        const storedUser =
          primaryStorage.getItem("currentUser") ||
          fallbackStorage.getItem("currentUser");
        const token =
          primaryStorage.getItem("token") || fallbackStorage.getItem("token");

        if (!storedUser) {
          try {
            const refreshedToken = await refreshAccessToken();
            const payload = getTokenPayload(refreshedToken);
            if (!payload?.id) {
              throw new Error("Invalid refreshed token payload");
            }
            const normalizedFromToken = normalizeUser({
              id: payload.id,
              username: payload.username,
              email: payload.email,
              jobTitle: payload.jobTitle,
              access: payload.access,
            });
            setUser(normalizedFromToken);
            persistAuthState(normalizedFromToken, refreshedToken);
            scheduleTokenExpiryLogout(refreshedToken, () => logoutUser());
            return;
          } catch {
            setUser(null);
            return;
          }
        }

        const parsed = JSON.parse(storedUser);

        if (token && isTokenValid(token)) {
          setUser(normalizeUser(parsed));
          scheduleTokenExpiryLogout(token, () => logoutUser());
          return;
        }

        try {
          const refreshedToken = await refreshAccessToken();
          scheduleTokenExpiryLogout(refreshedToken, () => logoutUser());
          setUser(normalizeUser(parsed));
        } catch {
          clearAuthStorage();
          setUser(null);
        }
      } catch (err) {
        console.error("Failed to load user:", err);
        clearAuthStorage();
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  // Login
  const loginUser = async (userData, token, options = {}) => {
    try {
      setLoading(true);

      if (!token) {
        console.error("No token provided");
        return;
      }
      const normalizedUser = normalizeUser({
        ...userData,
        isOnline: true,
        online: true,
        platform: "web",
      });

      setPersistenceMode(options.rememberMe ? "local" : "session");
      setUser(normalizedUser);
      persistAuthState(normalizedUser, token);
      scheduleTokenExpiryLogout(token, () => logoutUser());
    } catch (err) {
      console.error("Failed to store user:", err);
    } finally {
      setLoading(false);
    }
  };

  // Logout
  const logoutUser = async () => {
    try {
      setLoading(true);
      setShowSessionTimeoutWarning(false);
      clearInactivityTimers();
      clearTokenExpiryTimer();
      const token =
        localStorage.getItem("token") || sessionStorage.getItem("token");

      if (token) {
        await fetch(`${API_BASE}/api/user/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          credentials: "include",
        });
      }

      setUser(null);
      clearAuthStorage();
    } catch (err) {
      console.error("Failed to remove user:", err);
    } finally {
      setLoading(false);
    }
  };

  const getValidToken = async () => {
    const token = localStorage.getItem("token");

    if (token && isTokenValid(token)) {
      scheduleTokenExpiryLogout(token, () => logoutUser());
      return token;
    }

    try {
      return await refreshAccessToken();
    } catch (error) {
      await logoutUser();
      throw error;
    }
  };

  const getAuthHeader = async () => {
    const token = await getValidToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
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

  useEffect(() => {
    return () => {
      clearInactivityTimers();
      clearTokenExpiryTimer();
    };
  }, []);

  if (loading) return null;
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
        continueSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
