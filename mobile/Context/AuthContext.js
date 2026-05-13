import React, { createContext, useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { API_BASE } from "../utilities/API_BASE";

export const AuthContext = createContext();
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshSession = useCallback(async () => {
    try {
      // Check SecureStore first, fallback to AsyncStorage
      let refreshToken = await SecureStore.getItemAsync("refreshToken");
      if (!refreshToken) {
        refreshToken = await AsyncStorage.getItem("refreshToken");
      }

      if (!refreshToken) throw new Error("No refresh token available");

      const response = await fetch(`${API_BASE}/api/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });

      const data = await response.json();

      if (response.ok && data.accessToken) {
        // Update states
        setToken(data.accessToken);

        // Update storage
        await SecureStore.setItemAsync("accessToken", data.accessToken);
        await AsyncStorage.setItem("currentUserToken", data.accessToken);

        if (data.refreshToken) {
          await SecureStore.setItemAsync("refreshToken", data.refreshToken);
          await AsyncStorage.setItem("refreshToken", data.refreshToken);
        }

        return data.accessToken;
      } else {
        throw new Error("Session expired");
      }
    } catch (err) {
      console.warn("Silent refresh failed:", err.message);
      await logoutUser();
      return null;
    }
  }, [logoutUser]);

  useEffect(() => {
    const loadPersistedAuth = async () => {
      try {
        const storedUser = await AsyncStorage.getItem("currentUser");
        const accessToken = await AsyncStorage.getItem("currentUserToken");
        const refreshToken = await AsyncStorage.getItem("refreshToken");

        if (storedUser && (accessToken || refreshToken)) {
          setUser(JSON.parse(storedUser));
          setToken(accessToken);

          // If we have a refresh token, validate the session immediately
          if (refreshToken) {
            await refreshSession();
          }
        }
      } catch (err) {
        console.error("Bootstrap failed", err);
      } finally {
        setLoading(false);
      }
    };
    loadPersistedAuth();
  }, [refreshSession]);
  // =========================
  // LOGIN & LOGOUT
  // =========================
  const loginUser = async ({ user, accessToken, refreshToken }) => {
    try {
      setUser(user);
      setToken(accessToken);

      // Save to AsyncStorage (for your API utilities)
      await AsyncStorage.setItem("currentUser", JSON.stringify(user));
      await AsyncStorage.setItem("currentUserToken", accessToken);

      // Save to SecureStore (for extra security)
      await SecureStore.setItemAsync("accessToken", accessToken);

      if (refreshToken) {
        await AsyncStorage.setItem("refreshToken", refreshToken);
        await SecureStore.setItemAsync("refreshToken", refreshToken);
      }
    } catch (e) {
      console.error("Login storage error", e);
    }
  };

  const logoutUser = useCallback(async () => {
    setUser(null);
    setToken(null);
    try {
      // Clear all storage
      await AsyncStorage.multiRemove([
        "currentUser",
        "currentUserToken",
        "refreshToken",
      ]);
      await SecureStore.deleteItemAsync("accessToken");
      await SecureStore.deleteItemAsync("refreshToken");
    } catch (e) {
      console.error("Logout storage error", e);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, token, loginUser, logoutUser, loading, refreshSession }}
    >
      {children}
    </AuthContext.Provider>
  );
};
