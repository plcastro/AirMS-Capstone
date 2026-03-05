import React, { useState } from "react";
import { View, Text, Modal, TextInput, TouchableOpacity } from "react-native";
import Button from "../Button";
import { styles } from "../../stylesheets/styles";
import { COLORS } from "../../stylesheets/colors";

export default function ReviewTask({
  visible,
  onClose,
  onConfirm,
  mode = "return",
}) {
  const [note, setNote] = useState("");
  const [signature, setSignature] = useState("");

  const handleConfirm = () => {
    if (mode === "return") {
      onConfirm({ note, signature });
    } else {
      onConfirm({ signature });
    }
    setNote("");
    setSignature("");
    onClose();
  };

  const handleCancel = () => {
    setNote("");
    setSignature("");
    onClose();
  };

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.alertOverlay}>
        <View style={[styles.alertContainer, { width: 400, padding: 24 }]}>
          <Text
            style={[
              styles.alertTitle,
              { fontSize: 24, marginBottom: 20, textAlign: "center" },
            ]}
          >
            {mode === "return" ? "RETURN TASK" : "APPROVE TASK"}
          </Text>

          <Text
            style={{
              fontSize: 16,
              color: "#666",
              marginBottom: 20,
              textAlign: "center",
            }}
          >
            {mode === "return"
              ? "Are you sure you want to return this task and leave remarks?"
              : "Are you sure you want to mark this as approved?"}
          </Text>

          {mode === "return" && (
            <>
              <Text
                style={{
                  fontSize: 14,
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

          <Text
            style={{ fontSize: 14, color: COLORS.grayDark, marginBottom: 8 }}
          >
            E-signature
          </Text>
          <View
            style={{
              borderWidth: 1,
              borderColor: COLORS.border,
              borderRadius: 8,
              padding: 12,
              marginBottom: 24,
              alignItems: "center",
              backgroundColor: COLORS.grayLight,
            }}
          >
            <TouchableOpacity
              onPress={() => setSignature("X")}
              style={{
                width: 40,
                height: 40,
                backgroundColor: COLORS.white,
                borderRadius: 4,
                justifyContent: "center",
                alignItems: "center",
                borderWidth: 1,
                borderColor: COLORS.border,
              }}
            >
              <Text
                style={{
                  fontSize: 24,
                  fontWeight: "bold",
                  color: COLORS.grayDark,
                }}
              >
                X
              </Text>
            </TouchableOpacity>
          </View>

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
              label={mode === "return" ? "RETURN" : "CONFIRM"}
              onPress={handleConfirm}
              buttonStyle={[
                mode === "return" ? styles.dangerBtn : styles.primaryAlertBtn,
                { width: 100 },
              ]}
              buttonTextStyle={styles.primaryBtnTxt}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}
