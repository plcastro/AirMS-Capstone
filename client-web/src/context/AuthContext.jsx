import React, {
  createContext,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { API_BASE } from "../utils/API_BASE";
import { buildLoginLocationHeaders } from "../utils/loginLocation";
import {
  clearCurrentSessionProfile,
  setCurrentSessionProfile,
} from "../utils/sessionProfile";
import {
  cleanupUserScopedTemporaryStorage,
  removeLegacyAircraftFhBaseKeys,
} from "../utils/boundedLocalStorage";
import {
  airmStorage,
  removeLegacyClientReadableCredentials,
} from "../utils/airmsStorage";
import { trustedDeviceManager } from "../utils/trustedDeviceManager";
import { normalizeAccountRoles } from "../../../shared/accountRoles";
import {
  createIdleSession,
  SESSION_IDLE_LIMIT_MS,
} from "../../../shared/sessionIdle";

export const AuthContext = createContext();

const INACTIVITY_LIMIT_MS = SESSION_IDLE_LIMIT_MS;
const AUTH_ACTIVITY_KEY = "authActivity";
const LEGACY_ACTIVITY_KEY_PREFIX = "authActivity:";
const AUTH_ACTIVITY_MAX_RECORDS = 20;
const AUTH_ACTIVITY_RETENTION_MS = 14 * 24 * 60 * 60 * 1000;
const ACTIVITY_EVENTS = [
  "click",
  "mousedown",
  "keydown",
  "scroll",
  "wheel",
  "touchstart",
  "touchmove",
  "pointerdown",
  "pointermove",
];
const ACTIVITY_THROTTLE_MS = 1000;
const ACCESS_COOKIE_REFRESH_MS = 20 * 60 * 1000;
const SESSION_META_KEY = "authSessionMeta";
const SESSION_TIMING_KEY = "authSessionTiming";
const AUTH_SYNC_KEY = "authSyncEvent";

const getFetchUrl = (input) => {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  return input?.url || "";
};

const isAirmsApiFetch = (input) => {
  const url = getFetchUrl(input);
  if (!url) return false;
  return url.startsWith(API_BASE) || url.startsWith("/api/");
};

const parseJsonArray = (value) => {
  try {
    const parsed = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const normalizeActivityRecords = (records = []) => {
  const cutoff = Date.now() - AUTH_ACTIVITY_RETENTION_MS;
  const byId = new Map();

  records.forEach((record) => {
    const id = String(record?.id || "").trim();
    const timestamp = Number(record?.timestamp);
    if (!id || !Number.isFinite(timestamp) || timestamp < cutoff) return;
    const existing = byId.get(id);
    if (!existing || timestamp > existing.timestamp) {
      byId.set(id, { id, timestamp });
    }
  });

  return Array.from(byId.values())
    .sort((left, right) => right.timestamp - left.timestamp)
    .slice(0, AUTH_ACTIVITY_MAX_RECORDS);
};

const loadAuthActivityRecords = () =>
  normalizeActivityRecords(
    parseJsonArray(localStorage.getItem(AUTH_ACTIVITY_KEY)),
  );

const saveAuthActivityRecords = (records) => {
  const normalized = normalizeActivityRecords(records);
  const serialized = JSON.stringify(normalized);
  if (localStorage.getItem(AUTH_ACTIVITY_KEY) !== serialized) {
    localStorage.setItem(AUTH_ACTIVITY_KEY, serialized);
  }
  return normalized;
};

const cleanupLegacyAuthActivityKeys = () => {
  const migrated = loadAuthActivityRecords();
  const legacyKeys = [];

  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (!key?.startsWith(LEGACY_ACTIVITY_KEY_PREFIX)) continue;
    const id = key.slice(LEGACY_ACTIVITY_KEY_PREFIX.length);
    const timestamp = Number(localStorage.getItem(key));
    if (id && Number.isFinite(timestamp)) {
      migrated.push({ id, timestamp });
    }
    legacyKeys.push(key);
  }

  saveAuthActivityRecords(migrated);
  legacyKeys.forEach((key) => localStorage.removeItem(key));
};

export const buildStoredUserProfile = (userData = {}) => {
  const id = userData.id || userData._id || userData.userid || null;
  return {
    id,
    _id: id,
    sessionId: userData.sessionId || null,
  };
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [rememberMePreference, setRememberMePreferenceState] = useState(
    airmStorage.get("rememberMe", false) === true,
  );
  const syncChannelRef = useRef(null);
  const idleSessionRef = useRef(null);
  const tokenExpiryTimeoutRef = useRef(null);
  const refreshTokenPromiseRef = useRef(null);
  const sessionEndedRef = useRef(false);
  const lastActivityRecordedAtRef = useRef(0);
  const getAuthHeaderImplRef = useRef(null);
  const accessTokenRef = useRef(null);

  useEffect(() => {
    const originalFetch = window.fetch.bind(window);
    window.fetch = (input, init) => {
      const requestInit = init || {};
      if (!isAirmsApiFetch(input) || requestInit.credentials) {
        return originalFetch(input, init);
      }
      return originalFetch(input, { ...requestInit, credentials: "include" });
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  const getStoredToken = () => {
    removeLegacyClientReadableCredentials();
    return accessTokenRef.current;
  };

  const hasStoredSessionHint = () =>
    Boolean(
      sessionStorage.getItem("currentUser") ||
      localStorage.getItem(SESSION_META_KEY),
    );

  const normalizeUser = (profile) => {
    const userData = normalizeAccountRoles(profile);
    return {
      ...userData,
      id: userData.id || userData._id || null,
      jobTitle: userData.jobTitle
        ? userData.jobTitle.trim().toLowerCase()
        : null,
      access: userData.access ? userData.access.trim().toLowerCase() : null,
    };
  };

  const hasUserIdentity = (userData = {}) =>
    Boolean(
      String(
        userData.firstName ||
          userData.lastName ||
          userData.displayName ||
          userData.username ||
          userData.email ||
          "",
      ).trim(),
    );

  const publishAuthSync = (payload) => {
    const eventPayload = {
      ...payload,
      user: payload.user ? buildStoredUserProfile(payload.user) : undefined,
      at: Date.now(),
    };
    const storageEventPayload = {
      type: payload.type,
      rememberMe: payload.rememberMe,
      user: payload.user ? buildStoredUserProfile(payload.user) : undefined,
      at: eventPayload.at,
    };
    try {
      localStorage.setItem(AUTH_SYNC_KEY, JSON.stringify(storageEventPayload));
    } catch {
      // no-op
    }
    try {
      syncChannelRef.current?.postMessage(eventPayload);
    } catch {
      // no-op
    }
  };

  const persistSessionMeta = (meta = {}) => {
    const sessionMeta = {
      sessionId: meta.sessionId || null,
      platform: meta.platform || "WEB",
      location: meta.location || null,
    };
    localStorage.setItem(SESSION_META_KEY, JSON.stringify(sessionMeta));
    return sessionMeta;
  };

  const getSessionMeta = () => {
    try {
      return JSON.parse(localStorage.getItem(SESSION_META_KEY) || "{}");
    } catch {
      return {};
    }
  };

  const persistAuthState = (normalizedUser, token, rememberMe) => {
    const storedUser = buildStoredUserProfile(normalizedUser);
    accessTokenRef.current = token || null;
    setCurrentSessionProfile(normalizedUser);
    sessionStorage.setItem("currentUser", JSON.stringify(storedUser));
    if (rememberMe) {
      airmStorage.set("rememberMe", true);
    } else {
      airmStorage.set("rememberMe", false);
    }
    localStorage.removeItem("currentUser");
    removeLegacyClientReadableCredentials();
  };

  const clearAuthStorage = () => {
    sessionStorage.removeItem("currentUser");
    sessionStorage.removeItem(SESSION_TIMING_KEY);
    accessTokenRef.current = null;
    clearCurrentSessionProfile();
    localStorage.removeItem("currentUser");
    localStorage.removeItem(SESSION_META_KEY);
    localStorage.removeItem(SESSION_TIMING_KEY);
    removeLegacyClientReadableCredentials();
  };

  const isTokenValid = (token) => {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      return payload.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  };

  const getTokenPayload = (token) => {
    try {
      return JSON.parse(atob(token.split(".")[1]));
    } catch {
      return null;
    }
  };

  const getTokenExpiryTime = (token) => {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      return payload.exp * 1000;
    } catch {
      return null;
    }
  };
  const persistSessionTiming = (token, source = "unknown", options = {}) => {
    const { restartFullWindow = false, rememberMe = rememberMePreference } =
      options;

    const now = Date.now();
    const tokenExpiresAt = getTokenExpiryTime(token);

    const expiresAt = restartFullWindow
      ? now + INACTIVITY_LIMIT_MS
      : tokenExpiresAt || now + INACTIVITY_LIMIT_MS;

    const payload = {
      source,
      startedAt: now,
      expiresAt,
      remainingSeconds: Math.max(0, Math.floor((expiresAt - now) / 1000)),
      updatedAt: now,
    };

    sessionStorage.setItem(SESSION_TIMING_KEY, JSON.stringify(payload));

    if (rememberMe) {
      localStorage.setItem(SESSION_TIMING_KEY, JSON.stringify(payload));
    } else {
      localStorage.removeItem(SESSION_TIMING_KEY);
    }
  };

  const activityId = () => getSessionMeta().sessionId || "current";
  const readLastActivity = () => {
    const currentActivityId = activityId();
    const stored =
      loadAuthActivityRecords().find(
        (record) => record.id === currentActivityId,
      )?.timestamp || 0;
    lastActivityRecordedAtRef.current = Math.max(
      lastActivityRecordedAtRef.current,
      stored,
    );
    return lastActivityRecordedAtRef.current;
  };
  const saveActivity = (timestamp) => {
    lastActivityRecordedAtRef.current = timestamp;
    saveAuthActivityRecords([
      { id: activityId(), timestamp },
      ...loadAuthActivityRecords(),
    ]);
  };
  const removeCurrentActivity = () => {
    const currentActivityId = activityId();
    saveAuthActivityRecords(
      loadAuthActivityRecords().filter(
        (record) => record.id !== currentActivityId,
      ),
    );
  };
  const clearInactivityTimers = () => {
    idleSessionRef.current?.stop();
    idleSessionRef.current = null;
  };

  const clearTokenExpiryTimer = () => {
    clearTimeout(tokenExpiryTimeoutRef.current);
    tokenExpiryTimeoutRef.current = null;
  };

  const scheduleCookieRefresh = () => {
    clearTokenExpiryTimer();
    tokenExpiryTimeoutRef.current = setTimeout(() => {
      refreshAccessToken()
        .then(() => {
          if (!sessionEndedRef.current) scheduleCookieRefresh();
        })
        .catch((err) => {
          console.error("Cookie session refresh failed:", err);
          forceLogoutOnce(true);
        });
    }, ACCESS_COOKIE_REFRESH_MS);
  };

  const scheduleTokenExpiryLogout = (token, onExpire) => {
    clearTokenExpiryTimer();
    const expiryAt = getTokenExpiryTime(token);
    if (!expiryAt) return onExpire();
    const msRemaining = expiryAt - Date.now();
    if (msRemaining <= 0) return onExpire();
    tokenExpiryTimeoutRef.current = setTimeout(onExpire, msRemaining);
  };

  const forceLogoutOnce = (broadcast = true) => {
    if (sessionEndedRef.current) return;
    sessionEndedRef.current = true;
    const currentUserId = user?.id || user?._id;
    removeCurrentActivity();
    cleanupUserScopedTemporaryStorage(currentUserId);
    clearInactivityTimers();
    clearTokenExpiryTimer();
    setUser(null);
    clearCurrentSessionProfile();
    clearAuthStorage();
    setRememberMePreferenceState(airmStorage.get("rememberMe", false) === true);
    if (broadcast) {
      publishAuthSync({ type: "LOGOUT" });
    }
  };
  const recordActivity = () => {
    if (sessionEndedRef.current) return;

    const now = Date.now();
    const last = readLastActivity();

    if (now - last < ACTIVITY_THROTTLE_MS) {
      return;
    }

    // Always record real user activity.
    saveActivity(now);

    // Only notify the idle-session manager when
    // frontend inactivity enforcement is enabled.
    if (idleSessionRef.current) {
      idleSessionRef.current.check();
    }
  };

  const buildSessionHeaders = () => {
    const sessionMeta = getSessionMeta();
    const lastClientActivityAt = readLastActivity();
    console.log(
      "[AUTH ACTIVITY]",
      new Date(lastClientActivityAt).toISOString(),
      "age:",
      Math.round((Date.now() - lastClientActivityAt) / 1000),
      "seconds",
    );
    return {
      "x-platform": sessionMeta.platform || "WEB",
      ...buildLoginLocationHeaders(sessionMeta.location),
      ...(sessionMeta.sessionId
        ? { "x-session-id": sessionMeta.sessionId }
        : {}),
      ...(lastClientActivityAt
        ? { "x-client-active-at": String(lastClientActivityAt) }
        : {}),
    };
  };

  const refreshAccessToken = async () => {
    if (sessionEndedRef.current) return null;
    if (
      !rememberMePreference &&
      readLastActivity() &&
      Date.now() - readLastActivity() >= INACTIVITY_LIMIT_MS
    ) {
      forceLogoutOnce(true);
      return null;
    }

    if (refreshTokenPromiseRef.current) {
      return refreshTokenPromiseRef.current;
    }

    refreshTokenPromiseRef.current = (async () => {
      const response = await fetch(`${API_BASE}/api/user/refresh-token`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...buildSessionHeaders(),
        },
      });
      const text = await response.text();
      let data = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        throw new Error("Failed to refresh token (invalid response)");
      }

      if (!response.ok) {
        const backendMessage = String(data?.message || "");
        if (
          response.status === 401 ||
          response.status === 403 ||
          backendMessage.toLowerCase().includes("session is no longer active")
        ) {
          forceLogoutOnce(true);
        }
        throw new Error(data?.message || "Failed to refresh token");
      }

      if (!data.token && !data.user) {
        throw new Error("No authenticated session received");
      }

      if (sessionEndedRef.current) {
        throw new Error("Session already ended");
      }

      if (data.user) {
        const normalizedUser = normalizeUser(data.user);
        setUser(normalizedUser);
        setCurrentSessionProfile(normalizedUser);
        const storedUser = buildStoredUserProfile(normalizedUser);
        sessionStorage.setItem("currentUser", JSON.stringify(storedUser));
        localStorage.removeItem("currentUser");
      }
      accessTokenRef.current = data.token || null;
      removeLegacyClientReadableCredentials();
      if (data.token) {
        persistSessionTiming(data.token, "refresh");
      }
      publishAuthSync({
        type: "TOKEN_REFRESH",
        user: data.user,
      });
      if (data.token) {
        scheduleTokenExpiryLogout(data.token, handleAccessTokenExpired);
      } else {
        scheduleCookieRefresh();
      }
      return data.token || null;
    })();

    try {
      return await refreshTokenPromiseRef.current;
    } finally {
      refreshTokenPromiseRef.current = null;
    }
  };

  const logoutUser = async (options = {}) => {
    const { broadcast = true } = options;
    const sessionHeaders = buildSessionHeaders();
    const currentUserId = user?.id || user?._id;
    try {
      sessionEndedRef.current = true;
      removeCurrentActivity();
      cleanupUserScopedTemporaryStorage(currentUserId);
      clearInactivityTimers();
      clearTokenExpiryTimer();
      setUser(null);
      clearCurrentSessionProfile();
      clearAuthStorage();
      setRememberMePreferenceState(
        airmStorage.get("rememberMe", false) === true,
      );
      if (broadcast) {
        publishAuthSync({ type: "LOGOUT" });
      }

      await fetch(`${API_BASE}/api/user/logout`, {
        method: "POST",
        headers: {
          ...sessionHeaders,
        },
        credentials: "include",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAccessTokenExpired = () => {
    if (sessionEndedRef.current) return;
    refreshAccessToken().catch((err) => {
      console.error("Token refresh on expiry failed:", err);
      forceLogoutOnce(true);
    });
  };

  const getValidToken = async () => {
    if (sessionEndedRef.current) return null;
    if (
      readLastActivity() &&
      Date.now() - readLastActivity() >= INACTIVITY_LIMIT_MS
    ) {
      forceLogoutOnce(true);
      return null;
    }
    const token = getStoredToken();
    if (token && isTokenValid(token)) {
      scheduleTokenExpiryLogout(token, handleAccessTokenExpired);
      return token;
    }
    return await refreshAccessToken();
  };

  // Keep the public function stable so auth UI updates do not restart data-fetch effects.
  useLayoutEffect(() => {
    getAuthHeaderImplRef.current = async () => {
      const token = accessTokenRef.current;
      return {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...buildSessionHeaders(),
      };
    };
  });

  const getAuthHeader = useCallback(() => getAuthHeaderImplRef.current(), []);

  const loginUser = async (userData, token, options = {}) => {
    sessionEndedRef.current = false;
    lastActivityRecordedAtRef.current = Date.now();
    const rememberMe = Boolean(options.rememberMe);
    const normalized = normalizeUser({
      ...userData,
      isOnline: true,
      online: true,
      platform: "web",
      sessionId: options.sessionId || userData.sessionId,
    });
    setUser(normalized);
    setCurrentSessionProfile(normalized);
    setRememberMePreferenceState(rememberMe);
    persistSessionMeta({
      sessionId: normalized.sessionId,
      platform: "WEB",
      location: options.location || null,
    });
    saveActivity(Date.now());
    persistAuthState(normalized, token, rememberMe);
    if (token) {
      persistSessionTiming(token, "login", {
        rememberMe,
      });

      scheduleTokenExpiryLogout(token, handleAccessTokenExpired);
    } else {
      persistSessionTiming(null, "login", {
        rememberMe,
      });

      scheduleCookieRefresh();
    }
    publishAuthSync({
      type: "LOGIN",
      user: normalized,
      rememberMe,
    });
  };

  const updateRememberMePreference = async (
    rememberMe,
    { revokePersistentTokens = false } = {},
  ) => {
    const sessionMeta = getSessionMeta();
    const response = await fetch(`${API_BASE}/api/user/session-preference`, {
      method: "PUT",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(accessTokenRef.current
          ? { Authorization: `Bearer ${accessTokenRef.current}` }
          : {}),
        ...(sessionMeta?.sessionId
          ? { "x-session-id": sessionMeta.sessionId }
          : {}),
        ...buildLoginLocationHeaders(sessionMeta.location),
        "x-platform": "WEB",
      },
      body: JSON.stringify({ rememberMe, revokePersistentTokens }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(
        payload?.message || "Failed to update session preference",
      );
    }

    if (rememberMe) {
      airmStorage.set("rememberMe", true);
      localStorage.setItem(
        SESSION_TIMING_KEY,
        sessionStorage.getItem(SESSION_TIMING_KEY) || "",
      );
    } else {
      airmStorage.set("rememberMe", false);
      localStorage.removeItem("currentUser");
      localStorage.removeItem(SESSION_TIMING_KEY);
    }
    localStorage.removeItem("currentUser");
    removeLegacyClientReadableCredentials();
    const tokenToKeep = accessTokenRef.current;
    if (tokenToKeep) persistSessionTiming(tokenToKeep, "remember-me-update");
    setRememberMePreferenceState(rememberMe);
    publishAuthSync({ type: "REMEMBER_ME_UPDATED", rememberMe });
    return payload;
  };

  useEffect(() => {
    if (typeof BroadcastChannel !== "undefined") {
      syncChannelRef.current = new BroadcastChannel("airms-auth-sync");
      syncChannelRef.current.onmessage = (event) => {
        const payload = event?.data || {};
        if (payload.type === "LOGOUT") {
          sessionEndedRef.current = true;
          setUser(null);
          clearCurrentSessionProfile();
          clearAuthStorage();
          setRememberMePreferenceState(
            airmStorage.get("rememberMe", false) === true,
          );
        }
        if (payload.type === "TOKEN_REFRESH") {
          if (sessionEndedRef.current) return;
          if (payload.user && hasUserIdentity(payload.user)) {
            const normalizedUser = normalizeUser(payload.user);
            setUser(normalizedUser);
            setCurrentSessionProfile(normalizedUser);
            sessionStorage.setItem(
              "currentUser",
              JSON.stringify(buildStoredUserProfile(normalizedUser)),
            );
          }
          localStorage.removeItem("currentUser");
          void refreshAccessToken().catch((error) => {
            console.error("Cross-tab token refresh failed:", error);
          });
        }
      };
    }

    const onStorage = (event) => {
      if (event.key !== AUTH_SYNC_KEY || !event.newValue) return;
      try {
        const payload = JSON.parse(event.newValue);
        if (payload.type === "LOGOUT") {
          sessionEndedRef.current = true;
          setUser(null);
          clearCurrentSessionProfile();
          clearAuthStorage();
          setRememberMePreferenceState(
            airmStorage.get("rememberMe", false) === true,
          );
          return;
        }
        if (payload.type === "LOGIN") {
          sessionEndedRef.current = false;
          setRememberMePreferenceState(Boolean(payload.rememberMe));
          refreshAccessToken().catch((error) => {
            console.error("Cross-tab session refresh failed:", error);
          });
          return;
        }
        if (payload.type === "REMEMBER_ME_UPDATED") {
          setRememberMePreferenceState(Boolean(payload.rememberMe));
        }
      } catch {
        // no-op
      }
    };

    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("storage", onStorage);
      syncChannelRef.current?.close();
      syncChannelRef.current = null;
    };
  }, [rememberMePreference]);

  useEffect(() => {
    const loadUser = async () => {
      try {
        cleanupLegacyAuthActivityKeys();
        removeLegacyAircraftFhBaseKeys();
        trustedDeviceManager.migrateLegacyLocalStorage();
        removeLegacyClientReadableCredentials();
        const remembered = airmStorage.get("rememberMe", false) === true;
        setRememberMePreferenceState(remembered);

        if (!hasStoredSessionHint()) return;
        lastActivityRecordedAtRef.current = readLastActivity();
        if (
          !remembered &&
          lastActivityRecordedAtRef.current &&
          Date.now() - lastActivityRecordedAtRef.current >= INACTIVITY_LIMIT_MS
        ) {
          void logoutUser().catch((error) =>
            console.error("Idle logout failed:", error),
          );
          return;
        }
        if (!lastActivityRecordedAtRef.current) saveActivity(Date.now());
        let storedUser =
          sessionStorage.getItem("currentUser") ||
          localStorage.getItem("currentUser");
        if (storedUser) {
          try {
            storedUser = JSON.stringify(
              buildStoredUserProfile(JSON.parse(storedUser)),
            );
            sessionStorage.setItem("currentUser", storedUser);
          } catch {
            storedUser = null;
            sessionStorage.removeItem("currentUser");
          }
        }
        localStorage.removeItem("currentUser");
        let token = getStoredToken();

        if (!storedUser && token) {
          token = await refreshAccessToken();
          if (sessionEndedRef.current) return;
          if (token) return;
        }

        const parsedUser = storedUser
          ? buildStoredUserProfile(JSON.parse(storedUser))
          : null;
        if (
          token &&
          isTokenValid(token) &&
          parsedUser &&
          !hasUserIdentity(parsedUser)
        ) {
          token = await refreshAccessToken();
          if (sessionEndedRef.current || !token) return;
          return;
        }
        const refreshedUser = storedUser
          ? buildStoredUserProfile(JSON.parse(storedUser))
          : parsedUser;
        if (token && isTokenValid(token) && refreshedUser) {
          if (sessionEndedRef.current) return;
          const normalizedUser = normalizeUser(refreshedUser);
          lastActivityRecordedAtRef.current = Date.now();
          setUser(normalizedUser);
          setCurrentSessionProfile(normalizedUser);
          persistAuthState(normalizedUser, token, remembered);
          persistSessionTiming(token, "restore", { restartFullWindow: true });
          scheduleTokenExpiryLogout(token, handleAccessTokenExpired);
          return;
        }

        if (!hasStoredSessionHint()) {
          return;
        }

        token = await refreshAccessToken();
        if (sessionEndedRef.current || !token) return;
        const payload = getTokenPayload(token);
        const normalizedFromToken =
          parsedUser ||
          (payload?.id
            ? {
                id: payload.id,
                jobTitle: payload.jobTitle,
                access: payload.access,
                sessionId: payload.sessionId,
              }
            : null);

        setUser(
          normalizedFromToken ? normalizeUser(normalizedFromToken) : null,
        );
        if (normalizedFromToken) {
          setCurrentSessionProfile(normalizeUser(normalizedFromToken));
          lastActivityRecordedAtRef.current = Date.now();
          persistAuthState(
            normalizeUser(normalizedFromToken),
            token,
            remembered,
          );
        }
        persistSessionTiming(token, "restore-refresh", {
          restartFullWindow: true,
        });
        scheduleTokenExpiryLogout(token, handleAccessTokenExpired);
      } catch (err) {
        console.error("Auth load error:", err);
        clearAuthStorage();
        setUser(null);
        clearCurrentSessionProfile();
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  const activeSessionId = user ? user.sessionId || user.id || user._id : null;
  useEffect(() => {
    if (!activeSessionId) {
      clearInactivityTimers();
      return undefined;
    }

    // Always listen for user activity.
    // Remember Me should not disable activity tracking.
    ACTIVITY_EVENTS.forEach((eventName) =>
      window.addEventListener(eventName, recordActivity, true),
    );

    const syncActivity = (event) => {
      if (event.key === AUTH_ACTIVITY_KEY) {
        idleSessionRef.current?.check();
      }
    };

    const checkVisibility = () => {
      if (!document.hidden) {
        idleSessionRef.current?.check();
      }
    };

    document.addEventListener("visibilitychange", checkVisibility);
    window.addEventListener("focus", checkVisibility);
    window.addEventListener("storage", syncActivity);

    // Only enforce the frontend inactivity timeout
    // when Remember Me is disabled.
    if (!rememberMePreference) {
      const idle = createIdleSession({
        getLastActivity: readLastActivity,

        onActivity: (timestamp) => {
          saveActivity(timestamp);
        },

        onWarning: (_minutes, warning) => {
          void (async () => {
            const headers = await getAuthHeader();

            if (sessionEndedRef.current) return;

            const response = await fetch(
              API_BASE + "/api/notifications/session-warning",
              {
                method: "POST",
                credentials: "include",
                headers: {
                  ...headers,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(warning),
              },
            );

            if (!response.ok) {
              throw new Error("Failed to create session notification");
            }
          })().catch((error) =>
            console.error("Session notification failed:", error),
          );
        },

        onExpire: () => {
          logoutUser().catch((error) =>
            console.error("Idle logout failed:", error),
          );
        },
      });

      idleSessionRef.current = idle;
      idle.check();
    } else {
      // Remember Me:
      // activity is still recorded, but no frontend idle-expiration timer.
      idleSessionRef.current = null;
    }

    return () => {
      ACTIVITY_EVENTS.forEach((eventName) =>
        window.removeEventListener(eventName, recordActivity, true),
      );

      document.removeEventListener("visibilitychange", checkVisibility);
      window.removeEventListener("focus", checkVisibility);
      window.removeEventListener("storage", syncActivity);

      clearInactivityTimers();
    };
  }, [activeSessionId, rememberMePreference]);

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
        token: null,
        rememberMePreference,
        updateRememberMePreference,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
