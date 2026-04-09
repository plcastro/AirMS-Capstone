import React, { useState, useContext } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
} from "react-native";
import { COLORS } from "../../stylesheets/colors";
import { AuthContext } from "../../Context/AuthContext";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import PostInspectionCards from "../../components/PostInspection/PostInspectionCards";
import PostInspectionEntry from "../../components/PostInspection/PostInspectionEntry";
import PostInspectionEditEntry from "../../components/PostInspection/PostInspectionEditEntry";

// Mock data for demonstration
const MOCK_INSPECTIONS = [
  {
    _id: "1",
    rpc: "7247",
    aircraftType: "AS350B3E",
    date: "02/24/2026",
    dateAdded: "02/24/2026",
    status: "pending",
  },
  {
    _id: "2",
    rpc: "7248",
    aircraftType: "AS350B3",
    date: "02/23/2026",
    dateAdded: "02/23/2026",
    status: "released",
  },
  {
    _id: "3",
    rpc: "7249",
    aircraftType: "R44",
    date: "02/22/2026",
    dateAdded: "02/22/2026",
    status: "accepted",
  },
];

export default function PostInspection() {
  const { user } = useContext(AuthContext);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAircraft, setSelectedAircraft] = useState("");
  const [showAircraftDropdown, setShowAircraftDropdown] = useState(false);
  const [showNewEntryModal, setShowNewEntryModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedInspection, setSelectedInspection] = useState(null);
  const [inspections, setInspections] = useState(MOCK_INSPECTIONS);

  const userRole = user?.jobTitle?.toLowerCase() || "pilot";

  const handleSaveNewEntry = (newEntry) => {
    const newInspection = {
      ...newEntry,
      _id: Date.now().toString(),
      dateAdded: new Date().toLocaleDateString("en-US"),
      status: "pending",
    };
    setInspections([newInspection, ...inspections]);
    setShowNewEntryModal(false);
    Alert.alert("Success", "Post-inspection created successfully");
  };

  const handleSaveEdit = (updatedInspection) => {
    setInspections(
      inspections.map((inspection) =>
        inspection._id === updatedInspection._id ? updatedInspection : inspection
      )
    );
    setShowEditModal(false);
    setSelectedInspection(null);
    Alert.alert("Success", "Post-inspection updated successfully");
  };

  const handleSearchChange = (text) => {
    setSearchQuery(text);
  };

  const aircraftOptions = [
    "all",
    ...new Set(inspections.map((inspection) => inspection.rpc).filter(Boolean)),
  ];

  const filteredInspections = inspections.filter((inspection) => {
    const matchesSearch =
      searchQuery === "" ||
      inspection.rpc?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inspection.aircraftType?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inspection.date?.includes(searchQuery);

    const matchesAircraft =
      selectedAircraft === "" ||
      selectedAircraft === "all" ||
      inspection.rpc === selectedAircraft;

    return matchesSearch && matchesAircraft;
  });

  const handleEdit = (inspection) => {
    setSelectedInspection(inspection);
    setShowEditModal(true);
  };

  const handleExport = (inspection) => {
    Alert.alert("Export", `Exporting inspection for ${inspection.rpc}`);
  };

  const selectAircraft = (aircraft) => {
    setSelectedAircraft(aircraft);
    setShowAircraftDropdown(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.grayLight }}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.grayLight} />

      <View style={{ flex: 1, paddingHorizontal: 7 }}>
        {/* Search Bar Row with New Entry Button */}
        <View style={{ flexDirection: "row", marginBottom: 12, gap: 12, marginTop: 8 }}>
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
              placeholder="Q Search aircraft"
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

          <TouchableOpacity
            style={{
              backgroundColor: COLORS.primaryLight,
              borderRadius: 10,
              height: 48,
              paddingHorizontal: 16,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
            }}
            onPress={() => setShowNewEntryModal(true)}
          >
            <MaterialCommunityIcons name="plus" size={20} color={COLORS.white} />
            <Text
              style={{
                color: COLORS.white,
                fontSize: 15,
                fontWeight: "600",
                marginLeft: 6,
              }}
            >
              New Entry
            </Text>
          </TouchableOpacity>
        </View>

        {/* Aircraft Filter */}
        <View style={{ marginBottom: 20 }}>
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
            onPress={() => setShowAircraftDropdown(!showAircraftDropdown)}
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
                <Text style={{ color: COLORS.white, fontWeight: "600" }}>
                  Create New Entry
                </Text>
              </TouchableOpacity>
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

      {/* New Entry Modal */}
      <PostInspectionEntry
        visible={showNewEntryModal}
        onClose={() => setShowNewEntryModal(false)}
        onSave={handleSaveNewEntry}
        userRole={userRole}
      />

      {/* Edit Entry Modal */}
      <PostInspectionEditEntry
        visible={showEditModal}
        inspectionData={selectedInspection}
        onClose={() => {
          setShowEditModal(false);
          setSelectedInspection(null);
        }}
        onSave={handleSaveEdit}
        userRole={userRole}
      />
    </View>
  );
}