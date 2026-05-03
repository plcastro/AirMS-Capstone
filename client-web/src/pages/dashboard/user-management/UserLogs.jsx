import React, {
  useCallback,
  useContext,
  useEffect,
  useState,
  useMemo,
} from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import ActivityLogTable from "../../../components/tables/ActivityLogTable";
import { API_BASE } from "../../../utils/API_BASE";
import { Input, DatePicker, Space, Grid, message, Select, Card } from "antd";
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
  const [selectedActionType, setSelectedActionType] = useState("all");

  const fetchUserLogs = useCallback(
    async (startDate = null, endDate = null, options = {}) => {
      const { silent = false } = options;
      if (!silent) {
        setLoading(true);
      }
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
          throw new Error(
            json?.message || "Failed to fetch user activity logs",
          );
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
          dateTime: log.dateTime,
          displayDateTime: log.dateTime
            ? dayjs(log.dateTime).format("MMM DD, YYYY hh:mm A")
            : "N/A",
          actionMade: log.actionMade || log.action || "N/A",
          username: log.username || "Unknown",
        }));

        setAllUserLogs(mappedLogs);
      } catch (error) {
        console.error("Error fetching user logs:", error);
        message.error(error.message || "Failed to fetch user logs");
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [getValidToken],
  );

  const handleSearchChange = (text) => {
    setSearchQuery(text);
  };

  const handleDateRangeChange = (dates) => {
    setDateRange(dates);
    if (!dates || !dates[0] || !dates[1]) {
      message.info("Date range cleared. Showing all available logs.");
    }
  };
  const getActionCategory = (actionText = "") => {
    const text = actionText.toLowerCase();

    if (["created", "added", "inserted", "new"].some((k) => text.includes(k)))
      return "create";
    if (
      ["updated", "modified", "changed", "edited"].some((k) => text.includes(k))
    )
      return "update";
    if (
      ["deleted", "removed", "destroyed", "erased"].some((k) =>
        text.includes(k),
      )
    )
      return "delete";
    if (
      ["log in", "logged in", "login", "signed in"].some((k) =>
        text.includes(k),
      )
    )
      return "login";
    if (
      ["log out", "logged out", "logout", "signed out"].some((k) =>
        text.includes(k),
      )
    )
      return "logout";

    return "other";
  };
  const filteredLogs = useMemo(() => {
    let filtered = [...allUserLogs];

    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (log) =>
          (log.actionMade && log.actionMade.toLowerCase().includes(query)) ||
          (log.dateTime && log.dateTime.toLowerCase().includes(query)) ||
          (log.username && log.username.toLowerCase().includes(query)),
      );
    }

    if (selectedActionType !== "all") {
      filtered = filtered.filter(
        (log) => getActionCategory(log.actionMade) === selectedActionType,
      );
    }

    return filtered;
  }, [allUserLogs, searchQuery, selectedActionType]);

  useEffect(() => {
    setFilteredUsers(filteredLogs);
  }, [filteredLogs]);

  useEffect(() => {
    fetchUserLogs(dateRange?.[0], dateRange?.[1]);
  }, [dateRange, fetchUserLogs]);

  useEffect(() => {
    const stream = new EventSource(`${API_BASE}/api/events/stream`);
    const onDataChanged = () => {
      fetchUserLogs(dateRange?.[0], dateRange?.[1], { silent: true });
    };

    stream.addEventListener("data-changed", onDataChanged);

    return () => {
      stream.removeEventListener("data-changed", onDataChanged);
      stream.close();
    };
  }, [dateRange, fetchUserLogs]);
  const actionTypeOptions = [
    { label: "All Actions", value: "all" },
    { label: "Create", value: "create" },
    { label: "Update", value: "update" },
    { label: "Delete", value: "delete" },
    { label: "Log In", value: "login" },
    { label: "Log Out", value: "logout" },
  ];

  const actionTrendData = useMemo(() => {
    const dailyStats = {};

    filteredLogs.forEach((log) => {
      if (!log.dateTime) return;

      const parsedDate = dayjs(log.dateTime);
      if (!parsedDate.isValid()) return;
      const dateKey = parsedDate.format("YYYY-MM-DD");

      if (!dailyStats[dateKey]) {
        dailyStats[dateKey] = {
          date: dateKey,
          create: 0,
          update: 0,
          delete: 0,
          login: 0,
          logout: 0,
        };
      }

      const category = getActionCategory(log.actionMade);

      if (category !== "other") {
        dailyStats[dateKey][category]++;
      }
    });

    const sortedDates = Object.keys(dailyStats).sort((a, b) =>
      a.localeCompare(b),
    );

    const endDate = dateRange?.[1]
      ? dayjs(dateRange[1]).endOf("day")
      : dayjs().endOf("day");
    const rangeStart = dateRange?.[0]
      ? dayjs(dateRange[0]).startOf("day")
      : endDate.subtract(29, "day").startOf("day");

    const selectedSpanDays = Math.max(endDate.diff(rangeStart, "day") + 1, 1);
    const windowDays = Math.max(7, Math.min(30, selectedSpanDays || 30));

    const fallbackStart = endDate
      .subtract(windowDays - 1, "day")
      .startOf("day");
    const startDate =
      sortedDates.length > 0 && rangeStart.isBefore(fallbackStart)
        ? fallbackStart
        : rangeStart;

    const filledData = [];
    let cursor = startDate;

    while (cursor.isBefore(endDate) || cursor.isSame(endDate, "day")) {
      const dateKey = cursor.format("YYYY-MM-DD");
      filledData.push(
        dailyStats[dateKey] || {
          date: dateKey,
          create: 0,
          update: 0,
          delete: 0,
          login: 0,
          logout: 0,
        },
      );
      cursor = cursor.add(1, "day");
    }

    return filledData;
  }, [filteredLogs, dateRange]);
  return (
    <div
      style={{
        padding: isMobile ? 12 : 20,
        maxWidth: "100%",
        paddingBottom: 24,
      }}
    >
      <Space
        style={{ marginBottom: 16, width: "100%" }}
        orientation={isMobile ? "vertical" : "horizontal"}
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
        <Select
          value={selectedActionType}
          onChange={setSelectedActionType}
          options={actionTypeOptions}
          size="large"
          style={{ width: isMobile ? "100%" : 180 }}
        />
      </Space>
      <div style={{ marginBottom: 20 }}>
        <Card title="Activity Trends" size="small" loading={loading}>
          <ResponsiveContainer width="100%" height={isMobile ? 220 : 250}>
            <LineChart
              data={actionTrendData}
              margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={(date) => dayjs(date).format("MMM D")}
                tick={{ fontSize: 12 }}
              />
              <YAxis tick={{ fontSize: 12 }} width={32} />
              <Tooltip
                labelFormatter={(date) => dayjs(date).format("MMM DD, YYYY")}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />

              <Line
                type="monotone"
                dataKey="create"
                stroke="#52c41a"
                name="Create"
                strokeWidth={1.5}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="update"
                stroke="#1890ff"
                name="Update"
                strokeWidth={1.5}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="delete"
                stroke="#f5222d"
                name="Delete"
                strokeWidth={1.5}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="login"
                stroke="#722ed1"
                name="Log In"
                strokeWidth={1.5}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="logout"
                stroke="#fa8c16"
                name="Log Out"
                strokeWidth={1.5}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>
      <div style={{ width: "100%", overflowX: "auto" }}>
        <ActivityLogTable data={filteredUsers} loading={loading} />
      </div>
    </div>
  );
}
