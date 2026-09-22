import React, { useState, useContext, useEffect, useCallback, useRef } from "react";
import FlightWorkspace from "../../components/FlightLog/FlightWorkspace";
import AppText from "../../components/common/AppText";
import {
  View,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
} from "react-native";
import { COLORS } from "../../stylesheets/colors";
import { AuthContext } from "../../Context/AuthContext";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import PostInspectionCards from "../../components/PostInspection/PostInspectionCards";
import PostInspectionEditEntry from "../../components/PostInspection/PostInspectionEditEntry";
import { API_BASE } from "../../utilities/API_BASE";
import { getAuthHeaders } from "../../utilities/mobileApi";
import { exportPostInspectionTemplatePdf } from "../../utilities/documentExport";
import { showToast } from "../../utilities/toast";
import { styles } from "../../stylesheets/styles";
import {
  EmptyState,
  LoadingState,
  SearchBar,
  SectionTitle,
} from "../../components/common/MobileModule";
import AircraftLogGroups from "../../components/common/AircraftLogGroups";

import { matchesSearch } from "../../utilities/search";
import { canExportModule } from "../../../shared/exportAccess";
import { resolveUserRole } from "../../../shared/navigationAccess";
import { getLogAircraftRegistration } from "../../../shared/aircraftLogGroups";
import {
  createEmptyB412PostInspectionData,
  isB412Aircraft,
} from "../../components/PostInspection/b412PostInspectionData";

const normalizePostInspectionPayload = (inspection = {}) => {
  if (isB412Aircraft(inspection.aircraftType)) {
    return {
      ...inspection,
      b412Data: createEmptyB412PostInspectionData(inspection.b412Data),
    };
  }

  const legacyInspection = { ...inspection };
  delete legacyInspection.b412Data;
  return legacyInspection;
};

const getDisplayStatus = (status) => {
  const normalizedStatus = String(status || "").trim().toLowerCase();

  return normalizedStatus === "completed"
    ? "completed"
    : normalizedStatus === "released"
      ? "released"
      : "pending";
};

