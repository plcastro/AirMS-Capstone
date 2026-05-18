import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppState, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Device from "expo-device";
import { AuthContext } from "./AuthContext";
import { API_BASE } from "../utilities/API_BASE";
import { navigate, navigationRef } from "../utilities/navigationRef";
import { savePendingRedirect } from "../utilities/pendingRedirect";
import { showToast } from "../utilities/toast";

const __DEV_LOG__ = __DEV__;
const log = (...args) => {
  //if (__DEV_LOG__) console.log("[NotificationContext]", ...args);
};

const WS_BACKOFF_BASE_MS = 1200;
const WS_BACKOFF_MAX_MS = 30000;
const REFRESH_DEBOUNCE_MS = 250;
const NAV_QUEUE_RETRY_MS = 150;
const NAV_QUEUE_MAX_ATTEMPTS = 40;

let notificationHandlerInitialized = false;

const VALID_MODULES = new Set([
  "flight-logs",
  "pre-inspections",
  "post-inspections",
  "tasks",
  "messages",
  "parts-requisition",
  "parts-requisitions",
]);

export const NotificationContext = createContext({
  notifications: [],
  unreadCount: 0,
  loadingNotifications: false,
  fetchNotifications: async () => {},
  markAsRead: async () => {},
  markAllAsRead: async () => {},
  openNotificationTarget: async () => {},
  refreshPushRegistration: async () => {},
});

const getStoredToken = async () => {
  if (Platform.OS === "web") {
    const token = window.localStorage.getItem("currentUserToken");
    console.log("Fetching stored token:", token);
    return token;
  }

  const token = await AsyncStorage.getItem("currentUserToken");
  console.log("Fetching stored token:", token);
  return token;
};

const buildWsUrl = (token) => {
  const wsBase = String(API_BASE || "").replace(/^http/i, (match) =>
    match.toLowerCase() === "https" ? "wss" : "ws",
  );
  const separator = wsBase.includes("?") ? "&" : "?";
  return `${wsBase}${separator}token=${encodeURIComponent(token)}`;
};

const getModuleName = (payload) =>
  String(
    payload?.module || payload?.data?.module || payload?.metadata?.module || "",
  ).trim();

const normalizeWsEvent = (rawEvent = "", payload = {}) => {
  const event = String(rawEvent || "");
  if (event === "chat:message") return "message:new";
  if (event === "chat:conversation") return "notification:new";
  if (event === "data-changed") {
    const moduleName = getModuleName(payload);
    if (moduleName === "tasks") return "task:updated";
    if (
      moduleName === "parts-requisition" ||
      moduleName === "parts-requisitions"
    ) {
      return "requisition:updated";
    }
    if (moduleName === "messages") return "message:new";
    if (moduleName === "flight-logs") return "logs:new";
    return "notification:new";
  }
  return event;
};

const validateNotificationPayload = (payload) => {
  if (!payload || typeof payload !== "object") return false;
  const moduleName = getModuleName(payload);
  return !moduleName || VALID_MODULES.has(moduleName);
};

