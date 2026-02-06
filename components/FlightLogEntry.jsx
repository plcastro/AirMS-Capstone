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
import Button from "./Button";

export default function FlightEntry({ visible, onClose, onSave }) {
  const [page, setPage] = useState(0);
  const [formData, setFormData] = useState({});

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
      {
        label: "Totals This Flight Log",
        key: "totalsThisFlightLog",
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
        label: "Airframe Total Time",
        key: "airframeTotalTime",
        editable: false,
        value: "",
      },
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

  if (!visible) return null;

  const handleDiscard = () => {
    setFormData({});
    onClose();
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
              onPress={onClose}
              style={{ alignSelf: "flex-end" }}
            >
              <Text style={{ fontSize: 18, fontWeight: "600" }}>✕</Text>
            </TouchableOpacity>
            {renderPage(pages[page])}
          </View>

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

            <View style={{ backgroundColor: "#26866F", padding: 7, width: 50 }}>
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

          {page === pages.length - 1 && (
            <View style={{ flexDirection: "row", gap: 10, marginLeft: "auto" }}>
              <Button
                label="Approve"
                buttonStyle={styles.alertConfirmBtn}
                buttonTextStyle={styles.alertConfirmBtnText}
              />
              <Button
                label="Discard"
                buttonStyle={styles.alertCancelBtn}
                onPress={handleDiscard}
                buttonTextStyle={styles.alertCancelBtnText}
              />
            </View>
          )}

          {Platform.OS !== "web" && <SignatureScreen />}
        </ScrollView>
      </View>
    </Modal>
  );
}
