import React, { useContext, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
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

const columnHeader = [
  {
    title: "Aircraft",
    key: "aircraft",
  },
  {
    title: "AI Risk",
    key: "riskLevel",
  },
  {
    title: "Issue",
    key: "issueTitle",
  },
  {
    title: "Finding",
    key: "shortFinding",
  },
  {
    title: "AI Summary",
    key: "managerSummary",
  },
  {
    title: "Summary Source",
    key: "managerSummarySource",
  },
  {
    title: "Recommended Action",
    key: "recommendedAction",
  },
  {
    title: "Manual Reference",
    key: "manualReference",
  },
];

export default function MaintenanceTracking() {
  const { user } = useContext(AuthContext);
  const isOfficerInCharge = user?.jobTitle?.toLowerCase() === "officer-in-charge";
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [insights, setInsights] = useState([]);
  const [meta, setMeta] = useState(null);
  const [llmHealth, setLlmHealth] = useState(null);
  const llmLimit = 5;

  useEffect(() => {
    const fetchInsights = async () => {
      try {
        setLoading(true);
        const [insightsResponse, healthResponse] = await Promise.all([
          fetch(`${API_BASE}/api/ai-insights/maintenance-tracking`),
          fetch(`${API_BASE}/api/ai-insights/health`),
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
    try {
      setSummaryLoading(true);
      const response = await fetch(
        `${API_BASE}/api/ai-insights/maintenance-tracking?includeLLMSummary=1&llmLimit=${llmLimit}`,
      );
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to load Gemini summaries");
      }

      setInsights(Array.isArray(result.data) ? result.data : []);
      setMeta(result.meta || null);
      message.success(
        `Requested Gemini summaries for up to ${llmLimit} highest-risk aircraft.`,
      );
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

  const tableData = useMemo(
    () =>
      insights.map((item) => ({
        _id: item.aircraftId,
        aircraft: item.aircraft,
        riskLevel: item.riskLevel,
        issueTitle: item.issueTitle,
        shortFinding: item.shortFinding,
        managerSummary: item.managerSummary || item.shortFinding,
        managerSummarySource:
          item.managerSummarySource === "gemini"
            ? "Gemini AI"
            : "Rule Fallback",
        recommendedAction: item.recommendedAction,
        manualReference:
          Array.isArray(item.manualReferences) &&
          item.manualReferences.length > 0
            ? item.manualReferences.join(" | ")
            : "Pending manual mapping",
      })),
    [insights],
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
                disabled={!llmHealth?.configured}
              >
                Generate Gemini Summaries
              </Button>
            )}
            <Text type="secondary">
              Rule-engine results load by default.
              {!isOfficerInCharge &&
                ` Gemini is requested only on demand for up to ${llmLimit} highest-risk aircraft.`}
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
          description={`Configured: ${llmHealth.configured ? "Yes" : "No"} | Reachable: ${llmHealth.reachable ? "Yes" : "No"} | Model: ${llmHealth.model || meta?.activeModel || "Unknown"}${llmHealth.message ? ` | ${llmHealth.message}` : ""}`}
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
            loading={loading}
          />
        </Col>
      </Row>
    </div>
  );
}
