import React, {
  createContext,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { secureGetItem, secureSetItem, secureDeleteItem } from "../utilities/secureStorage";
import { API_BASE } from "../utilities/API_BASE";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rememberMePreference, setRememberMePreference] = useState(false);
  const refreshTokenRef = useRef(null);
  const refreshFailureLoggedRef = useRef(false);

  const clearStoredAuth = useCallback(async () => {
    await AsyncStorage.multiRemove([
      "currentUser",
      "currentUserToken",
      "refreshToken",
      "authSessionMeta",
      "rememberMe",
    ]);
    await secureDeleteItem("accessToken");
    await secureDeleteItem("refreshToken");
  }, []);

  const logoutUser = useCallback(
    async ({ broadcast = true } = {}) => {
      try {
        const accessToken = token || (await AsyncStorage.getItem("currentUserToken"));
        const refreshToken =
          refreshTokenRef.current ||
          (await AsyncStorage.getItem("refreshToken")) ||
          (await secureGetItem("refreshToken"));

        if (accessToken) {
          await fetch(`${API_BASE}/api/user/logout`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
              "x-platform": "MOBILE",
            },
            body: JSON.stringify({
              refreshToken: refreshToken || undefined,
            }),
          });
        }
      } catch (error) {
        console.error("Mobile logout API error:", error);
      } finally {
        setUser(null);
        setToken(null);
        refreshTokenRef.current = null;
        setRememberMePreference(false);
        await clearStoredAuth();
      }
    },
    [clearStoredAuth, token],
  );

  const persistSessionMeta = useCallback(async (sessionData = {}) => {
    const payload = {
      base: sessionData.base || "UNKNOWN",
      sessionId: sessionData.sessionId || null,
      platform: "MOBILE",
    };
    await AsyncStorage.setItem("authSessionMeta", JSON.stringify(payload));
    return payload;
  }, []);

  const getSessionMeta = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem("authSessionMeta");
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }, []);

  const refreshSession = useCallback(async () => {
    try {
      const rememberedPreference = await AsyncStorage.getItem("rememberMe");
      const remembered = rememberedPreference !== "false";
      const inMemoryRefreshToken = refreshTokenRef.current;
      const asyncRefreshToken = await AsyncStorage.getItem("refreshToken");
      const secureRefreshToken = await secureGetItem("refreshToken");
      const tokenCandidates = [
        inMemoryRefreshToken,
        asyncRefreshToken,
        secureRefreshToken,
      ].filter(Boolean);
      const uniqueCandidates = [...new Set(tokenCandidates)];

      if (!uniqueCandidates.length) throw new Error("No refresh token available");

      const sessionMeta = await getSessionMeta();
      let lastError = "Session expired";

      for (const refreshToken of uniqueCandidates) {
        const response = await fetch(`${API_BASE}/api/user/refresh-token`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-platform": "MOBILE",
            ...(sessionMeta?.base ? { "x-base": sessionMeta.base } : {}),
            ...(sessionMeta?.sessionId
              ? { "x-session-id": sessionMeta.sessionId }
              : {}),
          },
          body: JSON.stringify({ refreshToken }),
          credentials: "include",
        });

        const text = await response.text();
        let data = {};
        try {
          data = text ? JSON.parse(text) : {};
        } catch {
          data = { message: `Invalid refresh response: ${text.slice(0, 80)}` };
        }

        const nextAccessToken = data?.token || data?.accessToken;
        if (response.ok && nextAccessToken) {
          const rotatedRefreshToken = data.refreshToken || refreshToken;
          setToken(nextAccessToken);
          refreshTokenRef.current = rotatedRefreshToken;

          await secureSetItem("accessToken", nextAccessToken);
          await AsyncStorage.setItem("currentUserToken", nextAccessToken);

          if (remembered) {
            await secureSetItem("refreshToken", rotatedRefreshToken);
            await AsyncStorage.setItem("refreshToken", rotatedRefreshToken);
          } else {
            await AsyncStorage.removeItem("refreshToken");
            await secureDeleteItem("refreshToken");
          }
          return nextAccessToken;
        }

        lastError = data?.message || `Refresh failed (${response.status})`;
      }

      throw new Error(lastError);
    } catch (err) {
      const refreshMessage = String(err?.message || "");
      const isInvalidRefreshToken =
        refreshMessage.toLowerCase().includes("invalid refresh token") ||
        refreshMessage.toLowerCase().includes("refresh token");

      if (!refreshFailureLoggedRef.current) {
        if (isInvalidRefreshToken) {
          console.log("Session refresh skipped: stored refresh token is no longer valid.");
        } else {
          console.warn("Silent refresh failed:", refreshMessage);
        }
        refreshFailureLoggedRef.current = true;
      }

      // Stale/invalid refresh token should be cleared locally to stop retry loops.
      if (isInvalidRefreshToken) {
        setUser(null);
        setToken(null);
        setRememberMePreference(false);
        refreshTokenRef.current = null;
        await clearStoredAuth();
      } else {
        await logoutUser();
      }
      return null;
    }
  }, [clearStoredAuth, getSessionMeta, logoutUser]);

  useEffect(() => {
    const loadPersistedAuth = async () => {
      try {
        const rememberedPreference = await AsyncStorage.getItem("rememberMe");
        const remembered = rememberedPreference !== "false";
        setRememberMePreference(remembered);

        const storedUser = await AsyncStorage.getItem("currentUser");
        const accessToken = await AsyncStorage.getItem("currentUserToken");
        const persistedRefreshToken = remembered
          ? (await AsyncStorage.getItem("refreshToken")) ||
            (await secureGetItem("refreshToken"))
          : null;

        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
        if (accessToken) {
          setToken(accessToken);
        }

        refreshTokenRef.current = persistedRefreshToken;

        if (storedUser && (accessToken || persistedRefreshToken)) {
          if (persistedRefreshToken) {
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

  const loginUser = async ({
    user: userData,
    accessToken,
    refreshToken,
    rememberMe = true,
  }) => {
    try {
      setUser(userData);
      setToken(accessToken);
      setRememberMePreference(Boolean(rememberMe));

      await AsyncStorage.setItem("currentUser", JSON.stringify(userData));
      await AsyncStorage.setItem("currentUserToken", accessToken);
      await secureSetItem("accessToken", accessToken);
      await AsyncStorage.setItem("rememberMe", rememberMe ? "true" : "false");
      await persistSessionMeta({
        base: userData?.base,
        sessionId: userData?.sessionId,
      });
      refreshFailureLoggedRef.current = false;

      refreshTokenRef.current = refreshToken || null;
      if (refreshToken && rememberMe) {
        await AsyncStorage.setItem("refreshToken", refreshToken);
        await secureSetItem("refreshToken", refreshToken);
      } else {
        await AsyncStorage.removeItem("refreshToken");
        await secureDeleteItem("refreshToken");
      }
    } catch (e) {
      console.error("Login storage error", e);
    }
  };

  const updateUser = useCallback(async (updater) => {
    setUser((prev) => {
      const nextUser =
        typeof updater === "function" ? updater(prev) : { ...(prev || {}), ...(updater || {}) };

      AsyncStorage.setItem("currentUser", JSON.stringify(nextUser)).catch((error) => {
        console.error("Failed to persist updated user:", error);
      });

      return nextUser;
    });
  }, []);

  const updateRememberMePreference = async (
    rememberMe,
    { revokePersistentTokens = false } = {},
  ) => {
    const accessToken = token || (await AsyncStorage.getItem("currentUserToken"));
    const refreshToken =
      refreshTokenRef.current ||
      (await AsyncStorage.getItem("refreshToken")) ||
      (await secureGetItem("refreshToken"));
    if (!accessToken || !refreshToken) {
      throw new Error("No active session to update");
    }

    const sessionMeta = await getSessionMeta();
    const response = await fetch(`${API_BASE}/api/user/session-preference`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        "x-platform": "MOBILE",
        ...(sessionMeta?.base ? { "x-base": sessionMeta.base } : {}),
        ...(sessionMeta?.sessionId ? { "x-session-id": sessionMeta.sessionId } : {}),
      },
      body: JSON.stringify({
        rememberMe,
        revokePersistentTokens,
        refreshToken,
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload?.message || "Failed to update remember me");
    }

    const nextRefreshToken = payload?.refreshToken || refreshToken;
    refreshTokenRef.current = nextRefreshToken;
    setRememberMePreference(rememberMe);
    await AsyncStorage.setItem("rememberMe", rememberMe ? "true" : "false");

    if (rememberMe) {
      await AsyncStorage.setItem("refreshToken", nextRefreshToken);
      await secureSetItem("refreshToken", nextRefreshToken);
    } else {
      await AsyncStorage.removeItem("refreshToken");
      await secureDeleteItem("refreshToken");
    }
    return payload;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loginUser,
        updateUser,
        logoutUser,
        loading,
        refreshSession,
        rememberMePreference,
        updateRememberMePreference,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
