import { monitoringBroughtForward } from "../../../../shared/flightLogBroughtForward";
import { syncFlightLogDates } from "../../../../shared/flightLogDates";
import {
  totalFlightHours,
  FLIGHT_HOUR_FIELDS,
  flightLandingCycles,
  requiredFlightTimeError,
} from "../../../../shared/flightLogTimes";
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
import {
  adaptStandardFlightLogToB412,
  createEmptyB412Data,
  hydrateLegacyB412FlightLog,
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
  passengers: "0",
});

const hasLegInput = (leg = {}) =>
  [
    leg.blockTimeOn,
    leg.blockTimeOff,
    leg.flightTimeOn,
    leg.flightTimeOff,
    leg.totalTimeOn,
    leg.totalTimeOff,
    leg.date,
    Number(leg.passengers) === 0 ? "" : leg.passengers,
    ...(leg.stations || []).flatMap((station) => [station?.from, station?.to]),
  ].some((value) => String(value ?? "").trim() !== "");

const hasFuelInput = (fuel = {}) =>
  [
    fuel.date,
    fuel.contCheck,
    fuel.mainRemG,
    fuel.mainAdd,
    fuel.mainTotal,
    fuel.refuelerName,
    fuel.signature,
  ].some((value) => String(value ?? "").trim() !== "");

const hasOilInput = (oil = {}) =>
  [
    oil.date,
    oil.engineRem,
    oil.engineAdd,
    oil.engineTot,
    oil.mrGboxRem,
    oil.mrGboxAdd,
    oil.mrGboxTot,
    oil.trGboxRem,
    oil.trGboxAdd,
    oil.trGboxTot,
    oil.remarks,
    oil.signature,
  ].some((value) => String(value ?? "").trim() !== "");

const normalizeStandardLegs = (
  legs = [],
  {
    trimLegacyPlaceholders = false,
    fuelServicing = [],
    oilServicing = [],
  } = {},
) => {
  const sourceLegs = Array.isArray(legs) && legs.length ? legs : [emptyLeg()];

  const normalizedLegs = sourceLegs.map((leg = {}) => ({
    ...emptyLeg(),
    ...leg,
    stations:
      Array.isArray(leg.stations) && leg.stations.length
        ? leg.stations.map((station = {}) => ({
            from: station?.from || "",
            to: station?.to || "",
          }))
        : [{ from: "", to: "" }],
  }));

  if (!trimLegacyPlaceholders || normalizedLegs.length === 1) {
    return normalizedLegs;
  }

  let lastActiveIndex = normalizedLegs.length - 1;
  while (
    lastActiveIndex > 0 &&
    !hasLegInput(normalizedLegs[lastActiveIndex]) &&
    !hasFuelInput(fuelServicing[lastActiveIndex]) &&
    !hasOilInput(oilServicing[lastActiveIndex])
  ) {
    lastActiveIndex -= 1;
  }

  return normalizedLegs.slice(0, lastActiveIndex + 1);
};

