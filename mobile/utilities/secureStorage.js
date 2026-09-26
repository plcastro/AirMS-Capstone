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
const WEB_SENSITIVE_KEYS = ["accessToken", "refreshToken", "rememberedPassword"];

const isSensitiveWebKey = (key = "") =>
  WEB_SENSITIVE_KEYS.includes(key) || String(key).startsWith("trustedDeviceToken");

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
  return AsyncStorage.getItem(key);
};

export const secureSetItem = async (key, value) => {
  if (isWeb && isSensitiveWebKey(key)) {
    removeWebLocalValue(key);
    return;
  }

  if (SecureStoreModule?.setItemAsync) {
    try {
      await SecureStoreModule.setItemAsync(key, value);
    } catch {}
  }
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
  await AsyncStorage.removeItem(key);
};
