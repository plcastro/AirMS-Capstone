import React, { useContext, useEffect, useState, useMemo } from "react";
import { Menu, Button, Modal } from "antd";
import { useNavigate, useLocation } from "react-router-dom";
import {
  BookOutlined,
  UserOutlined,
  FlagOutlined,
  LogoutOutlined,
  AuditOutlined,
  TeamOutlined,
  AreaChartOutlined,
} from "@ant-design/icons";
import AirMS_web from "../../assets/AirMS_web.png";
import AirMS_logo from "../../assets/AirMS_logo.png";
import { AuthContext } from "../../context/AuthContext";

const Sidebar = ({ collapsed }) => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const jobTitle = user?.jobTitle?.toLowerCase() || "";
  const [current, setCurrent] = useState();
  const [open, setOpen] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const menuItems = [
    {
      key: "1",
      label: "View Users",
      icon: <TeamOutlined />,
      roles: ["admin"],
    },
    {
      key: "2",
      label: "Activity Logs",
      icon: <AuditOutlined />,
      roles: ["admin"],
    },

    {
      key: "3",
      label: "Flight Logs",
      icon: <BookOutlined />,
      roles: ["maintenance manager", "pilot", "officer-in-charge", "engineer"],
    },
    {
      key: "4",
      label: "Maintenance Logs",
      icon: <BookOutlined />,
      roles: ["maintenance manager", "pilot", "officer-in-charge", "engineer"],
    },

    {
      key: "5",
      label: "Parts Lifespan Monitoring",
      icon: <BookOutlined />,
      roles: ["maintenance manager"],
    },
    {
      key: "6",
      label: "Maintenance Tracking",
      icon: <BookOutlined />,
      roles: ["maintenance manager"],
    },
    {
      key: "7",
      label: "Parts Requisition Monitoring",
      icon: <BookOutlined />,
      roles: [
        "maintenance manager",
        "officer-in-charge",
        "warehouse department",
      ],
    },
    {
      key: "8",
      label: "Maintenance Priority",
      icon: <FlagOutlined />,
      roles: ["maintenance manager"],
    },
    {
      key: "9",
      label: "Maintenance Dashboard",
      icon: <AreaChartOutlined />,
      roles: ["maintenance manager"],
    },
    {
      key: "10",
      label: "Profile",
      icon: <UserOutlined />,
      roles: ["admin", "maintenance manager", "pilot", "warehouse department"],
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
      "/dashboard/user-management/view-users": "1",
      "/dashboard/user-management/activity-logs": "2",
      "/dashboard/flight-log": "3",
      "/dashboard/maintenance-log": "4",
      "/dashboard/parts-lifespan-monitoring": "5",
      "/dashboard/maintenance-tracking": "6",
      "/dashboard/parts-requisition": "7",
      "/dashboard/maintenance-priority": "8",
      "/dashboard/maintenance-dashboard": "9",
      "/dashboard/profile": "10",
    }),
    [],
  ); // Empty array means it's created only once

  useEffect(() => {
    const key = routeToKey[location.pathname] || "10";
    setCurrent(key);
  }, [location.pathname, routeToKey]);

  const onClickMenu = (e) => {
    setCurrent(e.key);
    const routes = Object.fromEntries(
      Object.entries(routeToKey).map(([k, v]) => [v, k]),
    );
    navigate(routes[e.key] || "/dashboard/profile");
  };

  const showModal = () => setOpen(true);
  const handleOk = () => {
    setConfirmLoading(true);
    setTimeout(() => {
      setOpen(false);
      setConfirmLoading(false);
      localStorage.removeItem("currentUser");
      navigate("/login");
    }, 500);
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
        onClick={onClickMenu}
        style={{ flex: 1, borderRight: 0, textAlign: "left" }}
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
