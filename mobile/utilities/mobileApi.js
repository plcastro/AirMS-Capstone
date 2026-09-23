import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

export const CLIENT_ACTIVE_AT_KEY = "clientActiveAt";

const readPlatformConstant = (...keys) => {
  for (const key of keys) {
    const value = Platform.constants?.[key];
    if (value !== null && value !== undefined && String(value).trim()) {
      return String(value).trim();
    }
  }
  return "";
};

export const getDeviceAuditHeaders = () => {
  if (Platform.OS === "web") {
    return {
      "x-device-platform": "WEB",
      "x-device-model": "Browser",
    };
  }

  const platformLabel =
    Platform.OS === "ios"
      ? "MOBILE_IOS"
      : Platform.OS === "android"
        ? "MOBILE_ANDROID"
        : `MOBILE_${String(Platform.OS || "UNKNOWN").toUpperCase()}`;
  const manufacturer = readPlatformConstant("Manufacturer", "manufacturer");
  const brand = readPlatformConstant("Brand", "brand");
  const modelName = readPlatformConstant(
    "Model",
    "model",
    "deviceName",
    "DeviceName",
  );
  const model =
    [manufacturer || brand, modelName]
      .filter(Boolean)
      .filter((part, index, parts) => parts.indexOf(part) === index)
      .join(" ") ||
    brand ||
    `${Platform.OS} device`;

  return {
    "x-device-platform": platformLabel,
    "x-device-model": model,
  };
};

export const recordClientActivity = async (timestamp = Date.now()) => {
  await AsyncStorage.setItem(CLIENT_ACTIVE_AT_KEY, String(timestamp));
  return timestamp;
};

export const getClientActiveAt = async () => {
  const value = Number(await AsyncStorage.getItem(CLIENT_ACTIVE_AT_KEY));
  return Number.isFinite(value) ? value : Date.now();
};

export const getAuthHeaders = async (extraHeaders = {}) => {
  const token = await AsyncStorage.getItem("currentUserToken");
  const clientActiveAt = await getClientActiveAt();
  let sessionMeta = {};
  try {
    const rawSessionMeta = await AsyncStorage.getItem("authSessionMeta");
    sessionMeta = rawSessionMeta ? JSON.parse(rawSessionMeta) : {};
  } catch {
    sessionMeta = {};
  }

  return {
    ...extraHeaders,
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    "x-platform": sessionMeta?.platform || "MOBILE",
    "x-client-active-at": String(clientActiveAt),
    ...getDeviceAuditHeaders(),
    ...(sessionMeta?.base ? { "x-base": sessionMeta.base } : {}),
    ...(sessionMeta?.sessionId
      ? { "x-session-id": sessionMeta.sessionId }
      : {}),
  };
};

export const getMultipartAuthHeaders = async (extraHeaders = {}) => {
  const token = await AsyncStorage.getItem("currentUserToken");
  const clientActiveAt = await getClientActiveAt();
  let sessionMeta = {};
  try {
    const rawSessionMeta = await AsyncStorage.getItem("authSessionMeta");
    sessionMeta = rawSessionMeta ? JSON.parse(rawSessionMeta) : {};
  } catch {
    sessionMeta = {};
  }

  return {
    ...extraHeaders,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    "x-platform": sessionMeta?.platform || "MOBILE",
    "x-client-active-at": String(clientActiveAt),
    ...getDeviceAuditHeaders(),
    ...(sessionMeta?.base ? { "x-base": sessionMeta.base } : {}),
    ...(sessionMeta?.sessionId
      ? { "x-session-id": sessionMeta.sessionId }
      : {}),
  };
};

export const getArrayData = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.records)) return payload.records;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data?.records)) return payload.data.records;
  if (Array.isArray(payload?.data?.items)) return payload.data.items;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  return [];
};

export const formatDate = (value, options = {}) => {
  if (!value) return "N/A";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "N/A";

  return parsed.toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    ...options,
  });
};

export const formatDateTime = (value) => {
  if (!value) return "N/A";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "N/A";

  return parsed.toLocaleString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};
