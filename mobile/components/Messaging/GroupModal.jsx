import React from "react";
import AppText from "../common/AppText";
import AppInput from "../common/AppInput";
import {
  Modal,
  ScrollView,
  TouchableOpacity,
  View
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
  const [memberSearch, setMemberSearch] = React.useState("");
  const filteredUsers = users.filter((item) => {
    const haystack = `${getDisplayName(item)} ${item.username || ""} ${item.email || ""}`.toLowerCase();
    return haystack.includes(memberSearch.trim().toLowerCase());
  });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: "center", padding: 18, backgroundColor: "rgba(0,0,0,0.35)" }}>
        <View style={{ maxHeight: "82%", borderRadius: 8, padding: 16, backgroundColor: COLORS.white }}>
          <AppText style={{ fontSize: 17, fontWeight: "800", color: COLORS.black }}>New group chat</AppText>
          <AppInput
            value={groupName}
            onChangeText={setGroupName}
            placeholder="Group name"
            placeholderTextColor={COLORS.grayDark}
            maxLength={80}
            style={{ height: 42, marginTop: 14, borderWidth: 1, borderColor: "#D8DEDC", borderRadius: 6, paddingHorizontal: 10, color: COLORS.black }}
          />
          <AppText style={{ marginTop: 14, marginBottom: 8, fontSize: 12, color: COLORS.grayDark }}>Members</AppText>
          <AppInput
            value={memberSearch}
            onChangeText={setMemberSearch}
            placeholder="Search members"
            placeholderTextColor={COLORS.grayDark}
            style={{ height: 40, marginBottom: 10, borderWidth: 1, borderColor: "#D8DEDC", borderRadius: 6, paddingHorizontal: 10, color: COLORS.black }}
          />
          <ScrollView style={{ maxHeight: 260 }}>
            {filteredUsers.map((item) => {
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
                    <AppText numberOfLines={1} style={{ fontSize: 13, fontWeight: "700", color: COLORS.black }}>
                      {getDisplayName(item)}
                    </AppText>
                    <AppText numberOfLines={1} style={{ fontSize: 11, color: COLORS.grayDark }}>
                      {item.jobTitle || "User"}
                    </AppText>
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
              <AppText style={{ color: COLORS.grayDark, fontWeight: "700" }}>Cancel</AppText>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onCreate}
              disabled={creatingGroup}
              style={{ paddingHorizontal: 14, paddingVertical: 9, borderRadius: 6, backgroundColor: COLORS.primaryLight }}
            >
              <AppText style={{ color: COLORS.white, fontWeight: "800" }}>{creatingGroup ? "Creating..." : "Create"}</AppText>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
