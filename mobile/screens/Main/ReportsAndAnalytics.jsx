import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import AppText from "../../components/common/AppText";
import { TouchableOpacity, View } from "react-native";
import { API_BASE } from "../../utilities/API_BASE";
import {
  formatDate,
  getArrayData,
  getAuthHeaders,
} from "../../utilities/mobileApi";
import { showToast } from "../../utilities/toast";
import {
  EmptyState,
  FieldRow,
  InfoCard,
  LoadingState,
  ModuleContainer,
  SearchBar,
  SectionTitle,
  StatCard,
  StatusChip,
} from "../../components/common/MobileModule";
import ExportFile from "../../components/common/ExportFile";
import { COLORS } from "../../stylesheets/colors";
import { matchesSearch as recordMatchesSearch } from "../../utilities/search";
import MaintenancePerformance from "../../components/reports/MaintenancePerformance";
import MaintenanceHistory from "../../components/reports/MaintenanceHistory";
import MaintenanceSummary from "../../components/reports/MaintenanceSummary";
import ComponentUsage from "../../components/reports/ComponentUsage";
import GeneralReports from "../../components/reports/GeneralReports";
import {
  FlightLogReport,
  InspectionReport,
  PartsRequisitionReport,
} from "../../components/reports/ModuleReports";
import { CHART_PALETTE, SDMChart } from "../../components/common/PieChart";
import { AuthContext } from "../../Context/AuthContext";
import { canExportModule } from "../../../shared/exportAccess";

const normalizeStatus = (value) =>
  String(value || "Unknown")
    .replace(/_/g, " ")
    .trim();

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

const countBy = (records, getKey) =>
  records.reduce((totals, record) => {
    const key = getKey(record) || "Unknown";
    totals[key] = (totals[key] || 0) + 1;
    return totals;
  }, {});

const topRows = (counts, limit = Infinity) =>
  Object.entries(counts)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);

const REPORT_UNKNOWN_LABELS = new Set([
  "",
  "UNKNOWN",
  "N/A",
  "NA",
  "UNASSIGNED",
]);
const REPORT_TOTAL_LABELS = new Set(["ALL", "OVERALL", "TOTAL", "TOTALS"]);

const isKnownReportLabel = (value) => {
  const normalized = String(value || "")
    .replace(/[_-]+/g, " ")
    .trim()
    .toUpperCase();
  return (
    normalized &&
    !REPORT_UNKNOWN_LABELS.has(normalized) &&
    !REPORT_TOTAL_LABELS.has(normalized)
  );
};

const topKnownReportRows = (counts, limit = Infinity) =>
  Object.entries(counts)
    .filter(([label]) => isKnownReportLabel(label))
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);

const topKnownBaseRows = (counts, limit = 10) =>
  Object.entries(counts)
    .filter(([label]) => isKnownBase(label))
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);

const matchesSearch = (record, needle) => recordMatchesSearch(needle, record);

const REPORT_CATEGORY_ORDER = ["Performance", "Inventory", "Logbook"];

