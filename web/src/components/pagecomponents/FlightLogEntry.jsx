import React, { useState } from "react";
import { Modal, Input, Button, Tabs, message } from "antd";
import { PlusOutlined, CloseOutlined, MinusOutlined } from "@ant-design/icons";
import "../../pages/dashboard/logbook/flightlog.css";

const { TabPane } = Tabs;
const { TextArea } = Input;

export default function FlightLogEntry({ visible, onClose, onSave, userRole }) {
  const [currentTab, setCurrentTab] = useState("0");
  const [formData, setFormData] = useState({
    aircraftType: "",
    rpc: "",
    date: new Date(),
    controlNo: "",
    legs: [{
      stations: [{ from: "", to: "" }],
      blockTimeOn: "", blockTimeOff: "", flightTimeOn: "", flightTimeOff: "",
      totalTimeOn: "", totalTimeOff: "",
      date: "", passengers: ""
    }],
    remarks: "",
    sling: "",
    workItems: [],
  });

  const [componentData, setComponentData] = useState({
    broughtForwardData: {
      airframe: "", gearBoxMain: "", gearBoxTail: "", rotorMain: "", rotorTail: "",
      airframeNextInsp: "", engine: "", cycleN1: "", cycleN2: "", usage: "",
      landingCycle: "", engineNextInsp: ""
    },
    thisFlightData: {},
    toDateData: {}
  });

  const isPilot = userRole === "pilot";

  const hasDiscrepancy = () => {
    return formData.remarks && formData.remarks.trim() !== "";
  };

  const getPilotTabs = () => [
    { key: "0", label: "Basic Information" },
    { key: "1", label: "Destination/s" },
    { key: "2", label: "Discrepancy/Remarks" }
  ];

  const getMechanicTabs = () => {
    const tabs = [
      { key: "0", label: "Basic Information" },
      { key: "1", label: "Component Times" },
      { key: "2", label: "Fuel Servicing" },
      { key: "3", label: "Oil Servicing" },
      { key: "4", label: "Discrepancy/Remarks" }
    ];
    if (hasDiscrepancy()) {
      tabs.push({ key: "5", label: "Work Done" });
    }
    return tabs;
  };

  const tabs = isPilot ? getPilotTabs() : getMechanicTabs();
  const currentTabIndex = parseInt(currentTab);
  const isLastTab = currentTabIndex === tabs.length - 1;

  const updateForm = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateLeg = (legIndex, field, value) => {
    const newLegs = [...formData.legs];
    newLegs[legIndex] = { ...newLegs[legIndex], [field]: value };
    setFormData(prev => ({ ...prev, legs: newLegs }));
  };

  const addLeg = () => {
    const newLeg = {
      stations: [{ from: "", to: "" }],
      blockTimeOn: "", blockTimeOff: "", flightTimeOn: "", flightTimeOff: "",
      totalTimeOn: "", totalTimeOff: "",
      date: "", passengers: ""
    };
    setFormData(prev => ({ ...prev, legs: [...prev.legs, newLeg] }));
  };

  const removeLeg = (legIndex) => {
    if (formData.legs.length > 1) {
      const newLegs = [...formData.legs];
      newLegs.splice(legIndex, 1);
      setFormData(prev => ({ ...prev, legs: newLegs }));
    }
  };

  const addStation = (legIndex) => {
    const newLegs = [...formData.legs];
    const lastStation = newLegs[legIndex].stations[newLegs[legIndex].stations.length - 1];
    newLegs[legIndex].stations.push({ from: lastStation.to, to: "" });
    setFormData(prev => ({ ...prev, legs: newLegs }));
  };

  const removeStation = (legIndex, stationIndex) => {
    const newLegs = [...formData.legs];
    if (newLegs[legIndex].stations.length > 1) {
      newLegs[legIndex].stations.splice(stationIndex, 1);
      setFormData(prev => ({ ...prev, legs: newLegs }));
    }
  };

  const updateStation = (legIndex, stationIndex, field, value) => {
    const newLegs = [...formData.legs];
    newLegs[legIndex].stations[stationIndex][field] = value;
    
    if (field === "to" && stationIndex < newLegs[legIndex].stations.length - 1) {
      newLegs[legIndex].stations[stationIndex + 1].from = value;
    }
    if (field === "from" && stationIndex > 0) {
      newLegs[legIndex].stations[stationIndex - 1].to = value;
    }
    
    setFormData(prev => ({ ...prev, legs: newLegs }));
  };

  const handleNext = () => {
    if (currentTabIndex < tabs.length - 1) {
      setCurrentTab(String(currentTabIndex + 1));
    }
  };

  const handlePrevious = () => {
    if (currentTabIndex > 0) {
      setCurrentTab(String(currentTabIndex - 1));
    }
  };

  const handleSave = () => {
    const aircraft = formData.rpc || "Aircraft";
    const msg = isPilot 
      ? `Flight log has been added for ${aircraft}. Wait for the mechanic to release it.`
      : `Flight log has been added for ${aircraft}. Wait for pilot to accept.`;
    
    message.success(msg);
    
    onSave({
      ...formData,
      componentData,
      id: Date.now().toString(),
      date: formData.date.toLocaleDateString("en-US", {
        month: "2-digit",
        day: "2-digit",
        year: "numeric"
      }),
      dateAdded: new Date().toLocaleDateString("en-US", {
        month: "2-digit",
        day: "2-digit",
        year: "numeric"
      }),
      status: isPilot ? "pending_release" : "pending_acceptance",
      createdBy: userRole
    });
    onClose();
  };

  const renderBasicInfoTab = () => (
    <div className="flightlog-form">
      <div className="flightlog-form-row">
        <label className="flightlog-form-label">Aircraft Type:</label>
        <Input 
          value={formData.aircraftType}
          onChange={(e) => updateForm("aircraftType", e.target.value)}
          placeholder="Select Aircraft Type"
        />
      </div>
      <div className="flightlog-form-row">
        <label className="flightlog-form-label">RP-C:</label>
        <Input 
          value={formData.rpc}
          onChange={(e) => updateForm("rpc", e.target.value)}
          placeholder="Select RP/C"
        />
      </div>
      <div className="flightlog-form-row">
        <label className="flightlog-form-label">Date:</label>
        <Input 
          value={formData.date.toLocaleDateString()}
          disabled
        />
      </div>
      <div className="flightlog-form-row">
        <label className="flightlog-form-label">Control No.:</label>
        <Input 
          value={formData.controlNo}
          onChange={(e) => updateForm("controlNo", e.target.value)}
          placeholder="Enter control number"
        />
      </div>
    </div>
  );

  const renderDestinationsTab = () => (
    <div className="flightlog-destinations">
      {formData.legs.map((leg, legIdx) => {
        const legNumber = legIdx + 1;
        const suffix = legNumber === 1 ? "st" : legNumber === 2 ? "nd" : legNumber === 3 ? "rd" : "th";
        
        return (
          <div key={legIdx} className="flightlog-leg-card">
            <div className="flightlog-leg-header">
              <span>{legNumber}{suffix} Leg</span>
              {formData.legs.length > 1 && (
                <Button type="text" danger icon={<CloseOutlined />} onClick={() => removeLeg(legIdx)} />
              )}
            </div>
            <div className="flightlog-leg-content">
              <label className="flightlog-form-label">Station</label>
              {leg.stations.map((station, stationIdx) => (
                <div key={stationIdx} className="flightlog-station-row">
                  <Input 
                    className="flightlog-station-input"
                    value={station.from}
                    onChange={(e) => updateStation(legIdx, stationIdx, "from", e.target.value)}
                    placeholder="From"
                  />
                  <span className="flightlog-station-separator">-</span>
                  <Input 
                    className="flightlog-station-input"
                    value={station.to}
                    onChange={(e) => updateStation(legIdx, stationIdx, "to", e.target.value)}
                    placeholder="To"
                  />
                  {leg.stations.length > 1 && (
                    <Button type="text" icon={<MinusOutlined />} onClick={() => removeStation(legIdx, stationIdx)} />
                  )}
                </div>
              ))}
              
              <Button type="dashed" block icon={<PlusOutlined />} onClick={() => addStation(legIdx)}>
                Add Station
              </Button>
              
              <div className="flightlog-time-section">
                <h4>Time Information</h4>
                <div className="flightlog-form-row">
                  <label>Block Time (ON):</label>
                  <Input value={leg.blockTimeOn} onChange={(e) => updateLeg(legIdx, "blockTimeOn", e.target.value)} />
                </div>
                <div className="flightlog-form-row">
                  <label>Block Time (OFF):</label>
                  <Input value={leg.blockTimeOff} onChange={(e) => updateLeg(legIdx, "blockTimeOff", e.target.value)} />
                </div>
                <div className="flightlog-form-row">
                  <label>Flight Time (ON):</label>
                  <Input value={leg.flightTimeOn} onChange={(e) => updateLeg(legIdx, "flightTimeOn", e.target.value)} />
                </div>
                <div className="flightlog-form-row">
                  <label>Flight Time (OFF):</label>
                  <Input value={leg.flightTimeOff} onChange={(e) => updateLeg(legIdx, "flightTimeOff", e.target.value)} />
                </div>
                <div className="flightlog-form-row">
                  <label>Total Time (ON):</label>
                  <Input value={leg.totalTimeOn} onChange={(e) => updateLeg(legIdx, "totalTimeOn", e.target.value)} />
                </div>
                <div className="flightlog-form-row">
                  <label>Total Time (OFF):</label>
                  <Input value={leg.totalTimeOff} onChange={(e) => updateLeg(legIdx, "totalTimeOff", e.target.value)} />
                </div>
                <div className="flightlog-form-row">
                  <label>Date:</label>
                  <Input value={leg.date} onChange={(e) => updateLeg(legIdx, "date", e.target.value)} placeholder="MM/DD/YYYY" />
                </div>
                <div className="flightlog-form-row">
                  <label>Passengers:</label>
                  <Input value={leg.passengers} onChange={(e) => updateLeg(legIdx, "passengers", e.target.value)} />
                </div>
              </div>
            </div>
          </div>
        );
      })}
      <Button type="dashed" block icon={<PlusOutlined />} onClick={addLeg}>
        Add Leg
      </Button>
    </div>
  );

  const renderDiscrepancyTab = () => (
    <div className="flightlog-form">
      <div className="flightlog-form-row">
        <label className="flightlog-form-label">Discrepancy/Remarks:</label>
        <TextArea 
          rows={4}
          value={formData.remarks}
          onChange={(e) => updateForm("remarks", e.target.value)}
          placeholder="Enter any discrepancies or remarks"
        />
      </div>
      <div className="flightlog-form-row">
        <label className="flightlog-form-label">Sling:</label>
        <TextArea 
          rows={4}
          value={formData.sling}
          onChange={(e) => updateForm("sling", e.target.value)}
          placeholder="Enter sling information"
        />
      </div>
    </div>
  );

  const renderComponentTimesTab = () => (
    <div className="flightlog-form">
      <h3>Brought Forward</h3>
      <div className="flightlog-form-row">
        <label>A/Frame:</label>
        <Input 
          value={componentData.broughtForwardData.airframe}
          onChange={(e) => setComponentData(prev => ({
            ...prev,
            broughtForwardData: { ...prev.broughtForwardData, airframe: e.target.value }
          }))}
          placeholder="Enter A/Frame"
        />
      </div>
      <div className="flightlog-form-row">
        <label>Gear Box (MAIN):</label>
        <Input 
          value={componentData.broughtForwardData.gearBoxMain}
          onChange={(e) => setComponentData(prev => ({
            ...prev,
            broughtForwardData: { ...prev.broughtForwardData, gearBoxMain: e.target.value }
          }))}
          placeholder="Enter Gear Box (MAIN)"
        />
      </div>
      <div className="flightlog-form-row">
        <label>Gear Box (TAIL):</label>
        <Input 
          value={componentData.broughtForwardData.gearBoxTail}
          onChange={(e) => setComponentData(prev => ({
            ...prev,
            broughtForwardData: { ...prev.broughtForwardData, gearBoxTail: e.target.value }
          }))}
          placeholder="Enter Gear Box (TAIL)"
        />
      </div>
      <div className="flightlog-form-row">
        <label>Rotor (MAIN):</label>
        <Input 
          value={componentData.broughtForwardData.rotorMain}
          onChange={(e) => setComponentData(prev => ({
            ...prev,
            broughtForwardData: { ...prev.broughtForwardData, rotorMain: e.target.value }
          }))}
          placeholder="Enter Rotor (MAIN)"
        />
      </div>
      <div className="flightlog-form-row">
        <label>Rotor (TAIL):</label>
        <Input 
          value={componentData.broughtForwardData.rotorTail}
          onChange={(e) => setComponentData(prev => ({
            ...prev,
            broughtForwardData: { ...prev.broughtForwardData, rotorTail: e.target.value }
          }))}
          placeholder="Enter Rotor (TAIL)"
        />
      </div>
      <div className="flightlog-form-row">
        <label>Airframe Next Insp. Due At:</label>
        <Input 
          value={componentData.broughtForwardData.airframeNextInsp}
          onChange={(e) => setComponentData(prev => ({
            ...prev,
            broughtForwardData: { ...prev.broughtForwardData, airframeNextInsp: e.target.value }
          }))}
          placeholder="Enter Airframe Next Insp. Due At"
        />
      </div>
    </div>
  );

  const renderFuelServicingTab = () => (
    <div className="flightlog-form">
      {formData.legs.map((leg, idx) => (
        <div key={idx} className="flightlog-leg-card">
          <div className="flightlog-leg-header">
            {idx + 1}{idx === 0 ? "st" : idx === 1 ? "nd" : idx === 2 ? "rd" : "th"} Leg
          </div>
          <div className="flightlog-leg-content">
            <div className="flightlog-form-row">
              <label>Date:</label>
              <Input placeholder="MM/DD/YYYY" />
            </div>
            <div className="flightlog-form-row">
              <label>Cont Check:</label>
              <Input placeholder="Enter contamination check" />
            </div>
            <div className="flightlog-form-row">
              <label>Main (REM/G):</label>
              <Input placeholder="Remaining/Gallons" />
            </div>
            <div className="flightlog-form-row">
              <label>Main (ADD):</label>
              <Input placeholder="Added Gallons" />
            </div>
            <div className="flightlog-form-row">
              <label>Main (TOTAL):</label>
              <Input placeholder="Total Gallons" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderOilServicingTab = () => (
    <div className="flightlog-form">
      {formData.legs.map((leg, idx) => (
        <div key={idx} className="flightlog-leg-card">
          <div className="flightlog-leg-header">
            {idx + 1}{idx === 0 ? "st" : idx === 1 ? "nd" : idx === 2 ? "rd" : "th"} Leg
          </div>
          <div className="flightlog-leg-content">
            <div className="flightlog-form-row">
              <label>Date:</label>
              <Input placeholder="MM/DD/YYYY" />
            </div>
            <div className="flightlog-form-row">
              <label>Engine (REM):</label>
              <Input placeholder="Remaining" />
            </div>
            <div className="flightlog-form-row">
              <label>Engine (ADD):</label>
              <Input placeholder="Added" />
            </div>
            <div className="flightlog-form-row">
              <label>Engine (TOT):</label>
              <Input placeholder="Total" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderWorkDoneTab = () => (
    <div className="flightlog-form">
      <div className="flightlog-checkbox-group">
        <label className="flightlog-checkbox">
          <input type="checkbox" /> Discrepancy Correction
        </label>
        <label className="flightlog-checkbox">
          <input type="checkbox" /> SB/AD Compliance
        </label>
        <label className="flightlog-checkbox">
          <input type="checkbox" /> Inspection
        </label>
        <label className="flightlog-checkbox">
          <input type="checkbox" /> Others
        </label>
      </div>
      <div className="flightlog-form-row">
        <label>Date:</label>
        <Input placeholder="MM/DD/YYYY" />
      </div>
      <div className="flightlog-form-row">
        <label>Aircraft/T/:</label>
        <Input placeholder="Aircraft type" />
      </div>
      <div className="flightlog-form-row">
        <label>Work Done:</label>
        <TextArea rows={3} placeholder="Describe work done" />
      </div>
      <div className="flightlog-form-row">
        <label>Name:</label>
        <Input placeholder="Technician name" />
      </div>
      <div className="flightlog-form-row">
        <label>Certificate Number:</label>
        <Input placeholder="Certificate number" />
      </div>
      <Button type="dashed" block icon={<PlusOutlined />}>
        Add Work Done
      </Button>
    </div>
  );

  const renderCurrentTab = () => {
    switch (tabs[currentTabIndex]?.label) {
      case "Basic Information":
        return renderBasicInfoTab();
      case "Destination/s":
        return renderDestinationsTab();
      case "Component Times":
        return renderComponentTimesTab();
      case "Fuel Servicing":
        return renderFuelServicingTab();
      case "Oil Servicing":
        return renderOilServicingTab();
      case "Discrepancy/Remarks":
        return renderDiscrepancyTab();
      case "Work Done":
        return renderWorkDoneTab();
      default:
        return null;
    }
  };

  return (
    <Modal
      title="New Flight Log Entry"
      open={visible}
      onCancel={onClose}
      footer={null}
      width={800}
      className="flightlog-modal"
      destroyOnClose
    >
      <Tabs 
        activeKey={currentTab} 
        onChange={setCurrentTab}
        className="flightlog-modal-tabs"
      >
        {tabs.map(tab => (
          <TabPane tab={tab.label} key={tab.key} />
        ))}
      </Tabs>
      
      <div style={{ minHeight: 400, maxHeight: 500, overflowY: "auto", padding: "16px 0" }}>
        {renderCurrentTab()}
      </div>
      
      <div className="flightlog-pagination">
        <button 
          className="prev-btn" 
          onClick={handlePrevious}
          disabled={currentTabIndex === 0}
        >
          Previous
        </button>
        <span className="page-number">{currentTabIndex + 1}</span>
        {!isLastTab ? (
          <button className="next-btn" onClick={handleNext}>
            Next
          </button>
        ) : (
          <button className="next-btn" onClick={handleSave}>
            Add
          </button>
        )}
      </div>
    </Modal>
  );
}