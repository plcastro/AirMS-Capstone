import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Modal,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { styles } from "../stylesheets/styles";
import AlertComp from "./AlertComp";
import FlightLogApprove from "./FlightLogApprove";

export default function FlightLogVerifyTechnical({
  visible,
  entry,
  onClose,
  onApprove,
}) {
  const [currentPage, setCurrentPage] = useState(0);
  const [formData, setFormData] = useState({});

  // State for the verification flow
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

  const handleApprove = () => {
    setShowApproveConfirm(true);
  };

  const handleConfirmApprove = () => {
    setShowApproveConfirm(false);
    setShowVorCheckForm(true);
  };

  const handleVorCheckSubmit = (vorCheckData) => {
    console.log("VOR Check data submitted:", vorCheckData);
    setShowVorCheckForm(false);
    setShowFinalConfirm(true);
  };

  const handleVorCheckCancel = () => {
    setShowVorCheckForm(false);
  };

  const handleFinalConfirm = () => {
    console.log("Technical log verification confirmed");

    const verifiedLog = {
      ...entry,
      status: "verified",
      verifiedAt: new Date().toLocaleDateString(),
    };

    onApprove?.(verifiedLog);
    setShowFinalConfirm(false);
    onClose();
  };

  const handleCancelApprove = () => {
    setShowApproveConfirm(false);
  };

  const handleCancelFinalConfirm = () => {
    setShowFinalConfirm(false);
  };

  const handleDiscard = () => {
    onClose();
  };

  const renderPage = (fields) => {
    return fields.map((field, index) => (
      <View key={index} style={{ marginBottom: 10 }}>
        <Text style={{ fontSize: 14, fontWeight: "500", marginBottom: 4 }}>
          {field.label}
        </Text>
        <TextInput
          style={[
            styles.flightFormInput,
            {
              backgroundColor: field.editable ? "#F1F1F1" : "#f0f0f0",
              color: field.editable ? "#333" : "#666",
            },
          ]}
          value={formData[field.key] ?? field.value ?? ""}
          editable={false} // Always false for verification
        />
      </View>
    ));
  };

  if (!visible || !entry) return null;

  return (
    <>
      <Modal
        transparent
        visible={visible}
        animationType="fade"
        onRequestClose={onClose}
      >
        <View style={styles.modalOverlay}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.newFlightEntryCard}>
              {/* Close button - same as edit modal */}
              <TouchableOpacity
                onPress={onClose}
                style={{ alignSelf: "flex-end", marginBottom: 10 }}
              >
                <Text style={{ fontSize: 18, fontWeight: "600" }}>✕</Text>
              </TouchableOpacity>

              {/* Title */}
              <Text
                style={[
                  styles.newEntryTitle,
                  {
                    marginBottom: 20,
                    fontSize: 20,
                    textAlign: "center",
                  },
                ]}
              >
                Verify Technical Log
              </Text>

              {renderPage(pages[currentPage])}

              {/* Approve/Cancel buttons on last page - matching edit modal layout */}
              {currentPage === pages.length - 1 && (
                <View
                  style={{
                    flexDirection: "row",
                    gap: 10,
                    marginLeft: "auto",
                    marginTop: 20,
                  }}
                >
                  <TouchableOpacity
                    onPress={handleApprove}
                    style={[styles.alertConfirmBtn, { minWidth: 100 }]}
                  >
                    <Text style={styles.alertConfirmBtnText}>Approve</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleDiscard}
                    style={[styles.alertCancelBtn, { minWidth: 100 }]}
                  >
                    <Text style={styles.alertCancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Page navigation - identical to edit modal */}
              <View
                style={{
                  flexDirection: "row",
                  gap: 10,
                  marginLeft: "auto",
                  marginBottom: 20,
                  marginTop: 20,
                }}
              >
                <TouchableOpacity
                  onPress={() =>
                    setCurrentPage((prev) => Math.max(prev - 1, 0))
                  }
                  disabled={currentPage === 0}
                  style={{
                    opacity: currentPage === 0 ? 0.5 : 1,
                    borderWidth: 1,
                    borderColor: "#acacac",
                    padding: 7,
                    width: 100,
                  }}
                >
                  <Text style={{ textAlign: "center" }}>Previous</Text>
                </TouchableOpacity>

                <View
                  style={{ backgroundColor: "#26866F", padding: 7, width: 50 }}
                >
                  <Text style={{ color: "#fff", textAlign: "center" }}>
                    {currentPage + 1}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() =>
                    setCurrentPage((prev) =>
                      Math.min(prev + 1, pages.length - 1),
                    )
                  }
                  disabled={currentPage === pages.length - 1}
                  style={{
                    opacity: currentPage === pages.length - 1 ? 0.5 : 1,
                    borderWidth: 1,
                    borderColor: "#acacac",
                    padding: 7,
                    width: 100,
                  }}
                >
                  <Text style={{ textAlign: "center" }}>Next</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* First Confirmation: Approve Log */}
      {showApproveConfirm && (
        <AlertComp
          title="APPROVE LOG"
          message="Are you sure you want to approve log?"
          type="confirm"
          onConfirm={handleConfirmApprove}
          onCancel={handleCancelApprove}
          confirmText="YES"
          cancelText="CANCEL"
        />
      )}

      {/* VOR Check Form Modal */}
      <FlightLogApprove
        visible={showVorCheckForm}
        aircraftNumber={formData.tailNum}
        onConfirm={handleVorCheckSubmit}
        onCancel={handleVorCheckCancel}
      />

      {/* Final Confirmation: Confirm Log */}
      {showFinalConfirm && (
        <AlertComp
          title="CONFIRM LOG"
          message="Are you sure you want to confirm log?"
          type="confirm"
          onConfirm={handleFinalConfirm}
          onCancel={handleCancelFinalConfirm}
          confirmText="CONFIRM"
          cancelText="CANCEL"
        />
      )}
    </>
  );
}
