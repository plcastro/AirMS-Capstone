import React, { useContext, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Input,
  InputNumber,
  Row,
  Space,
  Select,
  Statistic,
  Tag,
  Typography,
} from "antd";
import { ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import { API_BASE } from "../../../utils/API_BASE";
import { confirmAction } from "../../../utils/confirmAction";
import { AuthContext } from "../../../context/AuthContext";
import ResultPopup from "../../../components/common/ResultPopup";
import DateOnlyCell from "../../../components/common/DateOnlyCell";
import ResponsiveTable from "../../../components/common/ResponsiveTable";
import { matchesSearch } from "../../../utils/search";
import { useDebouncedValue } from "../../../utils/debounce";

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
};

const formatDueSummary = (record) => {
  const segments = [];

  if (record.dueByHours !== null && record.dueByHours !== undefined) {
    segments.push(`FH: ${record.dueByHours}`);
  }

  if (record.dueByDays !== null && record.dueByDays !== undefined) {
    segments.push(`Days: ${record.dueByDays}`);
  }

  return segments.length > 0 ? segments.join(" | ") : "N/A";
};

const normalizeSortValue = (value) => {
  if (value === null || value === undefined || value === "") return "N/A";
  return String(value);
};

const compareText = (left, right) =>
  normalizeSortValue(left).localeCompare(normalizeSortValue(right), undefined, {
    numeric: true,
    sensitivity: "base",
  });

const compareNumber = (left, right) =>
  Number(left ?? Number.POSITIVE_INFINITY) -
  Number(right ?? Number.POSITIVE_INFINITY);

const getRemainingSortValue = (record) => {
  if (record.dueByHours !== null && record.dueByHours !== undefined) {
    return Number(record.dueByHours);
  }

  if (record.dueByDays !== null && record.dueByDays !== undefined) {
    return Number(record.dueByDays) * 24;
  }

  return Number.POSITIVE_INFINITY;
};

const formatDueBasis = (basis) => {
  switch (basis) {
    case "hours-and-calendar":
      return "Hours + calendar";
    case "hours":
      return "Flight hours";
    case "calendar":
      return "Calendar";
    default:
      return "N/A";
  }
};

function PriorityOverrideEditor({ record, onSave }) {
  const [level, setLevel] = useState(
    record.manualPriorityOverride?.level || "Auto",
  );
  const [reason, setReason] = useState(
    record.manualPriorityOverride?.reason || "",
  );
  const [saving, setSaving] = useState(false);
  return (
    <Space
      orientation="vertical"
      size={4}
      style={{ width: "100%", marginTop: 8 }}
    >
      <Select
        aria-label={"Priority override for " + record.aircraft}
        value={level}
        disabled={saving}
        style={{ width: "100%" }}
        onChange={setLevel}
        options={["Auto", "Critical", "High", "Medium", "Low"].map((value) => ({
          value,
          label: value,
        }))}
      />
      {level !== "Auto" && (
        <Input
          aria-label={"Optional priority reason for " + record.aircraft}
          placeholder="Reason (optional)"
          value={reason}
          disabled={saving}
          onChange={(event) => setReason(event.target.value)}
        />
      )}
      <Button
        size="small"
        loading={saving}
        onClick={async () => {
          setSaving(true);
          try {
            await onSave(record.aircraft, level, reason);
          } finally {
            setSaving(false);
          }
        }}
      >
        Save priority
      </Button>
    </Space>
  );
}

