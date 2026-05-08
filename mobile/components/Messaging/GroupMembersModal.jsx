import React from "react";
import { Modal, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { COLORS } from "../../stylesheets/colors";

export default function GroupMembersModal({
  visible,
  onClose,
  selectedConversationDetails,
  selectedGroupMembers,
  renderAvatar,
  getDisplayName,
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: "center", padding: 18, backgroundColor: "rgba(0,0,0,0.35)" }}>
        <View style={{ maxHeight: "78%", borderRadius: 14, padding: 16, backgroundColor: COLORS.white }}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
            <Text style={{ flex: 1, fontSize: 18, fontWeight: "900", color: COLORS.black }}>Members</Text>
            <TouchableOpacity
              onPress={onClose}
              style={{ width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: "#F1F3F5" }}
            >
              <MaterialCommunityIcons name="close" size={20} color={COLORS.black} />
            </TouchableOpacity>
          </View>
          <Text numberOfLines={1} style={{ marginBottom: 8, fontSize: 12, color: COLORS.grayDark }}>
            {selectedConversationDetails?.title || "Group chat"} · {selectedGroupMembers.length} members
          </Text>
          <ScrollView style={{ maxHeight: 320 }}>
            {selectedGroupMembers.map((member) => (
              <View key={String(member._id || member.id)} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 8 }}>
                {renderAvatar({ type: "direct", user: member }, 38)}
                <View style={{ flex: 1, marginLeft: 10, minWidth: 0 }}>
                  <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: "800", color: COLORS.black }}>
                    {getDisplayName(member)}
                  </Text>
                  <Text numberOfLines={1} style={{ fontSize: 12, color: COLORS.grayDark }}>
                    {member.jobTitle || "User"}
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
