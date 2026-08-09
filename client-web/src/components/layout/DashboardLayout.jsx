import React, { useState, useContext, useMemo, useEffect, useRef } from "react";
import { Layout, Button, theme, Grid, Row, Badge, notification } from "antd";
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  BellOutlined,
} from "@ant-design/icons";
import Sidebar from "./Sidebar";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { API_BASE } from "../../utils/API_BASE";
import PushNotificationsCard from "../common/PushNotificationsCard";
import { subscribeRealtime } from "../../utils/realtimeSocket";
import AirmsFavicon from "../../assets/favicon.ico";
import UserAvatar from "../common/UserAvatar";
import ResultPopup from "../common/ResultPopup";
import { hasNavAccess } from "../../../../shared/navigationAccess";
const { Header, Sider, Content } = Layout;
const { useBreakpoint } = Grid;
const WEB_SETTINGS_KEY = "webProfileSettings";
const MODULE_NAMES = {
  messages: "Messages",
  tasks: "Tasks",
  maintenance: "Maintenance",
  "parts-requisition": "Parts Requisition",
  "flight-log": "Flight Logs",
  reports: "Reports",
  users: "User Management",
  "parts-monitoring": "Parts Lifespan Monitoring",
};
const AIRCRAFT_FH_WARNING_SEEN_KEY = "aircraftFhDueWarningSeen";
const AIRCRAFT_FH_NOTIFICATIONS_KEY = "aircraftFhDueNotifications";
const AIRCRAFT_FH_NOTIFICATIONS_EVENT = "aircraft-fh-notifications-updated";

const getAircraftFhDueSettings = () => {
  try {
    const stored = JSON.parse(localStorage.getItem(WEB_SETTINGS_KEY) || "{}");
    return {
      enabled: stored.aircraftFhDueNotificationsEnabled === true,
      threshold:
        typeof stored.aircraftFhDueThreshold === "number"
          ? stored.aircraftFhDueThreshold
          : 25,
    };
  } catch {
    return { enabled: false, threshold: 25 };
  }
};

const areBrowserNotificationsEnabled = () => {
  try {
    const stored = JSON.parse(localStorage.getItem(WEB_SETTINGS_KEY) || "{}");
    return stored.notificationsEnabled === true;
  } catch {
    return false;
  }
};

const getLocalDateKey = () => new Date().toISOString().slice(0, 10);

const loadAircraftFhNotifications = () => {
  try {
    const stored = JSON.parse(
      localStorage.getItem(AIRCRAFT_FH_NOTIFICATIONS_KEY) || "[]",
    );
    return Array.isArray(stored) ? stored : [];
  } catch {
    return [];
  }
};

const saveAircraftFhNotifications = (notifications) => {
  localStorage.setItem(
    AIRCRAFT_FH_NOTIFICATIONS_KEY,
    JSON.stringify(notifications.slice(0, 50)),
  );
  window.dispatchEvent(new Event(AIRCRAFT_FH_NOTIFICATIONS_EVENT));
};

const getAircraftFhUnreadCount = () =>
  loadAircraftFhNotifications().filter((item) => !item.read).length;

