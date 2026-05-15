import React, { createContext, useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { secureGetItem, secureSetItem, secureDeleteItem } from "../utilities/secureStorage";
import { API_BASE } from "../utilities/API_BASE";

export const AuthContext = createContext();
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

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
      await secureDeleteItem("accessToken");
      await secureDeleteItem("refreshToken");
    } catch (e) {
      console.error("Logout storage error", e);
    }
  }, []);

  const refreshSession = useCallback(async () => {
    try {
      // Prefer AsyncStorage first (most consistently updated in RN), then fallback to SecureStore.
      const asyncRefreshToken = await AsyncStorage.getItem("refreshToken");
      const secureRefreshToken = await secureGetItem("refreshToken");
      const tokenCandidates = [asyncRefreshToken, secureRefreshToken].filter(Boolean);
      const uniqueCandidates = [...new Set(tokenCandidates)];

      if (uniqueCandidates.length === 0) throw new Error("No refresh token available");

      let lastError = "Session expired";

      for (const refreshToken of uniqueCandidates) {
        const response = await fetch(`${API_BASE}/api/user/refresh-token`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-platform": "MOBILE",
          },
          body: JSON.stringify({ refreshToken }),
          credentials: "include",
        });

        const text = await response.text();
        let data;
        try {
          data = text ? JSON.parse(text) : {};
        } catch {
          data = { message: `Invalid refresh response: ${text.slice(0, 80)}` };
        }

        const nextAccessToken = data?.token || data?.accessToken;
        if (response.ok && nextAccessToken) {
          const rotatedRefreshToken = data.refreshToken || refreshToken;

          // Update state
          setToken(nextAccessToken);

          // Keep both stores synchronized
          await secureSetItem("accessToken", nextAccessToken);
          await AsyncStorage.setItem("currentUserToken", nextAccessToken);
          await secureSetItem("refreshToken", rotatedRefreshToken);
          await AsyncStorage.setItem("refreshToken", rotatedRefreshToken);

          return nextAccessToken;
        }

        lastError = data?.message || `Refresh failed (${response.status})`;
      }

      throw new Error(lastError);
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
      await secureSetItem("accessToken", accessToken);

      if (refreshToken) {
        await AsyncStorage.setItem("refreshToken", refreshToken);
        await secureSetItem("refreshToken", refreshToken);
      }
    } catch (e) {
      console.error("Login storage error", e);
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, token, loginUser, logoutUser, loading, refreshSession }}
    >
      {children}
    </AuthContext.Provider>
  );
};
