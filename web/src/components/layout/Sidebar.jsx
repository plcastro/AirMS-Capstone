import React, { useContext, useEffect, useState } from "react";
import { Menu, Button, Modal } from "antd";
import { useNavigate, useLocation } from "react-router-dom";
import {
  BookOutlined,
  UserOutlined,
  UnorderedListOutlined,
  FlagOutlined,
  LogoutOutlined,
  AuditOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import AirMS_web from "../../assets/AirMS_web.png";
import AirMS_logo from "../../assets/AirMS_logo.png";
import { AuthContext } from "../../context/AuthContext";

const Sidebar = ({ collapsed }) => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [current, setCurrent] = useState("");
  const [open, setOpen] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [modalText, setModalText] = useState(
    "Are you sure you want to log out?",
  );

  const position = user?.position?.toLowerCase() || "";

  // Define all menu items with optional roles
  const menuItems = [
    {
      key: "sub1",
      label: "User Management",
      icon: <BookOutlined />,
      roles: ["admin"],
      children: [
        { key: "1", label: "View Users", icon: <TeamOutlined /> },
        { key: "2", label: "Activity Logs", icon: <AuditOutlined /> },
      ],
    },
    {
      key: "sub2",
      label: "Aircraft Logbook",
      icon: <BookOutlined />,
      roles: ["head of maintenance", "pilot", "admin"],
      children: [
        { key: "3", label: "Flight Logs", icon: <BookOutlined /> },
        { key: "4", label: "Maintenance Logs", icon: <BookOutlined /> },
      ],
    },
    {
      key: "sub3",
      label: "Parts Monitoring",
      icon: <BookOutlined />,
      roles: ["head of maintenance", "admin"],
      children: [
        { key: "5", label: "PM Table", icon: <BookOutlined /> },
        { key: "6", label: "Maintenance Tracking", icon: <BookOutlined /> },
      ],
    },
    {
      key: "7",
      label: "Inventory Management",
      icon: <UnorderedListOutlined />,
      roles: ["head of maintenance", "admin"],
    },
    {
      key: "8",
      label: "Maintenance Priority",
      icon: <FlagOutlined />,
      roles: ["head of maintenance", "admin"],
    },
    {
      key: "sub4",
      label: "Maintenance Report",
      icon: <BookOutlined />,
      roles: ["head of maintenance", "admin"],
      children: [
        { key: "9", label: "Maintenance Performance", icon: <BookOutlined /> },
        { key: "10", label: "Maintenance Summary", icon: <BookOutlined /> },
        { key: "11", label: "Maintenance History", icon: <BookOutlined /> },
        { key: "12", label: "Component Usage", icon: <BookOutlined /> },
      ],
    },
    {
      key: "13",
      label: "Profile",
      icon: <UserOutlined />,
      roles: ["admin", "head of maintenance", "pilot"],
    },
  ];

  // Filter items based on user position
  const filteredItems = menuItems
    .filter((item) => !item.roles || item.roles.includes(position))
    .map((item) => {
      if (item.children) {
        return {
          ...item,
          children: item.children.filter(
            (child) => !child.roles || child.roles.includes(position),
          ),
        };
      }
      return item;
    });

  const onClickMenu = (e) => {
    setCurrent(e.key);
    const routes = {
      1: "/dashboard/user-management/view-users",
      2: "/dashboard/user-management/activity-logs",
      3: "/dashboard/flight-log",
      4: "/dashboard/maintenance-log",
      5: "/dashboard/parts-monitoring/pm-table",
      6: "/dashboard/parts-monitoring/maintenance-tracking",
      7: "/dashboard/inventory-management",
      8: "/dashboard/maintenance-priority",
      9: "/dashboard/maintenance-report/maintenance-performance",
      10: "/dashboard/maintenance-report/maintenance-summary",
      11: "/dashboard/maintenance-report/maintenance-history",
      12: "/dashboard/maintenance-report/component-usage",
      13: "/dashboard/profile",
    };
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
        style={{ flex: 1, borderRight: 0 }}
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
        <p>{modalText}</p>
      </Modal>
    </div>
  );
};

export default Sidebar;
