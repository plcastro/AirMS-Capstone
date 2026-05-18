import React, { useContext, useEffect, useState, useMemo } from "react";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  App,
  Row,
  Col,
  Card,
  Input,
  Button,
  Select,
  Statistic,
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
import { SDMChart } from "../../../components/common/PieChart";
import { AuthContext } from "../../../context/AuthContext";
import { API_BASE } from "../../../utils/API_BASE";
const { Title, Text } = Typography;

const normalizeReportStatus = (value) =>
  String(value || "Unknown")
    .replace(/_/g, " ")
    .trim();

const countBy = (records, getKey) =>
  records.reduce((acc, record) => {
    const key = getKey(record) || "Unknown";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

const toRows = (counts) =>
  Object.entries(counts)
    .map(([label, value]) => ({ label, value }))
    .sort((left, right) => right.value - left.value);

const monthLabel = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No date";
  return date.toLocaleString("en-US", { month: "short", year: "numeric" });
};

const getRecordDate = (record = {}) =>
  record.date ||
  record.dateRequested ||
  record.dateAdded ||
  record.createdAt ||
  record.updatedAt;

const buildSafeFileName = (value) =>
  String(value || "reports-analytics")
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-");

const inferTaskBase = (task = {}) =>
  String(
    task.base ||
      task.locationBase ||
      task.assignedBase ||
      task.stationBase ||
      "UNKNOWN",
  )
    .trim()
    .toUpperCase();
const REPORT_CATEGORY_ORDER = ["Performance", "Inventory", "Logbook"];

const isTaskCompletedLike = (task = {}) => {
  const status = String(task.status || "")
    .trim()
    .toLowerCase();
  return (
    ["completed", "turned in", "approved"].includes(status) ||
    task.isApproved === true ||
    Boolean(task.completedAt)
  );
};

const isDamageRelatedTask = (task = {}) => {
  const text = [
    task.status,
    task.title,
    task.findings,
    task.defects,
    task.maintenanceType,
    task.summary?.remarks,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return ["damage", "damaged", "defect", "crack", "fault", "issue"].some((k) =>
    text.includes(k),
  );
};

const isRepairedTask = (task = {}) => {
  if (isTaskCompletedLike(task)) return true;
  const text = [
    task.status,
    task.title,
    task.findings,
    task.defects,
    task.maintenanceType,
    task.summary?.remarks,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return ["repair", "repaired", "rectified", "fixed", "resolved"].some((k) =>
    text.includes(k),
  );
};

export default function MaintenanceDashboard() {
  const { message } = App.useApp();
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
  const [baseAnalytics, setBaseAnalytics] = useState(null);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [stats, setStats] = useState({ completed: 0, dueSoon: 0, overdue: 0 });
  const [taskDetailView, setTaskDetailView] = useState("dueSoon");
  const [activeKpi, setActiveKpi] = useState("dueSoon");

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
          baseAnalytics: fetch(
            `${API_BASE}/api/tasks/analytics/base-maintenance`,
            {
              headers,
            },
          ),
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
        setBaseAnalytics(resultMap.baseAnalytics?.data || null);
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
      category: "Performance",
      title: "Performance Overview",
      component: <MaintenancePerformance tasks={tasks} />,
      keywords: ["performance", "overview"],
    },
    {
      key: "history",
      category: "Performance",
      title: "Maintenance History",
      component: <MaintenanceHistory tasks={tasks} loading={loadingTasks} />,
      keywords: ["history", "maintenance", "record"],
    },
    {
      key: "summary",
      category: "Performance",
      title: "Maintenance Insights",
      component: <MaintenanceSummary tasks={tasks} loading={loadingTasks} />,
      keywords: ["summary", "insights", "repair"],
    },
    {
      key: "component",
      category: "Inventory",
      title: "Component Analysis",
      component: (
        <ComponentUsage records={partsRecords} loading={loadingTasks} />
      ),
      keywords: ["component", "usage", "analysis"],
    },
    {
      key: "flight-log",
      category: "Logbook",
      title: "Flight Log Report",
      component: (
        <FlightLogReport records={flightLogs} loading={loadingTasks} />
      ),
      keywords: ["flight", "log", "aircraft", "release"],
    },
    {
      key: "pre-inspection",
      category: "Logbook",
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
      category: "Logbook",
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
      category: "Inventory",
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

  const groupedFilteredCards = React.useMemo(
    () =>
      filteredCards.reduce((acc, card) => {
        const category = card.category || "Other";
        if (!acc[category]) acc[category] = [];
        acc[category].push(card);
        return acc;
      }, {}),
    [filteredCards],
  );
  const orderedReportGroups = React.useMemo(() => {
    const knownGroups = REPORT_CATEGORY_ORDER
      .filter((category) => groupedFilteredCards[category]?.length)
      .map((category) => [category, groupedFilteredCards[category]]);
    const otherGroups = Object.entries(groupedFilteredCards).filter(
      ([category]) => !REPORT_CATEGORY_ORDER.includes(category),
    );
    return [...knownGroups, ...otherGroups];
  }, [groupedFilteredCards]);

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

  const baseDamageRepairSummary = React.useMemo(() => {
    if (baseAnalytics?.byBase?.length) {
      const rows = baseAnalytics.byBase.map((row) => ({
        label: row.base,
        value: row.damagedCount || 0,
      }));
      const repairedRows = baseAnalytics.byBase.map((row) => ({
        label: row.base,
        value: row.repairedCount || 0,
      }));
      return {
        topDamagedBase: baseAnalytics.topDamagedBase
          ? {
              label: baseAnalytics.topDamagedBase.base,
              value: baseAnalytics.topDamagedBase.damagedCount || 0,
            }
          : { label: "N/A", value: 0 },
        topRepairedBase: baseAnalytics.topRepairedBase
          ? {
              label: baseAnalytics.topRepairedBase.base,
              value: baseAnalytics.topRepairedBase.repairedCount || 0,
            }
          : { label: "N/A", value: 0 },
        damageRows: rows.sort((a, b) => b.value - a.value),
        repairRows: repairedRows.sort((a, b) => b.value - a.value),
        averageRectificationHours:
          baseAnalytics?.totals?.averageRectificationHours || 0,
        sameDayRepairCount: baseAnalytics?.totals?.sameDayRepairCount || 0,
      };
    }

    const damageCounts = {};
    const repairCounts = {};

    tasks.forEach((task) => {
      const base = inferTaskBase(task);
      if (isDamageRelatedTask(task)) {
        damageCounts[base] = (damageCounts[base] || 0) + 1;
      }
      if (isRepairedTask(task)) {
        repairCounts[base] = (repairCounts[base] || 0) + 1;
      }
    });

    const damageRows = toRows(damageCounts);
    const repairRows = toRows(repairCounts);

    return {
      topDamagedBase: damageRows[0] || { label: "N/A", value: 0 },
      topRepairedBase: repairRows[0] || { label: "N/A", value: 0 },
      damageRows,
      repairRows,
      averageRectificationHours: 0,
      sameDayRepairCount: 0,
    };
  }, [tasks, baseAnalytics]);

  const chartPalette = [
    "#cf1322",
    "#fa541c",
    "#faad14",
    "#13c2c2",
    "#2f54eb",
    "#722ed1",
  ];
  const damageBasePieData = useMemo(
    () =>
      baseDamageRepairSummary.damageRows.map((row, index) => ({
        name: row.label,
        value: row.value,
        fill: chartPalette[index % chartPalette.length],
      })),
    [baseDamageRepairSummary.damageRows],
  );

  const repairedBasePieData = useMemo(
    () =>
      baseDamageRepairSummary.repairRows.map((row, index) => ({
        name: row.label,
        value: row.value,
        fill: chartPalette[index % chartPalette.length],
      })),
    [baseDamageRepairSummary.repairRows],
  );

  const buildReportExportSections = () => {
    const completedTasks = tasks.filter((task) => isCompletedTask(task)).length;
    const totalRequisitionItems = partsRequisitions.reduce(
      (sum, record) => sum + (record.items?.length || 0),
      0,
    );
    const componentRows = partsRecords.flatMap((record) =>
      (record.parts || [])
        .filter((part) => part.rowType !== "header" && part.componentName)
        .map((part) => ({
          aircraft: record.aircraft || "Unknown",
          component: part.componentName,
          daysRemaining: part.daysRemaining || "",
          timeRemaining: part.timeRemaining || "",
          due: part.due || "",
        })),
    );
    const dueComponents = componentRows.filter((part) => {
      const days = Number(part.daysRemaining);
      const hours = Number(part.timeRemaining);
      return (
        String(part.due || "")
          .toLowerCase()
          .includes("due") ||
        (Number.isFinite(days) && days <= 30) ||
        (Number.isFinite(hours) && hours <= 50)
      );
    });

    return [
      {
        title: "Overview Statistics",
        columns: ["Metric", "Value"],
        rows: [
          ["Total Tasks", tasks.length],
          ["Completed Tasks", completedTasks],
          ["Due Soon Tasks", stats.dueSoon],
          ["Overdue Tasks", stats.overdue],
          ["Parts Monitoring Aircraft", partsRecords.length],
          ["Tracked Components", componentRows.length],
          ["Due / Due Soon Components", dueComponents.length],
          ["Flight Logs", flightLogs.length],
          ["Pre-Inspections", preInspections.length],
          ["Post-Inspections", postInspections.length],
          ["Parts Requisitions", partsRequisitions.length],
          ["Requested Line Items", totalRequisitionItems],
          [
            "Top Base (Most Damage Reports)",
            `${baseDamageRepairSummary.topDamagedBase.label} (${baseDamageRepairSummary.topDamagedBase.value})`,
          ],
          [
            "Top Base (Most Repaired Aircraft)",
            `${baseDamageRepairSummary.topRepairedBase.label} (${baseDamageRepairSummary.topRepairedBase.value})`,
          ],
        ],
      },
      {
        title: "Base Damage and Repair Counts",
        columns: ["Base", "Damage Reports", "Repaired Aircraft"],
        rows: Array.from(
          new Set([
            ...baseDamageRepairSummary.damageRows.map((row) => row.label),
            ...baseDamageRepairSummary.repairRows.map((row) => row.label),
          ]),
        ).map((base) => [
          base,
          baseDamageRepairSummary.damageRows.find((row) => row.label === base)
            ?.value || 0,
          baseDamageRepairSummary.repairRows.find((row) => row.label === base)
            ?.value || 0,
        ]),
      },
      {
        title: "Task Status Counts",
        columns: ["Status", "Count"],
        rows: toRows(
          countBy(tasks, (task) => normalizeReportStatus(task.status)),
        ).map((row) => [row.label, row.value]),
      },
      {
        title: "Task Priority Counts",
        columns: ["Priority", "Count"],
        rows: toRows(countBy(tasks, (task) => task.priority || "Normal")).map(
          (row) => [row.label, row.value],
        ),
      },
      {
        title: "Tasks by Aircraft",
        columns: ["Aircraft", "Count"],
        rows: toRows(countBy(tasks, (task) => task.aircraft || "Unknown")).map(
          (row) => [row.label, row.value],
        ),
      },
      {
        title: "Task Details",
        columns: [
          "Aircraft",
          "Task",
          "Assigned Mechanic",
          "Type",
          "Due Date",
          "Completed Date",
          "Priority",
          "Status",
        ],
        rows: taskDetailRows.map((row) => [
          row.aircraft,
          row.task,
          row.mechanic,
          row.maintenanceType,
          formatDate(row.dueDate),
          formatDate(row.completedDate),
          row.priority,
          row.status,
        ]),
      },
      {
        title: "Flight Log Status Counts",
        columns: ["Status", "Count"],
        rows: toRows(
          countBy(flightLogs, (record) => normalizeReportStatus(record.status)),
        ).map((row) => [row.label, row.value]),
      },
      {
        title: "Flight Logs by Month",
        columns: ["Month", "Count"],
        rows: toRows(
          countBy(flightLogs, (record) => monthLabel(getRecordDate(record))),
        ).map((row) => [row.label, row.value]),
      },
      {
        title: "Flight Logs by Aircraft",
        columns: ["Aircraft", "Count"],
        rows: toRows(
          countBy(flightLogs, (record) => record.rpc || "Unknown"),
        ).map((row) => [row.label, row.value]),
      },
      {
        title: "Pre-Inspection Status Counts",
        columns: ["Status", "Count"],
        rows: toRows(
          countBy(preInspections, (record) =>
            normalizeReportStatus(record.status),
          ),
        ).map((row) => [row.label, row.value]),
      },
      {
        title: "Post-Inspection Status Counts",
        columns: ["Status", "Count"],
        rows: toRows(
          countBy(postInspections, (record) =>
            normalizeReportStatus(record.status),
          ),
        ).map((row) => [row.label, row.value]),
      },
      {
        title: "Parts Requisition Status Counts",
        columns: ["Status", "Count"],
        rows: toRows(
          countBy(partsRequisitions, (record) =>
            normalizeReportStatus(record.status),
          ),
        ).map((row) => [row.label, row.value]),
      },
      {
        title: "Parts Requisition Item Stock Counts",
        columns: ["Stock Status", "Count"],
        rows: toRows(
          countBy(
            partsRequisitions.flatMap((record) => record.items || []),
            (item) => normalizeReportStatus(item.stockStatus),
          ),
        ).map((row) => [row.label, row.value]),
      },
      {
        title: "Component Due Statistics",
        columns: ["Aircraft", "Due / Due Soon Components"],
        rows: toRows(countBy(dueComponents, (part) => part.aircraft)).map(
          (row) => [row.label, row.value],
        ),
      },
    ];
  };

  const moduleRows = cards.map((card, index) => ({
    key: `${card.key}-${index}`,
    category: card.category || "Other",
    title: card.title,
  }));

  const baseByRectificationRows = (baseAnalytics?.byBase || []).map((row) => ({
    key: `rect-${row.base}`,
    base: row.base,
    averageRectificationHours: row.averageRectificationHours || 0,
    repairedCount: row.repairedCount || 0,
  }));

  const baseBySameDayRows = (baseAnalytics?.byBase || []).map((row) => ({
    key: `same-${row.base}`,
    base: row.base,
    sameDayRepairCount: row.sameDayRepairCount || 0,
    repairedCount: row.repairedCount || 0,
  }));

  const exportReportsToExcel = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "AirMS";
      workbook.created = new Date();

      buildReportExportSections().forEach((section) => {
        const worksheet = workbook.addWorksheet(section.title.slice(0, 31));
        worksheet.addRow(section.columns);
        worksheet.addRows(section.rows);
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFD9EAD3" },
        };
        worksheet.columns = section.columns.map((column, index) => ({
          header: column,
          key: String(index),
          width: index === 0 ? 34 : 22,
        }));
        worksheet.eachRow((row) => {
          row.eachCell((cell) => {
            cell.alignment = { vertical: "top", wrapText: true };
            cell.border = {
              top: { style: "thin" },
              left: { style: "thin" },
              bottom: { style: "thin" },
              right: { style: "thin" },
            };
          });
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      saveAs(
        blob,
        `${buildSafeFileName("Reports and Analytics")} Numbers.xlsx`,
      );
      message.success("Reports and analytics Excel exported successfully.");
    } catch (error) {
      console.error("Reports Excel export failed:", error);
      message.error(`Excel export failed: ${error.message}`);
    }
  };

  const exportReportsToPdf = async () => {
    try {
      const doc = new jsPDF("p", "pt", "a4");
      const sections = buildReportExportSections();
      let y = 42;
      const pageWidth = doc.internal.pageSize.getWidth();

      const drawKpiCard = ({
        x,
        y: cardY,
        width,
        height,
        label,
        value,
        color = [4, 138, 37],
      }) => {
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(225, 232, 238);
        doc.roundedRect(x, cardY, width, height, 8, 8, "FD");
        doc.setFillColor(...color);
        doc.rect(x, cardY, 6, height, "F");
        doc.setFontSize(9);
        doc.setTextColor(90);
        doc.text(String(label), x + 14, cardY + 18);
        doc.setFontSize(16);
        doc.setTextColor(20);
        doc.text(String(value), x + 14, cardY + 38);
      };

      const drawBarChart = ({
        x,
        y: chartY,
        width,
        height,
        title,
        rows = [],
        barColor = [4, 138, 37],
      }) => {
        doc.setDrawColor(225, 232, 238);
        doc.roundedRect(x, chartY, width, height, 8, 8, "S");
        doc.setFontSize(11);
        doc.setTextColor(30);
        doc.text(title, x + 10, chartY + 18);

        const topRows = rows.slice(0, 5);
        const max = Math.max(...topRows.map((r) => Number(r.value) || 0), 1);
        const rowHeight = 20;
        const startY = chartY + 34;
        const labelWidth = width * 0.42;
        const barMaxWidth = width * 0.45;

        topRows.forEach((row, index) => {
          const currentY = startY + index * rowHeight;
          const label = String(row.label || "Unknown").slice(0, 24);
          const value = Number(row.value) || 0;
          const barWidth = (value / max) * barMaxWidth;

          doc.setFontSize(8.5);
          doc.setTextColor(70);
          doc.text(label, x + 10, currentY + 11);

          doc.setFillColor(236, 242, 245);
          doc.roundedRect(
            x + labelWidth,
            currentY + 3,
            barMaxWidth,
            9,
            3,
            3,
            "F",
          );
          doc.setFillColor(...barColor);
          doc.roundedRect(x + labelWidth, currentY + 3, barWidth, 9, 3, 3, "F");

          doc.setFontSize(8);
          doc.setTextColor(35);
          doc.text(
            String(value),
            x + labelWidth + barMaxWidth + 6,
            currentY + 11,
          );
        });
      };

      doc.setFontSize(18);
      doc.text("Reports and Analytics - Statistics", 40, y);
      y += 18;
      doc.setFontSize(10);
      doc.setTextColor(90);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 40, y);
      doc.setTextColor(0);
      y += 20;

      const cardGap = 12;
      const cardWidth = (pageWidth - 80 - cardGap) / 2;
      const cardHeight = 52;
      drawKpiCard({
        x: 40,
        y,
        width: cardWidth,
        height: cardHeight,
        label: "Base With Most Damage Reports",
        value: `${baseDamageRepairSummary.topDamagedBase.label} (${baseDamageRepairSummary.topDamagedBase.value})`,
        color: [207, 19, 34],
      });
      drawKpiCard({
        x: 40 + cardWidth + cardGap,
        y,
        width: cardWidth,
        height: cardHeight,
        label: "Base With Most Repaired Aircraft",
        value: `${baseDamageRepairSummary.topRepairedBase.label} (${baseDamageRepairSummary.topRepairedBase.value})`,
        color: [4, 138, 37],
      });
      y += cardHeight + 10;

      drawKpiCard({
        x: 40,
        y,
        width: cardWidth,
        height: cardHeight,
        label: "Average Rectification Time",
        value: `${baseDamageRepairSummary.averageRectificationHours} hrs`,
        color: [24, 144, 255],
      });
      drawKpiCard({
        x: 40 + cardWidth + cardGap,
        y,
        width: cardWidth,
        height: cardHeight,
        label: "Same-Day Repairs",
        value: baseDamageRepairSummary.sameDayRepairCount,
        color: [245, 124, 0],
      });
      y += cardHeight + 16;

      drawBarChart({
        x: 40,
        y,
        width: cardWidth,
        height: 148,
        title: "Task Status Distribution",
        rows: toRows(
          countBy(tasks, (task) => normalizeReportStatus(task.status)),
        ),
        barColor: [4, 138, 37],
      });
      drawBarChart({
        x: 40 + cardWidth + cardGap,
        y,
        width: cardWidth,
        height: 148,
        title: "Base Damage Reports",
        rows: baseDamageRepairSummary.damageRows,
        barColor: [207, 19, 34],
      });
      y += 168;

      drawBarChart({
        x: 40,
        y,
        width: pageWidth - 80,
        height: 138,
        title: "Base Repaired Aircraft",
        rows: baseDamageRepairSummary.repairRows,
        barColor: [4, 138, 37],
      });

      doc.addPage();
      y = 42;

      sections.forEach((section, index) => {
        if (index > 0 && y > 650) {
          doc.addPage();
          y = 42;
        }

        doc.setFontSize(13);
        doc.text(section.title, 40, y);
        y += 8;

        autoTable(doc, {
          head: [section.columns],
          body: section.rows.length ? section.rows : [["No data", ""]],
          startY: y,
          theme: "grid",
          styles: {
            fontSize: 8,
            cellPadding: 4,
            overflow: "linebreak",
            valign: "top",
          },
          headStyles: {
            fillColor: [4, 138, 37],
          },
          margin: { left: 40, right: 40 },
        });

        y = doc.lastAutoTable.finalY + 22;
      });

      doc.save(`${buildSafeFileName("Reports and Analytics")} Numbers.pdf`);
      message.success("Reports and analytics PDF exported successfully.");
    } catch (error) {
      console.error("Reports PDF export failed:", error);
      message.error(`PDF export failed: ${error.message}`);
    }
  };

  const handleExportReports = () => {
    if (selectedFileType === "PDF") {
      exportReportsToPdf();
    } else {
      exportReportsToExcel();
    }
  };

  return (
    <div
      style={{
        padding: 20,
        minHeight: "100vh",

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
              onClick={handleExportReports}
              width={"100%"}
            >
              Export
            </Button>
          </Col>
        </Row>
      </Card>

      <Row gutter={[16, 16]} style={{ marginBottom: 10 }}>
        <Col span={24}>
          <Title level={5} style={{ margin: 0 }}>
            Operations
          </Title>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card
            size="small"
            styles={{ body: { padding: 12 } }}
            hoverable
            onClick={() => {
              setTaskDetailView("completed");
              setActiveKpi("completed");
            }}
            style={{
              borderColor: activeKpi === "completed" ? "#048a25" : undefined,
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
            size="small"
            styles={{ body: { padding: 12 } }}
            hoverable
            onClick={() => {
              setTaskDetailView("dueSoon");
              setActiveKpi("dueSoon");
            }}
            style={{
              borderColor: activeKpi === "dueSoon" ? "#faad14" : undefined,
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
            size="small"
            styles={{ body: { padding: 12 } }}
            hoverable
            onClick={() => {
              setTaskDetailView("overdue");
              setActiveKpi("overdue");
            }}
            style={{
              borderColor: activeKpi === "overdue" ? "#cf1322" : undefined,
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
          <Card
            size="small"
            styles={{ body: { padding: 12 } }}
            hoverable
            onClick={() => setActiveKpi("modules")}
            style={{
              borderColor: activeKpi === "modules" ? "#26866f" : undefined,
            }}
          >
            <Statistic
              title="Module Reports"
              value={cards.length}
              styles={{ content: { color: "#26866f" } }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 10 }}>
        <Col span={24}>
          <Title level={5} style={{ margin: 0 }}>
            Base Health
          </Title>
        </Col>
        <Col xs={24} sm={12} lg={12}>
          <Card
            size="small"
            title="Base Damage Distribution"
            styles={{ body: { padding: 10 } }}
            hoverable
            onClick={() => setActiveKpi("baseDamage")}
            style={{
              borderColor: activeKpi === "baseDamage" ? "#cf1322" : undefined,
            }}
          >
            <SDMChart data={damageBasePieData} height={190} outerRadius={58} />
            <Text type="secondary">
              Top: {baseDamageRepairSummary.topDamagedBase.label} (
              {baseDamageRepairSummary.topDamagedBase.value})
            </Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={12}>
          <Card
            size="small"
            title="Base Repaired Distribution"
            styles={{ body: { padding: 10 } }}
            hoverable
            onClick={() => setActiveKpi("baseRepair")}
            style={{
              borderColor: activeKpi === "baseRepair" ? "#048a25" : undefined,
            }}
          >
            <SDMChart
              data={repairedBasePieData}
              height={190}
              outerRadius={58}
            />
            <Text type="secondary">
              Top: {baseDamageRepairSummary.topRepairedBase.label} (
              {baseDamageRepairSummary.topRepairedBase.value})
            </Text>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col span={24}>
          <Title level={5} style={{ margin: 0 }}>
            Repair Efficiency
          </Title>
        </Col>
        <Col xs={24} sm={12} lg={12}>
          <Card
            size="small"
            styles={{ body: { padding: 12 } }}
            hoverable
            onClick={() => setActiveKpi("avgRectification")}
            style={{
              borderColor:
                activeKpi === "avgRectification" ? "#1890ff" : undefined,
            }}
          >
            <Statistic
              title="Average Rectification Time"
              value={baseDamageRepairSummary.averageRectificationHours}
              suffix="hrs"
              styles={{ content: { color: "#1890ff" } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={12}>
          <Card
            size="small"
            styles={{ body: { padding: 12 } }}
            hoverable
            onClick={() => setActiveKpi("sameDay")}
            style={{
              borderColor: activeKpi === "sameDay" ? "#d46b08" : undefined,
            }}
          >
            <Statistic
              title="Same-Day Repairs"
              value={baseDamageRepairSummary.sameDayRepairCount}
              styles={{ content: { color: "#d46b08" } }}
            />
          </Card>
        </Col>
      </Row>

      <Card style={{ marginBottom: 20 }} title="Insight Drilldown">
        {(activeKpi === "completed" ||
          activeKpi === "dueSoon" ||
          activeKpi === "overdue") && (
          <>
            <Segmented
              value={taskDetailView}
              onChange={(value) => {
                setTaskDetailView(value);
                setActiveKpi(value);
              }}
              options={[
                { label: `Completed (${stats.completed})`, value: "completed" },
                { label: `Due Soon (${stats.dueSoon})`, value: "dueSoon" },
                { label: `Overdue (${stats.overdue})`, value: "overdue" },
              ]}
            />
            <Text
              type="secondary"
              style={{ display: "block", marginBottom: 12, marginTop: 12 }}
            >
              Task records for the selected operational KPI.
            </Text>
            <Table
              columns={taskDetailColumns}
              dataSource={taskDetailRows}
              loading={loadingTasks}
              pagination={{
                pageSize: 5,
                showSizeChanger: true,
                pageSizeOptions: ["5", "10", "15"],
                showTotal: (total, range) =>
                  `${range[0]}-${range[1]} of ${total}`,
              }}
              scroll={{ x: 1300 }}
            />
          </>
        )}

        {activeKpi === "baseDamage" && (
          <Table
            columns={[
              { title: "Base", dataIndex: "label", key: "label" },
              { title: "Damage Reports", dataIndex: "value", key: "value" },
            ]}
            dataSource={baseDamageRepairSummary.damageRows.map((row) => ({
              key: `d-${row.label}`,
              ...row,
            }))}
            pagination={{ pageSize: 6 }}
          />
        )}

        {activeKpi === "baseRepair" && (
          <Table
            columns={[
              { title: "Base", dataIndex: "label", key: "label" },
              { title: "Repaired Aircraft", dataIndex: "value", key: "value" },
            ]}
            dataSource={baseDamageRepairSummary.repairRows.map((row) => ({
              key: `r-${row.label}`,
              ...row,
            }))}
            pagination={{ pageSize: 6 }}
          />
        )}

        {activeKpi === "avgRectification" && (
          <Table
            columns={[
              { title: "Base", dataIndex: "base", key: "base" },
              {
                title: "Average Rectification (hrs)",
                dataIndex: "averageRectificationHours",
                key: "averageRectificationHours",
              },
              {
                title: "Repaired Count",
                dataIndex: "repairedCount",
                key: "repairedCount",
              },
            ]}
            dataSource={baseByRectificationRows}
            pagination={{ pageSize: 6 }}
          />
        )}

        {activeKpi === "sameDay" && (
          <Table
            columns={[
              { title: "Base", dataIndex: "base", key: "base" },
              {
                title: "Same-Day Repairs",
                dataIndex: "sameDayRepairCount",
                key: "sameDayRepairCount",
              },
              {
                title: "Total Repaired",
                dataIndex: "repairedCount",
                key: "repairedCount",
              },
            ]}
            dataSource={baseBySameDayRows}
            pagination={{ pageSize: 6 }}
          />
        )}

        {activeKpi === "modules" && (
          <Table
            columns={[
              { title: "Category", dataIndex: "category", key: "category" },
              { title: "Report Module", dataIndex: "title", key: "title" },
            ]}
            dataSource={moduleRows}
            pagination={{ pageSize: 8 }}
          />
        )}
      </Card>

      <div style={{ marginBottom: 8 }}>
        <Title level={5} style={{ marginBottom: 4 }}>
          Grouped Analytics Modules
        </Title>
        <Text type="secondary">
          Related tables and charts are grouped by domain for easier review.
        </Text>
      </div>

      {orderedReportGroups.map(([category, categoryCards]) => (
        <Card
          key={category}
          size="small"
          title={`${category} Reports`}
          style={{ marginBottom: 16 }}
          styles={{ body: { paddingTop: 10 } }}
        >
          <Row gutter={[16, 16]}>
            {categoryCards.map((card) => (
              <Col xs={24} xl={12} key={card.key}>
                <Card
                  size="small"
                  title={card.title}
                  style={{ height: "100%" }}
                  styles={{ body: { padding: 12 } }}
                >
                  {card.component}
                </Card>
              </Col>
            ))}
          </Row>
        </Card>
      ))}
    </div>
  );
}
