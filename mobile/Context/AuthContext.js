import React, { createContext, useEffect, useRef, useState } from "react";
import { AppState, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE } from "../utilities/API_BASE";

export const AuthContext = createContext();
const INACTIVITY_LIMIT_MS = 30 * 60 * 1000;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const appStateRef = useRef(AppState.currentState);
  const inactivityTimeoutRef = useRef(null);
  const lastActivityAtRef = useRef(Date.now());

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
  };

  const logoutUser = async ({ notifyServer = false } = {}) => {
    try {
      setLoading(true);
      clearInactivityTimeout();

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
    clearInactivityTimeout();
    inactivityTimeoutRef.current = setTimeout(() => {
      logoutUser();
    }, INACTIVITY_LIMIT_MS);
  };

  useEffect(() => {
    const loadUser = async () => {
      try {
        if (Platform.OS === "web") {
          const storedUser = localStorage.getItem("currentUser");
          const storedToken = localStorage.getItem("currentUserToken");

          if (storedUser && storedToken && isTokenValid(storedToken)) {
            const parsed = JSON.parse(storedUser);

            const normalizedUser = {
              ...parsed,
              jobTitle: parsed.jobTitle
                ? parsed.jobTitle.trim().toLowerCase()
                : null,
              access: parsed.access ? parsed.access.trim().toLowerCase() : null,
            };

            setUser(normalizedUser);
          } else if (storedUser || storedToken) {
            await clearStoredAuth();
          }
        } else {
          await clearStoredAuth();
          setUser(null);
        }
      } catch (err) {
        console.error("Failed to load user:", err);
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
        if (Date.now() - lastActivityAtRef.current >= INACTIVITY_LIMIT_MS) {
          logoutUser();
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

    const normalizedUser = { ...userData }; // keep case
    setUser(normalizedUser); // update state immediately

    if (Platform.OS === "web") {
      localStorage.setItem("currentUser", JSON.stringify(normalizedUser));
      localStorage.setItem("currentUserToken", token);
    } else {
      await AsyncStorage.multiSet([
        ["currentUser", JSON.stringify(normalizedUser)],
        ["currentUserToken", token],
        ["lastLoggedInUserId", String(normalizedUser.id || "")],
      ]).catch(console.error);
    }

    lastActivityAtRef.current = Date.now();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        loginUser,
        logoutUser,
        recordActivity,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
