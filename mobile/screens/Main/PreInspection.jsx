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
import PreInspectionCards from "../../components/PreInspection/PreInspectionCards";
import PreInspectionEntry from "../../components/PreInspection/PreInspectionEntry";
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

import { matchesSearch } from "../../utilities/search";
import { canExportModule } from "../../../shared/exportAccess";
import { resolveUserRole } from "../../../shared/navigationAccess";
import { getLogAircraftRegistration } from "../../../shared/aircraftLogGroups";
import {
  createEmptyB412PreInspectionData,
  isB412Aircraft,
} from "../../components/PreInspection/b412PreInspectionData";

const getDisplayStatus = (status) => {
  const normalizedStatus = String(status || "").trim().toLowerCase();

  return normalizedStatus === "completed"
    ? "completed"
    : normalizedStatus === "released"
      ? "released"
      : "pending";
};

const isCompletedInspection = (inspection) =>
  String(inspection?.status || "").toLowerCase() === "completed";

const normalizePreInspectionPayload = (inspection = {}) => {
  if (isB412Aircraft(inspection.aircraftType)) {
    return {
      ...inspection,
      b412Data: createEmptyB412PreInspectionData(inspection.b412Data),
    };
  }

  const { b412Data, ...legacyInspection } = inspection;
  return legacyInspection;
};

const readJsonResponse = async (response) => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

export default function PreInspection({ route }) {
  const { user } = useContext(AuthContext);
  const targetPreInspectionId = route?.params?.targetPreInspectionId;
  const targetNotificationStatus = route?.params?.notificationStatus;
  const notificationRefreshAt = route?.params?.refreshAt;
  const handledNotificationTarget = useRef(null);
  const [aircraftQuery, setAircraftQuery] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAircraft, setSelectedAircraft] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showNewEntryModal, setShowNewEntryModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedInspection, setSelectedInspection] = useState(null);
  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [aircraftRpcOptions, setAircraftRpcOptions] = useState([]);

  const userRole = resolveUserRole(user, "pilot");
  const isOfficerInCharge = userRole === "officer-in-charge";
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

  const handleSaveNewEntry = (newEntry) => {
    const createdBy =
      `${user?.firstName || ""} ${user?.lastName || ""}`.trim() ||
      newEntry.createdBy;

    return normalizePreInspectionPayload({ ...newEntry, createdBy });
  };

  const handleSaveEdit = (updatedInspection) =>
    normalizePreInspectionPayload(updatedInspection);

  const aircraftOptions = [
    ...new Set([
      ...aircraftRpcOptions.filter(Boolean),
      ...inspections.map((inspection) => inspection.rpc).filter(Boolean),
    ]),
  ];

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

      <ScrollView
        key={selectedAircraft || "aircraft-groups"}
        style={{ flex: 1, paddingHorizontal: 7 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingTop: 10, paddingBottom: 110, flexGrow: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchPreInspections(true)}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
        {!!(selectedAircraft || userRole === "mechanic") && (
          <View
            style={[
              styles.unifiedControlRow,
              { justifyContent: selectedAircraft ? "space-between" : "flex-end" },
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
            {userRole === "mechanic" && (
              <TouchableOpacity
                style={styles.unifiedActionButton}
                onPress={() => setShowNewEntryModal(true)}
              >
                <MaterialCommunityIcons name="plus" size={20} color={COLORS.white} />
                <AppText style={styles.unifiedActionButtonText}>New Entry</AppText>
              </TouchableOpacity>
            )}
          </View>
        )}

        {!selectedAircraft ? (
          <AircraftLogGroups
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

            {loading ? (
              <LoadingState text="Loading pre-flight inspections..." />
            ) : filteredInspections.length === 0 ? (
              <EmptyState text="No pre-flight inspections match your filters." />
            ) : (
              <PreInspectionCards
                currentUser={user}
                inspections={filteredInspections}
                onEdit={handleEdit}
                onExport={canExportPreInspections ? handleExport : undefined}
                userRole={userRole}
              />
            )}
          </>
        )}
      </ScrollView>

      {/* New Entry Modal - for creating only */}
      <PreInspectionEntry
        visible={showNewEntryModal}
        lockedRpc={selectedAircraft === "Unassigned aircraft" ? "" : selectedAircraft}
        onClose={() => setShowNewEntryModal(false)}
        rpcOptions={aircraftOptions}
        onSave={async (newEntry) => {
          try {
            if (!newEntry.flightLogId) throw Error("Choose a linked Flight Log first.");
            const flightId = newEntry.flightLogId;
            const headers = await getAuthHeaders({ "Content-Type": "application/json", "x-action-confirmed": "true" });
            const request = async (path, body, method = "PUT") => {
              const response = await fetch(`${API_BASE}/api/flightlogs/${path}`, { method: body ? method : "GET", headers, ...(body ? { body: JSON.stringify({ ...body, confirmAction: true }) } : {}) });
              const result = await response.json();
              if (!response.ok) throw Error(result.message || "Could not save inspection");
              return result.data;
            };
            const workspace = await request(`${flightId}/workspace`);
            const pair = await request(`${flightId}/inspections`, { changes: handleSaveNewEntry(newEntry), expectedVersion: workspace.flightLog.__v || 0 }, "POST");
            setShowNewEntryModal(false);
            setSelectedInspection({ ...pair.pre, flightLogId: flightId });
            setShowEditModal(true);
            selectAircraft(getLogAircraftRegistration(pair.pre));
            await fetchPreInspections();
            showToast("Pre-inspection created successfully");
          } catch (error) {
            console.error("Error creating pre-flight inspection:", error);
            throw error;
          }
        }}
        userRole={userRole}
        readOnly={isOfficerInCharge}
      />

      {/* Edit Entry Modal - for editing with role buttons */}
      <PreInspectionEditEntry
        visible={showEditModal && !selectedInspection?.flightLogId}
        inspectionData={selectedInspection}
        rpcOptions={aircraftOptions}
        onClose={() => {
          setShowEditModal(false);
          setSelectedInspection(null);
        }}
        onSave={async (updatedInspection) => {
          try {
            if (isCompletedInspection(selectedInspection)) {
              showToast("Completed pre-flight inspections are view-only.");
              setShowEditModal(false);
              setSelectedInspection(null);
              return;
            }

            const response = await fetch(
              `${API_BASE}/api/pre-flight/updatePreInspectionById/${updatedInspection._id}`,
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

            const data = await readJsonResponse(response);
            if (!response.ok) {
              throw new Error(
                data?.message || "Failed to update pre-flight inspection",
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
            setShowEditModal(false);
            setSelectedInspection(null);
            showToast("Pre-inspection updated successfully");
          } catch (error) {
            console.error("Error updating pre-flight inspection:", error);
            throw error;
          }
        }}
        userRole={userRole}
        readOnly
      />
      {!!selectedInspection?.flightLogId && showEditModal && <FlightWorkspace id={String(selectedInspection.flightLogId?._id || selectedInspection.flightLogId)} visible initialSection="pre" onClose={() => { setShowEditModal(false); setSelectedInspection(null); }} onChanged={() => fetchPreInspections(true)} />}
    </View>
  );
}
