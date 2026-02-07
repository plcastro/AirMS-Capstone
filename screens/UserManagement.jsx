import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useState, useEffect } from "react";
import { View, TextInput, Platform, Text } from "react-native";
import Table from "../components/Table";
import Button from "../components/Button";
import AddUser from "../components/AddUser";
import EditUser from "../components/EditUser";
import { Picker } from "@react-native-picker/picker";
import { styles } from "../stylesheets/styles";

export default function UserManagement() {
  const [allUsers, setAllUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [showAddUser, setShowAddUser] = useState(false);
  const [showEditUser, setShowEditUser] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all"); // "all", "active", "deactivated"
  const [roleFilter, setRoleFilter] = useState("all"); // "all", "user", "superuser", "admin"
  const [accessFilter, setAccessFilter] = useState("all"); // NEW: "all", "user", "superuser", "admin"
  const [searchQuery, setSearchQuery] = useState("");

  const [currentUserId, setCurrentUserId] = useState(null);

  const headers = [
    { label: "#", key: "index" },
    { label: "Fullname", key: "fullname" },
    { label: "Username", key: "username" },
    { label: "Email", key: "email" },
    { label: "Role", key: "role" },
    { label: "Access Control", key: "access" }, // NEW: Added Access Control header
    { label: "Date Created", key: "dateCreated" },
    { label: "Status", key: "status" },
    { label: "Actions", key: "actions" },
  ];

  const COLUMN_WIDTHS = {
    index: 10,
    fullname: 200,
    username: 150,
    email: 250,
    role: 150,
    access: 100, // NEW: Added width for Access Control
    dateCreated: 250,
    status: 100,
    actions: 300,
  };

  const API_BASE =
    Platform.OS === "android"
      ? "http://10.0.2.2:8000"
      : "http://localhost:8000";

  // 🔐 Load logged-in user
  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        console.log("=== DEBUG: Loading current user from AsyncStorage ===");

        // Check if AsyncStorage is working
        const keys = await AsyncStorage.getAllKeys();
        console.log("All AsyncStorage keys:", keys);

        const storedUser = await AsyncStorage.getItem("currentUser");
        console.log("Raw storedUser string:", storedUser);

        if (storedUser) {
          try {
            const parsed = JSON.parse(storedUser);
            console.log("Parsed user object:", parsed);
            console.log("User ID:", parsed.id);
            console.log("User email:", parsed.email);
            console.log("User username:", parsed.username);

            setCurrentUserId(parsed.id);
          } catch (parseError) {
            console.error("Error parsing storedUser JSON:", parseError);
          }
        } else {
          console.log("No 'currentUser' found in AsyncStorage");
        }
      } catch (error) {
        console.error("Error loading from AsyncStorage:", error);
      }
    };

    loadCurrentUser();
  }, []);

  // 📥 Fetch users
  const fetchUsers = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/user/getAllUsers`);
      const json = await response.json();

      if (Array.isArray(json)) {
        const formatted = json.map((user, index) => ({
          ...user,
          _id: user._id || user.id,
          index: index + 1,
          fullname: `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim(),
          dateCreated: user.dateCreated
            ? new Date(user.dateCreated).toLocaleString()
            : "N/A",
        }));
        setAllUsers(formatted);
      }
    } catch (err) {
      console.error("Error fetching users:", err);
    }
  };

  // Filter users based on status filter, role filter, access filter, and search query
  useEffect(() => {
    let filtered = [...allUsers];

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((user) => user.status === statusFilter);
    }

    // Apply role filter
    if (roleFilter !== "all") {
      filtered = filtered.filter((user) => user.role === roleFilter);
    }

    // NEW: Apply access filter
    if (accessFilter !== "all") {
      filtered = filtered.filter((user) => user.access === accessFilter);
    }

    // Apply search filter if searchQuery exists
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (user) =>
          (user.fullname && user.fullname.toLowerCase().includes(query)) ||
          (user.username && user.username.toLowerCase().includes(query)) ||
          (user.email && user.email.toLowerCase().includes(query)) ||
          (user.role && user.role.toLowerCase().includes(query)) ||
          (user.access && user.access.toLowerCase().includes(query)), // NEW: Added accessLevel to search
      );
    }

    setFilteredUsers(filtered);
  }, [allUsers, statusFilter, roleFilter, accessFilter, searchQuery]);

  useEffect(() => {
    console.log("Current User ID:", currentUserId);
    console.log("First user in allUsers:", allUsers[0]);
  }, [currentUserId, allUsers]);

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setShowEditUser(true);
  };

  const handleDeactivateUser = async (user) => {
    try {
      const API_BASE =
        Platform.OS === "android"
          ? "http://10.0.2.2:8000"
          : "http://localhost:8000";

      const response = await fetch(
        `${API_BASE}/api/user/updateUserStatus/${user._id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "deactivated" }),
        },
      );

      const data = await response.json();
      if (response.ok) {
        setAllUsers((prev) =>
          prev.map((u) =>
            u._id === user._id ? { ...u, status: "deactivated" } : u,
          ),
        );
      } else {
        console.error("Failed to deactivate user:", data.message);
      }
    } catch (error) {
      console.error("Error deactivating user:", error);
    }
  };

  const handleReactivateUser = async (user) => {
    try {
      const API_BASE =
        Platform.OS === "android"
          ? "http://10.0.2.2:8000"
          : "http://localhost:8000";

      const response = await fetch(
        `${API_BASE}/api/user/updateUserStatus/${user._id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "active" }),
        },
      );

      const data = await response.json();
      if (response.ok) {
        setAllUsers((prev) =>
          prev.map((u) =>
            u._id === user._id ? { ...u, status: "active" } : u,
          ),
        );
      } else {
        console.error("Failed to reactivate user:", data.message);
      }
    } catch (error) {
      console.error("Error reactivating user:", error);
    }
  };

  const handleSearchChange = (text) => {
    setSearchQuery(text);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <View style={styles.searchRow}>
        <TextInput
          placeholder="Search"
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {/* Role Filter Dropdown */}
        <View style={styles.filterContainer}>
          <Picker
            selectedValue={roleFilter}
            onValueChange={(itemValue) => setRoleFilter(itemValue)}
            style={styles.filterPicker}
            mode="dropdown"
          >
            <Picker.Item label="Role" value="all" />
            <Picker.Item label="Admin" value="admin" />
            <Picker.Item label="Head Mechanic" value="head mechanic" />
            <Picker.Item label="Pilot" value="pilot" />
            <Picker.Item label="Manager" value="manager" />
            <Picker.Item label="Mechanic" value="mechanic" />
          </Picker>
        </View>

        {/* NEW: Access Control Filter Dropdown */}
        <View style={styles.filterContainer}>
          <Picker
            selectedValue={accessFilter}
            onValueChange={(itemValue) => setAccessFilter(itemValue)}
            style={styles.filterPicker}
            mode="dropdown"
          >
            <Picker.Item label="Access Level" value="all" />
            <Picker.Item label="Admin" value="admin" />
            <Picker.Item label="Superuser" value="superuser" />
            <Picker.Item label="User" value="user" />
          </Picker>
        </View>

        <Picker selectedValue={statusFilter} onValueChange={setStatusFilter}>
          <Picker.Item label="Status" value="all" />
          <Picker.Item label="Active" value="active" />
          <Picker.Item label="Inactive" value="inactive" />
          <Picker.Item label="Deactivated" value="deactivated" />
        </Picker>

        <Button label="Add User" onPress={() => setShowAddUser(true)} />
      </View>

      <Table
        data={filteredUsers}
        headers={headers}
        columnWidths={COLUMN_WIDTHS}
        onEditUser={handleEditUser}
        onDeactivateUser={handleDeactivateUser}
        onReactivateUser={handleReactivateUser}
        currentUserId={currentUserId}
      />

      <AddUser
        visible={showAddUser}
        onClose={() => setShowAddUser(false)}
        onUserAdded={fetchUsers}
      />

      <EditUser
        visible={showEditUser}
        onClose={() => setShowEditUser(false)}
        user={selectedUser}
        onUserUpdated={fetchUsers}
      />
      {/* User Count Display */}
      <View style={styles.userCountContainer}>
        <Text style={styles.userCountText}>
          Showing {filteredUsers.length} of {allUsers.length} users
          {statusFilter !== "all" && ` (${statusFilter} only)`}
          {roleFilter !== "all" && ` (${roleFilter} only)`}
          {accessFilter !== "all" && ` (${accessFilter} only)`}{" "}
          {/* NEW: Added access filter info */}
        </Text>
      </View>
    </View>
  );
}
