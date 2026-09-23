import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Device from "expo-device";
import { Platform } from "react-native";
import {
  getStoredAccessToken,
  getStoredSessionMeta,
} from "./authStorage";
import { buildLoginLocationHeaders } from "./loginLocation";

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

const compactText = (value = "") => String(value || "").trim();

const uniqueParts = (parts = []) =>
  parts
    .map(compactText)
    .filter(Boolean)
    .filter((part, index, values) => values.indexOf(part) === index);

const appendModelId = (label, modelId) => {
  const safeLabel = compactText(label);
  const safeModelId = compactText(modelId);
  if (!safeModelId) return safeLabel;
  if (!safeLabel) return safeModelId;
  if (safeLabel.toLowerCase().includes(safeModelId.toLowerCase())) {
    return safeLabel;
  }
  return `${safeLabel} (${safeModelId})`;
};

const getExactDeviceModel = () => {
  const manufacturer =
    compactText(Device.manufacturer) ||
    readPlatformConstant("Manufacturer", "manufacturer");
  const brand = compactText(Device.brand) || readPlatformConstant("Brand", "brand");
  const modelName =
    compactText(Device.modelName) ||
    readPlatformConstant("Model", "model", "deviceName", "DeviceName");
  const modelId =
    compactText(Device.modelId) ||
    readPlatformConstant("ModelID", "modelId", "modelID");
  const modelLabel = uniqueParts([manufacturer || brand, modelName]).join(" ");

  return (
    appendModelId(modelLabel, modelId) ||
    uniqueParts([brand, modelName]).join(" ") ||
    modelId ||
    `${Platform.OS} device`
  );
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
  return {
    "x-device-platform": platformLabel,
    "x-device-model": getExactDeviceModel(),
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
  const token = await getStoredAccessToken();
  const clientActiveAt = await getClientActiveAt();
  let sessionMeta = {};
  try {
    const rawSessionMeta = await getStoredSessionMeta();
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
    ...buildLoginLocationHeaders(sessionMeta?.location),
    ...(sessionMeta?.base ? { "x-base": sessionMeta.base } : {}),
    ...(sessionMeta?.sessionId
      ? { "x-session-id": sessionMeta.sessionId }
      : {}),
  };
};

export const getMultipartAuthHeaders = async (extraHeaders = {}) => {
  const token = await getStoredAccessToken();
  const clientActiveAt = await getClientActiveAt();
  let sessionMeta = {};
  try {
    const rawSessionMeta = await getStoredSessionMeta();
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
    ...buildLoginLocationHeaders(sessionMeta?.location),
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
