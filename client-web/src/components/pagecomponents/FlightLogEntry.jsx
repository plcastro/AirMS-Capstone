import React, { useState, useEffect, useRef, useMemo } from "react";
import { Button, Input, message, Modal, Space, Spin } from "antd";
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
  const r = role.toLowerCase();
  if (r === "pilot") return "pilot";
  if (r === "engineer" || r === "maintenance manager") return "mechanic";
  return "pilot";
};

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
const emptyWorkItem = () => ({
  id: `${Date.now()}-${Math.random()}`,
  selectedWorkTypes: [],
  date: "",
  aircraft: "",
  workDone: "",
  name: "",
  certificateNumber: "",
  signature: "",
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

export default function FlightLogEntry({
  visible,
  onClose,
  onSave,
  userRole,
  editMode = false,
  initialData = null,
  initialComponentData = null,
}) {
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
  const [activeTab, setActiveTab] = useState("info");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      setFormData(initForm());
      setComponentData(initComponent());
      setActiveTab("info");
    }
  }, [visible]);

  const legCount = formData.legs?.length;
  useEffect(() => {
    setFormData((prev) => syncServicingToLegs(prev));
  }, [legCount]);

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

  const tabKeys = tabs.map((t) => t.key);
  const currentIdx = Math.max(0, tabKeys.indexOf(activeTab));
  const isFirst = currentIdx === 0;
  const isLast = currentIdx === tabKeys.length - 1;

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
  const canEditBasicInfo = !editMode || formData.createdBy === userRole;
  const canEditDestinations = !editMode ? isPilot : isPilot && editMode;
  const canEditComponent = !editMode
    ? isMechanic
    : isMechanic && editMode && !formData.broughtForwardLocked;
  const canEditFuelOil = !editMode ? isMechanic : isMechanic && editMode;
  const canEditWorkDone = !editMode ? isMechanic : isMechanic && editMode;
  const canEditDiscrepancy = true; // Anyone can edit discrepancy

  const handleSave = async () => {
    if (!formData.rpc?.trim()) {
      message.error("Aircraft RPC is required");
      return;
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
            isEditable={canEditBasicInfo}
          />
        );
      case "destinations":
        return (
          <FlightLogModalDestinations
            formData={formData}
            handlers={legHandlers}
            isEditable={canEditDestinations}
          />
        );
      case "component":
        return (
          <FlightLogModalComponentTimes
            componentData={componentData}
            updateComponent={updateComponent}
            isEditable={canEditComponent}
            isLocked={formData.broughtForwardLocked}
          />
        );
      case "fuel":
        return (
          <FlightLogModalFuelServicing
            formData={formData}
            updateFuel={updateFuel}
            isEditable={canEditFuelOil}
          />
        );
      case "oil":
        return (
          <FlightLogModalOilServicing
            formData={formData}
            updateOil={updateOil}
            isEditable={canEditFuelOil}
          />
        );
      case "discrepancy":
        return (
          <FlightLogDiscrepancyRemarks
            formData={formData}
            updateForm={updateForm}
            isEditable={canEditDiscrepancy}
          />
        );
      case "workdone":
        return (
          <FlightLogModalWorkDone
            formData={formData}
            updateForm={updateForm}
            isEditable={canEditWorkDone}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Modal
      open={visible}
      onCancel={onClose}
      footer={null}
      width={760}
      centered
      styles={{ body: { padding: 0 } }}
      className="fl-entry-modal"
      destroyOnHidden
    >
      <Spin spinning={submitting}>
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
        <div className="fl-modal-body">{renderContent()}</div>

        {/* Footer nav */}
        <div className="fl-modal-footer">
          <Button
            className="fl-nav-btn"
            onClick={() => setActiveTab(tabKeys[currentIdx - 1])}
            disabled={isFirst}
          >
            Previous
          </Button>
          <span className="fl-page-indicator">{currentIdx + 1}</span>
          {!isLast ? (
            <Button
              type="primary"
              className="fl-nav-btn"
              onClick={() => setActiveTab(tabKeys[currentIdx + 1])}
            >
              Next
            </Button>
          ) : (
            <Button
              type="primary"
              className="fl-nav-btn"
              onClick={handleSave}
              loading={submitting}
            >
              {editMode ? "Save" : "Add"}
            </Button>
          )}
        </div>
      </Spin>
    </Modal>
  );
}
