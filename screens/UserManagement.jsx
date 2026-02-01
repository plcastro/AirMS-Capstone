import React, { useState, useEffect } from "react";
import { View, Text } from "react-native";
import Table from "../components/Table";
import Button from "../components/Button";

export default function UserManagement() {
  const [allUsers, setAllUsers] = useState([]);
  const headers = [
    { label: "ID", key: "id", numeric: true },
    { label: "Fullname", key: "fullname" },
    { label: "Username", key: "username" },
    { label: "Email", key: "email" },
    { label: "Role", key: "role" },
    { label: "Date Created", key: "date_created" },
    { label: "Status", key: "status" },
    { label: "Actions", key: "actions" },
  ];

  useEffect(() => {
    async function fetchUsers() {
      try {
        const response = await fetch("http://localhost:8000/user/getAlluser");
        const json = await response.json();
        setAllUsers(json.data);
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    }

    fetchUsers();
  }, []);

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Button />
      <Table data={allUsers} headers={headers} />
    </View>
  );
}
