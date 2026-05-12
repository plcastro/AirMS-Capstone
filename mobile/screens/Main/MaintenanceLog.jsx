import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { API_BASE } from "../../utilities/API_BASE";
import { formatDate, getAuthHeaders } from "../../utilities/mobileApi";
import {
  EmptyState,
  FieldRow,
  InfoCard,
  LoadingState,
  ModuleContainer,
  SearchBar,
  SectionTitle,
  StatusChip,
  moduleStyles,
} from "../../components/common/MobileModule";
import { COLORS } from "../../stylesheets/colors";

const normalizeLog = (entry) => {
  const workDetails =
    Array.isArray(entry.workDetails) && entry.workDetails.length > 0
      ? entry.workDetails
      : [
          entry.correctiveActionDone
            ? { description: entry.correctiveActionDone }
            : null,
          entry.defects ? { description: entry.defects } : null,
          entry.taskTitle
            ? { description: `Reference task: ${entry.taskTitle}` }
            : null,
        ].filter(Boolean);

  return {
    ...entry,
    id: entry.sourceTaskId || entry._id,
    sn: String(entry.aircraft || "").replace(/[^\d]/g, "") || "N/A",
    type: "Task Assignment",
    workDetails,
  };
};

export default function MaintenanceLog() {
  const [entries, setEntries] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedAircraft, setSelectedAircraft] = useState(null);
  const [selectedWorkOrder, setSelectedWorkOrder] = useState(null);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${API_BASE}/api/maintenance-logs/getAllMaintenanceLog`,
        { headers: await getAuthHeaders() },
      );
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.message || "Failed to load maintenance logs");
      }

      setEntries((payload?.data || []).map(normalizeLog));
    } catch (error) {
      console.error("Maintenance log fetch failed:", error);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const filteredEntries = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return entries;

    return entries.filter((entry) =>
      [
        entry.aircraft,
        entry.taskTitle,
        entry.defects,
        entry.correctiveActionDone,
        entry.reportedBy,
        entry.sourceTaskId,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle)),
    );
  }, [entries, search]);

  const aircraftGroups = useMemo(() => {
    const map = new Map();
    filteredEntries.forEach((entry) => {
      if (!entry.aircraft) return;
      const current = map.get(entry.aircraft) || [];
      map.set(entry.aircraft, [...current, entry]);
    });
    return Array.from(map.entries()).map(([aircraft, rows]) => ({
      aircraft,
      rows,
      sample: rows[0],
    }));
  }, [filteredEntries]);

  if (selectedWorkOrder) {
    return (
      <ModuleContainer>
        <TouchableOpacity
          style={[moduleStyles.row, { marginBottom: 10 }]}
          onPress={() => setSelectedWorkOrder(null)}
        >
          <MaterialCommunityIcons name="arrow-left" size={22} color={COLORS.primary} />
          <Text style={{ marginLeft: 6, color: COLORS.primary, fontWeight: "700" }}>
            Back to work orders
          </Text>
        </TouchableOpacity>

        <InfoCard
          title="Work Done Report"
          subtitle={selectedWorkOrder.sourceTaskId || selectedWorkOrder.id}
          right={<StatusChip label={selectedWorkOrder.status} />}
        >
          <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
            <FieldRow label="Aircraft" value={selectedWorkOrder.aircraft} />
            <FieldRow label="Reported By" value={selectedWorkOrder.reportedBy} />
            <FieldRow
              label="Rectified"
              value={formatDate(selectedWorkOrder.dateDefectRectified)}
            />
            <FieldRow label="Task Status" value={selectedWorkOrder.sourceTaskStatus} />
            <FieldRow label="Task Title" value={selectedWorkOrder.taskTitle} />
          </View>
        </InfoCard>

        <SectionTitle title="Description of Work" />
        {(selectedWorkOrder.workDetails || []).map((detail, index) => (
          <InfoCard key={`${index}-${detail.description || detail}`}>
            <Text style={{ color: COLORS.black, fontSize: 13, lineHeight: 19 }}>
              {index + 1}. {detail.description || detail || "N/A"}
            </Text>
          </InfoCard>
        ))}
      </ModuleContainer>
    );
  }

  if (selectedAircraft) {
    return (
      <ModuleContainer>
        <TouchableOpacity
          style={[moduleStyles.row, { marginBottom: 10 }]}
          onPress={() => setSelectedAircraft(null)}
        >
          <MaterialCommunityIcons name="arrow-left" size={22} color={COLORS.primary} />
          <Text style={{ marginLeft: 6, color: COLORS.primary, fontWeight: "700" }}>
            Back to aircraft
          </Text>
        </TouchableOpacity>

        <InfoCard title={selectedAircraft.aircraft} subtitle="Maintenance snapshot">
          <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
            <FieldRow label="Reported By" value={selectedAircraft.sample?.reportedBy} />
            <FieldRow label="ACFT S/N" value={selectedAircraft.sample?.sn} />
            <FieldRow label="Work Orders" value={selectedAircraft.rows.length} />
            <FieldRow label="Source" value="Task Assignment" />
          </View>
        </InfoCard>

        <SectionTitle title="Work Orders" />
        {selectedAircraft.rows.map((entry) => (
          <InfoCard
            key={entry._id || entry.id}
            title={entry.sourceTaskId || entry.id}
            subtitle={entry.taskTitle || "Untitled task"}
            right={<MaterialCommunityIcons name="chevron-right" size={24} color={COLORS.grayDark} />}
            onPress={() => setSelectedWorkOrder(entry)}
          >
            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
              <FieldRow
                label="Rectified"
                value={formatDate(entry.dateDefectRectified)}
              />
              <FieldRow label="Status" value={entry.status} />
            </View>
          </InfoCard>
        ))}
      </ModuleContainer>
    );
  }

  return (
    <ModuleContainer>
      <SearchBar
        value={search}
        onChangeText={setSearch}
        placeholder="Search maintenance logs"
      />
      {loading && <LoadingState />}
      {!loading && aircraftGroups.length === 0 && (
        <EmptyState text="No maintenance logs found yet." />
      )}
      {aircraftGroups.map((group) => (
        <InfoCard
          key={group.aircraft}
          title={group.aircraft}
          subtitle="Completed task records"
          right={<StatusChip label={`${group.rows.length} WO`} />}
          onPress={() => setSelectedAircraft(group)}
        >
          <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
            <FieldRow label="Source" value="Task Assignment" />
            <FieldRow label="Latest" value={formatDate(group.sample?.dateDefectRectified)} />
          </View>
        </InfoCard>
      ))}
    </ModuleContainer>
  );
}
