import React, { useState, useEffect } from "react";
import { Modal, Input, Button, Row, Col } from "antd";
import FlightLogApprove from "./FlightLogApprove";

export default function FlightLogVerifyTechnical({
  visible,
  entry,
  onClose,
  onApprove,
}) {
  const [currentPage, setCurrentPage] = useState(0);
  const [formData, setFormData] = useState({});

  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [showVorCheckForm, setShowVorCheckForm] = useState(false);
  const [showFinalConfirm, setShowFinalConfirm] = useState(false);
  const [pendingVorCheckData, setPendingVorCheckData] = useState(null);

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
        pilotInCommand: entry.pilotInCommand || "",
        secondPilotInCommand: entry.secondPilotInCommand || "",
        date: entry.date || "",
        depart: entry.depart || "",
        arrive: entry.arrive || "",
        offBlock: entry.offBlock || "",
        onBlock: entry.onBlock || "",
        blockTime: entry.blockTime || "",
        flightTime: entry.flightTime || "",
        // Initialize other fields with empty values or from entry if available
        dateZulu: entry.dateZulu || "",
        cycles: entry.cycles || "",
        nightFlightSpecific: entry.nightFlightSpecific || "",
        nLdgFlightSpecific: entry.nLdgFlightSpecific || "",
        appFlightSpecific: entry.appFlightSpecific || "",
        instFlightSpecific: entry.instFlightSpecific || "",
        pilotFlightSpecific: entry.pilotFlightSpecific || "",
        engine1TForward: entry.engine1TForward || "",
        engine2TForward: entry.engine2TForward || "",
        apliTForward: entry.apliTForward || "",
        engine1CTimes: entry.engine1CTimes || "",
        engine2CTimes: entry.engine2CTimes || "",
        apliTCTimes: entry.apliTCTimes || "",
        totalsThisFlightLog: entry.totalsThisFlightLog || "",
        totalsThisFlightLog1: entry.totalsThisFlightLog1 || "",
        totalsThisFlightLog2: entry.totalsThisFlightLog2 || "",
        airframeForward: entry.airframeForward || "",
        airframeForward1: entry.airframeForward1 || "",
        airframeForward2: entry.airframeForward2 || "",
        airframeTotalTime: entry.airframeTotalTime || "",
        airframeTotalTime1: entry.airframeTotalTime1 || "",
        airframeTotalTime2: entry.airframeTotalTime2 || "",
        engine1CycPWD: entry.engine1CycPWD || "",
        engine2CycPWD: entry.engine2CycPWD || "",
        engine1Cycles: entry.engine1Cycles || "",
        engine2Cycles: entry.engine2Cycles || "",
        departure: entry.departure || "",
        pax: entry.pax || "",
        fuelPurchased: entry.fuelPurchased || "",
        fuelOut: entry.fuelOut || "",
        fuelIn: entry.fuelIn || "",
        fuelBurn: entry.fuelBurn || "",
        legDistance: entry.legDistance || "",
        fboHandler: entry.fboHandler || "",
      });
      setCurrentPage(0);
    }
  }, [entry]);

  const handleApprove = async () => {
    // const result = Modal.confirm({
    //   title: "APPROVE LOG",
    //   content: "Are you sure you want to approve this log?",
    //   okText: "YES",
    //   cancelText: "CANCEL",
    // });

    setShowVorCheckForm(true);
  };

  const handleVorCheckSubmit = (vorCheckData) => {
    setShowVorCheckForm(false);

    Modal.confirm({
      title: "CONFIRM LOG",
      content: "Are you sure you want to confirm this log?",
      okText: "CONFIRM",
      cancelText: "CANCEL",
      onOk: () => {
        const verifiedLog = {
          ...entry,
          status: "verified",
          verifiedAt: new Date().toLocaleDateString(),
          vorCheckData,
        };
        onApprove?.(verifiedLog);
        onClose();
      },
    });
  };

  const handleDiscard = () => onClose();

  const renderPage = (fields) =>
    fields.map((field) => (
      <Row key={field.key} style={{ marginBottom: 12 }}>
        <Col
          span={8}
          style={{
            display: "flex",
            alignItems: "center",
          }}
        >
          <strong>{field.label}:</strong>
        </Col>
        <Col span={16}>
          <Input value={formData[field.key] ?? ""} readOnly />
        </Col>
      </Row>
    ));

  return (
    <>
      <Modal
        title="Verify Technical Log"
        open={visible}
        onCancel={onClose}
        footer={null}
        width={600}
      >
        {renderPage(pages[currentPage])}

        {/* Page Navigation */}
        <Row justify="space-between" style={{ marginTop: 20 }}>
          <Button
            onClick={() => setCurrentPage(Math.max(currentPage - 1, 0))}
            disabled={currentPage === 0}
          >
            Previous
          </Button>
          <span
            style={{
              display: "flex",
              alignItems: "center",
            }}
          >
            Page {currentPage + 1} of {pages.length}
          </span>
          <Button
            onClick={() =>
              setCurrentPage(Math.min(currentPage + 1, pages.length - 1))
            }
            disabled={currentPage === pages.length - 1}
          >
            Next
          </Button>
        </Row>

        {/* Approve / Cancel Buttons on last page */}
        {currentPage === pages.length - 1 && (
          <Row justify="end" style={{ marginTop: 20, gap: 10 }}>
            <Button type="primary" onClick={handleApprove}>
              Approve
            </Button>
            <Button onClick={handleDiscard}>Cancel</Button>
          </Row>
        )}
      </Modal>

      {/* VOR Check Form */}
      <FlightLogApprove
        visible={showVorCheckForm}
        aircraftNumber={formData.tailNum}
        onConfirm={handleVorCheckSubmit}
        onCancel={() => setShowVorCheckForm(false)}
      />
    </>
  );
}
