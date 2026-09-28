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
  RefreshControl,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import AppText from "../../components/common/AppText";
import NewLogBadge from "../../components/common/NewLogBadge";
import useViewedLogs from "../../utilities/useViewedLogs";
import AircraftLogGroups from "../../components/common/AircraftLogGroups";
import {
  SearchBar,
  InfoCard,
  FieldRow,
  EmptyState,
} from "../../components/common/MobileModule";
import FlightLogEntry from "../../components/FlightLog/FlightLogEntry";
import FlightWorkspace from "../../components/FlightLog/FlightWorkspace";
import { AuthContext } from "../../Context/AuthContext";
import { NotificationContext } from "../../Context/NotificationContext";
import { API_BASE } from "../../utilities/API_BASE";
import { getAuthHeaders, formatDateTime } from "../../utilities/mobileApi";
import { exportFlightLogPdf } from "../../utilities/pdfExport";
import { showToast } from "../../utilities/toast";
import { matchesSearch } from "../../utilities/search";
import { canExportModule } from "../../../shared/exportAccess";
import { resolveUserRole } from "../../../shared/navigationAccess";
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
const button = {
  padding: 12,
  margin: 4,
  backgroundColor: "#26866f",
  borderRadius: 6,
};
function Action({ children, onPress, disabled = false }) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      style={[button, disabled && { opacity: 0.45 }]}
      onPress={onPress}
    >
      <AppText
        style={{
          color: "white",
          fontWeight: "600",
        }}
      >
        {children}
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
  const canCreate = userRole === "mechanic";
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
    setOnlyMine(false);
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
    <View
      style={{
        flex: 1,
        padding: 12,
        backgroundColor: "#f7faf8",
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <AppText
          style={{
            fontSize: 19,
            fontWeight: "700",
          }}
        >
          {aircraft || "Flight Logs"}
        </AppText>
        {canCreate && (
          <Action disabled={loading || ongoingFlight} onPress={() => startEntry(aircraft)}>New Entry</Action>
        )}
      </View>
      {canCreate && ongoingFlight && (
        <AppText style={{ color: "#64766e", marginTop: 4, marginBottom: 12 }}>
          Complete this aircraft's ongoing flight log before creating a new entry.
        </AppText>
      )}
      {!!aircraft && (
        <>
          <Action onPress={() => chooseAircraft("")}>Back to Aircraft</Action>
          <SearchBar
            value={query}
            onChangeText={setQuery}
            placeholder="Search flight logs or crew"
          />
          <ScrollView
            horizontal
            style={{
              flexGrow: 0,
              marginBottom: 8,
            }}
          >
            {[
              ["all", "All Stages"],
              ...Object.entries(FLIGHT_STAGES).map(([value, step]) => [
                value,
                step.label,
              ]),
            ].map(([value, label]) => (
              <TouchableOpacity
                key={value}
                onPress={() => setStatus(value)}
                style={{
                  padding: 10,
                  borderRadius: 6,
                  margin: 2,
                  backgroundColor: status === value ? "#d1ede0" : "white",
                }}
              >
                <AppText>{label}</AppText>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity
            accessibilityRole="checkbox"
            accessibilityState={{
              checked: onlyMine,
            }}
            onPress={() => setOnlyMine((value) => !value)}
            style={{
              padding: 10,
            }}
          >
            <AppText>{onlyMine ? "[x]" : "[ ]"} Needs My Action</AppText>
          </TouchableOpacity>
        </>
      )}
      {!aircraft ? (
        <AircraftLogGroups
          isNew={isNew}
          refreshing={loading}
          onRefresh={() => refresh(true)}
          records={logs}
          loading={loading}
          sortBy="latestActivity"
          query={aircraftQuery}
          onQueryChange={setAircraftQuery}
          onSelect={chooseAircraft}
        />
      ) : (
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
            return (
              <InfoCard
                key={log._id}
                title={log.controlNo || "Flight Log"}
                right={isNew(log) ? <NewLogBadge /> : null}
                subtitle={step.label}
                onPress={() => setOpened(log._id)}
              >
                <FieldRow label="Date" value={log.date} />
                <FieldRow
                  label="Latest update"
                  value={formatDateTime(log.updatedAt || log.createdAt)}
                />
                <FieldRow
                  label="Next action"
                  value={`${step.next}${step.crew ? ` — ${log[step.crew]?.name || "Unassigned"}` : ""}`}
                />
                <Action onPress={() => setOpened(log._id)}>
                  {needsMyFlightAction(user, log)
                    ? "Continue Workflow"
                    : "Open Record"}
                </Action>
                {canExportModule(userRole, "flightLogs") && (
                  <Action
                    onPress={() =>
                      exportFlightLogPdf(log).catch((error) =>
                        showToast(error.message),
                      )
                    }
                  >
                    Export PDF
                  </Action>
                )}
              </InfoCard>
            );
          }}
        />
      )}
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
