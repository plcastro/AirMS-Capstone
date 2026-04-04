import { Platform } from "react-native";

const localUrl = "http://localhost:8000";
const androidEmulatorUrl = "http://10.0.2.2:8000";
const productionUrl = process.env.BACKEND_URL;

export const API_BASE = Platform.select({
  ios: localUrl,
  android: androidEmulatorUrl,
  // Use production URL if in a production build, else local
  default: __DEV__ ? localUrl : productionUrl,
});
