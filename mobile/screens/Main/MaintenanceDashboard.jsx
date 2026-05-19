import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useContext,
} from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { API_BASE } from "../../utilities/API_BASE";
import {
  formatDate,
  getArrayData,
  getAuthHeaders,
} from "../../utilities/mobileApi";
import { showToast } from "../../utilities/toast";
import {
  EmptyState,
  InfoCard,
  FieldRow,
  LoadingState,
  ModuleContainer,
  SearchBar,
  SectionTitle,
  StatCard,
  StatusChip,
} from "../../components/common/MobileModule";
import { COLORS } from "../../stylesheets/colors";
import { AuthContext } from "../../Context/AuthContext";
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
import MSummaryTable from "../../components/tables/MSummaryTable";
import MHistoryTable from "../../components/tables/MHistoryTable";
import MLogTable from "../../components/tables/MLogTable";
import MTrackingTable from "../../components/tables/MTrackingTable";
import PMonitoringTable from "../../components/tables/PMonitoringTable";
import CUsageTable from "../../components/tables/CUsageTable";
import FLogTable from "../../components/tables/FLogTable";
import PRMTable from "../../components/tables/PRMTable";
import WRSTable from "../../components/tables/WRSTable";
import ExportFile from "../../components/common/ExportFile";

const topRows = (counts, limit = 4) =>
  Object.entries(counts)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);

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

const getTaskCategory = (task = {}) => {
  if (isCompletedTask(task)) return "completed";
  const due = getTaskDueDate(task);
  if (!due) return "other";
  const now = new Date();
  const threeDaysLater = new Date();
  threeDaysLater.setDate(now.getDate() + 3);
  if (due < now) return "overdue";
  if (due <= threeDaysLater) return "dueSoon";
  return "other";
};

const UNKNOWN_BASE_VALUES = new Set(["", "UNKNOWN", "N/A", "NA", "UNASSIGNED"]);

const normalizeBaseValue = (value) => String(value || "").trim().toUpperCase();

const isKnownBase = (value) => !UNKNOWN_BASE_VALUES.has(normalizeBaseValue(value));

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

