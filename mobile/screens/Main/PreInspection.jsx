import React, { useState, useContext, useEffect } from "react";
import AppText from "../../components/common/AppText";
import {
  View,
  ScrollView,
  TouchableOpacity,
  StatusBar
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { COLORS } from "../../stylesheets/colors";
import { AuthContext } from "../../Context/AuthContext";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import PreInspectionCards from "../../components/PreInspection/PreInspectionCards";
import PreInspectionEntry from "../../components/PreInspection/PreInspectionEntry";
import PreInspectionEditEntry from "../../components/PreInspection/PreInspectionEditEntry";
import { API_BASE } from "../../utilities/API_BASE";
import { exportPreInspectionTemplatePdf } from "../../utilities/documentExport";
import { showToast } from "../../utilities/toast";
import { styles } from "../../stylesheets/styles";
import { SearchBar } from "../../components/common/MobileModule";
import { matchesSearch } from "../../utilities/search";
import { canExportModule } from "../../../shared/exportAccess";

const getDisplayStatus = (status) =>
  status === "completed"
    ? "completed"
    : status === "released"
      ? "released"
      : "pending";

const isCompletedInspection = (inspection) =>
  String(inspection?.status || "").toLowerCase() === "completed";

export default function PreInspection({ route }) {
  const { user } = useContext(AuthContext);
  const targetPreInspectionId = route?.params?.targetPreInspectionId;
  const targetNotificationStatus = route?.params?.notificationStatus;
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAircraft, setSelectedAircraft] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [showAircraftDropdown, setShowAircraftDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showNewEntryModal, setShowNewEntryModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedInspection, setSelectedInspection] = useState(null);
  const [inspections, setInspections] = useState([]);
  const [aircraftRpcOptions, setAircraftRpcOptions] = useState([]);

  const userRole = user?.jobTitle?.toLowerCase() || "pilot";
  const isOfficerInCharge = userRole === "officer-in-charge";
  const canExportPreInspections = canExportModule(
    userRole,
    "preInspection",
  );

  useEffect(() => {
    const fetchPreInspections = async () => {
      try {
        const token = await AsyncStorage.getItem("currentUserToken");
        const response = await fetch(
          `${API_BASE}/api/pre-inspections/getAllPreInspection`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (!response.ok) {
          throw new Error("Failed to fetch pre-inspections");
        }

        const data = await response.json();
        setInspections(data.data || []);
      } catch (error) {
        console.error("Error fetching pre-inspections:", error);
        showToast("Failed to fetch pre-inspections");
      }
    };

    fetchPreInspections();
  }, []);

  useEffect(() => {
    if (targetNotificationStatus) {
      setSelectedStatus(targetNotificationStatus);
    }
  }, [targetNotificationStatus]);

  useEffect(() => {
    if (!targetPreInspectionId || inspections.length === 0) {
      return;
    }

    const match = inspections.find(
      (inspection) => String(inspection._id) === String(targetPreInspectionId),
    );

    if (match) {
      setSelectedInspection(match);
      setShowEditModal(true);
    }
  }, [targetPreInspectionId, inspections]);

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
    return newEntry;
  };

  const handleSaveEdit = (updatedInspection) => updatedInspection;

  const handleSearchChange = (text) => {
    setSearchQuery(text);
  };

  const aircraftOptions = [
    "all",
    ...new Set([
      ...aircraftRpcOptions.filter(Boolean),
      ...inspections.map((inspection) => inspection.rpc).filter(Boolean),
    ]),
  ];

  const statusOptions = [
    { label: "All Status", value: "all" },
    { label: "Pending Release", value: "pending" },
    { label: "Released", value: "released" },
    { label: "Completed", value: "completed" },
  ];

  const filteredInspections = inspections.filter((inspection) => {
    const matchesSearchText = matchesSearch(searchQuery, inspection);

    const matchesAircraft =
      selectedAircraft === "" ||
      selectedAircraft === "all" ||
      inspection.rpc === selectedAircraft;

    const matchesStatus =
      selectedStatus === "all" ||
      getDisplayStatus(inspection.status) === selectedStatus;

    return matchesSearchText && matchesAircraft && matchesStatus;
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
    setShowAircraftDropdown(false);
  };

  const selectStatus = (status) => {
    setSelectedStatus(status);
    setShowStatusDropdown(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.grayLight }}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.grayLight} />

      <View style={{ flex: 1, paddingHorizontal: 7 }}>
        {/* Search Bar Row with New Entry Button */}
        <View style={[styles.unifiedControlRow, { marginTop: 10 }]}>
          <SearchBar
            value={searchQuery}
            onChangeText={handleSearchChange}
            placeholder="Search aircraft"
            containerStyle={{ flex: 1, height: 48, marginBottom: 0 }}
          />

          {/* Only show New Entry button for non-pilot roles */}
          {userRole !== "pilot" && !isOfficerInCharge && (
            <TouchableOpacity
              style={styles.unifiedActionButton}
              onPress={() => setShowNewEntryModal(true)}
            >
              <MaterialCommunityIcons
                name="plus"
                size={20}
                color={COLORS.white}
              />
              <AppText style={styles.unifiedActionButtonText}>New Entry</AppText>
            </TouchableOpacity>
          )}
        </View>

        {/* Filters */}
        <View style={{ flexDirection: "row", gap: 12, marginBottom: 20 }}>
          <View style={{ flex: 1 }}>
            <TouchableOpacity
              style={styles.unifiedFilterButton}
              onPress={() => {
                setShowAircraftDropdown(!showAircraftDropdown);
                setShowStatusDropdown(false);
              }}
            >
              <AppText
                style={[
                  styles.unifiedFilterButtonText,
                  {
                    color:
                      selectedAircraft && selectedAircraft !== "all"
                        ? COLORS.black
                        : COLORS.grayDark,
                  },
                ]}
              >
                {selectedAircraft && selectedAircraft !== "all"
                  ? `RP/C: ${selectedAircraft}`
                  : "Choose Aircraft"}
              </AppText>
              <MaterialCommunityIcons
                name={showAircraftDropdown ? "chevron-up" : "chevron-down"}
                size={22}
                color={COLORS.grayDark}
              />
            </TouchableOpacity>

            {showAircraftDropdown && (
              <View style={[styles.unifiedDropdownMenu, { maxHeight: 300 }]}>
                <ScrollView>
                  {aircraftOptions.map((aircraft, index) => (
                    <TouchableOpacity
                      key={index}
                      style={{
                        ...styles.unifiedDropdownItem,
                        borderBottomWidth:
                          index < aircraftOptions.length - 1 ? 1 : 0,
                        borderBottomColor: COLORS.grayMedium,
                      }}
                      onPress={() => selectAircraft(aircraft)}
                    >
                      <AppText style={styles.unifiedDropdownItemText}>
                        {aircraft === "all"
                          ? "All Aircraft"
                          : `RP/C: ${aircraft}`}
                      </AppText>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          <View style={{ flex: 1 }}>
            <TouchableOpacity
              style={styles.unifiedFilterButton}
              onPress={() => {
                setShowStatusDropdown(!showStatusDropdown);
                setShowAircraftDropdown(false);
              }}
            >
              <AppText style={styles.unifiedFilterButtonText}>
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
                      borderBottomWidth:
                        index < statusOptions.length - 1 ? 1 : 0,
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
        </View>

        {/* Pre-Inspection Cards */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 110 }}
        >
          {filteredInspections.length === 0 ? (
            <View
              style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
                paddingTop: 50,
              }}
            >
              <MaterialCommunityIcons
                name="clipboard-list-outline"
                size={60}
                color={COLORS.grayMedium}
              />
              <AppText
                style={{
                  marginTop: 10,
                  fontSize: 12,
                  color: COLORS.grayDark,
                  textAlign: "center",
                }}
              >
                No pre-inspections found
              </AppText>
              {/* Only show Create New Entry button for non-pilot roles */}
              {userRole !== "pilot" && !isOfficerInCharge && (
                <TouchableOpacity
                  onPress={() => setShowNewEntryModal(true)}
                  style={{
                    marginTop: 20,
                    backgroundColor: COLORS.primaryLight,
                    paddingHorizontal: 20,
                    paddingVertical: 10,
                    borderRadius: 8,
                  }}
                >
                  <AppText style={{ color: COLORS.white, fontWeight: "600" }}>
                    Create New Entry
                  </AppText>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <PreInspectionCards
              inspections={filteredInspections}
              onEdit={handleEdit}
              onExport={canExportPreInspections ? handleExport : undefined}
              userRole={userRole}
            />
          )}
        </ScrollView>
      </View>

      {/* New Entry Modal - for creating only */}
      <PreInspectionEntry
        visible={showNewEntryModal}
        onClose={() => setShowNewEntryModal(false)}
        rpcOptions={aircraftOptions.filter((rpc) => rpc !== "all")}
        onSave={async (newEntry) => {
          try {
            const token = await AsyncStorage.getItem("currentUserToken");
            const response = await fetch(
              `${API_BASE}/api/pre-inspections/createPreInspection`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "x-action-confirmed": "true",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                  ...handleSaveNewEntry(newEntry),
                  confirmAction: true,
                }),
              },
            );

            if (!response.ok) {
              throw new Error("Failed to create pre-inspection");
            }

            const data = await response.json();
            setInspections((prev) => [data.data, ...prev]);
            setShowNewEntryModal(false);
            showToast("Pre-inspection created successfully");
          } catch (error) {
            console.error("Error creating pre-inspection:", error);
            showToast("Failed to create pre-inspection");
            throw error;
          }
        }}
        userRole={userRole}
        readOnly={isOfficerInCharge}
      />

      {/* Edit Entry Modal - for editing with role buttons */}
      <PreInspectionEditEntry
        visible={showEditModal}
        inspectionData={selectedInspection}
        rpcOptions={aircraftOptions.filter((rpc) => rpc !== "all")}
        onClose={() => {
          setShowEditModal(false);
          setSelectedInspection(null);
        }}
        onSave={async (updatedInspection) => {
          try {
            if (isCompletedInspection(selectedInspection)) {
              showToast("Completed pre-inspections are view-only.");
              setShowEditModal(false);
              setSelectedInspection(null);
              return;
            }

            const token = await AsyncStorage.getItem("currentUserToken");
            const response = await fetch(
              `${API_BASE}/api/pre-inspections/updatePreInspectionById/${updatedInspection._id}`,
              {
                method: "PUT",
                headers: {
                  "Content-Type": "application/json",
                  "x-action-confirmed": "true",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                  ...handleSaveEdit(updatedInspection),
                  confirmAction: true,
                }),
              },
            );

            if (!response.ok) {
              throw new Error("Failed to update pre-inspection");
            }

            const data = await response.json();
            setInspections((prev) =>
              prev.map((inspection) =>
                inspection._id === data.data._id ? data.data : inspection,
              ),
            );
            setShowEditModal(false);
            setSelectedInspection(null);
            showToast("Pre-inspection updated successfully");
          } catch (error) {
            console.error("Error updating pre-inspection:", error);
            showToast("Failed to update pre-inspection");
            throw error;
          }
        }}
        userRole={userRole}
        readOnly={isCompletedInspection(selectedInspection)}
      />
    </View>
  );
}
