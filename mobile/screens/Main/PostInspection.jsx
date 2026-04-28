import React, { useState, useContext, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { COLORS } from "../../stylesheets/colors";
import { AuthContext } from "../../Context/AuthContext";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import PostInspectionCards from "../../components/PostInspection/PostInspectionCards";
import PostInspectionEditEntry from "../../components/PostInspection/PostInspectionEditEntry";
import { API_BASE } from "../../utilities/API_BASE";
import { exportPostInspectionPdf } from "../../utilities/pdfExport";
import { showToast } from "../../utilities/toast";
import { styles } from "../../stylesheets/styles";
const getDisplayStatus = (status) =>
  status === "completed"
    ? "completed"
    : status === "released"
      ? "released"
      : "pending";

export default function PostInspection({ route }) {
  const { user } = useContext(AuthContext);
  const targetPostInspectionId = route?.params?.targetPostInspectionId;
  const targetNotificationStatus = route?.params?.notificationStatus;
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAircraft, setSelectedAircraft] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [showAircraftDropdown, setShowAircraftDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedInspection, setSelectedInspection] = useState(null);
  const [inspections, setInspections] = useState([]);
  const [aircraftRpcOptions, setAircraftRpcOptions] = useState([]);

  const userRole = user?.jobTitle?.toLowerCase() || "pilot";
  const isOfficerInCharge = userRole === "officer-in-charge";

  useEffect(() => {
    const fetchPostInspections = async () => {
      try {
        const token = await AsyncStorage.getItem("currentUserToken");
        const response = await fetch(
          `${API_BASE}/api/post-inspections/getAllPostInspection`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
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
      }
    };

    fetchPostInspections();
  }, []);

  useEffect(() => {
    if (targetNotificationStatus) {
      setSelectedStatus(targetNotificationStatus);
    }
  }, [targetNotificationStatus]);

  useEffect(() => {
    if (!targetPostInspectionId || inspections.length === 0) {
      return;
    }

    const match = inspections.find(
      (inspection) => String(inspection._id) === String(targetPostInspectionId),
    );

    if (match) {
      setSelectedInspection(match);
      setShowEditModal(true);
    }
  }, [targetPostInspectionId, inspections]);

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
    { label: "All", value: "all" },
    { label: "Pending Release", value: "pending" },
    { label: "Released", value: "released" },
    { label: "Completed", value: "completed" },
  ];

  const filteredInspections = inspections.filter((inspection) => {
    const matchesSearch =
      searchQuery === "" ||
      inspection.rpc?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inspection.aircraftType
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      inspection.date?.includes(searchQuery);

    const matchesAircraft =
      selectedAircraft === "" ||
      selectedAircraft === "all" ||
      inspection.rpc === selectedAircraft;

    const matchesStatus =
      selectedStatus === "all" ||
      getDisplayStatus(inspection.status) === selectedStatus;

    return matchesSearch && matchesAircraft && matchesStatus;
  });

  const handleEdit = (inspection) => {
    setSelectedInspection(inspection);
    setShowEditModal(true);
  };

  const handleExport = async (inspection) => {
    await exportPostInspectionPdf(inspection);
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
        {/* Search Bar Row */}
        <View style={[styles.unifiedControlRow, { marginTop: 10 }]}>
          <View style={styles.unifiedSearchBox}>
            <MaterialCommunityIcons
              name="magnify"
              size={22}
              color={COLORS.grayDark}
            />
            <TextInput
              placeholder="Search aircraft"
              placeholderTextColor={COLORS.grayDark}
              style={styles.unifiedSearchInput}
              value={searchQuery}
              onChangeText={handleSearchChange}
            />
          </View>
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
              <Text
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
              </Text>
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
                      <Text style={styles.unifiedDropdownItemText}>
                        {aircraft === "all"
                          ? "All Aircraft"
                          : `RP/C: ${aircraft}`}
                      </Text>
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
              <Text style={styles.unifiedFilterButtonText}>
                {statusOptions.find((option) => option.value === selectedStatus)
                  ?.label || "Status"}
              </Text>
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
                    <Text style={styles.unifiedDropdownItemText}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Post-Inspection Cards */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
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
              <Text
                style={{
                  marginTop: 10,
                  fontSize: 16,
                  color: COLORS.grayDark,
                  textAlign: "center",
                }}
              >
                No post-inspections found
              </Text>
            </View>
          ) : (
            <PostInspectionCards
              inspections={filteredInspections}
              onEdit={handleEdit}
              onExport={handleExport}
              userRole={userRole}
            />
          )}
        </ScrollView>
      </View>

      {/* Edit Entry Modal */}
      <PostInspectionEditEntry
        visible={showEditModal}
        inspectionData={selectedInspection}
        rpcOptions={aircraftOptions.filter((rpc) => rpc !== "all")}
        onClose={() => {
          setShowEditModal(false);
          setSelectedInspection(null);
        }}
        onSave={async (updatedInspection) => {
          try {
            const token = await AsyncStorage.getItem("currentUserToken");
            const response = await fetch(
              `${API_BASE}/api/post-inspections/updatePostInspectionById/${updatedInspection._id}`,
              {
                method: "PUT",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(handleSaveEdit(updatedInspection)),
              },
            );

            if (!response.ok) {
              throw new Error("Failed to update post-inspection");
            }

            const data = await response.json();
            setInspections((prev) =>
              prev.map((inspection) =>
                inspection._id === data.data._id ? data.data : inspection,
              ),
            );
            setShowEditModal(false);
            setSelectedInspection(null);
            showToast("Post-inspection updated successfully");
          } catch (error) {
            console.error("Error updating post-inspection:", error);
            showToast("Failed to update post-inspection");
            throw error;
          }
        }}
        userRole={userRole}
        readOnly={isOfficerInCharge}
      />
    </View>
  );
}
