import React, { useEffect } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform,
} from "react-native";

import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { COLORS } from "../../stylesheets/colors";
import GroupMembersModal from "./GroupMembersModal";

export default function ChatView({
  selectedConversationDetails,
  setSelectedConversation,
  setMessages,
  setMembersModalOpen,
  messages,
  currentUserId,
  getEntityId,
  formatConversationTime,
  getMessageStatus,
  selectedConversation,
  scrollRef,
  draft,
  setDraft,
  handleSend,
  sending,
  membersModalOpen,
  selectedGroupMembers,
  renderAvatar,
  getDisplayName,
}) {
  useEffect(() => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: false });
    }, 50);
  }, [messages]);
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "#F7F9F8" }}
      edges={["top", "left", "right", "bottom"]}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="padding"
        keyboardVerticalOffset={0}
      >
        <View style={{ flex: 1 }}>
          {/* --- HEADER --- */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 10,
              paddingVertical: 8,
              backgroundColor: COLORS.white,
              borderBottomWidth: 1,
              borderBottomColor: "#ECEFEE",
            }}
          >
            <TouchableOpacity
              onPress={() => {
                setSelectedConversation(null);
                setMessages([]);
              }}
              style={{
                width: 38,
                height: 38,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialCommunityIcons
                name="arrow-left"
                size={24}
                color={COLORS.black}
              />
            </TouchableOpacity>

            {renderAvatar(selectedConversationDetails, 38)}

            <TouchableOpacity
              activeOpacity={
                selectedConversationDetails?.type === "group" ? 0.7 : 1
              }
              onPress={() => {
                if (selectedConversationDetails?.type === "group") {
                  setMembersModalOpen(true);
                }
              }}
              style={{ flex: 1, marginLeft: 10, minWidth: 0 }}
            >
              <Text
                numberOfLines={1}
                style={{ fontSize: 15, fontWeight: "800", color: COLORS.black }}
              >
                {selectedConversationDetails?.title || "Conversation"}
              </Text>
              <Text
                numberOfLines={1}
                style={{ fontSize: 11, color: COLORS.grayDark }}
              >
                {selectedConversationDetails?.subtitle || "Conversation"}
              </Text>
            </TouchableOpacity>

            {selectedConversationDetails?.type === "group" && (
              <TouchableOpacity
                onPress={() => setMembersModalOpen(true)}
                style={{
                  width: 36,
                  height: 36,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <MaterialCommunityIcons
                  name="information-outline"
                  size={22}
                  color={COLORS.black}
                />
              </TouchableOpacity>
            )}
          </View>

          {/* --- MESSAGES LIST --- */}
          <ScrollView
            ref={scrollRef}
            style={{ flex: 1 }}
            contentContainerStyle={{
              paddingHorizontal: 12,
              paddingVertical: 14,
              paddingBottom: 10,
            }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => {
              scrollRef.current?.scrollToEnd({ animated: true });
            }}
          >
            {messages.map((item) => {
              const mine =
                String(getEntityId(item.sender)) === String(currentUserId);

              return (
                <View
                  key={item._id}
                  style={{
                    alignItems: mine ? "flex-end" : "flex-start",
                    marginBottom: 8,
                  }}
                >
                  <View
                    style={{
                      maxWidth: "78%",
                      backgroundColor: mine ? COLORS.primaryLight : "#E9ECEF",
                      borderRadius: 18,
                      borderBottomRightRadius: mine ? 5 : 18,
                      borderBottomLeftRadius: mine ? 18 : 5,
                      paddingVertical: 9,
                      paddingHorizontal: 13,
                    }}
                  >
                    <Text
                      style={{
                        color: mine ? COLORS.white : COLORS.black,
                        fontSize: 14,
                        lineHeight: 19,
                      }}
                    >
                      {item.body}
                    </Text>
                  </View>

                  {/* --- RESTORED TIME AND STATUS --- */}
                  <Text
                    style={{
                      marginTop: 3,
                      paddingRight: mine ? 4 : 0,
                      paddingLeft: mine ? 0 : 4,
                      color: COLORS.grayDark,
                      fontSize: 10,
                    }}
                  >
                    {[
                      item.createdAt
                        ? formatConversationTime(item.createdAt)
                        : null,
                      mine
                        ? getMessageStatus(item, selectedConversation?.type)
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  </Text>
                </View>
              );
            })}
          </ScrollView>

          {/* --- INPUT FOOTER --- */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-end",
              paddingHorizontal: 10,
              paddingVertical: 8,
              backgroundColor: COLORS.white,
              borderTopWidth: 1,
              borderTopColor: "#ECEFEE",
              paddingBottom:
                Platform.OS === "ios" ? Math.max(insets.bottom, 8) : 8,
            }}
          >
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Message"
              placeholderTextColor={COLORS.grayDark}
              multiline
              maxLength={1000}
              style={{
                flex: 1,
                maxHeight: 96,
                minHeight: 40,
                borderRadius: 20,
                paddingHorizontal: 14,
                paddingVertical: 9,
                fontSize: 14,
                color: COLORS.black,
                backgroundColor: "#F1F3F5",
              }}
            />
            <TouchableOpacity
              onPress={handleSend}
              disabled={!draft.trim() || sending}
              style={{
                width: 40,
                height: 40,
                marginLeft: 8,
                borderRadius: 20,
                backgroundColor: draft.trim() ? COLORS.primaryLight : "#B7C6C2",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: Platform.OS === "ios" ? 0 : 2, // Minor alignment tweak
              }}
            >
              {sending ? (
                <ActivityIndicator color={COLORS.white} size="small" />
              ) : (
                <MaterialCommunityIcons
                  name="send"
                  size={20}
                  color={COLORS.white}
                />
              )}
            </TouchableOpacity>
          </View>

          <GroupMembersModal
            visible={membersModalOpen}
            onClose={() => setMembersModalOpen(false)}
            selectedConversationDetails={selectedConversationDetails}
            selectedGroupMembers={selectedGroupMembers}
            renderAvatar={renderAvatar}
            getDisplayName={getDisplayName}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
