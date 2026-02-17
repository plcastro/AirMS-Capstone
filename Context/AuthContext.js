import React, { createContext, useState, useEffect } from "react";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load stored user on app start
  useEffect(() => {
    const loadUser = async () => {
      try {
        let storedUser = null;

        if (Platform.OS === "web") {
          storedUser = localStorage.getItem("currentUser");
        } else {
          storedUser = await AsyncStorage.getItem("currentUser");
        }

        if (storedUser) {
          const parsed = JSON.parse(storedUser);

          const normalizedUser = {
            ...parsed,
            position: parsed.position
              ? parsed.position.trim().toLowerCase()
              : null,
            access: parsed.access ? parsed.access.trim().toLowerCase() : null,
          };

          setUser(normalizedUser);
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
  const loginUser = async (userData) => {
    const normalizedUser = {
      ...userData,
      position: userData.position
        ? userData.position.trim().toLowerCase()
        : null,
      access: userData.access ? userData.access.trim().toLowerCase() : null,
    };

    setUser(normalizedUser);

    try {
      if (Platform.OS === "web") {
        localStorage.setItem("currentUser", JSON.stringify(normalizedUser));
      } else {
        await AsyncStorage.setItem(
          "currentUser",
          JSON.stringify(normalizedUser),
        );
      }
    } catch (err) {
      console.error("Failed to store user:", err);
    }
  };

  // Logout
  const logoutUser = async () => {
    setUser(null);

    try {
      if (Platform.OS === "web") {
        localStorage.removeItem("currentUser");
      } else {
        await AsyncStorage.removeItem("currentUser");
      }
    } catch (err) {
      console.error("Failed to remove user:", err);
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
