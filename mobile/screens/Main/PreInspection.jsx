import React, { useState, useContext, useEffect, useCallback, useRef } from "react";
import FlightWorkspace from "../../components/FlightLog/FlightWorkspace";
import AppText from "../../components/common/AppText";
import {
  View,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import { COLORS } from "../../stylesheets/colors";
import { AuthContext } from "../../Context/AuthContext";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import PreInspectionCards from "../../components/PreInspection/PreInspectionCards";
import PreInspectionEditEntry from "../../components/PreInspection/PreInspectionEditEntry";
import { API_BASE } from "../../utilities/API_BASE";
import { getAuthHeaders } from "../../utilities/mobileApi";
import { exportPreInspectionTemplatePdf } from "../../utilities/documentExport";
import { showToast } from "../../utilities/toast";
import {
  EmptyState,
  LoadingState,
  SearchBar,
} from "../../components/common/MobileModule";
import InlineDropdown from "../../components/common/InlineDropdown";
import AircraftLogGroups from "../../components/common/AircraftLogGroups";
import NeedsToggle from "../../components/common/NeedsToggle";
import useViewedLogs from "../../utilities/useViewedLogs";

import { matchesSearch } from "../../utilities/search";
import { canExportModule } from "../../../shared/exportAccess";
import { resolveUserRole } from "../../../shared/navigationAccess";
import { getLogAircraftRegistration } from "../../../shared/aircraftLogGroups";
const getDisplayStatus = (status) => {
  const normalizedStatus = String(status || "").trim().toLowerCase();

  return normalizedStatus === "completed"
    ? "completed"
    : normalizedStatus === "released"
      ? "released"
      : "pending";
};

export default function PreInspection({ route }) {
  const { user } = useContext(AuthContext);
  const { isNew, markViewed } = useViewedLogs(user, "pre");
  const targetPreInspectionId = route?.params?.targetPreInspectionId;
  const targetNotificationStatus = route?.params?.notificationStatus;
  const notificationRefreshAt = route?.params?.refreshAt;
  const handledNotificationTarget = useRef(null);
  const [aircraftQuery, setAircraftQuery] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAircraft, setSelectedAircraft] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("completed");
  const [needsAttention, setNeedsAttention] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [sortOrder, setSortOrder] = useState("newest");
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedInspection, setSelectedInspection] = useState(null);
  useEffect(() => {
    if (showEditModal && selectedInspection && !selectedInspection.flightLogId) markViewed(selectedInspection);
  }, [showEditModal, selectedInspection, markViewed]);
  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const userRole = resolveUserRole(user, "pilot");
  const canExportPreInspections = canExportModule(userRole, "preInspection");

  const fetchPreInspections = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE}/api/pre-flight/getAllPreInspection`,
        {
          headers: await getAuthHeaders(),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to fetch pre-flight inspections");
      }

      const data = await response.json();
      setInspections(data.data || []);
    } catch (error) {
      console.error("Error fetching pre-flight inspections:", error);
      showToast("Failed to fetch pre-flight inspections");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPreInspections();
  }, [fetchPreInspections, notificationRefreshAt]);

  useEffect(() => {
    if (!targetPreInspectionId) {
      handledNotificationTarget.current = null;
      return;
    }
    const targetKey = `${targetPreInspectionId}:${targetNotificationStatus || ""}:${notificationRefreshAt || ""}`;
    if (handledNotificationTarget.current === targetKey) return;

    const match = inspections.find(
      (inspection) => String(inspection._id) === String(targetPreInspectionId),
    );

    if (match) {
      handledNotificationTarget.current = targetKey;
      setSelectedAircraft(getLogAircraftRegistration(match));
      setSearchQuery("");
      setSelectedStatus(getDisplayStatus(match.status));
      setShowStatusDropdown(false);
      setSelectedInspection(match);
      setShowEditModal(true);
    }
  }, [
    targetPreInspectionId,
    targetNotificationStatus,
    notificationRefreshAt,
    inspections,
  ]);

  const statusOptions = [
    { label: "Released", value: "released" },
    { label: "Completed", value: "completed" },
  ];

  const sortOptions = [
    { label: "Newest First", value: "newest" },
    { label: "Oldest First", value: "oldest" },
  ];

  const inspectionDateValue = (inspection) =>
    new Date(inspection.date || inspection.createdAt || 0).getTime() || 0;

  const aircraftInspections = inspections.filter(
    (inspection) => getLogAircraftRegistration(inspection) === selectedAircraft,
  );

  const filteredInspections = aircraftInspections
    .filter((inspection) => {
      const matchesSearchText = matchesSearch(searchQuery, inspection);

      const matchesStatus =
        selectedStatus === "all" ||
        getDisplayStatus(inspection.status) === selectedStatus;

      return matchesSearchText && matchesStatus;
    })
    .sort((a, b) =>
      sortOrder === "oldest"
        ? inspectionDateValue(a) - inspectionDateValue(b)
        : inspectionDateValue(b) - inspectionDateValue(a),
    );

  const handleEdit = (inspection) => {
    setSelectedInspection(inspection);
    setShowEditModal(true);
  };

  const handleExport = async (inspection) => {
    await exportPreInspectionTemplatePdf(inspection);
  };

  const selectAircraft = (aircraft) => {
    setSelectedAircraft(aircraft);
    setSearchQuery("");
    setSelectedStatus("completed");
    setShowStatusDropdown(false);
  };

  const selectStatus = (status) => {
    setSelectedStatus(status);
    setShowStatusDropdown(false);
  };

  const selectSortOrder = (order) => {
    setSortOrder(order);
    setShowSortDropdown(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.grayLight }}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.grayLight} />

      <View key={selectedAircraft || "aircraft-groups"} style={{ flex: 1, paddingHorizontal: 7, paddingTop: 10 }}>
        {!selectedAircraft ? (
          <AircraftLogGroups
            isNew={isNew}
                refreshing={refreshing}
                onRefresh={() => fetchPreInspections(true)}
            searchFilters={
              <NeedsToggle
                label="Needs attention"
                value={needsAttention}
                onToggle={() => setNeedsAttention((value) => !value)}
              />
            }
            records={
              needsAttention
                ? inspections.filter(
                    (inspection) =>
                      getDisplayStatus(inspection.status) !== "completed",
                  )
                : inspections
            }
            sortBy="latestActivity"
            loading={loading}
            query={aircraftQuery}
            onQueryChange={setAircraftQuery}
            onSelect={selectAircraft}
            emptyText={
              needsAttention
                ? "No pre-flight inspections need attention."
                : "No pre-flight inspections found yet."
            }
          />
        ) : (
          <>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 14 }}>
              <TouchableOpacity
                onPress={() => selectAircraft("")}
                accessibilityRole="button"
                accessibilityLabel="Back to aircraft"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: COLORS.white,
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 10,
                  elevation: 2,
                  shadowColor: COLORS.black,
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.08,
                  shadowRadius: 3,
                }}
              >
                <MaterialCommunityIcons name="arrow-left" size={20} color={COLORS.primary} />
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <AppText style={{ fontSize: 16, fontWeight: "700", color: COLORS.black }}>
                  {selectedAircraft}
                </AppText>
                <AppText style={{ fontSize: 12, color: COLORS.grayDark, marginTop: 1 }}>
                  {aircraftInspections.length} pre-flight inspections
                </AppText>
              </View>
            </View>
            <SearchBar
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search pre-flight inspections"
            />

            <View style={{ flexDirection: "row", gap: 8, marginBottom: 14 }}>
              <View style={{ flex: 1, zIndex: showStatusDropdown ? 20 : 1 }}>
                <InlineDropdown
                  value={selectedStatus}
                  placeholder="Status"
                  open={showStatusDropdown}
                  onToggle={() => {
                    setShowSortDropdown(false);
                    setShowStatusDropdown((open) => !open);
                  }}
                  onChange={selectStatus}
                  options={statusOptions}
                  toggleStyle={{ backgroundColor: COLORS.white, borderColor: COLORS.grayMedium }}
                />
              </View>
              <View style={{ flex: 1, zIndex: showSortDropdown ? 20 : 1 }}>
                <InlineDropdown
                  value={sortOrder}
                  placeholder="Sort"
                  open={showSortDropdown}
                  onToggle={() => {
                    setShowStatusDropdown(false);
                    setShowSortDropdown((open) => !open);
                  }}
                  onChange={selectSortOrder}
                  options={sortOptions}
                  toggleStyle={{ backgroundColor: COLORS.white, borderColor: COLORS.grayMedium }}
                />
              </View>
            </View>

            <PreInspectionCards ListEmptyComponent={loading ? (<LoadingState text="Loading pre-flight inspections..." />) : (<EmptyState text="No pre-flight inspections match your filters." />)}
                refreshing={refreshing}
                onRefresh={() => fetchPreInspections(true)}
                currentUser={user}
                inspections={loading ? [] : filteredInspections}
                readOnly
                isNew={isNew}
                onEdit={handleEdit}
                onExport={canExportPreInspections ? handleExport : undefined}
                userRole={userRole}
              />
          </>
        )}
      </View>

      {/* View legacy inspections that are not linked to a Flight Log. */}
      <PreInspectionEditEntry
        visible={showEditModal && !selectedInspection?.flightLogId}
        inspectionData={selectedInspection}
        rpcOptions={[selectedInspection?.rpc].filter(Boolean)}
        onClose={() => {
          setShowEditModal(false);
          setSelectedInspection(null);
        }}
        userRole={userRole}
        readOnly
      />
      {!!selectedInspection?.flightLogId && showEditModal && (
        <FlightWorkspace
          id={String(selectedInspection.flightLogId?._id || selectedInspection.flightLogId)}
          visible initialSection="pre" inspectionMode readOnly
          onViewed={({ preInspections }) => markViewed(preInspections?.find(record => String(record._id) === String(selectedInspection._id)))}
          onClose={() => { setShowEditModal(false); setSelectedInspection(null); }}
          onChanged={() => fetchPreInspections(true)}
        />
      )}
    </View>
  );
}
