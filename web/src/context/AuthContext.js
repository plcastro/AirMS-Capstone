import React, { createContext, useState, useEffect } from "react";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        let storedUser = null;

        storedUser = localStorage.getItem("currentUser");

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
    try {
      setLoading(true);
      const normalizedUser = {
        ...userData,
        position: userData.position
          ? userData.position.trim().toLowerCase()
          : null,
        access: userData.access ? userData.access.trim().toLowerCase() : null,
      };

      setUser(normalizedUser);

      localStorage.setItem("currentUser", JSON.stringify(normalizedUser));
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
