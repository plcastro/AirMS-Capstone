import AsyncStorage from "@react-native-async-storage/async-storage";

const PUSH_INBOX_KEY = "pendingPushInbox";
const MAX_INBOX_ITEMS = 20;

const safeParse = (raw) => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const enqueuePushMessage = async (remoteMessage) => {
  try {
    const existing = safeParse(await AsyncStorage.getItem(PUSH_INBOX_KEY));
    const nextItem = {
      id:
        remoteMessage?.messageId ||
        `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      data: remoteMessage?.data || {},
      notification: remoteMessage?.notification || {},
      receivedAt: Date.now(),
    };

    const next = [nextItem, ...existing].slice(0, MAX_INBOX_ITEMS);
    await AsyncStorage.setItem(PUSH_INBOX_KEY, JSON.stringify(next));
  } catch (error) {
    console.warn("Failed to enqueue background push message:", error);
  }
};

export const consumePushInbox = async () => {
  try {
    const existing = safeParse(await AsyncStorage.getItem(PUSH_INBOX_KEY));
    await AsyncStorage.removeItem(PUSH_INBOX_KEY);
    return existing;
  } catch (error) {
    console.warn("Failed to consume background push inbox:", error);
    return [];
  }
};

