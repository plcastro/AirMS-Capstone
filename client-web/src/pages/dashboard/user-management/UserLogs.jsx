import React, { useContext, useEffect, useState } from "react";
import ActivityLogTable from "../../../components/tables/ActivityLogTable";
import { API_BASE } from "../../../utils/API_BASE";
import { Input, DatePicker, Space, Grid, message } from "antd";
import dayjs from "dayjs";
import { AuthContext } from "../../../context/AuthContext";

const { RangePicker } = DatePicker;
const { useBreakpoint } = Grid;

export default function UserLogs() {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const { getValidToken } = useContext(AuthContext);
  const [allUserLogs, setAllUserLogs] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [dateRange, setDateRange] = useState([
    dayjs().subtract(30, "days"),
    dayjs(),
  ]);
  const [loading, setLoading] = useState(false);

  const fetchUserLogs = async (startDate = null, endDate = null) => {
    setLoading(true);
    try {
      const token = await getValidToken();
      const params = new URLSearchParams({
        page: "1",
        limit: "1000",
      });
      if (startDate && endDate) {
        params.set("startDate", startDate.toISOString());
        params.set("endDate", endDate.toISOString());
      }
      const url = `${API_BASE}/api/logs/getAllUserLogs?${params.toString()}`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const json = await response.json();

      if (!response.ok) {
        throw new Error(json?.message || "Failed to fetch user activity logs");
      }

      if (!Array.isArray(json.data)) {
        console.log("Unexpected response:", json);
        message.warning("Unexpected log response format from server");
        setAllUserLogs([]);
        return;
      }
      const mappedLogs = json.data.map((log, index) => ({
        _id: log._id,
        index: index + 1,
        dateTime: log.dateTime
          ? new Date(log.dateTime).toLocaleString()
          : "N/A",
        actionMade: log.actionMade || log.action || "N/A",
        username: log.username || "Unknown",
      }));

      setAllUserLogs(mappedLogs);
    } catch (error) {
      console.error("Error fetching user logs:", error);
      message.error(error.message || "Failed to fetch user logs");
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (text) => {
    setSearchQuery(text);
  };

  const handleDateRangeChange = (dates) => {
    setDateRange(dates);
    if (!dates || !dates[0] || !dates[1]) {
      message.info("Date range cleared. Showing all available logs.");
    }
  };

  useEffect(() => {
    let filtered = [...allUserLogs];

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
    fetchUserLogs(dateRange?.[0], dateRange?.[1]);
  }, [dateRange]);

  return (
    <div
      style={{
        padding: isMobile ? 12 : 20,
        maxWidth: "100%",
        overflow: "hidden",
        minHeight: "100vh",
        overflowY: "auto",
        height: "calc(100vh - 200px)",
        paddingBottom: 100,
      }}
    >
      <Space
        style={{ marginBottom: 16, width: "100%" }}
        direction={isMobile ? "vertical" : "horizontal"}
        size={isMobile ? 10 : 8}
        wrap
      >
        <Input
          placeholder="Search logs..."
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          style={{ width: isMobile ? "100%" : 300 }}
          allowClear
          size="large"
        />
        <RangePicker
          value={dateRange}
          onChange={handleDateRangeChange}
          format="YYYY-MM-DD"
          allowClear
          size="large"
          style={{ width: isMobile ? "100%" : 320 }}
        />
      </Space>

      <div style={{ width: "100%", overflowX: "auto" }}>
        <ActivityLogTable data={filteredUsers} loading={loading} />
      </div>
    </div>
  );
}
