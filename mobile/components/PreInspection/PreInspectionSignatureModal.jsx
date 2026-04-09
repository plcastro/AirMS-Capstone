import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
} from "react-native";
import { COLORS } from "../../stylesheets/colors";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export default function PreInspectionSignatureModal({
  visible,
  title,
  onClose,
  onSave,
  aircraftRPC,
  role, // "ENGINEER" or "PILOT"
}) {
  const [name, setName] = useState("");
  const [id, setId] = useState("");

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert("Validation Error", "Please enter your name");
      return;
    }
    if (!id.trim()) {
      Alert.alert("Validation Error", "Please enter your ID/Employee Number");
      return;
    }
    onSave({ name, id });
    setName("");
    setId("");
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
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
            width: "90%",
            maxHeight: "80%",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <View
            style={{
              backgroundColor: COLORS.primaryLight,
              paddingVertical: 16,
              paddingHorizontal: 20,
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Text
              style={{ fontSize: 18, fontWeight: "600", color: COLORS.white }}
            >
              {title}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialCommunityIcons
                name="close"
                size={24}
                color={COLORS.white}
              />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView style={{ padding: 20 }}>
            <Text
              style={{ fontSize: 14, color: COLORS.grayDark, marginBottom: 16 }}
            >
              Aircraft RP/C: {aircraftRPC || "N/A"}
            </Text>

            <View style={{ marginBottom: 16 }}>
              <Text
                style={{
                  fontSize: 14,
                  color: COLORS.black,
                  marginBottom: 8,
                  fontWeight: "500",
                }}
              >
                Name *
              </Text>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: COLORS.grayMedium,
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 16,
                  backgroundColor: COLORS.white,
                }}
                placeholder="Enter your full name"
                value={name}
                onChangeText={setName}
              />
            </View>

            <View style={{ marginBottom: 16 }}>
              <Text
                style={{
                  fontSize: 14,
                  color: COLORS.black,
                  marginBottom: 8,
                  fontWeight: "500",
                }}
              >
                ID / Employee Number *
              </Text>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: COLORS.grayMedium,
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 16,
                  backgroundColor: COLORS.white,
                }}
                placeholder="Enter your ID or Employee Number"
                value={id}
                onChangeText={setId}
                keyboardType="numeric"
              />
            </View>
          </ScrollView>

          {/* Footer */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "flex-end",
              padding: 16,
              borderTopWidth: 1,
              borderTopColor: COLORS.grayMedium,
              gap: 12,
            }}
          >
            <TouchableOpacity
              onPress={onClose}
              style={{
                paddingVertical: 8,
                paddingHorizontal: 20,
                borderRadius: 6,
                borderWidth: 1,
                borderColor: COLORS.grayMedium,
              }}
            >
              <Text style={{ color: COLORS.grayDark }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSave}
              style={{
                paddingVertical: 8,
                paddingHorizontal: 20,
                borderRadius: 6,
                backgroundColor: COLORS.primaryLight,
              }}
            >
              <Text style={{ color: COLORS.white, fontWeight: "600" }}>
                Save
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
