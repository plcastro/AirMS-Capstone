import React, { useState, useEffect, useMemo } from "react";
import { Alert, Button, message, Modal, Spin, Typography } from "antd";
import {
  InfoCircleOutlined,
  EnvironmentOutlined,
  ClockCircleOutlined,
  ThunderboltOutlined,
  ExperimentOutlined,
  CheckSquareOutlined,
  WarningOutlined,
} from "@ant-design/icons";

import FlightLogModalInfo from "./FlightLogModalInfo";
import FlightLogModalDestinations from "./FlightLogModalDestinations";
import FlightLogModalComponentTimes from "./FlightLogModalComponentTimes";
import FlightLogModalFuelServicing from "./FlightLogModalFuelServicing";
import FlightLogModalOilServicing from "./FlightLogModalOilServicing";
import FlightLogDiscrepancyRemarks from "./FlightLogModalDiscrepancyRemarks";
import FlightLogModalWorkDone from "./FlightLogModalWorkDone";
import FlightLogB412Legs from "./FlightLogB412Legs";
import FlightLogB412Section from "./FlightLogB412Section";
import { API_BASE } from "../../utils/API_BASE";
import {
  B412_FLIGHT_LOG_SECTIONS,
  calculateB412ToDate,
  createEmptyB412Data,
  ensureSixB412Legs,
  hasNestedB412Value,
  isB412Aircraft,
  mapAircraftReferenceToB412,
} from "../../utils/b412FlightLog";

const resolveRole = (role = "") => {
  const r = String(role || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, " ");
  if (r === "pilot") return "pilot";
  if (
    r === "mechanic" ||
    r === "engineer" ||
    r === "maintenance manager" ||
    r === "head of maintenance" ||
    r === "superadmin" ||
    r === "admin" ||
    r === "officer in charge"
  )
    return "mechanic";
  return "viewer";
};

const isReleasedFlightLogStatus = (status = "") =>
  ["pending_acceptance", "released", "accepted", "completed"].includes(
    String(status || "")
      .trim()
      .toLowerCase(),
  );

const emptyComponentSection = () => ({
  airframe: "",
  gearBoxMain: "",
  gearBoxTail: "",
  rotorMain: "",
  rotorTail: "",
  airframeNextInsp: "",
  engine: "",
  cycleN1: "",
  cycleN2: "",
  usage: "",
  landingCycle: "",
  engineNextInsp: "",
});

const emptyFuelItem = () => ({
  date: "",
  contCheck: "",
  mainRemG: "",
  mainAdd: "",
  mainTotal: "",
  fuelType: "drum",
  refuelerName: "",
  signature: "",
});
const emptyOilItem = () => ({
  date: "",
  engineRem: "",
  engineAdd: "",
  engineTot: "",
  mrGboxRem: "",
  mrGboxAdd: "",
  mrGboxTot: "",
  trGboxRem: "",
  trGboxAdd: "",
  trGboxTot: "",
  remarks: "",
  signature: "",
});
const emptyLeg = () => ({
  stations: [{ from: "", to: "" }],
  blockTimeOn: "",
  blockTimeOff: "",
  flightTimeOn: "",
  flightTimeOff: "",
  totalTimeOn: "",
  totalTimeOff: "",
  date: "",
  passengers: "",
});
const syncServicingToLegs = (fd) => {
  const n = fd.legs?.length || 1;
  return {
    ...fd,
    fuelServicing: Array.from(
      { length: n },
      (_, i) => fd.fuelServicing?.[i] || emptyFuelItem(),
    ),
    oilServicing: Array.from(
      { length: n },
      (_, i) => fd.oilServicing?.[i] || emptyOilItem(),
    ),
  };
};

// ALL TABS - for displaying in edit mode
const ALL_TABS = [
  { key: "info", label: "Basic Information", icon: <InfoCircleOutlined /> },
  {
    key: "destinations",
    label: "Destination/s",
    icon: <EnvironmentOutlined />,
  },
  { key: "component", label: "Component Times", icon: <ClockCircleOutlined /> },
  { key: "fuel", label: "Fuel Servicing", icon: <ThunderboltOutlined /> },
  { key: "oil", label: "Oil Servicing", icon: <ExperimentOutlined /> },
  {
    key: "discrepancy",
    label: "Discrepancy/Remarks",
    icon: <WarningOutlined />,
  },
];

const WORK_DONE_TAB = {
  key: "workdone",
  label: "Work Done",
  icon: <CheckSquareOutlined />,
};

