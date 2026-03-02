import React, { useState, useEffect } from "react";
import { Input, Select, Button, Divider } from "antd";
import UserTable from "../../../components/tables/UserTable";
import UserModal from "../../../components/common/UserForm";
import { API_BASE } from "../../../utils/API_BASE";
import { UserAddOutlined } from "@ant-design/icons";

const filterData = {
  Position: ["Admin", "Head of Maintenance", "Pilot", "Manager", "Mechanic"],
  "Access Level": ["Admin", "Superuser", "User"],
  Status: ["active", "inactive", "deactivated"],
};
const filterCategories = Object.keys(filterData);

export default function UserManagement() {
  const [allUsers, setAllUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentUserId, setCurrentUserId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(filterCategories[0]);
  const [subOptions, setSubOptions] = useState(filterData[filterCategories[0]]);
  const [selectedValue, setSelectedValue] = useState("all");

  const headers = [
    { label: "#", key: "index" },
    { label: "Fullname", key: "fullname" },
    { label: "Username", key: "username" },
    { label: "Email", key: "email" },
    { label: "Position", key: "position" },
    { label: "Access Control", key: "access" },
    { label: "Date Created", key: "dateCreated" },
    { label: "Status", key: "status" },
    { label: "Actions", key: "actions" },
  ];

  useEffect(() => {
    const storedUser = localStorage.getItem("currentUser");
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        setCurrentUserId(parsed.userid || parsed._id || parsed.id);
      } catch (err) {
        console.error("Error parsing currentUser:", err);
      }
    }
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/user/getAllUsers`);
      const json = await res.json();
      if (Array.isArray(json.data)) {
        const formatted = json.data.map((u, idx) => ({
          ...u,
          index: idx + 1,
          fullname: `${u.firstName || ""} ${u.lastName || ""}`.trim(),
          dateCreated: u.dateCreated
            ? new Date(u.dateCreated).toLocaleString()
            : "N/A",
        }));
        setAllUsers(formatted);
        setFilteredUsers(formatted);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCategoryChange = (value) => {
    setSelectedCategory(value);
    setSubOptions(filterData[value]);
    setSelectedValue("all"); // Reset value when category changes
  };

  // 4. Handle Value Change (Second Select)
  const handleValueChange = (value) => {
    setSelectedValue(value);
  };
  useEffect(() => {
    let filtered = [...allUsers];
    if (selectedValue !== "all") {
      // Map Category names to the actual keys in your user object
      const keyMap = {
        Position: "position",
        "Access Level": "access",
        Status: "status",
      };
      const filterKey = keyMap[selectedCategory];
      filtered = filtered.filter((u) => u[filterKey] === selectedValue);
    }
    if (searchQuery.trim()) {
      filtered = filtered.filter((u) =>
        [u.fullname, u.username, u.email, u.position, u.access]
          .join(" ")
          .toLowerCase()
          .includes(searchQuery.toLowerCase()),
      );
    }
    setFilteredUsers(filtered);
  }, [allUsers, selectedCategory, selectedValue, searchQuery]);

  const handleAddUser = () => {
    setEditingUser(null);
    setShowModal(true);
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setShowModal(true);
  };

  const handleDeactivateUser = async (user) => {
    if (user._id === currentUserId) return;
    await fetch(`${API_BASE}/api/user/updateUserStatus/${user._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "deactivated" }),
    });
    fetchUsers();
  };

  const handleReactivateUser = async (user) => {
    await fetch(`${API_BASE}/api/user/updateUserStatus/${user._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "active" }),
    });
    fetchUsers();
  };

  const handleModalClose = () => {
    setShowModal(false);
    setEditingUser(null);
  };

  const handleUserSaved = () => {
    fetchUsers();
    handleModalClose();
  };

  return (
    <div>
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 10,

          alignItems: "center",
          minHeight: 40,
          width: "100%",
        }}
      >
        <Input
          placeholder="Search User by name, username, email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ width: 300, height: 40, fontSize: 14 }}
        />

        <Select
          value={selectedCategory}
          style={{ width: 150, height: 40 }}
          onChange={handleCategoryChange}
          options={filterCategories.map((category) => ({
            label: category,
            value: category,
          }))}
        />
        <Select
          value={selectedValue}
          style={{ width: 180, height: 40 }}
          onChange={handleValueChange}
          options={[
            { label: `All ${selectedCategory}`, value: "all" },
            ...subOptions.map((opt) => ({ label: opt, value: opt })),
          ]}
        />
      </div>
      <Divider />
      <div
        style={{
          display: "flex",
          flexDirection: " column",
          alignItems: "flex-end",
          width: "100%",
        }}
      >
        <Button
          type="primary"
          onClick={handleAddUser}
          style={{ width: 100, height: 40 }}
          icon={<UserAddOutlined />}
        >
          Add User
        </Button>
      </div>

      <UserTable
        headers={headers}
        data={filteredUsers}
        onEditUser={handleEditUser}
        onDeactivateUser={handleDeactivateUser}
        onReactivateUser={handleReactivateUser}
        currentUserId={currentUserId}
        loading={loading}
      />

      <div style={{ marginTop: 15 }}>
        Showing {filteredUsers.length} of {allUsers.length} users
      </div>

      {showModal && (
        <UserModal
          visible={showModal}
          user={editingUser}
          onClose={handleModalClose}
          onUserSaved={handleUserSaved}
        />
      )}
    </div>
  );
}
