import AsyncStorage from "@react-native-async-storage/async-storage";

const PENDING_REDIRECT_KEY = "pendingNotificationRedirect";

export const savePendingRedirect = async (payload) => {
  await AsyncStorage.setItem(PENDING_REDIRECT_KEY, JSON.stringify(payload));
};

export const readPendingRedirect = async () => {
  const rawValue = await AsyncStorage.getItem(PENDING_REDIRECT_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue);
  } catch (error) {
    return null;
  }
};

export const clearPendingRedirect = async () => {
  await AsyncStorage.removeItem(PENDING_REDIRECT_KEY);
};
