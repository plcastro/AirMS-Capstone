import { Platform } from "react-native";

const localUrl = "http://localhost:8000";
const androidEmulatorUrl = "http://10.0.2.2:8000";

// Expo only guarantees EXPO_PUBLIC_* variables at runtime.
const envBackendUrl =
  process.env.EXPO_PUBLIC_BACKEND_URL || process.env.BACKEND_URL;

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
const resolvedBaseByPlatform = Platform.select({
  ios: resolvedEnvBase || (__DEV__ ? localUrl : ""),
  android: resolvedEnvBase
    ? __DEV__
      ? normalizeAndroidDevUrl(resolvedEnvBase)
      : resolvedEnvBase
    : __DEV__
      ? androidEmulatorUrl
      : "",
  default: resolvedEnvBase || (__DEV__ ? resolvedFallbackBase : ""),
});

export const API_BASE = trimTrailingSlash(resolvedBaseByPlatform);

if (!API_BASE) {
  console.error(
    "[API_BASE] Missing EXPO_PUBLIC_BACKEND_URL. Set it in mobile/.env for release builds.",
  );
}

if (__DEV__) {
  console.log("[API_BASE]", API_BASE);
}
