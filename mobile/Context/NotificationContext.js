import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { AuthContext } from "./AuthContext";
import { API_BASE } from "../utilities/API_BASE";
import { navigate } from "../utilities/navigationRef";
import { savePendingRedirect } from "../utilities/pendingRedirect";

export const NotificationContext = createContext({
  notifications: [],
  unreadCount: 0,
  loadingNotifications: false,
  fetchNotifications: async () => {},
  markAsRead: async () => {},
  markAllAsRead: async () => {},
  openNotificationTarget: async () => {},
});

const getStoredToken = async () => {
  if (Platform.OS === "web") {
    return localStorage.getItem("currentUserToken");
  }

  return AsyncStorage.getItem("currentUserToken");
};

export function NotificationProvider({ children }) {
  const { user } = useContext(AuthContext);
  const [notifications, setNotifications] = useState([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const notificationResponseListener = useRef(null);
  const notificationReceivedListener = useRef(null);
  const notificationsModuleRef = useRef(null);

  const isExpoGo = Constants?.appOwnership === "expo";

  const ensureNotificationsModule = useCallback(async () => {
    if (Platform.OS === "web" || isExpoGo) {
      return null;
    }

    if (notificationsModuleRef.current) {
      return notificationsModuleRef.current;
    }

    const Notifications = await import("expo-notifications");
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    notificationsModuleRef.current = Notifications;
    return Notifications;
  }, [isExpoGo]);

  const getDeviceInstallationId = useCallback(async () => {
    const storageKey = "deviceInstallationId";
    const existingId = await AsyncStorage.getItem(storageKey);

    if (existingId) {
      return existingId;
    }

    const nextId = `device-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    await AsyncStorage.setItem(storageKey, nextId);
    return nextId;
  }, []);

  const registerPushTokenWithServer = useCallback(async () => {
    if (Platform.OS === "web" || isExpoGo || !user?.id) {
      return;
    }

    try {
      const Notifications = await ensureNotificationsModule();

      if (!Notifications) {
        return;
      }

      const projectId =
        Constants?.expoConfig?.extra?.eas?.projectId ||
        Constants?.easConfig?.projectId;

      if (!projectId) {
        console.warn(
          "Skipping push registration: no Expo projectId is configured for this build.",
        );
        return;
      }

      const token = await getStoredToken();

      if (!token) {
        return;
      }

      const permissions = await Notifications.getPermissionsAsync();
      let finalStatus = permissions.status;

      if (finalStatus !== "granted") {
        const requestPermissions = await Notifications.requestPermissionsAsync();
        finalStatus = requestPermissions.status;
      }

      if (finalStatus !== "granted") {
        return;
      }

      const expoPushToken = (
        await Notifications.getExpoPushTokenAsync({ projectId })
      ).data;
      const deviceId = await getDeviceInstallationId();

      await fetch(`${API_BASE}/api/user/register-mobile-push-device`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          deviceId,
          expoPushToken,
          platform: Platform.OS,
        }),
      });
    } catch (error) {
      console.error("Error registering push token:", error);
    }
  }, [ensureNotificationsModule, getDeviceInstallationId, isExpoGo, user?.id]);

  const fetchNotifications = useCallback(async () => {
    if (!user?.id) {
      setNotifications([]);
      return;
    }

    try {
      setLoadingNotifications(true);
      const token = await getStoredToken();

      if (!token) {
        setNotifications([]);
        return;
      }

      const response = await fetch(`${API_BASE}/api/notifications`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch notifications");
      }

      const data = await response.json();
      setNotifications(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      setNotifications([]);
    } finally {
      setLoadingNotifications(false);
    }
  }, [user?.id]);

  const markAsRead = useCallback(async (notificationId) => {
    const token = await getStoredToken();

    if (!token || !notificationId) {
      return;
    }

    try {
      await fetch(`${API_BASE}/api/notifications/${notificationId}/read`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setNotifications((currentNotifications) =>
        currentNotifications.map((notification) =>
          notification._id === notificationId
            ? { ...notification, read: true }
            : notification,
        ),
      );
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    const token = await getStoredToken();

    if (!token) {
      return;
    }

    try {
      await fetch(`${API_BASE}/api/notifications/mark-all-read`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setNotifications((currentNotifications) =>
        currentNotifications.map((notification) => ({
          ...notification,
          read: true,
        })),
      );
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  }, []);

  const openNotificationTarget = useCallback(
    async (notificationPayload) => {
      const targetParams = {
        refreshAt: Date.now(),
        targetRequestId:
          notificationPayload?.entityId ||
          notificationPayload?.targetRequestId ||
          notificationPayload?.data?.targetRequestId,
        notificationStatus:
          notificationPayload?.metadata?.status ||
          notificationPayload?.status ||
          notificationPayload?.data?.status ||
          null,
      };

      if (user?.id) {
        if (notificationPayload?._id) {
          await markAsRead(notificationPayload._id);
        }

        navigate("dashboard", {
          screen: "Parts Requisition",
          params: targetParams,
        });
        return;
      }

      await savePendingRedirect({
        screen: "Parts Requisition",
        params: targetParams,
      });
      navigate("login");
    },
    [markAsRead, user?.id],
  );

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    registerPushTokenWithServer();
  }, [registerPushTokenWithServer]);

  useEffect(() => {
    if (Platform.OS === "web" || isExpoGo) {
      return undefined;
    }

    let isMounted = true;

    ensureNotificationsModule().then((Notifications) => {
      if (!Notifications || !isMounted) {
        return;
      }

      Notifications.getLastNotificationResponseAsync().then((response) => {
        const payload = response?.notification?.request?.content?.data || null;

        if (payload) {
          openNotificationTarget(payload);
        }
      });

      notificationReceivedListener.current =
        Notifications.addNotificationReceivedListener(() => {
          fetchNotifications();
        });

      notificationResponseListener.current =
        Notifications.addNotificationResponseReceivedListener((response) => {
          const payload = response?.notification?.request?.content?.data || {};
          openNotificationTarget(payload);
        });
    });

    return () => {
      isMounted = false;
      notificationReceivedListener.current?.remove?.();
      notificationResponseListener.current?.remove?.();
    };
  }, [ensureNotificationsModule, fetchNotifications, isExpoGo, openNotificationTarget]);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.read).length,
    [notifications],
  );

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      loadingNotifications,
      fetchNotifications,
      markAsRead,
      markAllAsRead,
      openNotificationTarget,
    }),
    [
      notifications,
      unreadCount,
      loadingNotifications,
      fetchNotifications,
      markAsRead,
      markAllAsRead,
      openNotificationTarget,
    ],
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}
