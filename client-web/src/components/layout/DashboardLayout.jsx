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
const { Header, Sider, Content } = Layout;
const { AirmsFavicon } = "../assets/favicon.ico";
const { useBreakpoint } = Grid;

const getUserInitials = (firstName = "", lastName = "", fallback = "U") => {
  const initials = `${String(firstName).charAt(0)}${String(lastName).charAt(0)}`
    .toUpperCase()
    .trim();
  return initials || fallback;
};

const DashboardLayout = () => {
  const [api, contextHolder] = notification.useNotification();
  const screens = useBreakpoint();
  const [collapsed, setCollapsed] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const seenNotificationIdsRef = useRef(new Set());
  const initialSyncDoneRef = useRef(false);
  const { user, getAuthHeader } = useContext(AuthContext);
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
      "/dashboard/pre-inspection": "Pre-Inspection",
      "/dashboard/post-inspection": "Post-Inspection",
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
  const moduleNames = {
    messages: "Messages",
    tasks: "Tasks",
    maintenance: "Maintenance",
    "parts-requisition": "Parts Requisition",
    "flight-log": "Flight Logs",
    reports: "Reports",
    users: "User Management",
  };
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const syncNotifications = async () => {
      if (!user?.id) {
        if (isMounted) {
          setUnreadCount(0);
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

        setUnreadCount(notifications.filter((item) => !item.read).length);

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

        if (newNotifications.length === 1) {
          const item = newNotifications[0];

          api.info({
            title: item.title || "New Notification",
            description: item.description || "You have a new update.",
            placement: "topRight",
            duration: 4,
          });

          if (
            "Notification" in window &&
            Notification.permission === "granted"
          ) {
            new Notification(item.title || "New Notification", {
              body: item.description || "You have a new update.",
              icon: AirmsFavicon,
            });
          }
        } else if (newNotifications.length > 1) {
          // Group by module
          const modules = [
            ...new Set(
              newNotifications.map((n) => moduleNames[n.module] || "System"),
            ),
          ];

          const moduleText =
            modules.length === 1 ? modules[0] : modules.join(", ");

          api.info({
            title: `${newNotifications.length} New Notifications`,
            description: `You have new updates from ${moduleText}.`,
            placement: "topRight",
            duration: 5,
          });

          if (
            "Notification" in window &&
            Notification.permission === "granted"
          ) {
            new Notification(`${newNotifications.length} New Notifications`, {
              body: `You have new updates from ${moduleText}.`,
              icon: AirmsFavicon,
            });
          }
        }

        seenNotificationIdsRef.current = nextSeenIds;
      } catch (error) {
        console.error("Notification sync failed:", error);
      }
    };

    setTimeout(syncNotifications, 500);

    const unsubscribeRealtime = subscribeRealtime((payload) => {
      // console.log("Realtime payload:", JSON.stringify(payload, null, 2));

      const nextEvent = String(payload?.event || "");

      if (
        nextEvent === "data-changed" ||
        nextEvent === "chat:message" ||
        nextEvent === "message:new" ||
        nextEvent === "chat:conversation" ||
        nextEvent === "logs:new"
      ) {
        // console.log("Refreshing notifications...");
        setTimeout(syncNotifications, 500);
      }
    });

    return () => {
      isMounted = false;
      unsubscribeRealtime();
    };
  }, [user?.id, getAuthHeader, api]);

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
              padding: "0 12px",
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
                {user?.image ? (
                  <img
                    src={
                      user.image.startsWith("http")
                        ? user.image
                        : `${API_BASE}${user.image}`
                    }
                    alt="User"
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: "50%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: "50%",
                      marginRight: 5,
                      backgroundColor: "#E9F4F1",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      userSelect: "none",
                    }}
                  >
                    <span
                      style={{
                        color: "#26866F",
                        fontWeight: 700,
                        fontSize: 13,
                      }}
                    >
                      {getUserInitials(user?.firstName, user?.lastName)}
                    </span>
                  </div>
                )}
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
      </Layout>
    </>
  );
};

export default DashboardLayout;