const syncServicingToLegs = (fd, options = {}) => {
  const legs = normalizeStandardLegs(fd.legs, {
    ...options,
    fuelServicing: fd.fuelServicing,
    oilServicing: fd.oilServicing,
  });
  const n = legs.length;
  return {
    ...fd,
    legs,
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

function EntryShell({ embedded, children, ...props }) {
  return embedded ? (
    <div>{children}</div>
  ) : (
    <Modal {...props}>{children}</Modal>
  );
}

export default function FlightLogEntry({
  visible,
  entryConfirmation = null,
  onClose,
  onSave,
  userRole,
  editMode = false,
  lockedRpc = "",
  initialData = null,
  initialAircraftRpc = '',
  initialComponentData = null,
  readOnly = false,
  onRelease,
  onAccept,
  onComplete,
  workflowLoading = false,
  embedded = false,
  onDraftChange,
  permissions,
  initialTab,
}) {
  const { Text } = Typography;
  const resolvedRole = resolveRole(userRole);
  const isPilot = resolvedRole === "pilot";
  const isMechanic = resolvedRole === "mechanic";
  const lockedAircraftRpc = String(lockedRpc || (!editMode ? initialAircraftRpc : '') || '').trim();
  const canEnterDestinations = ["mechanic", "maintenance manager"].includes(
    String(userRole || "").trim().toLowerCase().replace(/[\s-]+/g, " "),
  );

  const normalizeInitialForm = (source) => {
    const hydrated = hydrateLegacyB412FlightLog({
      ...source,
      workItems: source?.workItems || [],
    });

    return syncServicingToLegs(
      {
        ...hydrated,
        workItems: source?.workItems?.length
          ? source.workItems
          : hydrated.workItems,
      },
      {
        trimLegacyPlaceholders: Boolean(source?.b412Data),
      },
    );
  };

  const initForm = () =>
    initialData
      ? normalizeInitialForm(initialData)
      : {
          aircraftType: "",
          rpc: lockedAircraftRpc,
          date: new Date(),
          controlNo: "",
          legs: [emptyLeg()],
          remarks: "",
          sling: "",
          fuelServicing: [emptyFuelItem()],
          oilServicing: [emptyOilItem()],
          workItems: [],
          createdBy: userRole,
          ...entryConfirmation,
        };

  const initComponent = () => {
    const hydratedComponentData = initialData
      ? hydrateLegacyB412FlightLog(initialData).componentData
      : null;
    const sourceComponentData = hydratedComponentData || initialComponentData;
    const emptyComponentData = {
      broughtForwardData: emptyComponentSection(),
      thisFlightData: emptyComponentSection(),
      toDateData: emptyComponentSection(),
    };

    if (!sourceComponentData) return emptyComponentData;

    return {
      broughtForwardData: {
        ...emptyComponentData.broughtForwardData,
        ...(sourceComponentData.broughtForwardData || {}),
      },
      thisFlightData: {
        ...emptyComponentData.thisFlightData,
        ...(sourceComponentData.thisFlightData || {}),
      },
      toDateData: {
        ...emptyComponentData.toDateData,
        ...(sourceComponentData.toDateData || {}),
      },
    };
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

  // The workspace supplies a new source after sync, recovery, or mission edits.
  useEffect(() => {
    if (!embedded || !visible || !initialData) return;
    setFormData(normalizeInitialForm(initialData));
    setComponentData(initComponent());
  }, [embedded, visible, initialData]);

  const legCount = formData.legs?.length;
  useEffect(() => {
    setFormData((prev) => syncServicingToLegs(prev));
  }, [legCount]);

  useEffect(() => {
    const loadedRpc = String(
      loadedAircraftData?.aircraft || loadedAircraftData?.rpc || "",
    )
      .trim()
      .toUpperCase();
    const selectedRpc = String(formData.rpc || "")
      .trim()
      .toUpperCase();
    const isOriginalEditAircraft =
      editMode &&
      String(initialData?.rpc || "")
        .trim()
        .toUpperCase() ===
        String(formData.rpc || "")
          .trim()
          .toUpperCase();

    if (
      !loadedAircraftData?.referenceData ||
      !selectedRpc ||
      loadedRpc !== selectedRpc ||
      isOriginalEditAircraft
    )
      return;

    const broughtForwardData = monitoringBroughtForward(loadedAircraftData);

    setComponentData((prev) => ({
      ...prev,
      broughtForwardData: {
        ...prev.broughtForwardData,
        ...broughtForwardData,
      },
    }));
  }, [editMode, formData.rpc, initialData?.rpc, loadedAircraftData]);

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

    const hasDisc = embedded || formData.remarks?.trim() !== "";

    // Pilots can review crew assignments in Basic Information on existing logs.
    if (isPilot && !embedded) {
      return [ALL_TABS[0], ALL_TABS[1], ALL_TABS[5]];
    }

    // Other roles retain the existing full-record edit view.
    if (editMode) {
      const baseTabs = [...ALL_TABS];
      if (hasDisc && !baseTabs.find((t) => t.key === "workdone")) {
        baseTabs.push(WORK_DONE_TAB);
      }
      return baseTabs;
    }

    const mechanicTabs = [
      ALL_TABS[0],
      ALL_TABS[1],
      ALL_TABS[2],
      ALL_TABS[3],
      ALL_TABS[4],
      ALL_TABS[5],
    ];
    if (hasDisc && !mechanicTabs.find((t) => t.key === "workdone")) {
      mechanicTabs.push(WORK_DONE_TAB);
    }
    return mechanicTabs;
  }, [isAircraftSelected, isPilot, editMode, formData.remarks, embedded]);

  const effectiveActiveTab = tabs.some((tab) => tab.key === activeTab)
    ? activeTab
    : tabs[0]?.key || "info";

  useEffect(() => {
    if (activeTab !== effectiveActiveTab) {
      setActiveTab(effectiveActiveTab);
    }
  }, [activeTab, effectiveActiveTab]);

  const updateForm = (field, value) => {
    if (field === 'rpc' && lockedAircraftRpc && value !== lockedAircraftRpc) return;
    if (field === "rpc") {
      setActiveTab("info");

      if (String(formData.rpc || "") !== String(value || "")) {
        const isReturningToOriginalAircraft =
          editMode &&
          String(initialData?.rpc || "")
            .trim()
            .toUpperCase() ===
            String(value || "")
              .trim()
              .toUpperCase();

        setComponentData(
          isReturningToOriginalAircraft
            ? initComponent()
            : {
                broughtForwardData: emptyComponentSection(),
                thisFlightData: emptyComponentSection(),
                toDateData: emptyComponentSection(),
              },
        );
      }
    }

    setFormData((prev) => {
      if (field === "rpc" && String(prev.rpc || "") !== String(value || "")) {
        const isReturningToOriginalAircraft =
          editMode &&
          String(initialData?.rpc || "")
            .trim()
            .toUpperCase() ===
            String(value || "")
              .trim()
              .toUpperCase();
        if (isReturningToOriginalAircraft) {
          return normalizeInitialForm(initialData);
        }

        return {
          ...prev,
          rpc: value,
          aircraftType: "",
          legs: [emptyLeg()],
          remarks: "",
          sling: "",
          fuelServicing: [emptyFuelItem()],
          oilServicing: [emptyOilItem()],
          workItems: [],
          broughtForwardLocked: false,
          serialNumber: "",
          b412Data: undefined,
        };
      }

      return { ...prev, [field]: value };
    });
  };

  const handleAircraftDataLoaded = (aircraftData) => {
    if (!visible) return;

    setLoadedAircraftData(aircraftData);
    if (!aircraftData) return;

    const loadedRpc = String(aircraftData.aircraft || aircraftData.rpc || "")
      .trim()
      .toUpperCase();
    const originalRpc = String(initialData?.rpc || initialData?.aircraft || "")
      .trim()
      .toUpperCase();
    if (editMode && loadedRpc && originalRpc && loadedRpc === originalRpc) {
      setFormData((prev) => ({
        ...prev,
        aircraftType: aircraftData.aircraftType || prev.aircraftType || "",
        serialNumber: aircraftData.serialNumber || prev.serialNumber || "",
      }));
      return;
    }

    setFormData((prev) => {
      const aircraftType = aircraftData.aircraftType || "";
      const serialNumber = aircraftData.serialNumber || prev.serialNumber || "";
      const nextFormData = {
        ...prev,
        aircraftType,
        serialNumber,
      };

      if (!isB412Aircraft(aircraftType)) return nextFormData;

      const carriedB412 = mapAircraftReferenceToB412(aircraftData);
      return {
        ...nextFormData,
        b412Data: createEmptyB412Data({
          ...(prev.b412Data || {}),
          serialNumber: serialNumber || prev.b412Data?.serialNumber,
          componentData: {
            ...(prev.b412Data?.componentData || {}),
            broughtForwardData: carriedB412.broughtForwardData,
            airframeNextInspectionDueAt:
              carriedB412.airframeNextInspectionDueAt,
            engineNextInspectionDueAt: carriedB412.engineNextInspectionDueAt,
          },
        }),
      };
    });
  };

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
      setFormData((prev) => {
        const maxLegs = isB412Aircraft(prev.aircraftType) ? 6 : Infinity;
        return prev.legs.length >= maxLegs
          ? prev
          : { ...prev, legs: [...prev.legs, emptyLeg()] };
      }),
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
    !readOnly && isMechanic &&
    (!editMode || isMechanic || embedded) &&
    (!permissions || permissions.preparation);
  const isCompletedLog = editMode && formData.status === "completed";
  const isRPCEditable =
    !lockedAircraftRpc && (!editMode || !isReleasedFlightLogStatus(formData.status));
  const canEditDestinations =
    !readOnly && !isCompletedLog && canEnterDestinations;
  const canEditComponent = !readOnly && isMechanic;
  const canEditNextInspectionDates = !readOnly && isMechanic;
  const canEditFuelOil =
    !readOnly && isMechanic && (!permissions || permissions.maintenance);
  const canEditWorkDone =
    !readOnly && isMechanic && (!permissions || permissions.maintenance);
  const canEditDiscrepancy = !readOnly && isMechanic && (!permissions || permissions.flight);
  const canSave = !readOnly && isMechanic && !isCompletedLog;
  const canSaveCurrentTab =
    canSave ||
    (effectiveActiveTab === "component" && canEditNextInspectionDates);

  const buildSavePayload = (sourceFormData) => {
    const dateStr =
      sourceFormData.date instanceof Date
        ? sourceFormData.date.toLocaleDateString("en-US", {
            month: "2-digit",
            day: "2-digit",
            year: "numeric",
          })
        : sourceFormData.date;

    const payload = {
      ...sourceFormData,
      componentData,
      date: dateStr,
    };

    if (isB412Aircraft(sourceFormData.aircraftType)) {
      payload.b412Data = adaptStandardFlightLogToB412({
        ...payload,
        workItems: payload.workItems.filter(
          (item) => item.phase !== "post_flight",
        ),
      });
      return payload;
    }

    if (sourceFormData.b412Data === undefined) {
      delete payload.b412Data;
    }

    return payload;
  };

  const validateRequiredFlightTime = () => {
    const error = requiredFlightTimeError(formData.legs);
    if (!error) return true;
    setValidationError(error);
    setActiveTab("destinations");
    message.error(error);
    return false;
  };

  const handleSave = async () => {
    if (!isMechanic) return;
    setValidationError("");
    if (
      isCompletedLog &&
      !(effectiveActiveTab === "component" && canEditNextInspectionDates)
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
    if (!validateRequiredFlightTime()) return;
    if (isPilot && canEditDestinations) {
      const invalidLegIndex = (formData.legs || []).findIndex((leg) => {
        const hasInvalidRoute = (leg.stations || []).some(
          (station) =>
            !String(station?.from || "").trim() ||
            !String(station?.to || "").trim(),
        );
        const hasMissingField = !String(leg?.date || "").trim();
        return hasInvalidRoute || hasMissingField;
      });
      if (invalidLegIndex >= 0) {
        const errorMessage =
          "Each leg must include complete station route and date";
        setValidationError(errorMessage);
        setActiveTab("destinations");
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
    } catch (error) {
      setValidationError(error.message || "Could not save this flight draft.");
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (!visible || formData.status === "completed") return;
    const hours = totalFlightHours(formData.legs);
    const landingCycle = String(
      flightLandingCycles(formData.legs, formData.additionalLandings),
    );
    setComponentData((previous) => {
      if (
        previous.thisFlightData?.landingCycle === landingCycle &&
        FLIGHT_HOUR_FIELDS.every(
          (key) => previous.thisFlightData?.[key] === hours,
        )
      )
        return previous;
      return {
        ...previous,
        thisFlightData: {
          ...previous.thisFlightData,
          ...Object.fromEntries(FLIGHT_HOUR_FIELDS.map((key) => [key, hours])),
          landingCycle,
        },
      };
    });
  }, [visible, formData.legs, formData.status, formData.additionalLandings]);

  useEffect(() => {
    if (!visible || formData.status === "completed") return;
    setFormData((previous) => {
      const next = syncFlightLogDates(previous);
      return JSON.stringify(previous) === JSON.stringify(next)
        ? previous
        : next;
    });
  }, [visible, formData]);

  const renderContent = () => {
    switch (effectiveActiveTab) {
      case "info":
        return (
          <FlightLogModalInfo
            formData={formData}
            updateForm={updateForm}
            isEditable={canSave && canEditBasicInfo}
            isRPCEditable={embedded ? false : isRPCEditable}
            isActive={visible}
            onAircraftDataLoaded={handleAircraftDataLoaded}
            assignmentRole={isPilot ? "Mechanic" : isMechanic ? "Pilot" : null}
            canAssign={
              canSave &&
              (isPilot || isMechanic) &&
              (!permissions || permissions.preparation)
            }
          />
        );
      case "destinations":
        return (
          <FlightLogModalDestinations
            formData={formData}
            handlers={legHandlers}
            isEditable={canSave && canEditDestinations}
            maxLegs={isB412Aircraft(formData.aircraftType) ? 6 : undefined}
          />
        );
      case "component":
        return (
          <FlightLogModalComponentTimes
            legCount={formData.legs?.length || 0}
            additionalLandings={formData.additionalLandings || 0}
            onAdditionalLandingsChange={(additionalLandings) =>
              setFormData((previous) => ({ ...previous, additionalLandings }))
            }
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
            lockedRows={
              formData.inspectionFlow !== "confirmation" &&
              permissions &&
              !permissions.preparation
                ? (initialData?.workflowHistory?.findLast(
                    (event) => event.action === "release",
                  )?.snapshot?.fuelServicing?.length ??
                  initialData?.fuelServicing?.length ??
                  0)
                : 0
            }
          />
        );
      case "oil":
        return (
          <FlightLogModalOilServicing
            formData={formData}
            updateOil={updateOil}
            isEditable={canSave && canEditFuelOil}
            lockedRows={
              formData.inspectionFlow !== "confirmation" &&
              permissions &&
              !permissions.preparation
                ? (initialData?.workflowHistory?.findLast(
                    (event) => event.action === "release",
                  )?.snapshot?.oilServicing?.length ??
                  initialData?.oilServicing?.length ??
                  0)
                : 0
            }
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
            phase={
              permissions && !permissions.preparation
                ? "post_flight"
                : "preparation"
            }
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
  const showCompleteButton =
    editMode &&
    !readOnly &&
    isMechanic &&
    normalizedStatus === "accepted" &&
    formData.notifiedForCompletion;
  const workflowGuide = useMemo(() => {
    if (readOnly || isCompletedLog) {
      return {
        type: "info",
        title: "This flight log is completed or view-only for your role.",
      };
    }

    if (!editMode) {
      return {
        type: "info",
        title: isPilot
          ? "Fill in basic information, destinations, and discrepancy remarks before adding the flight log."
          : "Fill in component times, servicing details, and remarks before adding the flight log.",
      };
    }

    if (showReleaseButton) {
      return {
        type: "warning",
        title:
          "Review the mechanic sections, then release this flight log for pilot acceptance.",
      };
    }

    if (showAcceptButton) {
      return {
        type: "success",
        title: "This flight log is released and ready for pilot acceptance.",
      };
    }

    if (showCompleteButton) {
      return {
        type: "success",
        title: "This flight log is ready for mechanic completion.",
      };
    }

    if (isPilot) {
      return {
        type: "info",
        title:
          "Your role can update pilot sections while the flight log remains editable.",
      };
    }

    if (isMechanic) {
      return {
        type: "info",
        title:
          "Your role can update mechanic sections while the flight log remains editable.",
      };
    }

    return {
      type: "info",
      title: "You can review this flight log based on your role access.",
    };
  }, [
    editMode,
    isCompletedLog,
    isMechanic,
    isPilot,
    readOnly,
    showAcceptButton,
    showCompleteButton,
    showReleaseButton,
  ]);

  useEffect(() => {
    if (embedded) onDraftChange?.(buildSavePayload(formData));
  }, [embedded, formData, componentData, onDraftChange]);
  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  return (
    <EntryShell
      embedded={embedded}
      open={visible}
      onCancel={onClose}
      footer={null}
      width={1160}
      centered
      zIndex={3000}
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
              className={`fl-tab-btn${effectiveActiveTab === tab.key ? " fl-tab-btn--active" : ""}`}
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
          {!embedded && workflowGuide && (
            <Alert
              type={workflowGuide.type}
              showIcon
              title={workflowGuide.title}
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
          {!embedded &&
            (showReleaseButton ||
              showAcceptButton ||
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
                    onClick={() => {
                      if (validateRequiredFlightTime())
                        onRelease?.(buildSavePayload(formData));
                    }}
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
                {showCompleteButton && (
                  <Button
                    type="primary"
                    loading={workflowLoading}
                    onClick={() =>
                      validateRequiredFlightTime() &&
                      onComplete?.(buildSavePayload(formData))
                    }
                  >
                    Complete
                  </Button>
                )}
              </div>
            )}
        </div>

        {/* Footer actions */}
        <div
          className="fl-modal-footer"
          style={embedded ? { display: "none" } : undefined}
        >
          {canSaveCurrentTab ? (
            <Button
              type="primary"
              className="fl-nav-btn"
              onClick={handleSave}
              loading={submitting}
            >
              {editMode ? "Save Draft" : "Create Draft"}
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
    </EntryShell>
  );
}
