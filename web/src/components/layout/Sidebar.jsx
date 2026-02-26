import React, { useEffect, useState } from "react";
import { Menu, Button, message } from "antd";
import { useNavigate, useLocation } from "react-router-dom";
import {
  BookOutlined,
  UserOutlined,
  ArrowLeftOutlined,
  UnorderedListOutlined,
  ContactsOutlined,
} from "@ant-design/icons";
import AirMS_web from "../../assets/AirMS_web.png";
const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [current, setCurrent] = useState("");
  const [user, setUser] = useState({});

  const currentUserId = JSON.parse(localStorage.getItem("currentUser"))?.userid;

  // Fetch user info based on user ID
  const fetchUserInfo = async (userid) => {
    if (!userid) return;
    try {
      const res = await fetch(`http://localhost:8000/api/users/${userid}`);
      if (!res.ok) throw new Error("Failed to fetch user info");
      const data = await res.json();
      setUser(data);
    } catch (err) {
      console.error(err);
      message.error("Failed to load user info");
    }
  };

  useEffect(() => {
    fetchUserInfo(currentUserId);

    // Listen for user updates
    const handleUserUpdate = (e) => {
      setUser(e.detail);
    };

    window.addEventListener("userUpdated", handleUserUpdate);

    return () => {
      window.removeEventListener("userUpdated", handleUserUpdate);
    };
  }, [currentUserId]);

  // Update selected menu based on path
  useEffect(() => {
    if (location.pathname.includes("/dashboard/user-management/list-of-users"))
      setCurrent("1");
    else if (
      location.pathname.includes("/dashboard/user-management/activity-logs")
    )
      setCurrent("2");
    else if (location.pathname.includes("/dashboard/")) setCurrent("3");
    else if (location.pathname.includes("/dashboard/")) setCurrent("4");
    else if (location.pathname.includes("/dashboard/profile")) setCurrent("5");
    else setCurrent("");
  }, [location.pathname]);

  const onClickMenu = (e) => {
    setCurrent(e.key);
    switch (e.key) {
      case "1":
        navigate("/dashboard/user-management");
        break;
      case "2":
        navigate("/dashboard/activity-logs");
        break;
      case "3":
        navigate("/dashboard/");
        break;
      case "4":
        navigate("/dashboard/");
        break;
      case "5":
        navigate("/dashboard/profile");
        break;
      default:
        break;
    }
  };

  const onLogout = () => {
    localStorage.removeItem("currentUser");
    navigate("/login");
  };

  return (
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#f5f5f5",
        color: "white",
      }}
    >
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <div
          style={{
            padding: "10px",
            alignItems: "center",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <img
            src={AirMS_web}
            alt="Logo"
            style={{
              maxWidth: "200px",
              width: "auto",
              height: "44px",
            }}
          />
        </div>

        <Menu
          theme="light"
          mode="inline"
          selectedKeys={[current]}
          defaultOpenKeys={["sub1", "sub2"]}
          onClick={onClickMenu}
          style={{ flex: 1, borderInline: "none", backgroundColor: "#f5f5f5" }}
          items={[
            {
              key: "sub1",
              label: "User Management",
              icon: <BookOutlined />,
              children: [
                {
                  key: "1",
                  label: "View Users",
                  icon: (
                    <BookOutlined />
                    // <img
                    //   src={BookIcon}
                    //   alt="Books"
                    //   style={{ width: 18, height: 18 }}
                    // />
                  ),
                },

                {
                  key: "2",
                  label: "Activity Logs",
                  icon: <BookOutlined />,
                },
              ],
            },
            {
              key: "sub2",
              label: "User Management",
              icon: <UserOutlined />,
              children: [
                ...(user.position !== "admin"
                  ? [
                      {
                        key: "4",
                        label: "User Management",
                        icon: <UnorderedListOutlined />,
                      },
                    ]
                  : []),
                { key: "5", label: "My Profile", icon: <ContactsOutlined /> },
              ],
            },
          ]}
        />
      </div>
      <div style={{ padding: "10px" }}>
        <Button
          type="primary"
          style={{ backgroundColor: "#26866f", maxWidth: 300, width: "100%" }}
          icon={<ArrowLeftOutlined />}
          onClick={onLogout}
        >
          Log Out
        </Button>
      </div>
    </div>
  );
};

export default Sidebar;
