import React, { useState, useEffect } from "react";
import { View, TextInput, Platform } from "react-native";
import Table from "../components/Table";
import { styles } from "../stylesheets/styles";

export default function UserLogs() {
  const [allUserLogs, setAllUserLogs] = useState([]);

  const headers = [
    { label: "#", key: "index" },
    { label: "Date and Time", key: "dateTime" },
    { label: "Action made", key: "actionMade" },
    { label: "Performed by", key: "username" }, // show username
  ];

  useEffect(() => {
    async function fetchUserLogs() {
      try {
        const API_BASE =
          Platform.OS === "android"
            ? "http://10.0.2.2:8000"
            : "http://localhost:8000";

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
    }

    fetchUserLogs();
  }, []);

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <View style={styles.searchRow}>
        <TextInput placeholder="Search" style={styles.searchInput} />
      </View>

      <Table data={allUserLogs} headers={headers} />
    </View>
  );
}
