import React, { useState, useEffect } from "react";
import { View, TextInput, Platform } from "react-native";
import Table from "../../components/UserManagement/Table";
import { styles } from "../../stylesheets/styles";
import { API_BASE } from "../../utilities/API_BASE";

export default function UserLogs() {
  const isMobile = Platform.OS !== "web";
  const [allUserLogs, setAllUserLogs] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredUsers, setFilteredUsers] = useState([]);
  const headers = [
    { label: "#", key: "index" },
    { label: "Date and Time", key: "dateTime" },
    { label: "Action made", key: "actionMade" },
    { label: "Performed by", key: "username" }, // show username
  ];
  const COLUMN_WIDTHS = {
    index: 5,
    dateTime: 250,
    actionMade: 500,
    username: 300,
  };

  const fetchUserLogs = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/logs/getAllUserLogs`);
      const json = await response.json();

      if (!Array.isArray(json.data)) {
        console.log("Unexpected response:", json);
        return;
      }

      // Map logs to match table headers
      const mappedLogs = json.data.map((log, index) => ({
        index: index + 1,
        dateTime: log.dateTime
          ? new Date(log.dateTime).toLocaleString()
          : "N/A",
        actionMade: log.actionMade || log.action || "N/A",
        username: log.username || "Unknown", // use username field
      }));

      setAllUserLogs(mappedLogs);
    } catch (error) {
      console.error("Error fetching user logs:", error);
    }
  };

  const handleSearchChange = (text) => {
    setSearchQuery(text);
  };
  useEffect(() => {
    let filtered = [...allUserLogs];

    // Apply search filter if searchQuery exists
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (user) =>
          (user.actionMade && user.actionMade.toLowerCase().includes(query)) ||
          (user.dateTime && user.dateTime.toLowerCase().includes(query)) ||
          (user.username && user.username.toLowerCase().includes(query)),
      );
    }

    setFilteredUsers(filtered);
  }, [allUserLogs, searchQuery]);

  useEffect(() => {
    fetchUserLogs();
  }, []);

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <View style={styles.searchRow}>
        <TextInput
          placeholder="Search"
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={handleSearchChange}
        />
      </View>

      <Table
        data={filteredUsers}
        headers={headers}
        columnWidths={COLUMN_WIDTHS}
      />
    </View>
  );
}
