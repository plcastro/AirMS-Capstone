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
import { styles } from "../../stylesheets/styles";
import {
  EmptyState,
  LoadingState,
  SearchBar,
  SectionTitle,
} from "../../components/common/MobileModule";
import AircraftLogGroups from "../../components/common/AircraftLogGroups";
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
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
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
      setSelectedStatus("all");
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
    { label: "All Status", value: "all" },
    { label: "Released", value: "released" },
    { label: "Completed", value: "completed" },
  ];

  const aircraftInspections = inspections.filter(
    (inspection) => getLogAircraftRegistration(inspection) === selectedAircraft,
  );

  const filteredInspections = aircraftInspections.filter((inspection) => {
    const matchesSearchText = matchesSearch(searchQuery, inspection);

    const matchesStatus =
      selectedStatus === "all" ||
      getDisplayStatus(inspection.status) === selectedStatus;

    return matchesSearchText && matchesStatus;
  });

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
    setSelectedStatus("all");
    setShowStatusDropdown(false);
  };

  const selectStatus = (status) => {
    setSelectedStatus(status);
    setShowStatusDropdown(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.grayLight }}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.grayLight} />

      <View key={selectedAircraft || "aircraft-groups"} style={{ flex: 1, paddingHorizontal: 7, paddingTop: 10 }}>
        {!!selectedAircraft && (
          <View
            style={[
              styles.unifiedControlRow,
              { justifyContent: "flex-start" },
            ]}
          >
            {!!selectedAircraft && (
              <TouchableOpacity
                style={{ flexDirection: "row", alignItems: "center", minHeight: 48 }}
                onPress={() => selectAircraft("")}
              >
                <MaterialCommunityIcons name="arrow-left" size={22} color={COLORS.primary} />
                <AppText style={{ marginLeft: 6, color: COLORS.primary, fontWeight: "700" }}>
                  Back to aircraft
                </AppText>
              </TouchableOpacity>
            )}
          </View>
        )}

        {!selectedAircraft ? (
          <AircraftLogGroups
            isNew={isNew}
                refreshing={refreshing}
                onRefresh={() => fetchPreInspections(true)}
            records={inspections}
            sortBy="latestActivity"
            loading={loading}
            query={aircraftQuery}
            onQueryChange={setAircraftQuery}
            onSelect={selectAircraft}
            emptyText="No pre-flight inspections found yet."
          />
        ) : (
          <>
            <SectionTitle
              title={selectedAircraft}
              subtitle={`${aircraftInspections.length} pre-flight inspections`}
            />
            <SearchBar
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search pre-flight inspections"
            />

            <View style={{ marginBottom: 20 }}>
              <TouchableOpacity
                style={styles.unifiedFilterButton}
                onPress={() => setShowStatusDropdown((open) => !open)}
              >
                <AppText style={styles.unifiedFilterButtonText} numberOfLines={1}>
                  {statusOptions.find((option) => option.value === selectedStatus)
                    ?.label || "Status"}
                </AppText>
                <MaterialCommunityIcons
                  name={showStatusDropdown ? "chevron-up" : "chevron-down"}
                  size={22}
                  color={COLORS.grayDark}
                />
              </TouchableOpacity>

              {showStatusDropdown && (
                <View style={styles.unifiedDropdownMenu}>
                  {statusOptions.map((option, index) => (
                    <TouchableOpacity
                      key={option.value}
                      style={{
                        ...styles.unifiedDropdownItem,
                        borderBottomWidth: index < statusOptions.length - 1 ? 1 : 0,
                        borderBottomColor: COLORS.grayMedium,
                      }}
                      onPress={() => selectStatus(option.value)}
                    >
                      <AppText style={styles.unifiedDropdownItemText}>
                        {option.label}
                      </AppText>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
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
