import React, { useContext, useEffect, useState, useMemo } from "react";
import { Menu, Button, Modal, Grid } from "antd";
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
} from "@ant-design/icons";
import AirMS_web from "../../assets/AirMS_web.png";
import AirMS_logo from "../../assets/AirMS_logo.png";
import { AuthContext } from "../../context/AuthContext";

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
          label: wrapLabelSub("Maintenance Reports and Analytics"),
          icon: <AreaChartOutlined style={{ fontSize: 24 }} />,
          roles: ["admin", "maintenance manager", "officer-in-charge"],
        },
        {
          key: "15",
          label: "Messages",
          icon: <MessageOutlined style={{ fontSize: 24 }} />,
          roles: [
            "admin",
            "maintenance manager",
            "officer-in-charge",
            "warehouse department",
            "mechanic",
          ],
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
          label: "Manage Users",
          icon: <TeamOutlined style={{ fontSize: 24 }} />,
          roles: ["admin"],
        },
        {
          key: "2",
          label: "Activity Logs",
          icon: <AuditOutlined style={{ fontSize: 24 }} />,
          roles: ["admin"],
        },
      ],
    },

    // ===== AIRCRAFT HEALTH LOGBOOK =====
    {
      type: "group",
      label: collapsed ? null : wrapLabel("AIRCRAFT HEALTH LOGBOOK"),
      roles: [
        "admin",
        "maintenance manager",
        "officer-in-charge",
        "mechanic",
        "pilot",
      ],
      children: [
        {
          key: "3",
          label: "Flight Logs",
          icon: (
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 24 }}
            >
              helicopter
            </span>
          ),
          roles: [
            "admin",
            "maintenance manager",
            "officer-in-charge",
            "pilot",
            "mechanic",
          ],
        },
        {
          key: "4",
          label: "Maintenance Logs",
          icon: <ToolOutlined style={{ fontSize: 24 }} />,
          roles: [
            "admin",
            "maintenance manager",
            "officer-in-charge",
            "mechanic",
          ],
        },
        {
          key: "5",
          label: "Pre-Inspection",
          icon: <AuditOutlined style={{ fontSize: 24 }} />,
          roles: [
            "admin",
            "maintenance manager",
            "officer-in-charge",
            "pilot",
            "mechanic",
          ],
        },
        {
          key: "6",
          label: "Post-Inspection",
          icon: <AuditOutlined style={{ fontSize: 24 }} />,
          roles: [
            "admin",
            "maintenance manager",
            "officer-in-charge",
            "mechanic",
          ],
        },
      ],
    },

    // ===== TASK MANAGEMENT =====
    {
      type: "group",
      label: collapsed ? null : wrapLabel("TASK ASSIGNMENT & MONITORING"),
      roles: ["admin", "maintenance manager", "mechanic"],
      children: [
        {
          key: "7",
          label: "Tasks",
          icon: <ScheduleOutlined style={{ fontSize: 24 }} />,
          roles: ["admin", "maintenance manager", "mechanic"],
        },
        {
          key: "8",
          label: "Mechanics",
          icon: <TeamOutlined style={{ fontSize: 24 }} />,
          roles: ["admin", "maintenance manager"],
        },
      ],
    },

    // ===== MAINTENANCE TRACKING =====
    {
      type: "group",
      label: collapsed
        ? null
        : wrapLabel("PARTS LIFESPAN & MAINTENANCE TRACKING"),
      roles: ["admin", "maintenance manager", "officer-in-charge"],
      children: [
        {
          key: "9",
          label: wrapLabelSub("Parts Lifespan Monitoring"),
          icon: <DashboardOutlined style={{ fontSize: 24 }} />,
          roles: ["admin", "maintenance manager", "officer-in-charge"],
        },
        {
          key: "10",
          label: wrapLabelSub("Maintenance Tracking"),
          icon: <ScheduleOutlined style={{ fontSize: 24 }} />,
          roles: ["admin", "maintenance manager", "officer-in-charge"],
        },
        {
          key: "11",
          label: wrapLabelSub("Maintenance Priority Sorting"),
          icon: <FlagOutlined style={{ fontSize: 24 }} />,
          roles: ["admin", "maintenance manager"],
        },
      ],
    },

    // ===== PARTS REQUISITION =====
    {
      type: "group",
      label: collapsed ? null : wrapLabel("Parts Requisition Monitoring"),
      roles: [
        "admin",
        "warehouse department",
        "maintenance manager",
        "officer-in-charge",
        "mechanic",
      ],
      children: [
        {
          key: "12",
          label: wrapLabelSub("Parts Requisition Monitoring"),
          icon: <InboxOutlined style={{ fontSize: 24 }} />,
          roles: [
            "admin",
            "warehouse department",
            "maintenance manager",
            "officer-in-charge",
            "mechanic",
          ],
        },
      ],
    },
    {
      type: "group",
      label: collapsed ? null : wrapLabel("SETTINGS"),
      roles: [
        "admin",
        "warehouse department",
        "maintenance manager",
        "officer-in-charge",
        "mechanic",
      ],
      children: [
        {
          key: "14",
          label: "Profile",
          icon: <UserOutlined style={{ fontSize: 24 }} />,
          roles: [
            "maintenance manager",
            "officer-in-charge",
            "warehouse department",
            "admin",
            "mechanic",
          ],
        },
      ],
    },
  ];

  // Filter items based on user jobTitle
  const filteredItems = menuItems
    .map((item) => {
      if (item.children) {
        const filteredChildren = item.children.filter(
          (child) => !child.roles || child.roles.includes(role),
        );

        if (!filteredChildren.length) return null;

        return {
          ...item,
          children: filteredChildren,
        };
      }

      if (!item.roles || item.roles.includes(role)) {
        return item;
      }

      return null;
    })
    .filter(Boolean);

  const routeToKey = useMemo(
    () => ({
      // "/dashboard/user-management/admin-dashboard": "1",
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
      routeToKey[location.pathname] || (role === "admin" ? "2" : "11");
    setCurrent(key);
  }, [location.pathname, routeToKey, role]);

  const onClickMenu = (e) => {
    setCurrent(e.key);
    const routes = Object.fromEntries(
      Object.entries(routeToKey).map(([k, v]) => [v, k]),
    );
    navigate(
      routes[e.key] ||
        (role === "admin"
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
      </div>

      {/* MODAL */}
      <Modal
        title="Confirm Logout"
        open={open}
        centered
        zIndex={2100}
        onOk={handleOk}
        confirmLoading={confirmLoading}
        onCancel={handleCancel}
      >
        <p>Are you sure you want to log out?</p>
      </Modal>
    </div>
  );
};

export default Sidebar;
