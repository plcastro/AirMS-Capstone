import React, { useEffect } from "react";
import ActivityLogTable from "../../../components/tables/ActivityLogTable";
import { useState } from "react";
import { API_BASE } from "../../../utils/API_BASE";
import { Input } from "antd";

export default function UserLogs() {
  const [allUserLogs, setAllUserLogs] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const headers = [
    {
      title: "#",
      dataIndex: "index",
      key: "index",
      width: 60,
    },

    {
      title: "Action Made",
      dataIndex: "actionMade",
      key: "actionMade",
      width: 500,
      ellipsis: true,
    },
    {
      title: "Performed by",
      dataIndex: "username",
      key: "username",
      width: 260,
      render: (text) => <b style={{ color: "#1890ff" }}>{text}</b>,
    },
    {
      title: "Date and Time",
      dataIndex: "dateTime",
      key: "dateTime",
      sorter: (a, b) => new Date(a.dateTime) - new Date(b.dateTime),
      width: 260,
    },
  ];

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
    <div style={{ padding: 20, maxWidth: "100%", overflow: "hidden" }}>
      <Input
        placeholder="Search logs..."
        value={searchQuery}
        onChange={(e) => handleSearchChange(e.target.value)}
        style={{ marginBottom: 16, width: 300 }}
      />

      {/* This wrapper ensures the table never pushes past the screen edge */}
      <div style={{ width: "100%", overflowX: "auto" }}>
        <ActivityLogTable
          headers={headers}
          data={filteredUsers}
          loading={loading} // Make sure to pass your loading state!
        />
      </div>
    </div>
  );
}
