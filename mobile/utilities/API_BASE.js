import { Platform } from "react-native";

const localUrl = "http://localhost:8000";
const androidEmulatorUrl = "http://10.0.2.2:8000";

// Expo only guarantees EXPO_PUBLIC_* variables at runtime.
const envBackendUrl =
  process.env.EXPO_PUBLIC_BACKEND_URL || process.env.BACKEND_URL;

if (!__DEV__ && !envBackendUrl) {
  throw new Error("EXPO_PUBLIC_BACKEND_URL is not defined for production build");
}

export const API_BASE = Platform.select({
  ios: __DEV__ ? envBackendUrl || localUrl : envBackendUrl,
  android: __DEV__ ? envBackendUrl || androidEmulatorUrl : envBackendUrl,
  default: __DEV__ ? envBackendUrl || localUrl : envBackendUrl,
});

if (__DEV__) {
  console.log("[API_BASE]", API_BASE);
}
