import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  Image,
} from "react-native";
import { COLORS } from "../../stylesheets/colors";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import SignatureCanvas from "react-native-signature-canvas";

export default function FlightLogModalOilServicing({
  legs,
  oilServicingData,
  onUpdateOilServicing,
  isEditable = true,
}) {
  const [showSignatureModal, setShowSignatureModal] = useState(null);
  const signatureRef = useRef(null);

  const getOrdinalSuffix = (num) => {
    const j = num % 10;
    const k = num % 100;
    if (j === 1 && k !== 11) return "st";
    if (j === 2 && k !== 12) return "nd";
    if (j === 3 && k !== 13) return "rd";
    return "th";
  };

  const updateOilData = (legIndex, field, value) => {
    const newOilData = [...oilServicingData];
    newOilData[legIndex] = { ...newOilData[legIndex], [field]: value };
    onUpdateOilServicing(legIndex, newOilData[legIndex]);
  };

  const handleSignature = (legIndex, sig) => {
    updateOilData(legIndex, "signature", sig);
    setShowSignatureModal(null);
  };

  const handleClearSignature = (legIndex) => {
    updateOilData(legIndex, "signature", "");
  };

  const renderInput = (legIndex, label, fieldKey, placeholder = "", keyboardType = "default") => (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ fontSize: 13, color: COLORS.black, marginBottom: 6, fontWeight: "500" }}>
        {label}:
      </Text>
      <TextInput
        style={{
          backgroundColor: isEditable ? "#F2F2F2" : "#E8E8E8",
          borderRadius: 6,
          height: 42,
          paddingHorizontal: 12,
          fontSize: 14,
          color: isEditable ? COLORS.black : COLORS.grayDark,
        }}
        value={oilServicingData[legIndex]?.[fieldKey] || ""}
        onChangeText={(text) => updateOilData(legIndex, fieldKey, text)}
        placeholder={placeholder}
        placeholderTextColor={COLORS.grayDark}
        keyboardType={keyboardType}
        editable={isEditable}
      />
    </View>
  );

  const renderSignatureModal = (legIndex, title, onSave, onClose) => (
    <Modal
      visible={showSignatureModal === legIndex}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" }}>
        <View style={{ backgroundColor: COLORS.white, borderRadius: 12, width: "90%", height: "50%", overflow: "hidden" }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.grayMedium }}>
            <Text style={{ fontSize: 18, fontWeight: "600", color: COLORS.black }}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialCommunityIcons name="close" size={24} color={COLORS.grayDark} />
            </TouchableOpacity>
          </View>
          
          <View style={{ flex: 1 }}>
            <SignatureCanvas
              ref={signatureRef}
              onOK={(sig) => onSave(legIndex, sig)}
              onEmpty={onClose}
              webStyle={`.m-signature-pad--footer {display: none; margin: 0px;}`}
              descriptionText=""
              clearText="Clear"
              confirmText="Save"
              penColor="#000000"
              backgroundColor="rgba(255,255,255,0)"
              imageType="image/png"
              webviewProps={{
                cacheEnabled: true,
                androidLayerType: "hardware",
                style: { backgroundColor: "transparent" }
              }}
            />
          </View>

          <View style={{ flexDirection: "row", justifyContent: "space-between", padding: 16, borderTopWidth: 1, borderTopColor: COLORS.grayMedium }}>
            <TouchableOpacity
              onPress={() => signatureRef.current?.clearSignature()}
              style={{ paddingVertical: 8, paddingHorizontal: 20, backgroundColor: "#D9534F", borderRadius: 6 }}
            >
              <Text style={{ color: COLORS.white, fontWeight: "500" }}>Clear</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => signatureRef.current?.readSignature()}
              style={{ paddingVertical: 8, paddingHorizontal: 20, backgroundColor: COLORS.primaryLight, borderRadius: 6 }}
            >
              <Text style={{ color: COLORS.white, fontWeight: "500" }}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  if (!legs || legs.length === 0) {
    return (
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={{ fontSize: 20, fontWeight: "700", color: COLORS.grayDark, marginBottom: 16 }}>
          Oil Servicing
        </Text>
        <View style={{
          backgroundColor: COLORS.white,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: COLORS.grayMedium,
          padding: 40,
          alignItems: "center",
        }}>
          <Text style={{ color: COLORS.grayDark, fontSize: 14 }}>No legs available</Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <Text style={{ fontSize: 20, fontWeight: "700", color: COLORS.grayDark, marginBottom: 16 }}>
        Oil Servicing
      </Text>

      {legs.map((leg, legIndex) => {
        const legNumber = legIndex + 1;
        const suffix = getOrdinalSuffix(legNumber);
        const oilData = oilServicingData[legIndex] || {};

        return (
          <View
            key={legIndex}
            style={{
              backgroundColor: COLORS.white,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: COLORS.grayMedium,
              shadowColor: COLORS.black,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 6,
              elevation: 2,
              overflow: "hidden",
              marginBottom: 20,
            }}
          >
            <View style={{ backgroundColor: COLORS.primaryLight, paddingVertical: 14, paddingHorizontal: 16 }}>
              <Text style={{ fontSize: 16, color: COLORS.white, fontWeight: "600" }}>
                {legNumber}{suffix} Leg
              </Text>
            </View>

            <View style={{ padding: 20 }}>
              {renderInput(legIndex, "Date", "date", "MM/DD/YYYY")}

              <Text style={{ fontSize: 14, fontWeight: "600", color: COLORS.black, marginBottom: 12, marginTop: 8 }}>
                Engine
              </Text>
              {renderInput(legIndex, "Engine (REM)", "engineRem", "Remaining", "numeric")}
              {renderInput(legIndex, "Engine (ADD)", "engineAdd", "Added", "numeric")}
              {renderInput(legIndex, "Engine (TOT)", "engineTot", "Total", "numeric")}

              <Text style={{ fontSize: 14, fontWeight: "600", color: COLORS.black, marginBottom: 12, marginTop: 8 }}>
                M/R G/Box
              </Text>
              {renderInput(legIndex, "M/R G/Box (REM)", "mrGboxRem", "Remaining", "numeric")}
              {renderInput(legIndex, "M/R G/Box (ADD)", "mrGboxAdd", "Added", "numeric")}
              {renderInput(legIndex, "M/R G/Box (TOT)", "mrGboxTot", "Total", "numeric")}

              <Text style={{ fontSize: 14, fontWeight: "600", color: COLORS.black, marginBottom: 12, marginTop: 8 }}>
                T/R G/Box
              </Text>
              {renderInput(legIndex, "T/R G/Box (REM)", "trGboxRem", "Remaining", "numeric")}
              {renderInput(legIndex, "T/R G/Box (ADD)", "trGboxAdd", "Added", "numeric")}
              {renderInput(legIndex, "T/R G/Box (TOT)", "trGboxTot", "Total", "numeric")}

              <View style={{ marginBottom: 16, marginTop: 8 }}>
                <Text style={{ fontSize: 13, color: COLORS.black, marginBottom: 6, fontWeight: "500" }}>
                  Remarks:
                </Text>
                <TextInput
                  style={{
                    backgroundColor: isEditable ? "#F2F2F2" : "#E8E8E8",
                    borderRadius: 6,
                    height: 80,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    fontSize: 14,
                    color: isEditable ? COLORS.black : COLORS.grayDark,
                    textAlignVertical: "top",
                  }}
                  value={oilData.remarks || ""}
                  onChangeText={(text) => updateOilData(legIndex, "remarks", text)}
                  placeholder="Enter any remarks"
                  placeholderTextColor={COLORS.grayDark}
                  multiline
                  numberOfLines={3}
                  editable={isEditable}
                />
              </View>

              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 13, color: COLORS.black, marginBottom: 6, fontWeight: "500" }}>
                  Sign:
                </Text>
                {isEditable ? (
                  <TouchableOpacity
                    onPress={() => setShowSignatureModal(legIndex)}
                    style={{
                      backgroundColor: "#F2F2F2",
                      borderRadius: 6,
                      borderWidth: 1,
                      borderColor: COLORS.grayMedium,
                      height: 80,
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    {oilData.signature ? (
                      <Image
                        source={{ uri: oilData.signature }}
                        style={{ width: "100%", height: "100%", resizeMode: "contain" }}
                      />
                    ) : (
                      <Text style={{ color: COLORS.grayDark, fontSize: 14 }}>Tap to sign</Text>
                    )}
                  </TouchableOpacity>
                ) : (
                  <View style={{
                    backgroundColor: "#E8E8E8",
                    borderRadius: 6,
                    borderWidth: 1,
                    borderColor: COLORS.grayMedium,
                    height: 80,
                    justifyContent: "center",
                    alignItems: "center",
                  }}>
                    {oilData.signature ? (
                      <Image
                        source={{ uri: oilData.signature }}
                        style={{ width: "100%", height: "100%", resizeMode: "contain" }}
                      />
                    ) : (
                      <Text style={{ color: COLORS.grayDark, fontSize: 14 }}>No signature</Text>
                    )}
                  </View>
                )}
                {isEditable && oilData.signature && (
                  <TouchableOpacity onPress={() => handleClearSignature(legIndex)} style={{ alignSelf: "flex-end", marginTop: 8 }}>
                    <Text style={{ color: "#D9534F", fontSize: 12 }}>Clear Signature</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {renderSignatureModal(legIndex, "Sign Here", handleSignature, () => setShowSignatureModal(null))}
          </View>
        );
      })}
    </ScrollView>
  );
}