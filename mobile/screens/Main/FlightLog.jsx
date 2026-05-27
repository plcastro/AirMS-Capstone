import React, { useState, useContext, useEffect, useCallback, useRef } from "react";
import AppText from "../../components/common/AppText";
import AppInput from "../../components/common/AppInput";
import {
  View,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  ActivityIndicator
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { COLORS } from "../../stylesheets/colors";
import { AuthContext } from "../../Context/AuthContext";
import { NotificationContext } from "../../Context/NotificationContext";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import FlightLogCards from "../../components/FlightLog/FlightLogCards";
import FlightLogEntry from "../../components/FlightLog/FlightLogEntry";
import FlightLogEditEntry from "../../components/FlightLog/FlightLogEditEntry";
import { API_BASE } from "../../utilities/API_BASE";
import { exportFlightLogPdf } from "../../utilities/pdfExport";
import { showToast } from "../../utilities/toast";
import { styles } from "../../stylesheets/styles";

const normalizeFlightLogStatus = (statusValue = "") =>
  String(statusValue || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

const getComparableStatus = (statusValue = "") => {
  const normalized = normalizeFlightLogStatus(statusValue);

  if (normalized === "ongoing" || normalized === "draft") {
    return "pending_release";
  }
  if (normalized === "released") {
    return "pending_acceptance";
  }

  return normalized;
};

const sortNewestFlightLogs = (logs = []) =>
  [...logs].sort((a, b) => {
    const bDate = new Date(b?.date || b?.createdAt || 0).getTime();
    const aDate = new Date(a?.date || a?.createdAt || 0).getTime();
    return (
      (Number.isNaN(bDate) ? 0 : bDate) - (Number.isNaN(aDate) ? 0 : aDate)
    );
  });

const mergeFlightLogs = (logs = []) =>
  Array.from(new Map(logs.map((log) => [log?._id || log?.id, log])).values());

export default function FlightLog({ route, navigation }) {
  const { user } = useContext(AuthContext);
  const { fetchNotifications } = useContext(NotificationContext);
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
  const hasLoadedRef = useRef(false);

  const userRole = user?.jobTitle?.toLowerCase() || "pilot";
  const isOfficerInCharge = userRole === "officer-in-charge";

  const getAuthHeaders = useCallback(async () => {
    const token = await AsyncStorage.getItem("currentUserToken");
    const rawSessionMeta = await AsyncStorage.getItem("authSessionMeta");
    let sessionMeta = {};

    try {
      sessionMeta = rawSessionMeta ? JSON.parse(rawSessionMeta) : {};
    } catch {
      sessionMeta = {};
    }

    return {
      "Content-Type": "application/json",
      "x-action-confirmed": "true",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "x-platform": "MOBILE",
      ...(sessionMeta.base ? { "x-base": sessionMeta.base } : {}),
      ...(sessionMeta.sessionId
        ? { "x-session-id": sessionMeta.sessionId }
        : {}),
    };
  }, []);

  /// FETCH ALL FLIGHT LOGS (NO AUTH)
  const fetchFlightLogs = useCallback(
    async ({ silent = false } = {}) => {
      try {
        if (!silent) {
          setLoading(true);
        }

        // Build query parameters
        const params = new URLSearchParams();
        params.append("page", "1");
        params.append("limit", "500");
        params.append("sortBy", "date");
        params.append("sortOrder", "desc");

        // console.log(
        //   "Fetching from:",
        //   `${API_BASE}/api/flightlogs?${params.toString()}`,
        // );

        const fetchPage = async (page, extraParams = {}) => {
          const pageParams = new URLSearchParams(params);
          pageParams.set("page", String(page));
          Object.entries(extraParams).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== "") {
              pageParams.set(key, value);
            }
          });

          const response = await fetch(
            `${API_BASE}/api/flightlogs?${pageParams.toString()}`,
            {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
              },
            },
          );

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.message || "Failed to fetch flight logs");
          }

          return data;
        };

        const fetchAllPages = async (extraParams = {}) => {
          const firstPage = await fetchPage(1, extraParams);
          const totalPages = Number(firstPage.pagination?.pages || 1);
          const remainingPages =
            totalPages > 1
              ? await Promise.all(
                  Array.from({ length: totalPages - 1 }, (_, index) =>
                    fetchPage(index + 2, extraParams),
                  ),
                )
              : [];

          return [firstPage, ...remainingPages].flatMap((page) =>
            Array.isArray(page.data) ? page.data : [],
          );
        };

        const logs = await fetchAllPages();
        const pendingReleaseLogs = await fetchAllPages({
          status: "pending_release",
        });

        setFlightLogs(
          sortNewestFlightLogs(
            mergeFlightLogs([...logs, ...pendingReleaseLogs]),
          ),
        );
      } catch (error) {
        console.error("Fetch error:", error);
        showToast(
          error.message ||
            "Failed to connect to server. Please check your network.",
        );
      } finally {
        if (!silent) {
          setLoading(false);
        }
        setRefreshing(false);
      }
    },
    [],
  );

  const fetchFlightLogById = useCallback(async (flightLogId) => {
    try {
      const response = await fetch(
        `${API_BASE}/api/flightlogs/${flightLogId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      const data = await response.json();

      if (!response.ok || !data?.success || !data?.data) {
        return null;
      }

      return data.data;
    } catch (error) {
      console.error("Fetch flight log by id error:", error);
      return null;
    }
  }, []);

  // CREATE NEW FLIGHT LOG
  const handleSaveNewEntry = async (
    newEntry,
    options = { closeOnSave: true, showToast: true },
  ) => {
    try {
      const authHeaders = await getAuthHeaders();
      const response = await fetch(`${API_BASE}/api/flightlogs`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          ...newEntry,
          createdByName:
            `${user?.firstName || ""} ${user?.lastName || ""}`.trim() ||
            "Unknown User",
          createdByUserId: user?.id || null,
        }),
      });

      // Read ONLY ONCE
      const data = await response.json();

      if (response.ok) {
        fetchFlightLogs();
        fetchNotifications();
        if (options.closeOnSave !== false) {
          setShowNewEntryModal(false);
        }
        if (options.showToast) {
          showToast("Flight log added successfully");
        }
      } else {
        showToast(data.message || "Failed to add flight log");
      }
    } catch (error) {
      console.error("Save error:", error);
      showToast("Failed to connect to server");
    }
  };

  // UPDATE FLIGHT LOG (NO AUTH)
  const handleSaveEdit = async (
    updatedLog,
    options = { closeOnSave: true, showToast: true },
  ) => {
    try {
      const authHeaders = await getAuthHeaders();
      const response = await fetch(
        `${API_BASE}/api/flightlogs/${updatedLog._id}`,
        {
          method: "PUT",
          headers: authHeaders,
          body: JSON.stringify(updatedLog),
        },
      );

      const data = await response.json();

      if (response.ok) {
        fetchFlightLogs();
        fetchNotifications();
        if (options.closeOnSave) {
          setShowEditModal(false);
          setSelectedLog(null);
        } else {
          setSelectedLog(updatedLog);
        }
        if (options.showToast !== false) {
          showToast("Flight log updated successfully");
        }
      } else {
        showToast(data.message || "Failed to update flight log");
      }
    } catch (error) {
      console.error("Update error:", error);
      showToast("Failed to connect to server");
    }
  };

  // Handle search input change with debounce
  const handleSearchChange = (text) => {
    setSearchQuery(text);
  };

  // Fetch when filters change
  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    fetchFlightLogs();
  }, [fetchFlightLogs]);

  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
    }, [fetchNotifications]),
  );

  useEffect(() => {
    if (typeof EventSource === "undefined") return undefined;

    const stream = new EventSource(`${API_BASE}/api/events/stream`);
    const onDataChanged = async (event) => {
      let payload = {};
      try {
        payload = JSON.parse(event?.data || "{}");
      } catch {
        payload = {};
      }
      if (!String(payload?.url || "").startsWith("/api/flightlogs")) return;
      await fetchFlightLogs({ silent: true });
      await fetchNotifications();
    };

    stream.addEventListener("data-changed", onDataChanged);

    return () => {
      stream.removeEventListener("data-changed", onDataChanged);
      stream.close();
    };
  }, [fetchFlightLogs, fetchNotifications]);

  useEffect(() => {
    if (!route?.params?.refreshAt) {
      return;
    }

    fetchFlightLogs();
    fetchNotifications();
  }, [fetchFlightLogs, fetchNotifications, route?.params?.refreshAt]);

  useEffect(() => {
    if (!route?.params?.targetFlightLogId) {
      return;
    }

    setSelectedAircraft("");
    setSelectedStatus(route?.params?.notificationStatus || "all");
  }, [route?.params?.notificationStatus, route?.params?.targetFlightLogId]);

  const aircraftOptions = [
    "all",
    ...new Set(flightLogs.map((log) => log.rpc).filter(Boolean)),
  ];

  const statusOptions = [
    { label: "All Status", value: "all" },
    { label: "Pending Release", value: "pending_release" },
    { label: "Released", value: "pending_acceptance" },
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
      selectedStatus === "all" ||
      getComparableStatus(log.status) === getComparableStatus(selectedStatus);

    return matchesSearch && matchesAircraft && matchesStatus;
  });

  useEffect(() => {
    const openTargetFlightLog = async () => {
      const targetFlightLogId = route?.params?.targetFlightLogId;

      if (!targetFlightLogId) {
        return;
      }

      let matchedLog = flightLogs.find((log) => log._id === targetFlightLogId);

      if (!matchedLog) {
        matchedLog = await fetchFlightLogById(targetFlightLogId);
      }

      if (!matchedLog) {
        return;
      }

      setSelectedLog(matchedLog);
      setShowEditModal(true);
      navigation?.setParams?.({
        refreshAt: undefined,
        targetFlightLogId: undefined,
        notificationStatus: undefined,
      });
    };

    openTargetFlightLog();
  }, [
    fetchFlightLogById,
    flightLogs,
    navigation,
    route?.params?.targetFlightLogId,
  ]);

  const handleEdit = (log) => {
    setSelectedLog(log);
    setShowEditModal(true);
  };

  const handleExport = async (log) => {
    await exportFlightLogPdf(log);
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
    fetchNotifications();
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.grayLight }}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.grayLight} />

      <View style={{ flex: 1, paddingHorizontal: 7, marginTop: 10 }}>
        {/* Search Bar Row with New Entry Button */}
        <View style={styles.unifiedControlRow}>
          <View style={styles.unifiedSearchBox}>
            <MaterialCommunityIcons
              name="magnify"
              size={22}
              color={COLORS.grayDark}
            />
            <AppInput
              placeholder="Search"
              placeholderTextColor={COLORS.grayDark}
              style={styles.unifiedSearchInput}
              value={searchQuery}
              onChangeText={handleSearchChange}
            />
          </View>

          {!isOfficerInCharge && (
            <TouchableOpacity
              style={styles.unifiedActionButton}
              onPress={handleNewEntry}
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
              style={styles.unifiedFilterButton}
              onPress={() => setShowAircraftDropdown(!showAircraftDropdown)}
            >
              <MaterialCommunityIcons
                name="tune"
                size={16}
                color={COLORS.primaryLight}
                style={{ marginRight: 6 }}
              />
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
                  ? `RP-C: ${selectedAircraft}`
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

          {/* Status Filter Dropdown */}
          <View style={{ width: 150 }}>
            <TouchableOpacity
              style={styles.unifiedFilterButton}
              onPress={() => setShowStatusDropdown(!showStatusDropdown)}
            >
              <MaterialCommunityIcons
                name="tune"
                size={16}
                color={COLORS.primaryLight}
                style={{ marginRight: 6 }}
              />
              <AppText style={styles.unifiedFilterButtonText}>
                {statusOptions.find((opt) => opt.value === selectedStatus)
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
                    key={index}
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
            <AppText style={{ marginTop: 10, color: COLORS.grayDark }}>
              Loading flight logs...
            </AppText>
          </View>
        )}

        {/* Flight Log Cards */}
        {!loading && (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 110 }}
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
                <AppText
                  style={{
                    marginTop: 10,
                    fontSize: 12,
                    color: COLORS.grayDark,
                    textAlign: "center",
                  }}
                >
                  No flight logs found
                </AppText>
                {!isOfficerInCharge && (
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
                    <AppText style={{ color: COLORS.white, fontWeight: "600" }}>
                      Create New Entry
                    </AppText>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <FlightLogCards
                logs={filteredLogs}
                onEdit={handleEdit}
                onExport={handleExport}
                userRole={userRole}
                readOnly={isOfficerInCharge}
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
        readOnly={isOfficerInCharge}
      />
    </View>
  );
}