const DashboardLayout = () => {
  const [api, contextHolder] = notification.useNotification();
  const screens = useBreakpoint();
  const [collapsed, setCollapsed] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [resultPopup, setResultPopup] = useState({
    open: false,
    status: "success",
    title: "",
    subTitle: "",
  });
  const seenNotificationIdsRef = useRef(new Set());
  const seenAircraftFhWarningsRef = useRef(new Set());
  const serverUnreadCountRef = useRef(0);
  const initialSyncDoneRef = useRef(false);
  const { user, getAuthHeader } = useContext(AuthContext);
  const userRole = String(user?.jobTitle || user?.access || "")
    .trim()
    .toLowerCase();
  const canReceiveAircraftFhDueAlerts =
    hasNavAccess(userRole, "partsLifespan") &&
    hasNavAccess(userRole, "maintenanceTracking");
  const nav = useNavigate();
  const location = useLocation();
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();
  const pageTitle = useMemo(() => {
    const routeTitles = {
      "/dashboard/user-management/view-users": "User Management",
      "/dashboard/user-management/activity-logs": "Activity Logs",
      "/dashboard/flight-log": "Flight Logs",
      "/dashboard/pre-flight inspection": "Pre-Flight Inspection",
      "/dashboard/post-flight inspection": "Post-Flight Inspection",
      "/dashboard/maintenance-log": "Maintenance Logs",
      "/dashboard/tasks": "Tasks",
      "/dashboard/mechanics": "Mechanics",
      "/dashboard/parts-lifespan-monitoring": "Parts Lifespan Monitoring",
      "/dashboard/maintenance-tracking": "Maintenance Tracking",
      "/dashboard/maintenance-priority": "Maintenance Priority Sorting",
      "/dashboard/parts-requisition": "Parts Requisition Monitoring",
      "/dashboard/maintenance-dashboard": "Reports and Analytics",
      "/dashboard/messages": "Messages",
      "/dashboard/profile": "Profile",
    };

    return routeTitles[location.pathname] || "Dashboard";
  }, [location.pathname]);

  useEffect(() => {
    const nextPopup = location.state?.resultPopup;
    if (!nextPopup) return;

    setResultPopup({
      open: true,
      status: nextPopup.status || "success",
      title: nextPopup.title || "Success",
      subTitle: nextPopup.subTitle || "",
    });

    const { resultPopup: _resultPopup, ...restState } = location.state || {};
    nav(`${location.pathname}${location.search}`, {
      replace: true,
      state: Object.keys(restState).length ? restState : null,
    });
  }, [location.pathname, location.search, location.state, nav]);

  useEffect(() => {
    let isMounted = true;

    const showNotification = ({
      title = "New Notification",
      description = "You have a new update.",
      duration = 4,
      onClick,
    } = {}) => {
      if (
        "Notification" in window &&
        Notification.permission === "granted" &&
        areBrowserNotificationsEnabled()
      ) {
        const nativeNotification = new Notification(title, {
          body: description,
          icon: AirmsFavicon,
        });

        if (onClick) {
          nativeNotification.onclick = () => {
            window.focus?.();
            onClick();
            nativeNotification.close?.();
          };
        }

        return;
      }

      api.info({
        message: title,
        description,
        placement: "topRight",
        duration,
        onClick,
      });
    };

    const goToAircraftMonitoring = (aircraft) => {
      const params = new URLSearchParams({
        refreshAt: String(Date.now()),
        aircraft: String(aircraft || ""),
      });
      nav(`/dashboard/parts-lifespan-monitoring?${params.toString()}`);
    };

    const loadSeenAircraftFhWarnings = () => {
      try {
        const stored = JSON.parse(
          localStorage.getItem(AIRCRAFT_FH_WARNING_SEEN_KEY) || "[]",
        );
        seenAircraftFhWarningsRef.current = new Set(
          Array.isArray(stored) ? stored.map(String) : [],
        );
      } catch {
        seenAircraftFhWarningsRef.current = new Set();
      }
    };

    const saveSeenAircraftFhWarnings = () => {
      try {
        localStorage.setItem(
          AIRCRAFT_FH_WARNING_SEEN_KEY,
          JSON.stringify(Array.from(seenAircraftFhWarningsRef.current)),
        );
      } catch {
        // Best effort only; repeated warnings are still bounded by the ref.
      }
    };

    const syncUnreadBadge = (serverUnread = serverUnreadCountRef.current) => {
      serverUnreadCountRef.current = serverUnread;
      setUnreadCount(serverUnread + getAircraftFhUnreadCount());
    };

    const addAircraftFhBellNotification = (notification) => {
      const currentNotifications = loadAircraftFhNotifications();
      const existingIndex = currentNotifications.findIndex(
        (item) => item._id === notification._id,
      );
      const nextNotifications =
        existingIndex >= 0
          ? currentNotifications.map((item, index) =>
              index === existingIndex ? { ...item, ...notification } : item,
            )
          : [notification, ...currentNotifications];

      saveAircraftFhNotifications(nextNotifications);
      syncUnreadBadge();
    };

    const checkAircraftFhDueWarnings = async () => {
      if (!canReceiveAircraftFhDueAlerts) {
        return;
      }

      const settings = getAircraftFhDueSettings();

      if (!settings.enabled) {
        return;
      }

      try {
        const response = await fetch(
          `${API_BASE}/api/parts-monitoring/inspection-remaining-hours`,
        );

        if (!response.ok) {
          return;
        }

        const data = await response.json();
        const threshold = Math.max(1, Number(settings.threshold) || 25);
        const rows = Array.isArray(data?.data) ? data.data : [];
        const dueSoonRows = rows
          .filter((row) => {
            if (row?.remainingHours === null || row?.remainingHours === "") {
              return false;
            }

            const remainingHours = Number(row?.remainingHours);
            return (
              Number.isFinite(remainingHours) && remainingHours <= threshold
            );
          })
          .sort(
            (left, right) =>
              Number(left.remainingHours) - Number(right.remainingHours),
          );

        if (!dueSoonRows.length) {
          return;
        }

        const nextWarning = dueSoonRows.find((row) => {
          const warningKey = [
            getLocalDateKey(),
            row.aircraft,
            row.inspectionKey || row.inspectionName,
            threshold,
          ].join("|");
          return !seenAircraftFhWarningsRef.current.has(warningKey);
        });

        if (!nextWarning) {
          return;
        }

        const warningKey = [
          getLocalDateKey(),
          nextWarning.aircraft,
          nextWarning.inspectionKey || nextWarning.inspectionName,
          threshold,
        ].join("|");
        const remainingHours = Number(nextWarning.remainingHours);
        const title =
          remainingHours <= 0
            ? `${nextWarning.aircraft} Due by FH`
            : `${nextWarning.aircraft} Almost Due`;
        const description =
          remainingHours <= 0
            ? `${nextWarning.inspectionName || "Inspection"} is due by flight hours.`
            : `${nextWarning.inspectionName || "Inspection"} is within ${remainingHours.toFixed(1)} FH.`;

        seenAircraftFhWarningsRef.current.add(warningKey);
        saveSeenAircraftFhWarnings();
        addAircraftFhBellNotification({
          _id: `aircraft-fh|${warningKey}`,
          title,
          description,
          module: "parts-monitoring",
          entityType: "parts-monitoring",
          entityId: nextWarning.aircraft,
          read: false,
          createdAt: new Date().toISOString(),
          metadata: {
            aircraft: nextWarning.aircraft,
            inspectionName: nextWarning.inspectionName || "",
            inspectionKey: nextWarning.inspectionKey || "",
            remainingHours,
            threshold,
          },
        });

        showNotification({
          title,
          description,
          duration: 8,
          onClick: () => goToAircraftMonitoring(nextWarning.aircraft),
        });
      } catch (error) {
        console.error("Aircraft FH due warning check failed:", error);
      }
    };

    const syncNotifications = async () => {
      if (!user?.id) {
        if (isMounted) {
          syncUnreadBadge(0);
        }
        return;
      }

      try {
        const response = await fetch(`${API_BASE}/api/notifications`, {
          headers: await getAuthHeader(),
        });

        if (!response.ok) {
          return;
        }

        const data = await response.json();
        const notifications = Array.isArray(data) ? data : [];

        if (!isMounted) return;

        syncUnreadBadge(notifications.filter((item) => !item.read).length);

        const nextSeenIds = new Set(seenNotificationIdsRef.current);

        const newNotifications = [];

        notifications.forEach((item) => {
          if (item?._id && !nextSeenIds.has(item._id)) {
            nextSeenIds.add(item._id);

            if (!item.read) {
              newNotifications.push(item);
            }
          }
        });

        if (!initialSyncDoneRef.current) {
          initialSyncDoneRef.current = true;
          seenNotificationIdsRef.current = nextSeenIds;
          return;
        }

        if (newNotifications.length === 1) {
          const item = newNotifications[0];

          showNotification({
            title: item.title || "New Notification",
            description: item.description || "You have a new update.",
            duration: 4,
          });
        } else if (newNotifications.length > 1) {
          // Group by module
          const modules = [
            ...new Set(
              newNotifications.map((n) => MODULE_NAMES[n.module] || "System"),
            ),
          ];

          const moduleText =
            modules.length === 1 ? modules[0] : modules.join(", ");

          showNotification({
            title: `${newNotifications.length} New Notifications`,
            description: `You have new updates from ${moduleText}.`,
            duration: 5,
          });
        }

        seenNotificationIdsRef.current = nextSeenIds;
      } catch (error) {
        console.error("Notification sync failed:", error);
      }
    };

    loadSeenAircraftFhWarnings();

    setTimeout(syncNotifications, 500);
    setTimeout(checkAircraftFhDueWarnings, 800);

    const handleWebSettingsUpdated = () => {
      loadSeenAircraftFhWarnings();
      checkAircraftFhDueWarnings();
    };
    const handleAircraftFhNotificationsUpdated = () => {
      syncUnreadBadge();
    };

    window.addEventListener("web-settings-updated", handleWebSettingsUpdated);
    window.addEventListener(
      AIRCRAFT_FH_NOTIFICATIONS_EVENT,
      handleAircraftFhNotificationsUpdated,
    );

    const unsubscribeRealtime = subscribeRealtime((payload) => {
      // console.log("Realtime payload:", JSON.stringify(payload, null, 2));

      const nextEvent = String(payload?.event || "");

      if (
        nextEvent === "notification:new" ||
        nextEvent === "notification-created"
      ) {
        if (nextEvent === "notification-created") {
          const eventData = payload?.data || {};
          const notificationId =
            eventData?.data?.notificationId ||
            eventData?.data?._id ||
            eventData?.notificationId ||
            eventData?._id;

          if (notificationId) {
            seenNotificationIdsRef.current.add(String(notificationId));
          }

          showNotification({
            title: eventData.title || "New Notification",
            description: eventData.description || "You have a new update.",
          });
          setUnreadCount((current) => current + 1);
        }

        syncNotifications();
        return;
      }

      if (
        nextEvent === "data-changed" ||
        nextEvent === "chat:message" ||
        nextEvent === "message:new" ||
        nextEvent === "chat:conversation" ||
        nextEvent === "logs:new"
      ) {
        setTimeout(syncNotifications, 500);
        if (
          nextEvent === "data-changed" &&
          (!payload?.data?.module ||
            payload.data.module === "parts-monitoring" ||
            payload.data.module === "parts-lifespan-monitoring")
        ) {
          checkAircraftFhDueWarnings();
        }
      }
    });

    return () => {
      isMounted = false;
      window.removeEventListener(
        "web-settings-updated",
        handleWebSettingsUpdated,
      );
      window.removeEventListener(
        AIRCRAFT_FH_NOTIFICATIONS_EVENT,
        handleAircraftFhNotificationsUpdated,
      );
      unsubscribeRealtime();
    };
  }, [user?.id, canReceiveAircraftFhDueAlerts, getAuthHeader, api, nav]);

  return (
    <>
      {contextHolder}
      <Layout style={{ height: "100vh", overflow: "hidden" }}>
        <Sider
          width={290}
          collapsible
          collapsed={collapsed}
          trigger={null}
          theme="light"
          breakpoint="lg"
          collapsedWidth={screens.xs ? 0 : 80}
          onBreakpoint={(broken) => {
            setCollapsed(broken);
          }}
          style={{
            position: screens.xs ? "fixed" : "relative",
            left: 0,
            top: 0,
            bottom: 0,
            height: "100vh",
            zIndex: screens.xs ? 1100 : 100,
            overflow: "auto",
            fontSize: 16,
          }}
        >
          <Sidebar
            collapsed={collapsed}
            onNavigate={() => screens.xs && setCollapsed(true)}
          />
        </Sider>

        <Layout>
          <Header
            style={{
              background: colorBgContainer,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
              padding: screens.xs ? "0 6px" : "0 12px",
              position: "sticky",
              top: 0,
              zIndex: screens.xs ? 1100 : 100,
              width: "100%",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Button
                type="text"
                icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                onClick={() => setCollapsed(!collapsed)}
                style={{
                  fontSize: 16,
                  width: 46,
                  height: 46,
                }}
              />
              <span
                style={{
                  fontSize: screens.xs ? 14 : 18,
                  fontWeight: 600,
                  color: "#1f1f1f",
                  whiteSpace: "nowrap",
                }}
              >
                {pageTitle}
              </span>
            </div>
            <Row align="middle" gutter={16}>
              <Badge count={unreadCount} size="small" offset={[-15, 3]}>
                <Button
                  icon={<BellOutlined />}
                  style={{ marginRight: 16 }}
                  onClick={() => setNotificationsOpen(true)}
                />
              </Badge>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  cursor: "pointer",
                }}
                onClick={() => nav("/dashboard/profile")}
              >
                <UserAvatar
                  image={user?.image}
                  firstName={user?.firstName}
                  lastName={user?.lastName}
                  size={40}
                  style={{ marginRight: 5, fontSize: 13 }}
                />
                {screens.md && (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                      lineHeight: 1.2,
                      marginRight: 10,
                      marginLeft: 10,
                    }}
                  >
                    <span style={{ fontWeight: 600 }}>
                      {user?.firstName.toUpperCase() +
                        " " +
                        user?.lastName.toUpperCase() || "Unknown User"}
                    </span>
                    <span style={{ fontSize: 12, color: "#888" }}>
                      {user?.jobTitle.toUpperCase() || "Unknown Job Title"}
                    </span>
                  </div>
                )}
              </div>
            </Row>
          </Header>

          <Content
            className="airms-dashboard-content"
            style={{
              height: "calc(100vh - 64px)",
              overflowY: "auto",
              overflowX: "hidden",
              background: "#f5f6f8",
              borderRadius: borderRadiusLG,
              marginTop: screens.xs ? 0 : 0,
            }}
          >
            <Outlet />
          </Content>
        </Layout>
        <PushNotificationsCard
          open={notificationsOpen}
          onClose={() => setNotificationsOpen(false)}
        />
        <ResultPopup
          open={resultPopup.open}
          status={resultPopup.status}
          title={resultPopup.title}
          subTitle={resultPopup.subTitle}
          onClose={() => setResultPopup((prev) => ({ ...prev, open: false }))}
        />
      </Layout>
    </>
  );
};

export default DashboardLayout;
