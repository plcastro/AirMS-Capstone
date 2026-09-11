import React, { useState, useEffect, useRef } from "react";
import AppText from "../common/AppText";
import {
  View,
  Modal,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS } from "../../stylesheets/colors";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import FlightLogModalInfo from "./FlightLogModalInfo";
import FlightLogModalDestinations from "./FlightLogModalDestinations";
import FlightLogModalBroughtForward from "./FlightLogModalBroughtForward";
import FlightLogModalThisFlight from "./FlightLogModalThisFlight";
import FlightLogModalToDate from "./FlightLogModalToDate";
import FlightLogModalFuelServicing from "./FlightLogModalFuelServicing";
import FlightLogModalOilServicing from "./FlightLogModalOilServicing";
import FlightLogDiscrepancyRemarks from "./FlightLogDiscrepancyRemarks";
import FlightLogModalWorkDone from "./FlightLogModalWorkDone";
import FlightLogSignatureModal from "./FlightLogSignatureModal";
import AlertComp from "../AlertComp";
import IosModalSafeAreaProvider from "../common/IosModalSafeAreaProvider";
import { API_BASE } from "../../utilities/API_BASE";
import { getAuthHeaders } from "../../utilities/mobileApi";
import { showToast } from "../../utilities/toast";
import {
  calculateB412ToDate,
  createEmptyB412Data,
  createEmptyB412Leg,
  hydrateStandardFlightLogFromLegacyB412,
  isB412Aircraft,
  mapAircraftReferenceToB412,
  mapAircraftReferenceToBroughtForward,
  mapB412CarriedToStandardBroughtForward,
  mapB412FlightLogToMonitoringTotals,
  mapStandardFlightLogToMonitoringTotals,
  syncB412DataFromStandardFlightLog,
} from "./b412FlightLogData";

const parseDate = (dateValue) => {
  if (!dateValue) return new Date();
  if (dateValue instanceof Date) return dateValue;
  if (typeof dateValue === "string") {
    const parts = dateValue.split("/");
    if (parts.length === 3) {
      const month = parseInt(parts[0], 10) - 1;
      const day = parseInt(parts[1], 10);
      const year = parseInt(parts[2], 10);
      return new Date(year, month, day);
    }
    return new Date(dateValue);
  }
  if (typeof dateValue === "number") {
    return new Date(dateValue);
  }
  return new Date();
};

