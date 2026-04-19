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

  const normalizeUser = (userData) => ({
    ...userData,
    jobTitle: userData.jobTitle ? userData.jobTitle.trim().toLowerCase() : null,
    access: userData.access ? userData.access.trim().toLowerCase() : null,
  });

  const isTokenValid = (token) => {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      return payload.exp * 1000 > Date.now();
    } catch {
      return false;
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

    localStorage.setItem("token", data.token);
    scheduleTokenExpiryLogout(data.token, () => logoutUser());
    return data.token;
  };

  useEffect(() => {
    const loadUser = async () => {
      try {
        const storedUser = localStorage.getItem("currentUser");
        const token = localStorage.getItem("token");

        if (!storedUser) {
          setUser(null);
          return;
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
  const loginUser = async (userData, token) => {
    try {
      setLoading(true);

      if (!token) {
        console.error("No token provided");
        return;
      }
      const normalizedUser = normalizeUser(userData);

      setUser(normalizedUser);

      localStorage.setItem("currentUser", JSON.stringify(normalizedUser));
      localStorage.setItem("token", token);
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
      const token = localStorage.getItem("token");

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
