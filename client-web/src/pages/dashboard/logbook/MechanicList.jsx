import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { ArrowLeftOutlined, SearchOutlined } from "@ant-design/icons";
import { Button, Card, Col, Input, Row, Table, Tabs, Tag, Typography, message } from "antd";
import { AuthContext } from "../../../context/AuthContext";
import { API_BASE } from "../../../utils/API_BASE";

const { Text, Title } = Typography;
const isCompletedTask = (task) => ["completed", "turned in", "approved"].includes(String(task?.status || "").toLowerCase());

export default function MechanicList() {
  const { getAuthHeader } = useContext(AuthContext);
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedMechanic, setSelectedMechanic] = useState(null);
  const [tab, setTab] = useState("ongoing");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const headers = await getAuthHeader();
      const [usersRes, tasksRes] = await Promise.all([
        fetch(`${API_BASE}/api/user/get-all-users`, { headers }),
        fetch(`${API_BASE}/api/tasks/getAll`, { headers }),
      ]);
      const usersData = await usersRes.json();
      const tasksData = await tasksRes.json();
      if (!usersRes.ok) throw new Error(usersData.message || "Failed to load users");
      if (!tasksRes.ok) throw new Error(tasksData.message || "Failed to load tasks");
      setUsers(Array.isArray(usersData.data) ? usersData.data : []);
      setTasks(Array.isArray(tasksData.data) ? tasksData.data : []);
    } catch (error) {
      message.error(error.message || "Failed to load mechanics");
    } finally {
      setLoading(false);
    }
  }, [getAuthHeader]);

  useEffect(() => {
    load();
  }, [load]);

  const mechanics = useMemo(() => users
    .filter((item) => String(item.jobTitle || "").toLowerCase() === "mechanic" && String(item.status || "").toLowerCase() === "active")
    .map((item) => {
      const assigned = tasks.filter((task) => String(task.assignedTo) === String(item._id));
      const activeTasks = assigned.filter((task) => !isCompletedTask(task)).length;
      const isOnline = Boolean(item?.isOnline ?? item?.online);
      return {
        key: item._id,
        id: item._id,
        name: `${item.firstName || ""} ${item.lastName || ""}`.trim(),
        jobTitle: item.jobTitle,
        isOnline,
        platform: item.platform || "unknown",
        activeTasks,
        status: isOnline ? (activeTasks >= 3 ? "Busy" : "Available") : "Offline",
      };
    })
    .filter((item) => !query.trim() || item.name.toLowerCase().includes(query.trim().toLowerCase())), [query, tasks, users]);

  const selectedTasks = useMemo(() => {
    if (!selectedMechanic) return [];
    const assigned = tasks.filter((task) => String(task.assignedTo) === String(selectedMechanic.id));
    return assigned.filter((task) => (tab === "completed" ? isCompletedTask(task) : !isCompletedTask(task)));
  }, [selectedMechanic, tab, tasks]);

  if (selectedMechanic) {
    return (
      <div style={{ padding: 20 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => setSelectedMechanic(null)} type="text" style={{ marginBottom: 8 }}>Back</Button>
        <Card>
          <Title level={4} style={{ marginBottom: 0 }}>{selectedMechanic.name}</Title>
          <Text type="secondary">{selectedMechanic.jobTitle} | {selectedMechanic.isOnline ? "Online" : "Offline"} | {selectedMechanic.platform}</Text>
        </Card>

        <Tabs
          style={{ marginTop: 10 }}
          activeKey={tab}
          onChange={setTab}
          items={[
            { key: "ongoing", label: `Ongoing (${selectedTasks.filter((task) => !isCompletedTask(task)).length})` },
            { key: "completed", label: `Completed (${selectedTasks.filter((task) => isCompletedTask(task)).length})` },
          ]}
        />

        <Table
          loading={loading}
          rowKey={(record) => record._id || record.id}
          dataSource={selectedTasks}
          pagination={{ pageSize: 8 }}
          columns={[
            { title: "Task", dataIndex: "title" },
            { title: "Aircraft", dataIndex: "aircraft" },
            { title: "Due", render: (_, record) => record.endDateTime || record.dueDate || "-" },
            { title: "Status", dataIndex: "status", render: (value) => <Tag>{value}</Tag> },
          ]}
        />
      </div>
    );
  }

  return (
    <div style={{ padding: 20 }}>
      <Card>
        <Row gutter={[12, 12]}>
          <Col xs={24} md={10}><Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search mechanic" prefix={<SearchOutlined />} /></Col>
        </Row>
      </Card>

      <Table
        style={{ marginTop: 12 }}
        loading={loading}
        dataSource={mechanics}
        pagination={{ pageSize: 10 }}
        onRow={(record) => ({ onClick: () => setSelectedMechanic(record) })}
        columns={[
          { title: "Name", dataIndex: "name" },
          { title: "Job Title", dataIndex: "jobTitle" },
          { title: "Platform", dataIndex: "platform" },
          { title: "Active Tasks", dataIndex: "activeTasks" },
          { title: "Status", dataIndex: "status", render: (value) => <Tag color={value === "Available" ? "green" : value === "Busy" ? "red" : "default"}>{value}</Tag> },
        ]}
      />
    </div>
  );
}
