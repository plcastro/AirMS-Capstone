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
import {
  AUDIT_ACTION_CHART_CATEGORIES,
  buildEmptyAuditCategoryCounts,
  getAuditActionCategory,
  getAuditActionCategoryOptions,
} from "../../../utils/auditActions";
import { Input, DatePicker, Space, Grid, message, Select, Card } from "antd";
import dayjs from "dayjs";
import { AuthContext } from "../../../context/AuthContext";

const { RangePicker } = DatePicker;
const { useBreakpoint } = Grid;

export default function UserLogs() {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const { getAuthHeader } = useContext(AuthContext);
  const [allUserLogs, setAllUserLogs] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [dateRange, setDateRange] = useState([
    dayjs().subtract(30, "days"),
    dayjs(),
  ]);
  const [loading, setLoading] = useState(false);
  const [selectedActionType, setSelectedActionType] = useState("all");
  const [selectedScope, setSelectedScope] = useState("all");
  const [selectedScopeValue, setSelectedScopeValue] = useState("all");

  const fetchUserLogs = useCallback(
    async (startDate = null, endDate = null, options = {}) => {
      const { silent = false } = options;
      if (!silent) {
        setLoading(true);
      }
      try {
        const authHeader = getAuthHeader ? await getAuthHeader() : {};
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
            ...authHeader,
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
            ? dayjs(log.dateTime).format("MM/DD/YYYY hh:mm A")
            : "N/A",
          actionMade: log.actionMade || log.action || "N/A",
          username: log.username || "Unknown",
          platform: log.platform || "UNKNOWN",
          base: log.base || "UNKNOWN",
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
    [getAuthHeader],
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
        (log) => getAuditActionCategory(log.actionMade) === selectedActionType,
      );
    }

    if (selectedScope !== "all" && selectedScopeValue !== "all") {
      filtered = filtered.filter((log) =>
        selectedScope === "base"
          ? String(log.base || "UNKNOWN").toUpperCase() === selectedScopeValue
          : String(log.platform || "UNKNOWN").toUpperCase() ===
            selectedScopeValue,
      );
    }

    return filtered;
  }, [allUserLogs, searchQuery, selectedActionType, selectedScope, selectedScopeValue]);

  const scopeValueOptions = useMemo(() => {
    if (selectedScope === "base") {
      const values = Array.from(
        new Set(
          allUserLogs.map((log) => String(log.base || "UNKNOWN").toUpperCase()),
        ),
      ).sort();
      return [
        { label: "All Base", value: "all" },
        ...values.map((value) => ({ label: value, value })),
      ];
    }

    if (selectedScope === "platform") {
      const values = Array.from(
        new Set(
          allUserLogs.map((log) =>
            String(log.platform || "UNKNOWN").toUpperCase(),
          ),
        ),
      ).sort();
      return [
        { label: "All Platform", value: "all" },
        ...values.map((value) => ({ label: value, value })),
      ];
    }

    return [{ label: "All Scope", value: "all" }];
  }, [allUserLogs, selectedScope]);

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
  const actionTypeOptions = getAuditActionCategoryOptions();

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
          ...buildEmptyAuditCategoryCounts(),
        };
      }

      const category = getAuditActionCategory(log.actionMade);
      dailyStats[dateKey][category]++;
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
          ...buildEmptyAuditCategoryCounts(),
        },
      );
      cursor = cursor.add(1, "day");
    }

    return filledData;
  }, [filteredLogs, dateRange]);
  return (
    <div
      style={{
        paddingTop: isMobile ? 12 : 20,
        paddingRight: isMobile ? 12 : 20,
        paddingLeft: isMobile ? 12 : 20,
        maxWidth: "100%",
        paddingBottom: 24,
      }}
    >
      <Space
        style={{ marginBottom: 16, width: "100%" }}
        orientation={isMobile ? "vertical" : undefined}
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
          format="MM/DD/YYYY"
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
        <Select
          value={selectedScope}
          onChange={(value) => {
            setSelectedScope(value);
            setSelectedScopeValue("all");
          }}
          options={[
            { label: "All Scope", value: "all" },
            { label: "Base", value: "base" },
            { label: "Platform", value: "platform" },
          ]}
          size="large"
          style={{ width: isMobile ? "100%" : 180 }}
        />
        {selectedScope !== "all" && (
          <Select
            value={selectedScopeValue}
            onChange={setSelectedScopeValue}
            options={scopeValueOptions}
            size="large"
            style={{ width: isMobile ? "100%" : 180 }}
          />
        )}
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
                tickFormatter={(date) => dayjs(date).format("MM/DD/YYYY")}
                tick={{ fontSize: 12 }}
              />
              <YAxis tick={{ fontSize: 12 }} width={32} />
              <Tooltip
                labelFormatter={(date) => dayjs(date).format("MM/DD/YYYY")}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />

              {AUDIT_ACTION_CHART_CATEGORIES.filter(
                (category) =>
                  selectedActionType === "all" ||
                  selectedActionType === category.value,
              ).map((category) => (
                <Line
                  key={category.value}
                  type="monotone"
                  dataKey={category.value}
                  stroke={category.color}
                  name={category.label}
                  strokeWidth={1.5}
                  dot={false}
                />
              ))}
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

