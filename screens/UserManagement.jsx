import React, { useState, useEffect } from "react";
import { View, Text } from "react-native";
import Table from "../components/Table";
import Button from "../components/Button";

export default function UserManagement() {
  const [allUsers, setAllUsers] = useState([]);
  const headers = [
    { label: "Username", key: "username" },
    { label: "Email", key: "email" },
    { label: "Role", key: "role" },
  ];

  useEffect(() => {
    async function fetchUsers() {
      try {
        const response = await fetch("http://localhost:8000/get-all-user");
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
