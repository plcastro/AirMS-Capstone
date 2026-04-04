import { Platform } from "react-native";

const localUrl = "http://localhost:8000";
const androidEmulatorUrl = "http://10.0.2.2:8000";
const productionUrl = process.env.BACKEND_URL;

if (!__DEV__ && !productionUrl) {
  throw new Error("BACKEND_URL is not defined for production build");
}

export const API_BASE = Platform.select({
  ios: __DEV__ ? localUrl : productionUrl,
  android: __DEV__ ? androidEmulatorUrl : productionUrl,
  default: __DEV__ ? localUrl : productionUrl,
});