const rankReportCards = (cards, searchText) => {
  const query = searchText.trim().toLowerCase();

  return cards
    .map((card) => {
      if (!query) return { ...card, relevance: 1 };

      const tokens = query
        .split(/[\s\-_/]+/)
        .map((token) => token.trim())
        .filter(Boolean);

      const haystack = [
        card.title,
        card.category,
        ...(Array.isArray(card.keywords) ? card.keywords : []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      let relevance = 0;
      tokens.forEach((token) => {
        if (haystack.includes(token)) relevance += 1;
      });
      if (haystack.includes(query)) relevance += 2;
      if (recordMatchesSearch(query, card.searchRecords || [])) relevance += 2;
      relevance += Math.min(card.recordMatchCount || 0, 10);

      return { ...card, relevance };
    })
    .filter((card) => card.relevance > 0)
    .sort(
      (a, b) => b.relevance - a.relevance || a.title.localeCompare(b.title),
    );
};

const groupReportCards = (cards) => {
  const groupedCards = cards.reduce((acc, card) => {
    const category = card.category || "Other";
    if (!acc[category]) acc[category] = [];
    acc[category].push(card);
    return acc;
  }, {});

  const knownGroups = REPORT_CATEGORY_ORDER.filter(
    (category) => groupedCards[category]?.length,
  ).map((category) => [category, groupedCards[category]]);
  const otherGroups = Object.entries(groupedCards).filter(
    ([category]) => !REPORT_CATEGORY_ORDER.includes(category),
  );

  return [...knownGroups, ...otherGroups];
};

const isCompletedTask = (task = {}) => {
  const status = String(task.status || "")
    .toLowerCase()
    .trim();
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

const getTaskCompletionDate = (task = {}) =>
  task.approvedAt || task.completedAt || task.dateRectified || task.updatedAt;

const getTaskCategory = (task = {}) => {
  if (isCompletedTask(task)) return "completed";
  const due = getTaskDueDate(task);
  if (!due) return "other";
  const dueDay = new Date(due);
  const today = new Date();
  dueDay.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  const threeDaysLater = new Date(today);
  threeDaysLater.setDate(today.getDate() + 3);
  if (dueDay < today) return "overdue";
  if (dueDay <= threeDaysLater) return "dueSoon";
  return "other";
};

const UNKNOWN_BASE_VALUES = new Set(["", "UNKNOWN", "N/A", "NA", "UNASSIGNED"]);

const normalizeBaseValue = (value) =>
  String(value || "")
    .trim()
    .toUpperCase();

const isKnownBase = (value) =>
  !UNKNOWN_BASE_VALUES.has(normalizeBaseValue(value));

const firstKnownBase = (...values) => {
  const match = values.find(isKnownBase);
  return match ? normalizeBaseValue(match) : "";
};

const buildAircraftBaseLookup = (records = []) =>
  records.reduce((lookup, aircraft) => {
    const tailNum = normalizeBaseValue(aircraft?.tailNum || aircraft?.aircraft);
    const base = normalizeBaseValue(aircraft?.base);
    if (tailNum && isKnownBase(base)) {
      lookup[tailNum] = base;
    }
    return lookup;
  }, {});

const inferTaskBase = (task = {}, aircraftBaseByTail = {}) =>
  firstKnownBase(
    task.base,
    task.locationBase,
    task.assignedBase,
    task.stationBase,
    aircraftBaseByTail[normalizeBaseValue(task.aircraft)],
  ) || "UNKNOWN";

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
  if (isCompletedTask(task)) return true;
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

export default function ReportsAndAnalytics() {
  const { user } = useContext(AuthContext);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [taskView, setTaskView] = useState("dueSoon");
  const [activeKpi, setActiveKpi] = useState("dueSoon");
  const [tasks, setTasks] = useState([]);
  const [partsRecords, setPartsRecords] = useState([]);
  const [flightLogs, setFlightLogs] = useState([]);
  const [preInspections, setPreInspections] = useState([]);
  const [postInspections, setPostInspections] = useState([]);
  const [partsRequisitions, setPartsRequisitions] = useState([]);
  const [baseAnalytics, setBaseAnalytics] = useState(null);
  const [aircraftBaseByTail, setAircraftBaseByTail] = useState({});
  const searchNeedle = debouncedSearch.trim().toLowerCase();
  const hasActiveSearch = searchNeedle.length > 0;
  const canExportReports = canExportModule(user?.jobTitle, "reports");

  useEffect(() => {
    if (!search.trim()) {
      setDebouncedSearch("");
      return undefined;
    }

    const timer = setTimeout(() => setDebouncedSearch(search), 225);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchReportData = useCallback(async () => {
    try {
      setLoading(true);
      const headers = await getAuthHeaders();
      const requests = {
        tasks: fetch(`${API_BASE}/api/tasks/getAll`, { headers }),
        baseAnalytics: fetch(
          `${API_BASE}/api/tasks/analytics/base-maintenance`,
          {
            headers,
          },
        ),
        aircraftBases: fetch(`${API_BASE}/api/aircraft/aircraft-with-bases`, {
          headers,
        }),
        parts: fetch(`${API_BASE}/api/parts-monitoring?page=1&limit=1000`, {
          headers,
        }),
        flightLogs: fetch(
          `${API_BASE}/api/flightlogs?page=1&limit=500&sortBy=date&sortOrder=desc`,
          { headers },
        ),
        preInspections: fetch(
          `${API_BASE}/api/pre-flight/getAllPreInspection`,
          { headers },
        ),
        postInspections: fetch(
          `${API_BASE}/api/post-flight/getAllPostInspection`,
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
            if (!response.ok) throw new Error(`${key} failed`);
            return [key, await response.json()];
          } catch (error) {
            console.error(`Report fetch failed for ${key}:`, error);
            return [key, null];
          }
        }),
      );
      const resultMap = Object.fromEntries(entries);

      setTasks(getArrayData(resultMap.tasks));
      setBaseAnalytics(resultMap.baseAnalytics?.data || null);
      setAircraftBaseByTail(
        buildAircraftBaseLookup(getArrayData(resultMap.aircraftBases)),
      );
      setPartsRecords(getArrayData(resultMap.parts));
      setFlightLogs(getArrayData(resultMap.flightLogs));
      setPreInspections(getArrayData(resultMap.preInspections));
      setPostInspections(getArrayData(resultMap.postInspections));
      setPartsRequisitions(getArrayData(resultMap.partsRequisitions));
    } catch (error) {
      console.error("Reports and analytics load failed:", error);
      showToast(error.message || "Failed to load reports.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  const filteredTasks = useMemo(
    () => tasks.filter((task) => matchesSearch(task, searchNeedle)),
    [tasks, searchNeedle],
  );

  const filteredPartsRecords = useMemo(
    () => partsRecords.filter((record) => matchesSearch(record, searchNeedle)),
    [partsRecords, searchNeedle],
  );

  const filteredFlightLogs = useMemo(
    () => flightLogs.filter((record) => matchesSearch(record, searchNeedle)),
    [flightLogs, searchNeedle],
  );

  const filteredPreInspections = useMemo(
    () =>
      preInspections.filter((record) => matchesSearch(record, searchNeedle)),
    [preInspections, searchNeedle],
  );

  const filteredPostInspections = useMemo(
    () =>
      postInspections.filter((record) => matchesSearch(record, searchNeedle)),
    [postInspections, searchNeedle],
  );

  const filteredPartsRequisitions = useMemo(
    () =>
      partsRequisitions.filter((record) => matchesSearch(record, searchNeedle)),
    [partsRequisitions, searchNeedle],
  );

  const stats = useMemo(
    () => ({
      completed: filteredTasks.filter(isCompletedTask).length,
      dueSoon: filteredTasks.filter(
        (task) => getTaskCategory(task) === "dueSoon",
      ).length,
      overdue: filteredTasks.filter(
        (task) => getTaskCategory(task) === "overdue",
      ).length,
      moduleReports: 8,
    }),
    [filteredTasks],
  );

  const taskRows = useMemo(() => {
    return filteredTasks
      .filter((task) => getTaskCategory(task) === taskView)
      .sort((left, right) => {
        const leftDate = getTaskDueDate(left)?.getTime() || Infinity;
        const rightDate = getTaskDueDate(right)?.getTime() || Infinity;
        return leftDate - rightDate;
      });
  }, [filteredTasks, taskView]);

  const baseDamageRepairSummary = useMemo(() => {
    const knownAnalyticsRows = searchNeedle
      ? []
      : (baseAnalytics?.byBase || []).filter((row) => isKnownBase(row.base));

    if (knownAnalyticsRows.length > 0) {
      const damageRows = knownAnalyticsRows
        .map((row) => ({ label: row.base, value: row.damagedCount || 0 }))
        .sort((a, b) => b.value - a.value);
      const repairRows = knownAnalyticsRows
        .map((row) => ({ label: row.base, value: row.repairedCount || 0 }))
        .sort((a, b) => b.value - a.value);

      return {
        topDamagedBase: damageRows[0] || { label: "N/A", value: 0 },
        topRepairedBase: repairRows[0] || { label: "N/A", value: 0 },
        damageRows,
        repairRows,
      };
    }

    const damageCounts = {};
    const repairCounts = {};

    filteredTasks.forEach((task) => {
      const base = inferTaskBase(task, aircraftBaseByTail);
      if (isDamageRelatedTask(task)) {
        damageCounts[base] = (damageCounts[base] || 0) + 1;
      }
      if (isRepairedTask(task)) {
        repairCounts[base] = (repairCounts[base] || 0) + 1;
      }
    });

    const damageRows = topKnownBaseRows(damageCounts);
    const repairRows = topKnownBaseRows(repairCounts);

    return {
      topDamagedBase: damageRows[0] || { label: "N/A", value: 0 },
      topRepairedBase: repairRows[0] || { label: "N/A", value: 0 },
      damageRows,
      repairRows,
    };
  }, [filteredTasks, baseAnalytics, aircraftBaseByTail, searchNeedle]);

  const damageBasePieData = useMemo(
    () =>
      baseDamageRepairSummary.damageRows.map((row, index) => ({
        label: row.label,
        value: row.value,
        fill: CHART_PALETTE[index % CHART_PALETTE.length],
      })),
    [baseDamageRepairSummary.damageRows],
  );

  const repairedBasePieData = useMemo(
    () =>
      baseDamageRepairSummary.repairRows.map((row, index) => ({
        label: row.label,
        value: row.value,
        fill: CHART_PALETTE[index % CHART_PALETTE.length],
      })),
    [baseDamageRepairSummary.repairRows],
  );

  const reportSections = useMemo(() => {
    const componentRows = filteredPartsRecords.flatMap((record) =>
      (record.parts || [])
        .filter((part) => part.rowType !== "header" && part.componentName)
        .map((part) => ({
          aircraft: record.aircraft || "Unknown",
          component: part.componentName,
          daysRemaining: part.daysRemaining,
          timeRemaining: part.timeRemaining,
          due: part.due,
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
    const totalRequisitionItems = filteredPartsRequisitions.reduce(
      (sum, record) => sum + (record.items?.length || 0),
      0,
    );
    const baseNames = Array.from(
      new Set([
        ...baseDamageRepairSummary.damageRows.map((row) => row.label),
        ...baseDamageRepairSummary.repairRows.map((row) => row.label),
      ]),
    );

    return [
      {
        title: "Overview Statistics",
        columns: ["Metric", "Value"],
        rows: [
          ["Total Tasks", filteredTasks.length],
          ["Completed Tasks", stats.completed],
          ["Due Soon Tasks", stats.dueSoon],
          ["Overdue Tasks", stats.overdue],
          ["Parts Monitoring Aircraft", filteredPartsRecords.length],
          ["Tracked Components", componentRows.length],
          ["Due / Due Soon Components", dueComponents.length],
          ["Flight Logs", filteredFlightLogs.length],
          ["Pre-Flight Inspections", filteredPreInspections.length],
          ["Post-Flight Inspections", filteredPostInspections.length],
          ["Parts Requisitions", filteredPartsRequisitions.length],
          ["Requested Line Items", totalRequisitionItems],
        ],
      },
      {
        title: "Base Damage and Repair Counts",
        columns: ["Base", "Damage Reports", "Repaired Aircraft"],
        rows: baseNames.map((base) => [
          base,
          baseDamageRepairSummary.damageRows.find((row) => row.label === base)
            ?.value || 0,
          baseDamageRepairSummary.repairRows.find((row) => row.label === base)
            ?.value || 0,
        ]),
      },
      {
        title: "Task Status Counts",
        rows: topRows(
          countBy(filteredTasks, (task) => normalizeStatus(task.status)),
        ),
      },
      {
        title: "Task Priority Counts",
        rows: topRows(
          countBy(filteredTasks, (task) => task.priority || "Normal"),
        ),
      },
      {
        title: "Tasks by Aircraft",
        rows: topRows(
          countBy(filteredTasks, (task) => task.aircraft || "Unknown"),
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
        rows: filteredTasks.map((task) => [
          task.aircraft || "N/A",
          task.title || task.summary?.category || "Untitled task",
          task.assignedToName || task.assignedMechanic || "Unassigned",
          task.maintenanceType || "N/A",
          formatDate(getTaskDueDate(task)),
          formatDate(getTaskCompletionDate(task)),
          task.priority || "Normal",
          task.status || "Pending",
        ]),
      },
      {
        title: "Flight Logs by Aircraft",
        rows: topKnownReportRows(
          countBy(
            filteredFlightLogs,
            (record) => record.rpc || record.aircraft,
          ),
        ),
      },
      {
        title: "Flight Log Status Counts",
        rows: topKnownReportRows(
          countBy(filteredFlightLogs, (record) =>
            normalizeStatus(record.status),
          ),
        ),
      },
      {
        title: "Flight Logs by Month",
        rows: topKnownReportRows(
          countBy(filteredFlightLogs, (record) =>
            monthLabel(getRecordDate(record)),
          ),
        ),
      },
      {
        title: "Pre-Flight Inspection Status Counts",
        rows: topKnownReportRows(
          countBy(filteredPreInspections, (record) =>
            normalizeStatus(record.status),
          ),
        ),
      },
      {
        title: "Post-Flight Inspection Status Counts",
        rows: topKnownReportRows(
          countBy(filteredPostInspections, (record) =>
            normalizeStatus(record.status),
          ),
        ),
      },
      {
        title: "Parts Requisition Status Counts",
        rows: topKnownReportRows(
          countBy(filteredPartsRequisitions, (record) =>
            normalizeStatus(record.status),
          ),
        ),
      },
      {
        title: "Parts Requisition Item Stock Counts",
        rows: topRows(
          countBy(
            filteredPartsRequisitions.flatMap((record) => record.items || []),
            (item) => normalizeStatus(item.stockStatus),
          ),
        ),
      },
      {
        title: "Component Due Statistics",
        rows: topRows(countBy(dueComponents, (part) => part.aircraft)),
      },
    ];
  }, [
    baseDamageRepairSummary,
    filteredFlightLogs,
    filteredPartsRecords,
    filteredPartsRequisitions,
    filteredPostInspections,
    filteredPreInspections,
    filteredTasks,
    stats,
  ]);

  const reportSummaryCards = useMemo(
    () => [
      { label: "Completed Tasks", value: stats.completed, color: "#26866F" },
      { label: "Due Soon Tasks", value: stats.dueSoon, color: "#d46b08" },
      { label: "Overdue Tasks", value: stats.overdue, color: "#cf1322" },
      {
        label: "Top Damage Base",
        value: `${baseDamageRepairSummary.topDamagedBase.label} (${baseDamageRepairSummary.topDamagedBase.value})`,
        color: "#cf1322",
      },
      {
        label: "Top Repaired Base",
        value: `${baseDamageRepairSummary.topRepairedBase.label} (${baseDamageRepairSummary.topRepairedBase.value})`,
        color: "#26866F",
      },
    ],
    [baseDamageRepairSummary, stats],
  );

  const reportBarCharts = useMemo(
    () => [
      {
        title: "Task Status Distribution",
        rows: topRows(
          countBy(filteredTasks, (task) => normalizeStatus(task.status)),
        ),
        color: "#26866F",
      },
      {
        title: "Base Damage Reports",
        rows: baseDamageRepairSummary.damageRows,
        color: "#cf1322",
      },
      {
        title: "Base Repaired Aircraft",
        rows: baseDamageRepairSummary.repairRows,
        color: "#26866F",
      },
    ],
    [baseDamageRepairSummary, filteredTasks],
  );

  const reportCards = useMemo(
    () => [
      {
        key: "general-reports",
        category: "Performance",
        title: "General Reports",
        component: (
          <GeneralReports
            tasks={hasActiveSearch ? filteredTasks : tasks}
            flightLogs={hasActiveSearch ? filteredFlightLogs : flightLogs}
            preInspections={
              hasActiveSearch ? filteredPreInspections : preInspections
            }
            postInspections={
              hasActiveSearch ? filteredPostInspections : postInspections
            }
            partsRequisitions={
              hasActiveSearch ? filteredPartsRequisitions : partsRequisitions
            }
            loading={loading}
          />
        ),
        keywords: ["general", "reports", "overview", "cross-module"],
        searchRecords: [
          tasks,
          flightLogs,
          preInspections,
          postInspections,
          partsRequisitions,
        ],
        recordMatchCount:
          filteredTasks.length +
          filteredFlightLogs.length +
          filteredPreInspections.length +
          filteredPostInspections.length +
          filteredPartsRequisitions.length,
      },
      {
        key: "performance",
        category: "Performance",
        title: "Performance Overview",
        component: (
          <MaintenancePerformance
            tasks={hasActiveSearch ? filteredTasks : tasks}
          />
        ),
        keywords: ["performance", "overview"],
        searchRecords: tasks,
        recordMatchCount: filteredTasks.length,
      },
      {
        key: "history",
        category: "Performance",
        title: "Maintenance History",
        component: (
          <MaintenanceHistory
            tasks={hasActiveSearch ? filteredTasks : tasks}
            loading={loading}
          />
        ),
        keywords: ["history", "maintenance", "record"],
        searchRecords: tasks,
        recordMatchCount: filteredTasks.length,
      },
      {
        key: "summary",
        category: "Performance",
        title: "Maintenance Insights",
        component: (
          <MaintenanceSummary
            tasks={hasActiveSearch ? filteredTasks : tasks}
            loading={loading}
          />
        ),
        keywords: ["summary", "insights", "repair"],
        searchRecords: tasks,
        recordMatchCount: filteredTasks.length,
      },
      {
        key: "component",
        category: "Inventory",
        title: "Component Analysis",
        component: (
          <ComponentUsage
            records={hasActiveSearch ? filteredPartsRecords : partsRecords}
            loading={loading}
          />
        ),
        keywords: ["component", "usage", "analysis"],
        searchRecords: partsRecords,
        recordMatchCount: filteredPartsRecords.length,
      },
      {
        key: "flight-log",
        category: "Logbook",
        title: "Flight Log Report",
        component: (
          <FlightLogReport
            records={hasActiveSearch ? filteredFlightLogs : flightLogs}
            loading={loading}
          />
        ),
        keywords: ["flight", "log", "aircraft", "release"],
        searchRecords: flightLogs,
        recordMatchCount: filteredFlightLogs.length,
      },
      {
        key: "pre-flight inspection",
        category: "Logbook",
        title: "Pre-Inspection Report",
        component: (
          <InspectionReport
            title="Pre-Inspection Report"
            records={hasActiveSearch ? filteredPreInspections : preInspections}
            loading={loading}
          />
        ),
        keywords: ["pre", "inspection", "pre-flight inspection", "aircraft"],
        searchRecords: preInspections,
        recordMatchCount: filteredPreInspections.length,
      },
      {
        key: "post-inspection",
        category: "Logbook",
        title: "Post-Inspection Report",
        component: (
          <InspectionReport
            title="Post-Inspection Report"
            records={
              hasActiveSearch ? filteredPostInspections : postInspections
            }
            loading={loading}
          />
        ),
        keywords: ["post", "inspection", "post-inspection", "aircraft"],
        searchRecords: postInspections,
        recordMatchCount: filteredPostInspections.length,
      },
      {
        key: "parts-requisition",
        category: "Inventory",
        title: "Parts Requisition Report",
        component: (
          <PartsRequisitionReport
            records={
              hasActiveSearch ? filteredPartsRequisitions : partsRequisitions
            }
            loading={loading}
          />
        ),
        keywords: ["parts", "requisition", "warehouse", "wrs", "stock"],
        searchRecords: partsRequisitions,
        recordMatchCount: filteredPartsRequisitions.length,
      },
    ],
    [
      filteredFlightLogs,
      filteredPartsRecords,
      filteredPartsRequisitions,
      filteredPostInspections,
      filteredPreInspections,
      filteredTasks,
      flightLogs,
      hasActiveSearch,
      loading,
      partsRecords,
      partsRequisitions,
      postInspections,
      preInspections,
      tasks,
    ],
  );

  const filteredReportCards = useMemo(
    () => rankReportCards(reportCards, debouncedSearch),
    [reportCards, debouncedSearch],
  );
  const groupedFilteredReportCards = useMemo(
    () => groupReportCards(filteredReportCards),
    [filteredReportCards],
  );
  const topMatchedCard = hasActiveSearch
    ? filteredReportCards[0] || null
    : null;
  const remainingReportGroups = useMemo(() => {
    if (!topMatchedCard) return groupedFilteredReportCards;
    return groupedFilteredReportCards
      .map(([category, categoryCards]) => [
        category,
        categoryCards.filter((card) => card.key !== topMatchedCard.key),
      ])
      .filter(([, categoryCards]) => categoryCards.length > 0);
  }, [groupedFilteredReportCards, topMatchedCard]);

  const tabs = [
    ["completed", `Completed (${stats.completed})`],
    ["dueSoon", `Due Soon (${stats.dueSoon})`],
    ["overdue", `Overdue (${stats.overdue})`],
  ];

  return (
    <ModuleContainer>
      <SearchBar
        value={search}
        onChangeText={setSearch}
        placeholder="Search Report details"
      />

      {!hasActiveSearch && (
        <>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => {
                setTaskView("completed");
                setActiveKpi("completed");
              }}
              style={{ width: "48%" }}
            >
              <StatCard label="Completed Tasks" value={stats.completed} />
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => {
                setTaskView("dueSoon");
                setActiveKpi("dueSoon");
              }}
              style={{ width: "48%" }}
            >
              <StatCard
                label="Due Soon (next 3 days)"
                value={stats.dueSoon}
                tone="#d46b08"
              />
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => {
                setTaskView("overdue");
                setActiveKpi("overdue");
              }}
              style={{ width: "48%" }}
            >
              <StatCard
                label="Overdue Tasks"
                value={stats.overdue}
                tone="#cf1322"
              />
            </TouchableOpacity>
            <View style={{ width: "48%" }}>
              <StatCard label="Module Reports" value={reportCards.length} />
            </View>
          </View>

          <InfoCard
            title="Base Damage Distribution"
            subtitle={`Top: ${baseDamageRepairSummary.topDamagedBase.label} (${baseDamageRepairSummary.topDamagedBase.value})`}
            onPress={() => setActiveKpi("baseDamage")}
          >
            <View style={{ marginTop: 12 }}>
              <SDMChart data={damageBasePieData} size={218} />
            </View>
          </InfoCard>

          <InfoCard
            title="Base Repaired Distribution"
            subtitle={`Top: ${baseDamageRepairSummary.topRepairedBase.label} (${baseDamageRepairSummary.topRepairedBase.value})`}
            onPress={() => setActiveKpi("baseRepair")}
          >
            <View style={{ marginTop: 12 }}>
              <SDMChart data={repairedBasePieData} size={218} />
            </View>
          </InfoCard>
        </>
      )}

      {canExportReports && (
        <ExportFile
          title="Reports and Analytics"
          sections={reportSections}
          summaryCards={reportSummaryCards}
          barCharts={reportBarCharts}
        />
      )}

      {!hasActiveSearch && (
        <>
          <InfoCard
            title="Insight Drilldown"
            subtitle={
              activeKpi === "baseDamage"
                ? "Base vs. Damage Reports"
                : activeKpi === "baseRepair"
                  ? "Base vs. Repaired Aircraft"
                  : "Task records for the selected operational KPI"
            }
          >
            {!["baseDamage", "baseRepair"].includes(activeKpi) && (
              <View style={{ flexDirection: "row", gap: 6, marginTop: 8 }}>
                {tabs.map(([key, label]) => {
                  const selected = taskView === key;
                  return (
                    <TouchableOpacity
                      key={key}
                      onPress={() => {
                        setTaskView(key);
                        setActiveKpi(key);
                      }}
                      style={{
                        flex: 1,
                        borderRadius: 8,
                        paddingVertical: 9,
                        paddingHorizontal: 6,
                        backgroundColor: selected
                          ? COLORS.primaryLight
                          : COLORS.grayLight,
                        alignItems: "center",
                      }}
                    >
                      <AppText
                        style={{
                          color: selected ? COLORS.white : COLORS.grayDark,
                          fontSize: 9,
                          fontWeight: "700",
                        }}
                        numberOfLines={2}
                      >
                        {label}
                      </AppText>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
            {["baseDamage", "baseRepair"].includes(activeKpi) && (
              <View style={{ marginTop: 10 }}>
                {(activeKpi === "baseDamage"
                  ? baseDamageRepairSummary.damageRows
                  : baseDamageRepairSummary.repairRows
                ).map((row, index) => (
                  <View
                    key={`${activeKpi}-${row.label}`}
                    style={{
                      borderTopWidth: index ? 1 : 0,
                      borderTopColor: COLORS.border,
                      flexDirection: "row",
                      justifyContent: "space-between",
                      paddingVertical: 9,
                    }}
                  >
                    <AppText style={{ fontWeight: "600" }}>{row.label}</AppText>
                    <AppText style={{ fontWeight: "800" }}>{row.value}</AppText>
                  </View>
                ))}
                {(activeKpi === "baseDamage"
                  ? baseDamageRepairSummary.damageRows
                  : baseDamageRepairSummary.repairRows
                ).length === 0 && (
                  <AppText style={{ color: COLORS.grayDark }}>
                    No base records for this view.
                  </AppText>
                )}
              </View>
            )}
          </InfoCard>

          {loading && !["baseDamage", "baseRepair"].includes(activeKpi) && (
            <LoadingState text="Loading reports..." />
          )}
          {!loading &&
            !["baseDamage", "baseRepair"].includes(activeKpi) &&
            taskRows.length === 0 && (
              <EmptyState text="No task records for this view." />
            )}
          {!["baseDamage", "baseRepair"].includes(activeKpi) &&
            taskRows.slice(0, 12).map((task) => (
              <InfoCard
                key={task._id || task.id}
                title={task.aircraft || "N/A"}
                subtitle={
                  task.title || task.summary?.category || "Untitled task"
                }
                right={
                  <StatusChip
                    label={task.status || "Pending"}
                    color={
                      taskView === "overdue" ? "#cf1322" : COLORS.primaryLight
                    }
                  />
                }
              >
                <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                  <FieldRow
                    label="Mechanic"
                    value={
                      task.assignedToName ||
                      task.assignedMechanic ||
                      "Unassigned"
                    }
                  />
                  <FieldRow label="Type" value={task.maintenanceType} />
                  <FieldRow
                    label="Due Date"
                    value={formatDate(task.dueDate || task.endDateTime)}
                  />
                  <FieldRow
                    label="Priority"
                    value={task.priority || "Normal"}
                  />
                </View>
              </InfoCard>
            ))}
        </>
      )}

      <SectionTitle
        title={hasActiveSearch ? "Search Results" : "Module Reports"}
        subtitle={
          hasActiveSearch
            ? "Showing matched report modules first, then related modules."
            : "Mobile charts aligned with web analytics"
        }
      />
      {loading && hasActiveSearch && <LoadingState text="Loading reports..." />}
      {!loading && hasActiveSearch && filteredReportCards.length === 0 && (
        <EmptyState text="No matching report modules found." />
      )}
      {topMatchedCard && (
        <>
          <AppText
            style={{
              color: COLORS.primaryLight,
              fontSize: 12,
              fontWeight: "700",
              marginBottom: 2,
              marginTop: 2,
            }}
          >
            Top Match: {topMatchedCard.title}
          </AppText>
          {topMatchedCard.component}
        </>
      )}
      {(hasActiveSearch
        ? remainingReportGroups
        : groupedFilteredReportCards
      ).map(([category, categoryCards]) => (
        <View key={category}>
          {hasActiveSearch && (
            <AppText
              style={{
                color: COLORS.grayDark,
                fontSize: 12,
                fontWeight: "700",
                marginBottom: 2,
                marginTop: 4,
              }}
            >
              {category} Reports
            </AppText>
          )}
          {categoryCards.map((card) => (
            <View key={card.key}>{card.component}</View>
          ))}
        </View>
      ))}
    </ModuleContainer>
  );
}
