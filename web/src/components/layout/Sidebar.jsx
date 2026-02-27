import React, { useEffect, useState } from "react";
import { Menu, Button, message } from "antd";
import { useNavigate, useLocation } from "react-router-dom";
import {
  BookOutlined,
  UserOutlined,
  UnorderedListOutlined,
  FlagOutlined,
  LogoutOutlined,
} from "@ant-design/icons";
import AirMS_web from "../../assets/AirMS_web.png";

const Sidebar = ({ collapsed }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [current, setCurrent] = useState("");
  const [user, setUser] = useState({});

  const currentUserId = JSON.parse(localStorage.getItem("currentUser"))?.userid;

  useEffect(() => {
    if (!currentUserId) return;
    fetch(`http://localhost:8000/api/users/${currentUserId}`)
      .then((res) => res.json())
      .then((data) => setUser(data))
      .catch(() => message.error("Failed to load user info"));
  }, [currentUserId]);

  useEffect(() => {
    if (location.pathname.includes("/dashboard/user-management/list-of-users"))
      setCurrent("1");
    else if (
      location.pathname.includes("/dashboard/user-management/activity-logs")
    )
      setCurrent("2");
    else if (location.pathname.includes("/dashboard/flight-log"))
      setCurrent("3");
    else if (location.pathname.includes("/dashboard/maintenance-log"))
      setCurrent("4");
    else if (location.pathname.includes("/dashboard/profile")) setCurrent("13");
    else setCurrent("");
  }, [location.pathname]);

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

  const onLogout = () => {
    localStorage.removeItem("currentUser");
    navigate("/login");
  };

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <div
        style={{
          justifyContent: "center",
          alignItems: "center",
          padding: "16px",
          display: "flex",
        }}
      >
        <img
          src={AirMS_web}
          alt="Logo"
          style={{
            maxWidth: collapsed ? "50px" : "180px",
            transition: "all 0.3s",
            height: "40px",
          }}
        />
      </div>

      <Menu
        theme="light"
        mode="inline"
        selectedKeys={[current]}
        onClick={onClickMenu}
        style={{ flex: 1, borderRight: 0 }}
        items={[
          {
            key: "sub1",
            label: "User Management",
            icon: <BookOutlined />,
            children: [
              { key: "1", label: "View Users", icon: <BookOutlined /> },
              { key: "2", label: "Activity Logs", icon: <BookOutlined /> },
            ],
          },
          {
            key: "sub2",
            label: "Aircraft Logbook",
            icon: <BookOutlined />,
            children: [
              { key: "3", label: "Flight Logs", icon: <BookOutlined /> },
              { key: "4", label: "Maintenance Logs", icon: <BookOutlined /> },
            ],
          },
          {
            key: "sub3",
            label: "Parts Monitoring",
            icon: <BookOutlined />,
            children: [
              { key: "5", label: "PM Table", icon: <BookOutlined /> },
              {
                key: "6",
                label: "Maintenance Tracking",
                icon: <BookOutlined />,
              },
            ],
          },
          {
            key: "7",
            label: "Inventory Management",
            icon: <UnorderedListOutlined />,
          },
          { key: "8", label: "Maintenance Priority", icon: <FlagOutlined /> },
          {
            key: "sub4",
            label: "Maintenance Report",
            icon: <BookOutlined />,
            children: [
              {
                key: "9",
                label: "Maintenance Performance",
                icon: <BookOutlined />,
              },
              {
                key: "10",
                label: "Maintenance Summary",
                icon: <BookOutlined />,
              },
              {
                key: "11",
                label: "Maintenance History",
                icon: <BookOutlined />,
              },
              { key: "12", label: "Component Usage", icon: <BookOutlined /> },
            ],
          },
          { key: "13", label: "Profile", icon: <UserOutlined /> },
        ]}
      />
      <div style={{ padding: "16px", textAlign: "center" }}>
        <Button
          type="primary"
          block
          onClick={onLogout}
          icon={<LogoutOutlined />}
        >
          Log Out
        </Button>
      </div>
    </div>
  );
};

export default Sidebar;
