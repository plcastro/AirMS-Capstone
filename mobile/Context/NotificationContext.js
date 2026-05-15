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
import * as Device from "expo-device";
import { AuthContext } from "./AuthContext";
import { API_BASE } from "../utilities/API_BASE";
import { navigate } from "../utilities/navigationRef";
import { savePendingRedirect } from "../utilities/pendingRedirect";
import { showToast } from "../utilities/toast";

export const NotificationContext = createContext({
  notifications: [],
  unreadCount: 0,
  loadingNotifications: false,
  fetchNotifications: async () => {},
  markAsRead: async () => {},
  markAllAsRead: async () => {},
  openNotificationTarget: async () => {},
});

const buildTargetNavigation = (notificationPayload) => {
  const moduleName =
    notificationPayload?.module ||
    notificationPayload?.data?.module ||
    notificationPayload?.metadata?.module;

  if (moduleName === "flight-logs") {
    return {
      screen: "Flight Logs",
      params: {
        refreshAt: Date.now(),
        targetFlightLogId:
          notificationPayload?.entityId ||
          notificationPayload?.targetFlightLogId ||
          notificationPayload?.data?.targetFlightLogId,
        notificationStatus:
          notificationPayload?.metadata?.status ||
          notificationPayload?.status ||
          notificationPayload?.data?.status ||
          null,
      },
    };
  }

  if (moduleName === "pre-inspections") {
    return {
      screen: "Pre-Inspection",
      params: {
        refreshAt: Date.now(),
        targetPreInspectionId:
          notificationPayload?.entityId ||
          notificationPayload?.targetPreInspectionId ||
          notificationPayload?.data?.targetPreInspectionId,
        notificationStatus:
          notificationPayload?.metadata?.status ||
          notificationPayload?.status ||
          notificationPayload?.data?.status ||
          null,
      },
    };
  }

  if (moduleName === "post-inspections") {
    return {
      screen: "Post-Inspection",
      params: {
        refreshAt: Date.now(),
        targetPostInspectionId:
          notificationPayload?.entityId ||
          notificationPayload?.targetPostInspectionId ||
          notificationPayload?.data?.targetPostInspectionId,
        notificationStatus:
          notificationPayload?.metadata?.status ||
          notificationPayload?.status ||
          notificationPayload?.data?.status ||
          null,
      },
    };
  }

  if (moduleName === "tasks") {
    return {
      screen: "Tasks",
      params: {
        refreshAt: Date.now(),
        targetTaskId:
          notificationPayload?.entityId ||
          notificationPayload?.targetTaskId ||
          notificationPayload?.data?.targetTaskId,
        notificationStatus:
          notificationPayload?.metadata?.status ||
          notificationPayload?.status ||
          notificationPayload?.data?.status ||
          null,
      },
    };
  }

  if (moduleName === "messages") {
    return {
      screen: "Messages",
      params: {
        refreshAt: Date.now(),
      },
    };
  }

  return {
    screen: "Parts Requisition Monitoring",
    params: {
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
    },
  };
};

const getStoredToken = async () => {
  if (Platform.OS === "web") {
    return localStorage.getItem("currentUserToken");
  }

  return AsyncStorage.getItem("currentUserToken");
};

const buildWsUrl = (token) => {
  const wsBase = String(API_BASE || "").replace(/^http/i, (match) =>
    match.toLowerCase() === "https" ? "wss" : "ws",
  );
  const separator = wsBase.includes("?") ? "&" : "?";
  return `${wsBase}${separator}token=${encodeURIComponent(token)}`;
};

