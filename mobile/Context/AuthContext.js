import React, { createContext, useEffect, useRef, useState } from "react";
import { AppState, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE } from "../utilities/API_BASE";

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
  const appStateRef = useRef(AppState.currentState);
  const inactivityTimeoutRef = useRef(null);
  const warningTimeoutRef = useRef(null);
  const warningCountdownIntervalRef = useRef(null);
  const tokenExpiryTimeoutRef = useRef(null);
  const lastActivityAtRef = useRef(Date.now());
  const normalizeUser = (userData) => ({
    ...userData,
    id: userData?.id || userData?._id || null,
  });

  const isTokenValid = (token) => {
    try {
      const base64Payload = token.split(".")[1];
      const normalizedPayload = base64Payload
        .replace(/-/g, "+")
        .replace(/_/g, "/");

      if (typeof global.atob !== "function") {
        return true;
      }

      const payload = JSON.parse(global.atob(normalizedPayload));
      return payload.exp * 1000 > Date.now();
    } catch (err) {
      return false;
    }
  };

  const clearStoredAuth = async () => {
    if (Platform.OS === "web") {
      localStorage.removeItem("currentUser");
      localStorage.removeItem("currentUserToken");
      return;
    }

    await AsyncStorage.multiRemove(["currentUser", "currentUserToken"]);
  };

  const clearInactivityTimeout = () => {
    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current);
      inactivityTimeoutRef.current = null;
    }
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
      warningTimeoutRef.current = null;
    }
    if (warningCountdownIntervalRef.current) {
      clearInterval(warningCountdownIntervalRef.current);
      warningCountdownIntervalRef.current = null;
    }
  };

  const clearTokenExpiryTimeout = () => {
    if (tokenExpiryTimeoutRef.current) {
      clearTimeout(tokenExpiryTimeoutRef.current);
      tokenExpiryTimeoutRef.current = null;
    }
  };

  const getTokenExpiryTime = (token) => {
    try {
      const base64Payload = token.split(".")[1];
      const normalizedPayload = base64Payload
        .replace(/-/g, "+")
        .replace(/_/g, "/");

      if (typeof global.atob !== "function") {
        return null;
      }

      const payload = JSON.parse(global.atob(normalizedPayload));
      return payload.exp * 1000;
    } catch (error) {
      return null;
    }
  };

  const startWarningCountdown = (secondsRemaining) => {
    const safeSeconds = Math.max(0, secondsRemaining);
    setShowSessionTimeoutWarning(true);
    setWarningSecondsRemaining(safeSeconds);

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

  const scheduleTokenExpiryLogout = (token) => {
    clearTokenExpiryTimeout();
    const expiryAt = getTokenExpiryTime(token);

    if (!expiryAt) {
      return;
    }

    const msRemaining = expiryAt - Date.now();

    if (msRemaining <= 0) {
      logoutUser();
      return;
    }

    tokenExpiryTimeoutRef.current = setTimeout(() => {
      logoutUser();
    }, msRemaining);
  };

  const logoutUser = async ({ notifyServer = false } = {}) => {
    try {
      setLoading(true);
      clearInactivityTimeout();
      clearTokenExpiryTimeout();
      setShowSessionTimeoutWarning(false);

      if (notifyServer && Platform.OS !== "web") {
        const token = await AsyncStorage.getItem("currentUserToken");

        if (token) {
          await fetch(`${API_BASE}/api/user/logout`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }).catch((error) => {
            console.error("Server logout failed:", error);
          });
        }
      }

      setUser(null);
      await clearStoredAuth();
    } catch (err) {
      console.error("Failed to remove user:", err);
    } finally {
      setLoading(false);
    }
  };

  const recordActivity = () => {
    if (!user || Platform.OS === "web") {
      return;
    }

    lastActivityAtRef.current = Date.now();
    setShowSessionTimeoutWarning(false);
    clearInactivityTimeout();

    warningTimeoutRef.current = setTimeout(() => {
      startWarningCountdown(WARNING_DURATION_MS / 1000);
    }, INACTIVITY_LIMIT_MS - WARNING_DURATION_MS);

    inactivityTimeoutRef.current = setTimeout(() => {
      logoutUser();
    }, INACTIVITY_LIMIT_MS);
  };

  const continueSession = () => {
    recordActivity();
  };

  useEffect(() => {
    const loadUser = async () => {
      try {
        let storedUser;
        let storedToken;

        if (Platform.OS === "web") {
          storedUser = localStorage.getItem("currentUser");
          storedToken = localStorage.getItem("currentUserToken");
        } else {
          const result = await AsyncStorage.multiGet([
            "currentUser",
            "currentUserToken",
          ]);
          storedUser = result[0][1];
          storedToken = result[1][1];
        }

        if (!storedUser || !storedToken) {
          setUser(null);
          return;
        }

        if (!isTokenValid(storedToken)) {
          await clearStoredAuth();
          setUser(null);
          return;
        }

        const parsedUser = JSON.parse(storedUser);
        setUser(normalizeUser(parsedUser));

        scheduleTokenExpiryLogout(storedToken);
      } catch (err) {
        console.error("Session restore failed:", err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  useEffect(() => {
    if (Platform.OS === "web") {
      return undefined;
    }

    const subscription = AppState.addEventListener("change", (nextAppState) => {
      const previousState = appStateRef.current;
      appStateRef.current = nextAppState;

      if (!user) {
        clearInactivityTimeout();
        return;
      }

      if (
        previousState.match(/inactive|background/) &&
        nextAppState === "active"
      ) {
        const elapsed = Date.now() - lastActivityAtRef.current;
        if (elapsed >= INACTIVITY_LIMIT_MS) {
          logoutUser();
          return;
        }

        if (elapsed >= INACTIVITY_LIMIT_MS - WARNING_DURATION_MS) {
          const remainingSeconds = Math.ceil(
            (INACTIVITY_LIMIT_MS - elapsed) / 1000,
          );
          startWarningCountdown(remainingSeconds);
          inactivityTimeoutRef.current = setTimeout(() => {
            logoutUser();
          }, INACTIVITY_LIMIT_MS - elapsed);
          return;
        }

        recordActivity();
        return;
      }

      if (nextAppState.match(/inactive|background/)) {
        clearInactivityTimeout();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [user]);

  useEffect(() => {
    if (!user || Platform.OS === "web") {
      clearInactivityTimeout();
      return undefined;
    }

    recordActivity();

    return () => {
      clearInactivityTimeout();
    };
  }, [user]);

  // Login
  const loginUser = async (userData, token) => {
    if (!token) {
      console.error("No token provided");
      return;
    }

    const normalizedUser = normalizeUser({
      ...userData,
      isOnline: true,
      online: true,
      platform: "mobile",
    }); // keep case
    setUser(normalizedUser); // update state immediately

    if (Platform.OS === "web") {
      localStorage.setItem("currentUser", JSON.stringify(normalizedUser));
      localStorage.setItem("currentUserToken", token);
    } else {
      await AsyncStorage.multiSet([
        ["currentUser", JSON.stringify(normalizedUser)],
        ["currentUserToken", token],
      ]).catch(console.error);
    }

    lastActivityAtRef.current = Date.now();
    scheduleTokenExpiryLogout(token);
  };

  useEffect(() => {
    return () => {
      clearInactivityTimeout();
      clearTokenExpiryTimeout();
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        loginUser,
        logoutUser,
        recordActivity,
        continueSession,
        showSessionTimeoutWarning,
        warningSecondsRemaining,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
