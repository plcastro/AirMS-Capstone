import Modal from "./AppModal";
import React, { useContext, useEffect, useRef, useState } from "react";
import AppText from "./AppText";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  View
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import SignatureCanvas from "react-native-signature-canvas";
import { AuthContext } from "../../Context/AuthContext";
import CodeInputField from "../CodeInputField";
import { COLORS } from "../../stylesheets/colors";
import { API_BASE } from "../../utilities/API_BASE";
import { showToast } from "../../utilities/toast";

export default function PinVerifiedSignatureModal({
  visible,
  title = "Signature",
  description = "Draw your signature below.",
  confirmDescription = "Enter your 6-digit PIN to confirm this signature.",
  requirePin = true,
  initialSignature = '',
  pinOnly = false,
  onClose,
  onSave,
  saveLabel = "Sign and Confirm",
  useNativeModal = true,
}) {
  const { user } = useContext(AuthContext);
  const signatureRef = useRef(null);
  const [step, setStep] = useState("signature");
  const [signature, setSignature] = useState("");
  const [pin, setPin] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [pinError, setPinError] = useState("");
  const awaitingSignature = useRef(false);
  useEffect(() => {
    if (visible && initialSignature) { setSignature(initialSignature); setStep('pin'); setPin(''); setPinError(''); }
  }, [visible, initialSignature]);

  const reset = () => {
    setStep("signature");
    setSignature("");
    setPin("");
    setSubmitting(false);
    setPinError("");
    awaitingSignature.current = false;
  };

  const handleClose = () => {
    reset();
    onClose?.();
  };

  const verifyPin = async () => {
    const userId = user?.id || user?._id;

    if (!userId) {
      throw new Error("Your user ID is missing. Please sign in again.");
    }

    const token = await AsyncStorage.getItem("currentUserToken");
    const response = await fetch(`${API_BASE}/api/user/verify-pin/${userId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ pin }),
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "PIN verification failed");
    }
  };

  const persistSignature = async (signatureData) => {
    try {
      setPinError("");
      setSubmitting(true);
      if (requirePin) await verifyPin();
      const saveResult = await onSave?.(signatureData, { pin: requirePin ? pin : undefined });
      if (saveResult === false) {
        return;
      }
      reset();
      onClose?.();
    } catch (error) {
      setPinError(error.message || "Could not save your signature.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignatureSaved = async (signatureData) => {
    if (!awaitingSignature.current) return;
    awaitingSignature.current = false;
    setSignature(signatureData);

    if (requirePin) {
      setSubmitting(false);
      setStep("pin");
    } else {
      await persistSignature(signatureData);
    }
  };

  const handleConfirm = async () => {
    if (submitting || awaitingSignature.current) return;
    if (step === "signature") {
      if (!signatureRef.current) return;
      setPinError("");
      awaitingSignature.current = true;
      setSubmitting(true);
      signatureRef.current.readSignature();
      return;
    }

    if (requirePin && !/^\d{6}$/.test(pin)) {
      setPinError("Enter your 6-digit PIN to confirm this signature.");
      return;
    }
    await persistSignature(signature);
  };

  const secondaryButton = {
    flex: 1,
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    opacity: submitting ? 0.6 : 1,
  };

  const content = (
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.5)",
          justifyContent: "center",
          alignItems: "center",
          padding: 16,
        }}
      >
        <View
          style={{
            backgroundColor: COLORS.white,
            borderRadius: 12,
            width: "100%",
            maxWidth: 480,
            maxHeight: "100%",
            overflow: "hidden",
          }}
        >
          <ScrollView
            // Scrolling would steal vertical strokes from the signature pad.
            scrollEnabled={step !== "signature"}
            keyboardShouldPersistTaps="handled"
            bounces={false}
            contentContainerStyle={{ padding: 20 }}
          >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12,
              gap: 8,
            }}
          >
            <AppText
              style={{ flex: 1, fontSize: 14, fontWeight: "600", color: COLORS.black }}
            >
              {title}
            </AppText>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Close signature"
              onPress={handleClose}
              disabled={submitting}
              style={{
                width: 44,
                height: 44,
                marginRight: -10,
                marginTop: -10,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialCommunityIcons
                name="close"
                size={24}
                color={COLORS.grayDark}
              />
            </TouchableOpacity>
          </View>

          <AppText
            style={{ fontSize: 12, color: COLORS.grayDark, marginBottom: 16 }}
          >
            {step === "signature" ? description : confirmDescription}
          </AppText>

          {step === "signature" ? (
            <>
              <View
                style={{
                  height: 230,
                  borderWidth: 1,
                  borderColor: COLORS.grayMedium,
                  borderRadius: 8,
                  overflow: "hidden",
                  backgroundColor: COLORS.white,
                  marginBottom: 12,
                }}
              >
                <SignatureCanvas
                  ref={signatureRef}
                  webviewProps={{ androidLayerType: "software" }}
                  onOK={handleSignatureSaved}
                  onEmpty={() => {
                    awaitingSignature.current = false;
                    setSubmitting(false);
                    showToast("Please draw your signature before continuing.");
                  }}
                  webStyle={`.m-signature-pad--footer {display: none; margin: 0px;}`}
                  descriptionText=""
                  clearText="Clear"
                  confirmText="Save"
                  penColor="#000000"
                  backgroundColor="#ffffff"
                  imageType="image/png"
                />
              </View>
            </>
          ) : (
            <>
              <CodeInputField
                code={pin}
                setCode={(value) => {
                  setPin(value);
                  setPinError("");
                }}
                maxLength={6}
                secure
                fluid
                autoFocus
                containerStyle={{
                  flex: 0,
                  marginVertical: 8,
                  marginBottom: 16,
                }}
                inputContainerStyle={{ width: "100%" }}
              />
              {!!signature && (
                <View
                  style={{
                    borderWidth: 1,
                    borderColor: COLORS.grayMedium,
                    borderRadius: 8,
                    height: 80,
                    marginBottom: 12,
                    justifyContent: "center",
                    backgroundColor: COLORS.white,
                  }}
                >
                  <Image
                    source={{ uri: signature }}
                    style={{
                      width: "100%",
                      height: "100%",
                      resizeMode: "contain",
                    }}
                  />
                </View>
              )}
            </>
          )}

          {!!pinError && (
            <AppText
              accessibilityRole="alert"
              style={{ color: COLORS.dangerBorder || "#D9534F", fontSize: 12, marginBottom: 12 }}
            >
              {pinError}
            </AppText>
          )}

          <View style={{ gap: 10, marginTop: 8 }}>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={handleConfirm}
              disabled={submitting}
              style={{
                minHeight: 48,
                borderRadius: 8,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                backgroundColor: COLORS.primaryLight,
                opacity: submitting ? 0.6 : 1,
              }}
            >
              {submitting && <ActivityIndicator color={COLORS.white} />}
              <AppText style={{ color: COLORS.white, fontWeight: "600" }}>
                {submitting
                  ? "Please wait..."
                  : step === "signature"
                    ? requirePin ? "Continue" : "Save Signature"
                    : saveLabel}
              </AppText>
            </TouchableOpacity>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <TouchableOpacity
                accessibilityRole="button"
                onPress={handleClose}
                disabled={submitting}
                style={[
                  secondaryButton,
                  { borderWidth: 1, borderColor: COLORS.grayMedium },
                ]}
              >
                <AppText style={{ color: COLORS.grayDark, fontWeight: "600" }}>
                  Cancel
                </AppText>
              </TouchableOpacity>
              {step === "signature" && (
                <TouchableOpacity
                  accessibilityRole="button"
                  onPress={() => {
                    signatureRef.current?.clearSignature();
                    setSignature("");
                    setPinError("");
                  }}
                  disabled={submitting}
                  style={[secondaryButton, { backgroundColor: "#D9534F" }]}
                >
                  <AppText style={{ color: COLORS.white, fontWeight: "600" }}>
                    Clear
                  </AppText>
                </TouchableOpacity>
              )}
              {step === "pin" && !pinOnly && (
                <TouchableOpacity
                  accessibilityRole="button"
                  onPress={() => setStep("signature")}
                  disabled={submitting}
                  style={[
                    secondaryButton,
                    { borderWidth: 1, borderColor: COLORS.grayMedium },
                  ]}
                >
                  <AppText style={{ color: COLORS.grayDark, fontWeight: "600" }}>
                    Redraw
                  </AppText>
                </TouchableOpacity>
              )}
            </View>
          </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
  );

  if (!useNativeModal) {
    if (!visible) return null;

    return (
      <View
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          zIndex: 1000,
          elevation: 1000,
        }}
      >
        {content}
      </View>
    );
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      {content}
    </Modal>
  );
}
