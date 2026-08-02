import React, { useContext, useEffect, useState, useMemo } from "react";
import { Menu, Button, Modal, Grid, Tooltip } from "antd";
import { useNavigate, useLocation } from "react-router-dom";
import {
  ScheduleOutlined,
  UserOutlined,
  FlagOutlined,
  LogoutOutlined,
  AuditOutlined,
  TeamOutlined,
  AreaChartOutlined,
  ToolOutlined,
  DashboardOutlined,
  InboxOutlined,
  MessageOutlined,
  RocketOutlined,
} from "@ant-design/icons";
import AirMS_web from "../../assets/AirMS_web.webp";
import AirMS_logo from "../../assets/AirMS_logo.webp";
import { AuthContext } from "../../context/AuthContext";
import { hasNavAccess } from "../../../../shared/navigationAccess";

const { useBreakpoint } = Grid;

const Sidebar = ({ collapsed, onNavigate }) => {
  const isSameKeys = (a = [], b = []) =>
    a.length === b.length && a.every((key, i) => key === b[i]);

  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const { user, logoutUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const jobTitle = String(user?.jobTitle || "")
    .trim()
    .toLowerCase();
  const accessRole = String(user?.access || "")
    .trim()
    .toLowerCase();
  const role = jobTitle || accessRole;
  const [current, setCurrent] = useState();
  const [open, setOpen] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [openKeys, setOpenKeys] = useState([]);

  const menuIcon = (_title, icon) => icon;

  const wrapLabel = (text) => {
    if (collapsed) return null;

    return (
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 1,
          textTransform: "uppercase",
          opacity: 0.7,
          paddingTop: 18,
          color: "#000",
        }}
      >
        {text}
      </div>
    );
  };
  const wrapLabelSub = (text) => {
    if (collapsed) return null;

    return (
      <div
        style={{
          textWrap: "wrap",
          lineHeight: 1.5,
        }}
      >
        {text}
      </div>
    );
  };

  const menuItems = [
    // ===== GENERAL =====
    {
      type: "group",
      label: collapsed ? null : wrapLabel("GENERAL"),
      children: [
        {
          key: "13",
          title: "Maintenance Reports and Analytics",
          label: wrapLabelSub("Maintenance Reports and Analytics"),
          icon: menuIcon(
            "Maintenance Reports and Analytics",
            <AreaChartOutlined style={{ fontSize: 24 }} />,
          ),
          accessKey: "reports",
        },
        {
          key: "15",
          title: "Messages",
          label: "Messages",
          icon: menuIcon("Messages", <MessageOutlined style={{ fontSize: 24 }} />),
          accessKey: "messages",
        },
      ],
    },

    // ===== ADMINISTRATION =====
    {
      type: "group",
      label: collapsed ? null : wrapLabel("USER MANAGEMENT"),
      children: [
        {
          key: "1",
          title: "Manage Users",
          label: "Manage Users",
          icon: menuIcon("Manage Users", <TeamOutlined style={{ fontSize: 24 }} />),
          accessKey: "userManagement",
        },
        {
          key: "2",
          title: "Activity Logs",
          label: "Activity Logs",
          icon: menuIcon("Activity Logs", <AuditOutlined style={{ fontSize: 24 }} />),
          accessKey: "activityLogs",
        },
      ],
    },

    // ===== AIRCRAFT HEALTH LOGBOOK =====
    {
      type: "group",
      label: collapsed ? null : wrapLabel("AIRCRAFT HEALTH LOGBOOK"),
      children: [
        {
          key: "3",
          title: "Flight Logs",
          label: "Flight Logs",
          icon: menuIcon("Flight Logs", <RocketOutlined style={{ fontSize: 24 }} />),
          accessKey: "flightLogs",
        },
        {
          key: "4",
          title: "Maintenance Logs",
          label: "Maintenance Logs",
          icon: menuIcon(
            "Maintenance Logs",
            <ToolOutlined style={{ fontSize: 24 }} />,
          ),
          accessKey: "maintenanceLogs",
        },
        {
          key: "5",
          title: "Pre-Inspection",
          label: "Pre-Inspection",
          icon: menuIcon("Pre-Inspection", <AuditOutlined style={{ fontSize: 24 }} />),
          accessKey: "preInspection",
        },
        {
          key: "6",
          title: "Post-Inspection",
          label: "Post-Inspection",
          icon: menuIcon("Post-Inspection", <AuditOutlined style={{ fontSize: 24 }} />),
          accessKey: "postInspection",
        },
      ],
    },

    // ===== TASK MANAGEMENT =====
    {
      type: "group",
      label: collapsed ? null : wrapLabel("TASK ASSIGNMENT & MONITORING"),
      children: [
        {
          key: "7",
          title: "Tasks",
          label: "Tasks",
          icon: menuIcon("Tasks", <ScheduleOutlined style={{ fontSize: 24 }} />),
          accessKey: "tasks",
        },
        {
          key: "8",
          title: "Mechanics",
          label: "Mechanics",
          icon: menuIcon("Mechanics", <TeamOutlined style={{ fontSize: 24 }} />),
          accessKey: "mechanics",
        },
      ],
    },

    // ===== MAINTENANCE TRACKING =====
    {
      type: "group",
      label: collapsed
        ? null
        : wrapLabel("PARTS LIFESPAN & MAINTENANCE TRACKING"),
      children: [
        {
          key: "9",
          title: "Parts Lifespan Monitoring",
          label: wrapLabelSub("Parts Lifespan Monitoring"),
          icon: menuIcon(
            "Parts Lifespan Monitoring",
            <DashboardOutlined style={{ fontSize: 24 }} />,
          ),
          accessKey: "partsLifespan",
        },
        {
          key: "10",
          title: "Maintenance Tracking",
          label: wrapLabelSub("Maintenance Tracking"),
          icon: menuIcon(
            "Maintenance Tracking",
            <ScheduleOutlined style={{ fontSize: 24 }} />,
          ),
          accessKey: "maintenanceTracking",
        },
        {
          key: "11",
          title: "Maintenance Priority Sorting",
          label: wrapLabelSub("Maintenance Priority Sorting"),
          icon: menuIcon(
            "Maintenance Priority Sorting",
            <FlagOutlined style={{ fontSize: 24 }} />,
          ),
          accessKey: "maintenancePriority",
        },
      ],
    },

    // ===== PARTS REQUISITION =====
    {
      type: "group",
      label: collapsed ? null : wrapLabel("Parts Requisition Monitoring"),
      children: [
        {
          key: "12",
          title: "Parts Requisition Monitoring",
          label: wrapLabelSub("Parts Requisition Monitoring"),
          icon: menuIcon(
            "Parts Requisition Monitoring",
            <InboxOutlined style={{ fontSize: 24 }} />,
          ),
          accessKey: "partsRequisition",
        },
      ],
    },
    {
      type: "group",
      label: collapsed ? null : wrapLabel("SETTINGS"),
      children: [
        {
          key: "14",
          title: "Profile",
          label: "Profile",
          icon: menuIcon("Profile", <UserOutlined style={{ fontSize: 24 }} />),
          accessKey: "profile",
        },
      ],
    },
  ];

  // Filter items based on user jobTitle
  const filteredItems = menuItems
    .map((item) => {
      if (item.children) {
        const filteredChildren = item.children.filter((child) =>
          hasNavAccess(role, child.accessKey),
        );

        if (!filteredChildren.length) return null;

        return {
          ...item,
          children: filteredChildren,
        };
      }

      if (hasNavAccess(role, item.accessKey)) {
        return item;
      }

      return null;
    })
    .filter(Boolean);

  const routeToKey = useMemo(
    () => ({
      "/dashboard/user-management/view-users": "1",
      "/dashboard/user-management/activity-logs": "2",
      "/dashboard/flight-log": "3",
      "/dashboard/maintenance-log": "4",
      "/dashboard/pre-inspection": "5",
      "/dashboard/post-inspection": "6",
      "/dashboard/tasks": "7",
      "/dashboard/mechanics": "8",
      "/dashboard/parts-lifespan-monitoring": "9",
      "/dashboard/maintenance-tracking": "10",
      "/dashboard/parts-requisition": "12",
      "/dashboard/maintenance-priority": "11",
      "/dashboard/maintenance-dashboard": "13",
      "/dashboard/profile": "14",
      "/dashboard/messages": "15",
    }),
    [],
  );

  const parentByChildKey = useMemo(() => {
    const map = {};
    filteredItems.forEach((item) => {
      if (item.children?.length) {
        item.children.forEach((child) => {
          map[child.key] = item.key;
        });
      }
    });
    return map;
  }, [filteredItems]);

  useEffect(() => {
    const key =
      routeToKey[location.pathname] || (role === "superadmin" ? "2" : "11");
    setCurrent(key);
  }, [location.pathname, routeToKey, role]);

  const onClickMenu = (e) => {
    setCurrent(e.key);
    const routes = Object.fromEntries(
      Object.entries(routeToKey).map(([k, v]) => [v, k]),
    );
    navigate(
      routes[e.key] ||
        (role === "superadmin"
          ? "/dashboard/user-management/view-users"
          : "/dashboard/profile"),
    );
    if (isMobile) {
      onNavigate?.();
    }
  };

  const onOpenChange = (keys) => {
    if (isMobile) {
      const latest = keys.find((k) => !openKeys.includes(k));
      setOpenKeys(latest ? [latest] : []);
    } else {
      setOpenKeys(keys);
    }
  };

  useEffect(() => {
    if (collapsed) setOpenKeys([]);
  }, [collapsed]);

  const showModal = () => setOpen(true);

  const handleOk = async () => {
    setConfirmLoading(true);
    await logoutUser();
    setConfirmLoading(false);
    setOpen(false);
    navigate("/login");
  };
  const handleCancel = () => setOpen(false);

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#ffffff",
      }}
    >
      {/* HEADER */}
      <div
        style={{
          height: 64,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",

          padding: "10px",
        }}
      >
        {!collapsed ? (
          <img
            src={AirMS_web}
            alt="Logo"
            style={{
              maxWidth: 130,
              height: 40,
              objectFit: "contain",
            }}
          />
        ) : (
          <img
            src={AirMS_logo}
            alt="Logo"
            style={{
              width: 40,
              height: 40,
              objectFit: "contain",
            }}
          />
        )}
      </div>

      {/* MENU WRAPPER */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
        }}
      >
        <Menu
          className="sidebar-menu"
          theme="light"
          mode="inline"
          selectedKeys={[current]}
          openKeys={openKeys}
          onOpenChange={onOpenChange}
          onClick={onClickMenu}
          items={filteredItems}
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            borderRight: 0,
            textAlign: "left",
          }}
        />
      </div>

      {/* FOOTER */}
      <div
        style={{
          padding: 12,
          background: "#ffffff",
        }}
      >
        <Tooltip
          title={collapsed ? "Logout" : ""}
          placement="right"
          mouseEnterDelay={0.2}
        >
          <Button
            type="primary"
            danger
            block
            icon={<LogoutOutlined />}
            onClick={showModal}
            style={{
              height: 40,
              borderRadius: 8,
              fontWeight: 500,
            }}
          >
            {!collapsed && "Logout"}
          </Button>
        </Tooltip>
      </div>

      {/* MODAL */}
      <Modal
        title="Confirm Logout"
        open={open}
        centered
        zIndex={2100}
        onOk={handleOk}
        okText={"Yes, logout"}
        confirmLoading={confirmLoading}
        onCancel={handleCancel}
      >
        <p>Are you sure you want to log out?</p>
      </Modal>
    </div>
  );
};

export default Sidebar;
