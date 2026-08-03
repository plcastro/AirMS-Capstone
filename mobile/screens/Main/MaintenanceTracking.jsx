import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import AppText from "../../components/common/AppText";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { API_BASE } from "../../utilities/API_BASE";
import { AuthContext } from "../../Context/AuthContext";
import { formatDateTime, getAuthHeaders } from "../../utilities/mobileApi";
import { showToast } from "../../utilities/toast";
import AlertComp from "../../components/AlertComp";
import {
  EmptyState,
  FieldRow,
  CardActionRow,
  InfoCard,
  LoadingState,
  ModuleContainer,
  SectionTitle,
  SearchBar,
  StatCard,
  StatusChip,
  moduleStyles,
} from "../../components/common/MobileModule";
import { COLORS } from "../../stylesheets/colors";
import { matchesSearch } from "../../utilities/search";

const RISK_COLORS = {
  Critical: "#cf1322",
  High: "#d46b08",
  Medium: "#c98a00",
  Low: "#26866F",
};

const ACTIVE_OPEN = new Set(["pending", "ongoing", "returned"]);

const normalizeStatus = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const getInspectionDueState = (row = {}) => {
  const remainingHours = Number(row.remainingHours);
  const remainingDays = Number(row.remainingDays);
  const hourDue = Number.isFinite(remainingHours) && remainingHours <= 0;
  const dayDue = Number.isFinite(remainingDays) && remainingDays <= 0;

  if (hourDue || dayDue) {
    return { label: "Overdue", color: "#cf1322" };
  }

  if (
    (Number.isFinite(remainingHours) && remainingHours <= 25) ||
    (Number.isFinite(remainingDays) && remainingDays <= 30)
  ) {
    return { label: "Due Soon", color: "#d46b08" };
  }

  return { label: "Monitor", color: COLORS.primaryLight };
};

const formatRemainingLimit = (row = {}) => {
  const parts = [];
  if (row.remainingHours !== null && row.remainingHours !== undefined) {
    parts.push(`${row.remainingHours} FH`);
  }
  if (row.remainingDays !== null && row.remainingDays !== undefined) {
    parts.push(`${row.remainingDays} day(s)`);
  }
  return parts.length ? parts.join(" / ") : "N/A";
};

const getTaskScheduleState = (task = {}) => {
  const status = String(task.status || "").toLowerCase();
  const endDate = new Date(task.endDateTime || task.dueDate || "");

  if (["completed", "approved", "closed", "turned in"].includes(status)) {
    return { label: "Completed", color: "#2e7d32" };
  }
  if (!Number.isNaN(endDate.getTime()) && endDate < new Date()) {
    return { label: "Overdue", color: "#cf1322" };
  }
  return { label: "Scheduled", color: COLORS.primaryLight };
};

const buildClearedInsight = (item) => ({
  ...item,
  riskLevel: "Low",
  issueTitle: "No maintenance issue detected",
  managerSummary: "No active maintenance flags found from the current records.",
  recommendedAction: "",
  manualReferences: [],
  matchedRules: [],
});

