import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
} from "react-native";
import { COLORS } from "../../stylesheets/colors";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import SignatureCanvas from "react-native-signature-canvas";

export default function FlightLogSignatureModal({
  visible,
  title,
  onClose,
  onSave,
  aircraftRPC,
}) {
  const [step, setStep] = useState("pin");
  const [pin, setPin] = useState("");
  const [signature, setSignature] = useState("");
  const signatureRef = useRef(null);

  const handlePinSubmit = () => {
    if (pin.length === 4) {
      setStep("signature");
    }
  };

  const handleSignatureSave = (sig) => {
    setSignature(sig);
    onSave(sig);
    resetAndClose();
  };

  const resetAndClose = () => {
    setStep("pin");
    setPin("");
    setSignature("");
    onClose();
  };

  const handleClose = () => {
    resetAndClose();
  };

  if (!visible) return null;

  if (step === "pin") {
    return (
      <Modal
        visible={visible}
        transparent={true}
        animationType="fade"
        onRequestClose={handleClose}
      >
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" }}>
          <View style={{
            backgroundColor: COLORS.white,
            borderRadius: 12,
            width: "85%",
            padding: 20,
            alignItems: "center",
          }}>
            <Text style={{ fontSize: 18, fontWeight: "600", color: COLORS.black, marginBottom: 16, textAlign: "center" }}>
              Do you want to sign this flight log for RP-{aircraftRPC || "7627"}?
            </Text>
            
            <Text style={{ fontSize: 14, color: COLORS.grayDark, marginBottom: 12, textAlign: "center" }}>
              Enter PIN to sign
            </Text>
            
            <TextInput
              style={{
                backgroundColor: COLORS.grayLight,
                borderRadius: 8,
                height: 48,
                paddingHorizontal: 16,
                fontSize: 16,
                textAlign: "center",
                width: "100%",
                marginBottom: 20,
              }}
              value={pin}
              onChangeText={setPin}
              placeholder="PIN"
              placeholderTextColor={COLORS.grayDark}
              secureTextEntry
              keyboardType="numeric"
              maxLength={4}
            />
            
            <View style={{ flexDirection: "row", gap: 12, width: "100%" }}>
              <TouchableOpacity
                onPress={handlePinSubmit}
                style={{
                  flex: 1,
                  backgroundColor: COLORS.primaryLight,
                  paddingVertical: 12,
                  borderRadius: 8,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: COLORS.white, fontWeight: "600", fontSize: 16 }}>SUBMIT</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleClose}
                style={{
                  flex: 1,
                  backgroundColor: COLORS.grayLight,
                  paddingVertical: 12,
                  borderRadius: 8,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: COLORS.grayDark, fontWeight: "600", fontSize: 16 }}>CANCEL</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" }}>
        <View style={{ backgroundColor: COLORS.white, borderRadius: 12, width: "90%", height: "50%", overflow: "hidden" }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.grayMedium }}>
            <Text style={{ fontSize: 18, fontWeight: "600", color: COLORS.black }}>{title}</Text>
            <TouchableOpacity onPress={handleClose}>
              <MaterialCommunityIcons name="close" size={24} color={COLORS.grayDark} />
            </TouchableOpacity>
          </View>
          
          <View style={{ flex: 1 }}>
            <SignatureCanvas
              ref={signatureRef}
              onOK={handleSignatureSave}
              onEmpty={handleClose}
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
}