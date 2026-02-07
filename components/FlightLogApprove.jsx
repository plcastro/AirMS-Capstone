import React, { useState } from "react";
import { View, Text, TextInput, Modal, TouchableOpacity } from "react-native";
import { styles } from "../stylesheets/styles";

export default function FlightLogApprove({ visible, onConfirm, onCancel }) {
  const [data, setData] = useState({
    station: "",
    frequency: "",
    date: "",
    mmel: Array(6).fill(""),
    vor1: "",
    vor2: "",
    dueNext: "",
    signature: "",
    preFlightDate: "",
    ap: "",
  });

  const update = (key, value) => setData((prev) => ({ ...prev, [key]: value }));

  if (!visible) return null;

  return (
    <Modal transparent animationType="fade" visible={visible}>
      <View style={styles.verificationAlertOverlay}>
        <View style={[styles.verificationAlertContainer, { maxWidth: 720 }]}>
          {/* FORM BODY */}
          <View style={styles.flightTwoColumn}>
            {/* LEFT COLUMN */}
            <View style={styles.flightColumn}>
              <Text style={styles.flightSectionTitle}>VOR CHECK (30 Days)</Text>

              <Text style={styles.verificationLabel}>Station</Text>
              <TextInput
                style={styles.verificationInput}
                value={data.station}
                onChangeText={(t) => update("station", t)}
                placeholder="Station"
              />

              <Text style={styles.verificationLabel}>Frequency</Text>
              <TextInput
                style={styles.verificationInput}
                value={data.frequency}
                onChangeText={(t) => update("frequency", t)}
                placeholder="Frequency"
              />

              <Text style={styles.verificationLabel}>Date</Text>
              <TextInput
                style={styles.verificationInput}
                value={data.date}
                onChangeText={(t) => update("date", t)}
                placeholder="Date"
              />

              <Text style={styles.flightSectionTitle}>VOR 1</Text>
              <TextInput
                style={styles.verificationInput}
                value={data.vor1}
                onChangeText={(t) => update("vor1", t)}
                placeholder="Bering/Error"
              />

              <Text style={styles.flightSectionTitle}>VOR 2</Text>
              <TextInput
                style={styles.verificationInput}
                value={data.vor2}
                onChangeText={(t) => update("vor2", t)}
                placeholder="Bering/Error"
              />

              <Text style={styles.flightSectionTitle}>Due next</Text>
              <TextInput
                style={styles.verificationInput}
                value={data.dueNext}
                onChangeText={(t) => update("dueNext", t)}
                placeholder="Due"
              />
            </View>

            {/* RIGHT COLUMN */}
            <View style={styles.flightColumn}>
              <Text style={styles.flightSectionTitle}>MMEL item(s)</Text>

              <View style={styles.mmelGrid}>
                {data.mmel.map((value, i) => (
                  <TextInput
                    key={i}
                    style={[styles.verificationInput, styles.mmelItem]}
                    value={value}
                    placeholder="Item"
                    onChangeText={(t) => {
                      const copy = [...data.mmel];
                      copy[i] = t;
                      update("mmel", copy);
                    }}
                  />
                ))}
              </View>

              <Text style={styles.flightSectionTitle}>
                Released for flight by
              </Text>

              <View style={styles.signatureWrapper}>
                <TextInput
                  style={styles.verificationInput}
                  value={data.signature}
                  onChangeText={(t) => update("signature", t)}
                  placeholder="Signature"
                />

                {data.signature !== "" && (
                  <TouchableOpacity
                    style={styles.clearSignatureBtn}
                    onPress={() => update("signature", "")}
                  >
                    <Text>✕</Text>
                  </TouchableOpacity>
                )}
              </View>

              <TextInput
                style={styles.verificationInput}
                value={data.preFlightDate}
                onChangeText={(t) => update("preFlightDate", t)}
                placeholder="PreFlight Release Date"
              />

              <TextInput
                style={styles.verificationInput}
                value={data.ap}
                onChangeText={(t) => update("ap", t)}
                placeholder="A&P"
              />
            </View>
          </View>

          {/* ACTION BUTTONS */}
          <View style={styles.verificationButtonRow}>
            <TouchableOpacity
              style={styles.verificationApproveBtn}
              onPress={() => onConfirm?.(data)}
            >
              <Text style={styles.verificationBtnText}>Confirm</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.verificationCancelBtn}
              onPress={onCancel}
            >
              <Text style={styles.verificationBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
