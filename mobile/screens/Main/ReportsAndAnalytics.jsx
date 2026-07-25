import React, { useCallback, useEffect, useMemo, useState } from "react";
import AppText from "../../components/common/AppText";
import {
  TouchableOpacity,
  View
} from "react-native";
import { API_BASE } from "../../utilities/API_BASE";
import { formatDate, getArrayData, getAuthHeaders } from "../../utilities/mobileApi";
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

const normalizeStatus = (value) =>
  String(value || "Unknown")
    .replace(/_/g, " ")
    .trim();

const countBy = (records, getKey) =>
  records.reduce((totals, record) => {
    const key = getKey(record) || "Unknown";
    totals[key] = (totals[key] || 0) + 1;
    return totals;
  }, {});

const topRows = (counts, limit = 4) =>
  Object.entries(counts)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);

const isCompletedTask = (task = {}) => {
  const status = String(task.status || "").toLowerCase().trim();
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

export default function ReportsAndAnalytics() {
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [taskView, setTaskView] = useState("dueSoon");
  const [tasks, setTasks] = useState([]);
  const [partsRecords, setPartsRecords] = useState([]);
  const [flightLogs, setFlightLogs] = useState([]);
  const [preInspections, setPreInspections] = useState([]);
  const [postInspections, setPostInspections] = useState([]);
  const [partsRequisitions, setPartsRequisitions] = useState([]);

  const fetchReportData = useCallback(async () => {
    try {
      setLoading(true);
      const headers = await getAuthHeaders();
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

  const stats = useMemo(
    () => ({
      completed: tasks.filter(isCompletedTask).length,
      dueSoon: tasks.filter((task) => getTaskCategory(task) === "dueSoon").length,
      overdue: tasks.filter((task) => getTaskCategory(task) === "overdue").length,
      moduleReports: 8,
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

  const reportSections = useMemo(() => {
    const componentRows = partsRecords.flatMap((record) =>
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
        String(part.due || "").toLowerCase().includes("due") ||
        (Number.isFinite(days) && days <= 30) ||
        (Number.isFinite(hours) && hours <= 50)
      );
    });

    return [
      {
        title: "Maintenance History",
        rows: topRows(countBy(tasks, (task) => normalizeStatus(task.status))),
      },
      {
        title: "Tasks by Aircraft",
        rows: topRows(countBy(tasks, (task) => task.aircraft || "Unknown")),
      },
      {
        title: "Flight Logs by Aircraft",
        rows: topRows(countBy(flightLogs, (record) => record.rpc || "Unknown")),
      },
      {
        title: "Pre-Inspection Status",
        rows: topRows(
          countBy(preInspections, (record) => normalizeStatus(record.status)),
        ),
      },
      {
        title: "Post-Inspection Status",
        rows: topRows(
          countBy(postInspections, (record) => normalizeStatus(record.status)),
        ),
      },
      {
        title: "Parts Requisition Status",
        rows: topRows(
          countBy(partsRequisitions, (record) => normalizeStatus(record.status)),
        ),
      },
      {
        title: "Component Due Statistics",
        rows: topRows(countBy(dueComponents, (part) => part.aircraft)),
      },
    ];
  }, [
    flightLogs,
    partsRecords,
    partsRequisitions,
    postInspections,
    preInspections,
    tasks,
  ]);

  const tabs = [
    ["completed", `Completed (${stats.completed})`],
    ["dueSoon", `Due Soon (${stats.dueSoon})`],
    ["overdue", `Overdue (${stats.overdue})`],
  ];

  return (
    <ModuleContainer>
      <SearchBar value={search} onChangeText={setSearch} placeholder="Search task details" />

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        <StatCard label="Completed Tasks" value={stats.completed} />
        <StatCard label="Due Soon" value={stats.dueSoon} tone="#d46b08" />
        <StatCard label="Overdue" value={stats.overdue} tone="#cf1322" />
        <StatCard label="Module Reports" value={reportSections.length} />
      </View>

      <ExportFile title="Reports and Analytics" sections={reportSections} />

      <InfoCard title="Task Details" subtitle="Records behind the summary cards">
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
                  backgroundColor: selected ? COLORS.primaryLight : COLORS.grayLight,
                  alignItems: "center",
                }}
              >
                <AppText
                  style={{
                    color: selected ? COLORS.white : COLORS.grayDark,
                    fontSize: 11,
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
      </InfoCard>

      {loading && <LoadingState text="Loading reports..." />}
      {!loading && taskRows.length === 0 && <EmptyState text="No task records for this view." />}
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
            <FieldRow label="Mechanic" value={task.assignedToName || task.assignedMechanic || "Unassigned"} />
            <FieldRow label="Type" value={task.maintenanceType} />
            <FieldRow label="Due Date" value={formatDate(task.dueDate || task.endDateTime)} />
            <FieldRow label="Priority" value={task.priority || "Normal"} />
          </View>
        </InfoCard>
      ))}

      <SectionTitle title="Module Reports" subtitle="Mobile charts aligned with web analytics" />
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
    </ModuleContainer>
  );
}