export default function MaintenanceTracking() {
  const { user } = useContext(AuthContext);
  const navigation = useNavigation();
  const isOfficerInCharge =
    user?.jobTitle?.toLowerCase() === "officer-in-charge";
  const role = String(user?.jobTitle || user?.access || "")
    .trim()
    .toLowerCase();
  const access = String(user?.access || "")
    .trim()
    .toLowerCase();
  const canScheduleInspectionTasks =
    role === "maintenance manager" ||
    role === "superadmin" ||
    access === "superadmin";
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [insights, setInsights] = useState([]);
  const [remainingRows, setRemainingRows] = useState([]);
  const [health, setHealth] = useState(null);
  const [meta, setMeta] = useState(null);
  const [aircraftFilter, setAircraftFilter] = useState("all");
  const [inspectionLimitSearch, setInspectionLimitSearch] = useState("");
  const [showAircraftDropdown, setShowAircraftDropdown] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [actionLoadingKey, setActionLoadingKey] = useState("");
  const [rectifyingKey, setRectifyingKey] = useState("");
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    title: "",
    message: "",
    confirmText: "Confirm",
    cancelText: "Cancel",
    onConfirm: null,
    onCancel: null,
  });

  const confirmWithAlert = ({
    title,
    message,
    confirmText = "Confirm",
    cancelText = "Cancel",
  }) =>
    new Promise((resolve) => {
      const finish = (result) => {
        setAlertConfig((current) => ({ ...current, visible: false }));
        resolve(result);
      };

      setAlertConfig({
        visible: true,
        title,
        message,
        confirmText,
        cancelText,
        onConfirm: () => finish(true),
        onCancel: () => finish(false),
      });
    });

  const loadTracking = useCallback(async () => {
    try {
      setLoading(true);
      const [insightResponse, healthResponse, remainingResponse] =
        await Promise.all([
          fetch(`${API_BASE}/api/ai-insights/maintenance-tracking`, {
            cache: "no-store",
          }),
          fetch(`${API_BASE}/api/ai-insights/health`, { cache: "no-store" }),
          fetch(`${API_BASE}/api/parts-monitoring/inspection-remaining-hours`, {
            cache: "no-store",
          }),
        ]);

      const [insightResult, healthResult, remainingResult] = await Promise.all([
        insightResponse.json(),
        healthResponse.json(),
        remainingResponse.json(),
      ]);

      if (!insightResponse.ok || !insightResult.success) {
        throw new Error(insightResult.message || "Failed to load tracking");
      }

      setInsights(Array.isArray(insightResult.data) ? insightResult.data : []);
      setMeta(insightResult.meta || null);
      setHealth(healthResult || null);
      setRemainingRows(
        remainingResponse.ok && Array.isArray(remainingResult.data)
          ? remainingResult.data
          : [],
      );
    } catch (error) {
      console.error("Maintenance tracking load failed:", error);
      showToast(error.message || "Failed to load maintenance tracking.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTracking();
  }, [loadTracking]);
  useEffect(() => {
    const cooldownUntil = health?.cooldown?.cooldownUntil;
    if (!health?.cooldown?.active || !cooldownUntil) {
      setCooldownRemaining(0);
      return undefined;
    }
    const updateCooldown = () => {
      const remainingSeconds = Math.max(
        0,
        Math.ceil((new Date(cooldownUntil).getTime() - Date.now()) / 1000),
      );
      setCooldownRemaining(remainingSeconds);
    };
    updateCooldown();
    const intervalId = setInterval(updateCooldown, 1000);
    return () => clearInterval(intervalId);
  }, [health?.cooldown?.active, health?.cooldown?.cooldownUntil]);

  const aircraftOptions = useMemo(() => {
    const set = new Set();
    insights.forEach((item) => item.aircraft && set.add(item.aircraft));
    remainingRows.forEach((item) => item.aircraft && set.add(item.aircraft));
    return Array.from(set).sort();
  }, [insights, remainingRows]);

  const filteredInsights = useMemo(
    () =>
      aircraftFilter === "all"
        ? insights
        : insights.filter((item) => item.aircraft === aircraftFilter),
    [aircraftFilter, insights],
  );

  const filteredRemainingRows = useMemo(() => {
    const aircraftFiltered =
      aircraftFilter === "all"
        ? remainingRows
        : remainingRows.filter((item) => item.aircraft === aircraftFilter);

    return aircraftFiltered.filter((item) =>
      matchesSearch(inspectionLimitSearch, {
        ...item,
        dueState: getInspectionDueState(item),
        remainingLimit: formatRemainingLimit(item),
      }),
    );
  }, [aircraftFilter, inspectionLimitSearch, remainingRows]);

  const scheduledTasks = useMemo(() => {
    const rows = filteredInsights.flatMap((insight) =>
      (insight.scheduledTasks || []).map((task) => ({
        ...task,
        key: `${insight.aircraftId || insight.aircraft}-${task.id || task.title}`,
        aircraft: task.aircraft || insight.aircraft,
      })),
    );
    return rows.sort((left, right) => {
      const leftDate = new Date(left.endDateTime || left.dueDate || 0).getTime();
      const rightDate = new Date(right.endDateTime || right.dueDate || 0).getTime();
      return leftDate - rightDate;
    });
  }, [filteredInsights]);

  const scheduledStats = useMemo(
    () =>
      scheduledTasks.reduce(
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
    [scheduledTasks],
  );

  const stats = useMemo(
    () =>
      filteredInsights.reduce(
        (totals, item) => {
          totals.total += 1;
          if (["Critical", "High"].includes(item.riskLevel)) totals.high += 1;
          if (item.managerSummarySource === "openai") totals.openai += 1;
          return totals;
        },
        { total: 0, high: 0, openai: 0 },
      ),
    [filteredInsights],
  );

  const scheduledInspectionTaskKeys = useMemo(() => {
    const keys = new Set();
    scheduledTasks.forEach((task) => {
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
  }, [scheduledTasks]);

  const hasScheduledInspectionTask = useCallback(
    (row = {}) => {
      const aircraft = String(row.aircraft || "")
        .trim()
        .toLowerCase();
      const inspectionName = String(row.inspectionName || "")
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

  const aircraftFilterLabel =
    aircraftFilter === "all" ? "All Aircraft" : `RP/C: ${aircraftFilter}`;

  const selectAircraftFilter = (aircraft) => {
    setAircraftFilter(aircraft);
    setShowAircraftDropdown(false);
  };

  const regenerateSummaries = async () => {
    if (actionLoadingKey) return;
    if (health?.configured === false) {
      showToast(health.message || "OpenAI is not configured on the server.");
      return;
    }

    const confirmed = await confirmWithAlert({
      title: "Regenerate AI Summaries",
      message:
        "Regenerate maintenance summaries now? This may consume OpenAI quota.",
      confirmText: "Regenerate",
    });
    if (!confirmed) return;

    try {
      setActionLoadingKey("regenerate");
      setSummaryLoading(true);
      const response = await fetch(
        `${API_BASE}/api/ai-insights/maintenance-tracking?includeLLMSummary=1&llmLimit=0`,
        { cache: "no-store" },
      );
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to regenerate summaries");
      }
      setInsights(Array.isArray(result.data) ? result.data : []);
      setMeta(result.meta || null);
      showToast("Maintenance summaries refreshed.");
    } catch (error) {
      console.error("Summary regeneration failed:", error);
      showToast(error.message || "Failed to regenerate summaries.");
    } finally {
      setSummaryLoading(false);
      setActionLoadingKey("");
    }
  };

  const markRectified = async (item) => {
    if (actionLoadingKey || rectifyingKey) return;
    const confirmed = await confirmWithAlert({
      title: "Mark finding rectified?",
      message: `This will clear the active maintenance issue for ${item.aircraft}.`,
      confirmText: "Mark Rectified",
    });
    if (!confirmed) return;

    try {
      const key = `${item.aircraft}-${item.issueTitle}`;
      setRectifyingKey(key);
      setActionLoadingKey("rectify");
      const payload = {
        aircraft: item.aircraft,
        aircraftModel: item.aircraftModel || "AS350 B3",
        issueTitle: item.issueTitle,
        component: item.component,
        riskLevel: item.riskLevel,
        recommendedAction: item.recommendedAction || "",
        recommendedActions: item.recommendedActions || [],
        procedureReference: item.procedureReference || "",
        procedureTitle: item.procedureTitle || "",
        procedureSummary: item.procedureSummary || "",
        manualReference: (item.manualReferences || []).join(" | "),
        matchedRuleCodes: (item.matchedRules || [])
          .map((rule) => rule.ruleCode)
          .filter(Boolean),
        inspectionName: item.procedureTitle || "OC Inspection",
      };
      const response = await fetch(
        `${API_BASE}/api/ai-insights/rectification-task`,
        {
          method: "POST",
          headers: await getAuthHeaders({
            "Content-Type": "application/json",
            "x-action-confirmed": "true",
          }),
          body: JSON.stringify({
            ...payload,
            confirmAction: true,
          }),
        },
      );
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to mark rectified");
      }
      setInsights((current) =>
        current.map((entry) =>
          entry.aircraft === item.aircraft && entry.issueTitle === item.issueTitle
            ? buildClearedInsight(entry)
            : entry,
        ),
      );
      showToast("Maintenance finding marked rectified.");
    } catch (error) {
      console.error("Rectify finding failed:", error);
      showToast(error.message || "Failed to mark rectified.");
    } finally {
      setRectifyingKey("");
      setActionLoadingKey("");
    }
  };

  const scheduleInspectionTask = (row = {}) => {
    const state = getInspectionDueState(row);
    navigation.navigate("Tasks", {
      openAddTask: true,
      draftType: "inspectionLimit",
      aircraft: row.aircraft || "",
      aircraftModel: row.aircraftModel || "",
      inspectionName: row.inspectionName || "",
      dueDate: row.dueDate || "",
      dueAtHours: row.dueAtHours ?? null,
      remainingHours: row.remainingHours ?? null,
      remainingDays: row.remainingDays ?? null,
      dueStatus: state.label,
    });
  };

  return (
    <ModuleContainer>
      <InfoCard title="AI Maintenance Tracking" subtitle={meta?.llmEnabled ? `${meta.activeModel} summaries available` : "Rule-based findings"}>
        <View style={{ marginTop: 10 }}>
          <TouchableOpacity
            style={styles.unifiedFilterButton}
            activeOpacity={0.82}
            onPress={() => setShowAircraftDropdown((open) => !open)}
          >
            <AppText style={styles.unifiedFilterButtonText} numberOfLines={1}>
              {aircraftFilterLabel}
            </AppText>
            <MaterialCommunityIcons
              name={showAircraftDropdown ? "chevron-up" : "chevron-down"}
              size={22}
              color={COLORS.grayDark}
            />
          </TouchableOpacity>

          {showAircraftDropdown && (
            <View style={[styles.unifiedDropdownMenu, { maxHeight: 300 }]}>
              <ScrollView nestedScrollEnabled>
                {["all", ...aircraftOptions].map((aircraft, index, options) => (
                  <TouchableOpacity
                    key={aircraft}
                    style={[
                      styles.unifiedDropdownItem,
                      index < options.length - 1
                        ? styles.unifiedDropdownItemBordered
                        : null,
                    ]}
                    onPress={() => selectAircraftFilter(aircraft)}
                  >
                    <AppText style={styles.unifiedDropdownItemText}>
                      {aircraft === "all" ? "All Aircraft" : `RP/C: ${aircraft}`}
                    </AppText>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>
        {!isOfficerInCharge && (
          <TouchableOpacity
            style={[moduleStyles.button, { marginTop: 12 }]}
            onPress={regenerateSummaries}
            disabled={summaryLoading || health?.cooldown?.active || Boolean(actionLoadingKey)}
          >
            {summaryLoading ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <MaterialCommunityIcons name="refresh" size={18} color={COLORS.white} />
            )}
            <AppText style={[moduleStyles.buttonText, { marginLeft: 6 }]}>
              {summaryLoading ? "Refreshing..." : "Regenerate OpenAI Summaries"}
            </AppText>
          </TouchableOpacity>
        )}
        {!!health && (
          <AppText style={[moduleStyles.subtitle, { marginTop: 10 }]}>
            OpenAI: {health.configured ? "Configured" : "Not configured"} |{" "}
            {health.reachable ? "Reachable" : "Unavailable"}
            {health.model ? ` | Model: ${health.model}` : ""}
            {health?.cooldown?.active
              ? ` | Cooldown: ${cooldownRemaining || health.cooldown.retryAfterSeconds || 0}s`
              : ""}
          </AppText>
        )}
      </InfoCard>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        <StatCard label="Aircraft Assessed" value={stats.total} />
        <StatCard label="Critical + High" value={stats.high} tone="#cf1322" />
        <StatCard label="OpenAI Summaries" value={stats.openai} />
        <StatCard label="Rule Fallbacks" value={stats.total - stats.openai} />
      </View>

      {loading && <LoadingState />}
      {!loading && filteredInsights.length === 0 && <EmptyState text="No active findings found." />}

      <SectionTitle title="Maintenance Findings" />
      {filteredInsights.map((item) => (
        <InfoCard
          key={`${item.aircraft}-${item.issueTitle}`}
          title={item.aircraft}
          subtitle={item.issueTitle}
          right={
            <StatusChip
              label={item.riskLevel}
              color={RISK_COLORS[item.riskLevel] || COLORS.grayDark}
            />
          }
        >
          <AppText style={[moduleStyles.subtitle, { color: COLORS.black }]}>
            {item.managerSummary || item.shortFinding || "No finding summary available."}
          </AppText>
          {!!item.recommendedAction && (
            <AppText style={[moduleStyles.subtitle, { marginTop: 8 }]}>
              Action: {item.recommendedAction}
            </AppText>
          )}
          {!!item.manualReferences?.length && (
            <AppText style={[moduleStyles.subtitle, { marginTop: 6 }]}>
              Ref: {item.manualReferences.join(" | ")}
            </AppText>
          )}
          {!isOfficerInCharge && (item.matchedRules || []).length > 0 && (
            <CardActionRow>
              <TouchableOpacity
                style={[styles.compactActionButton, Boolean(actionLoadingKey) && styles.disabledActionButton]}
                onPress={() => markRectified(item)}
                disabled={Boolean(actionLoadingKey)}
              >
                {rectifyingKey === `${item.aircraft}-${item.issueTitle}` ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <MaterialCommunityIcons
                    name="check-circle-outline"
                    size={16}
                    color={COLORS.white}
                  />
                )}
                <AppText style={styles.compactActionButtonText}>
                  {rectifyingKey === `${item.aircraft}-${item.issueTitle}`
                    ? "Processing"
                    : "Mark Rectified"}
                </AppText>
              </TouchableOpacity>
            </CardActionRow>
          )}
        </InfoCard>
      ))}

      <SectionTitle title="Remaining Flight Hours" />
      <SearchBar
        value={inspectionLimitSearch}
        onChangeText={setInspectionLimitSearch}
        placeholder="Search aircraft, status, inspection, remaining..."
        containerStyle={{ marginBottom: 8 }}
      />
      {!loading && filteredRemainingRows.length === 0 && (
        <EmptyState text="No inspection limits match your search." />
      )}
      {filteredRemainingRows.slice(0, 20).map((row, index) => {
        const dueState = getInspectionDueState(row);
        const isScheduled = hasScheduledInspectionTask(row);
        return (
          <InfoCard
            key={`${row.aircraft}-${row.inspectionKey || row.inspectionName}-${index}`}
            title={row.aircraft}
            subtitle={row.inspectionName}
            right={<StatusChip label={dueState.label} color={dueState.color} />}
          >
            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
              <FieldRow label="Remaining FH" value={row.remainingHours !== null && row.remainingHours !== undefined ? `${row.remainingHours} FH` : "N/A"} />
              <FieldRow label="Remaining Days" value={row.remainingDays !== null && row.remainingDays !== undefined ? `${row.remainingDays} day(s)` : "N/A"} />
              <FieldRow label="Due At" value={row.dueAtHours ? `${row.dueAtHours} FH` : "N/A"} />
              <FieldRow label="Due / End" value={formatDateTime(row.dueDate)} />
            </View>
            <CardActionRow>
              {isScheduled ? (
                <View style={styles.scheduledPill}>
                  <MaterialCommunityIcons
                    name="calendar-check"
                    size={15}
                    color={COLORS.primaryLight}
                  />
                  <AppText style={styles.scheduledPillText}>
                    Task Scheduled
                  </AppText>
                </View>
              ) : canScheduleInspectionTasks ? (
                <TouchableOpacity
                  style={styles.compactActionButton}
                  onPress={() => scheduleInspectionTask(row)}
                >
                  <MaterialCommunityIcons
                    name="calendar-plus"
                    size={16}
                    color={COLORS.white}
                  />
                  <AppText style={styles.compactActionButtonText}>
                    Schedule Task
                  </AppText>
                </TouchableOpacity>
              ) : (
                <View style={styles.mutedPill}>
                  <AppText style={styles.mutedPillText}>Not scheduled</AppText>
                </View>
              )}
            </CardActionRow>
          </InfoCard>
        );
      })}

      <SectionTitle title="Scheduled Tasks" />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        <StatCard label="Total" value={scheduledStats.total} />
        <StatCard label="Scheduled" value={scheduledStats.scheduled} tone={COLORS.primaryLight} />
        <StatCard label="Overdue" value={scheduledStats.overdue} tone="#cf1322" />
        <StatCard label="Completed" value={scheduledStats.completed} tone="#2e7d32" />
      </View>
      {scheduledTasks.slice(0, 20).map((task) => {
        const state = getTaskScheduleState(task);
        return (
          <InfoCard
            key={task.key}
            title={task.aircraft || "N/A"}
            subtitle={task.title || "Untitled task"}
            right={<StatusChip label={state.label} color={state.color} />}
          >
            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
              <FieldRow label="Mechanic" value={task.assignedToName || "Unassigned"} />
              <FieldRow label="Type" value={task.maintenanceType || "Maintenance"} />
              <FieldRow label="Start" value={formatDateTime(task.startDateTime)} />
              <FieldRow label="End / Due" value={formatDateTime(task.endDateTime || task.dueDate)} />
            </View>
          </InfoCard>
        );
      })}
      <AlertComp
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        confirmText={alertConfig.confirmText}
        cancelText={alertConfig.cancelText}
        onConfirm={alertConfig.onConfirm}
        onCancel={alertConfig.onCancel}
      />
    </ModuleContainer>
  );
}

const styles = StyleSheet.create({
  unifiedFilterButton: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.grayMedium,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 48,
  },
  unifiedFilterButtonText: {
    flex: 1,
    color: COLORS.black,
    fontSize: 12,
    fontWeight: "600",
    marginRight: 8,
  },
  unifiedDropdownMenu: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.grayMedium,
    borderRadius: 8,
    marginTop: 6,
    overflow: "hidden",
    zIndex: 1000,
  },
  unifiedDropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  unifiedDropdownItemBordered: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.grayMedium,
  },
  unifiedDropdownItemText: {
    color: COLORS.black,
    fontSize: 12,
    fontWeight: "500",
  },
  compactActionButton: {
    alignItems: "center",
    backgroundColor: COLORS.primaryLight,
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "center",
    minHeight: 34,
    minWidth: 132,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  compactActionButtonText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 5,
  },
  disabledActionButton: {
    opacity: 0.65,
  },
  scheduledPill: {
    alignItems: "center",
    borderColor: COLORS.primaryLight,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    minHeight: 32,
    minWidth: 132,
    justifyContent: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  scheduledPillText: {
    color: COLORS.primaryLight,
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 5,
  },
  mutedPill: {
    alignItems: "center",
    backgroundColor: COLORS.grayLight,
    borderRadius: 999,
    minHeight: 32,
    minWidth: 132,
    justifyContent: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  mutedPillText: {
    color: COLORS.grayDark,
    fontSize: 12,
    fontWeight: "600",
  },
});
