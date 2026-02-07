import {
  View,
  Text,
  TextInput,
  ScrollView,
  Platform,
  TouchableOpacity,
  Modal,
} from "react-native";
import React, { useState } from "react";
import { styles } from "../stylesheets/styles";
import SignatureScreen from "./SignatureScreen";
import AlertComp from "./AlertComp";
import ApproveMaintenance from "./ApproveMaintenance";

export default function FlightLogEntry({ visible, onClose, onSave, role }) {
  const [page, setPage] = useState(0);
  const [formData, setFormData] = useState({});
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const isPilot = role === "pilot";
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
    setShowDiscardConfirm(true);
  };

  const confirmDiscard = () => {
    setFormData({});
    setShowDiscardConfirm(false);
    onClose();
  };

  const handleSave = () => {
    setShowSaveConfirm(true);
  };

  const confirmSave = () => {
    setShowSaveConfirm(false);
    setShowApproveModal(true);
  };

  const handleApproveSubmit = (username, password) => {
    console.log("New entry approved with:", { username, password });

    // Create the new entry
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

    // Call onSave with the new entry
    onSave?.(newEntry);

    setShowApproveModal(false);
    setFormData({});
    onClose();
  };

  const handleApproveCancel = () => {
    setShowApproveModal(false);
  };

  const renderPage = (fields) => {
    return fields.map((field, index) => (
      <View key={index} style={{ marginBottom: 10 }}>
        <Text>{field.label}</Text>
        <TextInput
          style={styles.flightFormInput}
          value={formData[field.key] ?? field.value ?? ""}
          editable={field.editable}
          onChangeText={(text) =>
            setFormData((prev) => ({ ...prev, [field.key]: text }))
          }
        />
      </View>
    ));
  };

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
              <TouchableOpacity
                onPress={handleDiscard}
                style={{ alignSelf: "flex-end" }}
              >
                <Text style={{ fontSize: 18, fontWeight: "600" }}>✕</Text>
              </TouchableOpacity>
              {renderPage(pages[page])}

              {page === pages.length - 1 && (
                <View
                  style={{ flexDirection: "row", gap: 10, marginLeft: "auto" }}
                >
                  <TouchableOpacity
                    onPress={handleSave}
                    style={styles.alertConfirmBtn}
                  >
                    <Text style={styles.alertConfirmBtnText}>Save</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleDiscard}
                    style={styles.alertCancelBtn}
                  >
                    <Text style={styles.alertCancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              )}
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
                  onPress={() => setPage((prev) => Math.max(prev - 1, 0))}
                  disabled={page === 0}
                  style={{
                    opacity: page === 0 ? 0.5 : 1,
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
                    {page + 1}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() =>
                    setPage((prev) => Math.min(prev + 1, pages.length - 1))
                  }
                  disabled={page === pages.length - 1}
                  style={{
                    opacity: page === pages.length - 1 ? 0.5 : 1,
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

            {Platform.OS !== "web" && <SignatureScreen />}
          </ScrollView>
        </View>
        {/* Discard Confirmation */}
        {showDiscardConfirm && (
          <AlertComp
            title="DISCARD LOG"
            message="Are you sure you discard this log?"
            type="confirm"
            onConfirm={confirmDiscard}
            onCancel={() => setShowDiscardConfirm(false)}
            confirmText="YES"
            cancelText="CANCEL"
          />
        )}

        {/* Save Confirmation */}
        {showSaveConfirm && (
          <AlertComp
            title="SUBMIT LOG"
            message="Are you sure you want to submit log?"
            type="confirm"
            onConfirm={confirmSave}
            onCancel={() => setShowSaveConfirm(false)}
            confirmText="YES"
            cancelText="CANCEL"
          />
        )}

        {/* Approval Maintenance Modal */}
        <ApproveMaintenance
          visible={showApproveModal}
          aircraftNumber={formData.tailNum || "---"}
          onConfirm={handleApproveSubmit}
          onCancel={handleApproveCancel}
        />
      </Modal>
    </>
  );
}
