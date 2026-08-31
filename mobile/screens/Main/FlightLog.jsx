import React, { useState, useContext, useEffect, useCallback, useRef } from "react";
import AppText from "../../components/common/AppText";
import {
  View,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  ActivityIndicator
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { COLORS } from "../../stylesheets/colors";
import { AuthContext } from "../../Context/AuthContext";
import { NotificationContext } from "../../Context/NotificationContext";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import FlightLogCards from "../../components/FlightLog/FlightLogCards";
import FlightLogEntry from "../../components/FlightLog/FlightLogEntry";
import FlightLogEditEntry from "../../components/FlightLog/FlightLogEditEntry";
import FlightLogSignatureModal from "../../components/FlightLog/FlightLogSignatureModal";
import { isB412Aircraft } from "../../components/FlightLog/b412FlightLogData";
import AlertComp from "../../components/AlertComp";
import { API_BASE } from "../../utilities/API_BASE";
import { getAuthHeaders as getMobileAuthHeaders } from "../../utilities/mobileApi";
import { exportFlightLogPdf } from "../../utilities/pdfExport";
import { showToast } from "../../utilities/toast";
import { styles } from "../../stylesheets/styles";
import { SearchBar } from "../../components/common/MobileModule";
import { matchesSearch } from "../../utilities/search";
import { canExportModule } from "../../../shared/exportAccess";
import { resolveUserRole } from "../../../shared/navigationAccess";

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
  if (normalized === "for_completion") {
    return "accepted";
  }

  return normalized;
};

const parseFlightLogDate = (log = {}) => {
  const value = log?.date || log?.dateAdded || log?.createdAt || log?.updatedAt;

  if (!value) return 0;
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return value;

  const raw = String(value).trim();
  const slashDate = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);

  if (slashDate) {
    const [, month, day, yearValue] = slashDate;
    const year =
      yearValue.length === 2 ? Number(`20${yearValue}`) : Number(yearValue);
    return new Date(year, Number(month) - 1, Number(day)).getTime();
  }

  const parsed = new Date(raw).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
};

const sortNewestFlightLogs = (logs = []) =>
  [...logs].sort((a, b) => parseFlightLogDate(b) - parseFlightLogDate(a));

const mergeFlightLogs = (logs = []) =>
  Array.from(new Map(logs.map((log) => [log?._id || log?.id, log])).values());

