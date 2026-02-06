// Context/AuthContext.jsx
import React, { createContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  // Load user from storage on app start
  useEffect(() => {
    const loadUser = async () => {
      try {
        const savedUser = await AsyncStorage.getItem("currentUser");
        if (savedUser) {
          setUser(JSON.parse(savedUser));
        }
      } catch (err) {
        console.error("Failed to load user from storage:", err);
      }
    };
    loadUser();
  }, []);

  const loginUser = async (userData, rememberMe = false) => {
    setUser(userData);
    try {
      if (rememberMe) {
        await AsyncStorage.setItem("currentUser", JSON.stringify(userData));
      } else {
        await AsyncStorage.removeItem("currentUser");
      }
    } catch (err) {
      console.error("Failed to save/remove user:", err);
    }
  };

  const logoutUser = async () => {
    setUser(null);
    try {
      await AsyncStorage.removeItem("currentUser");
    } catch (err) {
      console.error("Failed to remove user:", err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loginUser, logoutUser }}>
      {children}
    </AuthContext.Provider>
  );
};