const REQUIRED_DESTINATION_FIELDS = [["date", "Date"]];

const B412_TAB_ICONS = {
  "Basic Information": <InfoCircleOutlined />,
  "Flight Legs": <EnvironmentOutlined />,
  Passengers: <EnvironmentOutlined />,
  "BRT FORWARD": <ClockCircleOutlined />,
  "This Flight": <ClockCircleOutlined />,
  "To Date": <ClockCircleOutlined />,
  "Fuel Servicing": <ThunderboltOutlined />,
  "Oil Servicing": <ExperimentOutlined />,
  "Discrepancy / Correction": <WarningOutlined />,
};

const B412_TAB_KEY_BY_SECTION = {
  "Basic Information": "info",
  "Flight Legs": "b412-legs",
  Passengers: "b412-passengers",
  "BRT FORWARD": "b412-brought-forward",
  "This Flight": "b412-this-flight",
  "To Date": "b412-to-date",
  "Fuel Servicing": "b412-fuel",
  "Oil Servicing": "b412-oil",
  "Discrepancy / Correction": "b412-discrepancy",
};

const B412_SECTION_BY_TAB_KEY = Object.fromEntries(
  Object.entries(B412_TAB_KEY_BY_SECTION).map(([section, key]) => [key, section]),
);

export default function FlightLogEntry({
  visible,
  onClose,
  onSave,
  userRole,
  editMode = false,
  initialData = null,
  initialComponentData = null,
  readOnly = false,
  onRelease,
  onAccept,
  onNotify,
  onComplete,
  workflowLoading = false,
}) {
  const { Text } = Typography;
  const resolvedRole = resolveRole(userRole);
  const isPilot = resolvedRole === "pilot";
  const isMechanic = resolvedRole === "mechanic";

  const normalizeInitialForm = (source) => {
    if (isB412Aircraft(source?.aircraftType)) {
      return {
        ...source,
        legs: ensureSixB412Legs(source?.legs),
        b412Data: createEmptyB412Data(source?.b412Data),
        workItems: source?.workItems || [],
      };
    }

    return syncServicingToLegs({
      ...source,
      workItems: source?.workItems || [],
    });
  };

  const initForm = () =>
    initialData
      ? normalizeInitialForm(initialData)
      : {
          aircraftType: "",
          rpc: "",
          date: new Date(),
          controlNo: "",
          legs: [emptyLeg()],
          remarks: "",
          sling: "",
          fuelServicing: [emptyFuelItem()],
          oilServicing: [emptyOilItem()],
          workItems: [],
          createdBy: userRole,
        };

  const initComponent = () =>
    initialComponentData || {
      broughtForwardData: emptyComponentSection(),
      thisFlightData: emptyComponentSection(),
      toDateData: emptyComponentSection(),
    };

  const [formData, setFormData] = useState(initForm);
  const [componentData, setComponentData] = useState(initComponent);
  const [loadedAircraftData, setLoadedAircraftData] = useState(null);
  const [activeTab, setActiveTab] = useState("info");
  const [submitting, setSubmitting] = useState(false);
  const [validationError, setValidationError] = useState("");
  const isAircraftSelected = Boolean(
    String(formData.rpc || "").trim() &&
      String(formData.aircraftType || "").trim(),
  );
  const isB412 = isAircraftSelected && isB412Aircraft(formData.aircraftType);

  const mapAircraftReferenceToBroughtForward = (referenceData = {}) => ({
    airframe: referenceData.acftTT || "",
    gearBoxMain: referenceData.acftTT || "",
    gearBoxTail: referenceData.acftTT || "",
    rotorMain: referenceData.acftTT || "",
    rotorTail: referenceData.acftTT || "",
    airframeNextInsp: "",
    engine: referenceData.acftTT || "",
    cycleN1: referenceData.n1Cycles || "",
    cycleN2: referenceData.n2Cycles || "",
    usage: "",
    landingCycle: referenceData.landings || "",
    engineNextInsp: "",
  });

  useEffect(() => {
    if (visible) {
      setFormData(initForm());
      setComponentData(initComponent());
      setLoadedAircraftData(null);
      setActiveTab("info");
      setValidationError("");
    }
  }, [visible]);

  useEffect(() => {
    if (!visible || !editMode || !initialData?._id) return;

    setFormData((prev) => {
      if (prev?._id !== initialData._id) {
        return normalizeInitialForm(initialData);
      }

      return {
        ...prev,
        status: initialData.status,
        notifiedForCompletion: initialData.notifiedForCompletion,
        broughtForwardLocked: initialData.broughtForwardLocked,
        releasedBy: initialData.releasedBy,
        acceptedBy: initialData.acceptedBy,
      };
    });
  }, [
    visible,
    editMode,
    initialData?._id,
    initialData?.status,
    initialData?.notifiedForCompletion,
    initialData?.broughtForwardLocked,
    initialData?.releasedBy,
    initialData?.acceptedBy,
  ]);

  const legCount = formData.legs?.length;
  useEffect(() => {
    if (isB412) {
      if (legCount !== 6) {
        setFormData((prev) => ({
          ...prev,
          legs: ensureSixB412Legs(prev.legs),
          b412Data: createEmptyB412Data(prev.b412Data),
        }));
      }
      return;
    }

    setFormData((prev) => syncServicingToLegs(prev));
  }, [isB412, legCount]);

  useEffect(() => {
    if (
      !loadedAircraftData?.referenceData ||
      editMode ||
      isB412Aircraft(loadedAircraftData?.aircraftType)
    )
      return;

    setComponentData((prev) => ({
      ...prev,
      broughtForwardData: {
        ...prev.broughtForwardData,
        ...mapAircraftReferenceToBroughtForward(
          loadedAircraftData.referenceData,
        ),
      },
    }));
  }, [loadedAircraftData, editMode]);

  useEffect(() => {
    if (!isB412) return;

    const broughtForward =
      formData.b412Data?.componentData?.broughtForwardData || {};
    const thisFlight = formData.b412Data?.componentData?.thisFlightData || {};
    const calculatedToDate = calculateB412ToDate(
      broughtForward,
      thisFlight,
    );

    setFormData((prev) => {
      const normalized = createEmptyB412Data(prev.b412Data);
      if (
        JSON.stringify(normalized.componentData.toDateData) ===
        JSON.stringify(calculatedToDate)
      ) {
        return prev;
      }

      return {
        ...prev,
        b412Data: {
          ...(prev.b412Data || normalized),
          componentData: {
            ...normalized.componentData,
            ...(prev.b412Data?.componentData || {}),
            toDateData: calculatedToDate,
          },
        },
      };
    });
  }, [
    formData.b412Data?.componentData?.broughtForwardData,
    formData.b412Data?.componentData?.thisFlightData,
    isB412,
  ]);

  useEffect(() => {
    const isOriginalEditAircraft =
      editMode &&
      String(initialData?.rpc || "").trim().toUpperCase() ===
        String(formData.rpc || "").trim().toUpperCase();
    if (
      !loadedAircraftData ||
      !formData.rpc ||
      !isB412 ||
      isOriginalEditAircraft
    )
      return;

    let isActive = true;

    const populateB412BroughtForward = async () => {
      let previousData = null;

      try {
        const params = new URLSearchParams({
          page: "1",
          limit: "10",
          aircraftRPC: formData.rpc,
          sortBy: "createdAt",
          sortOrder: "desc",
        });
        const response = await fetch(
          `${API_BASE}/api/flightlogs?${params.toString()}`,
        );
        const payload = await response.json();

        if (response.ok) {
          const previousLog = (payload.data || []).find(
            (log) =>
              log?._id !== initialData?._id &&
              hasNestedB412Value(
                log?.b412Data?.componentData?.toDateData,
              ),
          );
          if (previousLog) {
            previousData = {
              broughtForwardData:
                previousLog.b412Data.componentData.toDateData,
              airframeNextInspectionDueAt:
                previousLog.b412Data.componentData
                  .airframeNextInspectionDueAt || "",
              engineNextInspectionDueAt:
                previousLog.b412Data.componentData
                  .engineNextInspectionDueAt || "",
            };
          }
        }
      } catch (error) {
        console.error(
          "Error fetching previous B412 flight-log totals:",
          error,
        );
      }

      if (!isActive) return;

      const fallback = mapAircraftReferenceToB412(loadedAircraftData);
      const carried = previousData || fallback;

      setFormData((prev) => {
        if (
          prev.rpc !== formData.rpc ||
          !isB412Aircraft(prev.aircraftType)
        ) {
          return prev;
        }

        const normalized = createEmptyB412Data(prev.b412Data);
        const carriedValues = createEmptyB412Data({
          componentData: {
            broughtForwardData: carried.broughtForwardData,
          },
        }).componentData.broughtForwardData;

        return {
          ...prev,
          b412Data: {
            ...normalized,
            componentData: {
              ...normalized.componentData,
              broughtForwardData: carriedValues,
              airframeNextInspectionDueAt:
                carried.airframeNextInspectionDueAt ||
                normalized.componentData.airframeNextInspectionDueAt,
              engineNextInspectionDueAt:
                carried.engineNextInspectionDueAt ||
                normalized.componentData.engineNextInspectionDueAt,
            },
          },
        };
      });
    };

    populateB412BroughtForward();

    return () => {
      isActive = false;
    };
  }, [
    editMode,
    formData.rpc,
    initialData?._id,
    initialData?.rpc,
    isB412,
    loadedAircraftData,
  ]);

  useEffect(() => {
    const broughtForward = componentData.broughtForwardData || {};
    const thisFlight = componentData.thisFlightData || {};

    const calculatedToDate = {
      airframe:
        (parseFloat(broughtForward.airframe) || 0) +
        (parseFloat(thisFlight.airframe) || 0),
      gearBoxMain:
        (parseFloat(broughtForward.gearBoxMain) || 0) +
        (parseFloat(thisFlight.gearBoxMain) || 0),
      gearBoxTail:
        (parseFloat(broughtForward.gearBoxTail) || 0) +
        (parseFloat(thisFlight.gearBoxTail) || 0),
      rotorMain:
        (parseFloat(broughtForward.rotorMain) || 0) +
        (parseFloat(thisFlight.rotorMain) || 0),
      rotorTail:
        (parseFloat(broughtForward.rotorTail) || 0) +
        (parseFloat(thisFlight.rotorTail) || 0),
      engine:
        (parseFloat(broughtForward.engine) || 0) +
        (parseFloat(thisFlight.engine) || 0),
      cycleN1:
        (parseFloat(broughtForward.cycleN1) || 0) +
        (parseFloat(thisFlight.cycleN1) || 0),
      cycleN2:
        (parseFloat(broughtForward.cycleN2) || 0) +
        (parseFloat(thisFlight.cycleN2) || 0),
      usage:
        (parseFloat(broughtForward.usage) || 0) +
        (parseFloat(thisFlight.usage) || 0),
      landingCycle:
        (parseFloat(broughtForward.landingCycle) || 0) +
        (parseFloat(thisFlight.landingCycle) || 0),
      airframeNextInsp:
        thisFlight.airframeNextInsp || broughtForward.airframeNextInsp || "",
      engineNextInsp:
        thisFlight.engineNextInsp || broughtForward.engineNextInsp || "",
    };

    setComponentData((prev) => ({
      ...prev,
      toDateData: calculatedToDate,
    }));
  }, [componentData.broughtForwardData, componentData.thisFlightData]);

  // Determine which tabs to show based on role and edit mode
  const tabs = useMemo(() => {
    if (!isAircraftSelected) {
      return [ALL_TABS[0]];
    }

    if (isB412) {
      return B412_FLIGHT_LOG_SECTIONS.map((section) => ({
        key: B412_TAB_KEY_BY_SECTION[section],
        label: section,
        icon: B412_TAB_ICONS[section],
      }));
    }

    const hasDisc = formData.remarks?.trim() !== "";

    // EDIT MODE - show ALL tabs (both pilot and mechanic can see everything)
    if (editMode) {
      const baseTabs = [...ALL_TABS];
      // Add Work Done tab if discrepancy exists
      if (hasDisc && !baseTabs.find((t) => t.key === "workdone")) {
        baseTabs.push(WORK_DONE_TAB);
      }
      return baseTabs;
    }

    // CREATE MODE - only show tabs relevant to the role
    if (isPilot) {
      // Pilot creating: Basic Info, Destinations, Discrepancy
      const pilotTabs = [
        {
          key: "info",
          label: "Basic Information",
          icon: <InfoCircleOutlined />,
        },
        {
          key: "destinations",
          label: "Destination/s",
          icon: <EnvironmentOutlined />,
        },
        {
          key: "discrepancy",
          label: "Discrepancy/Remarks",
          icon: <WarningOutlined />,
        },
      ];
      return pilotTabs;
    } else {
      // Mechanic creating: Basic Info, Component, Fuel, Oil, Discrepancy
      const mechanicTabs = [
        {
          key: "info",
          label: "Basic Information",
          icon: <InfoCircleOutlined />,
        },
        {
          key: "component",
          label: "Component Times",
          icon: <ClockCircleOutlined />,
        },
        { key: "fuel", label: "Fuel Servicing", icon: <ThunderboltOutlined /> },
        { key: "oil", label: "Oil Servicing", icon: <ExperimentOutlined /> },
        {
          key: "discrepancy",
          label: "Discrepancy/Remarks",
          icon: <WarningOutlined />,
        },
      ];
      // Add Work Done tab if discrepancy exists during creation
      if (hasDisc && !mechanicTabs.find((t) => t.key === "workdone")) {
        mechanicTabs.push(WORK_DONE_TAB);
      }
      return mechanicTabs;
    }
  }, [isAircraftSelected, isB412, isPilot, editMode, formData.remarks]);

  const updateForm = (field, value) => {
    if (field === "rpc") {
      setActiveTab("info");
    }

    setFormData((prev) => {
      if (field === "rpc" && String(prev.rpc || "") !== String(value || "")) {
        const wasB412 =
          isB412Aircraft(prev.aircraftType) || Boolean(prev.b412Data);

        return {
          ...prev,
          rpc: value,
          aircraftType: "",
          legs: [emptyLeg()],
          fuelServicing: [emptyFuelItem()],
          oilServicing: [emptyOilItem()],
          b412Data: editMode && wasB412 ? null : undefined,
        };
      }

      if (field === "aircraftType") {
        if (isB412Aircraft(value)) {
          return {
            ...prev,
            aircraftType: value,
            legs: ensureSixB412Legs(prev.legs),
            b412Data: createEmptyB412Data(prev.b412Data),
          };
        }

        if (isB412Aircraft(prev.aircraftType) || prev.b412Data) {
          return {
            ...prev,
            aircraftType: value,
            legs: [emptyLeg()],
            fuelServicing: [emptyFuelItem()],
            oilServicing: [emptyOilItem()],
            b412Data: editMode ? null : undefined,
          };
        }
      }

      return { ...prev, [field]: value };
    });
  };

  const handleAircraftDataLoaded = (aircraftData) => {
    setLoadedAircraftData(aircraftData);
    if (!aircraftData) return;

    const aircraftType = aircraftData.aircraftType || "";
    setFormData((prev) => {
      if (!isB412Aircraft(aircraftType)) {
        return {
          ...prev,
          aircraftType,
          b412Data:
            editMode && prev.b412Data !== undefined ? null : undefined,
        };
      }

      const normalized = createEmptyB412Data(prev.b412Data);
      return {
        ...prev,
        aircraftType,
        legs: ensureSixB412Legs(prev.legs),
        b412Data: {
          ...normalized,
          serialNumber:
            aircraftData.serialNumber || normalized.serialNumber || "",
        },
      };
    });
  };

  const updateB412Data = (nextB412Data) =>
    setFormData((prev) => ({
      ...prev,
      b412Data: createEmptyB412Data(nextB412Data),
    }));

  const updateComponent = (section, field, value) =>
    setComponentData((prev) => ({
      ...prev,
      [section]: { ...prev[section], [field]: value },
    }));

  const updateFuel = (legIdx, field, value) =>
    setFormData((prev) => {
      const next = [...(prev.fuelServicing || [])];
      next[legIdx] = { ...next[legIdx], [field]: value };
      return { ...prev, fuelServicing: next };
    });

  const updateOil = (legIdx, field, value) =>
    setFormData((prev) => {
      const next = [...(prev.oilServicing || [])];
      next[legIdx] = { ...next[legIdx], [field]: value };
      return { ...prev, oilServicing: next };
    });

  const legHandlers = {
    updateLeg: (legIdx, field, value) =>
      setFormData((prev) => {
        const legs = [...prev.legs];
        legs[legIdx] = { ...legs[legIdx], [field]: value };
        return { ...prev, legs };
      }),
    addLeg: () =>
      setFormData((prev) => ({ ...prev, legs: [...prev.legs, emptyLeg()] })),
    removeLeg: (legIdx) =>
      setFormData((prev) => ({
        ...prev,
        legs:
          prev.legs.length > 1
            ? prev.legs.filter((_, i) => i !== legIdx)
            : prev.legs,
      })),
    addStation: (legIdx) =>
      setFormData((prev) => {
        const legs = [...prev.legs];
        const last = legs[legIdx].stations[legs[legIdx].stations.length - 1];
        legs[legIdx] = {
          ...legs[legIdx],
          stations: [...legs[legIdx].stations, { from: last.to, to: "" }],
        };
        return { ...prev, legs };
      }),
    removeStation: (legIdx, stIdx) =>
      setFormData((prev) => {
        const legs = [...prev.legs];
        if (legs[legIdx].stations.length > 1) {
          legs[legIdx] = {
            ...legs[legIdx],
            stations: legs[legIdx].stations.filter((_, i) => i !== stIdx),
          };
        }
        return { ...prev, legs };
      }),
    updateStation: (legIdx, stIdx, field, value) =>
      setFormData((prev) => {
        const legs = [...prev.legs];
        const stations = [...legs[legIdx].stations];
        stations[stIdx] = { ...stations[stIdx], [field]: value };
        if (field === "to" && stIdx < stations.length - 1)
          stations[stIdx + 1] = { ...stations[stIdx + 1], from: value };
        if (field === "from" && stIdx > 0)
          stations[stIdx - 1] = { ...stations[stIdx - 1], to: value };
        legs[legIdx] = { ...legs[legIdx], stations };
        return { ...prev, legs };
      }),
  };

  // EDIT PERMISSIONS (who can edit what)
  const canEditBasicInfo =
    !readOnly && (!editMode || formData.createdBy === userRole);
  const isCompletedLog = editMode && formData.status === "completed";
  const isRPCEditable =
    !editMode || !isReleasedFlightLogStatus(formData.status);
  const canEditDestinations =
    !readOnly && (!editMode ? isPilot : isPilot && editMode);
  const canEditComponent = !readOnly && isMechanic;
  const canEditNextInspectionDates = !readOnly && isMechanic;
  const canEditFuelOil =
    !readOnly && (!editMode ? isMechanic : isMechanic && editMode);
  const canEditWorkDone =
    !readOnly &&
    isMechanic &&
    (!editMode ||
      String(formData.status || "").toLowerCase() === "pending_release");
  const canEditDiscrepancy = !readOnly;
  const canSave = !readOnly && !isCompletedLog;
  const canSaveCurrentTab =
    canSave ||
    (["component", "b412-to-date"].includes(activeTab) &&
      canEditNextInspectionDates);

  const buildSavePayload = (sourceFormData, options = {}) => {
    const { lockBroughtForward = false } = options;
    const dateStr =
      sourceFormData.date instanceof Date
        ? sourceFormData.date.toLocaleDateString("en-US", {
            month: "2-digit",
            day: "2-digit",
            year: "numeric",
          })
        : sourceFormData.date;

    if (isB412Aircraft(sourceFormData.aircraftType)) {
      const normalizedB412Data = createEmptyB412Data(sourceFormData.b412Data);
      normalizedB412Data.componentData.toDateData = calculateB412ToDate(
        normalizedB412Data.componentData.broughtForwardData,
        normalizedB412Data.componentData.thisFlightData,
      );

      return {
        ...sourceFormData,
        date: dateStr,
        legs: ensureSixB412Legs(sourceFormData.legs),
        b412Data: normalizedB412Data,
        componentData,
        broughtForwardLocked:
          lockBroughtForward ||
          sourceFormData.broughtForwardLocked === true ||
          isReleasedFlightLogStatus(sourceFormData.status),
      };
    }

    const payload = {
      ...sourceFormData,
      componentData,
      date: dateStr,
    };

    if (sourceFormData.b412Data === undefined) {
      delete payload.b412Data;
    }

    return payload;
  };

  const handleSave = async () => {
    setValidationError("");
    if (
      isCompletedLog &&
      !(
        ["component", "b412-to-date"].includes(activeTab) &&
        canEditNextInspectionDates
      )
    ) {
      message.info("Completed flight logs are view-only.");
      return;
    }

    if (!formData.rpc?.trim()) {
      message.error("Aircraft RPC is required");
      return;
    }
    if (!formData.aircraftType?.trim()) {
      message.error("Wait for the selected aircraft type to load");
      return;
    }
    if (!formData.date) {
      message.error("Flight log date is required");
      return;
    }
    if (canEditDestinations) {
      const invalidLegIndex = (formData.legs || []).findIndex((leg) => {
        if (isB412) {
          const station = leg.stations?.[0] || {};
          const hasFrom = Boolean(String(station.from || "").trim());
          const hasTo = Boolean(String(station.to || "").trim());
          return hasFrom !== hasTo;
        }

        const hasInvalidRoute = (leg.stations || []).some(
          (station) =>
            !String(station?.from || "").trim() ||
            !String(station?.to || "").trim(),
        );
        const hasMissingField = REQUIRED_DESTINATION_FIELDS.some(
          ([key]) => !String(leg?.[key] || "").trim(),
        );
        return hasInvalidRoute || hasMissingField;
      });
      if (invalidLegIndex >= 0) {
        const errorMessage = isB412
          ? "A populated Bell 412 leg must include both From and To stations"
          : "Each leg must include complete station route and date";
        setValidationError(errorMessage);
        setActiveTab(isB412 ? "b412-legs" : "destinations");
        message.error(errorMessage);
        return;
      }
    }
    setSubmitting(true);
    try {
      const saved = await onSave(buildSavePayload(formData));
      if (saved === true) {
        onClose();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const renderContent = () => {
    if (isB412 && activeTab !== "info") {
      const section = B412_SECTION_BY_TAB_KEY[activeTab];
      if (!section) return null;

      if (section === "Flight Legs") {
        return (
          <FlightLogB412Legs
            legs={ensureSixB412Legs(formData.legs)}
            onChange={(legs) =>
              setFormData((prev) => ({
                ...prev,
                legs: ensureSixB412Legs(legs),
              }))
            }
            isEditable={canSave && canEditDestinations}
          />
        );
      }

      const isBroughtForward = section === "BRT FORWARD";
      const isThisFlight = section === "This Flight";
      const isToDate = section === "To Date";
      const broughtForwardLocked =
        formData.broughtForwardLocked === true ||
        isReleasedFlightLogStatus(formData.status);
      const sectionEditable =
        section === "Passengers"
          ? canSave && canEditDestinations
          : ["Fuel Servicing", "Oil Servicing"].includes(section)
            ? canSave && canEditFuelOil
            : isBroughtForward || isThisFlight
              ? canSave && canEditComponent
              : isToDate
                ? canEditNextInspectionDates
                : canSave && canEditDiscrepancy;
      const totalsEditable =
        (isBroughtForward &&
          canSave &&
          canEditComponent &&
          !broughtForwardLocked) ||
        (isThisFlight && canSave && canEditComponent);

      return (
        <FlightLogB412Section
          section={section}
          data={createEmptyB412Data(formData.b412Data)}
          onChange={updateB412Data}
          isEditable={sectionEditable}
          totalsEditable={totalsEditable}
          correctionEditable={canSave && canEditWorkDone}
        />
      );
    }

    switch (activeTab) {
      case "info":
        return (
          <FlightLogModalInfo
            formData={formData}
            updateForm={updateForm}
            isEditable={canSave && canEditBasicInfo}
            isRPCEditable={isRPCEditable}
            onAircraftDataLoaded={handleAircraftDataLoaded}
            serialNumber={formData.b412Data?.serialNumber || ""}
            onUpdateSerialNumber={(serialNumber) =>
              updateB412Data({
                ...createEmptyB412Data(formData.b412Data),
                serialNumber,
              })
            }
          />
        );
      case "destinations":
        return (
          <FlightLogModalDestinations
            formData={formData}
            handlers={legHandlers}
            isEditable={canSave && canEditDestinations}
          />
        );
      case "component":
        return (
          <FlightLogModalComponentTimes
            componentData={componentData}
            updateComponent={updateComponent}
            isEditable={canSave && canEditComponent}
            canEditNextInspection={canEditNextInspectionDates}
          />
        );
      case "fuel":
        return (
          <FlightLogModalFuelServicing
            formData={formData}
            updateFuel={updateFuel}
            isEditable={canSave && canEditFuelOil}
          />
        );
      case "oil":
        return (
          <FlightLogModalOilServicing
            formData={formData}
            updateOil={updateOil}
            isEditable={canSave && canEditFuelOil}
          />
        );
      case "discrepancy":
        return (
          <FlightLogDiscrepancyRemarks
            formData={formData}
            updateForm={updateForm}
            isEditable={canSave && canEditDiscrepancy}
          />
        );
      case "workdone":
        return (
          <FlightLogModalWorkDone
            formData={formData}
            updateForm={updateForm}
            isEditable={canSave && canEditWorkDone}
          />
        );
      default:
        return null;
    }
  };

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

  const getSignerLabel = (signatureData = {}) =>
    signatureData?.id
      ? `${signatureData.name || "Unknown"} / ${signatureData.id}`
      : signatureData?.name || "Unknown";

  const normalizedStatus = String(formData.status || "")
    .trim()
    .toLowerCase();
  const showReleaseButton =
    editMode &&
    !readOnly &&
    isMechanic &&
    normalizedStatus === "pending_release";
  const showAcceptButton =
    editMode &&
    !readOnly &&
    isPilot &&
    ["pending_acceptance", "released"].includes(normalizedStatus);
  const showNotifyButton =
    editMode &&
    !readOnly &&
    isPilot &&
    normalizedStatus === "accepted" &&
    !formData.notifiedForCompletion;
  const showCompleteButton =
    editMode &&
    !readOnly &&
    isMechanic &&
    normalizedStatus === "accepted" &&
    formData.notifiedForCompletion;

  return (
    <Modal
      open={visible}
      onCancel={onClose}
      footer={null}
      width={1160}
      centered
      zIndex={9999}
      rootClassName="fl-entry-modal-root"
      styles={{ body: { padding: 0 } }}
      className="fl-entry-modal"
      destroyOnHidden
    >
      <Spin spinning={submitting}>
        <div className="fl-modal-header-block">
          <div className="fl-modal-title-main">
            {readOnly
              ? "View Entry - Flight Log"
              : editMode
                ? "Edit Entry - Flight Log"
                : "Add Entry - Flight Log"}
          </div>
          <div className="fl-modal-title-sub">Select Section</div>
        </div>

        {/* Tab nav */}
        <div className="fl-tab-nav">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              className={`fl-tab-btn${activeTab === tab.key ? " fl-tab-btn--active" : ""}`}
              onClick={() => setActiveTab(tab.key)}
            >
              <span className="fl-tab-icon">{tab.icon}</span>
              <span className="fl-tab-label">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Scrollable body */}
        <div className="fl-modal-body">
          {validationError && (
            <Alert
              type="error"
              showIcon
              closable={{ onClose: () => setValidationError("") }}
              title={validationError}
              style={{ marginBottom: 12 }}
            />
          )}
          {renderContent()}
          {editMode &&
            (formData?.releasedBy?.name ||
              formData?.releasedBy?.signature ||
              formData?.acceptedBy?.name ||
              formData?.acceptedBy?.signature) && (
              <div className="fl-signature-summary">
                {!!(
                  formData?.releasedBy?.name || formData?.releasedBy?.signature
                ) && (
                  <div className="fl-signature-card">
                    <Text strong>Released By</Text>
                    <div>{getSignerLabel(formData.releasedBy)}</div>
                    {!!formatSignatureDate(formData.releasedBy?.timestamp) && (
                      <Text type="secondary">
                        {formatSignatureDate(formData.releasedBy?.timestamp)}
                      </Text>
                    )}
                  </div>
                )}
                {!!(
                  formData?.acceptedBy?.name || formData?.acceptedBy?.signature
                ) && (
                  <div className="fl-signature-card">
                    <Text strong>Accepted By</Text>
                    <div>{getSignerLabel(formData.acceptedBy)}</div>
                    {!!formatSignatureDate(formData.acceptedBy?.timestamp) && (
                      <Text type="secondary">
                        {formatSignatureDate(formData.acceptedBy?.timestamp)}
                      </Text>
                    )}
                  </div>
                )}
              </div>
            )}
          {(showReleaseButton ||
            showAcceptButton ||
            showNotifyButton ||
            showCompleteButton) && (
            <div
              style={{
                marginTop: 12,
                display: "flex",
                gap: 8,
                justifyContent: "flex-end",
                flexWrap: "wrap",
              }}
            >
              {showReleaseButton && (
                <Button
                  type="primary"
                  loading={workflowLoading}
                  onClick={() =>
                    onRelease?.(
                      isB412
                        ? buildSavePayload(formData)
                        : formData,
                    )
                  }
                >
                  Release
                </Button>
              )}
              {showAcceptButton && (
                <Button
                  type="primary"
                  loading={workflowLoading}
                  onClick={() => onAccept?.(formData)}
                >
                  Accept
                </Button>
              )}
              {showNotifyButton && (
                <Button
                  loading={workflowLoading}
                  onClick={() => onNotify?.(formData)}
                >
                  Notify
                </Button>
              )}
              {showCompleteButton && (
                <Button
                  type="primary"
                  loading={workflowLoading}
                  onClick={() =>
                    onComplete?.(
                      isB412 ? buildSavePayload(formData) : formData,
                    )
                  }
                >
                  Complete
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="fl-modal-footer">
          {canSaveCurrentTab ? (
            <Button
              type="primary"
              className="fl-nav-btn"
              onClick={handleSave}
              loading={submitting}
            >
              {editMode ? "Save" : "Add"}
            </Button>
          ) : (
            <Button className="fl-nav-btn" onClick={onClose}>
              Close
            </Button>
          )}
          {canSaveCurrentTab && (
            <Button className="fl-nav-btn" onClick={onClose}>
              Cancel
            </Button>
          )}
        </div>
      </Spin>
    </Modal>
  );
}
