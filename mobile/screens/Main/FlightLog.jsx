import FlightEntryInspectionPrompt from "../../components/FlightLog/FlightEntryInspectionPrompt";
import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  FlatList,
  View,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AppText from "../../components/common/AppText";
import NewLogBadge from "../../components/common/NewLogBadge";
import ActionIconButton from "../../components/common/ActionIconButton";
import useViewedLogs from "../../utilities/useViewedLogs";
import AircraftLogGroups from "../../components/common/AircraftLogGroups";
import { SearchBar, EmptyState, CardActionRow } from "../../components/common/MobileModule";
import FlightLogEntry from "../../components/FlightLog/FlightLogEntry";
import FlightWorkspace from "../../components/FlightLog/FlightWorkspace";
import { AuthContext } from "../../Context/AuthContext";
import { NotificationContext } from "../../Context/NotificationContext";
import { COLORS } from "../../stylesheets/colors";
import { API_BASE } from "../../utilities/API_BASE";
import { getAuthHeaders, formatDateTime } from "../../utilities/mobileApi";
import { exportFlightLogPdf } from "../../utilities/pdfExport";
import { showToast } from "../../utilities/toast";
import { matchesSearch } from "../../utilities/search";
import { canExportModule } from "../../../shared/exportAccess";
import { resolveUserRole } from "../../../shared/navigationAccess";
import { canCreateFlightLog } from "../../../shared/flightLogCreationAccess";
import {
  getLogAircraftRegistration,
  sortLogsByLatestActivity,
} from "../../../shared/aircraftLogGroups";
import {
  FLIGHT_STAGES,
  flightStage,
  needsMyFlightAction,
  nextFlightStep,
  hasOngoingFlightLog,
} from "../../../shared/flightWorkflow";

function NeedsActionToggle({ value, onToggle }) {
  return (
    <TouchableOpacity
      accessibilityRole="checkbox"
      accessibilityState={{ checked: value }}
      onPress={onToggle}
      style={{
        flexDirection: "row",
        alignItems: "center",
        alignSelf: "flex-start",
        backgroundColor: value ? `${COLORS.primaryLight}1A` : COLORS.white,
        borderWidth: 1,
        borderColor: value ? COLORS.primaryLight : COLORS.grayMedium,
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 8,
        marginBottom: 10,
      }}
    >
      <MaterialCommunityIcons
        name={value ? "checkbox-marked" : "checkbox-blank-outline"}
        size={16}
        color={value ? COLORS.primaryLight : COLORS.grayDark}
      />
      <AppText
        style={{
          fontSize: 12,
          fontWeight: "600",
          color: value ? COLORS.primaryLight : COLORS.grayDark,
          marginLeft: 6,
        }}
      >
        Needs My Action
      </AppText>
    </TouchableOpacity>
  );
}

