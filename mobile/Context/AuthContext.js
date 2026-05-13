import React, { createContext, useEffect, useState } from "react";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE } from "../utilities/API_BASE";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);
  // =========================
  // CLEAR STORAGE
  // =========================
  const clearStoredAuth = async () => {
    try {
      if (Platform.OS === "web") {
        localStorage.removeItem("currentUser");
        localStorage.removeItem("currentUserToken");
      } else {
        await AsyncStorage.multiRemove([
          "currentUser",
          "currentUserToken",
          "refreshToken",
        ]);
      }
    } catch (err) {
      console.error("Clear auth failed:", err);
    }
  };

  // =========================
  // LOGOUT
  // =========================
  const logoutUser = async () => {
    setUser(null);
    await clearStoredAuth();
  };

  // =========================
  // RESTORE SESSION
  // =========================
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

        setUser(JSON.parse(storedUser));
      } catch (err) {
        console.error("Session restore failed:", err);
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
  const loginUser = async ({ user, accessToken, refreshToken }) => {
    if (!user || !accessToken) return;

    setUser(user);
    setToken(accessToken);

    try {
      if (Platform.OS === "web") {
        localStorage.setItem("currentUser", JSON.stringify(user));
        localStorage.setItem("currentUserToken", accessToken);
        if (refreshToken) localStorage.setItem("refreshToken", refreshToken);
      } else {
        await AsyncStorage.multiSet([
          ["currentUser", JSON.stringify(user)],
          ["currentUserToken", accessToken],
          ["refreshToken", refreshToken || ""],
        ]);
      }
    } catch (err) {
      console.error("Login storage failed:", err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        loginUser,
        logoutUser,
        loading,
        token,
        setToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
