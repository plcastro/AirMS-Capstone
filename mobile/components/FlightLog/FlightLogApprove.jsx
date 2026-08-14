import react, { useState } from "react";
import AppText from "../common/AppText";
import AppInput from "../common/AppInput";

import {
  View,
  Modal,
  TouchableOpacity,
  Platform,
  Dimensions,
  ScrollView
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
                <AppText
                  style={[
                    styles.flightSectionTitle,
                    { fontSize: isMobile ? 13 : 14 },
                  ]}
                >
                  VOR CHECK (30 Days)
                </AppText>

                <AppText
                  style={[
                    styles.verificationLabel,
                    { fontSize: isMobile ? 12 : 14 },
                  ]}
                >
                  Station
                </AppText>
                <AppInput
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

                <AppText
                  style={[
                    styles.verificationLabel,
                    { fontSize: isMobile ? 12 : 14 },
                  ]}
                >
                  Frequency
                </AppText>
                <AppInput
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

                <AppText
                  style={[
                    styles.verificationLabel,
                    { fontSize: isMobile ? 12 : 14 },
                  ]}
                >
                  Date
                </AppText>
                <AppInput
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

                <AppText
                  style={[
                    styles.flightSectionTitle,
                    { fontSize: isMobile ? 13 : 14 },
                  ]}
                >
                  VOR 1
                </AppText>
                <AppInput
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

                <AppText
                  style={[
                    styles.flightSectionTitle,
                    { fontSize: isMobile ? 13 : 14 },
                  ]}
                >
                  VOR 2
                </AppText>
                <AppInput
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

                <AppText
                  style={[
                    styles.flightSectionTitle,
                    { fontSize: isMobile ? 13 : 14 },
                  ]}
                >
                  Due next
                </AppText>
                <AppInput
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
                <AppText
                  style={[
                    styles.flightSectionTitle,
                    { fontSize: isMobile ? 13 : 14 },
                  ]}
                >
                  MMEL item(s)
                </AppText>

                <View style={styles.mmelGrid}>
                  {data.mmel.map((value, i) => (
                    <AppInput
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

                <AppText
                  style={[
                    styles.flightSectionTitle,
                    { fontSize: isMobile ? 13 : 14 },
                  ]}
                >
                  Released for flight by
                </AppText>

                <View style={styles.signatureWrapper}>
                  <AppInput
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
                      <AppText style={{ fontSize: isMobile ? 16 : 18 }}>✕</AppText>
                    </TouchableOpacity>
                  )}
                </View>

                <AppInput
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

                <AppInput
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
                <AppText
                  style={[
                    styles.verificationBtnText,
                    { fontSize: isMobile ? 15 : 16 },
                  ]}
                >
                  Confirm
                </AppText>
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
                <AppText
                  style={[
                    styles.verificationBtnText,
                    { fontSize: isMobile ? 15 : 16 },
                  ]}
                >
                  Cancel
                </AppText>
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
            <AppText style={styles.primaryBtnTxt}>Confirm</AppText>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryBtn} onPress={onCancel}>
            <AppText style={styles.secondaryBtnTxt}>Cancel</AppText>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
