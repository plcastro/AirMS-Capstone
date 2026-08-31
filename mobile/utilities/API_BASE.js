import { Platform } from "react-native";

const localUrl = "http://localhost:8000";
const androidEmulatorUrl = "http://10.0.2.2:8000";

// Expo only guarantees EXPO_PUBLIC_* variables at runtime.
const envBackendUrl =
  process.env.EXPO_PUBLIC_BACKEND_URL ||
  process.env.BACKEND_URL ||
  process.env.EXPO_PUBLIC_BACKEND_URL_FALLBACK;

const isLocalOrEmulatorHost = (url) => {
  if (!url) return false;
  try {
    const { hostname } = new URL(url);
    return ["localhost", "127.0.0.1", "10.0.2.2"].includes(hostname);
  } catch {
    return false;
  }
};

const normalizeAndroidDevUrl = (url) => {
  if (!url) return androidEmulatorUrl;

  try {
    const parsedUrl = new URL(url);
    if (["localhost", "127.0.0.1"].includes(parsedUrl.hostname)) {
      parsedUrl.hostname = "10.0.2.2";
      return parsedUrl.toString().replace(/\/$/, "");
    }
  } catch {
    return url;
  }

  return url;
};

const trimTrailingSlash = (url) => String(url || "").replace(/\/+$/, "");

const fallbackBaseByPlatform = Platform.select({
  ios: localUrl,
  android: androidEmulatorUrl,
  default: localUrl,
});

const resolvedEnvBase = trimTrailingSlash(envBackendUrl);
const resolvedFallbackBase = trimTrailingSlash(fallbackBaseByPlatform);
const releaseBase =
  resolvedEnvBase && !isLocalOrEmulatorHost(resolvedEnvBase)
    ? resolvedEnvBase
    : "";
const resolvedBaseByPlatform = __DEV__
  ? Platform.select({
      ios: resolvedEnvBase || localUrl,
      android: resolvedEnvBase
        ? normalizeAndroidDevUrl(resolvedEnvBase)
        : androidEmulatorUrl,
      default: resolvedEnvBase || resolvedFallbackBase,
    })
  : releaseBase;

export const API_BASE = trimTrailingSlash(resolvedBaseByPlatform);

if (!API_BASE) {
  console.error(
    "[API_BASE] Release builds require EXPO_PUBLIC_BACKEND_URL to be a real backend URL (not localhost/10.0.2.2).",
  );
}

if (__DEV__) {
  console.log("[API_BASE]", API_BASE);
}