export default function MaintenancePriority() {
  const { user, getAuthHeader } = useContext(AuthContext);
  const role = String(user?.jobTitle || user?.access || "")
    .trim()
    .toLowerCase();
  const canOverride =
    ["maintenance manager", "superadmin"].includes(role) ||
    String(user?.access || "")
      .trim()
      .toLowerCase() === "superadmin";
  const [searchText, setSearchText] = useState("");
  const debouncedSearchText = useDebouncedValue(searchText, 300);
  const [loading, setLoading] = useState(true);
  const [savingRules, setSavingRules] = useState(false);
  const [priorityData, setPriorityData] = useState([]);
  const [meta, setMeta] = useState(null);
  const [rules, setRules] = useState(DEFAULT_RULES);
  const [draftRules, setDraftRules] = useState(DEFAULT_RULES);
  const [showControls, setShowControls] = useState(false);
  const [popup, setPopup] = useState({
    open: false,
    status: "success",
    title: "",
    subTitle: "",
  });

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
      });

      const response = await fetch(
        `${API_BASE}/api/parts-monitoring/maintenance-priority?${params.toString()}`,
      );
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Failed to fetch maintenance priority",
        );
      }

      setPriorityData(Array.isArray(result.data) ? result.data : []);
      setMeta(result.meta || null);
    } catch (error) {
      console.error("Failed to fetch maintenance priority:", error);
      setPopup({
        open: true,
        status: "error",
        title: "Operation failed!",
        subTitle: error.message || "Failed to load maintenance priority",
      });
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
          throw new Error(
            result.message || "Failed to fetch maintenance priority rules",
          );
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
        setPopup({
          open: true,
          status: "error",
          title: "Operation failed!",
          subTitle:
            error.message || "Failed to load maintenance priority rules",
        });
        await fetchPriorityData(DEFAULT_RULES);
      }
    };

    loadRulesAndPriority();
  }, []);

  const saveOverride = async (aircraft, level, reason) => {
    try {
      const response = await fetch(
        API_BASE +
          "/api/parts-monitoring/maintenance-priority/" +
          encodeURIComponent(aircraft) +
          "/override",
        {
          method: "PUT",
          headers: {
            ...getAuthHeader(),
            "Content-Type": "application/json",
            "x-action-confirmed": "true",
          },
          body: JSON.stringify({
            level,
            ...(level !== "Auto" ? { reason } : {}),
          }),
        },
      );
      const result = await response.json();
      if (!response.ok || !result.success)
        throw new Error(result.message || "Could not save priority.");
      await fetchPriorityData(rules);
    } catch (error) {
      setPopup({
        open: true,
        status: "error",
        title: "Priority not saved",
        subTitle: error.message,
      });
    }
  };

  const updateDraftRule = (key, value) => {
    setDraftRules((current) => ({
      ...current,
      [key]: value ?? current[key],
    }));
  };

  const applyRules = async () => {
    const confirmed = await confirmAction({
      title: "Apply Priority Rules",
      content: "Apply these thresholds now for current ranking?",
      okText: "Apply",
    });
    if (!confirmed) return;

    setRules(draftRules);
    setPopup({
      open: true,
      status: "success",
      title: "Priority Rules Applied!",
      subTitle: "Maintenance priority rules have been applied successfully.",
    });
    await fetchPriorityData(draftRules);
  };

  const saveRules = async () => {
    const confirmed = await confirmAction({
      title: "Save Priority Rules",
      content: "Save these maintenance priority thresholds as default rules?",
      okText: "Save",
    });
    if (!confirmed) return;

    try {
      setSavingRules(true);
      const response = await fetch(
        `${API_BASE}/api/parts-monitoring/maintenance-priority/rules`,
        {
          method: "PUT",
          headers: {
            ...(await getAuthHeader()),
            "Content-Type": "application/json",
            "x-action-confirmed": "true",
          },
          body: JSON.stringify({
            ...draftRules,
            confirmAction: true,
          }),
        },
      );
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Failed to save maintenance priority rules",
        );
      }

      const savedRules = {
        ...DEFAULT_RULES,
        ...(result.data || {}),
      };

      setRules(savedRules);
      setDraftRules(savedRules);
      setPopup({
        open: true,
        status: "success",
        title: "Priority Rules Saved!",
        subTitle: "Maintenance priority rules have been saved successfully.",
      });
      await fetchPriorityData(savedRules);
    } catch (error) {
      console.error("Failed to save maintenance priority rules:", error);
      setPopup({
        open: true,
        status: "error",
        title: "Operation failed!",
        subTitle: error.message || "Failed to save maintenance priority rules",
      });
    } finally {
      setSavingRules(false);
    }
  };

  const resetRules = async () => {
    const confirmed = await confirmAction({
      title: "Reset Priority Rules",
      content: "Reset all rule thresholds to default values?",
      okText: "Reset",
      okType: "danger",
    });
    if (!confirmed) return;

    setDraftRules(DEFAULT_RULES);
    setRules(DEFAULT_RULES);
    setPopup({
      open: true,
      status: "success",
      title: "Priority Rules Reset!",
      subTitle: "Maintenance priority rules have been reset to default values.",
    });
    await fetchPriorityData(DEFAULT_RULES);
  };

  const filteredData = useMemo(() => {
    if (!debouncedSearchText.trim()) return priorityData;
    return priorityData.filter((item) =>
      matchesSearch(debouncedSearchText, item),
    );
  }, [debouncedSearchText, priorityData]);

  const stats = useMemo(() => {
    const criticalCount = priorityData.filter(
      (item) => item.priorityLevel === "Critical",
    ).length;
    const highCount = priorityData.filter(
      (item) => item.priorityLevel === "High",
    ).length;
    const fastestTurnaround = priorityData.reduce((lowest, item) => {
      if (
        item.estimatedTurnaroundHours === null ||
        item.estimatedTurnaroundHours === undefined
      ) {
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
      width: 50,
      sorter: (left, right) => compareNumber(left.rank, right.rank),
      sortDirections: ["ascend", "descend"],
    },
    {
      title: "Aircraft",
      dataIndex: "aircraft",
      key: "aircraft",
      width: 100,
      sorter: (left, right) => compareText(left.aircraft, right.aircraft),
      sortDirections: ["ascend", "descend"],
    },
    {
      title: "Model",
      dataIndex: "aircraftModel",
      key: "aircraftModel",
      width: 100,
      sorter: (left, right) =>
        compareText(left.aircraftModel, right.aircraftModel),
      sortDirections: ["ascend", "descend"],
    },
    {
      title: "Next Inspection",
      dataIndex: "nextInspection",
      key: "nextInspection",
      width: 120,
      sorter: (left, right) =>
        compareText(left.nextInspection, right.nextInspection),
      sortDirections: ["ascend", "descend"],
    },
    {
      title: "Remaining",
      key: "dueSoonest",
      width: 120,
      sorter: (left, right) =>
        getRemainingSortValue(left) - getRemainingSortValue(right),
      sortDirections: ["ascend", "descend"],
      render: (_, record) => formatDueSummary(record),
    },
    {
      title: "Calendar Due",
      dataIndex: "dueDate",
      key: "dueDate",
      width: 120,
      render: (value, record) => (
        <span>
          <DateOnlyCell value={value} />
          {record.dueBasis === "hours" && (
            <Text type="secondary" style={{ display: "block", fontSize: 12 }}>
              not calendar overdue
            </Text>
          )}
        </span>
      ),
    },
    {
      title: "Due Basis",
      dataIndex: "dueBasis",
      key: "dueBasis",
      width: 140,
      render: (value) => formatDueBasis(value),
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
      width: canOverride ? 230 : 150,
      render: (value, record) => (
        <div>
          <Tag
            color={PRIORITY_COLORS[value] || "default"}
            style={{ fontWeight: 700 }}
          >
            {value}
          </Tag>
          {record.manualPriorityOverride && (
            <>
              <Text strong>Manual</Text>
              <Text type="secondary" style={{ display: "block", fontSize: 12 }}>
                Auto: {record.autoPriorityLevel}. {record.priorityReason}
              </Text>
              {!!record.manualPriorityOverride.reason && (
                <Text type="secondary">
                  {record.manualPriorityOverride.reason}
                </Text>
              )}
            </>
          )}
          {canOverride && (
            <PriorityOverrideEditor
              key={
                record.inspectionId +
                ":" +
                (record.manualPriorityOverride?.setAt || "auto")
              }
              record={record}
              onSave={saveOverride}
            />
          )}
        </div>
      ),
    },
    {
      title: "Automatic Decision Basis",
      dataIndex: "priorityReason",
      key: "priorityReason",
    },
    {
      title: "Automatic Rule Trigger",
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
              Maintenance Priority Ranking
            </Title>
            <Text type="secondary">
              Aircraft are ranked by effective priority, then by urgency and
              turnaround. Manual priorities apply until the next-due inspection
              changes.
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
            <Col
              xs={24}
              style={{ display: "flex", justifyContent: "flex-end" }}
            >
              <Space wrap style={{ justifyContent: "flex-end" }}>
                <Button type="primary" onClick={applyRules} loading={loading}>
                  Apply Rules
                </Button>
                <Button onClick={saveRules} loading={savingRules}>
                  Save as Default
                </Button>
                <Button onClick={resetRules}>Reset Rules</Button>
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
            <Statistic
              title="Critical"
              value={stats.criticalCount}
              styles={{ content: { color: "#cf1322" } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="High"
              value={stats.highCount}
              styles={{ content: { color: "#d46b08" } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Fastest Turnaround"
              value={
                stats.fastestTurnaround !== null &&
                stats.fastestTurnaround !== undefined
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
          title="Priority tie-break logic"
          description={`If inspections are within ${meta.tieBreakHours} flight hours, ${meta.tieBreakDays} days, or an urgency ratio gap of ${meta.tieBreakUrgencyRatio}, the aircraft with the shorter turnaround is ranked first. Active rules: Critical <= ${meta.rules?.criticalDueDays ?? rules.criticalDueDays} day(s) or <= ${meta.rules?.criticalRemainingHours ?? rules.criticalRemainingHours} FH, High <= ${meta.rules?.highDueDays ?? rules.highDueDays} day(s) or <= ${meta.rules?.highRemainingHours ?? rules.highRemainingHours} FH.`}
        />
      )}

      <ResponsiveTable
        rowKey={(record) =>
          [
            record.inspectionKey,
            record.sourceRow,
            record.aircraft,
            record.nextInspection,
            record.rank,
          ]
            .filter(Boolean)
            .join("-")
        }
        loading={loading}
        columns={columns}
        dataSource={filteredData}
        pagination={false}
        scroll={{ x: 1600 }}
        bordered
        size={"small"}
      />
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
