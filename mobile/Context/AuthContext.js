import React, { createContext, useState, useEffect } from "react";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

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

        if (storedUser) {
          const parsed = JSON.parse(storedUser);

          const normalizedUser = {
            ...parsed,
            jobTitle: parsed.jobTitle
              ? parsed.jobTitle.trim().toLowerCase()
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
  const loginUser = (userData) => {
    const normalizedUser = { ...userData }; // keep case
    setUser(normalizedUser); // update state immediately

    // Async storage can be async
    if (Platform.OS === "web") {
      localStorage.setItem("currentUser", JSON.stringify(normalizedUser));
    } else {
      AsyncStorage.setItem("currentUser", JSON.stringify(normalizedUser)).catch(
        console.error,
      );
    }
  };

  // Logout
  const logoutUser = async () => {
    try {
      setLoading(true);

      setUser(null);

      if (Platform.OS === "web") {
        localStorage.removeItem("currentUser");
        localStorage.removeItem("currentUserToken");
      } else {
        await AsyncStorage.removeItem("currentUser");
        await AsyncStorage.removeItem("currentUserToken");
      }
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
