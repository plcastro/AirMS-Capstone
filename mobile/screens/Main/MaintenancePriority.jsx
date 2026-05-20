import React, { useCallback, useEffect, useMemo, useState } from "react";
import AppText from "../../components/common/AppText";
import AppInput from "../../components/common/AppInput";
import {
  TouchableOpacity,
  View
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { API_BASE } from "../../utilities/API_BASE";
import { formatDate, getAuthHeaders } from "../../utilities/mobileApi";
import { showToast } from "../../utilities/toast";
import { confirmAction } from "../../utilities/confirmAction";
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
  moduleStyles,
} from "../../components/common/MobileModule";
import { COLORS } from "../../stylesheets/colors";

const DEFAULT_RULES = {
  criticalDueDays: 5,
  criticalRemainingHours: 14,
  highDueDays: 7,
  highRemainingHours: 24,
  mediumDueDays: 14,
  longTurnaroundHours: 5,
};

const PRIORITY_COLORS = {
  Critical: "#cf1322",
  High: "#d46b08",
  Medium: "#c98a00",
  Low: "#26866F",
};

const RANKING_DISPLAY_LIMIT = 10;

const formatDueSummary = (record) => {
  const parts = [];
  if (record.dueByHours !== null && record.dueByHours !== undefined) {
    parts.push(`${record.dueByHours} FH`);
  }
  if (record.dueByDays !== null && record.dueByDays !== undefined) {
    parts.push(`${record.dueByDays} day(s)`);
  }
  return parts.length ? parts.join(" / ") : "N/A";
};

