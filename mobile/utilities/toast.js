import { Platform, ToastAndroid } from "react-native";

export const showToast = (message) => {
  if (!message) return;

  if (Platform.OS === "android") {
    ToastAndroid.show(message, ToastAndroid.SHORT);
    return;
  }

  console.warn(message);
};
