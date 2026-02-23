import react, { useState } from "react";

import {
  View,
  Text,
  TextInput,
  Modal,
  TouchableOpacity,
  Platform,
  Dimensions,
  ScrollView,
} from "react-native";

import { styles } from "../../stylesheets/styles";

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

  const isMobile = Platform.OS !== "web";
  const screenWidth = Dimensions.get("window").width;

  const update = (key, value) => setData((prev) => ({ ...prev, [key]: value }));

  if (!visible) return null;

  return (
    <Modal transparent animationType="fade" visible={visible}>
      <View style={styles.modalOverlay}>
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            alignItems: "center",
            paddingVertical: isMobile ? 20 : 0,
          }}
        >
          <View
            style={[
              styles.verificationAlertContainer,
              {
                maxWidth: isMobile ? screenWidth * 0.95 : 720,
                minWidth: isMobile ? screenWidth * 0.9 : 400,
                padding: isMobile ? 16 : 24,
                marginHorizontal: isMobile ? 16 : 0,
              },
            ]}
          >
            {/* FORM BODY */}
            <View
              style={[
                styles.flightTwoColumn,
                {
                  flexDirection: isMobile ? "column" : "row",
                  gap: isMobile ? 16 : 24,
                },
              ]}
            >
              {/* LEFT COLUMN */}
              <View style={styles.flightColumn}>
                <Text
                  style={[
                    styles.flightSectionTitle,
                    { fontSize: isMobile ? 13 : 14 },
                  ]}
                >
                  VOR CHECK (30 Days)
                </Text>

                <Text
                  style={[
                    styles.verificationLabel,
                    { fontSize: isMobile ? 12 : 14 },
                  ]}
                >
                  Station
                </Text>
                <TextInput
                  style={[
                    styles.verificationInput,
                    {
                      height: isMobile ? 44 : 40,
                      fontSize: isMobile ? 14 : 16,
                      paddingHorizontal: isMobile ? 12 : 16,
                    },
                  ]}
                  value={data.station}
                  onChangeText={(t) => update("station", t)}
                  placeholder="Station"
                />

                <Text
                  style={[
                    styles.verificationLabel,
                    { fontSize: isMobile ? 12 : 14 },
                  ]}
                >
                  Frequency
                </Text>
                <TextInput
                  style={[
                    styles.verificationInput,
                    {
                      height: isMobile ? 44 : 40,
                      fontSize: isMobile ? 14 : 16,
                      paddingHorizontal: isMobile ? 12 : 16,
                    },
                  ]}
                  value={data.frequency}
                  onChangeText={(t) => update("frequency", t)}
                  placeholder="Frequency"
                />

                <Text
                  style={[
                    styles.verificationLabel,
                    { fontSize: isMobile ? 12 : 14 },
                  ]}
                >
                  Date
                </Text>
                <TextInput
                  style={[
                    styles.verificationInput,
                    {
                      height: isMobile ? 44 : 40,
                      fontSize: isMobile ? 14 : 16,
                      paddingHorizontal: isMobile ? 12 : 16,
                    },
                  ]}
                  value={data.date}
                  onChangeText={(t) => update("date", t)}
                  placeholder="Date"
                />

                <Text
                  style={[
                    styles.flightSectionTitle,
                    { fontSize: isMobile ? 13 : 14 },
                  ]}
                >
                  VOR 1
                </Text>
                <TextInput
                  style={[
                    styles.verificationInput,
                    {
                      height: isMobile ? 44 : 40,
                      fontSize: isMobile ? 14 : 16,
                      paddingHorizontal: isMobile ? 12 : 16,
                    },
                  ]}
                  value={data.vor1}
                  onChangeText={(t) => update("vor1", t)}
                  placeholder="Bering/Error"
                />

                <Text
                  style={[
                    styles.flightSectionTitle,
                    { fontSize: isMobile ? 13 : 14 },
                  ]}
                >
                  VOR 2
                </Text>
                <TextInput
                  style={[
                    styles.verificationInput,
                    {
                      height: isMobile ? 44 : 40,
                      fontSize: isMobile ? 14 : 16,
                      paddingHorizontal: isMobile ? 12 : 16,
                    },
                  ]}
                  value={data.vor2}
                  onChangeText={(t) => update("vor2", t)}
                  placeholder="Bering/Error"
                />

                <Text
                  style={[
                    styles.flightSectionTitle,
                    { fontSize: isMobile ? 13 : 14 },
                  ]}
                >
                  Due next
                </Text>
                <TextInput
                  style={[
                    styles.verificationInput,
                    {
                      height: isMobile ? 44 : 40,
                      fontSize: isMobile ? 14 : 16,
                      paddingHorizontal: isMobile ? 12 : 16,
                    },
                  ]}
                  value={data.dueNext}
                  onChangeText={(t) => update("dueNext", t)}
                  placeholder="Due"
                />
              </View>

              {/* RIGHT COLUMN */}
              <View style={styles.flightColumn}>
                <Text
                  style={[
                    styles.flightSectionTitle,
                    { fontSize: isMobile ? 13 : 14 },
                  ]}
                >
                  MMEL item(s)
                </Text>

                <View style={styles.mmelGrid}>
                  {data.mmel.map((value, i) => (
                    <TextInput
                      key={i}
                      style={[
                        styles.verificationInput,
                        styles.mmelItem,
                        {
                          height: isMobile ? 44 : 40,
                          fontSize: isMobile ? 14 : 16,
                          paddingHorizontal: isMobile ? 12 : 16,
                          width: isMobile ? "100%" : "48%",
                        },
                      ]}
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

                <Text
                  style={[
                    styles.flightSectionTitle,
                    { fontSize: isMobile ? 13 : 14 },
                  ]}
                >
                  Released for flight by
                </Text>

                <View style={styles.signatureWrapper}>
                  <TextInput
                    style={[
                      styles.verificationInput,
                      {
                        height: isMobile ? 44 : 40,
                        fontSize: isMobile ? 14 : 16,
                        paddingHorizontal: isMobile ? 12 : 16,
                        paddingRight: isMobile ? 40 : 40,
                      },
                    ]}
                    value={data.signature}
                    onChangeText={(t) => update("signature", t)}
                    placeholder="Signature"
                  />

                  {data.signature !== "" && (
                    <TouchableOpacity
                      style={[
                        styles.clearSignatureBtn,
                        { right: isMobile ? 8 : 12 },
                      ]}
                      onPress={() => update("signature", "")}
                    >
                      <Text style={{ fontSize: isMobile ? 16 : 18 }}>✕</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <TextInput
                  style={[
                    styles.verificationInput,
                    {
                      height: isMobile ? 44 : 40,
                      fontSize: isMobile ? 14 : 16,
                      paddingHorizontal: isMobile ? 12 : 16,
                    },
                  ]}
                  value={data.preFlightDate}
                  onChangeText={(t) => update("preFlightDate", t)}
                  placeholder="PreFlight Release Date"
                />

                <TextInput
                  style={[
                    styles.verificationInput,
                    {
                      height: isMobile ? 44 : 40,
                      fontSize: isMobile ? 14 : 16,
                      paddingHorizontal: isMobile ? 12 : 16,
                    },
                  ]}
                  value={data.ap}
                  onChangeText={(t) => update("ap", t)}
                  placeholder="A&P"
                />
              </View>
            </View>

            {/* ACTION BUTTONS */}
            <View
              style={[
                styles.verificationButtonRow,
                {
                  flexDirection: isMobile ? "column" : "row",
                  gap: isMobile ? 12 : 16,
                  marginTop: isMobile ? 20 : 24,
                },
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.verificationApproveBtn,
                  {
                    width: isMobile ? "100%" : "auto",
                    paddingVertical: isMobile ? 14 : 12,
                    minWidth: isMobile ? 0 : 120,
                    paddingHorizontal: isMobile ? 24 : 32,
                  },
                ]}
                onPress={() => onConfirm?.(data)}
              >
                <Text
                  style={[
                    styles.verificationBtnText,
                    { fontSize: isMobile ? 15 : 16 },
                  ]}
                >
                  Confirm
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.verificationCancelBtn,
                  {
                    width: isMobile ? "100%" : "auto",
                    paddingVertical: isMobile ? 14 : 12,
                    minWidth: isMobile ? 0 : 120,
                    paddingHorizontal: isMobile ? 24 : 32,
                  },
                ]}
                onPress={onCancel}
              >
                <Text
                  style={[
                    styles.verificationBtnText,
                    { fontSize: isMobile ? 15 : 16 },
                  ]}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        {/* ACTION BUTTONS */}
        <View style={styles.verificationButtonRow}>
          <TouchableOpacity
            style={styles.primaryAlertBtn}
            onPress={() => onConfirm?.(data)}
          >
            <Text style={styles.primaryBtnTxt}>Confirm</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryBtn} onPress={onCancel}>
            <Text style={styles.secondaryBtnTxt}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
