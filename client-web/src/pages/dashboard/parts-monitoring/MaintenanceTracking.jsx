import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  App,
  Alert,
  Button,
  Card,
  Checkbox,
  Col,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Statistic,
  Tag,
  Typography,
} from "antd";
import { SearchOutlined } from "@ant-design/icons";
import MTrackingTable from "../../../components/tables/MTrackingTable";
import { API_BASE } from "../../../utils/API_BASE";
import { AuthContext } from "../../../context/AuthContext";
import { confirmAction } from "../../../utils/confirmAction";
import ResultPopup from "../../../components/common/ResultPopup";
import ResponsiveTable from "../../../components/common/ResponsiveTable";
import DateOnlyCell from "../../../components/common/DateOnlyCell";
import DateTimeCell from "../../../components/common/DateTimeCell";
import { useNavigate } from "react-router-dom";
import { matchesSearch } from "../../../utils/search";
import { useDebouncedValue } from "../../../utils/debounce";

const { Title, Text } = Typography;

const escapeRegExp = (value) =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const removeRedundantAircraftPrefix = (summary, aircraft) => {
  const text = String(summary || "").trim();

  if (!aircraft) {
    return text;
  }

  const aircraftPattern = escapeRegExp(aircraft);
  return text
    .replace(
      new RegExp(`^for\\s+aircraft\\s+${aircraftPattern}\\s*[,;-]?\\s*`, "i"),
      "",
    )
    .replace(new RegExp(`^for\\s+${aircraftPattern}\\s*[,;-]?\\s*`, "i"), "")
    .trim();
};

const columnHeader = [
  {
    title: "Aircraft",
    key: "aircraft",
  },
  {
    title: "Risk",
    key: "riskLevel",
  },
  {
    title: "Maintenance Finding",
    key: "maintenanceFinding",
  },
  {
    title: "Recommended Action",
    key: "recommendedAction",
  },
  {
    title: "AMM Summary",
    key: "procedureSummary",
  },
  {
    title: "Reference",
    key: "manualReference",
  },
  {
    title: "Rectify",
    key: "rectifyAction",
  },
];

const optionalFindingColumnOptions = [
  { label: "Recommended Action", value: "recommendedAction" },
  { label: "AMM Summary", value: "procedureSummary" },
  { label: "Reference", value: "manualReference" },
];

