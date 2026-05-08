import React from "react";
import {
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { COLORS } from "../../stylesheets/colors";

export default function GroupModal({
  visible,
  onClose,
  groupName,
  setGroupName,
  users,
  groupMemberIds,
  toggleGroupMember,
  creatingGroup,
  onCreate,
  renderAvatar,
  getDisplayName,
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: "center", padding: 18, backgroundColor: "rgba(0,0,0,0.35)" }}>
        <View style={{ maxHeight: "82%", borderRadius: 8, padding: 16, backgroundColor: COLORS.white }}>
          <Text style={{ fontSize: 17, fontWeight: "800", color: COLORS.black }}>New group chat</Text>
          <TextInput
            value={groupName}
            onChangeText={setGroupName}
            placeholder="Group name"
            placeholderTextColor={COLORS.grayDark}
            maxLength={80}
            style={{ height: 42, marginTop: 14, borderWidth: 1, borderColor: "#D8DEDC", borderRadius: 6, paddingHorizontal: 10, color: COLORS.black }}
          />
          <Text style={{ marginTop: 14, marginBottom: 8, fontSize: 12, color: COLORS.grayDark }}>Members</Text>
          <ScrollView style={{ maxHeight: 260 }}>
            {users.map((item) => {
              const memberId = String(item._id);
              const selected = groupMemberIds.includes(memberId);
              return (
                <TouchableOpacity
                  key={memberId}
                  onPress={() => toggleGroupMember(memberId)}
                  style={{ flexDirection: "row", alignItems: "center", paddingVertical: 8 }}
                >
                  {renderAvatar({ type: "direct", user: item }, 34)}
                  <View style={{ flex: 1, marginLeft: 9 }}>
                    <Text numberOfLines={1} style={{ fontSize: 13, fontWeight: "700", color: COLORS.black }}>
                      {getDisplayName(item)}
                    </Text>
                    <Text numberOfLines={1} style={{ fontSize: 11, color: COLORS.grayDark }}>
                      {item.jobTitle || "User"}
                    </Text>
                  </View>
                  <MaterialCommunityIcons
                    name={selected ? "checkbox-marked-circle" : "checkbox-blank-circle-outline"}
                    size={22}
                    color={selected ? COLORS.primaryLight : COLORS.grayDark}
                  />
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
            <TouchableOpacity onPress={onClose} style={{ paddingHorizontal: 14, paddingVertical: 9, borderRadius: 6 }}>
              <Text style={{ color: COLORS.grayDark, fontWeight: "700" }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onCreate}
              disabled={creatingGroup}
              style={{ paddingHorizontal: 14, paddingVertical: 9, borderRadius: 6, backgroundColor: COLORS.primaryLight }}
            >
              <Text style={{ color: COLORS.white, fontWeight: "800" }}>{creatingGroup ? "Creating..." : "Create"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
