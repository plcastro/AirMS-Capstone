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
        Alert.alert("Error", "Failed to fetch post-inspections");
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
        const response = await fetch(`${API_BASE}/api/parts-monitoring/aircraft-list`);
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
        <View
          style={{
            flexDirection: "row",
            marginBottom: 12,
            gap: 12,
            marginTop: 8,
          }}
        >
          <View
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: COLORS.white,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: COLORS.grayMedium,
              height: 48,
              paddingHorizontal: 12,
            }}
          >
            <MaterialCommunityIcons
              name="magnify"
              size={22}
              color={COLORS.grayDark}
            />
            <TextInput
              placeholder="Search aircraft"
              placeholderTextColor={COLORS.grayDark}
              style={{
                flex: 1,
                marginLeft: 10,
                fontSize: 16,
                color: COLORS.black,
                padding: 0,
              }}
              value={searchQuery}
              onChangeText={handleSearchChange}
            />
          </View>
        </View>

        {/* Filters */}
        <View style={{ flexDirection: "row", gap: 12, marginBottom: 20 }}>
          <View style={{ flex: 1 }}>
            <TouchableOpacity
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                backgroundColor: COLORS.white,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: COLORS.grayMedium,
                height: 48,
                paddingHorizontal: 12,
              }}
              onPress={() => {
                setShowAircraftDropdown(!showAircraftDropdown);
                setShowStatusDropdown(false);
              }}
            >
              <Text
                style={{
                  fontSize: 15,
                  color:
                    selectedAircraft && selectedAircraft !== "all"
                      ? COLORS.black
                      : COLORS.grayDark,
                }}
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
              <View
                style={{
                  position: "absolute",
                  top: 52,
                  left: 0,
                  right: 0,
                  backgroundColor: COLORS.white,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: COLORS.grayMedium,
                  zIndex: 1000,
                  elevation: 5,
                  maxHeight: 300,
                }}
              >
                <ScrollView>
                  {aircraftOptions.map((aircraft, index) => (
                    <TouchableOpacity
                      key={index}
                      style={{
                        paddingVertical: 14,
                        paddingHorizontal: 16,
                        borderBottomWidth:
                          index < aircraftOptions.length - 1 ? 1 : 0,
                        borderBottomColor: COLORS.grayMedium,
                      }}
                      onPress={() => selectAircraft(aircraft)}
                    >
                      <Text style={{ fontSize: 15 }}>
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
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                backgroundColor: COLORS.white,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: COLORS.grayMedium,
                height: 48,
                paddingHorizontal: 12,
              }}
              onPress={() => {
                setShowStatusDropdown(!showStatusDropdown);
                setShowAircraftDropdown(false);
              }}
            >
              <Text style={{ fontSize: 15, color: COLORS.black }}>
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
              <View
                style={{
                  position: "absolute",
                  top: 52,
                  left: 0,
                  right: 0,
                  backgroundColor: COLORS.white,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: COLORS.grayMedium,
                  zIndex: 1000,
                  elevation: 5,
                }}
              >
                {statusOptions.map((option, index) => (
                  <TouchableOpacity
                    key={option.value}
                    style={{
                      paddingVertical: 14,
                      paddingHorizontal: 16,
                      borderBottomWidth:
                        index < statusOptions.length - 1 ? 1 : 0,
                      borderBottomColor: COLORS.grayMedium,
                    }}
                    onPress={() => selectStatus(option.value)}
                  >
                    <Text style={{ fontSize: 15 }}>{option.label}</Text>
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
            Alert.alert("Success", "Post-inspection updated successfully");
          } catch (error) {
            console.error("Error updating post-inspection:", error);
            Alert.alert("Error", "Failed to update post-inspection");
            throw error;
          }
        }}
        userRole={userRole}
      />
    </View>
  );
}
