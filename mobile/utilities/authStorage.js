import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import {
  secureDeleteItem,
  secureGetItem,
  secureSetItem,
} from "./secureStorage";

const isWeb = Platform.OS === "web";

export const IS_WEB_AUTH_STORAGE = isWeb;

export const AUTH_KEYS = {
  user: "currentUser",
  accessToken: "currentUserToken",
  refreshToken: "refreshToken",
  sessionMeta: "authSessionMeta",
};

let memoryAccessToken = null;
let memoryUser = null;
const originalAsyncGetItem = AsyncStorage.getItem.bind(AsyncStorage);
const originalAsyncSetItem = AsyncStorage.setItem.bind(AsyncStorage);
const originalAsyncRemoveItem = AsyncStorage.removeItem.bind(AsyncStorage);
const originalAsyncMultiRemove = AsyncStorage.multiRemove?.bind(AsyncStorage);

const getWebSession = () => {
  if (!isWeb || typeof window === "undefined") return null;
  return window.sessionStorage || null;
};

const removeLegacyLocalValue = (key) => {
  if (!isWeb || typeof window === "undefined") return;
  try {
    window.localStorage?.removeItem(key);
  } catch {}
};

const getWebValue = (key) => {
  try {
    return getWebSession()?.getItem(key) || null;
  } catch {
    return null;
  }
};

const setWebValue = (key, value) => {
  try {
    getWebSession()?.setItem(key, value);
    removeLegacyLocalValue(key);
  } catch {}
};

const removeWebValue = (key) => {
  try {
    getWebSession()?.removeItem(key);
    removeLegacyLocalValue(key);
  } catch {}
};

export const clearLegacyWebAuthStorage = () => {
  if (!isWeb) return;
  Object.values(AUTH_KEYS).forEach(removeLegacyLocalValue);
  removeLegacyLocalValue("accessToken");
  removeLegacyLocalValue("rememberedPassword");
  removeLegacyLocalValue("trustedDeviceToken");
  if (typeof window === "undefined") return;
  try {
    Object.keys(window.localStorage || {})
      .filter((key) => key.startsWith("trustedDeviceToken:"))
      .forEach(removeLegacyLocalValue);
  } catch {}
};

export const getStoredAccessToken = async () => {
  if (isWeb) {
    removeWebValue(AUTH_KEYS.accessToken);
    return memoryAccessToken;
  }
  return AsyncStorage.getItem(AUTH_KEYS.accessToken);
};

export const setStoredAccessToken = async (token) => {
  if (isWeb) {
    memoryAccessToken = token || null;
    removeWebValue(AUTH_KEYS.accessToken);
    return;
  }
  await AsyncStorage.setItem(AUTH_KEYS.accessToken, token);
};

export const removeStoredAccessToken = async () => {
  memoryAccessToken = null;
  if (isWeb) {
    removeWebValue(AUTH_KEYS.accessToken);
    return;
  }
  await AsyncStorage.removeItem(AUTH_KEYS.accessToken);
};

export const getStoredUser = async () => {
  if (isWeb) {
    return memoryUser || getWebValue(AUTH_KEYS.user);
  }
  return AsyncStorage.getItem(AUTH_KEYS.user);
};

export const setStoredUser = async (userJson) => {
  if (isWeb) {
    memoryUser = userJson || null;
    if (userJson) setWebValue(AUTH_KEYS.user, userJson);
    else removeWebValue(AUTH_KEYS.user);
    return;
  }
  await AsyncStorage.setItem(AUTH_KEYS.user, userJson);
};

export const removeStoredUser = async () => {
  memoryUser = null;
  if (isWeb) {
    removeWebValue(AUTH_KEYS.user);
    return;
  }
  await AsyncStorage.removeItem(AUTH_KEYS.user);
};

export const getStoredRefreshToken = async () => {
  if (isWeb) return null;
  return (
    (await AsyncStorage.getItem(AUTH_KEYS.refreshToken)) ||
    (await secureGetItem(AUTH_KEYS.refreshToken))
  );
};

export const setStoredRefreshToken = async (token) => {
  if (isWeb) {
    removeWebValue(AUTH_KEYS.refreshToken);
    return;
  }
  await AsyncStorage.setItem(AUTH_KEYS.refreshToken, token);
  await secureSetItem(AUTH_KEYS.refreshToken, token);
};

export const removeStoredRefreshToken = async () => {
  if (isWeb) {
    removeWebValue(AUTH_KEYS.refreshToken);
    return;
  }
  await AsyncStorage.removeItem(AUTH_KEYS.refreshToken);
  await secureDeleteItem(AUTH_KEYS.refreshToken);
};

export const getStoredSessionMeta = async () => {
  if (isWeb) return getWebValue(AUTH_KEYS.sessionMeta);
  return AsyncStorage.getItem(AUTH_KEYS.sessionMeta);
};

export const setStoredSessionMeta = async (value) => {
  if (isWeb) {
    setWebValue(AUTH_KEYS.sessionMeta, value);
    return;
  }
  await AsyncStorage.setItem(AUTH_KEYS.sessionMeta, value);
};

export const removeStoredSessionMeta = async () => {
  if (isWeb) {
    removeWebValue(AUTH_KEYS.sessionMeta);
    return;
  }
  await AsyncStorage.removeItem(AUTH_KEYS.sessionMeta);
};

export const clearStoredAuthMaterial = async () => {
  await Promise.all([
    removeStoredUser(),
    removeStoredAccessToken(),
    removeStoredRefreshToken(),
    removeStoredSessionMeta(),
  ]);
};

if (isWeb) {
  const isAuthKey = (key) => Object.values(AUTH_KEYS).includes(key);

  AsyncStorage.getItem = async (key, ...args) => {
    if (!isAuthKey(key)) return originalAsyncGetItem(key, ...args);
    if (key === AUTH_KEYS.accessToken) return getStoredAccessToken();
    if (key === AUTH_KEYS.user) return getStoredUser();
    if (key === AUTH_KEYS.refreshToken) return null;
    if (key === AUTH_KEYS.sessionMeta) return getStoredSessionMeta();
    return null;
  };

  AsyncStorage.setItem = async (key, value, ...args) => {
    if (!isAuthKey(key)) return originalAsyncSetItem(key, value, ...args);
    if (key === AUTH_KEYS.accessToken) return setStoredAccessToken(value);
    if (key === AUTH_KEYS.user) return setStoredUser(value);
    if (key === AUTH_KEYS.refreshToken) return removeStoredRefreshToken();
    if (key === AUTH_KEYS.sessionMeta) return setStoredSessionMeta(value);
    return undefined;
  };

  AsyncStorage.removeItem = async (key, ...args) => {
    if (!isAuthKey(key)) return originalAsyncRemoveItem(key, ...args);
    if (key === AUTH_KEYS.accessToken) return removeStoredAccessToken();
    if (key === AUTH_KEYS.user) return removeStoredUser();
    if (key === AUTH_KEYS.refreshToken) return removeStoredRefreshToken();
    if (key === AUTH_KEYS.sessionMeta) return removeStoredSessionMeta();
    return undefined;
  };

  if (originalAsyncMultiRemove) {
    AsyncStorage.multiRemove = async (keys = [], ...args) => {
      const authKeys = keys.filter(isAuthKey);
      const otherKeys = keys.filter((key) => !isAuthKey(key));
      await Promise.all(authKeys.map((key) => AsyncStorage.removeItem(key)));
      if (otherKeys.length) return originalAsyncMultiRemove(otherKeys, ...args);
      return undefined;
    };
  }
}
