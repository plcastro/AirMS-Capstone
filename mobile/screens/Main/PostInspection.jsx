import React, {
  useState,
  useContext,
  useEffect,
  useCallback,
  useRef,
} from "react";
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
import {
  EmptyState,
  LoadingState,
  SearchBar,
} from "../../components/common/MobileModule";
import InlineDropdown from "../../components/common/InlineDropdown";
import AircraftLogGroups from "../../components/common/AircraftLogGroups";
import useViewedLogs from "../../utilities/useViewedLogs";
import usePersistedValue from "../../utilities/usePersistedValue";

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
  const normalizedStatus = String(status || "")
    .trim()
    .toLowerCase();

  return normalizedStatus === "completed"
    ? "completed"
    : normalizedStatus === "released"
      ? "released"
      : "pending";
};

export default function PostInspection({ route }) {
  const { user } = useContext(AuthContext);
  const { isNew, markViewed } = useViewedLogs(user, "post");
  const targetPostInspectionId = route?.params?.targetPostInspectionId;
  const targetNotificationStatus = route?.params?.notificationStatus;
  const notificationRefreshAt = route?.params?.refreshAt;
  const handledNotificationTarget = useRef(null);
  const [aircraftQuery, setAircraftQuery] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAircraft, setSelectedAircraft] = useState("");
  // One status filter for the aircraft list and each aircraft's inspections,
  // remembered per user.
  const [selectedStatus, setSelectedStatus] = usePersistedValue(
    `status-filter:post:${user?.id}`,
    "pending",
  );
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
  const [aircraftRpcOptions, setAircraftRpcOptions] = useState([]);

  const userRole = resolveUserRole(user, "pilot");
  const isOfficerInCharge = userRole === "officer-in-charge";
  const canExportPostInspections = canExportModule(userRole, "postInspection");

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
      setSelectedStatus(getDisplayStatus(match.status));
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
    { label: "All status", value: "all" },
    { label: "Pending", value: "pending" },
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
    await exportPostInspectionTemplatePdf(inspection);
  };

  const selectAircraft = (aircraft) => {
    setSelectedAircraft(aircraft);
    setSearchQuery("");
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

      <View
        key={selectedAircraft || "aircraft-groups"}
        style={{ flex: 1, paddingHorizontal: 7, paddingTop: 10 }}
      >
        {!selectedAircraft ? (
          <AircraftLogGroups
            isNew={isNew}
            refreshing={refreshing}
            onRefresh={() => fetchPostInspections(true)}
            searchFilters={
              <View
                style={{
                  marginBottom: 10,
                  zIndex: showStatusDropdown ? 20 : 1,
                }}
              >
                <InlineDropdown
                  value={selectedStatus}
                  placeholder="Status"
                  open={showStatusDropdown}
                  menuPosition="relative"
                  onToggle={() => setShowStatusDropdown((open) => !open)}
                  onChange={selectStatus}
                  options={statusOptions}
                  toggleStyle={{
                    backgroundColor: COLORS.white,
                    borderColor: COLORS.grayMedium,
                  }}
                />
              </View>
            }
            records={
              selectedStatus === "all"
                ? inspections
                : inspections.filter(
                    (inspection) =>
                      getDisplayStatus(inspection.status) === selectedStatus,
                  )
            }
            sortBy="latestActivity"
            loading={loading}
            query={aircraftQuery}
            onQueryChange={setAircraftQuery}
            onSelect={selectAircraft}
            emptyText={
              selectedStatus === "all"
                ? "No post-flight inspections found yet."
                : `No ${selectedStatus} post-flight inspections found yet.`
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
                  {aircraftInspections.length} post-flight inspections
                </AppText>
              </View>
            </View>
            <SearchBar
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search post-flight inspections"
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

            <PostInspectionCards
              ListEmptyComponent={
                loading ? (
                  <LoadingState text="Loading post-flight inspections..." />
                ) : (
                  <EmptyState text="No post-flight inspections match your filters." />
                )
              }
              refreshing={refreshing}
              onRefresh={() => fetchPostInspections(true)}
              currentUser={user}
              inspections={loading ? [] : filteredInspections}
              isNew={isNew}
              onEdit={handleEdit}
              onExport={canExportPostInspections ? handleExport : undefined}
              userRole={userRole}
            />
          </>
        )}
      </View>

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
      {!!selectedInspection?.flightLogId && showEditModal && (
        <FlightWorkspace
          id={String(
            selectedInspection.flightLogId?._id ||
              selectedInspection.flightLogId,
          )}
          visible
          initialSection="post" inspectionMode
          onViewed={({ postInspections }) => markViewed(postInspections?.find(record => String(record._id) === String(selectedInspection._id)))}
          onClose={() => {
            setShowEditModal(false);
            setSelectedInspection(null);
          }}
          onChanged={() => fetchPostInspections(true)}
        />
      )}
    </View>
  );
}