const normalizeFlightLogStatus = (status = "") =>
  String(status || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

const normalizeEditableFlightLogStatus = (status = "") => {
  const normalizedStatus = normalizeFlightLogStatus(status);

  return ["", "ongoing", "draft"].includes(normalizedStatus)
    ? "pending_release"
    : normalizedStatus;
};

const isReleasedFlightLogStatus = (status = "") =>
  ["pending_acceptance", "released", "accepted", "completed"].includes(
    normalizeFlightLogStatus(status),
  );

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

const hasCompleteDestinationLegs = (log = {}) =>
  Array.isArray(log.legs) &&
  log.legs.length > 0 &&
  log.legs.every((leg) => {
    const hasValidDate =
      Boolean(leg?.date) && !Number.isNaN(new Date(leg.date).getTime());
    const hasCompleteRoute =
      Array.isArray(leg?.stations) &&
      leg.stations.length > 0 &&
      leg.stations.every(
        (station) =>
          String(station?.from || "").trim() &&
          String(station?.to || "").trim(),
      );

    return hasValidDate && hasCompleteRoute;
  });

const formatSignatureDate = (timestamp) => {
  if (!timestamp) return "";

  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) return "";

  return parsed.toLocaleString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const toTitleCase = (value = "") =>
  String(value || "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const getUserFullName = (user = {}) =>
  `${user?.firstName || ""} ${user?.lastName || ""}`.trim() ||
  user?.name ||
  user?.username ||
  "";

const buildSignatureUser = (user = {}, signature, fallbackTitle = "") => {
  const title =
    user?.jobTitle || user?.access || toTitleCase(fallbackTitle) || "User";
  const licenseNo =
    user?.licenseNo ||
    user?.licenseNumber ||
    user?.license ||
    user?.certificateNo ||
    "";

  return {
    name: getUserFullName(user) || title,
    title,
    id: licenseNo,
    licenseNo,
    userId: user?.id || user?._id || "",
    signature,
    timestamp: new Date().toISOString(),
  };
};

const getSignerLabel = (signatureData = {}) =>
  signatureData.id
    ? `${signatureData.name || "Unknown"} / ${signatureData.id}`
    : [signatureData.name || "Unknown", signatureData.title]
        .filter(Boolean)
        .join(" - ");

export default function FlightLogEditEntry({
  visible,
  logData,
  onClose,
  onSave,
  onCompleted,
  userRole,
  currentUser,
  readOnly = false,
}) {
  const [currentPage, setCurrentPage] = useState(0);
  const [showReleaseModal, setShowReleaseModal] = useState(false);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [feedbackAlert, setFeedbackAlert] = useState({
    visible: false,
    title: "",
    message: "",
    closeOnFinish: false,
  });
  const scrollViewRef = useRef(null);
  const tabScrollViewRef = useRef(null);
  const normalizedRole = String(userRole || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, " ");
  const isPilot = normalizedRole === "pilot";
  const isMechanic =
    [
      "mechanic",
      "engineer",
      "maintenance manager",
      "head of maintenance",
      "admin",
      "superadmin",
    ].includes(normalizedRole);

  const [formData, setFormData] = useState({});
  const [componentData, setComponentData] = useState({});
  const [workItems, setWorkItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toDateData, setToDateData] = useState({});

  // Load log data
  useEffect(() => {
    if (logData) {
      const hydratedLog = hydrateStandardFlightLogFromLegacyB412(logData);
      setFormData({
        ...hydratedLog,
        date: parseDate(hydratedLog.date),
        status: normalizeEditableFlightLogStatus(hydratedLog.status),
        legs: hydratedLog.legs || [createEmptyB412Leg()],
      });
      setComponentData(
        hydratedLog.componentData || {
          broughtForwardData: {},
          thisFlightData: {},
          toDateData: {},
        },
      );
      setWorkItems(hydratedLog.workItems || []);
      setIsLoading(false);
    }
  }, [logData]);

  const isB412 = isB412Aircraft(formData.aircraftType);
  const isAircraftSelected = Boolean(
    String(formData.rpc || "").trim() &&
      String(formData.aircraftType || "").trim(),
  );

  // Calculate toDateData whenever broughtForwardData or thisFlightData changes
  useEffect(() => {
    const bf = componentData.broughtForwardData || {};
    const tf = componentData.thisFlightData || {};
    const calculated = {
      airframe: (parseFloat(bf.airframe) || 0) + (parseFloat(tf.airframe) || 0),
      gearBoxMain:
        (parseFloat(bf.gearBoxMain) || 0) + (parseFloat(tf.gearBoxMain) || 0),
      gearBoxTail:
        (parseFloat(bf.gearBoxTail) || 0) + (parseFloat(tf.gearBoxTail) || 0),
      rotorMain:
        (parseFloat(bf.rotorMain) || 0) + (parseFloat(tf.rotorMain) || 0),
      rotorTail:
        (parseFloat(bf.rotorTail) || 0) + (parseFloat(tf.rotorTail) || 0),
      engine: (parseFloat(bf.engine) || 0) + (parseFloat(tf.engine) || 0),
      cycleN1: (parseFloat(bf.cycleN1) || 0) + (parseFloat(tf.cycleN1) || 0),
      cycleN2: (parseFloat(bf.cycleN2) || 0) + (parseFloat(tf.cycleN2) || 0),
      landingCycle:
        (parseFloat(bf.landingCycle) || 0) + (parseFloat(tf.landingCycle) || 0),
      usage: (parseFloat(bf.usage) || 0) + (parseFloat(tf.usage) || 0),
      airframeNextInsp: tf.airframeNextInsp || bf.airframeNextInsp,
      engineNextInsp: tf.engineNextInsp || bf.engineNextInsp,
    };
    setToDateData(calculated);
    // Also keep componentData.toDateData in sync for saving
    setComponentData((prev) => ({ ...prev, toDateData: calculated }));
  }, [componentData.broughtForwardData, componentData.thisFlightData]);

  // Reset page when modal opens
  useEffect(() => {
    if (visible) {
      setCurrentPage(0);
      scrollViewRef.current?.scrollTo({ y: 0, animated: false });
    }
  }, [visible]);

  // Scroll to top on page change
  useEffect(() => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: false });
  }, [currentPage]);

  const hasDiscrepancy = Boolean(String(formData.remarks || "").trim());
  const hasWorkItems = Array.isArray(workItems) && workItems.length > 0;
  const shouldShowWorkDone = hasDiscrepancy || hasWorkItems;

  const getFlightLogTabs = () => {
    if (!isAircraftSelected) {
      return ["Basic Information"];
    }

    if (isPilot) return ["Destination/s", "Discrepancy/Remarks"];

    const nextTabs = [
      "Basic Information",
      "Destination/s",
      "Brought Forward",
      "This Flight",
      "To Date",
      "Fuel Servicing",
      "Oil Servicing",
      "Discrepancy/Remarks",
    ];

    if (shouldShowWorkDone) {
      nextTabs.push("Work Done");
    }

    return nextTabs;
  };

  const tabs = getFlightLogTabs();
  const totalPages = tabs.length;
  const isLastPage = currentPage === totalPages - 1;
  const isCompletedLog = formData.status === "completed";

  // Keep edit permissions aligned with FlightLogEntry role rules.
  const isBasicInfoEditable = !readOnly && !isCompletedLog;
  const isRPCEditable = !isReleasedFlightLogStatus(formData.status);
  const isDestinationsEditable = !readOnly && !isCompletedLog && isPilot;
  const isComponentEditable = !readOnly && !isCompletedLog && isMechanic;
  const isBroughtForwardLocked = formData.broughtForwardLocked === true;

  const isFuelOilEditable = !readOnly && !isCompletedLog && isMechanic;
  const isDiscrepancyEditable = !readOnly && !isCompletedLog;
  const isWorkDoneEditable =
    !readOnly && !isCompletedLog && shouldShowWorkDone;

  useEffect(() => {
    if (shouldShowWorkDone) {
      tabScrollViewRef.current?.scrollToEnd({ animated: true });
    }
  }, [shouldShowWorkDone]);

  useEffect(() => {
    if (currentPage > totalPages - 1) {
      setCurrentPage(Math.max(totalPages - 1, 0));
    }
  }, [currentPage, totalPages]);

  // Update functions
  const updateForm = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const updateLeg = (updatedLegData) => {
    setFormData(updatedLegData);
  };

  const handleAircraftDataLoaded = (data) => {
    if (!data) {
      setCurrentPage(0);
      setFormData((prev) => {
        const { b412Data, ...commonData } = prev;
        return {
          ...commonData,
          b412Data: null,
          legs: [createEmptyB412Leg()],
          fuelServicing: [],
          oilServicing: [],
          remarks: "",
          sling: "",
          serialNumber: "",
          workItems: [],
          broughtForwardLocked: false,
        };
      });
      setComponentData({
        broughtForwardData: {},
        thisFlightData: {},
        toDateData: {},
      });
      setWorkItems([]);
      return;
    }

    const loadedRpc = String(data.aircraft || data.rpc || "")
      .trim()
      .toUpperCase();
    const originalRpc = String(logData?.rpc || logData?.aircraft || "")
      .trim()
      .toUpperCase();
    if (loadedRpc && originalRpc && loadedRpc === originalRpc) {
      const resolvedAircraftType =
        data.aircraftType || logData.aircraftType || "";
      const hydratedLog = hydrateStandardFlightLogFromLegacyB412({
        ...logData,
        aircraftType: resolvedAircraftType,
      });
      setFormData({
        ...hydratedLog,
        date: parseDate(hydratedLog.date),
        status: normalizeEditableFlightLogStatus(hydratedLog.status),
        legs: hydratedLog.legs || [createEmptyB412Leg()],
      });
      setComponentData(
        hydratedLog.componentData || {
          broughtForwardData: {},
          thisFlightData: {},
          toDateData: {},
        },
      );
      setWorkItems(hydratedLog.workItems || []);
      return;
    }

    const serialNumber =
      data.serialNumber ||
      data.serialNo ||
      data.serial ||
      data.aircraftSerialNumber ||
      data.referenceData?.serialNumber ||
      "";
    const nextIsB412 = isB412Aircraft(data.aircraftType);
    const carriedB412 = nextIsB412 ? mapAircraftReferenceToB412(data) : null;

    setComponentData((prev) => ({
      ...prev,
      broughtForwardData: nextIsB412
        ? mapB412CarriedToStandardBroughtForward(carriedB412)
        : mapAircraftReferenceToBroughtForward(data),
    }));

    setFormData((prev) => {
      const { b412Data, ...commonData } = prev;

      return {
        ...commonData,
        serialNumber,
        ...(nextIsB412
          ? {
              b412Data: createEmptyB412Data({
                ...b412Data,
                serialNumber: serialNumber || b412Data?.serialNumber,
                componentData: {
                  ...(b412Data?.componentData || {}),
                  broughtForwardData: carriedB412.broughtForwardData,
                  airframeNextInspectionDueAt:
                    carriedB412.airframeNextInspectionDueAt,
                  engineNextInspectionDueAt:
                    carriedB412.engineNextInspectionDueAt,
                },
              }),
            }
          : { b412Data: null }),
      };
    });
  };

  const updateFuelServicing = (legIndex, data) => {
    const newFuelServicing = [...(formData.fuelServicing || [])];
    newFuelServicing[legIndex] = data;
    setFormData((prev) => ({ ...prev, fuelServicing: newFuelServicing }));
  };

  const updateOilServicing = (legIndex, data) => {
    const newOilServicing = [...(formData.oilServicing || [])];
    newOilServicing[legIndex] = data;
    setFormData((prev) => ({ ...prev, oilServicing: newOilServicing }));
  };

  const updateComponent = (section, field, value) => {
    setComponentData((prev) => ({
      ...prev,
      [section]: { ...prev[section], [field]: value },
    }));
    // toDateData will be recalculated by the useEffect above
  };

  const updateWorkItems = (newWorkItems) => {
    setWorkItems(newWorkItems);
    setFormData((prev) => ({ ...prev, workItems: newWorkItems }));
  };

  const persistLog = async (updatedFormData, closeOnSave = false) => {
    if (isPilot && !hasCompleteDestinationLegs(updatedFormData)) {
      showToast("Each leg must include complete station route and date");
      setCurrentPage(Math.max(tabs.indexOf("Destination/s"), 0));
      return false;
    }

    const bf = componentData.broughtForwardData || {};
    const tf = componentData.thisFlightData || {};
    const calculatedToDate = {
      airframe: (parseFloat(bf.airframe) || 0) + (parseFloat(tf.airframe) || 0),
      gearBoxMain:
        (parseFloat(bf.gearBoxMain) || 0) + (parseFloat(tf.gearBoxMain) || 0),
      gearBoxTail:
        (parseFloat(bf.gearBoxTail) || 0) + (parseFloat(tf.gearBoxTail) || 0),
      rotorMain:
        (parseFloat(bf.rotorMain) || 0) + (parseFloat(tf.rotorMain) || 0),
      rotorTail:
        (parseFloat(bf.rotorTail) || 0) + (parseFloat(tf.rotorTail) || 0),
      engine: (parseFloat(bf.engine) || 0) + (parseFloat(tf.engine) || 0),
      cycleN1: (parseFloat(bf.cycleN1) || 0) + (parseFloat(tf.cycleN1) || 0),
      cycleN2: (parseFloat(bf.cycleN2) || 0) + (parseFloat(tf.cycleN2) || 0),
      landingCycle:
        (parseFloat(bf.landingCycle) || 0) + (parseFloat(tf.landingCycle) || 0),
      usage: (parseFloat(bf.usage) || 0) + (parseFloat(tf.usage) || 0),
      airframeNextInsp: tf.airframeNextInsp || bf.airframeNextInsp,
      engineNextInsp: tf.engineNextInsp || bf.engineNextInsp,
    };

    const finalComponentData = {
      ...componentData,
      toDateData: calculatedToDate,
    };

    const {
      b412Data: sourceB412Data,
      ...nonB412FormData
    } = updatedFormData;
    const shouldIncludeB412Data = isB412Aircraft(
      updatedFormData.aircraftType,
    );
    const shouldClearB412Data =
      !shouldIncludeB412Data && sourceB412Data !== undefined;
    const normalizedB412Data = shouldIncludeB412Data
      ? syncB412DataFromStandardFlightLog(
          {
            ...updatedFormData,
            componentData: finalComponentData,
            workItems,
          },
          sourceB412Data,
        )
      : null;

    if (normalizedB412Data) {
      normalizedB412Data.componentData.toDateData = calculateB412ToDate(
        normalizedB412Data.componentData.broughtForwardData,
        normalizedB412Data.componentData.thisFlightData,
      );
    }

    const allFieldsFilled =
      componentData.broughtForwardData &&
      Object.values(componentData.broughtForwardData).every(
        (value) => String(value ?? "").trim() !== "",
      );

    const payload = {
      ...nonB412FormData,
      ...(normalizedB412Data
        ? { b412Data: normalizedB412Data }
        : shouldClearB412Data
          ? { b412Data: null }
          : {}),
      componentData: finalComponentData,
      workItems,
      broughtForwardLocked: isMechanic
        ? Boolean(allFieldsFilled)
        : formData.broughtForwardLocked === true,
    };

    if (!onSave) return false;

    return (
      (await onSave(payload, { closeOnSave, showToast: closeOnSave })) !== false
    );
  };

  const showFeedbackAlert = (
    message,
    closeOnFinish = true,
    title = "Success",
  ) => {
    setFeedbackAlert({
      visible: true,
      title,
      message,
      closeOnFinish,
    });
  };

  // Handlers for release/accept/complete
  const handleRelease = async (signature) => {
    const updated = {
      ...formData,
      releasedBy: buildSignatureUser(currentUser, signature, userRole),
      status: "pending_acceptance",
      broughtForwardLocked: formData.broughtForwardLocked,
    };
    const saved = await persistLog(updated, false);
    if (!saved) return false;
    setShowReleaseModal(false);
    setFormData(updated);
    showFeedbackAlert("Flight log has been released");
    return true;
  };

  const handleAccept = async (signature) => {
    if (!formData.releasedBy?.signature && !formData.releasedBy?.name) {
      showToast(
        "This flight log must be released by a mechanic before acceptance.",
      );
      return;
    }

    const saved = await persistLog(formData, false);
    if (!saved) return false;

    try {
      const response = await fetch(
        `${API_BASE}/api/flightlogs/${formData._id}/accept`,
        {
          method: "PUT",
          headers: await getAuthHeaders({
            Accept: "application/json",
            "x-action-confirmed": "true",
          }),
          body: JSON.stringify({
            name: getUserFullName(currentUser) || userRole,
            signature,
          }),
        },
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to accept flight log");
      }

      const acceptedLog = hydrateStandardFlightLogFromLegacyB412(
        result.data || {
          ...formData,
          acceptedBy: buildSignatureUser(currentUser, signature, userRole),
          status: "accepted",
        },
      );
      setShowAcceptModal(false);
      setFormData({ ...acceptedLog, date: parseDate(acceptedLog.date) });
      await onCompleted?.(result.data || acceptedLog);
      showFeedbackAlert("Flight log has been accepted");
      return true;
    } catch (error) {
      console.error("Accept flight log failed:", error);
      showToast(error.message || "Failed to accept flight log");
      return false;
    }
  };

  const handleNotifyMechanic = async () => {
    if (!hasDestinationInfo(formData)) {
      showToast(
        "Add at least one complete From-To station in Destination/s before notifying for completion.",
      );
      return;
    }

    const updated = {
      ...formData,
      notifiedForCompletion: true,
    };
    const saved = await persistLog(updated, false);
    if (!saved) return;
    setFormData(updated);
    showFeedbackAlert("Mechanic has been notified to complete the flight log");
  };

  const handleComplete = async () => {
    try {
      const aircraft = formData.aircraft || formData.rpc;
      if (!aircraft) {
        showToast("Aircraft identifier is missing.");
        return;
      }

      const standardBroughtForward =
        componentData.broughtForwardData || {};
      const standardThisFlight = componentData.thisFlightData || {};
      const sumStandardValue = (field) => {
        const broughtValue = String(
          standardBroughtForward[field] ?? "",
        ).trim();
        const flightValue = String(standardThisFlight[field] ?? "").trim();
        if (!broughtValue && !flightValue) return "";
        return (parseFloat(broughtValue) || 0) + (parseFloat(flightValue) || 0);
      };
      const standardToDate = {
        airframe: sumStandardValue("airframe"),
        gearBoxMain: sumStandardValue("gearBoxMain"),
        gearBoxTail: sumStandardValue("gearBoxTail"),
        rotorMain: sumStandardValue("rotorMain"),
        rotorTail: sumStandardValue("rotorTail"),
        engine: sumStandardValue("engine"),
        cycleN1: sumStandardValue("cycleN1"),
        cycleN2: sumStandardValue("cycleN2"),
        usage: sumStandardValue("usage"),
        landingCycle: sumStandardValue("landingCycle"),
        airframeNextInsp:
          standardThisFlight.airframeNextInsp ||
          standardBroughtForward.airframeNextInsp ||
          "",
        engineNextInsp:
          standardThisFlight.engineNextInsp ||
          standardBroughtForward.engineNextInsp ||
          "",
      };
      const adaptedB412Data = isB412
        ? syncB412DataFromStandardFlightLog(
            {
              ...formData,
              componentData: {
                ...componentData,
                toDateData: standardToDate,
              },
              workItems,
            },
            formData.b412Data,
          )
        : null;
      const b412ComponentData = adaptedB412Data?.componentData || {};
      const b412ToDate = calculateB412ToDate(
        b412ComponentData.broughtForwardData,
        b412ComponentData.thisFlightData,
      );
      const requiredNumber = (value, label) => {
        const rawValue = String(value ?? "").trim();
        const parsedValue = Number(rawValue);
        if (!rawValue || !Number.isFinite(parsedValue)) {
          throw new Error(
            `Enter a valid To Date value for ${label} before completing the flight log.`,
          );
        }
        return parsedValue;
      };

      const payload = {
        ...(isB412
          ? mapB412FlightLogToMonitoringTotals({
              ...b412ComponentData,
              toDateData: b412ToDate,
            })
          : mapStandardFlightLogToMonitoringTotals({
              ...componentData,
              toDateData: standardToDate,
            })),
        updatedBy: userRole,
      };

      payload.acftTT = requiredNumber(
        isB412 ? b412ToDate.airframe : standardToDate.airframe,
        "Airframe",
      );
      payload.engTT = requiredNumber(
        isB412 ? b412ToDate.engine1?.tsn : standardToDate.engine,
        isB412 ? "Engine No. 1 TSN" : "Engine",
      );
      payload.n1Cycles = requiredNumber(
        isB412 ? b412ToDate.engine1?.cycle : standardToDate.cycleN1,
        isB412 ? "Engine No. 1 Cycle" : "Cycle N1",
      );
      payload.n2Cycles = requiredNumber(
        isB412 ? b412ToDate.engine2?.cycle : standardToDate.cycleN2,
        isB412 ? "Engine No. 2 Cycle" : "Cycle N2",
      );
      payload.landings = requiredNumber(
        isB412 ? b412ToDate.landingCycle : standardToDate.landingCycle,
        "Landing Cycle",
      );

      const saved = await persistLog(
        isB412
          ? {
              ...formData,
              b412Data: {
                ...adaptedB412Data,
                componentData: {
                  ...b412ComponentData,
                  toDateData: b412ToDate,
                },
              },
            }
          : formData,
        false,
      );
      if (!saved) return;

      const url = `${API_BASE}/api/parts-monitoring/${encodeURIComponent(aircraft)}/update-totals`;
      const authHeaders = await getAuthHeaders({
        Accept: "application/json",
        "x-action-confirmed": "true",
      });

      const response = await fetch(url, {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify({
          ...payload,
          confirmAction: true,
        }),
      });

      const text = await response.text();

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        throw new Error(
          `Server returned ${contentType} instead of JSON. ` +
            `Status: ${response.status}. ` +
            `Response preview: ${text.substring(0, 200)}`,
        );
      }

      let result;
      try {
        result = JSON.parse(text);
      } catch (e) {
        throw new Error(`Invalid JSON response: ${text.substring(0, 200)}`);
      }

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            `HTTP ${response.status}: Failed to update aircraft totals.`,
        );
      }

      const completeResponse = await fetch(
        `${API_BASE}/api/flightlogs/${formData._id}/complete`,
        {
          method: "PUT",
          headers: await getAuthHeaders({
            "x-action-confirmed": "true",
          }),
        },
      );
      const completeResult = await completeResponse.json();
      if (!completeResponse.ok || !completeResult.success) {
        throw new Error(
          completeResult.message || "Failed to complete flight log.",
        );
      }

      const updated = completeResult.data || {
        ...formData,
        status: "completed",
      };
      setFormData(updated);
      await onCompleted?.(updated);
      showFeedbackAlert("Flight log completed and totals updated.");
    } catch (error) {
      console.error("❌ Complete error:", error);
      showToast(error.message || "Update failed");
    }
  };

  const handleSave = async () => {
    if (isCompletedLog) {
      showToast("Completed flight logs cannot be edited.");
      return;
    }

    if (!isAircraftSelected) {
      showToast("Select an aircraft and wait for its type to load");
      return;
    }

    await persistLog(formData, true);
  };

  const handleNext = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrevious = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  const showReleaseButton =
    isAircraftSelected &&
    !readOnly &&
    !isCompletedLog &&
    isMechanic &&
    formData.status === "pending_release";
  const showAcceptButton =
    isAircraftSelected &&
    !readOnly &&
    !isCompletedLog &&
    isPilot &&
    formData.status === "pending_acceptance" &&
    Boolean(formData.releasedBy?.signature || formData.releasedBy?.name);
  const showNotifyButton =
    isAircraftSelected &&
    !readOnly &&
    !isCompletedLog &&
    isPilot &&
    formData.status === "accepted" &&
    !formData.notifiedForCompletion;
  const showCompleteButton =
    isAircraftSelected &&
    !readOnly &&
    !isCompletedLog &&
    isMechanic &&
    formData.status === "accepted" &&
    formData.notifiedForCompletion;
  const showActionButtons =
    showReleaseButton ||
    showAcceptButton ||
    showNotifyButton ||
    showCompleteButton ||
    Boolean(formData.releasedBy?.signature) ||
    Boolean(formData.acceptedBy?.signature);

  const renderPage = () => {
    const currentTab = tabs[currentPage];

    switch (currentTab) {
      case "Basic Information":
        return (
          <FlightLogModalInfo
            formData={formData}
            updateForm={updateForm}
            isEditable={isBasicInfoEditable}
            isRPCEditable={isRPCEditable}
            isActive={visible}
            onAircraftDataLoaded={handleAircraftDataLoaded}
            isB412={isB412}
          />
        );

      case "Destination/s":
        return (
          <FlightLogModalDestinations
            legData={formData}
            onUpdateLeg={updateLeg}
            isEditable={isDestinationsEditable}
            userRole={userRole}
            maxLegs={isB412 ? 6 : undefined}
          />
        );

      case "Brought Forward":
        return (
          <FlightLogModalBroughtForward
            componentData={componentData.broughtForwardData}
            onUpdateComponent={(field, value) =>
              updateComponent("broughtForwardData", field, value)
            }
            isEditable={isComponentEditable}
            isLocked={isBroughtForwardLocked}
          />
        );

      case "This Flight":
        return (
          <FlightLogModalThisFlight
            componentData={componentData.thisFlightData}
            onUpdateComponent={(field, value) =>
              updateComponent("thisFlightData", field, value)
            }
            isEditable={isComponentEditable}
          />
        );

      case "To Date":
        return (
          <FlightLogModalToDate
            componentData={toDateData}
            onUpdateComponent={(field, value) =>
              updateComponent("toDateData", field, value)
            }
            isEditable={false}
          />
        );

      case "Fuel Servicing":
        return (
          <FlightLogModalFuelServicing
            legs={formData.legs || []}
            fuelServicingData={formData.fuelServicing || []}
            onUpdateFuelServicing={updateFuelServicing}
            isEditable={isFuelOilEditable}
          />
        );

      case "Oil Servicing":
        return (
          <FlightLogModalOilServicing
            legs={formData.legs || []}
            oilServicingData={formData.oilServicing || []}
            onUpdateOilServicing={updateOilServicing}
            isEditable={isFuelOilEditable}
          />
        );

      case "Discrepancy/Remarks":
        return (
          <FlightLogDiscrepancyRemarks
            remarks={formData.remarks || ""}
            sling={formData.sling || ""}
            onUpdateRemarks={(text) => updateForm("remarks", text)}
            onUpdateSling={(text) => updateForm("sling", text)}
            isEditable={isDiscrepancyEditable}
          />
        );

      case "Work Done":
        return (
          <FlightLogModalWorkDone
            workItems={workItems}
            onUpdateWorkItems={updateWorkItems}
            isEditable={isWorkDoneEditable}
          />
        );

      default:
        return null;
    }
  };

  if (isLoading || !formData) {
    return null;
  }

  return (
    <>
      <Modal visible={visible} animationType="fade" onRequestClose={onClose}>
        <IosModalSafeAreaProvider>
          <SafeAreaView style={{ flex: 1, backgroundColor: "#F9F9F9" }}>
        <StatusBar barStyle="dark-content" backgroundColor="#F9F9F9" />

        <View style={{ paddingTop: 16, backgroundColor: "#F9F9F9" }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 16,
              marginBottom: 12,
            }}
          >
            <View>
              <AppText style={{ fontSize: 16, fontWeight: "700", color: COLORS.black }}>
                {readOnly ? "View Entry" : "Edit Entry"} - Flight Log
              </AppText>
              <AppText style={{ fontSize: 12, fontWeight: "600", color: COLORS.grayDark }}>
                Select Section
              </AppText>
            </View>

            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <MaterialCommunityIcons
                name="close"
                size={24}
                color={COLORS.grayDark}
              />
            </TouchableOpacity>
          </View>

          <ScrollView
            ref={tabScrollViewRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: 16,
              gap: 12,
              paddingBottom: 12,
            }}
          >
            {tabs.map((tab, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => setCurrentPage(index)}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 16,
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor:
                    currentPage === index
                      ? COLORS.primaryLight
                      : COLORS.grayMedium,
                  backgroundColor:
                    currentPage === index ? COLORS.primaryLight : "transparent",
                }}
              >
                <AppText
                  style={{
                    fontSize: 12,
                    fontWeight: "500",
                    color:
                      currentPage === index ? COLORS.white : COLORS.grayDark,
                  }}
                >
                  {tab}
                </AppText>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View
            style={{
              height: 1,
              backgroundColor: COLORS.grayMedium,
              marginTop: 12,
            }}
          />

        </View>

        <ScrollView
          ref={scrollViewRef}
          style={{ flex: 1, paddingHorizontal: 20 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingTop: 16, paddingBottom: 20 }}
        >
          {renderPage()}

          {showActionButtons && (
            <View style={{ marginTop: 20, marginBottom: 20 }}>
              {showReleaseButton && (
                <TouchableOpacity
                  onPress={() => setShowReleaseModal(true)}
                  style={{
                    backgroundColor: COLORS.primaryLight,
                    paddingVertical: 12,
                    borderRadius: 8,
                    alignItems: "center",
                    marginBottom: 20,
                  }}
                >
                  <AppText
                    style={{
                      color: COLORS.white,
                      fontWeight: "600",
                      fontSize: 12,
                    }}
                  >
                    Release
                  </AppText>
                </TouchableOpacity>
              )}

              {showAcceptButton && (
                <TouchableOpacity
                  onPress={() => setShowAcceptModal(true)}
                  style={{
                    backgroundColor: COLORS.primaryLight,
                    paddingVertical: 12,
                    borderRadius: 8,
                    alignItems: "center",
                    marginBottom: 20,
                  }}
                >
                  <AppText
                    style={{
                      color: COLORS.white,
                      fontWeight: "600",
                      fontSize: 12,
                    }}
                  >
                    Accept
                  </AppText>
                </TouchableOpacity>
              )}

              {showNotifyButton && (
                <TouchableOpacity
                  onPress={handleNotifyMechanic}
                  style={{
                    backgroundColor: COLORS.primaryLight,
                    paddingVertical: 12,
                    borderRadius: 8,
                    alignItems: "center",
                    marginBottom: 20,
                  }}
                >
                  <AppText
                    style={{
                      color: COLORS.white,
                      fontWeight: "600",
                      fontSize: 12,
                    }}
                  >
                    Notify Mechanic for Completing Flights
                  </AppText>
                </TouchableOpacity>
              )}

              {showCompleteButton && (
                <TouchableOpacity
                  onPress={handleComplete}
                  style={{
                    backgroundColor: COLORS.primaryLight,
                    paddingVertical: 12,
                    borderRadius: 8,
                    alignItems: "center",
                    marginBottom: 20,
                  }}
                >
                  <AppText
                    style={{
                      color: COLORS.white,
                      fontWeight: "600",
                      fontSize: 12,
                    }}
                  >
                    Complete
                  </AppText>
                </TouchableOpacity>
              )}

              {(formData.releasedBy?.name ||
                formData.releasedBy?.signature) && (
                <View
                  style={{
                    backgroundColor: COLORS.white,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: COLORS.grayMedium,
                    marginBottom: 20,
                    overflow: "hidden",
                  }}
                >
                  <View
                    style={{
                      backgroundColor: COLORS.primaryLight,
                      paddingVertical: 14,
                      paddingHorizontal: 16,
                    }}
                  >
                    <AppText
                      style={{
                        fontSize: 12,
                        color: COLORS.white,
                        fontWeight: "600",
                      }}
                    >
                      RELEASED BY:
                    </AppText>
                  </View>
                  <View style={{ padding: 20 }}>
                    <AppText
                      style={{
                        fontSize: 12,
                        color: COLORS.black,
                        marginBottom: 4,
                        fontWeight: "500",
                      }}
                    >
                      {getSignerLabel(formData.releasedBy)}
                    </AppText>
                    <AppText
                      style={{
                        fontSize: 12,
                        color: COLORS.grayDark,
                        textTransform: "uppercase",
                      }}
                    >
                      {["maintenance manager", "superadmin"].includes(normalizedRole)
                        ? "MAINTENANCE MANAGER"
                        : "MECHANIC"}
                    </AppText>
                    <AppText
                      style={{
                        fontSize: 12,
                        color: COLORS.grayDark,
                        marginTop: 8,
                      }}
                    >
                      {formatSignatureDate(formData.releasedBy?.timestamp)}
                    </AppText>
                    {!!formData.releasedBy?.signature && (
                      <Image
                        source={{ uri: formData.releasedBy.signature }}
                        style={{
                          width: "100%",
                          height: 80,
                          resizeMode: "contain",
                          marginTop: 12,
                          backgroundColor: COLORS.white,
                        }}
                      />
                    )}
                  </View>
                </View>
              )}

              {(formData.acceptedBy?.name ||
                formData.acceptedBy?.signature) && (
                <View
                  style={{
                    backgroundColor: COLORS.white,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: COLORS.grayMedium,
                    marginBottom: 20,
                    overflow: "hidden",
                  }}
                >
                  <View
                    style={{
                      backgroundColor: COLORS.primaryLight,
                      paddingVertical: 14,
                      paddingHorizontal: 16,
                    }}
                  >
                    <AppText
                      style={{
                        fontSize: 12,
                        color: COLORS.white,
                        fontWeight: "600",
                      }}
                    >
                      ACCEPTED BY:
                    </AppText>
                  </View>
                  <View style={{ padding: 20 }}>
                    <AppText
                      style={{
                        fontSize: 12,
                        color: COLORS.black,
                        marginBottom: 4,
                        fontWeight: "500",
                      }}
                    >
                      {getSignerLabel(formData.acceptedBy)}
                    </AppText>
                    <AppText
                      style={{
                        fontSize: 12,
                        color: COLORS.grayDark,
                        textTransform: "uppercase",
                      }}
                    >
                      PILOT
                    </AppText>
                    <AppText
                      style={{
                        fontSize: 12,
                        color: COLORS.grayDark,
                        marginTop: 8,
                      }}
                    >
                      {formatSignatureDate(formData.acceptedBy?.timestamp)}
                    </AppText>
                    {!!formData.acceptedBy?.signature && (
                      <Image
                        source={{ uri: formData.acceptedBy.signature }}
                        style={{
                          width: "100%",
                          height: 80,
                          resizeMode: "contain",
                          marginTop: 12,
                          backgroundColor: COLORS.white,
                        }}
                      />
                    )}
                  </View>
                </View>
              )}
            </View>
          )}
        </ScrollView>

        <View
          style={{
            flexDirection: "row",
            justifyContent: "flex-end",
            alignItems: "center",
            padding: 20,
            backgroundColor: "#F9F9F9",
            gap: 10,
          }}
        >
          <TouchableOpacity
            onPress={handlePrevious}
            disabled={currentPage === 0}
            style={{
              paddingVertical: 8,
              paddingHorizontal: 16,
              borderRadius: 4,
              backgroundColor: COLORS.white,
              borderWidth: 1,
              borderColor: COLORS.grayMedium,
              opacity: currentPage === 0 ? 0.5 : 1,
            }}
          >
            <AppText style={{ color: COLORS.grayDark, fontSize: 12 }}>
              Previous
            </AppText>
          </TouchableOpacity>

          <View
            style={{
              backgroundColor: COLORS.primaryLight,
              paddingVertical: 8,
              paddingHorizontal: 14,
              borderRadius: 4,
            }}
          >
            <AppText
              style={{ color: COLORS.white, fontWeight: "600", fontSize: 14 }}
            >
              {currentPage + 1}
            </AppText>
          </View>

          <TouchableOpacity
            onPress={
              !isAircraftSelected && !readOnly && !isCompletedLog
                ? undefined
                : isLastPage
                ? readOnly || isCompletedLog
                  ? onClose
                  : handleSave
                : handleNext
            }
            disabled={!isAircraftSelected && !readOnly && !isCompletedLog}
            style={{
              paddingVertical: 8,
              paddingHorizontal: 24,
              borderRadius: 4,
              backgroundColor: COLORS.primaryLight,
              opacity:
                !isAircraftSelected && !readOnly && !isCompletedLog ? 0.5 : 1,
            }}
          >
            <AppText
              style={{ color: COLORS.white, fontSize: 14, fontWeight: "600" }}
            >
              {!isAircraftSelected && !readOnly && !isCompletedLog
                ? "Select Aircraft"
                : isLastPage
                ? readOnly || isCompletedLog
                  ? "Close"
                  : "Save"
                : "Next"}
            </AppText>
          </TouchableOpacity>
        </View>

        <FlightLogSignatureModal
          visible={showReleaseModal}
          title="Release Signature"
          onClose={() => setShowReleaseModal(false)}
          onSave={handleRelease}
          aircraftRPC={formData.rpc}
          useNativeModal={false}
        />

        <FlightLogSignatureModal
          visible={showAcceptModal}
          title="Accept Signature"
          onClose={() => setShowAcceptModal(false)}
          onSave={handleAccept}
          aircraftRPC={formData.rpc}
          useNativeModal={false}
        />

        <AlertComp
          visible={feedbackAlert.visible}
          title={feedbackAlert.title}
          message={feedbackAlert.message}
          duration={1400}
          onFinish={() => {
            const shouldClose = feedbackAlert.closeOnFinish;
            setFeedbackAlert((prev) => ({ ...prev, visible: false }));
            if (shouldClose) {
              onClose();
            }
          }}
        />
          </SafeAreaView>
        </IosModalSafeAreaProvider>
      </Modal>
    </>
  );
}
