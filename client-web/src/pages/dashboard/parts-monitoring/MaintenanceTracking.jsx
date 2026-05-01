import React, { useContext, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Modal,
  Row,
  Space,
  Statistic,
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

export default function MaintenanceTracking() {
  const { user, getAuthHeader } = useContext(AuthContext);
  const isOfficerInCharge = user?.jobTitle?.toLowerCase() === "officer-in-charge";
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [insights, setInsights] = useState([]);
  const [meta, setMeta] = useState(null);
  const [llmHealth, setLlmHealth] = useState(null);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [rectifyingKey, setRectifyingKey] = useState("");
  const llmLimit = 1;

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
        const [insightsResponse, healthResponse] = await Promise.all([
          fetch(
            `${API_BASE}/api/ai-insights/maintenance-tracking`,
            { cache: "no-store" },
          ),
          fetch(`${API_BASE}/api/ai-insights/health`, { cache: "no-store" }),
        ]);
        const [insightsResult, healthResult] = await Promise.all([
          insightsResponse.json(),
          healthResponse.json(),
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
        await refreshLlmHealth();
      } catch (error) {
        console.error("Failed to load AI maintenance insights:", error);
        message.error(
          error.message || "Failed to load AI maintenance insights",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchInsights();
  }, []);

  const fetchGeminiSummaries = async () => {
    const currentHealth = await refreshLlmHealth();

    if (currentHealth && currentHealth.configured === false) {
      message.warning(
        currentHealth.message || "Gemini is not configured on the server.",
      );
      return;
    }

    if (currentHealth?.cooldown?.active) {
      message.warning(
        `Gemini quota is cooling down. Try again in ${
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
        throw new Error(result.message || "Failed to load Gemini summaries");
      }

      setInsights(Array.isArray(result.data) ? result.data : []);
      setMeta(result.meta || null);
      const refreshedHealth = await refreshLlmHealth();
      const geminiCount = result.meta?.geminiSummaryCount || 0;
      const geminiLastResult =
        result.meta?.geminiLastResult || refreshedHealth?.lastResult || {};

      if (geminiCount > 0) {
        message.success(
          `Updated ${geminiCount} Gemini maintenance summar${geminiCount === 1 ? "y" : "ies"}.`,
        );
      } else if (refreshedHealth?.cooldown?.active) {
        message.warning(
          `Gemini did not return summaries because quota is cooling down. Rule recommendations and references were refreshed. Try again in ${
            cooldownRemaining || refreshedHealth.cooldown.retryAfterSeconds
          } seconds.`,
        );
      } else {
        message.info(
          geminiLastResult.message
            ? `Gemini did not return summaries: ${geminiLastResult.message}`
            : "Gemini did not return new summaries. Rule recommendations and references were refreshed.",
        );
      }
    } catch (error) {
      console.error("Failed to load Gemini summaries:", error);
      message.error(error.message || "Failed to load Gemini summaries");
    } finally {
      setSummaryLoading(false);
    }
  };

  const summary = useMemo(
    () =>
      meta?.summary || {
        totalAircraft: insights.length,
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
      },
    [insights.length, meta],
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
            currentInsights.filter(
              (item) =>
                !(
                  item.aircraft === draft.aircraft &&
                  item.issueTitle === draft.issueTitle
                ),
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
      insights.map((item) => {
        const isGeminiFinding = item.managerSummarySource === "gemini";

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
            source: isGeminiFinding ? "Gemini AI" : "Rule-based",
          },
          managerSummarySource: isGeminiFinding
            ? "Gemini AI"
            : "Rule Fallback",
          recommendedAction: isGeminiFinding ? item.recommendedAction || "" : "",
          procedureSummary: {
            reference: isGeminiFinding ? item.procedureReference || "" : "",
            title: isGeminiFinding ? item.procedureTitle || "" : "",
            summary: isGeminiFinding ? item.procedureSummary || "" : "",
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
    [insights, rectifyingKey],
  );

  const summarySourceCounts = useMemo(
    () =>
      insights.reduce(
        (accumulator, item) => {
          if (item.managerSummarySource === "gemini") {
            accumulator.gemini += 1;
          } else {
            accumulator.fallback += 1;
          }
          return accumulator;
        },
        { gemini: 0, fallback: 0 },
      ),
    [insights],
  );

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
              title="Gemini Summaries"
              value={summarySourceCounts.gemini}
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
        <Space orientation="vertical" size={4}>
          <Title level={4} style={{ margin: 0 }}>
            AI Maintenance Tracking
          </Title>
          <Text type="secondary">
            AirMS now condenses maintenance, task, flight, and parts records
            into one maintenance decision dashboard.
          </Text>
          <Space wrap>
            {!isOfficerInCharge && (
              <Button
                type="primary"
                onClick={fetchGeminiSummaries}
                loading={summaryLoading}
                disabled={!llmHealth?.configured || llmHealth?.cooldown?.active}
              >
                {llmHealth?.cooldown?.active
                  ? `Gemini cooldown (${cooldownRemaining || llmHealth.cooldown.retryAfterSeconds}s)`
                  : "Regenerate Gemini Summaries"}
              </Button>
            )}
            <Text type="secondary">
              Rule-engine results load first. Use Regenerate to request Gemini enrichment for detected issues.
              When Gemini enriches a finding, AirMS selects the recommendation and reference from the matched rules.
              {!isOfficerInCharge &&
                ` Use the button to retry or refresh up to ${llmLimit} detected maintenance issues.`}
            </Text>
          </Space>
        </Space>
      </Card>

      {meta && (
        <Alert
          type="info"
          showIcon
          title="AI implementation mode"
          description={`This release uses a rule-based maintenance assessment engine by default. ${meta.llmEnabled ? `${meta.activeModel} summaries can be requested on demand` : "Gemini summaries are not configured on the server right now"}. If the model is unavailable, AirMS stays on the rule-derived finding text.${meta?.llmLimitApplied ? ` Current Gemini request limit: top ${meta.llmLimitApplied} aircraft.` : ""}`}
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
          title="Gemini health"
          description={`Configured: ${llmHealth.configured ? "Yes" : "No"} | Available: ${llmHealth.reachable ? "Yes" : "No"} | Model: ${llmHealth.model || meta?.activeModel || "Unknown"}${llmHealth.cooldown?.active ? ` | Cooldown: ${cooldownRemaining || llmHealth.cooldown.retryAfterSeconds}s` : ""}${llmHealth.message ? ` | ${llmHealth.message}` : ""}`}
        />
      )}

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
    </div>
  );
}