export default function FlightLog({ route, navigation }) {
  const { user } = useContext(AuthContext);
  const { fetchNotifications } = useContext(NotificationContext);
  const [logs, setLogs] = useState([]),
    [loading, setLoading] = useState(true);
  const [aircraft, setAircraft] = useState(""),
    [query, setQuery] = useState(""),
    [aircraftQuery, setAircraftQuery] = useState("");
  const [status, setStatus] = useState("all"),
    [onlyMine, setOnlyMine] = useState(false);
  const [creating, setCreating] = useState(false),
    [opened, setOpened] = useState(null);
  const userRole = resolveUserRole(user, "pilot");
  const { isNew, markViewed } = useViewedLogs(user, "flight");
  const canCreate = canCreateFlightLog(user);
  const ongoingFlight = hasOngoingFlightLog(logs, aircraft);
  const [entryPrompt, setEntryPrompt] = useState(false),
    [entryAircraft, setEntryAircraft] = useState(""),
    [entryConfirmation, setEntryConfirmation] = useState(null);
  const startEntry = (rpc = "") => {
    if (loading || (rpc && hasOngoingFlightLog(logs, rpc))) return;
    setEntryAircraft(rpc === "Unassigned aircraft" ? "" : rpc);
    setEntryPrompt(true);
  };
  const refresh = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const page = async (number) => {
        const response = await fetch(
          `${API_BASE}/api/flightlogs?page=${number}&limit=500&sortBy=updatedAt&sortOrder=desc`,
          {
            headers,
          },
        );
        const body = await response.json();
        if (!response.ok)
          throw Error(body.message || "Could not load flight logs");
        return body;
      };
      const first = await page(1);
      const rest = await Promise.all(
        Array.from(
          {
            length: Math.max(0, Number(first.pagination?.pages || 1) - 1),
          },
          (_, index) => page(index + 2),
        ),
      );
      setLogs(
        sortLogsByLatestActivity(
          Array.from(
            new Map(
              [first, ...rest]
                .flatMap((item) => item.data || [])
                .map((log) => [log._id, log]),
            ).values(),
          ),
        ),
      );
    } catch (error) {
      showToast(error.message);
    } finally {
      setLoading(false);
    }
  }, []);
  useFocusEffect(
    useCallback(() => {
      refresh();
      fetchNotifications?.();
      const timer = setInterval(() => refresh(), 30000);
      return () => clearInterval(timer);
    }, [refresh, fetchNotifications]),
  );
  useEffect(() => {
    if (route?.params?.targetFlightLogId)
      setOpened(route.params.targetFlightLogId);
    if (route?.params?.refreshAt) {
      refresh();
      fetchNotifications?.();
    }
  }, [
    route?.params?.targetFlightLogId,
    route?.params?.refreshAt,
    refresh,
    fetchNotifications,
  ]);
  useEffect(() => {
    const target = logs.find(
      (log) => log._id === route?.params?.targetFlightLogId,
    );
    if (target) setAircraft(getLogAircraftRegistration(target));
  }, [logs, route?.params?.targetFlightLogId]);
  const chooseAircraft = (value) => {
    setAircraft(value);
    setQuery("");
    setStatus("all");
  };
  const changed = () => {
    refresh();
    fetchNotifications?.();
  };
  const create = async (entry) => {
    try {
      const response = await fetch(`${API_BASE}/api/flightlogs`, {
        method: "POST",
        headers: await getAuthHeaders({
          "Content-Type": "application/json",
          "x-action-confirmed": "true",
        }),
        body: JSON.stringify({
          ...entry,
          confirmationId: entryConfirmation?.confirmationId,
          status: "pending_release",
          confirmAction: true,
        }),
      });
      const body = await response.json();
      if (!response.ok) throw Error(body.message || "Could not create draft");
      chooseAircraft(getLogAircraftRegistration(body.data));
      setCreating(false);
      setOpened(body.data._id);
      changed();
      return true;
    } catch (error) {
      showToast(error.message);
      return false;
    }
  };
  const filtered = useMemo(
    () =>
      logs.filter(
        (log) =>
          getLogAircraftRegistration(log) === aircraft &&
          (status === "all" || flightStage(log) === status) &&
          (!onlyMine || needsMyFlightAction(user, log)) &&
          matchesSearch(query, log),
      ),
    [logs, aircraft, status, onlyMine, user, query],
  );
  return (
    <View style={{ flex: 1, backgroundColor: COLORS.grayLight }}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.grayLight} />
      <View style={{ flex: 1, paddingHorizontal: 7, paddingTop: 10 }}>
        {!aircraft ? (
          <>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <AppText style={{ fontSize: 16, fontWeight: "700", color: COLORS.black }}>Flight Logs</AppText>
              {canCreate && (
                <TouchableOpacity
                  disabled={loading}
                  onPress={() => startEntry("")}
                  style={{
                    backgroundColor: COLORS.primaryLight,
                    borderRadius: 8,
                    paddingHorizontal: 14,
                    height: 36,
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: loading ? 0.5 : 1,
                  }}
                >
                  <AppText style={{ color: COLORS.white, fontSize: 12, fontWeight: "700" }}>
                    New Entry
                  </AppText>
                </TouchableOpacity>
              )}
            </View>
            <AircraftLogGroups
            isNew={isNew}
            searchFilters={
              <NeedsActionToggle
                value={onlyMine}
                onToggle={() => setOnlyMine((value) => !value)}
              />
            }
            emptyText={
              onlyMine ? "No flight logs need your action." : "No logs found yet."
            }
            refreshing={loading}
            onRefresh={() => refresh(true)}
            records={onlyMine ? logs.filter((log) => needsMyFlightAction(user, log)) : logs}
            loading={loading}
            sortBy="latestActivity"
            query={aircraftQuery}
            onQueryChange={setAircraftQuery}
            onSelect={chooseAircraft}
            />
          </>
        ) : (
          <>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 14 }}>
              <TouchableOpacity
                onPress={() => chooseAircraft("")}
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
                <AppText numberOfLines={1} style={{ fontSize: 16, fontWeight: "700", color: COLORS.black }}>
                  {aircraft}
                </AppText>
                <AppText style={{ fontSize: 12, color: COLORS.grayDark, marginTop: 1 }}>
                  {filtered.length} flight logs
                </AppText>
              </View>
              {canCreate && (
                <TouchableOpacity
                  disabled={loading || ongoingFlight}
                  onPress={() => startEntry(aircraft)}
                  style={{
                    backgroundColor: COLORS.primaryLight,
                    borderRadius: 8,
                    paddingHorizontal: 14,
                    height: 36,
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: loading || ongoingFlight ? 0.5 : 1,
                  }}
                >
                  <AppText style={{ color: COLORS.white, fontSize: 12, fontWeight: "700" }}>
                    New Entry
                  </AppText>
                </TouchableOpacity>
              )}
            </View>

            {canCreate && ongoingFlight && (
              <View style={{ backgroundColor: COLORS.dangerBg, borderRadius: 8, padding: 10, marginBottom: 12 }}>
                <AppText style={{ color: COLORS.dangerBorder, fontSize: 12, fontWeight: "600" }}>
                  Complete this aircraft's ongoing flight log before creating a new entry.
                </AppText>
              </View>
            )}

            <SearchBar
              value={query}
              onChangeText={setQuery}
              placeholder="Search flight logs or crew"
            />

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ flexGrow: 0, marginBottom: 10 }}
              contentContainerStyle={{ gap: 8 }}
            >
              {[
                ["all", "All Stages"],
                ...Object.entries(FLIGHT_STAGES).map(([value, step]) => [
                  value,
                  step.label,
                ]),
              ].map(([value, label]) => {
                const active = status === value;
                return (
                  <TouchableOpacity
                    key={value}
                    onPress={() => setStatus(value)}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 999,
                      backgroundColor: active ? COLORS.primaryLight : COLORS.white,
                      borderWidth: 1,
                      borderColor: active ? COLORS.primaryLight : COLORS.grayMedium,
                    }}
                  >
                    <AppText style={{ fontSize: 12, fontWeight: "600", color: active ? COLORS.white : COLORS.grayDark }}>
                      {label}
                    </AppText>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <NeedsActionToggle
              value={onlyMine}
              onToggle={() => setOnlyMine((value) => !value)}
            />

            <FlatList
              ListEmptyComponent={
                <EmptyState text="No flight logs match your filters." />
              }
              refreshing={loading}
              onRefresh={() => refresh(true)}
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingBottom: 110 }}
              keyboardShouldPersistTaps="handled"
              data={filtered}
              keyExtractor={(item, index) => String(item._id || item.id || index)}
              initialNumToRender={12}
              maxToRenderPerBatch={8}
              windowSize={7}
              renderItem={({ item: log }) => {
                const step = nextFlightStep(log);
                const needsAction = needsMyFlightAction(user, log);
                return (
                  <TouchableOpacity
                    activeOpacity={0.82}
                    onPress={() => setOpened(log._id)}
                    style={{
                      flexDirection: "row",
                      backgroundColor: COLORS.white,
                      borderRadius: 10,
                      marginBottom: 10,
                      elevation: 2,
                      shadowColor: COLORS.black,
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.06,
                      shadowRadius: 3,
                      overflow: "hidden",
                    }}
                  >
                    <View style={{ width: 5, backgroundColor: needsAction ? COLORS.primaryLight : COLORS.grayMedium }} />
                    <View style={{ flex: 1, padding: 12 }}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                          <AppText style={{ fontSize: 14, fontWeight: "700", color: COLORS.black }}>
                            {log.controlNo || "Flight Log"}
                          </AppText>
                          {isNew(log) && <NewLogBadge />}
                        </View>
                        <View
                          style={{
                            backgroundColor: needsAction ? `${COLORS.primaryLight}1A` : COLORS.grayLight,
                            borderRadius: 999,
                            paddingHorizontal: 10,
                            paddingVertical: 4,
                          }}
                        >
                          <AppText style={{ fontSize: 11, fontWeight: "700", color: needsAction ? COLORS.primaryLight : COLORS.grayDark }}>
                            {step.label}
                          </AppText>
                        </View>
                      </View>

                      <AppText style={{ fontSize: 12, color: COLORS.grayDark }}>
                        Date: {log.date || "N/A"}
                      </AppText>
                      <AppText style={{ fontSize: 12, color: COLORS.grayDark }}>
                        Updated: {formatDateTime(log.updatedAt || log.createdAt)}
                      </AppText>
                      <AppText style={{ fontSize: 12, color: COLORS.grayDark }}>
                        Next: {step.next}{step.crew ? ` — ${log[step.crew]?.name || "Unassigned"}` : ""}
                      </AppText>

                      {canExportModule(userRole, "flightLogs") && (
                        <CardActionRow>
                          <ActionIconButton
                            icon="export-variant"
                            tooltip="Export"
                            onPress={(event) => {
                              event?.stopPropagation?.();
                              exportFlightLogPdf(log).catch((error) => showToast(error.message));
                            }}
                            color={COLORS.grayDark}
                            size={32}
                            iconSize={18}
                          />
                        </CardActionRow>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          </>
        )}
      </View>
      <FlightEntryInspectionPrompt
        flightLogs={logs}
        visible={entryPrompt}
        lockedRpc={entryAircraft}
        onClose={() => setEntryPrompt(false)}
        onConfirmed={(data) => {
          setEntryConfirmation(data);
          setEntryPrompt(false);
          setCreating(true);
        }}
      />
      <FlightLogEntry
        key={entryConfirmation?.confirmationId || "new"}
        entryConfirmation={entryConfirmation}
        visible={creating}
        onClose={() => setCreating(false)}
        onSave={create}
        lockedRpc={entryConfirmation?.rpc || ""}
        userRole={userRole}
        currentUser={user}
      />
      {!!opened && (
        <FlightWorkspace
          onViewed={({ flightLog }) => markViewed(flightLog)}
          id={opened}
          visible
          initialSection={route?.params?.targetSection || "flight"}
          onClose={() => {
            setOpened(null);
            navigation?.setParams?.({
              targetFlightLogId: undefined,
              targetSection: undefined,
              refreshAt: undefined,
              notificationStatus: undefined,
            });
          }}
          onChanged={changed}
        />
      )}
    </View>
  );
}
