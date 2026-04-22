import React, { useEffect, useMemo, useState } from "react";
import {
  Row,
  Col,
  Card,
  Statistic,
  Input,
  Divider,
  Table,
  Typography,
  DatePicker,
  Select,
  Space,
} from "antd";
import { SearchOutlined, ReloadOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { SDMChart } from "../../../components/common/PieChart";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
} from "recharts";
import { API_BASE } from "../../../utils/API_BASE";

const { Title, Text } = Typography;

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [dateRange, setDateRange] = useState([
    dayjs().subtract(30, "days"),
    dayjs(),
  ]);
  const [selectedActionType, setSelectedActionType] = useState("all");

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch(`${API_BASE}/api/user/get-all-users`);
      const json = await res.json();
      if (Array.isArray(json.data)) {
        setUsers(json.data);
      }
    } catch (error) {
      console.error("Failed to fetch admin users", error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchLogs = async (startDate = null, endDate = null) => {
    setLoadingLogs(true);
    try {
      let url = `${API_BASE}/api/logs/getAllUserLogs`;
      if (startDate && endDate) {
        const params = new URLSearchParams({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        });
        url += `?${params.toString()}`;
      }

      const res = await fetch(url);
      const json = await res.json();
      if (Array.isArray(json.data)) {
        const mapped = json.data.map((log, index) => ({
          index: index + 1,
          key: log._id || index,
          dateTime: log.dateTime
            ? new Date(log.dateTime).toLocaleString()
            : "N/A",
          actionMade: log.actionMade || log.action || "N/A",
          username: log.username || "Unknown",
        }));
        setLogs(mapped);
      }
    } catch (error) {
      console.error("Failed to fetch admin activity logs", error);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchLogs(dateRange[0], dateRange[1]);
  }, [dateRange]);

  const handleDateRangeChange = (dates) => {
    if (dates && dates[0] && dates[1]) {
      setDateRange(dates);
    }
  };

  const handleRefresh = () => {
    fetchLogs(dateRange[0], dateRange[1]);
  };

  const statusCounts = useMemo(() => {
    const counts = { active: 0, inactive: 0, deactivated: 0, unknown: 0 };
    users.forEach((user) => {
      const status = (user.status || "unknown").toString().toLowerCase();
      if (counts[status] !== undefined) counts[status] += 1;
      else counts.unknown += 1;
    });
    return counts;
  }, [users]);

  const roleCounts = useMemo(() => {
    const counts = {};
    users.forEach((user) => {
      const role = (user.jobTitle || "Unknown").toString();
      counts[role] = (counts[role] || 0) + 1;
    });
    return counts;
  }, [users]);

  const topActiveUsers = useMemo(() => {
    const counts = {};
    logs.forEach((log) => {
      const username = (log.username || "Unknown").toString();
      counts[username] = (counts[username] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([username, activityCount], index) => ({
        key: index,
        username,
        activityCount,
      }));
  }, [logs]);

  const roleColors = [
    "#1890ff",
    "#52c41a",
    "#faad14",
    "#13c2c2",
    "#f5222d",
    "#722ed1",
    "#eb2f96",
  ];

  const roleChartData = Object.entries(roleCounts).map(
    ([name, value], index) => ({
      name,
      value,
      fill: roleColors[index % roleColors.length],
    }),
  );

  const statusColorMap = {
    active: "#52c41a",
    inactive: "#faad14",
    deactivated: "#f5222d",
    unknown: "#d9d9d9",
  };

  const statusChartData = Object.entries(statusCounts).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
    fill: statusColorMap[name] || "#d9d9d9",
  }));

  const activityChartData = useMemo(() => {
    return topActiveUsers.slice(0, 10).map((user, index) => ({
      name:
        user.username.length > 10
          ? user.username.substring(0, 10) + "..."
          : user.username,
      fullName: user.username,
      activity: user.activityCount,
      fill: roleColors[index % roleColors.length],
    }));
  }, [topActiveUsers, roleColors]);

  const actionTrendData = useMemo(() => {
    const actionCategories = {
      create: ["created", "added", "inserted", "new"],
      update: ["updated", "modified", "changed", "edited"],
      delete: ["deleted", "removed", "destroyed", "erased"],
      login: ["log in", "logged in", "login", "signed in"],
      logout: ["log out", "logged out", "logout", "signed out"],
    };

    const dailyStats = {};

    logs.forEach((log) => {
      if (!log.dateTime || log.dateTime === "N/A") return;

      const date = new Date(log.dateTime);
      const dateKey = date.toISOString().split("T")[0]; // YYYY-MM-DD format

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

      const actionText = (log.actionMade || "").toLowerCase();
      let category = "other";

      for (const [cat, keywords] of Object.entries(actionCategories)) {
        if (keywords.some((keyword) => actionText.includes(keyword))) {
          category = cat;
          break;
        }
      }

      if (category !== "other") {
        dailyStats[dateKey][category]++;
      }
    });

    return Object.values(dailyStats)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30); // Last 30 days
  }, [logs]);

  const actionTrendTicks = useMemo(() => {
    if (!actionTrendData.length) return [];
    if (actionTrendData.length <= 3) {
      return actionTrendData.map((item) => item.date);
    }

    const first = actionTrendData[0].date;
    const middle = actionTrendData[Math.floor(actionTrendData.length / 2)].date;
    const last = actionTrendData[actionTrendData.length - 1].date;

    return [first, middle, last];
  }, [actionTrendData]);

  const actionTypeOptions = [
    { label: "All Actions", value: "all" },
    { label: "Create", value: "create" },
    { label: "Update", value: "update" },
    { label: "Delete", value: "delete" },
    { label: "Log In", value: "login" },
    { label: "Log Out", value: "logout" },
  ];

  const columns = [
    { title: "User", dataIndex: "username", key: "username" },
    {
      title: "Activity Count",
      dataIndex: "activityCount",
      key: "activityCount",
    },
  ];

  return (
    <div
      style={{
        padding: 20,
        paddingBottom: 100,
        minHeight: "100vh",
        overflowY: "auto",
        height: "calc(100vh - 200px)",
      }}
    >
      <Row style={{ marginBottom: 20 }}>
        <Col span={24}>
          <Title level={3} style={{ marginBottom: 0 }}>
            Admin Audit Dashboard
          </Title>
          <Text type="secondary">
            Summary of user account status, role assignments, and recent
            activity.
          </Text>
        </Col>
      </Row>

      <Row gutter={[12, 12]}>
        <Col xs={24} sm={12} md={6}>
          <Card loading={loadingUsers} size="small">
            <Statistic title="Total Users" value={users.length} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card loading={loadingUsers} size="small">
            <Statistic title="Active Accounts" value={statusCounts.active} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card loading={loadingUsers} size="small">
            <Statistic
              title="Inactive Accounts"
              value={statusCounts.inactive}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card loading={loadingUsers} size="small">
            <Statistic
              title="Deactivated Accounts"
              value={statusCounts.deactivated}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[12, 12]} style={{ marginTop: 20 }}>
        <Col xs={24} lg={12}>
          <Card title="Role Assignment Distribution" size="small">
            <SDMChart data={roleChartData} />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Account Status Distribution" size="small">
            <SDMChart data={statusChartData} />
          </Card>
        </Col>
      </Row>

      <Divider />

      <Row gutter={[12, 12]}>
        <Col xs={24} lg={14}>
          <Card
            title="User Activity Frequency"
            size="small"
            style={{ minHeight: 440 }}
          >
            <ResponsiveContainer width="100%" height={340}>
              <BarChart
                data={activityChartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  interval={0}
                />
                <YAxis />
                <Tooltip
                  formatter={(value, name) => [value, "Activity Count"]}
                  labelFormatter={(label) => {
                    const user = activityChartData.find(
                      (item) => item.name === label,
                    );
                    return user ? user.fullName : label;
                  }}
                />
                <Legend />
                <Bar dataKey="activity" fill="#1890ff" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          <Card
            title="Top Active Users"
            size="small"
            style={{ minHeight: 440 }}
            loading={loadingLogs}
          >
            <Table
              pagination={false}
              columns={columns}
              dataSource={topActiveUsers}
              size="small"
              rowKey="key"
              loading={loadingLogs}
            />
          </Card>
        </Col>
      </Row>

      <Divider />

      <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
        <Col xs={24} lg={12}>
          <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
            <Text strong>Filter Activity Trends</Text>
            <Space wrap>
              <div>
                <Text style={{ display: "block", marginBottom: 8 }}>
                  Date Range:
                </Text>
                <DatePicker.RangePicker
                  value={dateRange}
                  onChange={handleDateRangeChange}
                  format="YYYY-MM-DD"
                  allowClear
                  style={{ width: 250 }}
                />
              </div>
              <div>
                <Text style={{ display: "block", marginBottom: 8 }}>
                  Action Type:
                </Text>
                <Select
                  value={selectedActionType}
                  onChange={setSelectedActionType}
                  style={{ width: 150 }}
                  options={actionTypeOptions}
                />
              </div>
            </Space>
          </Space>
        </Col>
      </Row>

      <Row gutter={[12, 12]}>
        <Col span={24}>
          <Card
            title="System Activity Trends (Last 30 Days)"
            size="small"
            loading={loadingLogs}
          >
            <ResponsiveContainer width="100%" height={340}>
              <LineChart
                data={actionTrendData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  ticks={actionTrendTicks}
                  interval={0}
                  tickFormatter={(dateStr) => dayjs(dateStr).format("MMM D")}
                />
                <YAxis />
                <Tooltip
                  labelFormatter={(dateStr) =>
                    dayjs(dateStr).format("MMM DD, YYYY")
                  }
                  formatter={(value, name) => [
                    value,
                    name.charAt(0).toUpperCase() + name.slice(1) + " Actions",
                  ]}
                />
                <Legend />
                {(selectedActionType === "all" ||
                  selectedActionType === "create") && (
                  <Line
                    type="monotone"
                    dataKey="create"
                    stroke="#52c41a"
                    strokeWidth={2}
                    name="Create"
                  />
                )}
                {(selectedActionType === "all" ||
                  selectedActionType === "update") && (
                  <Line
                    type="monotone"
                    dataKey="update"
                    stroke="#1890ff"
                    strokeWidth={2}
                    name="Update"
                  />
                )}
                {(selectedActionType === "all" ||
                  selectedActionType === "delete") && (
                  <Line
                    type="monotone"
                    dataKey="delete"
                    stroke="#f5222d"
                    strokeWidth={2}
                    name="Delete"
                  />
                )}
                {(selectedActionType === "all" ||
                  selectedActionType === "login") && (
                  <Line
                    type="monotone"
                    dataKey="login"
                    stroke="#722ed1"
                    strokeWidth={2}
                    name="Log In"
                  />
                )}
                {(selectedActionType === "all" ||
                  selectedActionType === "logout") && (
                  <Line
                    type="monotone"
                    dataKey="logout"
                    stroke="#fa8c16"
                    strokeWidth={2}
                    name="Log Out"
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