export default function MaintenancePriority() {
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [rules, setRules] = useState(DEFAULT_RULES);
  const [draftRules, setDraftRules] = useState(DEFAULT_RULES);
  const [priorityData, setPriorityData] = useState([]);
  const [meta, setMeta] = useState(null);
  const [rankingPage, setRankingPage] = useState(0);

  const fetchPriorityData = useCallback(async (activeRules) => {
    const rulesToUse = activeRules || DEFAULT_RULES;
    const params = new URLSearchParams(
      Object.fromEntries(
        Object.entries(rulesToUse).map(([key, value]) => [key, String(value)]),
      ),
    );

    const response = await fetch(
      `${API_BASE}/api/parts-monitoring/maintenance-priority?${params.toString()}`,
    );
    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Failed to load priority ranking");
    }

    setPriorityData(Array.isArray(result.data) ? result.data : []);
    setMeta(result.meta || null);
  }, []);

  const loadRules = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${API_BASE}/api/parts-monitoring/maintenance-priority/rules`,
      );
      const result = await response.json();
      const loadedRules =
        response.ok && result.success
          ? { ...DEFAULT_RULES, ...(result.data || {}) }
          : DEFAULT_RULES;

      setRules(loadedRules);
      setDraftRules(loadedRules);
      await fetchPriorityData(loadedRules);
    } catch (error) {
      console.error("Maintenance priority load failed:", error);
      showToast(error.message || "Failed to load maintenance priority.");
    } finally {
      setLoading(false);
    }
  }, [fetchPriorityData]);

  useEffect(() => {
    loadRules();
  }, [loadRules]);

  const filteredData = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return priorityData;
    return priorityData.filter((item) =>
      [
        item.aircraft,
        item.aircraftModel,
        item.nextInspection,
        item.priorityLevel,
        item.priorityReason,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle)),
    );
  }, [priorityData, search]);

  const stats = useMemo(
    () => ({
      aircraft: priorityData.length,
      critical: priorityData.filter((item) => item.priorityLevel === "Critical")
        .length,
      high: priorityData.filter((item) => item.priorityLevel === "High").length,
      fastest:
        priorityData.reduce((lowest, item) => {
          const value = Number(item.estimatedTurnaroundHours);
          if (!Number.isFinite(value)) return lowest;
          return lowest === null || value < lowest ? value : lowest;
        }, null) ?? "N/A",
    }),
    [priorityData],
  );
  const visibleRankings = useMemo(
    () =>
      filteredData.slice(
        rankingPage * RANKING_DISPLAY_LIMIT,
        (rankingPage + 1) * RANKING_DISPLAY_LIMIT,
      ),
    [filteredData, rankingPage],
  );
  const totalRankingPages = Math.max(
    1,
    Math.ceil(filteredData.length / RANKING_DISPLAY_LIMIT),
  );

  useEffect(() => {
    setRankingPage(0);
  }, [search]);

  const saveRules = async () => {
    const confirmed = await confirmAction({
      title: "Save Priority Rules",
      message: "Save these maintenance priority thresholds as default rules?",
      confirmText: "Save",
    });
    if (!confirmed) return;

    try {
      setSaving(true);
      const response = await fetch(
        `${API_BASE}/api/parts-monitoring/maintenance-priority/rules`,
        {
          method: "PUT",
          headers: await getAuthHeaders({
            "x-action-confirmed": "true",
          }),
          body: JSON.stringify({
            ...draftRules,
            confirmAction: true,
          }),
        },
      );
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to save rules");
      }
      const savedRules = { ...DEFAULT_RULES, ...(result.data || {}) };
      setRules(savedRules);
      setDraftRules(savedRules);
      await fetchPriorityData(savedRules);
      showToast("Maintenance priority rules saved.");
    } catch (error) {
      console.error("Priority rules save failed:", error);
      showToast(error.message || "Failed to save rules.");
    } finally {
      setSaving(false);
    }
  };

  const applyRules = async () => {
    const confirmed = await confirmAction({
      title: "Apply Priority Rules",
      message: "Apply these rule thresholds now?",
      confirmText: "Apply",
    });
    if (!confirmed) return;

    try {
      setLoading(true);
      setRules(draftRules);
      await fetchPriorityData(draftRules);
    } catch (error) {
      showToast(error.message || "Failed to apply rules.");
    } finally {
      setLoading(false);
    }
  };

  const updateDraftRule = (key, value) => {
    setDraftRules((current) => ({
      ...current,
      [key]: Number(value) || 0,
    }));
  };

  return (
    <ModuleContainer>
      <InfoCard
        title="Maintenance Priority Sorting"
        subtitle="Rule-based aircraft ranking for upcoming maintenance work"
        right={<StatusChip label="Manager" color={COLORS.primaryLight} />}
      >
        <AppText style={[moduleStyles.subtitle, { marginTop: 8 }]}>
          Ranked records follow the same priority rules used on the web module.
        </AppText>
      </InfoCard>

      <SearchBar
        value={search}
        onChangeText={setSearch}
        placeholder="Search aircraft or inspection"
      />

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        <StatCard label="Aircraft Ranked" value={stats.aircraft} />
        <StatCard label="Critical" value={stats.critical} tone="#cf1322" />
        <StatCard label="High" value={stats.high} tone="#d46b08" />
        <StatCard label="Fastest Turnaround" value={`${stats.fastest} hrs`} />
      </View>

      <InfoCard
        title="Rule Controls"
        subtitle="Adjust thresholds, apply temporarily, or save as default"
        right={
          <TouchableOpacity
            style={[
              moduleStyles.button,
              {
                paddingVertical: 8,
                paddingHorizontal: 10,
                backgroundColor: showRules ? COLORS.primary : COLORS.primaryLight,
              },
            ]}
            onPress={() => setShowRules((current) => !current)}
          >
            <MaterialCommunityIcons name="tune" size={17} color={COLORS.white} />
          </TouchableOpacity>
        }
      />

      {showRules && (
        <InfoCard title="Thresholds">
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {Object.keys(DEFAULT_RULES).map((key) => (
              <View key={key} style={{ width: "48%", marginTop: 8 }}>
                <AppText style={moduleStyles.label}>
                  {key.replace(/([A-Z])/g, " $1")}
                </AppText>
                <AppInput
                  keyboardType="numeric"
                  value={String(draftRules[key])}
                  onChangeText={(value) => updateDraftRule(key, value)}
                  style={{
                    borderWidth: 1,
                    borderColor: COLORS.grayMedium,
                    borderRadius: 8,
                    paddingHorizontal: 10,
                    paddingVertical: 8,
                    marginTop: 5,
                    backgroundColor: COLORS.white,
                  }}
                />
              </View>
            ))}
          </View>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
            <TouchableOpacity style={[moduleStyles.button, { flex: 1 }]} onPress={applyRules}>
              <AppText style={moduleStyles.buttonText}>Apply</AppText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[moduleStyles.button, { flex: 1, backgroundColor: COLORS.primary }]}
              onPress={saveRules}
              disabled={saving}
            >
              <AppText style={moduleStyles.buttonText}>
                {saving ? "Saving..." : "Save"}
              </AppText>
            </TouchableOpacity>
          </View>
        </InfoCard>
      )}

      {!!meta && (
        <InfoCard
          title="Priority Logic"
          subtitle={`Critical <= ${meta.rules?.criticalDueDays ?? rules.criticalDueDays} days or <= ${meta.rules?.criticalRemainingHours ?? rules.criticalRemainingHours} FH`}
        />
      )}

      <SectionTitle
        title="Ranked Maintenance"
        subtitle={`Showing ${
          filteredData.length === 0 ? 0 : rankingPage * RANKING_DISPLAY_LIMIT + 1
        }-${Math.min(
          (rankingPage + 1) * RANKING_DISPLAY_LIMIT,
          filteredData.length,
        )} of ${filteredData.length} aircraft/inspection ranking row(s)`}
      />
      {loading && <LoadingState />}
      {!loading && filteredData.length === 0 && <EmptyState />}
      {visibleRankings.map((record) => (
        <InfoCard
          key={[
            record.inspectionKey,
            record.sourceRow,
            record.aircraft,
            record.rank,
          ]
            .filter(Boolean)
            .join("-")}
          title={`#${record.rank || "-"} ${record.aircraft || "N/A"}`}
          subtitle={record.nextInspection || "Next inspection unavailable"}
          right={
            <StatusChip
              label={record.priorityLevel}
              color={PRIORITY_COLORS[record.priorityLevel] || COLORS.grayDark}
            />
          }
        >
          <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
            <FieldRow label="Model" value={record.aircraftModel} />
            <FieldRow label="Remaining" value={formatDueSummary(record)} />
            <FieldRow label="Calendar Due" value={formatDate(record.dueDate)} />
            <FieldRow
              label="Turnaround"
              value={
                record.estimatedTurnaroundHours !== null &&
                record.estimatedTurnaroundHours !== undefined
                  ? `${record.estimatedTurnaroundHours} hrs`
                  : "N/A"
              }
            />
          </View>
          <AppText style={[moduleStyles.subtitle, { marginTop: 10 }]}>
            {record.priorityReason || "No decision basis available."}
          </AppText>
        </InfoCard>
      ))}
      {filteredData.length > RANKING_DISPLAY_LIMIT && (
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 10 }}>
          <TouchableOpacity
            style={[
              moduleStyles.button,
              {
                flex: 1,
                backgroundColor:
                  rankingPage === 0 ? COLORS.grayMedium : COLORS.primary,
              },
            ]}
            disabled={rankingPage === 0}
            onPress={() => setRankingPage((page) => Math.max(0, page - 1))}
          >
            <MaterialCommunityIcons
              name="chevron-left"
              size={18}
              color={COLORS.white}
            />
            <AppText style={[moduleStyles.buttonText, { marginLeft: 4 }]}>
              Previous
            </AppText>
          </TouchableOpacity>
          <View
            style={[
              moduleStyles.card,
              {
                marginBottom: 0,
                alignItems: "center",
                justifyContent: "center",
                minWidth: 74,
                padding: 8,
              },
            ]}
          >
            <AppText style={{ color: COLORS.primary, fontWeight: "800" }}>
              {rankingPage + 1}/{totalRankingPages}
            </AppText>
          </View>
          <TouchableOpacity
            style={[
              moduleStyles.button,
              {
                flex: 1,
                backgroundColor:
                  rankingPage >= totalRankingPages - 1
                    ? COLORS.grayMedium
                    : COLORS.primaryLight,
              },
            ]}
            disabled={rankingPage >= totalRankingPages - 1}
            onPress={() =>
              setRankingPage((page) =>
                Math.min(totalRankingPages - 1, page + 1),
              )
            }
          >
            <AppText style={[moduleStyles.buttonText, { marginRight: 4 }]}>
              Next
            </AppText>
            <MaterialCommunityIcons
              name="chevron-right"
              size={18}
              color={COLORS.white}
            />
          </TouchableOpacity>
        </View>
      )}
    </ModuleContainer>
  );
}
