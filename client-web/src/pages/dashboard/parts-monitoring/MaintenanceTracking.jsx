import React, { useContext, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Modal,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import MTrackingTable from "../../../components/tables/MTrackingTable";
import { API_BASE } from "../../../utils/API_BASE";
import { AuthContext } from "../../../context/AuthContext";

const { Title, Text } = Typography;

const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const removeRedundantAircraftPrefix = (summary, aircraft) => {
  const text = String(summary || "").trim();

  if (!aircraft) {
    return text;
  }

  const aircraftPattern = escapeRegExp(aircraft);
  return text
    .replace(new RegExp(`^for\\s+aircraft\\s+${aircraftPattern}\\s*[,;-]?\\s*`, "i"), "")
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

const getIndefiniteArticle = (value = "") =>
  /^[aeiou]/i.test(String(value || "").trim()) ? "an" : "a";

const buildNoMaintenanceIssueInsight = (item = {}) => ({
  ...item,
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

const formatScheduleDate = (value) => {
  if (!value) return "N/A";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";

  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

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

export default function MaintenanceTracking() {
  const { user, getAuthHeader } = useContext(AuthContext);
  const isOfficerInCharge = user?.jobTitle?.toLowerCase() === "officer-in-charge";
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [insights, setInsights] = useState([]);
  const [meta, setMeta] = useState(null);
  const [llmHealth, setLlmHealth] = useState(null);
  const [inspectionRemainingRows, setInspectionRemainingRows] = useState([]);
  const [inspectionRemainingLoading, setInspectionRemainingLoading] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [rectifyingKey, setRectifyingKey] = useState("");
  const [selectedAircraftFilter, setSelectedAircraftFilter] = useState("all");
  const llmLimit = 0;

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
        const [
          insightsResponse,
          healthResponse,
          inspectionRemainingResponse,
        ] = await Promise.all([
          fetch(
            `${API_BASE}/api/ai-insights/maintenance-tracking`,
            { cache: "no-store" },
          ),
          fetch(`${API_BASE}/api/ai-insights/health`, { cache: "no-store" }),
          fetch(`${API_BASE}/api/parts-monitoring/inspection-remaining-hours`, {
            cache: "no-store",
          }),
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
        setMeta(insightsResult.meta || null);
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
        message.error(
          error.message || "Failed to load AI maintenance insights",
        );
      } finally {
        setLoading(false);
        setInspectionRemainingLoading(false);
      }
    };

    fetchInsights();
  }, []);

  const fetchLlmSummaries = async () => {
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
      setMeta(result.meta || null);
      const refreshedHealth = await refreshLlmHealth();
      const llmCount = result.meta?.llmSummaryCount || 0;
      const llmLastResult =
        result.meta?.llmLastResult || refreshedHealth?.lastResult || {};

      if (llmCount > 0) {
        message.success(
          `Updated ${llmCount} OpenAI maintenance summar${llmCount === 1 ? "y" : "ies"}.`,
        );
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
      message.error(error.message || "Failed to load OpenAI summaries");
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

  const filteredInspectionRemainingRows = useMemo(
    () =>
      selectedAircraftFilter === "all"
        ? inspectionRemainingRows
        : inspectionRemainingRows.filter(
            (row) => row.aircraft === selectedAircraftFilter,
          ),
    [inspectionRemainingRows, selectedAircraftFilter],
  );

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
    const response = await fetch(`${API_BASE}/api/ai-insights/rectification-task`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeader,
      },
      body: JSON.stringify(draft),
    });
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
          message.error(error.message || "Failed to mark finding rectified");
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
          managerSummarySource: isAiFinding
            ? "OpenAI"
            : "Rule Fallback",
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
      const leftDate = new Date(left.endDateTime || left.dueDate || 0).getTime();
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

  const maintenanceTrackingInsights = useMemo(() => {
    const highestRisk =
      filteredInsights.find((item) => ["Critical", "High"].includes(item.riskLevel)) ||
      filteredInsights[0];
    const overdueInspectionRows = filteredInspectionRemainingRows.filter(
      (row) =>
        (Number.isFinite(Number(row.remainingHours)) &&
          Number(row.remainingHours) <= 0) ||
        (Number.isFinite(Number(row.remainingDays)) &&
          Number(row.remainingDays) <= 0),
    );
    const nearestInspection = filteredInspectionRemainingRows
      .filter((row) => Number.isFinite(Number(row.remainingHours)))
      .sort((left, right) => Number(left.remainingHours) - Number(right.remainingHours))[0];

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
        <Space direction="vertical" size={2}>
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
      render: formatScheduleDate,
    },
    {
      title: "End / Due",
      dataIndex: "endDateTime",
      key: "endDateTime",
      width: 180,
      render: (_, record) => formatScheduleDate(record.endDateTime || record.dueDate),
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
      title: "Inspection",
      dataIndex: "inspectionName",
      key: "inspectionName",
      width: 220,
      render: (value, record) => (
        <Space direction="vertical" size={2}>
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
      title: "Remaining FH",
      dataIndex: "remainingHours",
      key: "remainingHours",
      width: 130,
      render: (value) =>
        value === null || value === undefined ? "N/A" : `${value} FH`,
    },
    {
      title: "Remaining Days",
      dataIndex: "remainingDays",
      key: "remainingDays",
      width: 140,
      render: (value) =>
        value === null || value === undefined ? "N/A" : `${value} day(s)`,
    },
    {
      title: "Due Date",
      dataIndex: "dueDate",
      key: "dueDate",
      width: 150,
      render: (value) => {
        if (!value) return "N/A";
        const date = new Date(value);
        return Number.isNaN(date.getTime())
          ? "N/A"
          : date.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            });
      },
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
      title: "Source Row",
      dataIndex: "sourceRow",
      key: "sourceRow",
      width: 260,
      render: (value) => value || "No matching lifespan row",
    },
  ];

  return (
    <div
      style={{
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 16,
        height: "calc(100vh - 64px)",
        overflowY: "auto",
        paddingBottom: 32,
      }}
    >
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={5}>
          <Card variant="borderless" styles={{ body: { padding: 12 } }}>
            <Statistic
              title="Aircraft Assessed"
              value={summary.totalAircraft}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={5}>
          <Card variant="borderless" styles={{ body: { padding: 12 } }}>
            <Statistic
              title="Critical + High"
              value={(summary.critical || 0) + (summary.high || 0)}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={5}>
          <Card variant="borderless" styles={{ body: { padding: 12 } }}>
            <Statistic
              title="Medium + Low"
              value={(summary.medium || 0) + (summary.low || 0)}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={4}>
          <Card variant="borderless" styles={{ body: { padding: 12 } }}>
            <Statistic
              title="OpenAI Summaries"
              value={summarySourceCounts.llm}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={5}>
          <Card variant="borderless" styles={{ body: { padding: 12 } }}>
            <Statistic
              title="Rule Fallbacks"
              value={summarySourceCounts.fallback}
            />
          </Card>
        </Col>
      </Row>

      <Card>
        <Row gutter={[16, 16]} align="middle" justify="space-between">
          <Col xs={24} lg={16}>
            <Space orientation="vertical" size={4}>
              <Title level={4} style={{ margin: 0 }}>
                AI Maintenance Tracking
              </Title>
              <Space wrap>
                {!isOfficerInCharge && (
                  <Button
                    type="primary"
                    onClick={fetchLlmSummaries}
                    loading={summaryLoading}
                    disabled={!llmHealth?.configured || llmHealth?.cooldown?.active}
                  >
                    {llmHealth?.cooldown?.active
                      ? `OpenAI cooldown (${cooldownRemaining || llmHealth.cooldown.retryAfterSeconds}s)`
                      : "Regenerate OpenAI Summaries"}
                  </Button>
                )}
                <Text type="secondary">
                  Rule-engine results load first. Use Regenerate to request OpenAI enrichment for detected issues.
                  When OpenAI enriches a finding, AirMS selects the recommendation and reference from the matched rules.
                  {!isOfficerInCharge &&
                    " Use the button to retry or refresh all detected maintenance issues."}
                </Text>
              </Space>
            </Space>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Space direction="vertical" size={4} style={{ width: "100%" }}>
              <Text strong>Aircraft Filter</Text>
              <Select
                value={selectedAircraftFilter}
                onChange={setSelectedAircraftFilter}
                style={{ width: "100%" }}
                showSearch
                optionFilterProp="label"
                options={[
                  { label: "All Aircraft", value: "all" },
                  ...aircraftFilterOptions.map((aircraft) => ({
                    label: aircraft,
                    value: aircraft,
                  })),
                ]}
              />
            </Space>
          </Col>
        </Row>
      </Card>

      {meta && (
        <Alert
          type="info"
          showIcon
          title="AI implementation mode"
          description={`This release uses a rule-based maintenance assessment engine by default. ${meta.llmEnabled ? `${meta.activeModel} summaries can be requested on demand` : "OpenAI summaries are not configured on the server right now"}. If the model is unavailable, AirMS stays on the rule-derived finding text.${meta?.llmLimitApplied ? ` Current OpenAI request limit: top ${meta.llmLimitApplied} aircraft.` : ""}`}
        />
      )}

      {llmHealth && (
        <Alert
          type={
            llmHealth.reachable
              ? "success"
              : llmHealth.configured
                ? "warning"
                : "error"
          }
          showIcon
          title="OpenAI health"
          description={`Configured: ${llmHealth.configured ? "Yes" : "No"} | Available: ${llmHealth.reachable ? "Yes" : "No"} | Model: ${llmHealth.model || meta?.activeModel || "Unknown"}${llmHealth.cooldown?.active ? ` | Cooldown: ${cooldownRemaining || llmHealth.cooldown.retryAfterSeconds}s` : ""}${llmHealth.message ? ` | ${llmHealth.message}` : ""}`}
        />
      )}

      <Card>
        <Space direction="vertical" size={6}>
          <Title level={4} style={{ margin: 0 }}>
            Maintenance Tracking Insights
          </Title>
          {maintenanceTrackingInsights.map((insight) => (
            <Text key={insight} type="secondary">
              {insight}
            </Text>
          ))}
        </Space>
      </Card>

      <Row gutter={24}>
        <Col span={24}>
          <h2>Condensed AI Findings for Maintenance Tracking</h2>
        </Col>
        <Col span={24}>
          <MTrackingTable
            headers={columnHeader}
            data={tableData}
            loading={loading || summaryLoading}
            onRectifyFinding={confirmFindingRectified}
          />
        </Col>
      </Row>
      <Card>
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          <Row gutter={[16, 16]} align="middle">
            <Col xs={24} md={12}>
              <Space direction="vertical" size={2}>
                <Title level={4} style={{ margin: 0 }}>
                  Scheduled Tasks from Task Assignment
                </Title>
              </Space>
            </Col>
            <Col xs={12} sm={6} md={3}>
              <Statistic title="Total" value={scheduledTaskStats.total} />
            </Col>
            <Col xs={12} sm={6} md={3}>
              <Statistic title="Scheduled" value={scheduledTaskStats.scheduled} />
            </Col>
            <Col xs={12} sm={6} md={3}>
              <Statistic title="Overdue" value={scheduledTaskStats.overdue} />
            </Col>
            <Col xs={12} sm={6} md={3}>
              <Statistic title="Completed" value={scheduledTaskStats.completed} />
            </Col>
          </Row>
          <Table
            columns={scheduledTaskColumns}
            dataSource={scheduledTaskRows}
            loading={loading}
            size="small"
            rowKey={(record) => record.key || record.id}
            pagination={{ pageSize: 5, showSizeChanger: true }}
            scroll={{ x: 1100 }}
            locale={{ emptyText: "No scheduled tasks found." }}
          />
        </Space>
      </Card>

      <Card>
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          <Space direction="vertical" size={2}>
            <Title level={4} style={{ margin: 0 }}>
              Remaining Flight Hours by Inspection
            </Title>
            <Text type="secondary">
              Each aircraft is matched against the configured inspection schedules and parts lifespan rows.
            </Text>
          </Space>
          <Table
            columns={inspectionRemainingColumns}
            dataSource={filteredInspectionRemainingRows}
            loading={loading || inspectionRemainingLoading}
            size="small"
            rowKey={(record) =>
              `${record.aircraft}-${record.inspectionKey || record.inspectionName}`
            }
            pagination={{ pageSize: 8, showSizeChanger: true }}
            scroll={{ x: 1120 }}
            locale={{ emptyText: "No inspection remaining-hours data found." }}
          />
        </Space>
      </Card>
    </div>
  );
}
