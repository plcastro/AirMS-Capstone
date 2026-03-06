import React, { useState, useEffect } from "react";
import { Input, Button, Divider, TreeSelect } from "antd";
import UserTable from "../../../components/tables/UserTable";
import UserModal from "../../../components/common/UserForm";
import { API_BASE } from "../../../utils/API_BASE";
import { UserAddOutlined } from "@ant-design/icons";

// Updated data: Values now match the actual strings in your User objects
const accessLevelData = [
  {
    title: "Job Title",
    value: "pos-parent",
    selectable: false, // Prevents selecting the category header
    children: [
      { title: "Admin", value: "Admin" },
      { title: "Head of Maintenance", value: "Head of Maintenance" },
      { title: "Pilot", value: "Pilot" },
      { title: "Manager", value: "Manager" },
      { title: "Mechanic", value: "Mechanic" },
    ],
  },
  {
    title: "Access Level",
    value: "access-parent",
    selectable: false,
    children: [
      { title: "Admin", value: "Admin-access" }, // Note: unique value if overlaps with jobTitle
      { title: "Superuser", value: "Superuser" },
      { title: "User", value: "User" },
    ],
  },
  {
    title: "Status",
    value: "status-parent",
    selectable: false,
    children: [
      { title: "Active", value: "active" },
      { title: "Inactive", value: "inactive" },
      { title: "Deactivated", value: "deactivated" },
    ],
  },
];

export default function UserManagement() {
  const [allUsers, setAllUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentUserId, setCurrentUserId] = useState(null);
  const [loading, setLoading] = useState(false);

  // Filtering states
  const [treeValue, setTreeValue] = useState(undefined);

  const headers = [
    { label: "#", key: "index" },
    { label: "Fullname", key: "fullname" },
    { label: "Username", key: "username" },
    { label: "Email", key: "email" },
    { label: "JobTitle", key: "jobTitle" },
    { label: "Access Control", key: "access" },
    { label: "Date Created", key: "dateCreated" },
    { label: "Status", key: "status" },
    { label: "Actions", key: "actions" },
  ];

  // Load current user for deactivation protection
  useEffect(() => {
    const storedUser = localStorage.getItem("currentUser");
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        setCurrentUserId(parsed.userid || parsed._id || parsed.id);
      } catch (err) {
        console.error(err);
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

  // Combined Search and Tree Filter Logic
  useEffect(() => {
    let filtered = [...allUsers];

    // 1. Filter by TreeSelect Value
    if (treeValue) {
      filtered = filtered.filter((u) => {
        // We check all three possible fields since the TreeSelect value is flat
        return (
          u.jobTitle === treeValue ||
          u.access === treeValue ||
          u.status?.toLowerCase() === treeValue.toLowerCase()
        );
      });
    }

    // 2. Filter by Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((u) =>
        [u.fullname, u.username, u.email, u.jobTitle, u.access]
          .join(" ")
          .toLowerCase()
          .includes(q),
      );
    }

    setFilteredUsers(filtered);
  }, [allUsers, treeValue, searchQuery]);

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
    <div style={{ padding: "20px" }}>
      <div
        style={{
          display: "flex",
          gap: 15,
          marginBottom: 20,
          alignItems: "center",
        }}
      >
        <Input
          placeholder="Search name, email, etc..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ width: 350, height: 40 }}
          allowClear
        />

        <TreeSelect
          style={{ width: 250 }}
          value={treeValue}
          styles={{
            popup: {
              root: { maxHeight: 400, overflow: "auto" },
            },
          }}
          treeData={accessLevelData}
          placeholder="Filter by Category"
          treeDefaultExpandAll
          onChange={setTreeValue}
          allowClear
        />
        <Button
          onClick={() => {
            setSearchQuery("");
            setTreeValue(undefined);
          }}
          type="link"
        >
          Reset Filters
        </Button>
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
            style={{ width: 100, height: 40, marginBottom: 10 }}
            icon={<UserAddOutlined />}
          >
            Add User
          </Button>
        </div>
      </div>
      <Divider />

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
          allUsers={allUsers}
        />
      )}
    </div>
  );
}
