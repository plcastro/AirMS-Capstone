import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AppState,
  Platform,
  PermissionsAndroid,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthContext } from "./AuthContext";
import { API_BASE } from "../utilities/API_BASE";
import { navigate, navigationRef } from "../utilities/navigationRef";
import { savePendingRedirect } from "../utilities/pendingRedirect";
import { showToast } from "../utilities/toast";
import { consumePushInbox } from "../utilities/pushInbox";
import messaging from "@react-native-firebase/messaging";
const __DEV_LOG__ = __DEV__;
const log = (...args) => {
  //if (__DEV_LOG__) console.log("[NotificationContext]", ...args);
};

const WS_BACKOFF_BASE_MS = 1200;
const WS_BACKOFF_MAX_MS = 30000;
const REFRESH_DEBOUNCE_MS = 250;
const NAV_QUEUE_RETRY_MS = 150;
const NAV_QUEUE_MAX_ATTEMPTS = 40;
const ACTIVE_NOTIFICATION_POLL_MS = 10000;

const VALID_MODULES = new Set([
  "flight-logs",
  "pre-flight inspections",
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
  clearReadNotifications: async () => {},
  openNotificationTarget: async () => {},
  refreshPushRegistration: async () => {},
});

const getStoredToken = async () => {
  if (Platform.OS === "web") {
    const token = window.localStorage.getItem("currentUserToken");
    // console.log("Fetching stored token:", token);
    return token;
  }

  const token = await AsyncStorage.getItem("currentUserToken");
  // console.log("Fetching stored token:", token);
  return token;
};

const buildWsUrl = (token) => {
  const wsBase = String(API_BASE || "")
    .replace(/\/+$/, "")
    .replace(/^http/i, (match) =>
      match.toLowerCase() === "https" ? "wss" : "ws",
    );
  return `${wsBase}/ws?token=${encodeURIComponent(token)}`;
};

const getModuleName = (payload) =>
  String(
    payload?.module || payload?.data?.module || payload?.metadata?.module || "",
  )
    .trim()
    .toLowerCase();

