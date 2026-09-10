import { Platform, ToastAndroid } from "react-native";

const toastListeners = new Set();
const pendingToasts = [];

export const subscribeToToast = (listener) => {
  if (typeof listener !== "function") return () => {};

  toastListeners.add(listener);

  if (pendingToasts.length > 0) {
    const queuedToasts = pendingToasts.splice(0);
    queuedToasts.forEach(listener);
  }

  return () => {
    toastListeners.delete(listener);
  };
};

export const showToast = (message) => {
  if (!message) return;

  if (Platform.OS === "android") {
    ToastAndroid.show(message, ToastAndroid.SHORT);
    return;
  }

  const normalizedMessage = String(message);

  if (toastListeners.size === 0) {
    pendingToasts.push(normalizedMessage);
    return;
  }

  toastListeners.forEach((listener) => listener(normalizedMessage));
};
