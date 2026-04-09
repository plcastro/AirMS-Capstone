import React, { useState, useContext, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from "react-native";
import { COLORS } from "../../stylesheets/colors";
import { AuthContext } from "../../Context/AuthContext";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import FlightLogCards from "../../components/FlightLog/FlightLogCards";
import FlightLogEntry from "../../components/FlightLog/FlightLogEntry";
import FlightLogEditEntry from "../../components/FlightLog/FlightLogEditEntry";
import { API_BASE } from "../../utilities/API_BASE";

export default function FlightLog() {
  const { user } = useContext(AuthContext);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAircraft, setSelectedAircraft] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [showAircraftDropdown, setShowAircraftDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showNewEntryModal, setShowNewEntryModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [flightLogs, setFlightLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const userRole = user?.jobTitle?.toLowerCase() || "pilot";

  /// FETCH ALL FLIGHT LOGS (NO AUTH)
  const fetchFlightLogs = async () => {
    try {
      setLoading(true);

      // Build query parameters
      const params = new URLSearchParams();
      params.append("page", "1");
      params.append("limit", "100");

      if (selectedAircraft && selectedAircraft !== "all") {
        params.append("aircraftRPC", selectedAircraft);
      }
      if (selectedStatus && selectedStatus !== "all") {
        params.append("status", selectedStatus);
      }

      console.log(
        "Fetching from:",
        `${API_BASE}/api/flightlogs?${params.toString()}`,
      );

      const response = await fetch(
        `${API_BASE}/api/flightlogs?${params.toString()}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      // Read response ONLY ONCE - use json() directly
      const data = await response.json();
      // console.log("Raw Server Response:", JSON.stringify(data));

      if (response.ok) {
        setFlightLogs(data.data || []);
      } else {
        console.error("Error fetching logs:", data.message);
        Alert.alert("Error", data.message || "Failed to fetch flight logs");
      }
    } catch (error) {
      console.error("Fetch error:", error);
      Alert.alert(
        "Error",
        "Failed to connect to server. Please check your network.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // SEARCH FLIGHT LOGS
  const searchFlightLogs = async (query) => {
    if (!query.trim()) {
      fetchFlightLogs();
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `${API_BASE}/api/flightlogs/search?q=${encodeURIComponent(query)}&limit=100`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      // Read ONLY ONCE
      const data = await response.json();

      if (response.ok) {
        setFlightLogs(data.data || []);
      } else {
        console.error("Search error:", data.message);
      }
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setLoading(false);
    }
  };

  // CREATE NEW FLIGHT LOG
  const handleSaveNewEntry = async (newEntry) => {
    try {
      const response = await fetch(`${API_BASE}/api/flightlogs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newEntry),
      });

      // Read ONLY ONCE
      const data = await response.json();

      if (response.ok) {
        fetchFlightLogs(); // Refresh the list
        setShowNewEntryModal(false);
      } else {
        Alert.alert("Error", data.message || "Failed to add flight log");
      }
    } catch (error) {
      console.error("Save error:", error);
      Alert.alert("Error", "Failed to connect to server");
    }
  };

  // UPDATE FLIGHT LOG (NO AUTH)
  const handleSaveEdit = async (updatedLog) => {
    try {
      const response = await fetch(
        `${API_BASE}/api/flightlogs/${updatedLog._id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updatedLog),
        },
      );

      const data = await response.json();

      if (response.ok) {
        fetchFlightLogs(); // Refresh the list
        setShowEditModal(false);
        setSelectedLog(null);
        Alert.alert("Success", "Flight log updated successfully");
      } else {
        Alert.alert("Error", data.message || "Failed to update flight log");
      }
    } catch (error) {
      console.error("Update error:", error);
      Alert.alert("Error", "Failed to connect to server");
    }
  };

  // Handle search input change with debounce
  const handleSearchChange = (text) => {
    setSearchQuery(text);
    if (text.trim()) {
      const timeoutId = setTimeout(() => {
        searchFlightLogs(text);
      }, 500);
      return () => clearTimeout(timeoutId);
    } else {
      fetchFlightLogs();
    }
  };

  // Fetch when filters change
  useEffect(() => {
    fetchFlightLogs();
  }, [selectedAircraft, selectedStatus]);

  const aircraftOptions = [
    "all",
    ...new Set(flightLogs.map((log) => log.rpc).filter(Boolean)),
  ];

  const statusOptions = [
    { label: "All", value: "all" },
    { label: "Pending Release", value: "pending_release" },
    { label: "Pending Acceptance", value: "pending_acceptance" },
    { label: "Released", value: "released" },
    { label: "Accepted", value: "accepted" },
    { label: "Completed", value: "completed" },
  ];

  const filteredLogs = flightLogs.filter((log) => {
    const matchesSearch =
      searchQuery === "" ||
      log.rpc?.includes(searchQuery) ||
      log.aircraftType?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.date?.includes(searchQuery);

    const matchesAircraft =
      selectedAircraft === "" ||
      selectedAircraft === "all" ||
      log.rpc === selectedAircraft;

    const matchesStatus =
      selectedStatus === "all" || log.status === selectedStatus;

    return matchesSearch && matchesAircraft && matchesStatus;
  });

  const handleEdit = (log) => {
    setSelectedLog(log);
    setShowEditModal(true);
  };

  const handleExport = (log) => {
    console.log("Export log:", log);
  };

  const handleNewEntry = () => {
    setShowNewEntryModal(true);
  };

  const selectAircraft = (aircraft) => {
    setSelectedAircraft(aircraft);
    setShowAircraftDropdown(false);
  };

  const selectStatus = (status) => {
    setSelectedStatus(status);
    setShowStatusDropdown(false);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchFlightLogs();
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.grayLight }}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.grayLight} />

      <View style={{ flex: 1, paddingHorizontal: 7 }}>
        {/* Search Bar Row with New Entry Button */}
        <View style={{ flexDirection: "row", marginBottom: 12, gap: 12 }}>
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
              placeholder="Search"
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
            onPress={handleNewEntry}
          >
            <MaterialCommunityIcons
              name="plus"
              size={20}
              color={COLORS.white}
            />
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

        {/* Filters Row */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
            gap: 12,
          }}
        >
          {/* Aircraft Filter Dropdown */}
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
              onPress={() => setShowAircraftDropdown(!showAircraftDropdown)}
            >
              <Text style={{ 
                fontSize: 15, 
                color: selectedAircraft && selectedAircraft !== "all" ? COLORS.black : COLORS.grayDark 
              }}>
                {selectedAircraft && selectedAircraft !== "all" 
                  ? `RP-C: ${selectedAircraft}` 
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

          {/* Status Filter Dropdown */}
          <View style={{ width: 150 }}>
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
              onPress={() => setShowStatusDropdown(!showStatusDropdown)}
            >
              <Text style={{ fontSize: 15, color: COLORS.black }}>
                {statusOptions.find((opt) => opt.value === selectedStatus)
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
                    key={index}
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

        {/* Loading Indicator */}
        {loading && !refreshing && (
          <View
            style={{
              flex: 1,
              justifyContent: "center",
              alignItems: "center",
              paddingTop: 50,
            }}
          >
            <ActivityIndicator size="large" color={COLORS.primaryLight} />
            <Text style={{ marginTop: 10, color: COLORS.grayDark }}>
              Loading flight logs...
            </Text>
          </View>
        )}

        {/* Flight Log Cards */}
        {!loading && (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[COLORS.primaryLight]}
              />
            }
          >
            {filteredLogs.length === 0 ? (
              <View
                style={{
                  flex: 1,
                  justifyContent: "center",
                  alignItems: "center",
                  paddingTop: 50,
                }}
              >
                <MaterialCommunityIcons
                  name="file-document-outline"
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
                  No flight logs found
                </Text>
                <TouchableOpacity
                  onPress={handleNewEntry}
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
              <FlightLogCards
                logs={filteredLogs}
                onEdit={handleEdit}
                onExport={handleExport}
                userRole={userRole}
              />
            )}
          </ScrollView>
        )}
      </View>

      {/* New Entry Modal */}
      <FlightLogEntry
        visible={showNewEntryModal}
        onClose={() => setShowNewEntryModal(false)}
        onSave={handleSaveNewEntry}
        userRole={userRole}
      />

      {/* Edit Entry Modal */}
      <FlightLogEditEntry
        visible={showEditModal}
        logData={selectedLog}
        onClose={() => {
          setShowEditModal(false);
          setSelectedLog(null);
        }}
        onSave={handleSaveEdit}
        userRole={userRole}
      />
    </View>
  );
}
