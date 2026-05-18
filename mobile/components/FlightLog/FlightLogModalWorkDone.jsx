import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
} from "react-native";
import { COLORS } from "../../stylesheets/colors";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import PinVerifiedSignatureModal from "../common/PinVerifiedSignatureModal";

export default function FlightLogModalWorkDone({
  workItems = [],
  onUpdateWorkItems,
  isEditable = true,
}) {
  const [showSignatureModal, setShowSignatureModal] = useState(null);

  const workTypes = [
    "Discrepancy Correction",
    "SB/AD Compliance",
    "Inspection",
    "Others"
  ];

  const addWorkItem = () => {
    const newWorkItems = [...workItems, {
      id: Date.now().toString(),
      selectedWorkTypes: [],
      date: "",
      aircraft: "",
      workDone: "",
      name: "",
      certificateNumber: "",
      signature: "",
    }];
    onUpdateWorkItems(newWorkItems);
  };

  const removeWorkItem = (itemId) => {
    if (workItems.length > 1) {
      const newWorkItems = workItems.filter(item => item.id !== itemId);
      onUpdateWorkItems(newWorkItems);
    }
  };

  const updateWorkItem = (itemId, field, value) => {
    const newWorkItems = workItems.map(item =>
      item.id === itemId ? { ...item, [field]: value } : item
    );
    onUpdateWorkItems(newWorkItems);
  };

  const toggleWorkType = (itemId, type) => {
    const newWorkItems = workItems.map(item => {
      if (item.id === itemId) {
        const currentTypes = item.selectedWorkTypes || [];
        let newSelected;
        if (currentTypes.includes(type)) {
          newSelected = currentTypes.filter(t => t !== type);
        } else {
          newSelected = [...currentTypes, type];
        }
        return { ...item, selectedWorkTypes: newSelected };
      }
      return item;
    });
    onUpdateWorkItems(newWorkItems);
  };

  const handleSignature = (itemId, signature) => {
    updateWorkItem(itemId, "signature", signature);
    setShowSignatureModal(null);
  };

  const handleClearSignature = (itemId) => {
    updateWorkItem(itemId, "signature", "");
  };

  const renderSignatureModal = (itemId, title, onSave, onClose) => (
    <PinVerifiedSignatureModal
      visible={showSignatureModal === itemId}
      title={title}
      description="Draw the work-done signature below."
      confirmDescription="Enter your 6-digit PIN to save this work-done signature."
      onClose={onClose}
      onSave={(sig) => onSave(itemId, sig)}
    />
  );

  const renderInput = (itemId, label, fieldKey, placeholder = "", multiline = false) => (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ fontSize: 12, color: COLORS.black, marginBottom: 6, fontWeight: "500" }}>
        {label}:
      </Text>
      <TextInput
        style={{
          backgroundColor: isEditable ? "#F2F2F2" : "#E8E8E8",
          borderRadius: 6,
          height: multiline ? 80 : 42,
          paddingHorizontal: 12,
          paddingVertical: multiline ? 10 : 0,
          fontSize: 12,
          color: isEditable ? COLORS.black : COLORS.grayDark,
          textAlignVertical: multiline ? "top" : "center",
        }}
        value={workItems.find(item => item.id === itemId)?.[fieldKey] || ""}
        onChangeText={(text) => updateWorkItem(itemId, fieldKey, text)}
        placeholder={placeholder}
        placeholderTextColor={COLORS.grayDark}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        editable={isEditable}
      />
    </View>
  );

  if (workItems.length === 0 && isEditable) {
    return (
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={{ fontSize: 14, fontWeight: "600", color: COLORS.grayDark, marginBottom: 16}}>
          Work Done
        </Text>

        <View style={{
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
          padding: 40,
          alignItems: "center",
        }}>
          <MaterialCommunityIcons name="tools" size={48} color={COLORS.grayMedium} />
          <Text style={{ fontSize: 12, color: COLORS.grayDark, marginTop: 12, textAlign: "center" }}>
            No work items yet
          </Text>
          <TouchableOpacity
            onPress={addWorkItem}
            style={{
              backgroundColor: COLORS.primaryLight,
              borderRadius: 6,
              paddingVertical: 10,
              paddingHorizontal: 20,
              marginTop: 16,
            }}
          >
            <Text style={{ color: COLORS.white, fontSize: 12, fontWeight: "500" }}>
              + Add Work Done
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <Text style={{ fontSize: 14, fontWeight: "600", color: COLORS.grayDark, marginBottom: 16}}>
        Work Done
      </Text>

      {workItems.map((item, index) => (
        <View
          key={item.id}
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
          <View style={{
            backgroundColor: COLORS.primaryLight,
            paddingVertical: 14,
            paddingHorizontal: 16,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}>
            <Text style={{ fontSize: 14, color: COLORS.white, fontWeight: "600"}}>
              Work Done {workItems.length > 1 ? `#${index + 1}` : ""}
            </Text>
            {isEditable && workItems.length > 1 && (
              <TouchableOpacity onPress={() => removeWorkItem(item.id)}>
                <MaterialCommunityIcons name="close" size={20} color={COLORS.white} />
              </TouchableOpacity>
            )}
          </View>

          <View style={{ padding: 20 }}>
            {/* Work Done Checkboxes */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 12, color: COLORS.black, marginBottom: 8, fontWeight: "500" }}>Work Done</Text>
              {workTypes.map((type, idx) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => isEditable && toggleWorkType(item.id, type)}
                  style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 }}
                >
                  <View style={{
                    width: 20,
                    height: 20,
                    borderRadius: 4,
                    borderWidth: 2,
                    borderColor: COLORS.primaryLight,
                    backgroundColor: (item.selectedWorkTypes || []).includes(type) ? COLORS.primaryLight : "transparent",
                  }} />
                  <Text style={{ fontSize: 12, color: isEditable ? COLORS.black : COLORS.grayDark }}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Fields */}
            {renderInput(item.id, "Date", "date", "MM/DD/YYYY")}
            {renderInput(item.id, "Aircraft/T/", "aircraft", "Aircraft type")}
            {renderInput(item.id, "Work Done", "workDone", "Describe work done", true)}
            {renderInput(item.id, "Name", "name", "Technician name")}
            {renderInput(item.id, "Certificate Number", "certificateNumber", "Certificate number")}

            {/* Signature */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 12, color: COLORS.black, marginBottom: 6, fontWeight: "500" }}>
                Signature:
              </Text>
              {isEditable ? (
                <TouchableOpacity
                  onPress={() => setShowSignatureModal(item.id)}
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
                  {item.signature ? (
                    <Image
                      source={{ uri: item.signature }}
                      style={{ width: "100%", height: "100%", resizeMode: "contain" }}
                    />
                  ) : (
                    <Text style={{ color: COLORS.grayDark, fontSize: 12 }}>
                      Tap to sign
                    </Text>
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
                  {item.signature ? (
                    <Image
                      source={{ uri: item.signature }}
                      style={{ width: "100%", height: "100%", resizeMode: "contain" }}
                    />
                  ) : (
                    <Text style={{ color: COLORS.grayDark, fontSize: 12 }}>
                      No signature
                    </Text>
                  )}
                </View>
              )}
              {isEditable && item.signature && (
                <TouchableOpacity
                  onPress={() => handleClearSignature(item.id)}
                  style={{ alignSelf: "flex-end", marginTop: 8 }}
                >
                  <Text style={{ color: "#D9534F", fontSize: 12 }}>Clear Signature</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {renderSignatureModal(item.id, "Sign Here", handleSignature, () => setShowSignatureModal(null))}
        </View>
      ))}

      {isEditable && (
        <TouchableOpacity
          onPress={addWorkItem}
          style={{
            backgroundColor: COLORS.primaryLight,
            borderRadius: 6,
            paddingVertical: 12,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 20,
          }}
        >
          <Text style={{ color: COLORS.white, fontSize: 12, fontWeight: "500" }}>+ Add Work Done</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}