export default function MaintenanceDashboard() {
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [taskView, setTaskView] = useState("dueSoon");
  const [tasks, setTasks] = useState([]);
  const [partsRecords, setPartsRecords] = useState([]);
  const [flightLogs, setFlightLogs] = useState([]);
  const [preInspections, setPreInspections] = useState([]);
  const [postInspections, setPostInspections] = useState([]);
  const [partsRequisitions, setPartsRequisitions] = useState([]);
  const [baseAnalytics, setBaseAnalytics] = useState(null);
  const [aircraftBaseByTail, setAircraftBaseByTail] = useState({});
  const { user } = useContext(AuthContext);
  const loadedUserIdRef = useRef(null);

  const fetchReportData = useCallback(async () => {
    try {
      setLoading(true);
      const headers = await getAuthHeaders();
      const requests = {
        tasks: fetch(`${API_BASE}/api/tasks/getAll`, { headers }),
        baseAnalytics: fetch(`${API_BASE}/api/tasks/analytics/base-maintenance`, {
          headers,
        }),
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
              const text = await response.text();
              console.error(`${key} failed`, response.status, text);
              throw new Error(`${key} failed`);
            }
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
      setAircraftBaseByTail(buildAircraftBaseLookup(getArrayData(resultMap.aircraftBases)));
      setPartsRecords(getArrayData(resultMap.parts));
      setFlightLogs(getArrayData(resultMap.flightLogs));
      setPreInspections(getArrayData(resultMap.preInspections));
      setPostInspections(getArrayData(resultMap.postInspections));
      setPartsRequisitions(getArrayData(resultMap.partsRequisitions));
    } catch (error) {
      console.error("Maintenance dashboard load failed:", error);
      showToast(error.message || "Failed to load reports.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user?.id || loadedUserIdRef.current === user.id) return;
    loadedUserIdRef.current = user.id;
    fetchReportData();
  }, [user?.id, fetchReportData]);

  const stats = useMemo(
    () => ({
      completed: tasks.filter(isCompletedTask).length,
      dueSoon: tasks.filter((task) => getTaskCategory(task) === "dueSoon")
        .length,
      overdue: tasks.filter((task) => getTaskCategory(task) === "overdue")
        .length,
      moduleReports: 9,
    }),
    [tasks],
  );

  const taskRows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return tasks
      .filter((task) => getTaskCategory(task) === taskView)
      .filter((task) => {
        if (!needle) return true;
        return [
          task.aircraft,
          task.title,
          task.assignedToName,
          task.assignedMechanic,
          task.maintenanceType,
          task.priority,
          task.status,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(needle));
      })
      .sort((left, right) => {
        const leftDate = getTaskDueDate(left)?.getTime() || Infinity;
        const rightDate = getTaskDueDate(right)?.getTime() || Infinity;
        return leftDate - rightDate;
      });
  }, [search, taskView, tasks]);

  const baseDamageRepairSummary = useMemo(() => {
    const hasKnownAnalyticsRows =
      baseAnalytics?.byBase?.length &&
      baseAnalytics.byBase.some((row) => isKnownBase(row.base));
    const hasUnknownAnalyticsRows =
      baseAnalytics?.byBase?.length &&
      baseAnalytics.byBase.some((row) => !isKnownBase(row.base));

    if (hasKnownAnalyticsRows && !hasUnknownAnalyticsRows) {
      const damageRows = baseAnalytics.byBase
        .map((row) => ({ label: row.base, value: row.damagedCount || 0 }))
        .sort((a, b) => b.value - a.value);
      const repairRows = baseAnalytics.byBase
        .map((row) => ({ label: row.base, value: row.repairedCount || 0 }))
        .sort((a, b) => b.value - a.value);

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
        damageRows,
        repairRows,
        averageRectificationHours:
          baseAnalytics?.totals?.averageRectificationHours || 0,
        sameDayRepairCount: baseAnalytics?.totals?.sameDayRepairCount || 0,
      };
    }

    const damageCounts = {};
    const repairCounts = {};

    tasks.forEach((task) => {
      const base = inferTaskBase(task, aircraftBaseByTail);
      if (isDamageRelatedTask(task)) {
        damageCounts[base] = (damageCounts[base] || 0) + 1;
      }
      if (isRepairedTask(task)) {
        repairCounts[base] = (repairCounts[base] || 0) + 1;
      }
    });

    const damageRows = topRows(damageCounts, 10);
    const repairRows = topRows(repairCounts, 10);

    return {
      topDamagedBase: damageRows[0] || { label: "N/A", value: 0 },
      topRepairedBase: repairRows[0] || { label: "N/A", value: 0 },
      damageRows,
      repairRows,
      averageRectificationHours:
        baseAnalytics?.totals?.averageRectificationHours || 0,
      sameDayRepairCount: baseAnalytics?.totals?.sameDayRepairCount || 0,
    };
  }, [tasks, baseAnalytics, aircraftBaseByTail]);

  const exportSections = useMemo(() => {
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
          due: String(part.due || ""),
          daysRemaining: part.daysRemaining || "",
          timeRemaining: part.timeRemaining || "",
        })),
    );

    const dueComponents = componentRows.filter(
      (part) =>
        part.due.toLowerCase().includes("due") ||
        (Number.isFinite(Number(part.daysRemaining)) &&
          Number(part.daysRemaining) <= 30) ||
        (Number.isFinite(Number(part.timeRemaining)) &&
          Number(part.timeRemaining) <= 50),
    );

    const taskDetailRows = tasks
      .map((task, index) => {
        const dueDate = getTaskDueDate(task);
        const completionDate =
          task.approvedAt || task.completedAt || task.dateRectified || task.updatedAt;
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
          completedDate: completionDate,
        };
      })
      .sort((left, right) => {
        const leftDate = left.dueDate ? left.dueDate.getTime() : Infinity;
        const rightDate = right.dueDate ? right.dueDate.getTime() : Infinity;
        return leftDate - rightDate;
      });

    const formatExportDate = (value) => {
      if (!value) return "N/A";
      const date = value instanceof Date ? value : new Date(value);
      if (Number.isNaN(date.getTime())) return "N/A";
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    };

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
          formatExportDate(row.dueDate),
          formatExportDate(row.completedDate),
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
  }, [
    tasks,
    stats.dueSoon,
    stats.overdue,
    stats.completed,
    flightLogs,
    preInspections,
    postInspections,
    partsRecords,
    partsRequisitions,
    baseDamageRepairSummary.damageRows,
    baseDamageRepairSummary.repairRows,
    baseDamageRepairSummary.topDamagedBase.label,
    baseDamageRepairSummary.topDamagedBase.value,
    baseDamageRepairSummary.topRepairedBase.label,
    baseDamageRepairSummary.topRepairedBase.value,
  ]);

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
        placeholder="Search task details"
      />

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
        <StatCard compact label="Completed Tasks" value={stats.completed} />
        <StatCard compact label="Due Soon" value={stats.dueSoon} tone="#d46b08" />
        <StatCard compact label="Overdue" value={stats.overdue} tone="#cf1322" />
        <StatCard compact label="Module Reports" value={stats.moduleReports} />
        <StatCard
          compact
          label="Most Damage Base"
          value={`${baseDamageRepairSummary.topDamagedBase.label} (${baseDamageRepairSummary.topDamagedBase.value})`}
          tone="#cf1322"
        />
        <StatCard
          compact
          label="Most Repaired Base"
          value={`${baseDamageRepairSummary.topRepairedBase.label} (${baseDamageRepairSummary.topRepairedBase.value})`}
          tone="#048a25"
        />
        <StatCard
          compact
          label="Avg Rectification Time"
          value={`${baseDamageRepairSummary.averageRectificationHours} hrs`}
          tone="#1890ff"
        />
        <StatCard
          compact
          label="Same-Day Repairs"
          value={baseDamageRepairSummary.sameDayRepairCount}
          tone="#d46b08"
        />
      </View>

      <ExportFile title="Reports and Analytics" sections={exportSections} />

      <InfoCard
        title="Task Details"
        subtitle="Records behind the summary cards"
      >
        <View style={{ flexDirection: "row", gap: 6, marginTop: 8 }}>
          {tabs.map(([key, label]) => {
            const selected = taskView === key;
            return (
              <TouchableOpacity
                key={key}
                onPress={() => setTaskView(key)}
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
                <Text
                  style={{
                    color: selected ? COLORS.white : COLORS.grayDark,
                    fontSize: 11,
                    fontWeight: "700",
                  }}
                  numberOfLines={2}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </InfoCard>

      {loading && <LoadingState text="Loading reports..." />}
      {!loading && taskRows.length === 0 && (
        <EmptyState text="No task records for this view." />
      )}
      {taskRows.slice(0, 12).map((task) => (
        <InfoCard
          key={task._id || task.id}
          title={task.aircraft || "N/A"}
          subtitle={task.title || task.summary?.category || "Untitled task"}
          right={
            <StatusChip
              label={task.status || "Pending"}
              color={taskView === "overdue" ? "#cf1322" : COLORS.primaryLight}
            />
          }
        >
          <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
            <FieldRow
              label="Mechanic"
              value={
                task.assignedToName || task.assignedMechanic || "Unassigned"
              }
            />
            <FieldRow label="Type" value={task.maintenanceType} />
            <FieldRow
              label="Due Date"
              value={formatDate(task.dueDate || task.endDateTime)}
            />
            <FieldRow label="Priority" value={task.priority || "Normal"} />
          </View>
        </InfoCard>
      ))}

      <SectionTitle
        title="Module Reports"
        subtitle="Mobile parity for web analytics subreports and charts"
      />

      <GeneralReports
        tasks={tasks}
        flightLogs={flightLogs}
        preInspections={preInspections}
        postInspections={postInspections}
        partsRequisitions={partsRequisitions}
        loading={loading}
      />
      <MaintenancePerformance tasks={tasks} />
      <MaintenanceHistory tasks={tasks} loading={loading} />
      <MaintenanceSummary tasks={tasks} loading={loading} />
      <ComponentUsage records={partsRecords} loading={loading} />
      <FlightLogReport records={flightLogs} loading={loading} />
      <InspectionReport
        title="Pre-Inspection Report"
        records={preInspections}
        loading={loading}
      />
      <InspectionReport
        title="Post-Inspection Report"
        records={postInspections}
        loading={loading}
      />
      <PartsRequisitionReport records={partsRequisitions} loading={loading} />

      <SectionTitle
        title="Analytics Tables"
        subtitle="Mobile parity tables for report drilldown"
      />
      <MSummaryTable tasks={tasks} />
      <MHistoryTable tasks={tasks} />
      <MLogTable tasks={tasks} />
      <MTrackingTable records={partsRecords} />
      <PMonitoringTable records={partsRecords} />
      <CUsageTable records={partsRecords} />
      <FLogTable records={flightLogs} />
      <PRMTable records={partsRequisitions} />
      <WRSTable records={partsRequisitions} />
    </ModuleContainer>
  );
}
