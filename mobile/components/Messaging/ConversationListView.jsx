import React from "react";
import {
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { COLORS } from "../../stylesheets/colors";
import GroupModal from "./GroupModal";

export default function ConversationListView({
  navigation,
  searchText,
  setSearchText,
  conversationItems,
  getConversationPreview,
  handleSelectConversation,
  renderAvatar,
  groupModalOpen,
  setGroupModalOpen,
  groupName,
  setGroupName,
  users,
  groupMemberIds,
  toggleGroupMember,
  creatingGroup,
  handleCreateGroup,
  getDisplayName,
}) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.white }}>
      <View
        style={{
          paddingHorizontal: 16,
          paddingTop: 6,
          paddingBottom: 8,
          backgroundColor: COLORS.white,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            height: 42,
            borderRadius: 21,
            paddingHorizontal: 14,
            backgroundColor: "#F1F3F5",
          }}
        >
          <MaterialCommunityIcons
            name="magnify"
            size={20}
            color={COLORS.grayDark}
          />
          <TextInput
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Search"
            placeholderTextColor={COLORS.grayDark}
            style={{
              flex: 1,
              marginLeft: 8,
              fontSize: 13,
              color: COLORS.black,
            }}
          />
          {searchText ? (
            <TouchableOpacity onPress={() => setSearchText("")}>
              <MaterialCommunityIcons
                name="close-circle"
                size={18}
                color={COLORS.grayDark}
              />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: 4, paddingBottom: 96 }}
      >
        {conversationItems.length === 0 ? (
          <View
            style={{
              alignItems: "center",
              marginTop: 56,
              paddingHorizontal: 32,
            }}
          >
            <MaterialCommunityIcons
              name="message-text-outline"
              size={42}
              color="#B7C6C2"
            />
            <Text
              style={{
                marginTop: 10,
                fontSize: 14,
                color: COLORS.grayDark,
                textAlign: "center",
              }}
            >
              No conversations found
            </Text>
          </View>
        ) : (
          conversationItems.map((item) => {
            const unreadCount = item.unreadCount || 0;
            const hasUnread = unreadCount > 0;
            const preview = getConversationPreview(item);

            return (
              <TouchableOpacity
                key={`${item.type}-${item.id}`}
                onPress={() => handleSelectConversation(item)}
                activeOpacity={0.75}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: 16,
                  paddingVertical: 9,
                  backgroundColor: hasUnread ? "#EAF4FF" : COLORS.white,
                  borderLeftWidth: hasUnread ? 3 : 0,
                  borderLeftColor: hasUnread
                    ? COLORS.primaryLight
                    : "transparent",
                }}
              >
                <View>
                  {renderAvatar(item, 58)}
                  {unreadCount > 0 ? (
                    <View
                      style={{
                        position: "absolute",
                        right: -2,
                        top: -2,
                        minWidth: 18,
                        height: 18,
                        borderRadius: 9,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: COLORS.dangerBorder,
                        borderWidth: 2,
                        borderColor: COLORS.white,
                      }}
                    >
                      <Text
                        style={{
                          color: COLORS.white,
                          fontSize: 9,
                          fontWeight: "700",
                        }}
                      >
                        {unreadCount}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <View style={{ flex: 1, marginLeft: 12, minWidth: 0 }}>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Text
                      numberOfLines={1}
                      style={{
                        flex: 1,
                        fontSize: 15,
                        fontWeight: hasUnread ? "900" : "800",
                        color: COLORS.black,
                      }}
                    >
                      {item.title}
                    </Text>
                    {preview?.time ? (
                      <Text
                        style={{
                          marginLeft: 8,
                          fontSize: 11,
                          color: COLORS.grayDark,
                        }}
                      >
                        {preview.time}
                      </Text>
                    ) : null}
                  </View>
                  <Text
                    numberOfLines={1}
                    style={{
                      marginTop: 0,
                      fontSize: 12,
                      color: COLORS.grayDark,
                      fontWeight: hasUnread ? "600" : "400",
                    }}
                  >
                    {item.subtitle}
                  </Text>
                  <Text
                    numberOfLines={1}
                    style={{
                      marginTop: 5,
                      fontSize: 13,
                      color: unreadCount > 0 ? COLORS.black : COLORS.grayDark,
                      fontWeight: unreadCount > 0 ? "700" : "400",
                    }}
                  >
                    {preview?.text || "Tap to start a conversation"}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
      <TouchableOpacity
        onPress={() => setGroupModalOpen(true)}
        activeOpacity={0.85}
        style={{
          position: "absolute",
          right: 24,
          bottom: 24,
          width: 56,
          height: 56,
          borderRadius: 28,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: COLORS.primaryLight,
          elevation: 6,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 4,
          zIndex: 10,
        }}
      >
        <MaterialCommunityIcons name="pencil" size={24} color={COLORS.white} />
      </TouchableOpacity>

      <GroupModal
        visible={groupModalOpen}
        onClose={() => setGroupModalOpen(false)}
        groupName={groupName}
        setGroupName={setGroupName}
        users={users}
        groupMemberIds={groupMemberIds}
        toggleGroupMember={toggleGroupMember}
        creatingGroup={creatingGroup}
        onCreate={handleCreateGroup}
        renderAvatar={renderAvatar}
        getDisplayName={getDisplayName}
      />
    </SafeAreaView>
  );
}
