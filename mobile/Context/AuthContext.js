import React, {
  createContext,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { AppState, Platform, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE } from "../utilities/API_BASE";
import {
  getClientActiveAt,
  getDeviceAuditHeaders,
  recordClientActivity,
} from "../utilities/mobileApi";
import { buildLoginLocationHeaders } from "../utilities/loginLocation";
import {
  clearLegacyWebAuthStorage,
  clearStoredAuthMaterial,
  getStoredAccessToken,
  getStoredRefreshToken,
  getStoredSessionMeta,
  getStoredUser,
  IS_WEB_AUTH_STORAGE,
  removeStoredRefreshToken,
  setStoredAccessToken,
  setStoredRefreshToken,
  setStoredSessionMeta,
  setStoredUser,
} from "../utilities/authStorage";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const REMEMBERED_SESSION_STARTED_AT_KEY = "rememberedSessionStartedAt";
  const ACCESS_TOKEN_REFRESH_INTERVAL_MS = 60 * 60 * 1000;
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rememberMePreference, setRememberMePreference] = useState(false);
  const [session, setSession] = useState(null);
  const defaultPlatform = Platform.OS === "web" ? "WEB" : "MOBILE";
  const accessTokenRef = useRef(null);
  const refreshTokenRef = useRef(null);
  const refreshPromiseRef = useRef(null);
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
    await clearStoredAuthMaterial();
    await AsyncStorage.removeItem(REMEMBERED_SESSION_STARTED_AT_KEY);
  }, []);

  const logoutUser = useCallback(
    async ({ broadcast = true } = {}) => {
      try {
        const accessToken =
          accessTokenRef.current || (await getStoredAccessToken());
        const refreshToken =
          refreshTokenRef.current || (await getStoredRefreshToken());
        let sessionMeta = {};
        try {
          const rawSessionMeta = await getStoredSessionMeta();
          sessionMeta = rawSessionMeta ? JSON.parse(rawSessionMeta) : {};
        } catch {
          sessionMeta = {};
        }

        await fetch(`${API_BASE}/api/user/logout`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
            "x-platform": sessionMeta?.platform || defaultPlatform,
            ...getDeviceAuditHeaders(),
            ...buildLoginLocationHeaders(sessionMeta?.location),
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
        setSession(null);
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
      sessionId: sessionData.sessionId || null,
      platform: sessionData.platform || defaultPlatform,
      location: sessionData.location || null,
    };
    await setStoredSessionMeta(JSON.stringify(payload));
    setSession(payload);
    return payload;
  }, []);

  const getSessionMeta = useCallback(async () => {
    try {
      const raw = await getStoredSessionMeta();
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }, []);

  const refreshSession = useCallback(
    async () => {
      if (refreshPromiseRef.current) {
        return refreshPromiseRef.current;
      }

      refreshPromiseRef.current = (async () => {
      try {
        const inMemoryRefreshToken = refreshTokenRef.current;
        const storedRefreshToken = await getStoredRefreshToken();
        const tokenCandidates = [
          inMemoryRefreshToken,
          storedRefreshToken,
        ].filter(Boolean);
        const uniqueCandidates = IS_WEB_AUTH_STORAGE
          ? [...new Set([...tokenCandidates, ""])]
          : [...new Set(tokenCandidates)];

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
              "x-platform": sessionMeta?.platform || defaultPlatform,
              "x-client-active-at": String(clientActiveAt),
              ...getDeviceAuditHeaders(),
              ...buildLoginLocationHeaders(sessionMeta?.location),
              ...(sessionMeta?.sessionId
                ? { "x-session-id": sessionMeta.sessionId }
                : {}),
            },
            body: JSON.stringify(
              refreshToken ? { refreshToken } : {},
            ),
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

            await setStoredAccessToken(nextAccessToken);

            if (rotatedRefreshToken) {
              await setStoredRefreshToken(rotatedRefreshToken);
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
          setSession(null);
          accessTokenRef.current = null;
          refreshTokenRef.current = null;
          await clearStoredAuth();
          setRememberMePreference(
            (await AsyncStorage.getItem("rememberMe")) === "true",
          );
        }
        return null;
      }
      })();

      try {
        return await refreshPromiseRef.current;
      } finally {
        refreshPromiseRef.current = null;
      }
    },
    [clearStoredAuth, getSessionMeta],
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
      await refreshSession();
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
        clearLegacyWebAuthStorage();
        const storedUser = await getStoredUser();
        const accessToken = await getStoredAccessToken();
        const persistedRefreshToken = await getStoredRefreshToken();
        const parsedStoredUser = storedUser ? JSON.parse(storedUser) : null;
        const persistedSessionMeta = await getSessionMeta();
        setSession(persistedSessionMeta?.sessionId ? persistedSessionMeta : null);

        const hasAuthMaterial = Boolean(
          accessToken || persistedRefreshToken || IS_WEB_AUTH_STORAGE,
        );
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
          const sessionMeta = persistedSessionMeta;
          if (!sessionMeta?.sessionId && parsedStoredUser?.sessionId) {
            await persistSessionMeta({
              sessionId: parsedStoredUser?.sessionId,
            });
          }

          if (persistedRefreshToken || IS_WEB_AUTH_STORAGE) {
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
  }, [
    clearStoredAuth,
    getSessionMeta,
    persistSessionMeta,
    refreshSession,
  ]);

  const loginUser = async ({
    user: userData,
    session: sessionData,
    accessToken,
    refreshToken,
    rememberMe = true,
  }) => {
    try {
      setUser(userData);
      setToken(accessToken);
      accessTokenRef.current = accessToken;
      setRememberMePreference(Boolean(rememberMe));

      await setStoredUser(JSON.stringify(userData));
      await setStoredAccessToken(accessToken);
      await AsyncStorage.setItem("rememberMe", rememberMe ? "true" : "false");
      await persistSessionMeta({
        sessionId: sessionData?.sessionId || userData?.sessionId,
        location: sessionData?.location,
      });
      refreshFailureLoggedRef.current = false;

      refreshTokenRef.current = refreshToken || null;
      if (refreshToken) {
        await setStoredRefreshToken(refreshToken);
      } else {
        await removeStoredRefreshToken();
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

      setStoredUser(JSON.stringify(nextUser)).catch(
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
      token || (await getStoredAccessToken());
    const refreshToken =
      refreshTokenRef.current || (await getStoredRefreshToken());
    if (!accessToken || !refreshToken) {
      throw new Error("No active session to update");
    }

    const sessionMeta = await getSessionMeta();
    const response = await fetch(`${API_BASE}/api/user/session-preference`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        "x-platform": sessionMeta?.platform || defaultPlatform,
        ...getDeviceAuditHeaders(),
        ...buildLoginLocationHeaders(sessionMeta?.location),
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

    await setStoredRefreshToken(nextRefreshToken);
    return payload;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
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
