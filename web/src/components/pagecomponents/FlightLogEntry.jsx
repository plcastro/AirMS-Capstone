import React, { useState } from "react";
import { Modal, Input, Button, Row, Col } from "antd";
import ApproveMaintenance from "./ApproveMaintenance";

export default function FlightLogEntry({ visible, onClose, onSave, role }) {
  const [page, setPage] = useState(0);
  const [formData, setFormData] = useState({});
  const [showApproveModal, setShowApproveModal] = useState(false);
  const isPilot = role === "Pilot";
  const pages = [
    [
      {
        label: "Tail No.",
        key: "tailNum",
        editable: { isPilot },
        value: "---",
      },
      {
        label: "Pilot in Command",
        key: "pilotInCommand",
        editable: { isPilot },
        value: "",
      },
      {
        label: "Second Pilot in Command",
        key: "secondPilotInCommand",
        editable: { isPilot },
        value: "",
      },
      {
        label: "Depart (Station ID)",
        key: "depart",
        editable: { isPilot },
        value: "",
      },
      {
        label: "Arrive (Station ID)",
        key: "arrive",
        editable: { isPilot },
        value: "",
      },
      {
        label: "Off Block",
        key: "offBlock",
        editable: { isPilot },
        value: "",
      },
      {
        label: "On Block",
        key: "onBlock",
        editable: { isPilot },
        value: "",
      },

      {
        label: "Date Zulu",
        key: "dateZulu",
        editable: { isPilot },
        value: "",
      },
      { label: "Date", key: "date", editable: { isPilot }, value: "" },
    ],
    [
      {
        label: "Flight Time",
        key: "flightTime",
        editable: { isPilot },
        value: "",
      },

      {
        label: "Block Time",
        key: "blockTime",
        editable: { isPilot },
        value: "",
      },
      { label: "Cycles", key: "cycles", editable: { isPilot }, value: "" },
      {
        label: "Night (Flight Specific)",
        key: "nightFlightSpecific",
        editable: { isPilot },
        value: "",
      },
      {
        label: "N. Ldg (Flight Specific)",
        key: "nLdgFlightSpecific",
        editable: { isPilot },
        value: "",
      },
      {
        label: "App (Flight Specific)",
        key: "appFlightSpecific",
        editable: { isPilot },
        value: "",
      },
      {
        label: "Inst (Flight Specific)",
        key: "instFlightSpecific",
        editable: { isPilot },
        value: "",
      },
      {
        label: "Pilot (Flight Specific)",
        key: "pilotFlightSpecific",
        editable: { isPilot },
        value: "",
      },
    ],
    [
      {
        label: "Engine 1 (Times Forward)",
        key: "engine1TForward",
        editable: { isPilot },
        value: "",
      },
      {
        label: "Engine 2 (Times Forward)",
        key: "engine2TForward",
        editable: { isPilot },
        value: "",
      },
      {
        label: "APLI (Times Forward)",
        key: "apliTForward",
        editable: { isPilot },
        value: "",
      },
      {
        label: "Engine 1 (Current Times)",
        key: "engine1CTimes",
        editable: { isPilot },
        value: "",
      },
      {
        label: "Engine 2 (Current Times)",
        key: "engine2CTimes",
        editable: { isPilot },
        value: "",
      },
      {
        label: "APLI (Current Times)",
        key: "apliTCTimes",
        editable: { isPilot },
        value: "",
      },
    ],
    [
      {
        label: "Totals This Flight Log",
        key: "totalsThisFlightLog",
        editable: { isPilot },
        value: "",
      },
      {
        label: "",
        key: "totalsThisFlightLog1",
        editable: { isPilot },
        value: "",
      },
      {
        label: "",
        key: "totalsThisFlightLog2",
        editable: { isPilot },
        value: "",
      },
      {
        label: "Airframe Forward",
        key: "airframeForward",
        editable: { isPilot },
        value: "",
      },
      {
        label: "",
        key: "airframeForward1",
        editable: { isPilot },
        value: "",
      },
      {
        label: "",
        key: "airframeForward2",
        editable: { isPilot },
        value: "",
      },
      {
        label: "Airframe Total Time",
        key: "airframeTotalTime",
        editable: { isPilot },
        value: "",
      },
      {
        label: "",
        key: "airframeTotalTime1",
        editable: { isPilot },
        value: "",
      },
      {
        label: "",
        key: "airframeTotalTime2",
        editable: { isPilot },
        value: "",
      },
    ],
    [
      {
        label: "Engine 1 (Cyc. PWD)",
        key: "engine1CycPWD",
        editable: { isPilot },
        value: "",
      },
      {
        label: "Engine 2 (Cyc. PWD)",
        key: "engine2CycPWD",
        editable: { isPilot },
        value: "",
      },
      {
        label: "Engine 1 (Cycles)",
        key: "engine1Cycles",
        editable: { isPilot },
        value: "",
      },
      {
        label: "Engine 2 (Cycles)",
        key: "engine2Cycles",
        editable: { isPilot },
        value: "",
      },
    ],
    [
      {
        label: "Departure",
        key: "departure",
        editable: { isPilot },
        value: "",
      },
      { label: "PAX", key: "pax", editable: { isPilot }, value: "" },
      {
        label: "Fuel Purchased",
        key: "fuelPurchased",
        editable: { isPilot },
        value: "",
      },
      { label: "Fuel Out", key: "fuelOut", editable: { isPilot }, value: "" },
      { label: "Fuel In", key: "fuelIn", editable: { isPilot }, value: "" },
      { label: "Fuel Burn", key: "fuelBurn", editable: { isPilot }, value: "" },
      {
        label: "Leg Distance",
        key: "legDistance",
        editable: { isPilot },
        value: "",
      },
      {
        label: "FBO Handler",
        key: "fboHandler",
        editable: { isPilot },
        value: "",
      },
    ],
  ];

  if (!visible) return null;

  const handleDiscard = () => {
    Modal.confirm({
      title: "DISCARD LOG",
      content: "Are you sure you want to discard this log?",
      okText: "YES",
      cancelText: "CANCEL",
      onOk: () => {
        setFormData({});
        onClose();
      },
    });
  };

  const handleSave = () => {
    Modal.confirm({
      title: "SUBMIT LOG",
      content: "Are you sure you want to submit this log?",
      okText: "YES",
      cancelText: "CANCEL",
      onOk: () => setShowApproveModal(true),
    });
  };

  const handleApproveSubmit = (username, password) => {
    console.log("New entry approved with:", { username, password });

    const newEntry = {
      id: Date.now(),
      index: Date.now(),
      tailNum: formData.tailNum || "---",
      date: formData.date || new Date().toLocaleDateString(),
      depart: formData.depart || "",
      arrive: formData.arrive || "",
      offBlock: formData.offBlock || "",
      onBlock: formData.onBlock || "",
      blockTime: formData.blockTime || "",
      flightTime: formData.flightTime || "",
      technicalAction: "Submitted for review",
      status: "pending",
      submittedBy: username,
      submittedAt: new Date().toISOString(),
    };

    onSave?.(newEntry);

    setShowApproveModal(false);
    setFormData({});
    onClose();
  };

  const handleApproveCancel = () => {
    setShowApproveModal(false);
  };

  const renderPage = (fields) =>
    fields?.map((field, index) => (
      <Row key={index} style={{ marginBottom: 12 }}>
        <Col span={8}>
          <strong>{field.label}:</strong>
        </Col>
        <Col span={16}>
          <Input
            value={formData[field.key] ?? ""}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, [field.key]: e.target.value }))
            }
          />
        </Col>
      </Row>
    ));

  return (
    <>
      <Modal
        title="Flight Log Entry"
        open={visible}
        onCancel={onClose}
        footer={null}
        width={600}
      >
        {renderPage([]) /* Replace [] with your pages[page] fields */}

        {/* Page Navigation */}
        <Row justify="space-between" style={{ marginTop: 20 }}>
          <Button
            onClick={() => setPage(Math.max(page - 1, 0))}
            disabled={page === 0}
          >
            Previous
          </Button>
          <span>
            Page {page + 1} of {1 /* replace 1 with pages.length */}
          </span>
          <Button
            onClick={() => setPage(Math.min(page + 1, 0 /* pages.length -1 */))}
            disabled={page === 0 /* update accordingly */}
          >
            Next
          </Button>
        </Row>

        {/* Save / Cancel Buttons */}
        <Row justify="end" style={{ marginTop: 20, gap: 10 }}>
          <Button type="primary" onClick={handleSave}>
            Save
          </Button>
          <Button onClick={handleDiscard}>Cancel</Button>
        </Row>
      </Modal>

      {/* Approve Maintenance Modal */}
      <ApproveMaintenance
        visible={showApproveModal}
        aircraftNumber={formData.tailNum || "---"}
        onConfirm={handleApproveSubmit}
        onCancel={handleApproveCancel}
      />
    </>
  );
}