const normalizePushData = (data = {}) =>
  Object.fromEntries(
    Object.entries(data || {}).map(([key, value]) => {
      if (typeof value !== "string") return [key, value];
      const trimmed = value.trim();
      if (!trimmed || !["{", "["].includes(trimmed[0])) return [key, value];
      try {
        return [key, JSON.parse(trimmed)];
      } catch {
        return [key, value];
      }
    }),
  );

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

  if (moduleName === "pre-flight inspections") {
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
    const metadata = notificationPayload?.metadata || {};
    const data = notificationPayload?.data || {};
    const isGroup =
      metadata?.notificationType === "group-message" ||
      notificationPayload?.isGroup === true ||
      String(
        notificationPayload?.isGroup || data?.isGroup || "",
      ).toLowerCase() === "true";
    const conversationId =
      notificationPayload?.conversationId ||
      data?.conversationId ||
      metadata?.conversationId ||
      null;
    const senderUserId =
      notificationPayload?.senderUserId ||
      data?.senderUserId ||
      metadata?.senderUserId ||
      null;

    return {
      screen: "Messages",
      params: {
        refreshAt: Date.now(),
        targetConversationType: isGroup ? "group" : "direct",
        targetConversationId: isGroup ? conversationId : senderUserId,
        targetMessageId:
          notificationPayload?.targetMessageId ||
          data?.targetMessageId ||
          notificationPayload?.entityId ||
          null,
      },
    };
  }

  return {
    screen: "Parts Requisition",
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
  const { user, logoutUser, refreshSession } = useContext(AuthContext);
  const [notifications, setNotifications] = useState([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [foregroundBanner, setForegroundBanner] = useState(null);

  const wsRef = useRef(null);
  const wsReconnectTimeoutRef = useRef(null);
  const wsReconnectAttemptsRef = useRef(0);
  const appStateRef = useRef(AppState.currentState);

  const fetchAbortRef = useRef(null);
  const snapshotAbortRef = useRef(null);
  const checkInFlightRef = useRef(false);
  const refreshDebounceRef = useRef(null);
  const pendingRefreshReasonRef = useRef(new Set());

  const lastHandledNotificationRef = useRef("");
  const pendingNavQueueRef = useRef([]);
  const navQueueTimerRef = useRef(null);
  const foregroundBannerTimerRef = useRef(null);

  const moduleSnapshotRef = useRef(null);
  const moduleNotifierReadyRef = useRef(false);
  const loadedNotificationsUserIdRef = useRef("");

  const handleUnauthorized = useCallback(async () => {
    const refreshedToken = await refreshSession?.();
    if (!refreshedToken) {
      setNotifications([]);
      await logoutUser?.();
      return false;
    }
    return true;
  }, [logoutUser, refreshSession]);

  const pushInAppNotification = useCallback(
    ({
      title,
      description,
      module = "parts-requisition",
      entityType = "system",
    }) => {
      const syntheticId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const nowIso = new Date().toISOString();

      setNotifications((current) => [
        {
          _id: syntheticId,
          title: String(title || "New notification"),
          description: String(description || ""),
          module,
          entityType,
          read: false,
          createdAt: nowIso,
          updatedAt: nowIso,
          localOnly: true,
        },
        ...current,
      ]);
    },
    [],
  );

  const showForegroundBanner = useCallback(({ title, body, payload }) => {
    if (Platform.OS === "web") {
      showToast(title || body);
      return;
    }

    if (foregroundBannerTimerRef.current) {
      clearTimeout(foregroundBannerTimerRef.current);
    }

    setForegroundBanner({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: String(title || "New notification"),
      body: String(body || "You have a new update."),
      payload: payload || {},
    });

    foregroundBannerTimerRef.current = setTimeout(() => {
      setForegroundBanner(null);
      foregroundBannerTimerRef.current = null;
    }, 6000);
  }, []);

  const dismissForegroundBanner = useCallback(() => {
    if (foregroundBannerTimerRef.current) {
      clearTimeout(foregroundBannerTimerRef.current);
      foregroundBannerTimerRef.current = null;
    }
    setForegroundBanner(null);
  }, []);

  const lastRegisteredPushRef = useRef({
    userId: "",
    deviceId: "",
    fcmToken: "",
  });
  const pushRegistrationInFlightRef = useRef(false);

  // const isExpoGo = Constants?.appOwnership === "expo";

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
    if (pushRegistrationInFlightRef.current) return;

    try {
      pushRegistrationInFlightRef.current = true;
      const authToken = await getStoredToken();
      if (!authToken) return;

      await messaging().registerDeviceForRemoteMessages();

      let enabled = true;

      if (Platform.OS === "ios") {
        const authorizationStatus = await messaging().requestPermission();
        enabled =
          authorizationStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          authorizationStatus === messaging.AuthorizationStatus.PROVISIONAL;
      } else if (Platform.OS === "android" && Number(Platform.Version) >= 33) {
        let granted = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        );
        if (!granted) {
          const requestResult = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
          );
          granted = requestResult === PermissionsAndroid.RESULTS.GRANTED;
        }
        enabled = granted === true;
      }

      if (!enabled) {
        console.log("Push permission denied or not granted yet");
        return;
      }

      const fcmToken = await messaging().getToken();
      if (!fcmToken) {
        throw new Error("Empty FCM token returned by messaging().getToken()");
      }
      console.log("FCM Token:", fcmToken);
      const deviceId = await getDeviceInstallationId();

      const cached = lastRegisteredPushRef.current;

      if (
        cached.userId === String(user.id) &&
        cached.deviceId === deviceId &&
        cached.fcmToken === fcmToken
      ) {
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
            fcmToken,
            platform: Platform.OS,
          }),
        },
      );

      if (!response.ok) {
        const errorBody = await response.text().catch(() => "");
        throw new Error(
          `Push registration failed (${response.status}) ${errorBody}`,
        );
      }

      lastRegisteredPushRef.current = {
        userId: String(user.id),
        deviceId,
        fcmToken,
      };

      console.log("FCM registration success");
    } catch (error) {
      console.error("FCM registration error:", error);
    } finally {
      pushRegistrationInFlightRef.current = false;
    }
  }, [getDeviceInstallationId, user?.id]);

  const fetchNotifications = useCallback(
    async ({ signal, showLoading = false } = {}) => {
      if (!user?.id) {
        setNotifications([]);
        return;
      }

      const authToken = await getStoredToken();
      if (!authToken) {
        setNotifications([]);
        return;
      }

      if (showLoading) {
        setLoadingNotifications(true);
      }
      try {
        const response = await fetch(`${API_BASE}/api/notifications`, {
          headers: { Authorization: `Bearer ${authToken}` },
          signal,
        });

        if (response.status === 401) {
          await handleUnauthorized();
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
        }
      } finally {
        if (showLoading) {
          setLoadingNotifications(false);
        }
      }
    },
    [handleUnauthorized, user?.id],
  );

  const fetchModuleSnapshot = useCallback(
    async ({ signal } = {}) => {
      if (!user?.id) return null;
      const authToken = await getStoredToken();
      if (!authToken) return null;

      const headers = { Authorization: `Bearer ${authToken}` };
      const normalizedRole = String(user?.jobTitle || "").toLowerCase();
      const canAccessTasks = [
        "superadmin",
        "maintenance manager",
        "mechanic",
      ].includes(normalizedRole);
      const canAccessLogs = normalizedRole === "superadmin";
      const canAccessRequisitions = [
        "superadmin",
        "maintenance manager",
        "mechanic",
        "officer-in-charge",
        "warehouse staff",
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

        if (
          nextSnapshot.taskCount > previousSnapshot.taskCount ||
          (nextSnapshot.latestTaskUpdatedAt &&
            nextSnapshot.latestTaskUpdatedAt !==
              previousSnapshot.latestTaskUpdatedAt)
        ) {
          showToast("You have new task updates.");
        }

        // if (
        //   nextSnapshot.latestLogId &&
        //   previousSnapshot.latestLogId &&
        //   nextSnapshot.latestLogId !== previousSnapshot.latestLogId
        // ) {
        //   showToast("New activity logs were added.");
        // }

        if (
          nextSnapshot.requisitionCount > previousSnapshot.requisitionCount ||
          (nextSnapshot.latestRequisitionUpdatedAt &&
            nextSnapshot.latestRequisitionUpdatedAt !==
              previousSnapshot.latestRequisitionUpdatedAt)
        ) {
          pushInAppNotification({
            title: "Parts requisition updated",
            description: "You have new requisition updates.",
            module: "parts-requisition",
            entityType: "requisition",
          });
        }
      } catch (error) {
        if (error?.name !== "AbortError") {
          console.error("checkModuleUpdates error:", error);
        }
      } finally {
        checkInFlightRef.current = false;
      }
    },
    [fetchModuleSnapshot, pushInAppNotification],
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
          fetchNotifications({ signal: controller.signal, showLoading: false }),
          checkModuleUpdates({ reason: reasons.join(",") }),
        ]);
      }, REFRESH_DEBOUNCE_MS);
    },
    [checkModuleUpdates, fetchNotifications],
  );

  const markAsRead = useCallback(
    async (notificationId) => {
      if (String(notificationId || "").startsWith("local-")) {
        setNotifications((currentNotifications) =>
          currentNotifications.map((notification) =>
            notification._id === notificationId
              ? { ...notification, read: true }
              : notification,
          ),
        );
        return true;
      }

      const authToken = await getStoredToken();
      if (!authToken || !notificationId) return false;

      try {
        const response = await fetch(
          `${API_BASE}/api/notifications/${notificationId}/read`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${authToken}` },
          },
        );

        if (response.status === 401) {
          await handleUnauthorized();
          return false;
        }

        if (!response.ok) {
          const errorBody = await response.json().catch(() => null);
          throw new Error(
            errorBody?.message ||
              `Failed to mark notification read (${response.status})`,
          );
        }

        setNotifications((currentNotifications) =>
          currentNotifications.map((notification) =>
            notification._id === notificationId
              ? { ...notification, read: true }
              : notification,
          ),
        );
        return true;
      } catch (error) {
        console.error("Error marking notification as read:", error);
        return false;
      }
    },
    [handleUnauthorized],
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

      if (response.status === 401) {
        await handleUnauthorized();
        return;
      }

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        throw new Error(
          errorBody?.message ||
            `Failed to mark notifications read (${response.status})`,
        );
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
  }, [handleUnauthorized]);

  const clearReadNotifications = useCallback(async () => {
    const authToken = await getStoredToken();
    if (!authToken) return;

    try {
      const hasServerReadNotifications = notifications.some(
        (notification) =>
          notification?.read &&
          !String(notification?._id || "").startsWith("local-"),
      );

      if (hasServerReadNotifications) {
        const response = await fetch(
          `${API_BASE}/api/notifications/clear-read`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${authToken}` },
          },
        );

        if (response.status === 401) {
          await handleUnauthorized();
          return;
        }

        if (!response.ok) {
          const errorBody = await response.json().catch(() => null);
          throw new Error(
            errorBody?.message ||
              `Failed to clear read notifications (${response.status})`,
          );
        }
      }

      setNotifications((currentNotifications) =>
        currentNotifications.filter((notification) => !notification.read),
      );
    } catch (error) {
      console.error("Error clearing read notifications:", error);
      showToast("Failed to clear read notifications.");
    }
  }, [handleUnauthorized, notifications]);

  const openNotificationTarget = useCallback(
    async (notificationPayload) => {
      try {
        if (!validateNotificationPayload(notificationPayload)) {
          log("notification-open:invalid-payload", notificationPayload);
          return;
        }

        const targetNavigation = buildTargetNavigation(notificationPayload);
        if (!targetNavigation) return;

        log("notification-open", getModuleName(notificationPayload));

        if (user?.id) {
          const notificationId =
            notificationPayload?._id ||
            notificationPayload?.notificationId ||
            notificationPayload?.data?.notificationId;

          if (notificationId) {
            await markAsRead(notificationId);
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
      } catch (error) {
        console.error("Failed to open notification target:", error);
        showToast("Could not open that notification.");
      }
    },
    [markAsRead, queueNavigation, user?.id],
  );

  const handleQueuedBackgroundMessages = useCallback(
    (queuedMessages = []) => {
      if (!Array.isArray(queuedMessages) || queuedMessages.length === 0) return;

      scheduleRefresh("push-background-queued");

      const latestNavigable = queuedMessages.find(
        (item) => item?.data && Object.keys(item.data).length > 0,
      );
      if (latestNavigable?.data) {
        const payload = normalizePushData(latestNavigable.data);
        const title =
          latestNavigable?.notification?.title ||
          payload?.title ||
          "New notification received";
        const body =
          latestNavigable?.notification?.body ||
          payload?.description ||
          payload?.body ||
          "You have a new update.";

        pushInAppNotification({
          title,
          description: body,
          module: getModuleName(payload) || "parts-requisition",
          entityType: payload?.entityType || "system",
        });

        const moduleName = String(payload?.module || "").toLowerCase();
        if (moduleName !== "messages") {
          showToast("You received new notifications.");
        }
      }
    },
    [pushInAppNotification, scheduleRefresh],
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
          // Let onclose handle reconnect backoff. Avoid redundant closes.
          if (
            ws.readyState === WebSocket.OPEN ||
            ws.readyState === WebSocket.CONNECTING
          ) {
            ws.close();
          }
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
    if (!user?.id) return undefined;

    const interval = setInterval(() => {
      if (appStateRef.current === "active") {
        scheduleRefresh("active-poll");
      }
    }, ACTIVE_NOTIFICATION_POLL_MS);

    return () => clearInterval(interval);
  }, [scheduleRefresh, user?.id]);

  useEffect(() => {
    const unsubscribe = messaging().onTokenRefresh(async (token) => {
      console.log("FCM token refreshed:", token);

      await registerPushTokenWithServer();
    });

    return unsubscribe;
  }, [registerPushTokenWithServer]);

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
        scheduleRefresh("app-active");
        consumePushInbox().then((queuedMessages) => {
          if (!queuedMessages.length) return;
          handleQueuedBackgroundMessages(queuedMessages);
        });
      }
    });

    return () => subscription.remove();
  }, [
    handleQueuedBackgroundMessages,
    registerPushTokenWithServer,
    scheduleRefresh,
  ]);

  useEffect(() => {
    if (Platform.OS === "web") return;

    consumePushInbox().then((queuedMessages) => {
      if (!queuedMessages.length) return;
      handleQueuedBackgroundMessages(queuedMessages);
    });

    const unsubscribeForeground = messaging().onMessage(
      async (remoteMessage) => {
        console.log("Foreground message:", remoteMessage);

        scheduleRefresh("push-foreground");

        const payload = normalizePushData(remoteMessage?.data || {});

        if (Object.keys(payload).length > 0) {
          const title =
            remoteMessage?.notification?.title || "New notification received";
          const body =
            remoteMessage?.notification?.body ||
            "You have a new update. Tap view to open.";

          pushInAppNotification({
            title,
            description: body,
            module: getModuleName(payload) || "parts-requisition",
            entityType: payload?.entityType || "system",
          });
          showForegroundBanner({ title, body, payload });
        }
      },
    );

    const unsubscribeOpened = messaging().onNotificationOpenedApp(
      (remoteMessage) => {
        console.log("Notification caused app open:", remoteMessage);

        const payload = normalizePushData(remoteMessage?.data || {});

        if (Object.keys(payload).length > 0) {
          openNotificationTarget(payload);
        }
      },
    );

    messaging()
      .getInitialNotification()
      .then((remoteMessage) => {
        if (remoteMessage) {
          console.log(
            "Notification caused app open from quit state:",
            remoteMessage,
          );

          const payload = normalizePushData(remoteMessage?.data || {});

          if (Object.keys(payload).length > 0) {
            openNotificationTarget(payload);
          }
        }
      });

    return () => {
      unsubscribeForeground();
      unsubscribeOpened();
    };
  }, [
    handleQueuedBackgroundMessages,
    openNotificationTarget,
    pushInAppNotification,
    showForegroundBanner,
  ]);

  useEffect(
    () => () => {
      clearReconnectTimer();
      clearNavigationQueueTimer();
      if (refreshDebounceRef.current) {
        clearTimeout(refreshDebounceRef.current);
      }
      if (foregroundBannerTimerRef.current) {
        clearTimeout(foregroundBannerTimerRef.current);
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
          scheduleRefresh("manual-fetch-force");
          return;
        }
        scheduleRefresh("manual-fetch");
      },
      markAsRead,
      markAllAsRead,
      clearReadNotifications,
      openNotificationTarget,
      refreshPushRegistration: registerPushTokenWithServer,
    }),
    [
      clearReadNotifications,
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
      <View style={styles.providerRoot}>
        {children}
        {foregroundBanner && (
          <Pressable
            style={styles.foregroundBanner}
            onPress={() => {
              const payload = foregroundBanner.payload;
              dismissForegroundBanner();
              if (payload && Object.keys(payload).length > 0) {
                openNotificationTarget(payload);
              }
            }}
          >
            <Text style={styles.foregroundBannerTitle} numberOfLines={1}>
              {foregroundBanner.title}
            </Text>
            <Text style={styles.foregroundBannerBody} numberOfLines={2}>
              {foregroundBanner.body}
            </Text>
          </Pressable>
        )}
      </View>
    </NotificationContext.Provider>
  );
}

const styles = StyleSheet.create({
  providerRoot: {
    flex: 1,
  },
  foregroundBanner: {
    position: "absolute",
    top: Platform.OS === "ios" ? 54 : 24,
    left: 12,
    right: 12,
    zIndex: 9999,
    elevation: 12,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    borderLeftWidth: 4,
    borderLeftColor: "#26866F",
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: "#000000",
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  foregroundBannerTitle: {
    color: "#1f1f1f",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 4,
  },
  foregroundBannerBody: {
    color: "#4f4f4f",
    fontSize: 12,
    lineHeight: 17,
  },
});
