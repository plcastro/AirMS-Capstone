import React, {
  createContext,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { AppState, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  secureGetItem,
  secureSetItem,
  secureDeleteItem,
} from "../utilities/secureStorage";
import { API_BASE } from "../utilities/API_BASE";
import {
  getClientActiveAt,
  recordClientActivity,
} from "../utilities/mobileApi";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const REMEMBERED_SESSION_STARTED_AT_KEY = "rememberedSessionStartedAt";
  const MOBILE_SESSION_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
  const ACCESS_TOKEN_REFRESH_INTERVAL_MS = 60 * 60 * 1000;
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rememberMePreference, setRememberMePreference] = useState(false);
  const accessTokenRef = useRef(null);
  const refreshTokenRef = useRef(null);
  const refreshFailureLoggedRef = useRef(false);
  const lastActivityWriteRef = useRef(0);

  const markClientActivity = useCallback(async () => {
    const now = Date.now();
    if (now - lastActivityWriteRef.current < 30 * 1000) return;

    lastActivityWriteRef.current = now;
    try {
      await recordClientActivity(now);
    } catch (error) {
      console.warn(
        "Failed to record mobile activity:",
        error?.message || error,
      );
    }
  }, []);

  const clearStoredAuth = useCallback(async () => {
    await AsyncStorage.multiRemove([
      "currentUser",
      "currentUserToken",
      "refreshToken",
      "authSessionMeta",
      REMEMBERED_SESSION_STARTED_AT_KEY,
    ]);
    await secureDeleteItem("accessToken");
    await secureDeleteItem("refreshToken");
  }, []);

  const logoutUser = useCallback(
    async ({ broadcast = true } = {}) => {
      try {
        const accessToken =
          accessTokenRef.current ||
          (await AsyncStorage.getItem("currentUserToken"));
        const refreshToken =
          refreshTokenRef.current ||
          (await AsyncStorage.getItem("refreshToken")) ||
          (await secureGetItem("refreshToken"));
        let sessionMeta = {};
        try {
          const rawSessionMeta = await AsyncStorage.getItem("authSessionMeta");
          sessionMeta = rawSessionMeta ? JSON.parse(rawSessionMeta) : {};
        } catch {
          sessionMeta = {};
        }

        await fetch(`${API_BASE}/api/user/logout`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
            "x-platform": sessionMeta?.platform || "MOBILE",
            ...(sessionMeta?.base ? { "x-base": sessionMeta.base } : {}),
            ...(sessionMeta?.sessionId
              ? { "x-session-id": sessionMeta.sessionId }
              : {}),
          },
          body: JSON.stringify({
            refreshToken: refreshToken || undefined,
          }),
          credentials: "include",
        });
      } catch (error) {
        console.error("Mobile logout API error:", error);
      } finally {
        setUser(null);
        setToken(null);
        accessTokenRef.current = null;
        refreshTokenRef.current = null;
        await clearStoredAuth();
        setRememberMePreference(
          (await AsyncStorage.getItem("rememberMe")) === "true",
        );
      }
    },
    [clearStoredAuth],
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

  const getMobileSessionStartedAt = useCallback(async () => {
    const startedAt = Number(
      await AsyncStorage.getItem(REMEMBERED_SESSION_STARTED_AT_KEY),
    );
    if (Number.isFinite(startedAt)) return startedAt;

    const hasStoredAuth = Boolean(
      (await AsyncStorage.getItem("currentUser")) ||
      (await AsyncStorage.getItem("currentUserToken")) ||
      (await AsyncStorage.getItem("refreshToken")) ||
      (await secureGetItem("refreshToken")),
    );
    if (!hasStoredAuth) return null;

    const migratedStartedAt = Date.now();
    await AsyncStorage.setItem(
      REMEMBERED_SESSION_STARTED_AT_KEY,
      String(migratedStartedAt),
    );
    return migratedStartedAt;
  }, []);

  const hasMobileSessionExpired = useCallback(async () => {
    const startedAt = await getMobileSessionStartedAt();
    return !startedAt || Date.now() - startedAt > MOBILE_SESSION_WINDOW_MS;
  }, [getMobileSessionStartedAt]);

  const refreshSession = useCallback(
    async ({ logoutOnFailure = true } = {}) => {
      try {
        if (await hasMobileSessionExpired()) {
          throw new Error("Mobile session expired");
        }

        const inMemoryRefreshToken = refreshTokenRef.current;
        const asyncRefreshToken = await AsyncStorage.getItem("refreshToken");
        const secureRefreshToken = await secureGetItem("refreshToken");
        const tokenCandidates = [
          inMemoryRefreshToken,
          asyncRefreshToken,
          secureRefreshToken,
        ].filter(Boolean);
        const uniqueCandidates = [...new Set(tokenCandidates)];

        if (!uniqueCandidates.length)
          throw new Error("No refresh token available");

        const sessionMeta = await getSessionMeta();
        const clientActiveAt = await getClientActiveAt();
        let lastError = "Session expired";

        for (const refreshToken of uniqueCandidates) {
          const response = await fetch(`${API_BASE}/api/user/refresh-token`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-platform": "MOBILE",
              "x-client-active-at": String(clientActiveAt),
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
            data = {
              message: `Invalid refresh response: ${text.slice(0, 80)}`,
            };
          }

          const nextAccessToken = data?.token || data?.accessToken;
          if (response.ok && nextAccessToken) {
            const rotatedRefreshToken = data.refreshToken || refreshToken;
            setToken(nextAccessToken);
            accessTokenRef.current = nextAccessToken;
            refreshTokenRef.current = rotatedRefreshToken;

            await secureSetItem("accessToken", nextAccessToken);
            await AsyncStorage.setItem("currentUserToken", nextAccessToken);

            await secureSetItem("refreshToken", rotatedRefreshToken);
            await AsyncStorage.setItem("refreshToken", rotatedRefreshToken);
            return nextAccessToken;
          }

          lastError = data?.message || `Refresh failed (${response.status})`;
        }

        throw new Error(lastError);
      } catch (err) {
        const refreshMessage = String(err?.message || "");
        const isInvalidRefreshToken =
          refreshMessage.toLowerCase().includes("mobile session expired") ||
          refreshMessage.toLowerCase().includes("invalid refresh token") ||
          refreshMessage.toLowerCase().includes("refresh token");

        if (!refreshFailureLoggedRef.current) {
          if (isInvalidRefreshToken) {
            console.log(
              "Session refresh skipped: stored refresh token is no longer valid.",
            );
          } else {
            console.warn("Silent refresh failed:", refreshMessage);
          }
          refreshFailureLoggedRef.current = true;
        }

        // Stale/invalid refresh token should be cleared locally to stop retry loops.
        if (isInvalidRefreshToken) {
          setUser(null);
          setToken(null);
          accessTokenRef.current = null;
          refreshTokenRef.current = null;
          await clearStoredAuth();
          setRememberMePreference(
            (await AsyncStorage.getItem("rememberMe")) === "true",
          );
        } else if (logoutOnFailure) {
          await logoutUser();
        }
        return null;
      }
    },
    [clearStoredAuth, getSessionMeta, hasMobileSessionExpired, logoutUser],
  );

  useEffect(() => {
    markClientActivity();

    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        markClientActivity();
      }
    });

    return () => subscription.remove();
  }, [markClientActivity]);

  useEffect(() => {
    if (!user) return undefined;

    let cancelled = false;
    const refreshActiveSession = async () => {
      if (cancelled || AppState.currentState !== "active") return;
      await refreshSession({ logoutOnFailure: false });
    };

    const intervalId = setInterval(
      refreshActiveSession,
      ACCESS_TOKEN_REFRESH_INTERVAL_MS,
    );
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        refreshActiveSession();
      }
    });

    return () => {
      cancelled = true;
      clearInterval(intervalId);
      subscription.remove();
    };
  }, [refreshSession, user]);

  useEffect(() => {
    const loadPersistedAuth = async () => {
      try {
        const rememberedPreference = await AsyncStorage.getItem("rememberMe");
        const remembered = rememberedPreference === "true";
        setRememberMePreference(remembered);
        if (await hasMobileSessionExpired()) {
          setUser(null);
          setToken(null);
          accessTokenRef.current = null;
          refreshTokenRef.current = null;
          await clearStoredAuth();
          setRememberMePreference(remembered);
          return;
        }

        const storedUser = await AsyncStorage.getItem("currentUser");
        const accessToken = await AsyncStorage.getItem("currentUserToken");
        const persistedRefreshToken =
          (await AsyncStorage.getItem("refreshToken")) ||
          (await secureGetItem("refreshToken"));
        const parsedStoredUser = storedUser ? JSON.parse(storedUser) : null;

        const hasAuthMaterial = Boolean(accessToken || persistedRefreshToken);
        if (hasAuthMaterial && parsedStoredUser) {
          setUser(parsedStoredUser);
        } else {
          setUser(null);
        }
        if (accessToken) {
          setToken(accessToken);
          accessTokenRef.current = accessToken;
        } else {
          setToken(null);
          accessTokenRef.current = null;
        }

        refreshTokenRef.current = persistedRefreshToken;

        if (parsedStoredUser && (accessToken || persistedRefreshToken)) {
          const sessionMeta = await getSessionMeta();
          if (
            !sessionMeta?.sessionId &&
            (parsedStoredUser?.sessionId || parsedStoredUser?.base)
          ) {
            await persistSessionMeta({
              base: parsedStoredUser?.base,
              sessionId: parsedStoredUser?.sessionId,
            });
          }

          if (persistedRefreshToken) {
            await refreshSession({ logoutOnFailure: false });
          }
        }
      } catch (err) {
        console.error("Bootstrap failed", err);
      } finally {
        setLoading(false);
      }
    };
    loadPersistedAuth();
  }, [
    clearStoredAuth,
    getSessionMeta,
    hasMobileSessionExpired,
    persistSessionMeta,
    refreshSession,
  ]);

  const loginUser = async ({
    user: userData,
    accessToken,
    refreshToken,
    rememberMe = true,
  }) => {
    try {
      setUser(userData);
      setToken(accessToken);
      accessTokenRef.current = accessToken;
      setRememberMePreference(Boolean(rememberMe));

      await AsyncStorage.setItem("currentUser", JSON.stringify(userData));
      await AsyncStorage.setItem("currentUserToken", accessToken);
      await secureSetItem("accessToken", accessToken);
      await AsyncStorage.setItem("rememberMe", rememberMe ? "true" : "false");
      await AsyncStorage.setItem(
        REMEMBERED_SESSION_STARTED_AT_KEY,
        String(Date.now()),
      );
      await persistSessionMeta({
        base: userData?.base,
        sessionId: userData?.sessionId,
      });
      refreshFailureLoggedRef.current = false;

      refreshTokenRef.current = refreshToken || null;
      if (refreshToken) {
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
        typeof updater === "function"
          ? updater(prev)
          : { ...(prev || {}), ...(updater || {}) };

      AsyncStorage.setItem("currentUser", JSON.stringify(nextUser)).catch(
        (error) => {
          console.error("Failed to persist updated user:", error);
        },
      );

      return nextUser;
    });
  }, []);

  const updateRememberMePreference = async (
    rememberMe,
    { revokePersistentTokens = false } = {},
  ) => {
    const accessToken =
      token || (await AsyncStorage.getItem("currentUserToken"));
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
        ...(sessionMeta?.sessionId
          ? { "x-session-id": sessionMeta.sessionId }
          : {}),
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

    await AsyncStorage.setItem(
      REMEMBERED_SESSION_STARTED_AT_KEY,
      String(Date.now()),
    );
    await AsyncStorage.setItem("refreshToken", nextRefreshToken);
    await secureSetItem("refreshToken", nextRefreshToken);
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
        markClientActivity,
      }}
    >
      <View style={{ flex: 1 }} onTouchStart={markClientActivity}>
        {children}
      </View>
    </AuthContext.Provider>
  );
};
