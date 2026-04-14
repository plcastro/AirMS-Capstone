import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Input,
  InputNumber,
  Row,
  Space,
  Statistic,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import { ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import { API_BASE } from "../../../utils/API_BASE";

const { Title, Text } = Typography;

const PRIORITY_COLORS = {
  Critical: "red",
  High: "volcano",
  Medium: "gold",
  Low: "green",
};

const DEFAULT_RULES = {
  criticalDueDays: 5,
  criticalRemainingHours: 14,
  highDueDays: 7,
  highRemainingHours: 24,
  mediumDueDays: 14,
  longTurnaroundHours: 5,
  safetyBoostEnabled: true,
};

const formatDueSummary = (record) => {
  const segments = [];

  if (record.dueByHours !== null && record.dueByHours !== undefined) {
    segments.push(`${record.dueByHours} FH`);
  }

  if (record.dueByDays !== null && record.dueByDays !== undefined) {
    segments.push(`${record.dueByDays} day(s)`);
  }

  return segments.length > 0 ? segments.join(" | ") : "N/A";
};

const formatDate = (value) => {
  if (!value) return "N/A";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export default function MaintenancePriority() {
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingRules, setSavingRules] = useState(false);
  const [priorityData, setPriorityData] = useState([]);
  const [meta, setMeta] = useState(null);
  const [rules, setRules] = useState(DEFAULT_RULES);
  const [draftRules, setDraftRules] = useState(DEFAULT_RULES);
  const [showControls, setShowControls] = useState(false);

  const fetchPriorityData = async (activeRules = rules) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        criticalDueDays: String(activeRules.criticalDueDays),
        criticalRemainingHours: String(activeRules.criticalRemainingHours),
        highDueDays: String(activeRules.highDueDays),
        highRemainingHours: String(activeRules.highRemainingHours),
        mediumDueDays: String(activeRules.mediumDueDays),
        longTurnaroundHours: String(activeRules.longTurnaroundHours),
        safetyBoostEnabled: activeRules.safetyBoostEnabled ? "1" : "0",
      });

      const response = await fetch(
        `${API_BASE}/api/parts-monitoring/maintenance-priority?${params.toString()}`,
      );
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to fetch maintenance priority");
      }

      setPriorityData(Array.isArray(result.data) ? result.data : []);
      setMeta(result.meta || null);
    } catch (error) {
      console.error("Failed to fetch maintenance priority:", error);
      message.error(error.message || "Failed to load maintenance priority");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadRulesAndPriority = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `${API_BASE}/api/parts-monitoring/maintenance-priority/rules`,
        );
        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.message || "Failed to fetch maintenance priority rules");
        }

        const loadedRules = {
          ...DEFAULT_RULES,
          ...(result.data || {}),
        };

        setRules(loadedRules);
        setDraftRules(loadedRules);
        await fetchPriorityData(loadedRules);
      } catch (error) {
        console.error("Failed to fetch maintenance priority rules:", error);
        message.error(error.message || "Failed to load maintenance priority rules");
        await fetchPriorityData(DEFAULT_RULES);
      }
    };

    loadRulesAndPriority();
  }, []);

  const updateDraftRule = (key, value) => {
    setDraftRules((current) => ({
      ...current,
      [key]: value ?? current[key],
    }));
  };

  const applyRules = async () => {
    setRules(draftRules);
    await fetchPriorityData(draftRules);
  };

  const saveRules = async () => {
    try {
      setSavingRules(true);
      const response = await fetch(
        `${API_BASE}/api/parts-monitoring/maintenance-priority/rules`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(draftRules),
        },
      );
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to save maintenance priority rules");
      }

      const savedRules = {
        ...DEFAULT_RULES,
        ...(result.data || {}),
      };

      setRules(savedRules);
      setDraftRules(savedRules);
      message.success("Maintenance priority rules saved");
      await fetchPriorityData(savedRules);
    } catch (error) {
      console.error("Failed to save maintenance priority rules:", error);
      message.error(error.message || "Failed to save maintenance priority rules");
    } finally {
      setSavingRules(false);
    }
  };

  const resetRules = async () => {
    setDraftRules(DEFAULT_RULES);
    setRules(DEFAULT_RULES);
    await fetchPriorityData(DEFAULT_RULES);
  };

  const filteredData = useMemo(() => {
    const query = searchText.trim().toLowerCase();

    if (!query) {
      return priorityData;
    }

    return priorityData.filter((item) =>
      [
        item.aircraft,
        item.aircraftModel,
        item.nextInspection,
        item.priorityLevel,
        item.sourceRow,
        item.priorityReason,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [priorityData, searchText]);

  const stats = useMemo(() => {
    const criticalCount = priorityData.filter(
      (item) => item.priorityLevel === "Critical",
    ).length;
    const highCount = priorityData.filter(
      (item) => item.priorityLevel === "High",
    ).length;
    const fastestTurnaround = priorityData.reduce((lowest, item) => {
      if (item.estimatedTurnaroundHours === null || item.estimatedTurnaroundHours === undefined) {
        return lowest;
      }

      if (lowest === null || item.estimatedTurnaroundHours < lowest) {
        return item.estimatedTurnaroundHours;
      }

      return lowest;
    }, null);

    return {
      criticalCount,
      highCount,
      aircraftCount: priorityData.length,
      fastestTurnaround,
    };
  }, [priorityData]);

  const columns = [
    {
      title: "Rank",
      dataIndex: "rank",
      key: "rank",
      width: 70,
    },
    {
      title: "Aircraft",
      dataIndex: "aircraft",
      key: "aircraft",
      width: 140,
    },
    {
      title: "Model",
      dataIndex: "aircraftModel",
      key: "aircraftModel",
      width: 130,
    },
    {
      title: "Next Inspection",
      dataIndex: "nextInspection",
      key: "nextInspection",
      width: 220,
    },
    {
      title: "Due Soonest",
      key: "dueSoonest",
      width: 170,
      render: (_, record) => formatDueSummary(record),
    },
    {
      title: "Due Date",
      dataIndex: "dueDate",
      key: "dueDate",
      width: 120,
      render: (value) => formatDate(value),
    },
    {
      title: "Turnaround",
      dataIndex: "estimatedTurnaroundHours",
      key: "estimatedTurnaroundHours",
      width: 130,
      render: (value, record) =>
        value !== null && value !== undefined ? (
          <span>
            {value} hr{value === 1 ? "" : "s"}
            <Text type="secondary" style={{ marginLeft: 6 }}>
              {record.usedHistoricalEstimate ? "historical" : "estimated"}
            </Text>
          </span>
        ) : (
          "N/A"
        ),
    },
    {
      title: "Priority",
      dataIndex: "priorityLevel",
      key: "priorityLevel",
      width: 110,
      render: (value) => (
        <Tag color={PRIORITY_COLORS[value] || "default"} style={{ fontWeight: 700 }}>
          {value}
        </Tag>
      ),
    },
    {
      title: "Decision Basis",
      dataIndex: "priorityReason",
      key: "priorityReason",
    },
    {
      title: "Rule Trigger",
      dataIndex: "priorityTriggers",
      key: "priorityTriggers",
      render: (value) =>
        Array.isArray(value) && value.length > 0 ? value.join(" | ") : "N/A",
    },
  ];

  return (
    <div
      style={{
        padding: 20,
        height: "calc(100vh - 64px)",
        overflowY: "auto",
        overflowX: "hidden",
        display: "flex",
        flexDirection: "column",
        gap: 16,
        paddingBottom: 110,
        boxSizing: "border-box",
      }}
    >
      <Card>
        <Row gutter={[16, 16]} align="middle" justify="space-between">
          <Col xs={24} md={16}>
            <Title level={4} style={{ marginBottom: 4 }}>
              Adjustable Rule-Based Maintenance Ranking
            </Title>
            <Text type="secondary">
              Adjust rule thresholds to control schedule escalation. Aircraft are
              ranked by the active rules first, then by urgency and turnaround.
            </Text>
          </Col>
          <Col xs={24} md={8}>
            <Space style={{ width: "100%", justifyContent: "flex-end" }} wrap>
              <Input
                allowClear
                prefix={<SearchOutlined />}
                placeholder="Search aircraft or inspection"
                style={{ width: 280, maxWidth: "100%" }}
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
              />
              <Button onClick={() => setShowControls((current) => !current)}>
                {showControls ? "Hide Controls" : "Show Controls"}
              </Button>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => fetchPriorityData(rules)}
                loading={loading}
              >
                Refresh
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {showControls && (
        <Card title="Maintenance Manager Rule Controls">
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} lg={6}>
              <Text>Critical if due within (days)</Text>
              <InputNumber
                min={0}
                value={draftRules.criticalDueDays}
                style={{ width: "100%", marginTop: 8 }}
                onChange={(value) => updateDraftRule("criticalDueDays", value)}
              />
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Text>Critical remaining hours</Text>
              <InputNumber
                min={0}
                value={draftRules.criticalRemainingHours}
                style={{ width: "100%", marginTop: 8 }}
                onChange={(value) =>
                  updateDraftRule("criticalRemainingHours", value)
                }
              />
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Text>High if due within (days)</Text>
              <InputNumber
                min={0}
                value={draftRules.highDueDays}
                style={{ width: "100%", marginTop: 8 }}
                onChange={(value) => updateDraftRule("highDueDays", value)}
              />
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Text>High remaining hours</Text>
              <InputNumber
                min={0}
                value={draftRules.highRemainingHours}
                style={{ width: "100%", marginTop: 8 }}
                onChange={(value) =>
                  updateDraftRule("highRemainingHours", value)
                }
              />
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Text>Medium if due within (days)</Text>
              <InputNumber
                min={0}
                value={draftRules.mediumDueDays}
                style={{ width: "100%", marginTop: 8 }}
                onChange={(value) => updateDraftRule("mediumDueDays", value)}
              />
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Text>Long turnaround threshold (hrs)</Text>
              <InputNumber
                min={0}
                value={draftRules.longTurnaroundHours}
                style={{ width: "100%", marginTop: 8 }}
                onChange={(value) =>
                  updateDraftRule("longTurnaroundHours", value)
                }
              />
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Space direction="vertical" style={{ marginTop: 28 }}>
                <Text>Safety-critical auto escalation</Text>
                <Switch
                  checked={draftRules.safetyBoostEnabled}
                  onChange={(checked) => updateDraftRule("safetyBoostEnabled", checked)}
                />
              </Space>
            </Col>
            <Col xs={24}>
              <Space wrap>
                <Button type="primary" onClick={applyRules} loading={loading}>
                  Apply Rules
                </Button>
                <Button onClick={saveRules} loading={savingRules}>
                  Save as Default
                </Button>
                <Button onClick={resetRules}>
                  Reset Rules
                </Button>
              </Space>
            </Col>
          </Row>
        </Card>
      )}

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="Aircraft Ranked" value={stats.aircraftCount} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="Critical" value={stats.criticalCount} valueStyle={{ color: "#cf1322" }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="High" value={stats.highCount} valueStyle={{ color: "#d46b08" }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Fastest Turnaround"
              value={
                stats.fastestTurnaround !== null && stats.fastestTurnaround !== undefined
                  ? `${stats.fastestTurnaround} hrs`
                  : "N/A"
              }
            />
          </Card>
        </Col>
      </Row>

      {meta && (
        <Alert
          type="info"
          showIcon
          message="Priority tie-break logic"
          description={`If inspections are within ${meta.tieBreakHours} flight hours, ${meta.tieBreakDays} days, or an urgency ratio gap of ${meta.tieBreakUrgencyRatio}, the aircraft with the shorter turnaround is ranked first. Active rules: Critical <= ${meta.rules?.criticalDueDays ?? rules.criticalDueDays} day(s) or <= ${meta.rules?.criticalRemainingHours ?? rules.criticalRemainingHours} FH, High <= ${meta.rules?.highDueDays ?? rules.highDueDays} day(s) or <= ${meta.rules?.highRemainingHours ?? rules.highRemainingHours} FH.`}
        />
      )}

      <Card>
        <Table
          rowKey={(record) => `${record.aircraft}-${record.inspectionKey}`}
          loading={loading}
          columns={columns}
          dataSource={filteredData}
          pagination={false}
          scroll={{ x: 1600 }}
          bordered
        />
      </Card>
    </div>
  );
}
