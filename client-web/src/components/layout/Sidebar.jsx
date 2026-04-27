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
  const jobTitle = user?.jobTitle?.toLowerCase() || "";
  const [current, setCurrent] = useState();
  const [open, setOpen] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [openKeys, setOpenKeys] = useState([]);
  const menuItems = [
    {
      key: "1",
      label: "Admin Dashboard",
      icon: <DashboardOutlined style={{ fontSize: 24 }} />,
      roles: ["admin"],
    },

    {
      key: "2",
      label: "Manage Users",
      icon: <TeamOutlined style={{ fontSize: 24 }} />,
      roles: ["admin"],
    },
    {
      key: "3",
      label: "Activity Logs",
      icon: <AuditOutlined style={{ fontSize: 24 }} />,
      roles: ["admin"],
    },
    {
      key: "4-5",
      label: "Aircraft Health Logbook",
      icon: <AuditOutlined style={{ fontSize: 24 }} />,
      roles: ["maintenance manager", "officer-in-charge", "mechanic"],
      children: [
        {
          key: "4",
          label: "Flight Logs",
          icon: (
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 24 }}
            >
              helicopter
            </span>
          ),
          roles: ["maintenance manager", "officer-in-charge"],
        },
        {
          key: "5",
          label: "Maintenance Logs",
          icon: <ToolOutlined style={{ fontSize: 24 }} />,
          roles: ["maintenance manager", "officer-in-charge", "mechanic"],
        },
      ],
    },

    {
      key: "6-7-9",
      label: "Parts Lifespan Monitoring and Maintenance tracking",
      icon: <DashboardOutlined style={{ fontSize: 24 }} />,
      roles: ["maintenance manager", "officer-in-charge"],
      children: [
        {
          key: "6",
          label: "Parts Lifespan Monitoring",
          icon: <DashboardOutlined style={{ fontSize: 24 }} />,
          roles: ["maintenance manager", "officer-in-charge"],
        },
        {
          key: "7",
          label: "Maintenance Tracking",
          icon: <ScheduleOutlined style={{ fontSize: 24 }} />,
          roles: ["maintenance manager", "officer-in-charge"],
        },
        {
          key: "9",
          label: "Maintenance Priority Sorting",
          icon: <FlagOutlined style={{ fontSize: 24 }} />,
          roles: ["maintenance manager"],
        },
      ],
    },
    {
      key: "8",
      label: "Parts Requisition Monitoring",
      icon: <InboxOutlined style={{ fontSize: 24 }} />,
      roles: ["warehouse department"],
    },
    {
      key: "10",
      label: "Reports and Analytics",
      icon: <AreaChartOutlined style={{ fontSize: 24 }} />,
      roles: ["maintenance manager", "officer-in-charge"],
    },
    {
      key: "11",
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
  ];

  // Filter items based on user jobTitle
  const filteredItems = menuItems
    .filter((item) => !item.roles || item.roles.includes(jobTitle))
    .map((item) => {
      if (item.children) {
        return {
          ...item,
          children: item.children.filter(
            (child) => !child.roles || child.roles.includes(jobTitle),
          ),
        };
      }
      return item;
    });

  const routeToKey = useMemo(
    () => ({
      "/dashboard/user-management/admin-dashboard": "1",
      "/dashboard/user-management/view-users": "2",
      "/dashboard/user-management/activity-logs": "3",
      "/dashboard/flight-log": "4",
      "/dashboard/maintenance-log": "5",
      "/dashboard/parts-lifespan-monitoring": "6",
      "/dashboard/maintenance-tracking": "7",
      "/dashboard/parts-requisition": "8",
      "/dashboard/maintenance-priority": "9",
      "/dashboard/maintenance-dashboard": "10",
      "/dashboard/profile": "11",
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
      routeToKey[location.pathname] || (jobTitle === "admin" ? "1" : "10");
    setCurrent(key);
  }, [location.pathname, routeToKey, jobTitle]);

  useEffect(() => {
    const parent = current ? parentByChildKey[current] : null;

    setOpenKeys((prev) => {
      let next = prev;

      if (collapsed) {
        next = [];
      } else if (isMobile) {
        next = parent ? [parent] : [];
      } else if (parent) {
        next = prev.includes(parent) ? prev : [...prev, parent];
      }

      return isSameKeys(prev, next) ? prev : next;
    });
  }, [collapsed, current, isMobile, parentByChildKey]);

  const onClickMenu = (e) => {
    setCurrent(e.key);
    const routes = Object.fromEntries(
      Object.entries(routeToKey).map(([k, v]) => [v, k]),
    );
    navigate(
      routes[e.key] ||
        (jobTitle === "admin"
          ? "/dashboard/user-management/admin-dashboard"
          : "/dashboard/profile"),
    );
    if (isMobile) {
      onNavigate?.();
    }
  };

  const onOpenChange = (nextOpenKeys) => {
    if (!isMobile) {
      setOpenKeys((prev) =>
        isSameKeys(prev, nextOpenKeys) ? prev : nextOpenKeys,
      );
      return;
    }

    const latestOpenedKey = nextOpenKeys.find((k) => !openKeys.includes(k));
    const next = latestOpenedKey ? [latestOpenedKey] : [];
    setOpenKeys((prev) => (isSameKeys(prev, next) ? prev : next));
  };

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
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <div
        style={{
          justifyContent: "center",
          alignItems: "center",
          height: 64,
          display: "flex",
        }}
      >
        {!collapsed ? (
          <img
            src={AirMS_web}
            alt="Logo"
            style={{ maxWidth: 120, height: 40 }}
          />
        ) : (
          <img
            src={AirMS_logo}
            alt="Logo"
            style={{ maxWidth: 40, height: 40 }}
          />
        )}
      </div>

      <Menu
        theme="light"
        mode="inline"
        selectedKeys={[current]}
        openKeys={openKeys}
        onOpenChange={onOpenChange}
        onClick={onClickMenu}
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          borderRight: 0,
          textAlign: "left",
        }}
        items={filteredItems}
      />

      <div style={{ padding: "16px" }}>
        <Button
          type="primary"
          danger
          block
          icon={<LogoutOutlined />}
          onClick={showModal}
        >
          {collapsed ? "" : "Logout"}
        </Button>
      </div>

      <Modal
        title="Confirm Logout"
        open={open}
        centered
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
