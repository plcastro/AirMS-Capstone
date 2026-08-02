import React, { useContext, useRef, useState } from "react";
import AppText from "../common/AppText";
import {
  ActivityIndicator,
  Image,
  Modal,
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

const getUserName = (user) =>
  `${user?.firstName || ""} ${user?.lastName || ""}`.trim() ||
  user?.username ||
  "Unknown User";

const getUserIdentifier = (user) =>
  user?.licenseNo || user?.licenseNumber || user?.license || "";

const getUserTitle = (user) => user?.jobTitle || user?.access || "User";

export default function PostInspectionSignatureModal({
  visible,
  title,
  onClose,
  onSave,
  aircraftRPC,
  actionLabel = "sign",
}) {
  const { user } = useContext(AuthContext);
  const signatureRef = useRef(null);
  const [step, setStep] = useState("signature");
  const [signature, setSignature] = useState("");
  const [pin, setPin] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [advanceAfterSignature, setAdvanceAfterSignature] = useState(false);

  const reset = () => {
    setStep("signature");
    setSignature("");
    setPin("");
    setSubmitting(false);
    setAdvanceAfterSignature(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSignatureSaved = (signatureData) => {
    setSignature(signatureData);

    if (advanceAfterSignature) {
      setAdvanceAfterSignature(false);
      setStep("pin");
    }
  };

  const saveSignature = (advance = false) => {
    setAdvanceAfterSignature(advance);
    signatureRef.current?.readSignature();
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

  const handleConfirm = async () => {
    if (step === "signature") {
      if (!signature) {
        saveSignature(true);
        return;
      }

      setStep("pin");
      return;
    }

    if (!/^\d{6}$/.test(pin)) {
      showToast("Enter your 6-digit PIN to confirm this signature.");
      return;
    }

    if (!getUserIdentifier(user)) {
      showToast("Your profile has no license number. Contact an administrator before signing.");
      return;
    }

    try {
      setSubmitting(true);
      await verifyPin();
      await onSave({
        name: getUserName(user),
        id: getUserIdentifier(user),
        licenseNo: getUserIdentifier(user),
        title: getUserTitle(user),
        userId: user?.id || user?._id || "",
        signature,
      });
      reset();
      onClose();
    } catch (error) {
      showToast(error.message || "Could not verify your PIN.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={handleClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.5)",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <View
          style={{
            backgroundColor: COLORS.white,
            borderRadius: 12,
            width: "92%",
            padding: 20,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <AppText
              style={{ fontSize: 14, fontWeight: "600", color: COLORS.black }}
            >
              {title}
            </AppText>
            <TouchableOpacity onPress={handleClose}>
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
            {step === "signature"
              ? `Draw your signature below to ${actionLabel} the post-flight inspection for RP-C ${aircraftRPC || "N/A"}.`
              : `Enter your 6-digit PIN to confirm that you want to ${actionLabel} this post-flight inspection.`}
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
                  onOK={handleSignatureSaved}
                  onEmpty={() => {
                    setAdvanceAfterSignature(false);
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
                setCode={setPin}
                maxLength={6}
                secure
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

          <View
            style={{
              flexDirection: "row",
              justifyContent: "flex-end",
              gap: 10,
              marginTop: 20,
            }}
          >
            {step === "signature" && (
              <TouchableOpacity
                onPress={() => {
                  signatureRef.current?.clearSignature();
                  setSignature("");
                }}
                disabled={submitting}
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 18,
                  borderRadius: 8,
                  backgroundColor: "#D9534F",
                  opacity: submitting ? 0.6 : 1,
                }}
              >
                <AppText style={{ color: COLORS.white, fontWeight: "600" }}>
                  Clear
                </AppText>
              </TouchableOpacity>
            )}
            {step === "pin" && (
              <TouchableOpacity
                onPress={() => setStep("signature")}
                disabled={submitting}
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 18,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: COLORS.grayMedium,
                  opacity: submitting ? 0.6 : 1,
                }}
              >
                <AppText style={{ color: COLORS.grayDark, fontWeight: "600" }}>
                  Redraw
                </AppText>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={handleConfirm}
              disabled={submitting}
              style={{
                paddingVertical: 10,
                paddingHorizontal: 18,
                borderRadius: 8,
                backgroundColor: COLORS.primaryLight,
                opacity: submitting ? 0.6 : 1,
              }}
            >
              <AppText style={{ color: COLORS.white, fontWeight: "600" }}>
                {submitting
                  ? "Please wait..."
                  : step === "signature"
                    ? "Continue"
                    : "Sign and Confirm"}
              </AppText>
            </TouchableOpacity>
            {submitting && <ActivityIndicator color={COLORS.primaryLight} />}
          </View>
        </View>
      </View>
    </Modal>
  );
}
