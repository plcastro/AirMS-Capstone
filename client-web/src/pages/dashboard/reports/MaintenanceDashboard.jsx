import React, { useContext, useEffect, useState } from "react";
import {
  Row,
  Col,
  Card,
  Input,
  Button,
  Select,
  Statistic,
  message,
  Typography,
  Segmented,
  Table,
  Tag,
} from "antd";
import { SearchOutlined, ExportOutlined } from "@ant-design/icons";

import MaintenancePerformance from "./MaintenancePerformance";
import MaintenanceSummary from "./MaintenanceSummary";
import MaintenanceHistory from "./MaintenanceHistory";
import ComponentUsage from "./ComponentUsage";
import {
  FlightLogReport,
  InspectionReport,
  PartsRequisitionReport,
} from "./ModuleReports";
import { AuthContext } from "../../../context/AuthContext";
import {
  exportToExcel,
  exportToPDF,
} from "../../../components/common/ExportFile";
import { API_BASE } from "../../../utils/API_BASE";
const { Title, Text } = Typography;

export default function MaintenanceDashboard() {
  const { getValidToken } = useContext(AuthContext);
  const [searchText, setSearchText] = useState("");
  const [selectedFileType, setSelectedFileType] = useState("PDF");
  const [fileTypeOptions] = useState(["PDF", "Excel"]);
  const [tasks, setTasks] = useState([]);
  const [partsRecords, setPartsRecords] = useState([]);
  const [flightLogs, setFlightLogs] = useState([]);
  const [preInspections, setPreInspections] = useState([]);
  const [postInspections, setPostInspections] = useState([]);
  const [partsRequisitions, setPartsRequisitions] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [stats, setStats] = useState({ completed: 0, dueSoon: 0, overdue: 0 });
  const [taskDetailView, setTaskDetailView] = useState("dueSoon");

  const isCompletedTask = (task = {}) => {
    const status = String(task.status || "")
      .trim()
      .toLowerCase();
    return (
      ["completed", "turned in", "approved"].includes(status) ||
      task.isApproved === true ||
      Boolean(task.completedAt)
    );
  };

  const getTaskDueDate = (task = {}) => {
    const value = task.dueDate || task.endDateTime || task.dateRectified;
    if (!value) return null;

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  };

  const formatDate = (value) => {
    if (!value) return "N/A";

    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "N/A";

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getTaskCompletionDate = (task = {}) =>
    task.approvedAt || task.completedAt || task.dateRectified || task.updatedAt;

  const getTaskDetailCategory = (task = {}) => {
    if (isCompletedTask(task)) return "completed";

    const dueDate = getTaskDueDate(task);
    if (!dueDate) return "other";

    const now = new Date();
    const threeDaysLater = new Date();
    threeDaysLater.setDate(now.getDate() + 3);

    if (dueDate < now) return "overdue";
    if (dueDate <= threeDaysLater) return "dueSoon";
    return "other";
  };

  const getArrayData = (payload) => {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.records)) return payload.records;
    return [];
  };

  useEffect(() => {
    const fetchReportData = async () => {
      try {
        setLoadingTasks(true);

        const token = await getValidToken();
        if (!token) {
          throw new Error("No authentication token found. Please log in.");
        }

        const headers = { Authorization: `Bearer ${token}` };
        const requests = {
          tasks: fetch(`${API_BASE}/api/tasks/getAll`, { headers }),
          parts: fetch(`${API_BASE}/api/parts-monitoring?page=1&limit=1000`, {
            headers,
          }),
          flightLogs: fetch(
            `${API_BASE}/api/flightlogs?page=1&limit=500&sortBy=date&sortOrder=desc`,
            { headers },
          ),
          preInspections: fetch(
            `${API_BASE}/api/pre-inspections/getAllPreInspection`,
            { headers },
          ),
          postInspections: fetch(
            `${API_BASE}/api/post-inspections/getAllPostInspection`,
            { headers },
          ),
          partsRequisitions: fetch(
            `${API_BASE}/api/parts-requisition/get-all-requisition`,
            { headers },
          ),
        };

        const entries = await Promise.all(
          Object.entries(requests).map(async ([key, request]) => {
            try {
              const response = await request;
              if (!response.ok) {
                if (response.status === 401) {
                  localStorage.removeItem("token");
                  throw new Error("Session expired. Please log in again.");
                }
                throw new Error(`${key} request failed (${response.status})`);
              }
              return [key, await response.json()];
            } catch (err) {
              console.error(`Failed to fetch ${key}`, err);
              message.warning(`Some ${key} report data could not be loaded.`);
              return [key, null];
            }
          }),
        );

        const resultMap = Object.fromEntries(entries);
        const taskData = getArrayData(resultMap.tasks);
        const partsData = getArrayData(resultMap.parts);
        setTasks(taskData);
        setPartsRecords(partsData);
        setFlightLogs(getArrayData(resultMap.flightLogs));
        setPreInspections(getArrayData(resultMap.preInspections));
        setPostInspections(getArrayData(resultMap.postInspections));
        setPartsRequisitions(getArrayData(resultMap.partsRequisitions));

        const now = new Date();
        const threeDaysLater = new Date();
        threeDaysLater.setDate(now.getDate() + 3);

        const completed = taskData.filter((task) =>
          isCompletedTask(task),
        ).length;
        const dueSoon = taskData.filter((task) => {
          if (isCompletedTask(task)) return false;
          const dueDate = getTaskDueDate(task);
          return dueDate && dueDate >= now && dueDate <= threeDaysLater;
        }).length;
        const overdue = taskData.filter((task) => {
          if (isCompletedTask(task)) return false;
          const dueDate = getTaskDueDate(task);
          return dueDate && dueDate < now;
        }).length;

        setStats({ completed, dueSoon, overdue });
      } catch (err) {
        console.error("Failed to fetch report data", err);
        message.error(err.message || "Failed to fetch report data");
      } finally {
        setLoadingTasks(false);
      }
    };

    fetchReportData();
  }, [getValidToken]);

  const cards = [
    {
      key: "performance",
      title: "Performance Overview",
      component: <MaintenancePerformance tasks={tasks} />,
      keywords: ["performance", "overview"],
    },
    {
      key: "history",
      title: "Maintenance History",
      component: <MaintenanceHistory tasks={tasks} loading={loadingTasks} />,
      keywords: ["history", "maintenance", "record"],
    },
    {
      key: "summary",
      title: "Maintenance Insights",
      component: <MaintenanceSummary tasks={tasks} loading={loadingTasks} />,
      keywords: ["summary", "insights", "repair"],
    },
    {
      key: "component",
      title: "Component Analysis",
      component: (
        <ComponentUsage records={partsRecords} loading={loadingTasks} />
      ),
      keywords: ["component", "usage", "analysis"],
    },
    {
      key: "flight-log",
      title: "Flight Log Report",
      component: (
        <FlightLogReport records={flightLogs} loading={loadingTasks} />
      ),
      keywords: ["flight", "log", "aircraft", "release"],
    },
    {
      key: "pre-inspection",
      title: "Pre-Inspection Report",
      component: (
        <InspectionReport
          title="Pre-Inspection Report"
          records={preInspections}
          loading={loadingTasks}
        />
      ),
      keywords: ["pre", "inspection", "pre-inspection", "aircraft"],
    },
    {
      key: "post-inspection",
      title: "Post-Inspection Report",
      component: (
        <InspectionReport
          title="Post-Inspection Report"
          records={postInspections}
          loading={loadingTasks}
        />
      ),
      keywords: ["post", "inspection", "post-inspection", "aircraft"],
    },
    {
      key: "parts-requisition",
      title: "Parts Requisition Report",
      component: (
        <PartsRequisitionReport
          records={partsRequisitions}
          loading={loadingTasks}
        />
      ),
      keywords: ["parts", "requisition", "warehouse", "wrs", "stock"],
    },
  ];

  const filteredCards = cards
    .map((card) => ({
      ...card,
      relevance: card.keywords.some((kw) =>
        kw.toLowerCase().includes(searchText.toLowerCase()),
      )
        ? 1
        : 0,
    }))
    .sort((a, b) => b.relevance - a.relevance)
    .filter((card) => searchText === "" || card.relevance > 0);

  const taskDetailRows = tasks
    .filter((task) => getTaskDetailCategory(task) === taskDetailView)
    .map((task, index) => {
      const dueDate = getTaskDueDate(task);

      return {
        key: task._id || task.id || `${task.title}-${index}`,
        aircraft: task.aircraft || "N/A",
        task: task.title || task.summary?.category || "Untitled task",
        mechanic:
          task.assignedToName ||
          task.assignedMechanic ||
          task.assignedTo ||
          "Unassigned",
        maintenanceType: task.maintenanceType || "N/A",
        priority: task.priority || "Normal",
        status: task.status || "Pending",
        dueDate,
        completedDate: getTaskCompletionDate(task),
        findings: task.findings || task.defects || task.summary?.remarks || "",
      };
    })
    .sort((left, right) => {
      const leftDate = left.dueDate ? left.dueDate.getTime() : Infinity;
      const rightDate = right.dueDate ? right.dueDate.getTime() : Infinity;

      if (taskDetailView === "completed") {
        return (
          new Date(right.completedDate || 0).getTime() -
          new Date(left.completedDate || 0).getTime()
        );
      }

      return leftDate - rightDate;
    });

  const taskDetailColumns = [
    {
      title: "Aircraft",
      dataIndex: "aircraft",
      key: "aircraft",
      width: 120,
      render: (value) => <strong>{value}</strong>,
    },
    {
      title: "Task",
      dataIndex: "task",
      key: "task",
      width: 240,
    },
    {
      title: "Assigned Mechanic",
      dataIndex: "mechanic",
      key: "mechanic",
      width: 180,
    },
    {
      title: "Type",
      dataIndex: "maintenanceType",
      key: "maintenanceType",
      width: 170,
    },
    {
      title: "Due Date",
      dataIndex: "dueDate",
      key: "dueDate",
      width: 140,
      render: formatDate,
    },
    {
      title: "Completed",
      dataIndex: "completedDate",
      key: "completedDate",
      width: 140,
      render: formatDate,
    },
    {
      title: "Priority",
      dataIndex: "priority",
      key: "priority",
      width: 110,
      render: (value) => (
        <Tag color={String(value).toLowerCase() === "urgent" ? "red" : "blue"}>
          {value}
        </Tag>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 130,
      render: (value) => {
        const normalized = String(value || "").toLowerCase();
        const color =
          taskDetailView === "overdue"
            ? "red"
            : ["completed", "turned in", "approved"].includes(normalized)
              ? "green"
              : "gold";

        return <Tag color={color}>{String(value || "N/A").toUpperCase()}</Tag>;
      },
    },
    {
      title: "Notes / Findings",
      dataIndex: "findings",
      key: "findings",
      ellipsis: true,
      render: (value) => value || "N/A",
    },
  ];

  return (
    <div
      style={{
        padding: 20,
        minHeight: "100vh",
        overflowY: "scroll",
        height: "100%",
      }}
    >
      <Card style={{ marginBottom: 10 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={24} md={12} lg={10}>
            <Input
              size="large"
              placeholder="Search..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
            />
          </Col>

          <Col xs={12} sm={8} md={6} lg={5}>
            <Select
              value={selectedFileType}
              onChange={setSelectedFileType}
              size="large"
              style={{ width: "100%" }}
              options={fileTypeOptions.map((type) => ({
                label: type,
                value: type,
              }))}
            />
          </Col>

          <Col xs={12} sm={8} md={6} lg={4}>
            <Button
              type="primary"
              icon={<ExportOutlined />}
              block
              onClick={() => {
                if (selectedFileType === "PDF") exportToPDF();
                else exportToExcel();
              }}
            >
              Export
            </Button>
          </Col>
        </Row>
      </Card>

      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card
            hoverable
            onClick={() => setTaskDetailView("completed")}
            style={{
              borderColor:
                taskDetailView === "completed" ? "#048a25" : undefined,
            }}
          >
            <Statistic
              title="Completed Tasks"
              value={stats.completed}
              styles={{ content: { color: "#048a25" } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card
            hoverable
            onClick={() => setTaskDetailView("dueSoon")}
            style={{
              borderColor: taskDetailView === "dueSoon" ? "#faad14" : undefined,
            }}
          >
            <Statistic
              title="Due Soon (next 3 days)"
              value={stats.dueSoon}
              styles={{ content: { color: "#faad14" } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card
            hoverable
            onClick={() => setTaskDetailView("overdue")}
            style={{
              borderColor: taskDetailView === "overdue" ? "#cf1322" : undefined,
            }}
          >
            <Statistic
              title="Overdue Tasks"
              value={stats.overdue}
              styles={{ content: { color: "#cf1322" } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Module Reports"
              value={cards.length}
              styles={{ content: { color: "#26866f" } }}
            />
          </Card>
        </Col>
      </Row>

      <Card
        style={{ marginBottom: 20 }}
        title="Task Details"
        extra={
          <Segmented
            value={taskDetailView}
            onChange={setTaskDetailView}
            options={[
              { label: `Completed (${stats.completed})`, value: "completed" },
              { label: `Due Soon (${stats.dueSoon})`, value: "dueSoon" },
              { label: `Overdue (${stats.overdue})`, value: "overdue" },
            ]}
          />
        }
      >
        <Text type="secondary" style={{ display: "block", marginBottom: 12 }}>
          These are the task records behind the summary cards above.
        </Text>
        <Table
          columns={taskDetailColumns}
          dataSource={taskDetailRows}
          loading={loadingTasks}
          pagination={{
            pageSize: 5,
            showSizeChanger: true,
            pageSizeOptions: ["5", "10", "15"],
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total}`,
          }}
          scroll={{ x: 1300 }}
        />
      </Card>

      <Row gutter={[16, 16]} style={{ marginBottom: 100 }}>
        {filteredCards.map((card) => (
          <Col xs={24} key={card.key}>
            <Card title={card.title}>{card.component}</Card>
          </Col>
        ))}
      </Row>
    </div>
  );
}
