import React, { createContext, useState, useEffect } from "react";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // wait until user is loaded

  useEffect(() => {
    const loadUser = async () => {
      try {
        let savedUser = null;
        if (Platform.OS === "web") {
          savedUser = localStorage.getItem("currentUser");
        } else {
          savedUser = await AsyncStorage.getItem("currentUser");
        }

        if (savedUser) setUser(JSON.parse(savedUser));
      } catch (err) {
        console.error("Failed to load user:", err);
      }
      setLoading(false);
    };
    loadUser();
  }, []);

  const loginUser = async (userData, rememberMe = false) => {
    setUser(userData);
    try {
      if (rememberMe) {
        if (Platform.OS === "web") {
          localStorage.setItem("currentUser", JSON.stringify(userData));
        } else {
          await AsyncStorage.setItem("currentUser", JSON.stringify(userData));
        }
      } else {
        if (Platform.OS === "web") {
          localStorage.removeItem("currentUser");
        } else {
          await AsyncStorage.removeItem("currentUser");
        }
      }
    } catch (err) {
      console.error("Failed to save/remove user:", err);
    }
  };

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
    <AuthContext.Provider value={{ user, loginUser, logoutUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
