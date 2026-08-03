import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { ArrowLeftOutlined, SearchOutlined } from "@ant-design/icons";
import {
  Button,
  Card,
  Col,
  Input,
  Row,
  Tabs,
  Tag,
  Typography,
  Space,
} from "antd";
import { AuthContext } from "../../../context/AuthContext";
import { API_BASE } from "../../../utils/API_BASE";
import UserAvatar from "../../../components/common/UserAvatar";
import ResultPopup from "../../../components/common/ResultPopup";
import ResponsiveTable from "../../../components/common/ResponsiveTable";
import DateTimeCell from "../../../components/common/DateTimeCell";
import { matchesSearch } from "../../../utils/search";

const { Text, Title } = Typography;
const isCompletedTask = (task) =>
  ["completed", "turned in", "approved"].includes(
    String(task?.status || "").toLowerCase(),
  );
export default function MechanicList() {
  const { getAuthHeader } = useContext(AuthContext);
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedMechanic, setSelectedMechanic] = useState(null);
  const [tab, setTab] = useState("ongoing");
  const [popup, setPopup] = useState({
    open: false,
    status: "success",
    title: "",
    subTitle: "",
  });

  const resultPopup = (
    <ResultPopup
      open={popup.open}
      status={popup.status}
      title={popup.title}
      subTitle={popup.subTitle}
      onClose={() => setPopup((prev) => ({ ...prev, open: false }))}
    />
  );

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const headers = await getAuthHeader();
      const [usersRes, tasksRes] = await Promise.all([
        fetch(`${API_BASE}/api/user/assignable-users`, { headers }),
        fetch(`${API_BASE}/api/tasks/getAll`, { headers }),
      ]);
      const usersData = await usersRes.json();
      const tasksData = await tasksRes.json();
      if (!usersRes.ok)
        throw new Error(usersData.message || "Failed to load users");
      if (!tasksRes.ok)
        throw new Error(tasksData.message || "Failed to load tasks");
      setUsers(Array.isArray(usersData.data) ? usersData.data : []);
      setTasks(Array.isArray(tasksData.data) ? tasksData.data : []);
    } catch (error) {
      setPopup({
        open: true,
        status: "error",
        title: "Operation failed!",
        subTitle: error.message || "Failed to load mechanics",
      });
    } finally {
      setLoading(false);
    }
  }, [getAuthHeader]);

  useEffect(() => {
    load();
  }, [load]);

  const mechanics = useMemo(
    () =>
      users
        .filter(
          (item) =>
            String(item.jobTitle || "").toLowerCase() === "mechanic" &&
            String(item.status || "").toLowerCase() === "active",
        )
        .map((item) => {
          const id = item._id || item.id;
          const assigned = tasks.filter(
            (task) => String(task.assignedTo) === String(id),
          );
          const activeTasks = assigned.filter(
            (task) => !isCompletedTask(task),
          ).length;
          const isOnline = Boolean(item?.isOnline ?? item?.online);
          return {
            key: id,
            id,
            name: `${item.firstName || ""} ${item.lastName || ""}`.trim(),
            jobTitle: item.jobTitle,
            image: item.image || "",
            isOnline,
            platform: isOnline ? item.platform || "unknown" : "-",
            activeTasks,
            status: isOnline
              ? activeTasks >= 3
                ? "Busy"
                : "Available"
              : "Offline",
          };
        })
        .filter((item) => matchesSearch(query, item)),
    [query, tasks, users],
  );

  const assignedTasksForSelectedMechanic = useMemo(() => {
    if (!selectedMechanic) return [];
    return tasks.filter(
      (task) => String(task.assignedTo) === String(selectedMechanic.id),
    );
  }, [selectedMechanic, tasks]);

  const selectedTasks = useMemo(
    () =>
      assignedTasksForSelectedMechanic.filter((task) =>
        tab === "completed" ? isCompletedTask(task) : !isCompletedTask(task),
      ),
    [assignedTasksForSelectedMechanic, tab],
  );

  const selectedTaskCounts = useMemo(
    () => ({
      ongoing: assignedTasksForSelectedMechanic.filter(
        (task) => !isCompletedTask(task),
      ).length,
      completed: assignedTasksForSelectedMechanic.filter((task) =>
        isCompletedTask(task),
      ).length,
    }),
    [assignedTasksForSelectedMechanic],
  );

  if (selectedMechanic) {
    return (
      <div style={{ padding: 20 }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => setSelectedMechanic(null)}
          type="text"
          style={{ marginBottom: 8 }}
        >
          Back
        </Button>
        <Card>
          <Space align="center" size={12}>
            <UserAvatar
              image={selectedMechanic.image}
              name={selectedMechanic.name}
              size={56}
            />
            <div>
              <Title level={4} style={{ marginBottom: 0 }}>
                {selectedMechanic.name}
              </Title>
              <Text type="secondary">
                {selectedMechanic.jobTitle} |{" "}
                {selectedMechanic.isOnline
                  ? `Online | ${selectedMechanic.platform}`
                  : "Offline"}
              </Text>
            </div>
          </Space>
        </Card>

        <Tabs
          style={{ marginTop: 10 }}
          activeKey={tab}
          onChange={setTab}
          items={[
            {
              key: "ongoing",
              label: `Ongoing (${selectedTaskCounts.ongoing})`,
            },
            {
              key: "completed",
              label: `Completed (${selectedTaskCounts.completed})`,
            },
          ]}
        />

        <ResponsiveTable
          loading={loading}
          rowKey={(record) => record._id || record.id}
          dataSource={selectedTasks}
          size={"small"}
          pagination={{ pageSize: 8 }}
          columns={[
            { title: "Task", dataIndex: "title" },
            { title: "Aircraft", dataIndex: "aircraft" },
            {
              title: "Due",
              render: (_, record) => (
                <DateTimeCell
                  value={record.endDateTime || record.dueDate}
                  fallback="-"
                />
              ),
            },
            {
              title: "Status",
              dataIndex: "status",
              render: (value) => <Tag>{value}</Tag>,
            },
          ]}
        />
        {resultPopup}
      </div>
    );
  }

  return (
    <div style={{ padding: 20 }}>
      <Card>
        <Row gutter={[12, 12]}>
          <Col xs={24} md={10}>
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search mechanic"
              prefix={<SearchOutlined />}
              size="large"
            />
          </Col>
        </Row>
      </Card>

      <ResponsiveTable
        style={{ marginTop: 12 }}
        loading={loading}
        dataSource={mechanics}
        pagination={{ pageSize: 10 }}
        size={"small"}
        onRow={(record) => ({ onClick: () => setSelectedMechanic(record) })}
        columns={[
          {
            title: "Name",
            dataIndex: "name",
            render: (value, record) => (
              <Space>
                <UserAvatar image={record.image} name={value} size={32} />
                <Text>{value}</Text>
              </Space>
            ),
          },
          { title: "Job Title", dataIndex: "jobTitle" },
          { title: "Platform", dataIndex: "platform" },
          { title: "Active Tasks", dataIndex: "activeTasks" },
          {
            title: "Status",
            dataIndex: "status",
            render: (value) => (
              <Tag
                color={
                  value === "Available"
                    ? "green"
                    : value === "Busy"
                      ? "red"
                      : "default"
                }
              >
                {value}
              </Tag>
            ),
          },
        ]}
      />
      {resultPopup}
    </div>
  );
}
