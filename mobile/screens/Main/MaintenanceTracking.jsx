import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Alert, Text, TouchableOpacity, View } from "react-native";
import { Picker } from "@react-native-picker/picker";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { API_BASE } from "../../utilities/API_BASE";
import { AuthContext } from "../../Context/AuthContext";
import { formatDateTime, getAuthHeaders } from "../../utilities/mobileApi";
import { showToast } from "../../utilities/toast";
import { confirmAction } from "../../utilities/confirmAction";
import {
  EmptyState,
  FieldRow,
  InfoCard,
  LoadingState,
  ModuleContainer,
  SectionTitle,
  StatCard,
  StatusChip,
  moduleStyles,
} from "../../components/common/MobileModule";
import { COLORS } from "../../stylesheets/colors";

const RISK_COLORS = {
  Critical: "#cf1322",
  High: "#d46b08",
  Medium: "#c98a00",
  Low: "#26866F",
};

const buildClearedInsight = (item) => ({
  ...item,
  issueTitle: "No maintenance issue detected",
  managerSummary: "No active maintenance flags found from the current records.",
  recommendedAction: "",
  manualReferences: [],
  matchedRules: [],
});

export default function MaintenanceTracking() {
  const { user } = useContext(AuthContext);
  const isOfficerInCharge =
    user?.jobTitle?.toLowerCase() === "officer-in-charge";
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [insights, setInsights] = useState([]);
  const [remainingRows, setRemainingRows] = useState([]);
  const [health, setHealth] = useState(null);
  const [meta, setMeta] = useState(null);
  const [aircraftFilter, setAircraftFilter] = useState("all");

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

  const filteredRemainingRows = useMemo(
    () =>
      aircraftFilter === "all"
        ? remainingRows
        : remainingRows.filter((item) => item.aircraft === aircraftFilter),
    [aircraftFilter, remainingRows],
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

  const regenerateSummaries = async () => {
    if (health?.configured === false) {
      showToast(health.message || "OpenAI is not configured on the server.");
      return;
    }

    const confirmed = await confirmAction({
      title: "Regenerate AI Summaries",
      message:
        "Regenerate maintenance summaries now? This may consume OpenAI quota.",
      confirmText: "Regenerate",
    });
    if (!confirmed) return;

    try {
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
    }
  };

  const markRectified = (item) => {
    Alert.alert(
      "Mark finding rectified?",
      `This will clear the active maintenance issue for ${item.aircraft}.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Mark Rectified",
          onPress: async () => {
            try {
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
                  }),
                  body: JSON.stringify(payload),
                },
              );
              const result = await response.json();
              if (!response.ok || !result.success) {
                throw new Error(result.message || "Failed to mark rectified");
              }
              setInsights((current) =>
                current.map((entry) =>
                  entry.aircraft === item.aircraft &&
                  entry.issueTitle === item.issueTitle
                    ? buildClearedInsight(entry)
                    : entry,
                ),
              );
              showToast("Maintenance finding marked rectified.");
            } catch (error) {
              console.error("Rectify finding failed:", error);
              showToast(error.message || "Failed to mark rectified.");
            }
          },
        },
      ],
    );
  };

  return (
    <ModuleContainer>
      <InfoCard title="AI Maintenance Tracking" subtitle={meta?.llmEnabled ? `${meta.activeModel} summaries available` : "Rule-based findings"}>
        <View
          style={{
            borderWidth: 1,
            borderColor: COLORS.grayMedium,
            borderRadius: 8,
            overflow: "hidden",
            marginTop: 10,
          }}
        >
          <Picker selectedValue={aircraftFilter} onValueChange={setAircraftFilter}>
            <Picker.Item label="All Aircraft" value="all" />
            {aircraftOptions.map((aircraft) => (
              <Picker.Item key={aircraft} label={aircraft} value={aircraft} />
            ))}
          </Picker>
        </View>
        {!isOfficerInCharge && (
          <TouchableOpacity
            style={[moduleStyles.button, { marginTop: 12 }]}
            onPress={regenerateSummaries}
            disabled={summaryLoading || health?.cooldown?.active}
          >
            <MaterialCommunityIcons name="refresh" size={18} color={COLORS.white} />
            <Text style={[moduleStyles.buttonText, { marginLeft: 6 }]}>
              {summaryLoading ? "Refreshing..." : "Regenerate OpenAI Summaries"}
            </Text>
          </TouchableOpacity>
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
          <Text style={[moduleStyles.subtitle, { color: COLORS.black }]}>
            {item.managerSummary || item.shortFinding || "No finding summary available."}
          </Text>
          {!!item.recommendedAction && (
            <Text style={[moduleStyles.subtitle, { marginTop: 8 }]}>
              Action: {item.recommendedAction}
            </Text>
          )}
          {!!item.manualReferences?.length && (
            <Text style={[moduleStyles.subtitle, { marginTop: 6 }]}>
              Ref: {item.manualReferences.join(" | ")}
            </Text>
          )}
          {!isOfficerInCharge && (item.matchedRules || []).length > 0 && (
            <TouchableOpacity
              style={[moduleStyles.button, { marginTop: 12 }]}
              onPress={() => markRectified(item)}
            >
              <Text style={moduleStyles.buttonText}>Mark Rectified</Text>
            </TouchableOpacity>
          )}
        </InfoCard>
      ))}

      <SectionTitle title="Remaining Flight Hours" />
      {filteredRemainingRows.slice(0, 20).map((row) => (
        <InfoCard
          key={`${row.aircraft}-${row.inspectionKey || row.inspectionName}`}
          title={row.aircraft}
          subtitle={row.inspectionName}
        >
          <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
            <FieldRow label="Remaining FH" value={row.remainingHours !== null && row.remainingHours !== undefined ? `${row.remainingHours} FH` : "N/A"} />
            <FieldRow label="Remaining Days" value={row.remainingDays !== null && row.remainingDays !== undefined ? `${row.remainingDays} day(s)` : "N/A"} />
            <FieldRow label="Due At" value={row.dueAtHours ? `${row.dueAtHours} FH` : "N/A"} />
            <FieldRow label="Due / End" value={formatDateTime(row.dueDate)} />
          </View>
        </InfoCard>
      ))}
    </ModuleContainer>
  );
}
