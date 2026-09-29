import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Col,
  Input,
  Row,
  Space,
  Select,
  Statistic,
  Tag,
  Modal,
  Popover,
  Tooltip,
  Typography,
} from "antd";
import {
  ReloadOutlined,
  SearchOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
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

const PRIORITY_OPTIONS = ["Critical", "High", "Medium", "Low"].map(
  (priority) => ({
    value: priority,
    label: priority,
  }),
);

const RULE_FIELDS = Object.keys(DEFAULT_RULES);

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

const areRulesChanged = (left, right) =>
  RULE_FIELDS.some((key) => Number(left[key]) !== Number(right[key]));

const formatPriorityCount = (count, priority) =>
  `${count} aircraft -> ${priority}`;

export default function MaintenancePriority() {
  const { user, getAuthHeader } = useContext(AuthContext);
  const role = String(user?.jobTitle || user?.access || "")
    .trim()
    .toLowerCase();
  const canOverride =
    ["maintenance manager", "admin staff"].includes(role) ||
    String(user?.access || "")
      .trim()
      .toLowerCase() === "admin staff";
  const [searchText, setSearchText] = useState("");
  const debouncedSearchText = useDebouncedValue(searchText, 300);
  const [loading, setLoading] = useState(true);
  const [savingRules, setSavingRules] = useState(false);
  const [priorityData, setPriorityData] = useState([]);
  const [meta, setMeta] = useState(null);
  const [rules, setRules] = useState(DEFAULT_RULES);
  const [draftRules, setDraftRules] = useState(DEFAULT_RULES);
  const [showControls, setShowControls] = useState(false);
  const [aircraftSelectionMode, setAircraftSelectionMode] = useState(false);
  const [selectedAircraft, setSelectedAircraft] = useState([]);
  const [selectedPriority, setSelectedPriority] = useState("Critical");
  const [savingPriority, setSavingPriority] = useState(false);
  const [priorityMode, setPriorityMode] = useState("automatic");
  const [popup, setPopup] = useState({
    open: false,
    status: "success",
    title: "",
    subTitle: "",
  });
  const selectedAircraftSet = useMemo(
    () => new Set(selectedAircraft),
    [selectedAircraft],
  );
  const rulesChanged = useMemo(
    () => areRulesChanged(draftRules, rules),
    [draftRules, rules],
  );
  const handlePriorityModeChange = (mode) => {
    setPriorityMode(mode);
    setAircraftSelectionMode(false);
    setSelectedAircraft([]);
  };

  const fetchPriorityData = useCallback(async (activeRules = DEFAULT_RULES) => {
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
  }, []);

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
  }, [fetchPriorityData]);

  useEffect(() => {
    setSelectedAircraft((current) =>
      current.filter((aircraft) => {
        const record = priorityData.find((item) => item.aircraft === aircraft);
        return record && record.priorityLevel !== selectedPriority;
      }),
    );
  }, [priorityData, selectedPriority]);

  const saveOverride = async (aircraft, level, reason = "") => {
    const response = await fetch(
      API_BASE +
        "/api/parts-monitoring/maintenance-priority/" +
        encodeURIComponent(aircraft) +
        "/override",
      {
        method: "PUT",
        headers: {
          ...(await getAuthHeader()),
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

    if (!response.ok || !result.success) {
      throw new Error(
        result.message || result.error || `Failed to update ${aircraft}.`,
      );
    }

    return result;
  };

  const updateDraftRule = (key, value) => {
    setDraftRules((current) => ({
      ...current,
      [key]: value ?? current[key],
    }));
  };

  const toggleAircraftSelection = useCallback(
    (record) => {
      if (!record?.aircraft || record.priorityLevel === selectedPriority)
        return;

      setSelectedAircraft((current) =>
        current.includes(record.aircraft)
          ? current.filter((aircraft) => aircraft !== record.aircraft)
          : [...current, record.aircraft],
      );
    },
    [selectedPriority],
  );

  const applyMaintenanceControls = async () => {
    const hasManualChanges = selectedAircraft.length > 0;
    const hasRuleChanges = canOverride && rulesChanged;

    if (!hasManualChanges && !hasRuleChanges) {
      setPopup({
        open: true,
        status: "success",
        title: "No changes to save",
        subTitle: "Maintenance controls are already up to date.",
      });
      return;
    }

    const confirmationLines = [
      hasManualChanges
        ? formatPriorityCount(selectedAircraft.length, selectedPriority)
        : null,
      hasRuleChanges ? "Automatic priority rules updated" : null,
    ].filter(Boolean);

    const confirmed = await confirmAction({
      title: "Save Maintenance Controls?",
      content: (
        <Space direction="vertical" size={4}>
          {confirmationLines.map((line) => (
            <Text key={line}>{line}</Text>
          ))}
        </Space>
      ),
      okText: "Save",
    });

    if (!confirmed) return;

    try {
      setSavingRules(true);
      setSavingPriority(true);

      if (hasRuleChanges) {
        const rulesResponse = await fetch(
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

        const rulesResult = await rulesResponse.json();

        if (!rulesResponse.ok || !rulesResult.success) {
          throw new Error(
            rulesResult.message ||
              rulesResult.error ||
              "Failed to save priority rules.",
          );
        }
      }

      if (hasManualChanges) {
        for (const aircraft of selectedAircraft) {
          await saveOverride(aircraft, selectedPriority);
        }
      }

      await fetchPriorityData(draftRules);

      if (hasRuleChanges) {
        setRules(draftRules);
      }

      setPopup({
        open: true,
        status: "success",
        title: "Maintenance Controls Saved",
        subTitle: confirmationLines.join(". "),
      });

      setSelectedAircraft([]);
    } catch (error) {
      console.error("Failed to save maintenance controls:", error);

      setPopup({
        open: true,
        status: "error",
        title: "Changes not saved",
        subTitle: error.message || "Could not save the maintenance controls.",
      });
    } finally {
      setSavingRules(false);
      setSavingPriority(false);
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
    setPopup({
      open: true,
      status: "success",
      title: "Priority Rules Reset",
      subTitle: "Default rule values are ready. Click Save to apply them.",
    });
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

  const baseColumns = useMemo(
    () => [
      {
        title: "Rank",
        dataIndex: "rank",
        key: "rank",
        width: 70,
        sorter: (left, right) => compareNumber(left.rank, right.rank),
        sortDirections: ["ascend", "descend"],
        defaultSortOrder: "ascend",
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
        width: 100,
        centered: true,
        render: (value, record) => {
          const isSelected = selectedAircraftSet.has(record.aircraft);

          return (
            <Space orientation="vertical" size={2}>
              <Space size={4} wrap>
                <Tag
                  color={PRIORITY_COLORS[value] || "default"}
                  style={{ fontWeight: 700, marginInlineEnd: 0 }}
                >
                  {value}
                </Tag>
                {isSelected && (
                  <>
                    <Text type="secondary">-&gt;</Text>
                    <Tag
                      color={PRIORITY_COLORS[selectedPriority] || "default"}
                      style={{ fontWeight: 700, marginInlineEnd: 0 }}
                    >
                      {selectedPriority}
                    </Tag>
                  </>
                )}
              </Space>

              {record.manualPriorityOverride && (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Manual
                </Text>
              )}
            </Space>
          );
        },
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
    ],
    [selectedAircraftSet, selectedPriority],
  );

  const columns = useMemo(() => {
    if (priorityMode !== "manual") return baseColumns;

    const selectionColumn = {
      title: "",
      key: "aircraftSelection",
      width: 46,
      fixed: "left",
      render: (_, record) => {
        const disabled = record.priorityLevel === selectedPriority;
        const checked = selectedAircraftSet.has(record.aircraft);

        return (
          <Checkbox
            checked={checked}
            disabled={disabled || savingRules || savingPriority}
            onChange={() => toggleAircraftSelection(record)}
            onClick={(event) => event.stopPropagation()}
            aria-label={
              disabled
                ? `${record.aircraft} is already ${selectedPriority}`
                : `Select ${record.aircraft}`
            }
          />
        );
      },
    };

    return [selectionColumn, ...baseColumns];
  }, [
    priorityMode,
    baseColumns,
    savingPriority,
    savingRules,
    selectedAircraftSet,
    selectedPriority,
    toggleAircraftSelection,
  ]);

  return (
    <div
      style={{
        padding: 12,
        minHeight: "calc(100vh - 64px)",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        paddingBottom: 60,
        overflowX: "hidden",
      }}
    >
      <Modal
        open={showControls}
        title={
          <Text strong style={{ fontSize: 16 }}>
            Maintenance Controls
          </Text>
        }
        onCancel={() => setShowControls(false)}
        footer={null}
        width={760}
        centered
      >
        {/* Automatic Priority */}
        {canOverride && (
          <div
            style={{
              borderTop: "1px solid #f0f0f0",
              paddingTop: 18,
            }}
          >
            <Text
              strong
              style={{
                display: "block",
                fontSize: 13,
                marginBottom: 10,
              }}
            >
              Automatic Priority Rules
            </Text>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(150px, 180px))",
                gap: 10,
              }}
            >
              {/* Critical Due */}
              <div>
                <Text
                  type="secondary"
                  style={{
                    display: "block",
                    fontSize: 11,
                    marginBottom: 3,
                  }}
                >
                  Critical Due
                </Text>

                <Input
                  size="large"
                  type="number"
                  min={0}
                  value={draftRules.criticalDueDays}
                  onWheel={(event) => event.currentTarget.blur()}
                  onChange={(event) =>
                    updateDraftRule(
                      "criticalDueDays",
                      event.target.value === ""
                        ? ""
                        : Number(event.target.value),
                    )
                  }
                  addonAfter="days"
                />
              </div>

              {/* Critical FH */}
              <div>
                <Text
                  type="secondary"
                  style={{
                    display: "block",
                    fontSize: 11,
                    marginBottom: 3,
                  }}
                >
                  Critical FH
                </Text>

                <Input
                  size="large"
                  type="number"
                  min={0}
                  value={draftRules.criticalRemainingHours}
                  onWheel={(event) => event.currentTarget.blur()}
                  onChange={(event) =>
                    updateDraftRule(
                      "criticalRemainingHours",
                      event.target.value === ""
                        ? ""
                        : Number(event.target.value),
                    )
                  }
                  addonAfter="FH"
                />
              </div>

              {/* High Due */}
              <div>
                <Text
                  type="secondary"
                  style={{
                    display: "block",
                    fontSize: 11,
                    marginBottom: 3,
                  }}
                >
                  High Due
                </Text>

                <Input
                  size="large"
                  type="number"
                  min={0}
                  value={draftRules.highDueDays}
                  onWheel={(event) => event.currentTarget.blur()}
                  onChange={(event) =>
                    updateDraftRule(
                      "highDueDays",
                      event.target.value === ""
                        ? ""
                        : Number(event.target.value),
                    )
                  }
                  addonAfter="days"
                />
              </div>

              {/* High FH */}
              <div>
                <Text
                  type="secondary"
                  style={{
                    display: "block",
                    fontSize: 11,
                    marginBottom: 3,
                  }}
                >
                  High FH
                </Text>

                <Input
                  size="large"
                  type="number"
                  min={0}
                  value={draftRules.highRemainingHours}
                  onWheel={(event) => event.currentTarget.blur()}
                  onChange={(event) =>
                    updateDraftRule(
                      "highRemainingHours",
                      event.target.value === ""
                        ? ""
                        : Number(event.target.value),
                    )
                  }
                  addonAfter="FH"
                />
              </div>

              {/* Medium Due */}
              <div>
                <Text
                  type="secondary"
                  style={{
                    display: "block",
                    fontSize: 11,
                    marginBottom: 3,
                  }}
                >
                  Medium Due
                </Text>

                <Input
                  size="large"
                  type="number"
                  min={0}
                  value={draftRules.mediumDueDays}
                  onWheel={(event) => event.currentTarget.blur()}
                  onChange={(event) =>
                    updateDraftRule(
                      "mediumDueDays",
                      event.target.value === ""
                        ? ""
                        : Number(event.target.value),
                    )
                  }
                  addonAfter="days"
                />
              </div>

              {/* Long Turnaround */}
              <div>
                <Text
                  type="secondary"
                  style={{
                    display: "block",
                    fontSize: 11,
                    marginBottom: 3,
                  }}
                >
                  Long Turnaround
                </Text>

                <Input
                  size="large"
                  type="number"
                  min={0}
                  value={draftRules.longTurnaroundHours}
                  onWheel={(event) => event.currentTarget.blur()}
                  onChange={(event) =>
                    updateDraftRule(
                      "longTurnaroundHours",
                      event.target.value === ""
                        ? ""
                        : Number(event.target.value),
                    )
                  }
                  addonAfter="hrs"
                />
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            marginTop: 24,
            paddingTop: 12,
            borderTop: "1px solid #f0f0f0",
          }}
        >
          <Button
            size="large"
            onClick={resetRules}
            disabled={savingRules || savingPriority}
          >
            Reset
          </Button>

          <Button
            size="large"
            type="primary"
            loading={savingRules || savingPriority}
            onClick={applyMaintenanceControls}
          >
            Save
          </Button>
        </div>
      </Modal>
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
      <Card
        size="small"
        styles={{
          body: {
            padding: "8px 12px ",
          },
        }}
      >
        <Row>
          <Col xs={24}>
            <Title level={4}>Maintenance Priority Ranking</Title>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <Text type="secondary">
                Aircraft are ranked by effective priority, then by urgency and
                turnaround. Manual priorities apply until the next-due
                inspection changes.
              </Text>

              {meta && (
                <Popover
                  title="Priority Tie-Break Logic"
                  trigger="click"
                  placement="bottomRight"
                  content={
                    <div style={{ maxWidth: 360, lineHeight: 1.6 }}>
                      <Text>
                        If inspections are within{" "}
                        <strong>{meta.tieBreakHours} flight hours</strong>,{" "}
                        <strong>{meta.tieBreakDays} days</strong>, or an urgency
                        ratio gap of{" "}
                        <strong>{meta.tieBreakUrgencyRatio}</strong>, the
                        aircraft with the shorter turnaround is ranked first.
                      </Text>

                      <div
                        style={{
                          marginTop: 10,
                          paddingTop: 10,
                          borderTop: "1px solid #f0f0f0",
                        }}
                      >
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          Active rules
                        </Text>

                        <div style={{ marginTop: 4 }}>
                          <Text style={{ display: "block", fontSize: 12 }}>
                            Critical: ≤{" "}
                            {meta.rules?.criticalDueDays ??
                              rules.criticalDueDays}{" "}
                            day(s) or ≤{" "}
                            {meta.rules?.criticalRemainingHours ??
                              rules.criticalRemainingHours}{" "}
                            FH
                          </Text>

                          <Text style={{ display: "block", fontSize: 12 }}>
                            High: ≤{" "}
                            {meta.rules?.highDueDays ?? rules.highDueDays}{" "}
                            day(s) or ≤{" "}
                            {meta.rules?.highRemainingHours ??
                              rules.highRemainingHours}{" "}
                            FH
                          </Text>
                        </div>
                      </div>
                    </div>
                  }
                >
                  <Button
                    type="text"
                    size="small"
                    icon={<InfoCircleOutlined />}
                    aria-label="View priority tie-break logic"
                    title="Priority tie-break logic"
                    style={{
                      flexShrink: 0,
                      padding: 0,
                      width: 20,
                      height: 20,
                    }}
                  />
                </Popover>
              )}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                width: "100%",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              {/* Main Controls */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  width: "100%",
                  flexWrap: "wrap",
                }}
              >
                {/* Search */}
                <Input
                  allowClear
                  size="large"
                  prefix={<SearchOutlined />}
                  placeholder="Search aircraft or inspection"
                  style={{
                    width: 280,
                    flexShrink: 0,
                  }}
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                />

                {/* Priority Mode */}
                <Select
                  size="large"
                  value={priorityMode}
                  onChange={handlePriorityModeChange}
                  disabled={savingPriority || savingRules}
                  style={{
                    width: 140,
                    flexShrink: 0,
                  }}
                  options={[
                    {
                      value: "automatic",
                      label: "Automatic",
                    },
                    {
                      value: "manual",
                      label: "Manual",
                    },
                  ]}
                />

                {priorityMode === "automatic" && (
                  <Button
                    size="large"
                    onClick={() => setShowControls(true)}
                    disabled={savingPriority || savingRules}
                  >
                    Automatic Controls
                  </Button>
                )}

                {priorityMode === "manual" && (
                  <>
                    <Select
                      size="large"
                      value={selectedPriority}
                      onChange={setSelectedPriority}
                      disabled={savingPriority || savingRules}
                      style={{ width: 130 }}
                      options={PRIORITY_OPTIONS}
                    />

                    {!aircraftSelectionMode ? (
                      <Button
                        size="large"
                        type="primary"
                        onClick={() => {
                          setAircraftSelectionMode(true);
                          setSelectedAircraft([]);
                        }}
                        disabled={savingPriority || savingRules}
                      >
                        Select Aircraft
                      </Button>
                    ) : (
                      <>
                        <Text type="secondary">
                          {selectedAircraft.length} selected
                        </Text>

                        <Button
                          size="large"
                          onClick={() => {
                            setSelectedAircraft([]);
                            setAircraftSelectionMode(false);
                          }}
                          disabled={savingPriority || savingRules}
                        >
                          Cancel
                        </Button>

                        <Button
                          size="large"
                          type="primary"
                          loading={savingPriority}
                          disabled={
                            selectedAircraft.length === 0 || savingRules
                          }
                          onClick={applyMaintenanceControls}
                        >
                          Apply Priority
                        </Button>
                      </>
                    )}
                  </>
                )}

                {/* Refresh */}
                <Button
                  icon={<ReloadOutlined />}
                  onClick={() => fetchPriorityData(rules)}
                  loading={loading}
                  size="large"
                  aria-label="Refresh rankings"
                  title="Refresh rankings"
                />
              </div>
            </div>
          </Col>
        </Row>
      </Card>

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
        onRow={(record) => ({
          onClick:
            aircraftSelectionMode && record.priorityLevel !== selectedPriority
              ? () => toggleAircraftSelection(record)
              : undefined,
          style:
            aircraftSelectionMode && selectedAircraftSet.has(record.aircraft)
              ? { background: "#f6ffed" }
              : undefined,
        })}
        pagination={{
          pageSize: 7,

          showTotal: (total, range) =>
            `${range[0]}-${range[1]} of ${total} aircraft`,
        }}
        scroll={{
          x: aircraftSelectionMode ? 1646 : 1600,
          y: "calc(100vh - 360px)",
        }}
        bordered
        size="small"
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
