import React, { createContext, useEffect, useRef, useState } from "react";
import { AppState, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE } from "../utilities/API_BASE";

export const AuthContext = createContext();

const ACCESS_KEY = "access_token";
const REFRESH_KEY = "refresh_token";
const USER_KEY = "current_user";

/**
 * Safe storage wrapper (prevents undefined crash)
 */
const storage = {
  get: async (key) => {
    return Platform.OS === "web"
      ? localStorage.getItem(key)
      : await AsyncStorage.getItem(key);
  },

  set: async (key, value) => {
    if (value === undefined || value === null) return;

    return Platform.OS === "web"
      ? localStorage.setItem(key, value)
      : await AsyncStorage.setItem(key, value);
  },

  remove: async (key) => {
    return Platform.OS === "web"
      ? localStorage.removeItem(key)
      : await AsyncStorage.removeItem(key);
  },
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const appState = useRef(AppState.currentState);

  // =========================
  // LOGOUT
  // =========================
  const logout = async () => {
    setUser(null);
    await storage.remove(USER_KEY);
    await storage.remove(ACCESS_KEY);
    await storage.remove(REFRESH_KEY);
  };

  // =========================
  // REFRESH TOKEN
  // =========================
  const refreshToken = async () => {
    const refresh = await storage.get(REFRESH_KEY);
    if (!refresh) throw new Error("No refresh token");

    const res = await fetch(`${API_BASE}/api/user/refresh-token`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${refresh}`,
      },
    });

    if (!res.ok) throw new Error("Refresh failed");

    const data = await res.json();

    await storage.set(ACCESS_KEY, data.accessToken);
    if (data.refreshToken) {
      await storage.set(REFRESH_KEY, data.refreshToken);
    }

    return data.accessToken;
  };

  // =========================
  // TOKEN CHECK
  // =========================
  const decodeToken = (token) => {
    try {
      return JSON.parse(atob(token.split(".")[1]));
    } catch {
      return null;
    }
  };

  const isExpired = (token) => {
    const payload = decodeToken(token);
    if (!payload) return true;
    return payload.exp * 1000 < Date.now();
  };

  const verifyToken = async (token) => {
    if (!token || isExpired(token)) {
      try {
        await refreshToken();
        return true;
      } catch {
        return false;
      }
    }
    return true;
  };

  // =========================
  // RESTORE SESSION
  // =========================
  const restoreSession = async () => {
    try {
      const token = await storage.get(ACCESS_KEY);
      const cachedUser = await storage.get(USER_KEY);

      if (!token) {
        setUser(null);
        return;
      }

      if (cachedUser) {
        setUser(JSON.parse(cachedUser));
      }

      const valid = await verifyToken(token);

      if (!valid) {
        await logout();
      }
    } catch (err) {
      await logout();
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // LOGIN (CLEAN CONTRACT)
  // =========================
  const loginUser = async ({ user, accessToken, refreshToken }) => {
    if (!user || !accessToken) {
      console.log("❌ Invalid login payload", {
        user,
        accessToken,
        refreshToken,
      });
      return;
    }

    setUser(user);

    await storage.set(USER_KEY, JSON.stringify(user));
    await storage.set(ACCESS_KEY, accessToken);

    if (refreshToken) {
      await storage.set(REFRESH_KEY, refreshToken);
    }
  };

  // =========================
  // APP STATE LISTENER
  // =========================
  useEffect(() => {
    restoreSession();

    const sub = AppState.addEventListener("change", async (state) => {
      if (appState.current.match(/inactive|background/) && state === "active") {
        await restoreSession();
      }
      appState.current = state;
    });

    return () => sub.remove();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        loginUser,
        logout,
        restoreSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
