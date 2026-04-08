import React, { createContext, useState, useEffect } from "react";
import { API_BASE } from "../utils/API_BASE";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const normalizeUser = (userData) => ({
    ...userData,
    jobTitle: userData.jobTitle ? userData.jobTitle.trim().toLowerCase() : null,
    access: userData.access ? userData.access.trim().toLowerCase() : null,
  });

  const isTokenValid = (token) => {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      return payload.exp * 1000 > Date.now();
    } catch (err) {
      return false;
    }
  };

  const clearAuthStorage = () => {
    localStorage.removeItem("currentUser");
    localStorage.removeItem("token");
  };

  const refreshAccessToken = async () => {
    const response = await fetch(`${API_BASE}/api/user/refresh-token`, {
      method: "POST",
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("Failed to refresh token");
    }

    const data = await response.json();
    if (!data.token) {
      throw new Error("No refreshed token received");
    }

    localStorage.setItem("token", data.token);
    return data.token;
  };

  useEffect(() => {
    const loadUser = async () => {
      try {
        const storedUser = localStorage.getItem("currentUser");
        const token = localStorage.getItem("token");

        if (!storedUser) {
          setUser(null);
          return;
        }

        const parsed = JSON.parse(storedUser);

        if (token && isTokenValid(token)) {
          setUser(normalizeUser(parsed));
          return;
        }

        try {
          await refreshAccessToken();
          setUser(normalizeUser(parsed));
        } catch (refreshError) {
          clearAuthStorage();
          setUser(null);
        }
      } catch (err) {
        console.error("Failed to load user:", err);
        clearAuthStorage();
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  // Login
  const loginUser = async (userData, token) => {
    try {
      setLoading(true);

      if (!token) {
        console.error("No token provided");
        return;
      }
      const normalizedUser = normalizeUser(userData);

      setUser(normalizedUser);

      localStorage.setItem("currentUser", JSON.stringify(normalizedUser));
      localStorage.setItem("token", token);
    } catch (err) {
      console.error("Failed to store user:", err);
    } finally {
      setLoading(false);
    }
  };

  // Logout
  const logoutUser = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      if (token) {
        await fetch(`${API_BASE}/api/user/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          credentials: "include",
        });
      }

      setUser(null);
      clearAuthStorage();
    } catch (err) {
      console.error("Failed to remove user:", err);
    } finally {
      setLoading(false);
    }
  };

  const getValidToken = async () => {
    const token = localStorage.getItem("token");

    if (token && isTokenValid(token)) {
      return token;
    }

    return refreshAccessToken();
  };

  const getAuthHeader = async () => {
    const token = await getValidToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  };
  if (loading) return null;
  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        loginUser,
        logoutUser,
        getValidToken,
        refreshAccessToken,
        getAuthHeader,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