const optionalFindingColumnKeys = optionalFindingColumnOptions.map(
  (option) => option.value,
);
const ACTIVE_OPEN = new Set(["pending", "ongoing", "returned"]);
const normalizeStatus = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const inferRectificationInspectionName = (item = {}) => {
  const text = [
    item.issueTitle,
    item.component,
    item.recommendedAction,
    ...(Array.isArray(item.manualReferences) ? item.manualReferences : []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (text.includes("tbo")) return "TBO Inspection";
  if (text.includes("1500 fh")) return "1500 FH Inspection";
  if (text.includes("1200 fh")) return "1200 FH Inspection";
  if (text.includes("750 fh")) return "750 FH Inspection";
  if (text.includes("600 fh")) return "600 FH Inspection";
  if (text.includes("150 fh")) return "150 FH Inspection";
  if (text.includes("48 m")) return "48 M Inspection";
  if (text.includes("24 m")) return "24 M Inspection";
  if (text.includes("12 m")) return "12 M Inspection";
  if (text.includes("10 fh")) return "10 FH Inspection";

  return "OC Inspection";
};

const buildNoMaintenanceIssueInsight = (item = {}) => ({
  ...item,
  riskLevel: "Low",
  issueTitle: "No maintenance issue detected",
  shortFinding: "No active maintenance flags found from the current records.",
  managerSummary: "No active maintenance flags found from the current records.",
  managerSummarySource: "rule-fallback",
  recommendedAction: "",
  recommendedActions: [],
  manualReferences: [],
  procedureReference: "",
  procedureTitle: "",
  procedureSummary: "",
  procedureSteps: [],
  matchedRules: [],
  explanation: [],
  defectDetails: null,
  defectDetailsSource: "none",
});

const getTaskScheduleState = (task = {}) => {
  const status = String(task.status || "").toLowerCase();
  const endDate = new Date(task.endDateTime || task.dueDate || "");

  if (["completed", "approved", "closed", "turned in"].includes(status)) {
    return { label: "Completed", color: "green" };
  }

  if (!Number.isNaN(endDate.getTime()) && endDate < new Date()) {
    return { label: "Overdue", color: "red" };
  }

  return { label: "Scheduled", color: "blue" };
};

const getInspectionDueState = (record = {}) => {
  const remainingHours = Number(record.remainingHours);
  const remainingDays = Number(record.remainingDays);
  const hasRemainingHours = Number.isFinite(remainingHours);
  const hasRemainingDays = Number.isFinite(remainingDays);

  if (
    (hasRemainingHours && remainingHours <= 0) ||
    (hasRemainingDays && remainingDays <= 0)
  ) {
    return {
      label: "Overdue",
      color: "red",
      note: "Schedule or review immediately.",
      rank: 0,
    };
  }

  if (
    (hasRemainingHours && remainingHours <= 25) ||
    (hasRemainingDays && remainingDays <= 30)
  ) {
    return {
      label: "Due Soon",
      color: "orange",
      note: "Plan parts, labor, and downtime.",
      rank: 1,
    };
  }

  if (hasRemainingHours || hasRemainingDays) {
    return {
      label: "On Track",
      color: "green",
      note: "Monitor during normal planning.",
      rank: 2,
    };
  }

  return {
    label: "Needs Review",
    color: "default",
    note: "Remaining limit data is incomplete.",
    rank: 3,
  };
};

const formatRemainingLimit = (record = {}) => {
  const parts = [];

  if (record.remainingHours !== null && record.remainingHours !== undefined) {
    parts.push(`${record.remainingHours} FH`);
  }

  if (record.remainingDays !== null && record.remainingDays !== undefined) {
    parts.push(`${record.remainingDays} day(s)`);
  }

  return parts.length ? parts.join(" / ") : "N/A";
};

const matchesInspectionLimitSearch = (record = {}, query = "") => {
  const dueState = getInspectionDueState(record);
  return matchesSearch(query, {
    ...record,
    dueState,
    remainingLimit: formatRemainingLimit(record),
  });
};

export default function MaintenanceTracking() {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const { user, getAuthHeader } = useContext(AuthContext);
  const userRole = String(user?.jobTitle || user?.access || "")
    .trim()
    .toLowerCase();
  const userAccess = String(user?.access || "")
    .trim()
    .toLowerCase();
  const isOfficerInCharge = userRole === "officer-in-charge";
  const canScheduleInspectionTasks =
    userRole === "maintenance manager" ||
    userRole === "superadmin" ||
    userAccess === "superadmin";
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [insights, setInsights] = useState([]);
  const [llmHealth, setLlmHealth] = useState(null);
  const [inspectionRemainingRows, setInspectionRemainingRows] = useState([]);
  const [inspectionRemainingLoading, setInspectionRemainingLoading] =
    useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [rectifyingKey, setRectifyingKey] = useState("");
  const [selectedAircraftFilter, setSelectedAircraftFilter] = useState("all");
  const [inspectionLimitSearch, setInspectionLimitSearch] = useState("");
  const debouncedInspectionLimitSearch = useDebouncedValue(
    inspectionLimitSearch,
    300,
  );
  const [visibleOptionalFindingColumns, setVisibleOptionalFindingColumns] =
    useState(["recommendedAction"]);
  const [popup, setPopup] = useState({
    open: false,
    status: "success",
    title: "",
    subTitle: "",
  });
  const llmLimit = 0;

  const showOperationError = useCallback((subTitle) => {
    setPopup({
      open: true,
      status: "error",
      title: "Operation failed!",
      subTitle,
    });
  }, []);

  const refreshLlmHealth = async () => {
    const refreshedHealth = await fetch(`${API_BASE}/api/ai-insights/health`, {
      cache: "no-store",
    })
      .then((healthResponse) => healthResponse.json())
      .catch(() => null);

    if (refreshedHealth) {
      setLlmHealth(refreshedHealth);
    }

    return refreshedHealth;
  };

  useEffect(() => {
    const cooldownUntil = llmHealth?.cooldown?.cooldownUntil;

    if (!llmHealth?.cooldown?.active || !cooldownUntil) {
      setCooldownRemaining(0);
      return undefined;
    }

    const updateCooldown = () => {
      const remainingSeconds = Math.max(
        0,
        Math.ceil((new Date(cooldownUntil).getTime() - Date.now()) / 1000),
      );

      setCooldownRemaining(remainingSeconds);

      if (remainingSeconds <= 0) {
        setLlmHealth((currentHealth) =>
          currentHealth
            ? {
                ...currentHealth,
                reachable: true,
                cooldown: {
                  ...(currentHealth.cooldown || {}),
                  active: false,
                  retryAfterSeconds: 0,
                  message: "",
                  cooldownUntil: "",
                },
              }
            : currentHealth,
        );
      }
    };

    updateCooldown();
    const intervalId = window.setInterval(updateCooldown, 1000);

    return () => window.clearInterval(intervalId);
  }, [llmHealth?.cooldown?.active, llmHealth?.cooldown?.cooldownUntil]);

  useEffect(() => {
    const fetchInsights = async () => {
      try {
        setLoading(true);
        setInspectionRemainingLoading(true);
        const [insightsResponse, healthResponse, inspectionRemainingResponse] =
          await Promise.all([
            fetch(`${API_BASE}/api/ai-insights/maintenance-tracking`, {
              cache: "no-store",
            }),
            fetch(`${API_BASE}/api/ai-insights/health`, { cache: "no-store" }),
            fetch(
              `${API_BASE}/api/parts-monitoring/inspection-remaining-hours`,
              {
                cache: "no-store",
              },
            ),
          ]);
        const [insightsResult, healthResult, inspectionRemainingResult] =
          await Promise.all([
            insightsResponse.json(),
            healthResponse.json(),
            inspectionRemainingResponse.json(),
          ]);

        if (!insightsResponse.ok || !insightsResult.success) {
          throw new Error(
            insightsResult.message || "Failed to load AI maintenance insights",
          );
        }

        setInsights(
          Array.isArray(insightsResult.data) ? insightsResult.data : [],
        );
        setLlmHealth(healthResult || null);
        setInspectionRemainingRows(
          inspectionRemainingResponse.ok &&
            Array.isArray(inspectionRemainingResult.data)
            ? inspectionRemainingResult.data
            : [],
        );
        await refreshLlmHealth();
      } catch (error) {
        console.error("Failed to load AI maintenance insights:", error);
        showOperationError(
          error.message || "Failed to load AI maintenance insights",
        );
      } finally {
        setLoading(false);
        setInspectionRemainingLoading(false);
      }
    };

    fetchInsights();
  }, [showOperationError]);

  const fetchLlmSummaries = async () => {
    const confirmed = await confirmAction({
      title: "Regenerate AI Insights",
      content:
        "Regenerate maintenance summaries now? This may consume OpenAI quota.",
      okText: "Regenerate",
    });
    if (!confirmed) return;

    const currentHealth = await refreshLlmHealth();

    if (currentHealth && currentHealth.configured === false) {
      message.warning(
        currentHealth.message || "OpenAI is not configured on the server.",
      );
      return;
    }

    if (currentHealth?.cooldown?.active) {
      message.warning(
        `OpenAI quota is cooling down. Try again in ${
          cooldownRemaining || currentHealth.cooldown.retryAfterSeconds
        } seconds.`,
      );
      return;
    }

    try {
      setSummaryLoading(true);
      const response = await fetch(
        `${API_BASE}/api/ai-insights/maintenance-tracking?includeLLMSummary=1&llmLimit=${llmLimit}`,
        { cache: "no-store" },
      );
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to load OpenAI summaries");
      }

      setInsights(Array.isArray(result.data) ? result.data : []);
      const refreshedHealth = await refreshLlmHealth();
      const llmCount = result.meta?.llmSummaryCount || 0;
      const llmLastResult =
        result.meta?.llmLastResult || refreshedHealth?.lastResult || {};

      if (llmCount > 0) {
        setPopup({
          open: true,
          status: "success",
          title: "AI Insights Regenerated",
          subTitle: `Successfully updated ${llmCount} OpenAI maintenance summar${llmCount === 1 ? "y" : "ies"}.`,
        });
      } else if (refreshedHealth?.cooldown?.active) {
        message.warning(
          `OpenAI did not return summaries because quota is cooling down. Rule recommendations and references were refreshed. Try again in ${
            cooldownRemaining || refreshedHealth.cooldown.retryAfterSeconds
          } seconds.`,
        );
      } else {
        message.info(
          llmLastResult.message
            ? `OpenAI did not return summaries: ${llmLastResult.message}`
            : "OpenAI did not return new summaries. Rule recommendations and references were refreshed.",
        );
      }
    } catch (error) {
      console.error("Failed to load OpenAI summaries:", error);
      showOperationError(error.message || "Failed to load OpenAI summaries");
    } finally {
      setSummaryLoading(false);
    }
  };

  const aircraftFilterOptions = useMemo(() => {
    const aircraftSet = new Set();

    insights.forEach((item) => {
      if (item.aircraft) aircraftSet.add(item.aircraft);
    });
    inspectionRemainingRows.forEach((row) => {
      if (row.aircraft) aircraftSet.add(row.aircraft);
    });

    return Array.from(aircraftSet).sort((left, right) =>
      String(left).localeCompare(String(right)),
    );
  }, [insights, inspectionRemainingRows]);

  const filteredInsights = useMemo(
    () =>
      selectedAircraftFilter === "all"
        ? insights
        : insights.filter((item) => item.aircraft === selectedAircraftFilter),
    [insights, selectedAircraftFilter],
  );

  const filteredInspectionRemainingRows = useMemo(() => {
    const aircraftFiltered =
      selectedAircraftFilter === "all"
        ? inspectionRemainingRows
        : inspectionRemainingRows.filter(
            (row) => row.aircraft === selectedAircraftFilter,
          );

    return aircraftFiltered.filter((row) =>
      matchesInspectionLimitSearch(row, debouncedInspectionLimitSearch),
    );
  }, [
    debouncedInspectionLimitSearch,
    inspectionRemainingRows,
    selectedAircraftFilter,
  ]);

  const summary = useMemo(
    () =>
      filteredInsights.reduce(
        (totals, item) => {
          totals.totalAircraft += 1;
          const risk = String(item.riskLevel || "").toLowerCase();
          if (risk === "critical") totals.critical += 1;
          else if (risk === "high") totals.high += 1;
          else if (risk === "medium") totals.medium += 1;
          else if (risk === "low") totals.low += 1;
          return totals;
        },
        { totalAircraft: 0, critical: 0, high: 0, medium: 0, low: 0 },
      ),
    [filteredInsights],
  );

  const markFindingRectified = async (draft = {}) => {
    const authHeader = await getAuthHeader();
    const response = await fetch(
      `${API_BASE}/api/ai-insights/rectification-task`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-action-confirmed": "true",
          ...authHeader,
        },
        body: JSON.stringify({
          ...draft,
          confirmAction: true,
        }),
      },
    );
    const result = await response.json().catch(() => ({}));

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Failed to mark finding rectified");
    }

    return result;
  };

  const confirmFindingRectified = (draft = {}) => {
    if (!draft) {
      return;
    }

    Modal.confirm({
      title: "Mark this finding as rectified?",
      content: `This will clear the active maintenance issue for ${draft.aircraft || "this aircraft"} in Maintenance Tracking.`,
      okText: "Mark Rectified",
      cancelText: "Cancel",
      onOk: async () => {
        try {
          setRectifyingKey(`${draft.aircraft}-${draft.issueTitle}`);
          await markFindingRectified(draft);
          setInsights((currentInsights) =>
            currentInsights.map((item) =>
              item.aircraft === draft.aircraft &&
              item.issueTitle === draft.issueTitle
                ? buildNoMaintenanceIssueInsight(item)
                : item,
            ),
          );
          message.success("Maintenance finding marked rectified.");
        } catch (error) {
          console.error("Failed to mark finding rectified:", error);
          showOperationError(
            error.message || "Failed to mark finding rectified",
          );
        } finally {
          setRectifyingKey("");
        }
      },
    });
  };

  const tableData = useMemo(
    () =>
      filteredInsights.map((item) => {
        const isAiFinding = item.managerSummarySource === "openai";

        return {
          _id: item.aircraftId,
          aircraft: item.aircraft,
          riskLevel: item.riskLevel,
          maintenanceFinding: {
            title: item.issueTitle,
            summary: removeRedundantAircraftPrefix(
              item.managerSummary || item.shortFinding,
              item.aircraft,
            ),
            defectDetails: item.defectDetails || null,
            source: isAiFinding ? "OpenAI" : "Rule-based",
          },
          managerSummarySource: isAiFinding ? "OpenAI" : "Rule Fallback",
          recommendedAction: isAiFinding ? item.recommendedAction || "" : "",
          procedureSummary: {
            reference: isAiFinding ? item.procedureReference || "" : "",
            title: isAiFinding ? item.procedureTitle || "" : "",
            summary: isAiFinding ? item.procedureSummary || "" : "",
          },
          manualReference:
            Array.isArray(item.manualReferences) &&
            item.manualReferences.length > 0
              ? item.manualReferences.join(" | ")
              : "",
          rectifyAction:
            (item.matchedRules || []).length > 0
              ? {
                  aircraft: item.aircraft,
                  aircraftModel: item.aircraftModel || "AS350 B3",
                  issueTitle: item.issueTitle,
                  component: item.component,
                  riskLevel: item.riskLevel,
                  recommendedAction: item.recommendedAction || "",
                  recommendedActions: Array.isArray(item.recommendedActions)
                    ? item.recommendedActions
                    : [],
                  procedureReference: item.procedureReference || "",
                  procedureTitle: item.procedureTitle || "",
                  procedureSummary: item.procedureSummary || "",
                  manualReference:
                    Array.isArray(item.manualReferences) &&
                    item.manualReferences.length > 0
                      ? item.manualReferences.join(" | ")
                      : "",
                  matchedRuleCodes: (item.matchedRules || [])
                    .map((rule) => rule.ruleCode)
                    .filter(Boolean),
                  inspectionName: inferRectificationInspectionName(item),
                  rectifying:
                    rectifyingKey === `${item.aircraft}-${item.issueTitle}`,
                }
              : null,
        };
      }),
    [filteredInsights, rectifyingKey],
  );

  const visibleFindingHeaders = useMemo(
    () =>
      columnHeader.filter(
        (header) =>
          !optionalFindingColumnKeys.includes(header.key) ||
          visibleOptionalFindingColumns.includes(header.key),
      ),
    [visibleOptionalFindingColumns],
  );

  const summarySourceCounts = useMemo(
    () =>
      filteredInsights.reduce(
        (accumulator, item) => {
          if (item.managerSummarySource === "openai") {
            accumulator.llm += 1;
          } else {
            accumulator.fallback += 1;
          }
          return accumulator;
        },
        { llm: 0, fallback: 0 },
      ),
    [filteredInsights],
  );

  const aiStatusNotice = useMemo(() => {
    if (!llmHealth) return null;

    if (llmHealth.cooldown?.active) {
      return {
        type: "warning",
        message: `AI summaries are cooling down. Rule-based recommendations are still available. Try again in ${
          cooldownRemaining || llmHealth.cooldown.retryAfterSeconds
        } seconds.`,
      };
    }

    if (llmHealth.configured === false) {
      return {
        type: "warning",
        message:
          llmHealth.message ||
          "AI summaries are not configured. Rule-based recommendations are still available.",
      };
    }

    if (llmHealth.configured && llmHealth.reachable === false) {
      return {
        type: "warning",
        message:
          llmHealth.message ||
          "AI summaries are temporarily unavailable. Rule-based recommendations are still available.",
      };
    }

    return null;
  }, [cooldownRemaining, llmHealth]);

  const scheduledTaskRows = useMemo(() => {
    const rows = filteredInsights.flatMap((insight) =>
      (insight.scheduledTasks || []).map((task) => ({
        ...task,
        key: `${insight.aircraftId || insight.aircraft}-${task.id}`,
        aircraft: task.aircraft || insight.aircraft,
      })),
    );

    return Array.from(
      new Map(rows.map((task) => [task.id || task.key, task])).values(),
    ).sort((left, right) => {
      const leftDate = new Date(
        left.endDateTime || left.dueDate || 0,
      ).getTime();
      const rightDate = new Date(
        right.endDateTime || right.dueDate || 0,
      ).getTime();

      return leftDate - rightDate;
    });
  }, [filteredInsights]);

  const scheduledTaskStats = useMemo(
    () =>
      scheduledTaskRows.reduce(
        (totals, task) => {
          const state = getTaskScheduleState(task).label;
          totals.total += 1;
          if (state === "Overdue") totals.overdue += 1;
          else if (state === "Completed") totals.completed += 1;
          else totals.scheduled += 1;
          return totals;
        },
        { total: 0, scheduled: 0, overdue: 0, completed: 0 },
      ),
    [scheduledTaskRows],
  );

  const scheduledInspectionTaskKeys = useMemo(() => {
    const keys = new Set();
    scheduledTaskRows.forEach((task) => {
      if (!ACTIVE_OPEN.has(normalizeStatus(task.status))) return;
      const aircraft = String(task.aircraft || "")
        .trim()
        .toLowerCase();
      const title = String(task.title || "")
        .trim()
        .toLowerCase();
      const checklistNames = Array.isArray(task.checklistItems)
        ? task.checklistItems
            .map((item) => item.inspectionName || item.inspectionTypeFull)
            .filter(Boolean)
            .map((value) => String(value).trim().toLowerCase())
        : [];

      [title, ...checklistNames].forEach((inspectionName) => {
        if (aircraft && inspectionName) {
          keys.add(`${aircraft}|${inspectionName}`);
        }
      });
    });
    return keys;
  }, [scheduledTaskRows]);

  const hasScheduledInspectionTask = useCallback(
    (record = {}) => {
      const aircraft = String(record.aircraft || "")
        .trim()
        .toLowerCase();
      const inspectionName = String(record.inspectionName || "")
        .trim()
        .toLowerCase();
      return Boolean(
        aircraft &&
        inspectionName &&
        scheduledInspectionTaskKeys.has(`${aircraft}|${inspectionName}`),
      );
    },
    [scheduledInspectionTaskKeys],
  );

  const scheduleInspectionTask = (record = {}) => {
    const state = getInspectionDueState(record);
    navigate("/dashboard/tasks", {
      state: {
        createTaskFromInspectionLimit: {
          aircraft: record.aircraft || "",
          aircraftModel: record.aircraftModel || "",
          inspectionName: record.inspectionName || "",
          dueDate: record.dueDate || "",
          dueAtHours: record.dueAtHours ?? null,
          remainingHours: record.remainingHours ?? null,
          remainingDays: record.remainingDays ?? null,
          priority: ["Overdue", "Due Soon"].includes(state.label)
            ? "High"
            : "Normal",
          dueStatus: state.label,
        },
      },
    });
  };

  const maintenanceTrackingInsights = useMemo(() => {
    const highestRisk =
      filteredInsights.find((item) =>
        ["Critical", "High"].includes(item.riskLevel),
      ) || filteredInsights[0];
    const overdueInspectionRows = filteredInspectionRemainingRows.filter(
      (row) =>
        (Number.isFinite(Number(row.remainingHours)) &&
          Number(row.remainingHours) <= 0) ||
        (Number.isFinite(Number(row.remainingDays)) &&
          Number(row.remainingDays) <= 0),
    );
    const nearestInspection = filteredInspectionRemainingRows
      .filter((row) => Number.isFinite(Number(row.remainingHours)))
      .sort(
        (left, right) =>
          Number(left.remainingHours) - Number(right.remainingHours),
      )[0];

    return [
      highestRisk
        ? `${highestRisk.aircraft}: ${highestRisk.issueTitle} is the highest current maintenance finding (${highestRisk.riskLevel}).`
        : "No active maintenance findings are currently detected.",
      scheduledTaskStats.overdue > 0
        ? `${scheduledTaskStats.overdue} scheduled task(s) are overdue and should be reviewed first.`
        : `${scheduledTaskStats.scheduled} scheduled task(s) remain open with no overdue task detected.`,
      overdueInspectionRows.length > 0
        ? `${overdueInspectionRows.length} inspection interval(s) are at or past their remaining flight-hour/day limit.`
        : nearestInspection
          ? `${nearestInspection.aircraft} has the nearest inspection by flight hours: ${nearestInspection.inspectionName} at ${nearestInspection.remainingHours} FH remaining.`
          : "No remaining flight-hour inspection data is available yet.",
    ];
  }, [filteredInspectionRemainingRows, filteredInsights, scheduledTaskStats]);

  const scheduledTaskColumns = [
    {
      title: "Aircraft",
      dataIndex: "aircraft",
      key: "aircraft",
      width: 110,
      render: (value) => <Text strong>{value || "N/A"}</Text>,
    },
    {
      title: "Task",
      dataIndex: "title",
      key: "title",
      width: 260,
      render: (value, record) => (
        <Space orientation="vertical" size={2}>
          <Text>{value || "Untitled task"}</Text>
          <Text type="secondary">
            {record.maintenanceType || "Maintenance"} |{" "}
            {record.checklistCount || 0} checklist item(s)
          </Text>
        </Space>
      ),
    },
    {
      title: "Mechanic",
      dataIndex: "assignedToName",
      key: "assignedToName",
      width: 170,
      render: (value) => value || "Unassigned",
    },
    {
      title: "Start",
      dataIndex: "startDateTime",
      key: "startDateTime",
      width: 180,
      render: (value) => <DateTimeCell value={value} />,
    },
    {
      title: "End / Due",
      dataIndex: "endDateTime",
      key: "endDateTime",
      width: 180,
      render: (_, record) => (
        <DateTimeCell value={record.endDateTime || record.dueDate} />
      ),
    },
    {
      title: "Priority",
      dataIndex: "priority",
      key: "priority",
      width: 110,
      render: (value) => (
        <Tag color={String(value).toLowerCase() === "high" ? "orange" : "blue"}>
          {value || "Normal"}
        </Tag>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 130,
      render: (value, record) => {
        const state = getTaskScheduleState(record);
        return <Tag color={state.color}>{state.label}</Tag>;
      },
    },
  ];

  const inspectionRemainingColumns = [
    {
      title: "Aircraft",
      dataIndex: "aircraft",
      key: "aircraft",
      fixed: "left",
      width: 110,
      render: (value) => <Text strong>{value || "N/A"}</Text>,
    },
    {
      title: "Due Status",
      key: "dueStatus",
      width: 130,
      sorter: (left, right) =>
        getInspectionDueState(left).rank - getInspectionDueState(right).rank,
      render: (_, record) => {
        const state = getInspectionDueState(record);
        return <Tag color={state.color}>{state.label}</Tag>;
      },
    },
    {
      title: "Inspection",
      dataIndex: "inspectionName",
      key: "inspectionName",
      width: 220,
      render: (value, record) => (
        <Space orientation="vertical" size={2}>
          <Text>{value || "N/A"}</Text>
          <Text type="secondary">
            {record.flightHourInterval
              ? `${record.flightHourInterval} FH`
              : "Calendar"}{" "}
            {record.calendarMonthInterval
              ? `/ ${record.calendarMonthInterval}M`
              : ""}
          </Text>
        </Space>
      ),
    },
    {
      title: "Remaining",
      key: "remaining",
      width: 170,
      sorter: (left, right) => {
        const leftHours = Number(left.remainingHours);
        const rightHours = Number(right.remainingHours);
        if (Number.isFinite(leftHours) && Number.isFinite(rightHours)) {
          return leftHours - rightHours;
        }
        return (
          getInspectionDueState(left).rank - getInspectionDueState(right).rank
        );
      },
      render: (_, record) => <Text strong>{formatRemainingLimit(record)}</Text>,
    },
    {
      title: "Due Date",
      dataIndex: "dueDate",
      key: "dueDate",
      width: 150,
      render: (value) => <DateOnlyCell value={value} />,
    },
    {
      title: "Due At",
      dataIndex: "dueAtHours",
      key: "dueAtHours",
      width: 110,
      render: (value) =>
        value === null || value === undefined ? "N/A" : `${value} FH`,
    },
    {
      title: "Planning Note",
      key: "planningNote",
      width: 230,
      render: (_, record) => {
        const state = getInspectionDueState(record);
        return <Text type="secondary">{state.note}</Text>;
      },
    },
    {
      title: "Task",
      key: "actions",
      fixed: "right",
      width: 150,
      render: (_, record) =>
        hasScheduledInspectionTask(record) ? (
          <Tag color="blue">Task Scheduled</Tag>
        ) : !canScheduleInspectionTasks ? (
          <Text type="secondary">Not scheduled</Text>
        ) : (
          <Button
            size="small"
            type="primary"
            onClick={() => scheduleInspectionTask(record)}
          >
            Schedule Task
          </Button>
        ),
    },
  ];

  return (
    <div
      style={{
        padding: 24,
        display: "flex",
        flexDirection: "column",
        gap: 20,
        height: "calc(100vh - 64px)",
        overflowY: "auto",
      }}
    >
      {/* ================= HEADER STATUS ================= */}
      <Card
        style={{
          borderRadius: 12,
        }}
      >
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={12}>
            <Title level={3} style={{ margin: 0 }}>
              AI Maintenance Dashboard
            </Title>
            <Text type="secondary">
              Rule-based engine with optional AI enhancement layer
            </Text>
          </Col>

          <Col xs={24} md={12}>
            <Space.Compact style={{ width: "100%" }}>
              <Select
                value={selectedAircraftFilter}
                onChange={setSelectedAircraftFilter}
                style={{ width: "100%" }}
                size="large"
                options={[
                  { label: "All aircraft", value: "all" },
                  ...aircraftFilterOptions.map((aircraft) => ({
                    label: aircraft,
                    value: aircraft,
                  })),
                ]}
              />
              {!isOfficerInCharge && (
                <Button
                  type="primary"
                  onClick={fetchLlmSummaries}
                  loading={summaryLoading}
                  size="large"
                  disabled={
                    !llmHealth?.configured || llmHealth?.cooldown?.active
                  }
                >
                  {llmHealth?.cooldown?.active
                    ? `Cooldown (${cooldownRemaining || llmHealth.cooldown.retryAfterSeconds}s)`
                    : "Regenerate AI Insights"}
                </Button>
              )}
            </Space.Compact>
          </Col>
        </Row>
      </Card>

      {aiStatusNotice && (
        <Alert
          type={aiStatusNotice.type}
          showIcon
          title={aiStatusNotice.message}
        />
      )}

      {/* ================= KPI ROW ================= */}
      <Row gutter={16}>
        {[
          {
            title: "Aircraft",
            value: summary.totalAircraft,
          },
          {
            title: "Critical + High",
            value: (summary.critical || 0) + (summary.high || 0),
          },
          {
            title: "Medium + Low",
            value: (summary.medium || 0) + (summary.low || 0),
          },
          {
            title: "AI Summaries",
            value: summarySourceCounts.llm,
          },
          {
            title: "Fallback",
            value: summarySourceCounts.fallback,
          },
        ].map((item) => (
          <Col xs={12} sm={12} md={4} key={item.title}>
            <Card
              style={{
                borderRadius: 10,
                textAlign: "center",
              }}
            >
              <Statistic title={item.title} value={item.value} />
            </Card>
          </Col>
        ))}
      </Row>

      {/* ================= INSIGHTS ================= */}
      <Card title="Maintenance Insights" style={{ borderRadius: 12 }}>
        <Space orientation="vertical">
          {maintenanceTrackingInsights.map((insight) => (
            <Text key={insight} type="secondary">
              • {insight}
            </Text>
          ))}
        </Space>
      </Card>

      {/* ================= MAIN TABLE ================= */}
      <Card
        title="Condensed AI Findings"
        extra={
          <Space wrap>
            <Text type="secondary">Columns</Text>
            <Checkbox.Group
              options={optionalFindingColumnOptions}
              value={visibleOptionalFindingColumns}
              onChange={setVisibleOptionalFindingColumns}
            />
          </Space>
        }
        style={{ borderRadius: 12 }}
        styles={{ body: { padding: 12 } }}
      >
        <MTrackingTable
          headers={visibleFindingHeaders}
          data={tableData}
          loading={loading || summaryLoading}
          onRectifyFinding={confirmFindingRectified}
        />
      </Card>

      {/* ================= SCHEDULED TASKS ================= */}
      <Card title="Scheduled Tasks" style={{ borderRadius: 12 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col span={24}>
            <Row gutter={16}>
              <Col span={6}>
                <Statistic title="Total" value={scheduledTaskStats.total} />
              </Col>
              <Col span={6}>
                <Statistic
                  title="Scheduled"
                  value={scheduledTaskStats.scheduled}
                />
              </Col>
              <Col span={6}>
                <Statistic title="Overdue" value={scheduledTaskStats.overdue} />
              </Col>
              <Col span={6}>
                <Statistic
                  title="Completed"
                  value={scheduledTaskStats.completed}
                />
              </Col>
            </Row>
          </Col>

          <Col span={24}>
            <ResponsiveTable
              columns={scheduledTaskColumns}
              dataSource={scheduledTaskRows}
              rowKey={(record) => record.id || record.key}
              loading={loading}
              size={"small"}
              pagination={{ pageSize: 5 }}
              scroll={{ x: 1000 }}
            />
          </Col>
        </Row>
      </Card>

      {/* ================= INSPECTION TABLE ================= */}
      <Card title="Upcoming Inspection Limits" style={{ borderRadius: 12 }}>
        <Space
          orientation="vertical"
          size={12}
          style={{ width: "100%", marginBottom: 12 }}
        >
          <Text type="secondary">
            Use this to see which aircraft inspection limits need immediate
            action or upcoming schedule planning.
          </Text>
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="Search aircraft, due status, inspection, remaining, due date..."
            value={inspectionLimitSearch}
            onChange={(event) => setInspectionLimitSearch(event.target.value)}
            size="large"
            style={{ width: "100%", maxWidth: 460 }}
          />
        </Space>

        <ResponsiveTable
          columns={inspectionRemainingColumns}
          dataSource={filteredInspectionRemainingRows}
          rowKey={(record, index) =>
            `${record.aircraft || "N/A"}-${record.inspectionName || "N/A"}-${record.sourceRow || "N/A"}-${index}`
          }
          loading={loading || inspectionRemainingLoading}
          size={"small"}
          pagination={{ pageSize: 8 }}
          mobileBreakpoint="sm"
          mobilePrimaryColumn="inspectionName"
          mobileSecondaryColumn="aircraft"
          mobileMetaLimit={5}
          scroll={{ x: 1200 }}
        />
      </Card>
      <ResultPopup
        open={popup.open}
        status={popup.status}
        title={popup.title}
        subTitle={popup.subTitle}
        onClose={() => setPopup((prev) => ({ ...prev, open: false }))}
      />
    </div>
  );
}