const hasDestinationInfo = (log = {}) =>
  Array.isArray(log.legs) &&
  log.legs.some(
    (leg) =>
      Array.isArray(leg?.stations) &&
      leg.stations.some(
        (station) =>
          String(station?.from || "").trim() &&
          String(station?.to || "").trim(),
      ),
  );

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
  const [signatureWorkflow, setSignatureWorkflow] = useState({
    visible: false,
    action: "",
    log: null,
  });
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    title: "",
    message: "",
    confirmText: "OK",
    cancelText: "Cancel",
    onConfirm: null,
    onCancel: null,
  });
  const hasLoadedRef = useRef(false);

  const userRole = resolveUserRole(user, "pilot");
  const isOfficerInCharge = userRole === "officer-in-charge";
  const canExportFlightLogs = canExportModule(userRole, "flightLogs");

  const syncUpdatedFlightLog = useCallback((updatedLog) => {
    if (!updatedLog?._id) return;

    setSelectedLog((currentLog) =>
      currentLog?._id === updatedLog._id ? updatedLog : currentLog,
    );
    setFlightLogs((currentLogs) =>
      currentLogs.map((currentLog) =>
        currentLog._id === updatedLog._id ? updatedLog : currentLog,
      ),
    );
  }, []);

  const getAuthHeaders = useCallback(
    () => getMobileAuthHeaders({ "x-action-confirmed": "true" }),
    [],
  );

  const getUserDisplayName = useCallback(() => {
    const fullName = `${user?.firstName || ""} ${user?.lastName || ""}`.trim();
    return fullName || user?.username || userRole || "Unknown";
  }, [user?.firstName, user?.lastName, user?.username, userRole]);

  const buildToDateData = (log = {}) => {
    const broughtForward = log?.componentData?.broughtForwardData || {};
    const thisFlight = log?.componentData?.thisFlightData || {};

    return {
      airframe:
        (parseFloat(broughtForward.airframe) || 0) +
        (parseFloat(thisFlight.airframe) || 0),
      engine:
        (parseFloat(broughtForward.engine) || 0) +
        (parseFloat(thisFlight.engine) || 0),
      cycleN1:
        (parseFloat(broughtForward.cycleN1) || 0) +
        (parseFloat(thisFlight.cycleN1) || 0),
      cycleN2:
        (parseFloat(broughtForward.cycleN2) || 0) +
        (parseFloat(thisFlight.cycleN2) || 0),
      landingCycle:
        (parseFloat(broughtForward.landingCycle) || 0) +
        (parseFloat(thisFlight.landingCycle) || 0),
    };
  };

  const closeAlert = () => {
    setAlertConfig((current) => ({ ...current, visible: false }));
  };

  const confirmWithAlert = ({ title, message, confirmText = "Confirm" }) =>
    new Promise((resolve) => {
      const finish = (result) => {
        setAlertConfig((current) => ({ ...current, visible: false }));
        resolve(result);
      };

      setAlertConfig({
        visible: true,
        title,
        message,
        confirmText,
        cancelText: "Cancel",
        onConfirm: () => finish(true),
        onCancel: () => finish(false),
      });
    });

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
      const authHeaders = await getAuthHeaders({
        "x-action-confirmed": "true",
      });
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
        return true;
      } else {
        showToast(data.message || "Failed to add flight log");
        return false;
      }
    } catch (error) {
      console.error("Save error:", error);
      showToast("Failed to connect to server");
      return false;
    }
  };

  // UPDATE FLIGHT LOG (NO AUTH)
  const handleSaveEdit = async (
    updatedLog,
    options = { closeOnSave: true, showToast: true },
  ) => {
    try {
      const authHeaders = await getAuthHeaders({
        "x-action-confirmed": "true",
      });
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
        const savedLog = data.data || updatedLog;
        syncUpdatedFlightLog(savedLog);
        fetchFlightLogs();
        fetchNotifications();
        if (options.closeOnSave) {
          setShowEditModal(false);
          setSelectedLog(null);
        } else {
          setSelectedLog(savedLog);
        }
        if (options.showToast !== false) {
          showToast("The flight log has been successfully updated");
        }
        return true;
      } else {
        showToast(data.message || "Failed to update flight log");
        return false;
      }
    } catch (error) {
      console.error("Update error:", error);
      showToast("Failed to connect to server");
      return false;
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
    { label: "For Completion", value: "for_completion" },
    { label: "Completed", value: "completed" },
  ];

  const filteredLogs = flightLogs.filter((log) => {
    const matchesSearchText = matchesSearch(searchQuery, log);

    const matchesAircraft =
      selectedAircraft === "" ||
      selectedAircraft === "all" ||
      log.rpc === selectedAircraft;

    const matchesStatus =
      selectedStatus === "all" ||
      (selectedStatus === "for_completion"
        ? getComparableStatus(log.status) === "accepted" &&
          log.notifiedForCompletion
        : selectedStatus === "accepted"
          ? getComparableStatus(log.status) === "accepted" &&
            !log.notifiedForCompletion
          : getComparableStatus(log.status) ===
            getComparableStatus(selectedStatus));

    return matchesSearchText && matchesAircraft && matchesStatus;
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

  const openSignedWorkflow = (action, log) => {
    if (!log?._id) return;
    setSignatureWorkflow({ visible: true, action, log });
  };

  const closeSignedWorkflow = () => {
    setSignatureWorkflow({ visible: false, action: "", log: null });
  };

  const handleSignedWorkflow = async (signature) => {
    const { action, log } = signatureWorkflow;
    if (!action || !log?._id) return;

    try {
      const endpoint = action === "release" ? "release" : "accept";
      const response = await fetch(
        `${API_BASE}/api/flightlogs/${log._id}/${endpoint}`,
        {
          method: "PUT",
          headers: await getAuthHeaders(),
          body: JSON.stringify({
            name: getUserDisplayName(),
            signature,
            ...(action === "accept" ? { userRole: "pilot" } : {}),
          }),
        },
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            `Failed to ${action === "release" ? "release" : "accept"} flight log`,
        );
      }

      syncUpdatedFlightLog(data.data);
      closeSignedWorkflow();
      await fetchFlightLogs({ silent: true });
      await fetchNotifications();
      showToast(
        action === "release"
          ? "Flight log released successfully."
          : "Flight log accepted successfully.",
      );
    } catch (error) {
      console.error("Signed flight log workflow failed:", error);
      showToast(error.message || "Flight log workflow failed.");
    }
  };

  const handleNotify = async (log) => {
    if (!hasDestinationInfo(log)) {
      showToast(
        "Add at least one complete From-To station in Destination/s before notifying for completion.",
      );
      return;
    }

    const confirmed = await confirmWithAlert({
      title: "Notify Mechanic",
      message:
        "Notify the mechanic that this accepted flight log is ready for completion?",
      confirmText: "Notify",
    });
    if (!confirmed) return;

    try {
      const response = await fetch(`${API_BASE}/api/flightlogs/${log._id}`, {
        method: "PUT",
        headers: await getAuthHeaders(),
        body: JSON.stringify({
          ...log,
          _id: log._id,
          notifiedForCompletion: true,
          confirmAction: true,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to notify mechanic");
      }

      await fetchFlightLogs({ silent: true });
      await fetchNotifications();
      showToast("Mechanic notified for completion.");
    } catch (error) {
      console.error("Notify mechanic failed:", error);
      showToast(error.message || "Failed to notify mechanic.");
    }
  };

  const handleComplete = async (log) => {
    const confirmed = await confirmWithAlert({
      title: "Complete Flight Log",
      message:
        "Complete this flight log and update parts-monitoring totals from its to-date values?",
      confirmText: "Complete",
    });
    if (!confirmed) return;

    try {
      const isB412 = isB412Aircraft(log?.aircraftType);
      const toDateData =
        log?.componentData?.toDateData &&
        Object.keys(log.componentData.toDateData).length > 0
          ? log.componentData.toDateData
          : buildToDateData(log);
      const b412ToDate = log?.b412Data?.componentData?.toDateData || {};
      const aircraft = log.aircraft || log.rpc;

      if (!aircraft) {
        throw new Error("Aircraft identifier is missing.");
      }

      const totalsPayload = isB412
        ? {
            acftTT: Number(b412ToDate.airframe) || 0,
            engTT:
              Number(b412ToDate.engine1?.tsn) ||
              Number(b412ToDate.airframe) ||
              0,
            n1Cycles: Number(b412ToDate.engine1?.cycle) || 0,
            n2Cycles: Number(b412ToDate.engine2?.cycle) || 0,
            landings: Number(b412ToDate.landingCycle) || 0,
          }
        : {
            acftTT: Number(toDateData.airframe) || 0,
            n1Cycles: Number(toDateData.cycleN1) || 0,
            n2Cycles: Number(toDateData.cycleN2) || 0,
            landings: Number(toDateData.landingCycle) || 0,
          };

      const totalsResponse = await fetch(
        `${API_BASE}/api/parts-monitoring/${encodeURIComponent(aircraft)}/update-totals`,
        {
          method: "PUT",
          headers: await getAuthHeaders(),
          body: JSON.stringify({
            ...totalsPayload,
            updatedBy: getUserDisplayName(),
            confirmAction: true,
          }),
        },
      );
      const totalsData = await totalsResponse.json();
      if (!totalsResponse.ok) {
        throw new Error(
          totalsData.message || "Failed to update aircraft totals.",
        );
      }

      const completeResponse = await fetch(
        `${API_BASE}/api/flightlogs/${log._id}/complete`,
        {
          method: "PUT",
          headers: await getAuthHeaders(),
        },
      );
      const completeData = await completeResponse.json();
      if (!completeResponse.ok) {
        throw new Error(completeData.message || "Failed to complete flight log");
      }

      await fetchFlightLogs({ silent: true });
      await fetchNotifications();
      showToast("Flight log completed successfully.");
    } catch (error) {
      console.error("Complete flight log failed:", error);
      showToast(error.message || "Failed to complete flight log.");
    }
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
          <SearchBar
            value={searchQuery}
            onChangeText={handleSearchChange}
            placeholder="Search"
            containerStyle={{ flex: 1, height: 48, marginBottom: 0 }}
          />

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
                numberOfLines={1}
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
              <AppText style={styles.unifiedFilterButtonText} numberOfLines={1}>
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
                onExport={canExportFlightLogs ? handleExport : undefined}
                onRelease={(log) => openSignedWorkflow("release", log)}
                onAccept={(log) => openSignedWorkflow("accept", log)}
                onNotify={handleNotify}
                onComplete={handleComplete}
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
        currentUser={user}
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
        onCompleted={async (updatedLog) => {
          setSelectedLog(updatedLog);
          await fetchFlightLogs({ silent: true });
          await fetchNotifications();
        }}
        userRole={userRole}
        currentUser={user}
        readOnly={
          isOfficerInCharge ||
          normalizeFlightLogStatus(selectedLog?.status) === "completed"
        }
      />

      <FlightLogSignatureModal
        visible={signatureWorkflow.visible}
        title={
          signatureWorkflow.action === "release"
            ? "Release Signature"
            : "Accept Signature"
        }
        onClose={closeSignedWorkflow}
        onSave={handleSignedWorkflow}
        aircraftRPC={signatureWorkflow.log?.rpc || signatureWorkflow.log?.aircraft}
      />

      <AlertComp
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        confirmText={alertConfig.confirmText}
        cancelText={alertConfig.cancelText}
        onConfirm={alertConfig.onConfirm}
        onCancel={alertConfig.onCancel || closeAlert}
      />
    </View>
  );
}