export function NotificationProvider({ children }) {
  const { user, logoutUser } = useContext(AuthContext);
  const [notifications, setNotifications] = useState([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const notificationResponseListener = useRef(null);
  const notificationReceivedListener = useRef(null);
  const notificationsModuleRef = useRef(null);
  const moduleSnapshotRef = useRef(null);
  const moduleNotifierReadyRef = useRef(false);
  const wsRef = useRef(null);
  const wsReconnectTimeoutRef = useRef(null);

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
    if (Platform.OS === "web" || !user?.id) {
      return;
    }

    try {
      const Notifications = await ensureNotificationsModule();

      if (!Notifications) {
        return;
      }

      if (!Device.isDevice) {
        console.warn("Push notifications require a physical device.");
        return;
      }

      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "default",
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#26866F",
        });
      }

      const projectId =
        Constants?.expoConfig?.extra?.eas?.projectId ||
        Constants?.easConfig?.projectId;

      const token = await getStoredToken();

      if (!token) {
        return;
      }

      const permissions = await Notifications.getPermissionsAsync();
      let finalStatus = permissions.status;

      if (finalStatus !== "granted") {
        const requestPermissions =
          await Notifications.requestPermissionsAsync();
        finalStatus = requestPermissions.status;
      }

      if (finalStatus !== "granted") {
        return;
      }

      const expoPushToken = projectId
        ? (await Notifications.getExpoPushTokenAsync({ projectId })).data
        : (await Notifications.getExpoPushTokenAsync()).data;
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
  }, [ensureNotificationsModule, getDeviceInstallationId, user?.id]);

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

      if (response.status === 401 || response.status === 403) {
        setNotifications([]);
        await logoutUser?.();
        return;
      }

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        throw new Error(
          errorBody?.message ||
            `Failed to fetch notifications (${response.status})`,
        );
      }

      const data = await response.json();
      setNotifications(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      setNotifications([]);
    } finally {
      setLoadingNotifications(false);
    }
  }, [logoutUser, user?.id]);

  const fetchModuleSnapshot = useCallback(async () => {
    if (!user?.id) {
      return null;
    }

    const token = await getStoredToken();
    if (!token) {
      return null;
    }

    const headers = { Authorization: `Bearer ${token}` };
    const normalizedRole = String(user?.jobTitle || "").toLowerCase();
    const canAccessTasks = ["admin", "maintenance manager", "mechanic"].includes(
      normalizedRole,
    );
    const canAccessLogs = normalizedRole === "admin";
    const canAccessRequisitions = [
      "admin",
      "maintenance manager",
      "mechanic",
      "officer-in-charge",
      "warehouse department",
    ].includes(normalizedRole);
    const canAccessMessages = canAccessRequisitions;

    const safeJson = async (response) => response.json().catch(() => ({}));

    const snapshot = {
      messagesUnread: 0,
      taskCount: 0,
      latestTaskUpdatedAt: "",
      latestLogId: "",
      requisitionCount: 0,
      latestRequisitionUpdatedAt: "",
    };

    if (canAccessMessages) {
      try {
        const response = await fetch(`${API_BASE}/api/messages/conversations`, {
          headers,
        });
        if (response.ok) {
          const data = await safeJson(response);
          const conversations = Array.isArray(data?.data) ? data.data : [];
          snapshot.messagesUnread = conversations.reduce(
            (sum, item) => sum + (Number(item?.unreadCount) || 0),
            0,
          );
        }
      } catch (error) {
        console.error("Message snapshot error:", error);
      }
    }

    if (canAccessTasks) {
      try {
        const response = await fetch(`${API_BASE}/api/tasks/getAll`, { headers });
        if (response.ok) {
          const data = await safeJson(response);
          const tasks = Array.isArray(data?.data) ? data.data : [];
          snapshot.taskCount = tasks.length;
          snapshot.latestTaskUpdatedAt = String(
            tasks
              .map((task) => task?.updatedAt || task?.createdAt || "")
              .filter(Boolean)
              .sort()
              .pop() || "",
          );
        }
      } catch (error) {
        console.error("Task snapshot error:", error);
      }
    }

    if (canAccessLogs) {
      try {
        const response = await fetch(
          `${API_BASE}/api/logs/getAllUserLogs?page=1&limit=1`,
          { headers },
        );
        if (response.ok) {
          const data = await safeJson(response);
          const first = Array.isArray(data?.data) ? data.data[0] : null;
          snapshot.latestLogId = String(first?._id || first?.id || "");
        }
      } catch (error) {
        console.error("Activity log snapshot error:", error);
      }
    }

    if (canAccessRequisitions) {
      try {
        const response = await fetch(
          `${API_BASE}/api/parts-requisition/get-all-requisition`,
          { headers },
        );
        if (response.ok) {
          const data = await safeJson(response);
          const requisitions = Array.isArray(data) ? data : [];
          snapshot.requisitionCount = requisitions.length;
          snapshot.latestRequisitionUpdatedAt = String(
            requisitions
              .map((item) => item?.updatedAt || item?.createdAt || "")
              .filter(Boolean)
              .sort()
              .pop() || "",
          );
        }
      } catch (error) {
        console.error("Requisition snapshot error:", error);
      }
    }

    return snapshot;
  }, [user?.id, user?.jobTitle]);

  const checkModuleUpdates = useCallback(async () => {
    const nextSnapshot = await fetchModuleSnapshot();
    if (!nextSnapshot) return;

    const previousSnapshot = moduleSnapshotRef.current;
    moduleSnapshotRef.current = nextSnapshot;

    if (!moduleNotifierReadyRef.current || !previousSnapshot) {
      moduleNotifierReadyRef.current = true;
      return;
    }

    if (nextSnapshot.messagesUnread > previousSnapshot.messagesUnread) {
      showToast("You have new message updates.");
    }

    if (
      nextSnapshot.taskCount > previousSnapshot.taskCount ||
      (nextSnapshot.latestTaskUpdatedAt &&
        nextSnapshot.latestTaskUpdatedAt !== previousSnapshot.latestTaskUpdatedAt)
    ) {
      showToast("You have new task updates.");
    }

    if (
      nextSnapshot.latestLogId &&
      previousSnapshot.latestLogId &&
      nextSnapshot.latestLogId !== previousSnapshot.latestLogId
    ) {
      showToast("New activity logs were added.");
    }

    if (
      nextSnapshot.requisitionCount > previousSnapshot.requisitionCount ||
      (nextSnapshot.latestRequisitionUpdatedAt &&
        nextSnapshot.latestRequisitionUpdatedAt !==
          previousSnapshot.latestRequisitionUpdatedAt)
    ) {
      showToast("You have new requisition updates.");
    }
  }, [fetchModuleSnapshot]);

  const markAsRead = useCallback(
    async (notificationId) => {
      const token = await getStoredToken();

      if (!token || !notificationId) {
        return;
      }

      try {
        const response = await fetch(
          `${API_BASE}/api/notifications/${notificationId}/read`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (response.status === 401 || response.status === 403) {
          await logoutUser?.();
          return;
        }

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
    },
    [logoutUser],
  );

  const markAllAsRead = useCallback(async () => {
    const token = await getStoredToken();

    if (!token) {
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE}/api/notifications/mark-all-read`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (response.status === 401 || response.status === 403) {
        await logoutUser?.();
        return;
      }

      setNotifications((currentNotifications) =>
        currentNotifications.map((notification) => ({
          ...notification,
          read: true,
        })),
      );
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  }, [logoutUser]);

  const openNotificationTarget = useCallback(
    async (notificationPayload) => {
      const targetNavigation = buildTargetNavigation(notificationPayload);

      if (user?.id) {
        if (notificationPayload?._id) {
          await markAsRead(notificationPayload._id);
        }

        navigate("dashboard", {
          screen: targetNavigation.screen,
          params: targetNavigation.params,
        });
        return;
      }

      await savePendingRedirect(targetNavigation);
      navigate("login");
    },
    [markAsRead, user?.id],
  );

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (!user?.id) {
      moduleSnapshotRef.current = null;
      moduleNotifierReadyRef.current = false;
      return undefined;
    }

    checkModuleUpdates();

    let closedByEffect = false;

    const connect = async () => {
      const token = await getStoredToken();
      if (!token || !user?.id) return;

      const ws = new WebSocket(buildWsUrl(token));
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data || "{}");
          const nextEvent = String(payload?.event || "");

          if (
            nextEvent === "data-changed" ||
            nextEvent === "chat:message" ||
            nextEvent === "chat:conversation"
          ) {
            fetchNotifications();
            checkModuleUpdates();
          }
        } catch (error) {
          console.error("Notification websocket parse error:", error);
        }
      };

      ws.onclose = () => {
        if (!closedByEffect) {
          wsReconnectTimeoutRef.current = setTimeout(connect, 1500);
        }
      };

      ws.onerror = () => {
        ws.close();
      };
    };

    connect();

    return () => {
      closedByEffect = true;
      if (wsReconnectTimeoutRef.current) {
        clearTimeout(wsReconnectTimeoutRef.current);
      }
      wsRef.current?.close?.();
    };
  }, [checkModuleUpdates, fetchNotifications, user?.id]);

  useEffect(() => {
    registerPushTokenWithServer();
  }, [registerPushTokenWithServer]);

  useEffect(() => {
    if (Platform.OS === "web") {
      return undefined;
    }

    let isMounted = true;

    ensureNotificationsModule().then((Notifications) => {
      if (!Notifications || !isMounted) {
        return;
      }

      Notifications.getLastNotificationResponse().then((response) => {
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
  }, [ensureNotificationsModule, fetchNotifications, openNotificationTarget]);

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