export default function PostInspection({ route }) {
  const { user } = useContext(AuthContext);
  const targetPostInspectionId = route?.params?.targetPostInspectionId;
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
  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [aircraftRpcOptions, setAircraftRpcOptions] = useState([]);

  const userRole = resolveUserRole(user, "pilot");
  const isOfficerInCharge = userRole === "officer-in-charge";
  const canExportPostInspections = canExportModule(
    userRole,
    "postInspection",
  );

  const fetchPostInspections = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE}/api/post-flight/getAllPostInspection`,
        {
          headers: await getAuthHeaders(),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to fetch post-inspections");
      }

      const data = await response.json();
      setInspections(data.data || []);
    } catch (error) {
      console.error("Error fetching post-inspections:", error);
      showToast("Failed to fetch post-inspections");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPostInspections();
  }, [fetchPostInspections, notificationRefreshAt]);

  useEffect(() => {
    if (!targetPostInspectionId) {
      handledNotificationTarget.current = null;
      return;
    }
    const targetKey = `${targetPostInspectionId}:${targetNotificationStatus || ""}:${notificationRefreshAt || ""}`;
    if (handledNotificationTarget.current === targetKey) return;

    const match = inspections.find(
      (inspection) => String(inspection._id) === String(targetPostInspectionId),
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
    targetPostInspectionId,
    targetNotificationStatus,
    notificationRefreshAt,
    inspections,
  ]);

  useEffect(() => {
    const fetchAircraftRpcOptions = async () => {
      try {
        const response = await fetch(
          `${API_BASE}/api/parts-monitoring/aircraft-list`,
        );
        if (!response.ok) {
          throw new Error("Failed to fetch aircraft RP-Cs");
        }

        const data = await response.json();
        setAircraftRpcOptions(Array.isArray(data?.data) ? data.data : []);
      } catch (error) {
        console.error("Error fetching aircraft RP-Cs:", error);
        setAircraftRpcOptions([]);
      }
    };

    fetchAircraftRpcOptions();
  }, []);

  const handleSaveEdit = (updatedInspection) =>
    normalizePostInspectionPayload(updatedInspection);

  const aircraftOptions = [
    ...new Set([
      ...aircraftRpcOptions.filter(Boolean),
      ...inspections.map((inspection) => inspection.rpc).filter(Boolean),
    ]),
  ];

  const statusOptions = [
    { label: "All Status", value: "all" },
    { label: "Pending", value: "pending" },
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
    await exportPostInspectionTemplatePdf(inspection);
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

      <ScrollView
        key={selectedAircraft || "aircraft-groups"}
        style={{ flex: 1, paddingHorizontal: 7 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingTop: 10, paddingBottom: 110, flexGrow: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchPostInspections(true)}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
        {!!selectedAircraft && (
          <TouchableOpacity
            style={{
              flexDirection: "row",
              alignItems: "center",
              minHeight: 48,
              marginBottom: 10,
            }}
            onPress={() => selectAircraft("")}
          >
            <MaterialCommunityIcons name="arrow-left" size={22} color={COLORS.primary} />
            <AppText style={{ marginLeft: 6, color: COLORS.primary, fontWeight: "700" }}>
              Back to aircraft
            </AppText>
          </TouchableOpacity>
        )}

        {!selectedAircraft ? (
          <AircraftLogGroups
            records={inspections}
            sortBy="latestActivity"
            loading={loading}
            query={aircraftQuery}
            onQueryChange={setAircraftQuery}
            onSelect={selectAircraft}
            emptyText="No post-flight inspections found yet."
          />
        ) : (
          <>
            <SectionTitle
              title={selectedAircraft}
              subtitle={`${aircraftInspections.length} post-flight inspections`}
            />
            <SearchBar
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search post-flight inspections"
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

            {loading ? (
              <LoadingState text="Loading post-flight inspections..." />
            ) : filteredInspections.length === 0 ? (
              <EmptyState text="No post-flight inspections match your filters." />
            ) : (
              <PostInspectionCards
                currentUser={user}
                inspections={filteredInspections}
                onEdit={handleEdit}
                onExport={canExportPostInspections ? handleExport : undefined}
                userRole={userRole}
              />
            )}
          </>
        )}
      </ScrollView>

      {/* Edit Entry Modal */}
      <PostInspectionEditEntry
        visible={showEditModal && !selectedInspection?.flightLogId}
        inspectionData={selectedInspection}
        rpcOptions={aircraftOptions}
        onClose={() => {
          setShowEditModal(false);
          setSelectedInspection(null);
        }}
        onSave={async (updatedInspection, options = { closeOnSave: true }) => {
          try {
            const response = await fetch(
              `${API_BASE}/api/post-flight/updatePostInspectionById/${updatedInspection._id}`,
              {
                method: "PUT",
                headers: await getAuthHeaders({
                  "x-action-confirmed": "true",
                }),
                body: JSON.stringify({
                  ...handleSaveEdit(updatedInspection),
                  confirmAction: true,
                }),
              },
            );

            const data = await response.json();

            if (!response.ok) {
              throw new Error(
                data.message || "Failed to update post-inspection",
              );
            }
            setInspections((prev) =>
              prev.map((inspection) =>
                inspection._id === data.data._id ? data.data : inspection,
              ),
            );
            const savedAircraft = getLogAircraftRegistration(data.data);
            if (savedAircraft !== selectedAircraft) {
              selectAircraft(savedAircraft);
            }
            if (options.closeOnSave) {
              setShowEditModal(false);
              setSelectedInspection(null);
              showToast("Post-inspection updated");
            } else {
              setSelectedInspection(data.data);
            }
          } catch (error) {
            console.error("Error updating post-inspection:", error);
            showToast(error.message || "Failed to update post-inspection");
            throw error;
          }
        }}
        userRole={userRole}
        readOnly
      />
      {!!selectedInspection?.flightLogId && showEditModal && <FlightWorkspace id={String(selectedInspection.flightLogId?._id || selectedInspection.flightLogId)} visible initialSection="post" onClose={() => { setShowEditModal(false); setSelectedInspection(null); }} onChanged={() => fetchPostInspections(true)} />}
    </View>
  );
}