const buildTargetNavigation = (notificationPayload) => {
  if (!validateNotificationPayload(notificationPayload)) {
    return null;
  }

  const moduleName = getModuleName(notificationPayload);

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
      params: { refreshAt: Date.now() },
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

export function NotificationProvider({ children }) {
  const { user, logoutUser } = useContext(AuthContext);
  const [notifications, setNotifications] = useState([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  const notificationsModuleRef = useRef(null);
  const wsRef = useRef(null);
  const wsReconnectTimeoutRef = useRef(null);
  const wsReconnectAttemptsRef = useRef(0);
  const appStateRef = useRef(AppState.currentState);

  const fetchAbortRef = useRef(null);
  const snapshotAbortRef = useRef(null);
  const checkInFlightRef = useRef(false);
  const refreshDebounceRef = useRef(null);
  const pendingRefreshReasonRef = useRef(new Set());

  const notificationResponseListenerRef = useRef(null);
  const notificationReceivedListenerRef = useRef(null);
  const lastHandledNotificationRef = useRef("");
  const pendingNavQueueRef = useRef([]);
  const navQueueTimerRef = useRef(null);

  const moduleSnapshotRef = useRef(null);
  const moduleNotifierReadyRef = useRef(false);
  const loadedNotificationsUserIdRef = useRef("");

  const lastRegisteredPushRef = useRef({
    userId: "",
    deviceId: "",
    expoPushToken: "",
    fcmToken: "",
  });

  const isExpoGo = Constants?.appOwnership === "expo";

  const clearReconnectTimer = useCallback(() => {
    if (wsReconnectTimeoutRef.current) {
      clearTimeout(wsReconnectTimeoutRef.current);
      wsReconnectTimeoutRef.current = null;
    }
  }, []);

  const clearNavigationQueueTimer = useCallback(() => {
    if (navQueueTimerRef.current) {
      clearTimeout(navQueueTimerRef.current);
      navQueueTimerRef.current = null;
    }
  }, []);

  const drainNavigationQueue = useCallback(() => {
    clearNavigationQueueTimer();
    if (!pendingNavQueueRef.current.length) return;
    if (!navigationRef.isReady()) {
      navQueueTimerRef.current = setTimeout(
        drainNavigationQueue,
        NAV_QUEUE_RETRY_MS,
      );
      return;
    }

    const queue = [...pendingNavQueueRef.current];
    pendingNavQueueRef.current = [];
    queue.forEach((item) => {
      navigate(item.route, item.params);
      log("queued-navigation:flushed", item.route, item.params?.screen || "");
    });
  }, [clearNavigationQueueTimer]);

  const queueNavigation = useCallback(
    (route, params) => {
      pendingNavQueueRef.current.push({ route, params, attempts: 0 });

      const tick = () => {
        const current = pendingNavQueueRef.current[0];
        if (!current) {
          clearNavigationQueueTimer();
          return;
        }

        if (navigationRef.isReady()) {
          drainNavigationQueue();
          return;
        }

        current.attempts += 1;
        if (current.attempts >= NAV_QUEUE_MAX_ATTEMPTS) {
          log("queued-navigation:dropped", route);
          pendingNavQueueRef.current.shift();
        }
        navQueueTimerRef.current = setTimeout(tick, NAV_QUEUE_RETRY_MS);
      };

      if (!navQueueTimerRef.current) {
        navQueueTimerRef.current = setTimeout(tick, NAV_QUEUE_RETRY_MS);
      }
    },
    [clearNavigationQueueTimer, drainNavigationQueue],
  );

  const ensureNotificationsModule = useCallback(async () => {
    if (Platform.OS === "web" || isExpoGo) {
      return null;
    }

    if (notificationsModuleRef.current) {
      return notificationsModuleRef.current;
    }

    const Notifications = await import("expo-notifications");
    if (!notificationHandlerInitialized) {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });
      notificationHandlerInitialized = true;
      log("push-handler:initialized-once");
    }
    notificationsModuleRef.current = Notifications;
    return Notifications;
  }, [isExpoGo]);

  const getDeviceInstallationId = useCallback(async () => {
    const storageKey = "deviceInstallationId";
    const existingId = await AsyncStorage.getItem(storageKey);
    if (existingId) return existingId;
    const nextId = `device-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    await AsyncStorage.setItem(storageKey, nextId);
    return nextId;
  }, []);

  const registerPushTokenWithServer = useCallback(async () => {
    if (Platform.OS === "web" || !user?.id) return;

    try {
      const Notifications = await ensureNotificationsModule();
      if (!Notifications) return;

      if (!Device.isDevice) {
        log("push-register:skipped-not-device");
        return;
      }

      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "default",
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#239479",
        });
      }

      const projectId =
        Constants?.expoConfig?.extra?.eas?.projectId ||
        Constants?.easConfig?.projectId;

      const authToken = await getStoredToken();
      if (!authToken) return;

      const permissions = await Notifications.getPermissionsAsync();
      let finalStatus = permissions.status;
      if (finalStatus !== "granted") {
        const requestPermissions =
          await Notifications.requestPermissionsAsync();
        finalStatus = requestPermissions.status;
      }
      if (finalStatus !== "granted") {
        log("push-register:permission-denied");
        return;
      }

      const expoPushToken = projectId
        ? (await Notifications.getExpoPushTokenAsync({ projectId })).data
        : (await Notifications.getExpoPushTokenAsync()).data;
      let fcmToken = null;
      try {
        const devicePushToken = await Notifications.getDevicePushTokenAsync();
        fcmToken =
          devicePushToken?.type === "fcm" ? devicePushToken.data : null;
      } catch (fcmError) {
        console.warn("FCM token fetch failed:", fcmError);
      }
      console.log("Expo token:", expoPushToken);
      console.log("FCM token:", fcmToken);
      const deviceId = await getDeviceInstallationId();

      const cached = lastRegisteredPushRef.current;
      if (
        cached.userId === String(user.id) &&
        cached.deviceId === deviceId &&
        cached.expoPushToken === expoPushToken &&
        cached.fcmToken === (fcmToken || "")
      ) {
        log("push-register:dedup-hit");
        return;
      }

      const response = await fetch(
        `${API_BASE}/api/user/register-mobile-push-device`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            deviceId,
            expoPushToken,
            fcmToken,
            platform: Platform.OS,
          }),
        },
      );

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        throw new Error(
          errorBody?.message ||
            `Failed push registration (${response.status || "unknown"})`,
        );
      }

      lastRegisteredPushRef.current = {
        userId: String(user.id),
        deviceId,
        expoPushToken,
        fcmToken: fcmToken || "",
      };
      log("push-register:success");
    } catch (error) {
      console.error("Error registering push token:", error);
    }
  }, [ensureNotificationsModule, getDeviceInstallationId, user?.id]);

  const fetchNotifications = useCallback(
    async ({ signal } = {}) => {
      if (!user?.id) {
        setNotifications([]);
        return;
      }

      const authToken = await getStoredToken();
      if (!authToken) {
        setNotifications([]);
        return;
      }

      setLoadingNotifications(true);
      try {
        const response = await fetch(`${API_BASE}/api/notifications`, {
          headers: { Authorization: `Bearer ${authToken}` },
          signal,
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
        if (error?.name !== "AbortError") {
          console.error("Error fetching notifications:", error);
          setNotifications([]);
        }
      } finally {
        setLoadingNotifications(false);
      }
    },
    [logoutUser, user?.id],
  );

  const fetchModuleSnapshot = useCallback(
    async ({ signal } = {}) => {
      if (!user?.id) return null;
      const authToken = await getStoredToken();
      if (!authToken) return null;

      const headers = { Authorization: `Bearer ${authToken}` };
      const normalizedRole = String(user?.jobTitle || "").toLowerCase();
      const canAccessTasks = [
        "admin",
        "maintenance manager",
        "mechanic",
      ].includes(normalizedRole);
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
          const summaryResponse = await fetch(
            `${API_BASE}/api/messages/summary`,
            { headers, signal },
          );
          if (summaryResponse.ok) {
            const summary = await safeJson(summaryResponse);
            snapshot.messagesUnread = Number(summary?.unreadCount || 0);
          } else {
            const response = await fetch(
              `${API_BASE}/api/messages/conversations`,
              { headers, signal },
            );
            if (response.ok) {
              const data = await safeJson(response);
              const conversations = Array.isArray(data?.data) ? data.data : [];
              snapshot.messagesUnread = conversations.reduce(
                (sum, item) => sum + (Number(item?.unreadCount) || 0),
                0,
              );
            }
          }
        } catch (error) {
          if (error?.name !== "AbortError") {
            console.error("Message snapshot error:", error);
          }
        }
      }

      if (canAccessTasks) {
        try {
          const summaryResponse = await fetch(`${API_BASE}/api/tasks/summary`, {
            headers,
            signal,
          });
          if (summaryResponse.ok) {
            const summary = await safeJson(summaryResponse);
            snapshot.taskCount = Number(summary?.count || 0);
            snapshot.latestTaskUpdatedAt = String(
              summary?.latestUpdatedAt || "",
            );
          } else {
            const response = await fetch(`${API_BASE}/api/tasks/getAll`, {
              headers,
              signal,
            });
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
          }
        } catch (error) {
          if (error?.name !== "AbortError") {
            console.error("Task snapshot error:", error);
          }
        }
      }

      if (canAccessLogs) {
        try {
          const latestResponse = await fetch(`${API_BASE}/api/logs/latest`, {
            headers,
            signal,
          });
          if (latestResponse.ok) {
            const latest = await safeJson(latestResponse);
            snapshot.latestLogId = String(latest?._id || latest?.id || "");
          } else {
            const response = await fetch(
              `${API_BASE}/api/logs/getAllUserLogs?page=1&limit=1`,
              { headers, signal },
            );
            if (response.ok) {
              const data = await safeJson(response);
              const first = Array.isArray(data?.data) ? data.data[0] : null;
              snapshot.latestLogId = String(first?._id || first?.id || "");
            }
          }
        } catch (error) {
          if (error?.name !== "AbortError") {
            console.error("Activity log snapshot error:", error);
          }
        }
      }

      if (canAccessRequisitions) {
        try {
          const summaryResponse = await fetch(
            `${API_BASE}/api/requisitions/summary`,
            { headers, signal },
          );
          if (summaryResponse.ok) {
            const summary = await safeJson(summaryResponse);
            snapshot.requisitionCount = Number(summary?.count || 0);
            snapshot.latestRequisitionUpdatedAt = String(
              summary?.latestUpdatedAt || "",
            );
          } else {
            const response = await fetch(
              `${API_BASE}/api/parts-requisition/get-all-requisition`,
              { headers, signal },
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
          }
        } catch (error) {
          if (error?.name !== "AbortError") {
            console.error("Requisition snapshot error:", error);
          }
        }
      }

      return snapshot;
    },
    [user?.id, user?.jobTitle],
  );

  const checkModuleUpdates = useCallback(
    async ({ reason = "manual" } = {}) => {
      pendingRefreshReasonRef.current.add(reason);
      if (checkInFlightRef.current) return;

      checkInFlightRef.current = true;
      snapshotAbortRef.current?.abort?.();
      const controller = new AbortController();
      snapshotAbortRef.current = controller;

      try {
        const nextSnapshot = await fetchModuleSnapshot({
          signal: controller.signal,
        });
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
            nextSnapshot.latestTaskUpdatedAt !==
              previousSnapshot.latestTaskUpdatedAt)
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
      } catch (error) {
        if (error?.name !== "AbortError") {
          console.error("checkModuleUpdates error:", error);
        }
      } finally {
        checkInFlightRef.current = false;
      }
    },
    [fetchModuleSnapshot],
  );

  const scheduleRefresh = useCallback(
    (reason) => {
      pendingRefreshReasonRef.current.add(String(reason || "unknown"));
      if (refreshDebounceRef.current) return;

      refreshDebounceRef.current = setTimeout(async () => {
        refreshDebounceRef.current = null;
        const reasons = [...pendingRefreshReasonRef.current];
        pendingRefreshReasonRef.current.clear();
        log("refresh:batched", reasons.join(", "));

        fetchAbortRef.current?.abort?.();
        const controller = new AbortController();
        fetchAbortRef.current = controller;

        await Promise.all([
          fetchNotifications({ signal: controller.signal }),
          checkModuleUpdates({ reason: reasons.join(",") }),
        ]);
      }, REFRESH_DEBOUNCE_MS);
    },
    [checkModuleUpdates, fetchNotifications],
  );

  const markAsRead = useCallback(
    async (notificationId) => {
      const authToken = await getStoredToken();
      if (!authToken || !notificationId) return;

      try {
        const response = await fetch(
          `${API_BASE}/api/notifications/${notificationId}/read`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${authToken}` },
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
    const authToken = await getStoredToken();
    if (!authToken) return;

    try {
      const response = await fetch(
        `${API_BASE}/api/notifications/mark-all-read`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${authToken}` },
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
      if (!validateNotificationPayload(notificationPayload)) {
        log("notification-open:invalid-payload", notificationPayload);
        return;
      }

      const targetNavigation = buildTargetNavigation(notificationPayload);
      if (!targetNavigation) return;

      log("notification-open", getModuleName(notificationPayload));

      if (user?.id) {
        if (notificationPayload?._id) {
          await markAsRead(notificationPayload._id);
        }

        const params = {
          screen: targetNavigation.screen,
          params: targetNavigation.params,
        };
        if (navigationRef.isReady()) {
          navigate("dashboard", params);
        } else {
          queueNavigation("dashboard", params);
        }
        return;
      }

      await savePendingRedirect(targetNavigation);
      if (navigationRef.isReady()) {
        navigate("login");
      } else {
        queueNavigation("login");
      }
    },
    [markAsRead, queueNavigation, user?.id],
  );

  useEffect(() => {
    if (!user?.id) {
      setNotifications([]);
      moduleSnapshotRef.current = null;
      moduleNotifierReadyRef.current = false;
      fetchAbortRef.current?.abort?.();
      snapshotAbortRef.current?.abort?.();
      clearReconnectTimer();
      wsRef.current?.close?.();
      wsRef.current = null;
      wsReconnectAttemptsRef.current = 0;
      loadedNotificationsUserIdRef.current = "";
      return;
    }

    if (loadedNotificationsUserIdRef.current === String(user.id)) {
      return;
    }
    loadedNotificationsUserIdRef.current = String(user.id);
    scheduleRefresh("user-change");
  }, [clearReconnectTimer, scheduleRefresh, user?.id]);

  useEffect(() => {
    if (!user?.id) return undefined;

    let closedByEffect = false;

    const connect = async () => {
      const authToken = await getStoredToken();
      if (!authToken || !user?.id) return;

      try {
        const ws = new WebSocket(buildWsUrl(authToken));
        wsRef.current = ws;
        log("ws:connect:attempt", wsReconnectAttemptsRef.current);

        ws.onopen = () => {
          wsReconnectAttemptsRef.current = 0;
          log("ws:connected");
        };

        ws.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data || "{}");
            const typedEvent = normalizeWsEvent(
              payload?.event,
              payload?.data || payload,
            );

            switch (typedEvent) {
              case "notification:new":
                scheduleRefresh("notification:new");
                break;
              case "task:updated":
                scheduleRefresh("task:updated");
                break;
              case "requisition:updated":
                scheduleRefresh("requisition:updated");
                break;
              case "message:new":
                scheduleRefresh("message:new");
                break;
              case "logs:new":
                scheduleRefresh("logs:new");
                break;
              default:
                scheduleRefresh("ws:legacy");
                break;
            }
          } catch (error) {
            console.error("Notification websocket parse error:", error);
          }
        };

        ws.onclose = () => {
          if (closedByEffect) return;
          const attempts = wsReconnectAttemptsRef.current + 1;
          wsReconnectAttemptsRef.current = attempts;
          const backoff = Math.min(
            WS_BACKOFF_MAX_MS,
            WS_BACKOFF_BASE_MS * 2 ** (attempts - 1),
          );
          log("ws:closed:reconnect-in", backoff);
          clearReconnectTimer();
          wsReconnectTimeoutRef.current = setTimeout(connect, backoff);
        };

        ws.onerror = () => {
          log("ws:error");
          ws.close();
        };
      } catch (error) {
        console.error("WebSocket connect error:", error);
      }
    };

    connect();

    return () => {
      closedByEffect = true;
      clearReconnectTimer();
      wsRef.current?.close?.();
      wsRef.current = null;
    };
  }, [clearReconnectTimer, scheduleRefresh, user?.id]);

  useEffect(() => {
    registerPushTokenWithServer();
  }, [registerPushTokenWithServer]);

  useEffect(() => {
    if (Platform.OS === "web") return undefined;

    const subscription = AppState.addEventListener("change", (nextState) => {
      const wasBackground =
        appStateRef.current === "background" ||
        appStateRef.current === "inactive";
      appStateRef.current = nextState;
      if (wasBackground && nextState === "active") {
        registerPushTokenWithServer();
      }
    });

    return () => subscription.remove();
  }, [registerPushTokenWithServer, scheduleRefresh]);

  useEffect(() => {
    if (Platform.OS === "web") return undefined;

    let mounted = true;
    ensureNotificationsModule().then((Notifications) => {
      if (!Notifications || !mounted) return;

      Notifications.getLastNotificationResponse().then((response) => {
        const payload = response?.notification?.request?.content?.data || null;
        const responseId =
          response?.notification?.request?.identifier ||
          response?.notification?.date ||
          "";
        if (
          payload &&
          responseId &&
          responseId !== lastHandledNotificationRef.current
        ) {
          lastHandledNotificationRef.current = responseId;
          openNotificationTarget(payload);
        }
      });

      notificationReceivedListenerRef.current =
        Notifications.addNotificationReceivedListener(() => {
          scheduleRefresh("push-foreground");
        });

      notificationResponseListenerRef.current =
        Notifications.addNotificationResponseReceivedListener((response) => {
          const payload = response?.notification?.request?.content?.data || {};
          const responseId =
            response?.notification?.request?.identifier ||
            response?.notification?.date ||
            "";
          if (responseId && responseId === lastHandledNotificationRef.current) {
            return;
          }
          lastHandledNotificationRef.current = responseId;
          openNotificationTarget(payload);
        });
    });

    return () => {
      mounted = false;
      notificationReceivedListenerRef.current?.remove?.();
      notificationResponseListenerRef.current?.remove?.();
    };
  }, [ensureNotificationsModule, openNotificationTarget, scheduleRefresh]);

  useEffect(
    () => () => {
      clearReconnectTimer();
      clearNavigationQueueTimer();
      if (refreshDebounceRef.current) {
        clearTimeout(refreshDebounceRef.current);
      }
      fetchAbortRef.current?.abort?.();
      snapshotAbortRef.current?.abort?.();
      wsRef.current?.close?.();
    },
    [clearNavigationQueueTimer, clearReconnectTimer],
  );

  const unreadCount = useMemo(() => {
    let count = 0;
    for (let i = 0; i < notifications.length; i += 1) {
      if (!notifications[i]?.read) count += 1;
    }
    return count;
  }, [notifications]);

  const contextValue = useMemo(
    () => ({
      notifications,
      unreadCount,
      loadingNotifications,
      fetchNotifications: ({ force = false } = {}) => {
        if (force) {
          scheduleRefresh("manual-fetch");
        }
      },
      markAsRead,
      markAllAsRead,
      openNotificationTarget,
      refreshPushRegistration: registerPushTokenWithServer,
    }),
    [
      loadingNotifications,
      markAllAsRead,
      markAsRead,
      notifications,
      openNotificationTarget,
      registerPushTokenWithServer,
      scheduleRefresh,
      unreadCount,
    ],
  );

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
}
