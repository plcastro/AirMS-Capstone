import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

let SecureStoreModule = null;
try {
  // Optional at runtime: prevents hard crash when native module is missing in a stale build.
  // eslint-disable-next-line global-require
  SecureStoreModule = require("expo-secure-store");
} catch (error) {
  SecureStoreModule = null;
}

const isWeb = Platform.OS === "web";
const KEYCHAIN_OPTIONS = SecureStoreModule?.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY
  ? { keychainAccessible: SecureStoreModule.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY }
  : undefined;
const SENSITIVE_KEYS = [
  "accessToken",
  "currentUserToken",
  "refreshToken",
  "rememberedPassword",
];

const isSensitiveWebKey = (key = "") =>
  SENSITIVE_KEYS.includes(key) || String(key).startsWith("trustedDeviceToken");

const removeWebLocalValue = (key) => {
  if (!isWeb || typeof window === "undefined") return;
  try {
    window.localStorage?.removeItem(key);
  } catch {}
};

export const secureGetItem = async (key) => {
  if (isWeb && isSensitiveWebKey(key)) {
    removeWebLocalValue(key);
    return null;
  }

  if (SecureStoreModule?.getItemAsync) {
    try {
      const value = await SecureStoreModule.getItemAsync(key);
      if (value !== null && value !== undefined) return value;
    } catch {}
  }
  if (isSensitiveWebKey(key)) return null;
  return AsyncStorage.getItem(key);
};

export const secureSetItem = async (key, value) => {
  if (isWeb && isSensitiveWebKey(key)) {
    removeWebLocalValue(key);
    return;
  }

  if (SecureStoreModule?.setItemAsync) {
    try {
      // iOS keeps an item's original accessibility on update, so delete first to
      // move older WHEN_UNLOCKED entries to AFTER_FIRST_UNLOCK. That lets
      // background launches on a locked phone read the session instead of
      // starting signed out.
      await SecureStoreModule.deleteItemAsync?.(key).catch(() => {});
      await SecureStoreModule.setItemAsync(key, value, KEYCHAIN_OPTIONS);
    } catch (error) {
      console.warn(`Secure storage write failed for ${key}:`, error?.message);
    }
  }
  if (isSensitiveWebKey(key)) return;
  await AsyncStorage.setItem(key, value);
};

export const secureDeleteItem = async (key) => {
  if (isWeb) {
    removeWebLocalValue(key);
  }

  if (SecureStoreModule?.deleteItemAsync) {
    try {
      await SecureStoreModule.deleteItemAsync(key);
    } catch {}
  }
  if (isSensitiveWebKey(key)) return;
  await AsyncStorage.removeItem(key);
};
