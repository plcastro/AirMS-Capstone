import InspectionConfirmationPrompt from "./InspectionConfirmationPrompt";
import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  View,
  FlatList,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Share,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import {
  SafeAreaProvider,
  initialWindowMetrics,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Modal from "../common/AppModal";
import AppText from "../common/AppText";
import { COLORS } from "../../stylesheets/colors";
import PinVerifiedSignatureModal from "../common/PinVerifiedSignatureModal";
import FlightLogEditEntry from "./FlightLogEditEntry";
import { AuthContext } from "../../Context/AuthContext";
import { getAuthHeaders } from "../../utilities/mobileApi";
import { API_BASE } from "../../utilities/API_BASE";
import {
  isAssignedFlightCrew,
  getAssignedCrewField,
  normalizeCrewRole,
} from "../../../shared/flightCrewAccess";
import {
  preflightSignatureForRelease,
  pilotAcceptance,
  nextFlightStep,
  needsMyFlightAction,
  flightEditPermissions,
  flightDraftBaseChanged,
} from "../../../shared/flightWorkflow";
import {
  describeAmendment,
  describeHistoryEvent,
} from "../../../shared/flightHistoryFormat";
import AS from "../../../shared/as350InspectionChecklist.json";
import BP from "../../../shared/b412PreInspectionChecklist.json";
import BO from "../../../shared/b412PostInspectionChecklist.json";
const panel = {
  padding: 14,
  marginBottom: 10,
  borderRadius: 12,
  backgroundColor: COLORS.white,
  elevation: 1,
  shadowColor: COLORS.black,
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.06,
  shadowRadius: 3,
};
const input = {
  borderWidth: 1,
  borderColor: COLORS.border,
  padding: 10,
  borderRadius: 8,
  marginVertical: 5,
  color: COLORS.black,
  fontSize: 12,
};
const when = (value) => (value ? new Date(value).toLocaleString() : "");
function Action({ children, onPress, disabled, secondary = false }) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={{
        padding: 12,
        backgroundColor: disabled ? COLORS.grayLight : secondary ? COLORS.white : COLORS.primaryLight,
        borderWidth: secondary ? 1 : 0,
        borderColor: COLORS.grayMedium,
        borderRadius: 8,
        marginVertical: 5,
        maxWidth: "100%",
        alignItems: "center",
      }}
    >
      <AppText
        style={{
          color: disabled ? COLORS.grayDark : secondary ? COLORS.grayDark : COLORS.white,
          fontWeight: "600",
          fontSize: 12,
        }}
      >
        {children}
      </AppText>
    </TouchableOpacity>
  );
}
// Native Modals on iOS don't inherit the app's safe-area context, so the
// workspace gets its own provider and applies the insets as explicit padding.
function ModalSafeArea({ children, style }) {
  const insets = useSafeAreaInsets();
  const fallback = initialWindowMetrics?.insets;
  return (
    <View
      style={[
        {
          flex: 1,
          paddingTop: Math.max(insets.top, fallback?.top || 0),
          paddingBottom: Math.max(insets.bottom, fallback?.bottom || 0),
          paddingLeft: insets.left,
          paddingRight: insets.right,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
function Choice({ values, value, onChange, disabled, inset = 0 }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ flexGrow: 0 }}
      contentContainerStyle={{
        gap: 8,
        paddingVertical: 8,
        paddingLeft: inset,
        paddingRight: inset + 16,
        alignItems: "center",
      }}
    >
      {values.map(([key, label]) => (
        <TouchableOpacity
          key={key}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityState={{ selected: value === key, disabled: !!disabled }}
          onPress={() => onChange(key)}
          style={{
            paddingVertical: 8,
            paddingHorizontal: 16,
            borderWidth: 1,
            borderColor: value === key ? "#26866f" : "#ddd",
            backgroundColor: value === key ? "#e3f2ec" : "#fff",
            borderRadius: 20,
          }}
        >
          <AppText
            numberOfLines={1}
            style={{
              fontSize: 13,
              color: value === key ? "#245e49" : "#4b5b54",
              fontWeight: value === key ? "600" : "400",
            }}
          >
            {label}
          </AppText>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}
export default function FlightWorkspace({
  id,
  visible,
  onClose,
  onChanged,
  onViewed,
  initialSection = "flight",
  inspectionMode = false,
  readOnly = false,
}) {
  const { user } = useContext(AuthContext);
  const viewedCallback = useRef(onViewed);
  useEffect(() => { viewedCallback.current = onViewed; }, [onViewed]);
  const [listHeight, setListHeight] = useState(0);
  const inspectionSection = inspectionMode && ["pre", "post"].includes(initialSection) ? initialSection : null;
  const [workspace, setWorkspace] = useState(null),
    [source, setSource] = useState(null),
    [draft, setDraft] = useState(null),
    [tab, setTab] = useState("flight");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [sign, setSign] = useState(null),
    [review, setReview] = useState(null),
    [comment, setComment] = useState(""),
    [returning, setReturning] = useState(false);
  const [defect, setDefect] = useState(null),
    [amendment, setAmendment] = useState(null),
    [recovery, setRecovery] = useState(null),
    [saveState, setSaveState] = useState("Saved on server");
  const [inspectionPrompt, setInspectionPrompt] = useState(null);
  const [showMaintenanceDue, setShowMaintenanceDue] = useState(false);
  const storageKey = `flight-draft:${user?.id || user?._id}:${id}`;
  const api = useCallback(async (path, body, method = "PUT") => {
    const response = await fetch(`${API_BASE}/api/flightlogs/${path}`, {
      method: body === undefined ? "GET" : method,
      headers: await getAuthHeaders({
        "Content-Type": "application/json",
        "x-action-confirmed": "true",
      }),
      ...(body === undefined
        ? {}
        : {
            body: JSON.stringify({
              ...body,
              confirmAction: true,
            }),
          }),
    });
    const data = await response.json();
    if (!response.ok)
      throw Error(
        data.message || "Could not save. Your local draft is retained.",
      );
    return data.data;
  }, []);
  const reload = useCallback(
    async (preserve = false) => {
      const data = await api(`${id}/workspace`);
      const changed =
        preserve &&
        draft &&
        flightDraftBaseChanged(workspace?.flightLog, data.flightLog);
      if (changed)
        setRecovery({
          draft,
          version: workspace?.flightLog?.__v,
          savedAt: new Date().toISOString(),
        });
      setWorkspace(data);
      if (!preserve || changed) {
        setSource(data.flightLog);
        setDraft(data.flightLog);
        viewedCallback.current?.(data);
      }
      return data;
    },
    [api, id, draft, workspace],
  );
  useEffect(() => {
    if (!visible || !id) return;
    let active = true;
    setWorkspace(null);
    setShowMaintenanceDue(false);
    setBusy(true);
    setError("");
    setTab(
      inspectionSection ||
        (["flight", "preparation", "defects", "history"].includes(initialSection)
          ? initialSection
          : "flight"),
    );
    Promise.all([api(`${id}/workspace`), AsyncStorage.getItem(storageKey)])
      .then(([data, cached]) => {
        if (!active) return;
        setWorkspace(data);
        setSource(data.flightLog);
        setDraft(data.flightLog);
        viewedCallback.current?.(data);
        try {
          setRecovery(cached ? JSON.parse(cached) : null);
        } catch {
          setRecovery(null);
        }
        setSaveState("Saved on server");
      })
      .catch((e) => active && setError(e.message))
      .finally(() => active && setBusy(false));
    return () => {
      active = false;
    };
  }, [id, visible, api, storageKey, initialSection, inspectionSection]);
  useEffect(() => {
    if (
      !visible ||
      readOnly ||
      !draft ||
      !workspace ||
      recovery ||
      getAssignedCrewField(user) !== "assignedMechanic" ||
      !isAssignedFlightCrew(user, workspace.flightLog) ||
      workspace.flightLog.status === "completed"
    )
      return;
    const timer = setTimeout(() => {
      AsyncStorage.setItem(
        storageKey,
        JSON.stringify({
          draft,
          version: workspace.flightLog.__v,
          savedAt: new Date().toISOString(),
        }),
      )
        .then(() =>
          setSaveState("Draft kept on this device — Save Draft to sync"),
        )
        .catch(() =>
          setSaveState(
            "Local storage unavailable — save to server before closing",
          ),
        );
    }, 800);
    return () => clearTimeout(timer);
  }, [visible, draft, workspace, storageKey, user, recovery, readOnly]);
  const log = workspace?.flightLog,
    permissions = readOnly ? {} : flightEditPermissions(user, log || {}),
    step = nextFlightStep(log || {}),
    assigned = !readOnly && isAssignedFlightCrew(user, log),
    mechanic = getAssignedCrewField(user) === "assignedMechanic";
  const execute = async (
    path,
    body,
    method = "PUT",
    preserve = false,
    throwOnError = false,
  ) => {
    setBusy(true);
    setError("");
    try {
      await api(path, body, method);
      if (!preserve) {
        await AsyncStorage.removeItem(storageKey);
        setRecovery(null);
        setSaveState("Saved on server");
      }
      await reload(preserve);
      onChanged?.();
      return true;
    } catch (e) {
      setError(e.message);
      if (throwOnError) throw e;
      return false;
    } finally {
      setBusy(false);
    }
  };
  const acceptance = !readOnly && pilotAcceptance(
    user,
    log || {},
    workspace?.preInspections || [],
  );
  const advance = async () => {
    if (step.action === "complete") {
      setBusy(true);
      try {
        setReview(
          await api(
            `${id}/review`,
            {
              changes: draft,
              expectedVersion: log.__v || 0,
            },
            "POST",
          ),
        );
      } catch (e) {
        setError(e.message);
      } finally {
        setBusy(false);
      }
      return;
    }
    const releaseSignature =
      step.action === "release"
        ? preflightSignatureForRelease(log, workspace.preInspections)
        : "";
    if (step.action === "release" && !releaseSignature) {
      setError(
        "Open Pre-Flight Inspections to complete and sign the linked inspection before releasing the flight log.",
      );
      return;
    }
    setSign({
      initialSignature: releaseSignature,
      reusePreflight: step.action === "release",
      path: `${id}/${step.action}`,
      body: {
        ...(mechanic ? { changes: draft } : {}),
        expectedVersion: log.__v || 0,
      },
      title: step.button,
    });
  };
  const submitInspection = async ({
    allGood,
    resolution = "",
    checked = [],
    discrepancies = {},
    draft = false,
  }) => {
    const { kind, record, complete, values } = inspectionPrompt;
    if (!record) {
      setError("The linked inspection is missing. Add it before continuing.");
      return;
    }
    const task =
      complete && allGood
        ? {
            path: `${id}/complete`,
            body: {
              changes: draft,
              expectedVersion: log.__v || 0,
              postFlightConfirmation: {
                allGood: true,
                appendSignature: true,
                resolution,
                checked,
                discrepancies,
                inspectionId: record._id,
              },
            },
            title: "Confirm Post-Flight & Close Flight Record",
            appendSignature: true,
          }
        : {
            path: `${id}/inspections/${kind}/${record._id}`,
            body: {
              changes: values || {},
              expectedVersion: record.__v || 0,
              flightExpectedVersion: log.__v || 0,
              flightChanges: draft,
              confirmation: {
                allGood,
                resolution,
                checked,
                discrepancies,
                draft,
              },
            },
            title: `Confirm ${kind === "pre" ? "Pre-Flight" : "Post-Flight"} Inspection`,
            preserve: true,
            appendSignature: true,
          };
    if (allGood) {
      setSign(task);
      setInspectionPrompt(null);
    } else if (await execute(task.path, task.body, "PUT", true))
      setInspectionPrompt(null);
  };
  const saveInspection = (kind, record, values, status) => {
    const task = {
      path: `${id}/inspections/${kind}/${record._id}`,
      body: {
        ...(mechanic ? { changes: values } : {}),
        status,
        expectedVersion: record.__v || 0,
      },
      title:
        kind === "pre"
          ? status === "completed"
            ? "Accept Pre-Flight"
            : "Release Pre-Flight"
          : "Complete Post-Flight",
      preserve: true,
    };
    if (status === record.status)
      return execute(task.path, task.body, "PUT", true);
    setSign(task);
  };
  const saveDefect = () => {
    const task = {
      path: `${id}/defects${defect._id ? `/${defect._id}` : ""}`,
      body: {
        ...defect,
        expectedVersion: log.__v || 0,
        defectVersion: defect.__v || 0,
      },
      method: defect._id ? "PUT" : "POST",
      preserve: true,
      title: "Certify Defect Disposition",
    };
    if (defect.status === "open")
      execute(task.path, task.body, task.method, true).then(
        (ok) => ok && setDefect(null),
      );
    else setSign(task);
  };
  // Inspection tabs only appear while an inspection is on discrepancy hold, so
  // the assigned mechanic can resolve it and sign.
  const heldInspectionKinds = ["pre", "post"].filter((kind) =>
    (kind === "pre" ? workspace?.preInspections : workspace?.postInspections)
      ?.some((record) => record.confirmation?.allGood === false),
  );
  const heldInspectionKey = heldInspectionKinds.join(",");
  useEffect(() => {
    if (
      !inspectionSection &&
      ["pre", "post"].includes(tab) &&
      !heldInspectionKey.split(",").includes(tab)
    )
      setTab("flight");
  }, [inspectionSection, tab, heldInspectionKey]);
  const workspaceRows = useMemo(() => {
    const rows = (kind, values = []) =>
      values.map((value, index) => ({ kind, value, index }));
    if (!workspace) return [];
    if (tab === "history")
      return [
        ...rows("amendment", workspace.amendments),
        ...rows("history", [...(workspace.history || [])].reverse()),
      ];
    if (tab === "defects") return rows("defect", workspace.defects);
    if (tab === "pre" || tab === "post")
      return rows(
        "inspection",
        tab === "pre" ? workspace.preInspections : workspace.postInspections,
      );
    return [];
  }, [workspace, tab]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <ModalSafeArea style={{ backgroundColor: "#f7faf8" }}>
        <View
          style={{
            paddingLeft: 16,
            paddingRight: 8,
            paddingVertical: 8,
            backgroundColor: "#fff",
            borderBottomWidth: 1,
            borderBottomColor: "#E8E8E8",
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
          }}
        >
          <View style={{ flex: 1 }}>
          <AppText
            style={{
              fontSize: 16,
              fontWeight: "700",
              color: COLORS.black,
            }}
          >
            {inspectionSection ? `${inspectionSection === "pre" ? "Pre-Flight" : "Post-Flight"} Inspection` : "Flight Workspace"}
          </AppText>
          {log && <AppText style={{ color: COLORS.grayDark, fontSize: 12, marginTop: 2 }}>{log.rpc} · {log.controlNo}</AppText>}
          </View>
          {busy && <ActivityIndicator />}
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Close flight workspace"
            onPress={onClose}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#edf4ef",
            }}
          >
            <MaterialCommunityIcons name="close" size={22} color="#245e49" />
          </TouchableOpacity>
        </View>
        {log && !inspectionSection && <View style={{ backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e1ebe5" }}>
          <Choice inset={12} values={[["flight", "Flight Log"], ["preparation", "Preparation Checks"], ...heldInspectionKinds.map((kind) => [kind, kind === "pre" ? "Pre-Flight Inspection (On Hold)" : "Post-Flight Inspection (On Hold)"]), ["defects", "Aircraft Defects"], ["history", "History & Amendments"]]} value={tab} onChange={setTab} />
        </View>}
        <FlatList
          key={tab}
          style={{ flex: 1 }}
          keyboardShouldPersistTaps="handled"
          onLayout={(e) => setListHeight(e.nativeEvent.layout.height)}
          contentContainerStyle={{
            padding: 12,
            width: "100%",
            maxWidth: 900,
            alignSelf: "center",
          }}
          data={workspaceRows}
          keyExtractor={(row) => row.kind + ":" + (row.value._id || row.index)}
          initialNumToRender={10}
          maxToRenderPerBatch={6}
          windowSize={7}
          ListHeaderComponent={
            <>
              {!!error && (
                <View style={panel}>
                  <AppText
                    accessibilityRole="alert"
                    style={{
                      color: COLORS.dangerBorder,
                    }}
                  >
                    {error}
                  </AppText>
                  <Action
                    onPress={async () => {
                      const local = draft
                        ? {
                            draft,
                            version: log?.__v,
                            savedAt: new Date().toISOString(),
                          }
                        : null;
                      try {
                        await reload();
                        setRecovery(local);
                        setError("");
                      } catch (e) {
                        setError(e.message);
                      }
                    }}
                  >
                    Refresh Record
                  </Action>
                </View>
              )}
              {log && (
                <>
                  <View style={panel}>
                    <AppText style={{ color: COLORS.primaryLight, fontSize: 12, fontWeight: "700", marginBottom: 6 }}>{step.label}</AppText>
                    <AppText
                      style={{
                        fontWeight: "700",
                      }}
                    >
                      {step.next}
                      {step.crew
                        ? ` — ${log[step.crew]?.name || "Unassigned"}`
                        : ""}
                    </AppText>
                    <View style={{ gap: 10, marginVertical: 12 }}>
                      <AppText style={{ lineHeight: 22 }}>
                        <AppText style={{ fontWeight: "600" }}>Pilot: </AppText>
                        {log.assignedPilot?.name || "Unassigned"}
                      </AppText>
                      <AppText style={{ lineHeight: 22 }}>
                        <AppText style={{ fontWeight: "600" }}>Mechanic: </AppText>
                        {log.assignedMechanic?.name || "Unassigned"}
                      </AppText>
                    </View>
                    <AppText>{workspace.readiness.aircraftStatus}</AppText>
                    {saveState !== "Saved on server" && (
                      <AppText>{saveState}</AppText>
                    )}
                    {workspace.history
                      .filter((e) => e.action === "return")
                      .slice(-1)
                      .map((e, i) => (
                        <AppText key={i}>
                          Correction requested: {e.comment}
                        </AppText>
                      ))}
                  </View>
                  {acceptance && (
                    <View style={panel}>
                      <AppText style={{ fontWeight: "700" }}>
                        Pilot acceptance
                      </AppText>
                      <AppText>{acceptance.message}</AppText>
                      <Action
                        disabled={busy || !acceptance.canAcceptFlight}
                        onPress={advance}
                      >
                        Accept Pre-Flight & Flight Log
                      </Action>
                    </View>
                  )}
                  {!readOnly && recovery && mechanic && (
                    <View style={panel}>
                      <AppText>
                        Local draft from {when(recovery.savedAt)}.{" "}
                        {recovery.version !== log.__v
                          ? "The server record has changed; review restored fields before saving."
                          : ""}
                      </AppText>
                      <Action
                        onPress={() => {
                          setSource({
                            ...log,
                            ...recovery.draft,
                            initialInspectionSignature:
                              log.initialInspectionSignature,
                            status: log.status,
                            __v: log.__v,
                          });
                          setRecovery(null);
                        }}
                      >
                        Restore Draft
                      </Action>
                      <Action
                        onPress={() => {
                          AsyncStorage.removeItem(storageKey);
                          setRecovery(null);
                        }}
                      >
                        Discard Local Draft
                      </Action>
                    </View>
                  )}
                  {tab === "flight" && (
                    <>
                      <View
                        style={{
                          height: Math.max(360, listHeight - 24),
                          borderRadius: 12,
                          overflow: "hidden",
                          borderWidth: 1,
                          borderColor: "#e1ebe5",
                        }}
                      >
                        <FlightLogEditEntry
                          embedded
                          visible={visible}
                          logData={source}
                          userRole={user?.jobTitle?.toLowerCase()}
                          currentUser={user}
                          permissions={permissions}
                          initialTab={step.tab}
                          readOnly={
                            !assigned || !mechanic || log.status === "completed"
                          }
                          onDraftChange={setDraft}
                          onClose={onClose}
                        />
                      </View>
                    </>
                  )}
                  {tab === "preparation" && (
                    <View style={panel}>
                      {permissions.preparation &&
                      [
                        ...workspace.readiness.missing,
                        ...workspace.readiness.warnings,
                      ].length ? (
                        [
                          ...workspace.readiness.missing,
                          ...workspace.readiness.warnings,
                        ].map((message, i) => (
                          <AppText key={i} style={{ marginVertical: 4 }}>
                            - {message}
                          </AppText>
                        ))
                      ) : (
                        <AppText>
                          No preparation checks require attention.
                        </AppText>
                      )}
                      {!!workspace.readiness.maintenanceDue?.length && (
                        <>
                          <AppText style={{ marginTop: 12 }}>
                            {workspace.readiness.maintenanceDue.length}{" "}
                            maintenance warnings - release is allowed
                          </AppText>
                          <Action
                            onPress={() =>
                              setShowMaintenanceDue((value) => !value)
                            }
                          >
                            {showMaintenanceDue
                              ? "Hide overdue items"
                              : "View overdue items from Parts Lifespan Monitoring"}
                          </Action>
                          {showMaintenanceDue &&
                            workspace.readiness.maintenanceDue.map(
                              (item, i) => (
                                <AppText key={i} style={{ marginVertical: 4 }}>
                                  {item}
                                </AppText>
                              ),
                            )}
                        </>
                      )}
                    </View>
                  )}
                  {["pre", "post"].includes(tab) && (
                    <>
                      {assigned && mechanic && permissions.preparation && (
                        <Action
                          onPress={() =>
                            execute(
                              `${id}/inspections`,
                              {
                                expectedVersion: log.__v || 0,
                              },
                              "POST",
                              true,
                            )
                          }
                        >
                          Add Linked Inspection Pair
                        </Action>
                      )}
                      {null}
                      {!(
                        tab === "pre"
                          ? workspace.preInspections
                          : workspace.postInspections
                      ).length && (
                        <AppText>
                          The assigned mechanic can add an inspection pair
                          during preparation.
                        </AppText>
                      )}
                    </>
                  )}
                  {tab === "defects" && (
                    <>
                      {assigned && mechanic && log.status !== "completed" && (
                        <Action
                          onPress={() =>
                            setDefect({
                              description: "",
                              status: "open",
                              resolution: "",
                              evidence: "",
                            })
                          }
                        >
                          Report Defect
                        </Action>
                      )}
                      {null}
                    </>
                  )}
                  {tab === "history" && (
                    <>
                      <Action
                        onPress={() =>
                          Share.share({
                            message: JSON.stringify(workspace, null, 2),
                          })
                        }
                      >
                        Share Record & Audit History
                      </Action>
                      {permissions.canAmend && (
                        <Action
                          onPress={() =>
                            setAmendment({
                              field: mechanic
                                ? "maintenance_work"
                                : "flight_details",
                              after: "",
                              comment: "",
                            })
                          }
                        >
                          Add Signed Amendment
                        </Action>
                      )}
                      {null}
                      {null}
                    </>
                  )}
                </>
              )}
            </>
          }
          renderItem={({ item: row }) => {
            if (row.kind === "inspection")
              return ((record) => (
                <Inspection
                  flightStage={log.status}
                  key={`${record._id}:${record.__v}`}
                  record={record}
                  kind={tab}
                  editable={assigned && log.status !== "completed"}
                  mechanic={mechanic}
                  returnBlocked={["mechanic", "maintenance manager"].includes(
                    normalizeCrewRole(user),
                  )}
                  onConfirm={(kind, record, values) =>
                    setInspectionPrompt({ kind, record, values })
                  }
                  onSave={saveInspection}
                  onReturn={(reason) =>
                    execute(
                      `${id}/inspections/${tab}/${record._id}`,
                      {
                        action: "return",
                        comment: reason,
                        expectedVersion: record.__v || 0,
                      },
                      "PUT",
                      true,
                    )
                  }
                />
              ))(row.value, row.index);
            if (row.kind === "defect")
              return ((d) => (
                <View key={d._id} style={panel}>
                  <AppText
                    style={{
                      fontWeight: "700",
                    }}
                  >
                    {d.status}: {d.description}
                  </AppText>
                  <AppText>{d.resolution}</AppText>
                  {!!d.deferralReference && (
                    <AppText>
                      Deferral basis: {d.deferralReference} · Due:{" "}
                      {when(d.dueDate)}
                    </AppText>
                  )}
                  {d.signedBy && (
                    <AppText>
                      {d.signedBy.name} · {when(d.signedBy.timestamp)}
                    </AppText>
                  )}
                  {assigned && mechanic && log.status !== "completed" && (
                    <Action onPress={() => setDefect(d)}>
                      Record Disposition
                    </Action>
                  )}
                </View>
              ))(row.value, row.index);
            if (row.kind === "amendment")
              return <HistoryCard entry={describeAmendment(row.value)} />;
            if (row.kind === "history")
              return <HistoryCard entry={describeHistoryEvent(row.value)} />;
            return null;
          }}
        />
        {log && (
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              justifyContent: "flex-end",
              gap: 8,
              padding: 12,
              borderTopWidth: 1,
              borderTopColor: "#dce6e1",
              backgroundColor: "white",
            }}
          >
            {!readOnly && mechanic && needsMyFlightAction(user, log) && (
              <Action disabled={busy} onPress={advance}>
                {step.button}
              </Action>
            )}
            {permissions.canSave && (
              <Action
                disabled={busy}
                onPress={() =>
                  execute(id, {
                    changes: draft,
                    expectedVersion: log.__v || 0,
                  })
                }
              >
                Save Draft
              </Action>
            )}
            {permissions.canReturn && (
              <Action
                onPress={() => {
                  setComment("");
                  setReturning(true);
                }}
              >
                Return for Correction
              </Action>
            )}
          </View>
        )}
        {!sign && (returning || !!review || !!defect || !!amendment) && (
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
              zIndex: 900,
              backgroundColor: "rgba(0, 0, 0, 0.45)",
              justifyContent: "center",
              padding: 16,
            }}
          >
            <ScrollView
              style={{
                maxHeight: "85%",
                backgroundColor: "#fff",
                borderRadius: 12,
              }}
              contentContainerStyle={{
                padding: 18,
              }}
              keyboardShouldPersistTaps="handled"
            >
              {returning && (
                <>
                  <AppText>Explain what needs correcting.</AppText>
                  <TextInput
                    style={input}
                    multiline
                    value={comment}
                    onChangeText={setComment}
                  />
                  <Action
                    onPress={async () => {
                      if (
                        await execute(`${id}/return`, {
                          changes: draft,
                          comment,
                          expectedVersion: log.__v || 0,
                        })
                      )
                        setReturning(false);
                    }}
                  >
                    Return
                  </Action>
                </>
              )}
              {review && (
                <>
                  <AppText
                    style={{
                      fontWeight: "700",
                    }}
                  >
                    Review Before Closure
                  </AppText>
                  {review.missing.map((m, i) => (
                    <AppText
                      key={i}
                      style={{
                        color: COLORS.dangerBorder,
                      }}
                    >
                      • {m}
                    </AppText>
                  ))}
                  {review.totals.map((row) => (
                    <View key={row.path} style={panel}>
                      <AppText>
                        {row.item}
                        {row.unit ? ` (${row.unit})` : ""}
                      </AppText>
                      <AppText>
                        Brought forward: {row.broughtForward ?? "Missing"} ·
                        This flight: {row.thisFlight ?? "Missing"} · To date:{" "}
                        {row.toDate ?? "Missing"}
                      </AppText>
                    </View>
                  ))}
                  {review.monitoringReconciliation?.required && (
                    <View style={panel}>
                      <AppText
                        style={{
                          fontWeight: "700",
                        }}
                      >
                        Parts Monitoring changed after release
                      </AppText>
                      <AppText>
                        Compare the baseline before signing reconciliation.
                        Confirm this flight has not already been added.
                      </AppText>
                      {(review.monitoringReconciliation.rows || []).map(
                        (row) => (
                          <View
                            key={row.field}
                            style={{
                              flexDirection: "row",
                              alignItems: "flex-start",
                              gap: 8,
                              marginTop: 6,
                            }}
                          >
                            <View
                              accessibilityLabel={
                                row.changed ? "Changed since release" : undefined
                              }
                              style={{
                                width: 10,
                                height: 10,
                                borderRadius: 5,
                                marginTop: 5,
                                backgroundColor: row.changed
                                  ? COLORS.dangerBorder
                                  : "transparent",
                              }}
                            />
                            <View style={{ flex: 1 }}>
                              <AppText
                                style={row.changed ? { fontWeight: "700" } : null}
                              >
                                {row.item} ({row.unit})
                              </AppText>
                              <AppText>
                                At release: {row.previous ?? "Missing"} ·
                                Current: {row.current ?? "Missing"}
                                {row.delta == null
                                  ? ""
                                  : ` · Change: ${row.delta > 0 ? "+" : ""}${row.delta}`}
                              </AppText>
                            </View>
                          </View>
                        ),
                      )}
                      <TextInput
                        style={input}
                        multiline
                        placeholder="Reason for using the current monitoring baseline"
                        value={comment}
                        onChangeText={setComment}
                      />
                      <Action
                        disabled={!comment.trim()}
                        onPress={() => {
                          setReview(null);
                          setSign({
                            path: `${id}/reconcile`,
                            body: {
                              expectedVersion: log.__v || 0,
                              comment,
                            },
                            preserve: true,
                            title: "Sign Monitoring Reconciliation",
                          });
                        }}
                      >
                        Sign Reconciliation
                      </Action>
                    </View>
                  )}
                  <Action
                    disabled={
                      !!review.missing.length ||
                      review.monitoringReconciliation?.required
                    }
                    onPress={() => {
                      setReview(null);
                      setInspectionPrompt({
                        kind: "post",
                        record: workspace.postInspections[0],
                        complete: true,
                      });
                    }}
                  >
                    Continue to Post-Flight
                  </Action>
                </>
              )}
              {defect && (
                <>
                  <AppText>Aircraft Defect</AppText>
                  <TextInput
                    style={input}
                    placeholder="Description"
                    multiline
                    editable={!defect._id}
                    value={defect.description}
                    onChangeText={(value) =>
                      setDefect({
                        ...defect,
                        description: value,
                      })
                    }
                  />
                  <TextInput
                    style={input}
                    placeholder="Evidence link (HTTPS)"
                    editable={!defect._id}
                    value={defect.evidence}
                    onChangeText={(value) =>
                      setDefect({
                        ...defect,
                        evidence: value,
                      })
                    }
                  />
                  <Choice
                    disabled={!mechanic}
                    values={["open", "rectified", "deferred"].map((value) => [
                      value,
                      value,
                    ])}
                    value={defect.status}
                    onChange={(value) =>
                      setDefect({
                        ...defect,
                        status: value,
                      })
                    }
                  />
                  <TextInput
                    style={input}
                    multiline
                    placeholder="Work performed / deferral limitations"
                    value={defect.resolution}
                    onChangeText={(value) =>
                      setDefect({
                        ...defect,
                        resolution: value,
                      })
                    }
                  />
                  {defect.status === "deferred" && (
                    <>
                      <TextInput
                        style={input}
                        placeholder="Approved deferral reference"
                        value={defect.deferralReference}
                        onChangeText={(value) =>
                          setDefect({
                            ...defect,
                            deferralReference: value,
                          })
                        }
                      />
                      <TextInput
                        style={input}
                        placeholder="Deadline: YYYY-MM-DDTHH:mm+08:00"
                        value={defect.dueDate || ""}
                        onChangeText={(value) =>
                          setDefect({
                            ...defect,
                            dueDate: value,
                          })
                        }
                      />
                    </>
                  )}
                  <Action onPress={saveDefect}>
                    Save{defect.status === "open" ? "" : " & Sign Disposition"}
                  </Action>
                </>
              )}
              {amendment && (
                <>
                  <AppText>
                    The original record remains intact. Usage corrections
                    require maintenance-ledger reconciliation.
                  </AppText>
                  <Choice
                    values={(mechanic
                      ? [
                          "flight_details",
                          "maintenance_work",
                          "servicing",
                          "discrepancies",
                        ]
                      : ["flight_details", "discrepancies"]
                    ).map((value) => [value, value.replace(/_/g, " ")])}
                    value={amendment.field}
                    onChange={(field) =>
                      setAmendment({
                        ...amendment,
                        field,
                      })
                    }
                  />
                  <TextInput
                    style={input}
                    multiline
                    placeholder="Corrected information"
                    value={amendment.after}
                    onChangeText={(after) =>
                      setAmendment({
                        ...amendment,
                        after,
                      })
                    }
                  />
                  <TextInput
                    style={input}
                    multiline
                    placeholder="Reason"
                    value={amendment.comment}
                    onChangeText={(comment) =>
                      setAmendment({
                        ...amendment,
                        comment,
                      })
                    }
                  />
                  <Action
                    onPress={() =>
                      setSign({
                        path: `${id}/amend`,
                        body: {
                          correction: {
                            field: amendment.field,
                            after: amendment.after,
                          },
                          comment: amendment.comment,
                          expectedVersion: log.__v || 0,
                        },
                        title: "Sign Amendment",
                      })
                    }
                  >
                    Review & Sign
                  </Action>
                </>
              )}
              {!!error && (
                <AppText
                  style={{
                    color: COLORS.dangerBorder,
                  }}
                >
                  {error}
                </AppText>
              )}
              <Action
                onPress={() => {
                  setReturning(false);
                  setReview(null);
                  setDefect(null);
                  setAmendment(null);
                }}
              >
                Cancel
              </Action>
            </ScrollView>
          </KeyboardAvoidingView>
        )}
        {inspectionPrompt && (
          <InspectionConfirmationPrompt
            kind={inspectionPrompt.kind}
            record={inspectionPrompt.record}
            items={inspectionChecklist(
              inspectionPrompt.kind,
              inspectionPrompt.record,
            )}
            initialChecked={inspectionCheckedKeys(
              inspectionPrompt.kind,
              inspectionPrompt.record,
              inspectionPrompt.values,
            )}
            error={error}
            busy={busy}
            onCancel={() => setInspectionPrompt(null)}
            onSign={(resolution, checked) =>
              submitInspection({ allGood: true, resolution, checked })
            }
            onDraft={(checked, discrepancies) =>
              submitInspection({
                allGood: false,
                checked,
                discrepancies,
                draft: !Object.keys(discrepancies).length,
              })
            }
          />
        )}
        <PinVerifiedSignatureModal
          pinOnly={sign?.reusePreflight === true}
          confirmDescription={
            sign?.reusePreflight
              ? "Your Pre-Flight signature will be appended. Enter your six-digit PIN to release the flight log."
              : undefined
          }
          initialSignature={
            sign?.initialSignature ||
            (sign?.appendSignature
              ? log?.initialInspectionSignature?.signature
              : "")
          }
          useNativeModal={false}
          visible={!!sign}
          title={sign?.title || "Sign"}
          description="Review the submitted information, then confirm your signature with your six-digit PIN."
          onClose={() => setSign(null)}
          onSave={async (signature, { pin }) => {
            const ok = await execute(
              sign.path,
              {
                ...sign.body,
                signature,
                pin,
              },
              sign.method || "PUT",
              sign.preserve,
              true,
            );
            if (ok) {
              setDefect(null);
              setAmendment(null);
            }
            return ok;
          }}
        />
      </ModalSafeArea>
      </SafeAreaProvider>
    </Modal>
  );
}
function HistoryCard({ entry }) {
  const muted = { color: "#64766e", fontSize: 12 };
  return (
    <View style={panel}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
        <AppText style={{ fontWeight: "700", flexShrink: 1 }}>{entry.title}</AppText>
        {entry.signed && (
          <AppText style={{ fontSize: 11, color: "#245e49", backgroundColor: "#e3f2ec", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, overflow: "hidden" }}>
            Signed
          </AppText>
        )}
      </View>
      <AppText style={[muted, { marginTop: 4 }]}>
        {entry.changedBy} · {entry.at}
        {entry.version !== null ? ` · Version ${entry.version}` : ""}
      </AppText>
      {!!entry.comment && (
        <AppText style={{ marginTop: 8, fontStyle: "italic" }}>“{entry.comment}”</AppText>
      )}
      {entry.rows.length > 0 ? (
        <View style={{ marginTop: 10, borderTopWidth: 1, borderTopColor: "#eef3f0" }}>
          {entry.rows.map((change, i) => (
            <View key={i} style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#eef3f0" }}>
              <AppText style={{ fontSize: 12, fontWeight: "600", color: "#172b23" }}>{change.field}</AppText>
              <View style={{ flexDirection: "row", gap: 12, marginTop: 4 }}>
                <View style={{ flex: 1 }}>
                  <AppText style={muted}>Old</AppText>
                  <AppText selectable style={{ color: "#8a4b4b" }}>{change.before}</AppText>
                </View>
                <View style={{ flex: 1 }}>
                  <AppText style={muted}>New</AppText>
                  <AppText selectable style={{ color: "#245e49" }}>{change.after}</AppText>
                </View>
              </View>
            </View>
          ))}
          {entry.hiddenCount > 0 && (
            <AppText style={[muted, { marginTop: 6 }]}>
              +{entry.hiddenCount} more field change{entry.hiddenCount === 1 ? "" : "s"}
            </AppText>
          )}
        </View>
      ) : (
        <AppText style={[muted, { marginTop: 8 }]}>No field changes recorded.</AppText>
      )}
    </View>
  );
}
const inspectionChecklist = (kind, record) =>
  /412/.test(record?.aircraftType || "")
    ? (kind === "pre" ? BP : BO).sections.flatMap((section) => section.items)
    : AS[kind];
const inspectionCheckedKeys = (kind, record, values) => {
  const source = values || record;
  const b412 = /412/.test(record?.aircraftType || "");
  return inspectionChecklist(kind, record)
    .filter(
      (item) =>
        (b412 ? source.b412Data?.checks?.[item.key] : source[item.key]) === true,
    )
    .map((item) => item.key);
};
function Inspection({
  kind,
  record,
  editable,
  mechanic,
  returnBlocked,
  onSave,
  onReturn,
  onConfirm,
  flightStage,
}) {
  const [values, setValues] = useState(record),
    [reason, setReason] = useState("");
  const b412 = /412/.test(record.aircraftType || ""),
    checks = b412
      ? (kind === "pre" ? BP : BO).sections.flatMap((s) => s.items)
      : AS[kind],
    writable =
      editable &&
      mechanic &&
      record.status === "pending" &&
      (kind === "pre"
        ? ["pending_release", "returned_to_mechanic"].includes(flightStage)
        : ["accepted", "returned_to_pilot", "submitted"].includes(flightStage));
  return (
    <View style={panel}>
      <AppText
        style={{
          fontWeight: "700",
        }}
      >
        {kind === "pre" ? "Pre-Flight" : "Post-Flight"} · {record.date} ·{" "}
        {record.status}
      </AppText>
      {record.releasedBy?.name && (
        <AppText>
          Certified by {record.releasedBy.name} ·{" "}
          {when(record.releasedBy.timestamp)}
        </AppText>
      )}
      {!mechanic && (
        <AppText>
          {kind === "pre" ? "Fuel on board" : "Notes"}:{" "}
          {(kind === "pre" ? values.fob : values.notes) ?? "Not recorded"}
        </AppText>
      )}
      {mechanic && (
        <TextInput
          style={input}
          editable={writable}
          placeholder={kind === "pre" ? "Fuel on board" : "Notes"}
          value={String((kind === "pre" ? values.fob : values.notes) || "")}
          onChangeText={(value) =>
            setValues({
              ...values,
              [kind === "pre" ? "fob" : "notes"]: value,
            })
          }
        />
      )}
      {checks.map((item) => {
        const checked = b412
          ? values.b412Data?.checks?.[item.key] === true
          : values[item.key] === true;
        return (
          <TouchableOpacity
            key={item.key}
            accessibilityRole="checkbox"
            accessibilityState={{
              checked,
              disabled: !writable,
            }}
            disabled={!writable}
            style={{
              paddingVertical: 10,
              borderBottomWidth: 1,
              borderColor: "#eee",
            }}
            onPress={() =>
              setValues(
                b412
                  ? {
                      ...values,
                      b412Data: {
                        checks: {
                          ...values.b412Data?.checks,
                          [item.key]: !checked,
                        },
                      },
                    }
                  : {
                      ...values,
                      [item.key]: !checked,
                    },
              )
            }
          >
            <AppText>
              {checked ? "☑" : "☐"} {item.title} — {item.description}
            </AppText>
          </TouchableOpacity>
        );
      })}
      {record.confirmation?.allGood === false && (
        <AppText>Inspection on hold: {record.confirmation.remarks}</AppText>
      )}
      {writable && (
        <Action onPress={() => onConfirm(kind, record, values)}>
          Confirm Inspection
        </Action>
      )}
      {editable &&
        !mechanic &&
        kind === "pre" &&
        record.status === "released" &&
        flightStage === "pending_acceptance" && (
          <Action onPress={() => onSave(kind, record, values, "completed")}>
            Accept Pre-Flight
          </Action>
        )}
      {editable &&
        mechanic &&
        !returnBlocked &&
        record.status !== "pending" &&
        (kind === "post"
          ? mechanic
          : ["pending_release", "returned_to_mechanic"].includes(
              flightStage,
            )) && (
          <>
            <TextInput
              style={input}
              placeholder="Correction reason"
              value={reason}
              onChangeText={setReason}
            />
            <Action onPress={() => onReturn(reason)}>
              Return Inspection for Correction
            </Action>
          </>
        )}
    </View>
  );
}
