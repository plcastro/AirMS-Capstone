import React, { useState, useEffect, useMemo } from "react";
import { Button, message, Modal, Spin, Typography } from "antd";
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

  const initForm = () =>
    initialData
      ? syncServicingToLegs({
          ...initialData,
          workItems: initialData.workItems || [],
        })
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
    }
  }, [visible]);

  const legCount = formData.legs?.length;
  useEffect(() => {
    setFormData((prev) => syncServicingToLegs(prev));
  }, [legCount]);

  useEffect(() => {
    if (!loadedAircraftData?.referenceData || editMode) return;

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
  }, [isPilot, editMode, formData.remarks]);

  const updateForm = (field, value) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

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
    canSave || (activeTab === "component" && canEditNextInspectionDates);

  const handleSave = async () => {
    if (
      isCompletedLog &&
      !(activeTab === "component" && canEditNextInspectionDates)
    ) {
      message.info("Completed flight logs are view-only.");
      return;
    }

    if (!formData.rpc?.trim()) {
      message.error("Aircraft RPC is required");
      return;
    }
    if (!formData.date) {
      message.error("Flight log date is required");
      return;
    }
    if (canEditDestinations) {
      const invalidLegIndex = (formData.legs || []).findIndex((leg) => {
        const hasInvalidRoute = (leg.stations || []).some(
          (station) =>
            !String(station?.from || "").trim() ||
            !String(station?.to || "").trim(),
        );
        const hasMissingField = REQUIRED_DESTINATION_FIELDS.some(([key]) =>
          !String(leg?.[key] || "").trim(),
        );
        return hasInvalidRoute || hasMissingField;
      });
      if (invalidLegIndex >= 0) {
        const leg = (formData.legs || [])[invalidLegIndex] || {};
        const missingField = REQUIRED_DESTINATION_FIELDS.find(([key]) =>
          !String(leg?.[key] || "").trim(),
        );
        message.error(
          missingField
            ? `Leg ${invalidLegIndex + 1}: ${missingField[1]} is required`
            : `Leg ${invalidLegIndex + 1}: complete station route is required`,
        );
        return;
      }
    }
    const dateStr =
      formData.date instanceof Date
        ? formData.date.toLocaleDateString("en-US", {
            month: "2-digit",
            day: "2-digit",
            year: "numeric",
          })
        : formData.date;
    setSubmitting(true);
    try {
      await onSave({ ...formData, componentData, date: dateStr });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case "info":
        return (
          <FlightLogModalInfo
            formData={formData}
            updateForm={updateForm}
            isEditable={canSave && canEditBasicInfo}
            isRPCEditable={isRPCEditable}
            onAircraftDataLoaded={setLoadedAircraftData}
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
      styles={{ body: { padding: 0 } }}
      className="fl-entry-modal"
      destroyOnHidden
    >
      <Spin spinning={submitting}>
        <div className="fl-modal-header-block">
          <div className="fl-modal-title-main">
            {editMode ? "Edit Entry - Flight Log" : "Add Entry - Flight Log"}
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
                  onClick={() => onRelease?.(formData)}
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
                  onClick={() => onComplete?.(formData)}
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
