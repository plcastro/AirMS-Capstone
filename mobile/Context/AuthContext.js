import React, { createContext, useState, useEffect } from "react";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    const loadUser = async () => {
      try {
        let storedUser = null;
        let storedToken = null;

        if (Platform.OS === "web") {
          storedUser = localStorage.getItem("currentUser");
          storedToken = localStorage.getItem("currentUserToken");
        } else {
          storedUser = await AsyncStorage.getItem("currentUser");
          storedToken = await AsyncStorage.getItem("currentUserToken");
        }

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
      } catch (err) {
        console.error("Failed to load user:", err);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

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
      ]).catch(console.error);
    }
  };

  // Logout
  const logoutUser = async () => {
    try {
      setLoading(true);

      setUser(null);

      await clearStoredAuth();
    } catch (err) {
      console.error("Failed to remove user:", err);
    } finally {
      setLoading(false);
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
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
