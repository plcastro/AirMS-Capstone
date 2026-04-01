import React, { createContext, useState, useEffect } from "react";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const isTokenValid = (token) => {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      return payload.exp * 1000 > Date.now();
    } catch (err) {
      return false;
    }
  };

  useEffect(() => {
    const loadUser = async () => {
      try {
        const storedUser = localStorage.getItem("currentUser");
        const token = localStorage.getItem("token");

        if (storedUser && token && isTokenValid(token)) {
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
      const normalizedUser = {
        ...userData,
        jobTitle: userData.jobTitle
          ? userData.jobTitle.trim().toLowerCase()
          : null,
        access: userData.access ? userData.access.trim().toLowerCase() : null,
      };

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
      setUser(null);
      localStorage.removeItem("currentUser");
      localStorage.removeItem("token");
    } catch (err) {
      console.error("Failed to remove user:", err);
    } finally {
      setLoading(false);
    }
  };
  const getAuthHeader = () => {
    const token = localStorage.getItem("token");
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
        getAuthHeader,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
