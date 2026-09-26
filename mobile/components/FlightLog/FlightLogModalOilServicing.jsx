import { Picker } from "@react-native-picker/picker";
import React, { useState } from "react";
import AppText from "../common/AppText";
import AppInput from "../common/AppInput";
import { View, TouchableOpacity, ScrollView, Image } from "react-native";
import { COLORS } from "../../stylesheets/colors";
import PinVerifiedSignatureModal from "../common/PinVerifiedSignatureModal";
import DateInput from "../common/DateInput";

export default function FlightLogModalOilServicing({
  legs,
  oilServicingData,
  onUpdateOilServicing,
  isEditable = true,
  lockedRows = 0,
  signatureInherited = false,
  inheritedSignature = "",
}) {
  const [showSignatureModal, setShowSignatureModal] = useState(null);
  const hasInheritedSignature = signatureInherited || Boolean(inheritedSignature);

  const canEditRow = (index) => isEditable && index >= lockedRows;

  const getOrdinalSuffix = (num) => {
    const j = num % 10;
    const k = num % 100;
    if (j === 1 && k !== 11) return "st";
    if (j === 2 && k !== 12) return "nd";
    if (j === 3 && k !== 13) return "rd";
    return "th";
  };

  const updateOilData = (legIndex, field, value) => {
    if (!canEditRow(legIndex)) return;
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

  const renderOilLevel = (legIndex, label, fieldKey) => {
    const value = oilServicingData[legIndex]?.[fieldKey];
    return (
      <View style={{ marginBottom: 16 }}>
        <AppText
          style={{
            fontSize: 12,
            color: COLORS.black,
            marginBottom: 6,
            fontWeight: "500",
          }}
        >
          {label}:
        </AppText>
        <View
          accessibilityRole="radiogroup"
          accessibilityLabel={label}
          style={{ flexDirection: "row", gap: 8 }}
        >
          {["MIN", "MAX"].map((option) => {
            const selected = value === option;
            return (
              <TouchableOpacity
                key={option}
                accessibilityRole="radio"
                accessibilityLabel={`${label}: ${option}`}
                accessibilityState={{
                  checked: selected,
                  disabled: !isEditable,
                }}
                disabled={!isEditable}
                onPress={() => updateOilData(legIndex, fieldKey, option)}
                style={{
                  minWidth: 80,
                  minHeight: 44,
                  paddingHorizontal: 18,
                  paddingVertical: 12,
                  alignItems: "center",
                  borderRadius: 6,
                  borderWidth: 1,
                  borderColor: selected ? "#247a61" : "#aaa",
                  backgroundColor: selected ? "#247a61" : "#f5f5f5",
                  opacity: isEditable ? 1 : 0.65,
                }}
              >
                <AppText
                  style={{
                    color: selected ? "#fff" : "#333",
                    fontWeight: selected ? "700" : "400",
                  }}
                >
                  {option}
                </AppText>
              </TouchableOpacity>
            );
          })}
        </View>
        {value !== undefined &&
          String(value) !== "" &&
          !["MIN", "MAX"].includes(value) && (
            <AppText
              style={{ fontSize: 12, color: COLORS.grayDark, marginTop: 4 }}
            >
              Saved value: {value}
            </AppText>
          )}
      </View>
    );
  };

  const renderDateInput = (legIndex, label, fieldKey) => (
    <View style={{ marginBottom: 16 }}>
      <AppText
        style={{
          fontSize: 12,
          color: COLORS.black,
          marginBottom: 6,
          fontWeight: "500",
        }}
      >
        {label}:
      </AppText>
      <DateInput
        value={oilServicingData[legIndex]?.[fieldKey] || ""}
        onChangeText={(date) => updateOilData(legIndex, fieldKey, date)}
        editable={false}
        placeholder="From Basic Information"
        style={{
          backgroundColor: "#E8E8E8",
          borderRadius: 6,
          minHeight: 42,
        }}
      />
    </View>
  );

  const renderSignatureModal = (legIndex, title, onSave, onClose) => (
    <PinVerifiedSignatureModal
      visible={showSignatureModal === legIndex}
      title={title}
      description="Draw the oil servicing signature below."
      confirmDescription="Enter your 6-digit PIN to save this oil servicing signature."
      onClose={onClose}
      onSave={(sig) => onSave(legIndex, sig)}
    />
  );

  if (!legs || legs.length === 0) {
    return (
      <ScrollView showsVerticalScrollIndicator={false}>
        <AppText
          style={{
            fontSize: 14,
            fontWeight: "600",
            color: COLORS.grayDark,
            marginBottom: 16,
          }}
        >
          Oil Servicing
        </AppText>
        <View
          style={{
            backgroundColor: COLORS.white,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: COLORS.grayMedium,
            padding: 40,
            alignItems: "center",
          }}
        >
          <AppText style={{ color: COLORS.grayDark, fontSize: 12 }}>
            No legs available
          </AppText>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <AppText
        style={{
          fontSize: 14,
          fontWeight: "600",
          color: COLORS.grayDark,
          marginBottom: 16,
        }}
      >
        Oil Servicing
      </AppText>

      {legs.map((leg, legIndex) => {
        const legNumber = legIndex + 1;
        const suffix = getOrdinalSuffix(legNumber);
        const oilData = { ...oilServicingData[legIndex], signature: inheritedSignature || oilServicingData[legIndex]?.signature || "" };

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
            <View
              style={{
                backgroundColor: COLORS.primaryLight,
                paddingVertical: 14,
                paddingHorizontal: 16,
              }}
            >
              <AppText
                style={{ fontSize: 14, color: COLORS.white, fontWeight: "600" }}
              >
                {legNumber}
                {suffix} Leg
              </AppText>
            </View>

            <View style={{ padding: 20 }}>
              {renderDateInput(legIndex, "Date", "date")}

              <AppText
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: COLORS.black,
                  marginBottom: 12,
                  marginTop: 8,
                }}
              >
                Engine
              </AppText>
              {renderOilLevel(legIndex, "Engine (REM)", "engineRem")}
              {renderOilLevel(legIndex, "Engine (ADD)", "engineAdd")}
              {renderOilLevel(legIndex, "Engine (TOT)", "engineTot")}

              <AppText
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: COLORS.black,
                  marginBottom: 12,
                  marginTop: 8,
                }}
              >
                M/R G/Box
              </AppText>
              {renderOilLevel(legIndex, "M/R G/Box (REM)", "mrGboxRem")}
              {renderOilLevel(legIndex, "M/R G/Box (ADD)", "mrGboxAdd")}
              {renderOilLevel(legIndex, "M/R G/Box (TOT)", "mrGboxTot")}

              <AppText
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: COLORS.black,
                  marginBottom: 12,
                  marginTop: 8,
                }}
              >
                T/R G/Box
              </AppText>
              {renderOilLevel(legIndex, "T/R G/Box (REM)", "trGboxRem")}
              {renderOilLevel(legIndex, "T/R G/Box (ADD)", "trGboxAdd")}
              {renderOilLevel(legIndex, "T/R G/Box (TOT)", "trGboxTot")}

              <View style={{ marginBottom: 16, marginTop: 8 }}>
                <AppText
                  style={{
                    fontSize: 12,
                    color: COLORS.black,
                    marginBottom: 6,
                    fontWeight: "500",
                  }}
                >
                  Remarks:
                </AppText>
                <AppInput
                  style={{
                    backgroundColor: isEditable ? "#F2F2F2" : "#E8E8E8",
                    borderRadius: 6,
                    height: 80,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    fontSize: 12,
                    color: isEditable ? COLORS.black : COLORS.grayDark,
                    textAlignVertical: "top",
                  }}
                  value={oilData.remarks || ""}
                  onChangeText={(text) =>
                    updateOilData(legIndex, "remarks", text)
                  }
                  placeholder="Enter any remarks"
                  placeholderTextColor={COLORS.grayDark}
                  multiline
                  numberOfLines={3}
                  editable={canEditRow(legIndex)}
                />
              </View>

              <View style={{ marginBottom: 16 }}>
                <AppText
                  style={{
                    fontSize: 12,
                    color: COLORS.black,
                    marginBottom: 6,
                    fontWeight: "500",
                  }}
                >
                  Sign:
                </AppText>
                {canEditRow(legIndex) && !hasInheritedSignature ? (
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
                        style={{
                          width: "100%",
                          height: "100%",
                          resizeMode: "contain",
                        }}
                      />
                    ) : (
                      <AppText style={{ color: COLORS.grayDark, fontSize: 12 }}>
                        Tap to sign
                      </AppText>
                    )}
                  </TouchableOpacity>
                ) : (
                  <View
                    style={{
                      backgroundColor: "#E8E8E8",
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
                        style={{
                          width: "100%",
                          height: "100%",
                          resizeMode: "contain",
                        }}
                      />
                    ) : (
                      <AppText style={{ color: COLORS.grayDark, fontSize: 12 }}>
                        No signature
                      </AppText>
                    )}
                  </View>
                )}
                {canEditRow(legIndex) &&
                  !hasInheritedSignature &&
                  oilData.signature && (
                    <TouchableOpacity
                      onPress={() => handleClearSignature(legIndex)}
                      style={{ alignSelf: "flex-end", marginTop: 8 }}
                    >
                      <AppText style={{ color: "#D9534F", fontSize: 12 }}>
                        Clear Signature
                      </AppText>
                    </TouchableOpacity>
                  )}
              </View>
            </View>

            {renderSignatureModal(legIndex, "Sign Here", handleSignature, () =>
              setShowSignatureModal(null),
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}
