import React, { useContext, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import SignatureCanvas from "react-native-signature-canvas";
import Button from "../Button";
import CodeInputField from "../CodeInputField";
import { styles } from "../../stylesheets/styles";
import { COLORS } from "../../stylesheets/colors";
import { AuthContext } from "../../Context/AuthContext";
import { API_BASE } from "../../utilities/API_BASE";
import { showToast } from "../../utilities/toast";

export default function ReviewTask({
  visible,
  onClose,
  onConfirm,
  mode = "return",
  checklistItems = [],
  checklistState = [],
}) {
  const { user } = useContext(AuthContext);
  const [note, setNote] = useState("");
  const [signature, setSignature] = useState("");
  const [pin, setPin] = useState("");
  const [itemsToUncheck, setItemsToUncheck] = useState([]);
  const [step, setStep] = useState("signature");
  const [submitting, setSubmitting] = useState(false);
  const [advanceAfterSignature, setAdvanceAfterSignature] = useState(false);
  const signatureRef = useRef(null);

  const resetForm = () => {
    setNote("");
    setSignature("");
    setPin("");
    setItemsToUncheck([]);
    setStep("signature");
    setAdvanceAfterSignature(false);
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

  const handleConfirm = async () => {
    if (mode === "return") {
      if (!note.trim()) {
        showToast("Please enter return remarks before returning this task.");
        return;
      }

      try {
        setSubmitting(true);
        await onConfirm({ note, signature, itemsToUncheck });
        resetForm();
        onClose();
      } catch (error) {
        showToast(error.message || "Could not return this task.");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (step === "signature") {
      if (!signature) {
        saveSignature(true);
        return;
      }

      setStep("pin");
      return;
    }

    if (!/^\d{6}$/.test(pin)) {
      showToast("Enter your 6-digit PIN to confirm this approval.");
      return;
    }

    try {
      setSubmitting(true);
      await verifyPin();
      await onConfirm({ signature });
      resetForm();
      onClose();
    } catch (error) {
      showToast(error.message || "Could not approve this task.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    resetForm();
    onClose();
  };

  const toggleItemToUncheck = (index) => {
    setItemsToUncheck((prev) =>
      prev.includes(index)
        ? prev.filter((itemIndex) => itemIndex !== index)
        : [...prev, index],
    );
  };

  const checkedChecklistItems = checklistItems
    .map((item, index) => ({ item, index }))
    .filter(({ index }) => checklistState[index] === true);

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.alertOverlay}>
        <View style={[styles.alertContainer, { width: 400, padding: 24 }]}>
          <Text
            style={[
              styles.alertTitle,
              { fontSize: 12, marginBottom: 20, textAlign: "center" },
            ]}
          >
            {mode === "return" ? "RETURN TASK" : "APPROVE TASK"}
          </Text>

          <Text
            style={{
              fontSize: 12,
              color: "#666",
              marginBottom: 20,
              textAlign: "center",
            }}
          >
            {mode === "return"
              ? "Are you sure you want to return this task and leave remarks?"
              : step === "signature"
                ? "Draw your approval signature below. This signature will be attached to the reviewed task."
                : "Enter your 6-digit PIN to confirm that you want to sign and approve this task."}
          </Text>

          {mode === "return" && (
            <>
              {checkedChecklistItems.length > 0 && (
                <View style={{ marginBottom: 20 }}>
                  <Text
                    style={{
                      fontSize: 12,
                      color: COLORS.grayDark,
                      marginBottom: 10,
                    }}
                  >
                    Uncheck checklist items that need rework:
                  </Text>

                  <View style={{ maxHeight: 170 }}>
                    <ScrollView nestedScrollEnabled>
                      {checkedChecklistItems.map(({ item, index }) => {
                        const selected = itemsToUncheck.includes(index);
                        const meta = [item.taskId, item.inspectionTypeFull]
                          .filter(Boolean)
                          .join(" | ");

                        return (
                          <TouchableOpacity
                            key={`${item.taskId || item.taskName}-${index}`}
                            activeOpacity={0.75}
                            onPress={() => toggleItemToUncheck(index)}
                            style={{
                              flexDirection: "row",
                              alignItems: "flex-start",
                              marginBottom: 10,
                            }}
                          >
                            <View
                              style={{
                                width: 20,
                                height: 20,
                                borderRadius: 4,
                                borderWidth: 2,
                                borderColor: COLORS.primaryLight,
                                backgroundColor: selected
                                  ? "transparent"
                                  : COLORS.primaryLight,
                                alignItems: "center",
                                justifyContent: "center",
                                marginRight: 10,
                                marginTop: 1,
                              }}
                            >
                              {!selected && (
                                <MaterialCommunityIcons
                                  name="check"
                                  size={14}
                                  color={COLORS.white}
                                />
                              )}
                            </View>

                            <View style={{ flex: 1 }}>
                              {!!meta && (
                                <Text
                                  style={{
                                    fontSize: 12,
                                    color: COLORS.grayDark,
                                    marginBottom: 2,
                                  }}
                                >
                                  {meta}
                                </Text>
                              )}
                              <Text
                                style={{
                                  fontSize: 12,
                                  color: COLORS.black,
                                }}
                              >
                                {item.taskName || "Checklist item"}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                </View>
              )}
              <Text
                style={{
                  fontSize: 12,
                  color: COLORS.grayDark,
                  marginBottom: 8,
                }}
              >
                Leave a note...
              </Text>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: COLORS.border,
                  borderRadius: 8,
                  padding: 12,
                  minHeight: 80,
                  marginBottom: 20,
                  textAlignVertical: "top",
                  backgroundColor: COLORS.grayLight,
                }}
                multiline
                value={note}
                onChangeText={setNote}
                placeholder="Enter your remarks here..."
                placeholderTextColor="#999"
              />
            </>
          )}

          {mode === "approve" && step === "signature" && (
            <>
              <Text
                style={{ fontSize: 12, color: COLORS.grayDark, marginBottom: 8 }}
              >
                Approval signature
              </Text>
              <View
                style={{
                  borderWidth: 1,
                  borderColor: COLORS.border,
                  borderRadius: 8,
                  height: 180,
                  marginBottom: 12,
                  overflow: "hidden",
                  backgroundColor: COLORS.white,
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
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "flex-end",
                  gap: 8,
                  marginBottom: 24,
                }}
              >
                <Button
                  label="CLEAR"
                  onPress={() => {
                    signatureRef.current?.clearSignature();
                    setSignature("");
                  }}
                  buttonStyle={[styles.dangerBtn, { width: 90 }]}
                  buttonTextStyle={styles.primaryBtnTxt}
                />
              </View>
            </>
          )}

          {mode === "approve" && step === "pin" && (
            <>
              <Text
                style={{ fontSize: 12, color: COLORS.grayDark, marginBottom: 8 }}
              >
                Confirm PIN
              </Text>
              <CodeInputField
                code={pin}
                setCode={setPin}
                maxLength={6}
                secure
                containerStyle={{ flex: 0, marginVertical: 8, marginBottom: 16 }}
                inputContainerStyle={{ width: "100%" }}
              />
              {!!signature && (
                <View
                  style={{
                    borderWidth: 1,
                    borderColor: COLORS.border,
                    borderRadius: 8,
                    height: 80,
                    marginBottom: 24,
                    backgroundColor: COLORS.white,
                    justifyContent: "center",
                  }}
                >
                  <Image
                    source={{ uri: signature }}
                    style={{ width: "100%", height: "100%", resizeMode: "contain" }}
                  />
                </View>
              )}
            </>
          )}

          {/* Buttons */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "flex-end",
              gap: 12,
            }}
          >
            <Button
              label="CANCEL"
              onPress={handleCancel}
              buttonStyle={[styles.secondaryBtn, { width: 100 }]}
              buttonTextStyle={styles.secondaryBtnTxt}
            />
            <Button
              label={
                submitting
                  ? "WAIT..."
                  : mode === "return"
                    ? "RETURN"
                    : step === "signature"
                      ? "CONTINUE"
                      : "SIGN & APPROVE"
              }
              onPress={handleConfirm}
              disabled={submitting}
              buttonStyle={[
                mode === "return" ? styles.dangerBtn : styles.primaryAlertBtn,
                { width: mode === "approve" && step === "pin" ? 140 : 120 },
              ]}
              buttonTextStyle={styles.primaryBtnTxt}
            />
            {submitting && <ActivityIndicator color={COLORS.primaryLight} />}
          </View>
        </View>
      </View>
    </Modal>
  );
}
