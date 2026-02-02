import React, { useState, useEffect } from "react";
import { View, Text, TextInput, Platform } from "react-native";
import Table from "../components/Table";
import Button from "../components/Button";
import { styles } from "../stylesheets/styles";

export default function UserManagement() {
  const [allUsers, setAllUsers] = useState([]);
  const [showAddUser, setShowAddUser] = useState(false);
  const headers = [
    { label: "Fullname", key: "fullname" },
    { label: "Username", key: "username" },
    { label: "Email", key: "email" },
    { label: "Role", key: "role" },
    { label: "Date Created", key: "dateCreated" },
    { label: "Status", key: "status" },
    { label: "Actions", key: "actions" },
  ];
  const COLUMN_WIDTHS = {
    fullname: 180,
    username: 140,
    email: 220,
    role: 150,
    dateCreated: 350,
    status: 50,
    actions: 350,
  };

  useEffect(() => {
    async function fetchUsers() {
      try {
        const API_BASE =
          Platform.OS === "android"
            ? "http://10.0.2.2:8000" // Android emulator uses this to reach localhost
            : "http://localhost:8000";
        const response = await fetch(`${API_BASE}/api/user/getAllUsers`);
        const json = await response.json();

        if (!Array.isArray(json.data)) {
          console.log("Unexpected response:", json);
          return;
        }
        const usersWithFormattedData = json.data.map((user) => ({
          ...user,
          fullname: `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim(),
          dateCreated: user.dateCreated
            ? new Date(user.dateCreated).toLocaleString()
            : "N/A", // format date like in logs
        }));

        console.log("Fetched users:", usersWithFormattedData);
        setAllUsers(usersWithFormattedData);
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    }

    fetchUsers();
  }, []);

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <View style={styles.searchRow}>
        <TextInput placeholder="Search" style={styles.searchInput} />
        <Button
          iconName="plus"
          label="Add User"
          buttonStyle={styles.addButton}
          buttonTextStyle={styles.addButtonText}
          onPress={() => setShowAddUser(true)}
        />
      </View>
      <Table data={allUsers} headers={headers} columnWidths={COLUMN_WIDTHS} />
    </View>
  );
}
