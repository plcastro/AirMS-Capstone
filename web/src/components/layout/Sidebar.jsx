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
    if (location.pathname.includes("/dashboard/view/borrow")) setCurrent("1");
    else if (location.pathname.includes("/dashboard/view/return"))
      setCurrent("2");
    else if (location.pathname.includes("/dashboard/view/records"))
      setCurrent("3");
    else if (location.pathname.includes("/dashboard/view/staff"))
      setCurrent("4");
    else if (location.pathname.includes("/dashboard/view/profile"))
      setCurrent("5");
    else setCurrent("");
  }, [location.pathname]);

  const onClickMenu = (e) => {
    setCurrent(e.key);
    switch (e.key) {
      case "1":
        navigate("/dashboard/view/borrow");
        break;
      case "2":
        navigate("/dashboard/view/return");
        break;
      case "3":
        navigate("/dashboard/view/records");
        break;
      case "4":
        navigate("/dashboard/view/staff");
        break;
      case "5":
        navigate("/dashboard/view/profile");
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
        backgroundColor: "#001529",
        color: "white",
      }}
    >
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "10px", textAlign: "left" }}>
          {/* <img
            src={logo_dark}
            alt="Logo"
            style={{ maxWidth: "200px", width: "100%", marginTop: 50 }}
          /> */}
          <h3 style={{ margin: "20px 0 10px" }}>{user.name}</h3>
          <p style={{ color: "#ccc", margin: "10px 0", fontSize: "14px" }}>
            {user.account_type}
          </p>
        </div>

        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[current]}
          defaultOpenKeys={["sub1", "sub2"]}
          onClick={onClickMenu}
          style={{ flex: 1, borderInline: "none", backgroundColor: "#001529" }}
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
          style={{ backgroundColor: "#06233dff", maxWidth: 300, width: "100%" }}
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
