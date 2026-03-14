import React, { useState, useEffect } from "react";
import FlightLogApprove from "./FlightLogApprove";
import "./FlightLogVerifyTechnical.css"; // your CSS file for styling

export default function FlightLogVerifyTechnical({
  visible,
  entry,
  onClose,
  onApprove,
}) {
  const [currentPage, setCurrentPage] = useState(0);
  const [formData, setFormData] = useState({});

  // Confirmation modals
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [showVorCheckForm, setShowVorCheckForm] = useState(false);
  const [showFinalConfirm, setShowFinalConfirm] = useState(false);

  // Exact same page structure as FlightLogEditTechnical but all fields are non-editable
  const pages = [
    [
      { label: "Tail No.", key: "tailNum", editable: false, value: "---" },
      {
        label: "Pilot in Command",
        key: "pilotInCommand",
        editable: false,
        value: "",
      },
      {
        label: "Second Pilot in Command",
        key: "secondPilotInCommand",
        editable: false,
        value: "",
      },
      {
        label: "Depart (Station ID)",
        key: "depart",
        editable: false,
        value: "",
      },
      {
        label: "Arrive (Station ID)",
        key: "arrive",
        editable: false,
        value: "",
      },
      {
        label: "Off Block",
        key: "offBlock",
        editable: false,
        value: "",
      },
      {
        label: "On Block",
        key: "onBlock",
        editable: false,
        value: "",
      },
      {
        label: "Date Zulu",
        key: "dateZulu",
        editable: false,
        value: "",
      },
      { label: "Date", key: "date", editable: false, value: "" },
    ],
    [
      {
        label: "Flight Time",
        key: "flightTime",
        editable: false,
        value: "",
      },
      {
        label: "Block Time",
        key: "blockTime",
        editable: false,
        value: "",
      },
      { label: "Cycles", key: "cycles", editable: false, value: "" },
      {
        label: "Night (Flight Specific)",
        key: "nightFlightSpecific",
        editable: false,
        value: "",
      },
      {
        label: "N. Ldg (Flight Specific)",
        key: "nLdgFlightSpecific",
        editable: false,
        value: "",
      },
      {
        label: "App (Flight Specific)",
        key: "appFlightSpecific",
        editable: false,
        value: "",
      },
      {
        label: "Inst (Flight Specific)",
        key: "instFlightSpecific",
        editable: false,
        value: "",
      },
      {
        label: "Pilot (Flight Specific)",
        key: "pilotFlightSpecific",
        editable: false,
        value: "",
      },
    ],
    [
      {
        label: "Engine 1 (Times Forward)",
        key: "engine1TForward",
        editable: false,
        value: "",
      },
      {
        label: "Engine 2 (Times Forward)",
        key: "engine2TForward",
        editable: false,
        value: "",
      },
      {
        label: "APLI (Times Forward)",
        key: "apliTForward",
        editable: false,
        value: "",
      },
      {
        label: "Engine 1 (Current Times)",
        key: "engine1CTimes",
        editable: false,
        value: "",
      },
      {
        label: "Engine 2 (Current Times)",
        key: "engine2CTimes",
        editable: false,
        value: "",
      },
      {
        label: "APLI (Current Times)",
        key: "apliTCTimes",
        editable: false,
        value: "",
      },
    ],
    [
      {
        label: "Totals This Flight Log",
        key: "totalsThisFlightLog",
        editable: false,
        value: "",
      },
      {
        label: "",
        key: "totalsThisFlightLog1",
        editable: false,
        value: "",
      },
      {
        label: "",
        key: "totalsThisFlightLog2",
        editable: false,
        value: "",
      },
      {
        label: "Airframe Forward",
        key: "airframeForward",
        editable: false,
        value: "",
      },
      {
        label: "",
        key: "airframeForward1",
        editable: false,
        value: "",
      },
      {
        label: "",
        key: "airframeForward2",
        editable: false,
        value: "",
      },
      {
        label: "Airframe Total Time",
        key: "airframeTotalTime",
        editable: false,
        value: "",
      },
      {
        label: "",
        key: "airframeTotalTime1",
        editable: false,
        value: "",
      },
      {
        label: "",
        key: "airframeTotalTime2",
        editable: false,
        value: "",
      },
    ],
    [
      {
        label: "Engine 1 (Cyc. PWD)",
        key: "engine1CycPWD",
        editable: false,
        value: "",
      },
      {
        label: "Engine 2 (Cyc. PWD)",
        key: "engine2CycPWD",
        editable: false,
        value: "",
      },
      {
        label: "Engine 1 (Cycles)",
        key: "engine1Cycles",
        editable: false,
        value: "",
      },
      {
        label: "Engine 2 (Cycles)",
        key: "engine2Cycles",
        editable: false,
        value: "",
      },
    ],
    [
      { label: "Departure", key: "departure", editable: false, value: "" },
      { label: "PAX", key: "pax", editable: false, value: "" },
      {
        label: "Fuel Purchased",
        key: "fuelPurchased",
        editable: false,
        value: "",
      },
      { label: "Fuel Out", key: "fuelOut", editable: false, value: "" },
      { label: "Fuel In", key: "fuelIn", editable: false, value: "" },
      { label: "Fuel Burn", key: "fuelBurn", editable: false, value: "" },
      { label: "Leg Distance", key: "legDistance", editable: false, value: "" },
      { label: "FBO Handler", key: "fboHandler", editable: false, value: "" },
    ],
  ];

  useEffect(() => {
    if (entry) {
      // Map entry data exactly as FlightLogEditTechnical does
      setFormData({
        tailNum: entry.tailNum || "---",
        date: entry.date || "",
        depart: entry.depart || "",
        arrive: entry.arrive || "",
        offBlock: entry.offBlock || "",
        onBlock: entry.onBlock || "",
        blockTime: entry.blockTime || "",
        flightTime: entry.flightTime || "",
        // Initialize other fields with empty values
        pilotInCommand: "",
        secondPilotInCommand: "",
        dateZulu: "",
        cycles: "",
        nightFlightSpecific: "",
        nLdgFlightSpecific: "",
        appFlightSpecific: "",
        instFlightSpecific: "",
        pilotFlightSpecific: "",
        engine1TForward: "",
        engine2TForward: "",
        apliTForward: "",
        engine1CTimes: "",
        engine2CTimes: "",
        apliTCTimes: "",
        totalsThisFlightLog: "",
        totalsThisFlightLog1: "",
        totalsThisFlightLog2: "",
        airframeForward: "",
        airframeForward1: "",
        airframeForward2: "",
        airframeTotalTime: "",
        airframeTotalTime1: "",
        airframeTotalTime2: "",
        engine1CycPWD: "",
        engine2CycPWD: "",
        engine1Cycles: "",
        engine2Cycles: "",
        departure: "",
        pax: "",
        fuelPurchased: "",
        fuelOut: "",
        fuelIn: "",
        fuelBurn: "",
        legDistance: "",
        fboHandler: "",
      });
      setCurrentPage(0);
    }
  }, [entry]);

  const handleApprove = () => setShowApproveConfirm(true);
  const handleConfirmApprove = () => {
    setShowApproveConfirm(false);
    setShowVorCheckForm(true);
  };
  const handleVorCheckSubmit = (vorCheckData) => {
    setShowVorCheckForm(false);
    setShowFinalConfirm(true);
  };
  const handleVorCheckCancel = () => setShowVorCheckForm(false);
  const handleFinalConfirm = () => {
    const verifiedLog = {
      ...entry,
      status: "verified",
      verifiedAt: new Date().toLocaleDateString(),
    };
    onApprove?.(verifiedLog);
    setShowFinalConfirm(false);
    onClose();
  };
  const handleDiscard = () => onClose();

  if (!visible || !entry) return null;

  return (
    <>
      {/* Main Modal */}
      <div className="modal-overlay">
        <div className="modal-card">
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
          <h2 className="modal-title">Verify Technical Log</h2>

          {/* Render form fields */}
          {pages[currentPage]?.map((field, index) => (
            <div key={index} className="form-group">
              <label>{field.label}</label>
              <input
                type="text"
                value={formData[field.key] ?? field.value ?? ""}
                readOnly
              />
            </div>
          ))}

          {/* Approve / Cancel buttons */}
          {currentPage === pages.length - 1 && (
            <div className="button-group">
              <button className="primary-btn" onClick={handleApprove}>
                Approve
              </button>
              <button className="secondary-btn" onClick={handleDiscard}>
                Cancel
              </button>
            </div>
          )}

          {/* Page navigation */}
          <div className="page-nav">
            <button
              onClick={() => setCurrentPage(Math.max(currentPage - 1, 0))}
              disabled={currentPage === 0}
            >
              Previous
            </button>
            <span>{currentPage + 1}</span>
            <button
              onClick={() =>
                setCurrentPage(Math.min(currentPage + 1, pages.length - 1))
              }
              disabled={currentPage === pages.length - 1}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Approve Confirmation */}
      {showApproveConfirm && (
        <div className="modal-overlay">
          <div className="alert-card">
            <h3>APPROVE LOG</h3>
            <p>Are you sure you want to approve this log?</p>
            <div className="button-group">
              <button className="primary-btn" onClick={handleConfirmApprove}>
                YES
              </button>
              <button
                className="secondary-btn"
                onClick={() => setShowApproveConfirm(false)}
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VOR Check Form */}
      <FlightLogApprove
        visible={showVorCheckForm}
        aircraftNumber={formData.tailNum}
        onConfirm={handleVorCheckSubmit}
        onCancel={handleVorCheckCancel}
      />

      {/* Final Confirm */}
      {showFinalConfirm && (
        <div className="modal-overlay">
          <div className="alert-card">
            <h3>CONFIRM LOG</h3>
            <p>Are you sure you want to confirm this log?</p>
            <div className="button-group">
              <button className="primary-btn" onClick={handleFinalConfirm}>
                CONFIRM
              </button>
              <button
                className="secondary-btn"
                onClick={() => setShowFinalConfirm(false)}
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
