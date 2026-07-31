import React, { useCallback, useEffect, useMemo, useState } from "react";
import AppText from "../../components/common/AppText";
import {
  TouchableOpacity,
  View
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import { API_BASE } from "../../utilities/API_BASE";
import { formatDate, getAuthHeaders } from "../../utilities/mobileApi";
import { exportMaintenanceLogPdf } from "../../utilities/pdfExport";
import {
  EmptyState,
  FieldRow,
  InfoCard,
  LoadingState,
  ModuleContainer,
  SearchBar,
  SectionTitle,
  StatusChip,
  StatusField,
  StatusTag,
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
    base:
      entry.base ||
      entry.locationBase ||
      entry.assignedBase ||
      entry.stationBase ||
      entry.sourceBase ||
      "UNKNOWN",
    type: "Task Assignment",
    workDetails,
  };
};

const getMechanicInCharge = (record = {}) =>
  record.mechanicInCharge || record.reportedBy || "";

const getInspector = (record = {}) => record.inspector || record.approvedBy || "";

const getMechanicLicenseNo = (record = {}) =>
  record.mechanicLicenseNo || record.licenseNo || "";

const getInspectorLicenseNo = (record = {}) => record.inspectorLicenseNo || "";

export default function MaintenanceLog() {
  const [entries, setEntries] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedAircraft, setSelectedAircraft] = useState(null);
  const [selectedWorkOrder, setSelectedWorkOrder] = useState(null);
  const [selectedBase, setSelectedBase] = useState("all");
  const [exportingWorkOrder, setExportingWorkOrder] = useState(false);

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

  const baseOptions = useMemo(
    () => [
      "all",
      ...new Set(
        entries
          .map((entry) => String(entry.base || "").trim().toUpperCase())
          .filter(Boolean),
      ),
    ],
    [entries],
  );

  const filteredEntries = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const baseFiltered =
      selectedBase === "all"
        ? entries
        : entries.filter(
            (entry) =>
              String(entry.base || "").trim().toUpperCase() === selectedBase,
          );

    if (!needle) return baseFiltered;

    return baseFiltered.filter((entry) =>
      [
        entry.aircraft,
        entry.taskTitle,
        entry.defects,
        entry.correctiveActionDone,
        entry.reportedBy,
        entry.base,
        entry.sourceTaskId,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle)),
    );
  }, [entries, search, selectedBase]);

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
        <View
          style={[
            moduleStyles.row,
            { justifyContent: "space-between", marginBottom: 10 },
          ]}
        >
          <TouchableOpacity
            style={moduleStyles.row}
            onPress={() => setSelectedWorkOrder(null)}
          >
            <MaterialCommunityIcons name="arrow-left" size={22} color={COLORS.primary} />
            <AppText style={{ marginLeft: 6, color: COLORS.primary, fontWeight: "700" }}>
              Back to work orders
            </AppText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              moduleStyles.button,
              { paddingVertical: 8, paddingHorizontal: 12, marginBottom: 0 },
            ]}
            disabled={exportingWorkOrder}
            onPress={async () => {
              setExportingWorkOrder(true);
              try {
                await exportMaintenanceLogPdf(selectedWorkOrder);
              } finally {
                setExportingWorkOrder(false);
              }
            }}
          >
            <MaterialCommunityIcons name="export-variant" size={18} color={COLORS.white} />
            <AppText style={[moduleStyles.buttonText, { marginLeft: 6 }]}>
              {exportingWorkOrder ? "Exporting..." : "Export"}
            </AppText>
          </TouchableOpacity>
        </View>

        <InfoCard
          title="Work Done Report"
          subtitle={selectedWorkOrder.sourceTaskId || selectedWorkOrder.id}
          right={<StatusTag label={selectedWorkOrder.status} />}
        >
          <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
            <FieldRow label="Aircraft" value={selectedWorkOrder.aircraft} />
            <FieldRow label="Base" value={selectedWorkOrder.base} />
            <FieldRow
              label="Mechanic-in-charge"
              value={getMechanicInCharge(selectedWorkOrder)}
            />
            <FieldRow label="Inspector" value={getInspector(selectedWorkOrder)} />
            <FieldRow
              label="Mechanic License No."
              value={getMechanicLicenseNo(selectedWorkOrder)}
            />
            <FieldRow
              label="Inspector License No."
              value={getInspectorLicenseNo(selectedWorkOrder)}
            />
            <FieldRow
              label="Rectified"
              value={formatDate(selectedWorkOrder.dateDefectRectified)}
            />
            <StatusField label="Task Status" value={selectedWorkOrder.sourceTaskStatus} />
            <FieldRow label="Task Title" value={selectedWorkOrder.taskTitle} />
          </View>
        </InfoCard>

        <SectionTitle title="Description of Work" />
        {(selectedWorkOrder.workDetails || []).map((detail, index) => (
          <InfoCard key={`${index}-${detail.description || detail}`}>
            <AppText style={{ color: COLORS.black, fontSize: 13, lineHeight: 19 }}>
              {index + 1}. {detail.description || detail || "N/A"}
            </AppText>
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
          <AppText style={{ marginLeft: 6, color: COLORS.primary, fontWeight: "700" }}>
            Back to aircraft
          </AppText>
        </TouchableOpacity>

        <InfoCard title={selectedAircraft.aircraft} subtitle="Maintenance snapshot">
          <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
            <FieldRow label="Reported By" value={selectedAircraft.sample?.reportedBy} />
            <FieldRow label="Base" value={selectedAircraft.sample?.base} />
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
              <FieldRow label="Base" value={entry.base} />
              <StatusField label="Status" value={entry.status} />
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
      <View
        style={{
          borderWidth: 1,
          borderColor: COLORS.grayMedium,
          borderRadius: 8,
          marginBottom: 12,
          overflow: "hidden",
          backgroundColor: COLORS.white,
        }}
      >
        <Picker selectedValue={selectedBase} onValueChange={setSelectedBase}>
          {baseOptions.map((base) => (
            <Picker.Item
              key={base}
              label={base === "all" ? "All Bases" : base}
              value={base}
            />
          ))}
        </Picker>
      </View>
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
            <FieldRow label="Base" value={group.sample?.base} />
            <FieldRow label="Latest" value={formatDate(group.sample?.dateDefectRectified)} />
          </View>
        </InfoCard>
      ))}
    </ModuleContainer>
  );
}
