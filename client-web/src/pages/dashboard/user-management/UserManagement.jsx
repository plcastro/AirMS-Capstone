import React, { useState, useEffect } from "react";
import { Input, Button, Divider, TreeSelect } from "antd";
import UserTable from "../../../components/tables/UserTable";
import UserForm from "../../../components/common/UserForm";
import { API_BASE } from "../../../utils/API_BASE";
import { UserAddOutlined, FilterOutlined } from "@ant-design/icons";

const accessLevelData = [
  {
    title: "Job Title",
    value: "pos-parent",
    selectable: false,
    children: [
      { title: "Admin", value: "Admin" },
      { title: "Maintenance Manager", value: "Maintenance Manager" },
      { title: "Pilot", value: "Pilot" },
      { title: "Officer-In-Charge", value: "Officer-In-Charge" },
      { title: "Mechanic", value: "Mechanic" },
      { title: "Warehouse Department", value: "Warehouse Department" },
    ],
  },
  {
    title: "Access Level",
    value: "access-parent",
    selectable: false,
    children: [
      { title: "Admin", value: "Admin" }, // Note: unique value if overlaps with jobTitle
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
      const res = await fetch(`${API_BASE}/api/user/get-all-users`);
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

    if (treeValue) {
      filtered = filtered.filter((u) => {
        return (
          u.jobTitle === treeValue ||
          u.access === treeValue ||
          u.status?.toLowerCase() === treeValue.toLowerCase()
        );
      });
    }

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
    await fetch(`${API_BASE}/api/user/update-user-status/${user._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "deactivated" }),
    });
    fetchUsers();
  };

  const handleReactivateUser = async (user) => {
    await fetch(`${API_BASE}/api/user/update-user-status/${user._id}`, {
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
  const handleUserSaved = (updatedUser) => {
    setAllUsers((prevUsers) => {
      if (!updatedUser._id) return prevUsers;
      const index = prevUsers.findIndex((u) => u._id === updatedUser._id);
      if (index !== -1) {
        const newUsers = [...prevUsers];
        newUsers[index] = {
          ...updatedUser,
          fullname: `${updatedUser.firstName} ${updatedUser.lastName}`,
          dateCreated: new Date(updatedUser.dateCreated).toLocaleString(),
        };
        return newUsers;
      }
      return [
        ...prevUsers,
        {
          ...updatedUser,
          index: prevUsers.length + 1,
          fullname: `${updatedUser.firstName} ${updatedUser.lastName}`,
          dateCreated: new Date(updatedUser.dateCreated).toLocaleString(),
        },
      ];
    });

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
          placeholder="Filter"
          treeDefaultExpandAll
          onChange={setTreeValue}
          allowClear
          icon={<FilterOutlined />}
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
        <UserForm
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
