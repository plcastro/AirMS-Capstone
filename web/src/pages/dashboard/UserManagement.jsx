import React, { useState, useEffect } from "react";
import { Input, Select, Button } from "antd";
import UserTable from "../../components/tables/UserTable";
import UserModal from "../../components/common/UserForm";
import { API_BASE } from "../../utils/API_BASE";

const { Option } = Select;

export default function UserManagement() {
  const [allUsers, setAllUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [positionFilter, setPositionFilter] = useState("all");
  const [accessFilter, setAccessFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentUserId, setCurrentUserId] = useState(null);
  const [loading, setLoading] = useState(false);

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

  // Load current user
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

  useEffect(() => {
    let filtered = [...allUsers];
    if (statusFilter !== "all")
      filtered = filtered.filter((u) => u.status === statusFilter);
    if (positionFilter !== "all")
      filtered = filtered.filter((u) => u.position === positionFilter);
    if (accessFilter !== "all")
      filtered = filtered.filter((u) => u.access === accessFilter);
    if (searchQuery.trim()) {
      filtered = filtered.filter((u) =>
        [u.fullname, u.username, u.email, u.position, u.access]
          .join(" ")
          .toLowerCase()
          .includes(searchQuery.toLowerCase()),
      );
    }
    setFilteredUsers(filtered);
  }, [allUsers, statusFilter, positionFilter, accessFilter, searchQuery]);

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
    <div style={{ padding: 20 }}>
      <div
        style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 20 }}
      >
        <Input
          placeholder="Search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ width: 300 }}
        />
        <Select
          value={positionFilter}
          onChange={setPositionFilter}
          style={{ width: 180 }}
        >
          <Option value="all">Position</Option>
          <Option value="Admin">Admin</Option>
          <Option value="Head of Maintenance">Head of Maintenance</Option>
          <Option value="Pilot">Pilot</Option>
          <Option value="Manager">Manager</Option>
          <Option value="Mechanic">Mechanic</Option>
        </Select>
        <Select
          value={accessFilter}
          onChange={setAccessFilter}
          style={{ width: 180 }}
        >
          <Option value="all">Access Level</Option>
          <Option value="Admin">Admin</Option>
          <Option value="Superuser">Superuser</Option>
          <Option value="User">User</Option>
        </Select>
        <Select
          value={statusFilter}
          onChange={setStatusFilter}
          style={{ width: 150 }}
        >
          <Option value="all">Status</Option>
          <Option value="active">Active</Option>
          <Option value="inactive">Inactive</Option>
          <Option value="deactivated">Deactivated</Option>
        </Select>
        <Button type="primary" onClick={handleAddUser}>
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
