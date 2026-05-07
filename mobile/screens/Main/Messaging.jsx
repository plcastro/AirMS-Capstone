import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { AuthContext } from "../../Context/AuthContext";
import { API_BASE } from "../../utilities/API_BASE";
import { COLORS } from "../../stylesheets/colors";
import { showToast } from "../../utilities/toast";

const getDisplayName = (user = {}) =>
  `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
  user.username ||
  "User";

const getImageUrl = (image) => {
  if (!image) return null;
  return String(image).startsWith("http") ? image : `${API_BASE}${image}`;
};

const getEntityId = (value) => value?._id || value?.id || value;

const formatConversationTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const period = hours >= 12 ? "PM" : "AM";
  const displayHour = hours % 12 || 12;

  if (sameDay) {
    return `${displayHour}:${minutes} ${period}`;
  }

  return date.toLocaleDateString([], { month: "short", day: "numeric" });
};

const getMessageStatus = (message) => {
  if (message.deliveryStatus === "sending") return "Sending...";
  if (message.deliveryStatus === "failed") return "Failed";
  if (message.readAt) return "Seen";
  return "Sent";
};

const withSentStatus = (message) => ({
  ...message,
  deliveryStatus: message.deliveryStatus || "sent",
});

const buildWsUrl = (token) => {
  const wsBase = String(API_BASE || "").replace(/^http/i, (match) =>
    match.toLowerCase() === "https" ? "wss" : "ws",
  );
  const separator = wsBase.includes("?") ? "&" : "?";
  return `${wsBase}${separator}token=${encodeURIComponent(token)}`;
};

export default function Messaging() {
  const { user } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);
  const wsRef = useRef(null);

  const selectedUser = useMemo(
    () => users.find((candidate) => String(candidate._id) === String(selectedUserId)),
    [selectedUserId, users],
  );

  const currentUserId = user?.id || user?._id;

  const conversationsByUserId = useMemo(() => {
    const byUserId = new Map();
    conversations.forEach((conversation) => {
      if (conversation.user?._id) {
        byUserId.set(String(conversation.user._id), conversation);
      }
    });
    return byUserId;
  }, [conversations]);

  const getToken = useCallback(() => AsyncStorage.getItem("currentUserToken"), []);

  const authFetch = useCallback(
    async (url, options = {}) => {
      const token = await getToken();
      if (!token) {
        throw new Error("Session expired. Please log in again.");
      }

      const response = await fetch(url, {
        ...options,
        headers: {
          Authorization: `Bearer ${token}`,
          ...(options.headers || {}),
        },
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "Request failed");
      }

      return data;
    },
    [getToken],
  );

  const fetchUsers = useCallback(async () => {
    const data = await authFetch(`${API_BASE}/api/messages/users`);
    setUsers(Array.isArray(data.data) ? data.data : []);
  }, [authFetch]);

  const fetchConversations = useCallback(async () => {
    const data = await authFetch(`${API_BASE}/api/messages/conversations`);
    setConversations(Array.isArray(data.data) ? data.data : []);
  }, [authFetch]);

  const fetchThread = useCallback(
    async (otherUserId) => {
      if (!otherUserId) {
        setMessages([]);
        return;
      }

      const data = await authFetch(`${API_BASE}/api/messages/${otherUserId}`);
      setMessages(Array.isArray(data.data) ? data.data : []);
      fetchConversations();
    },
    [authFetch, fetchConversations],
  );

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        await Promise.all([fetchUsers(), fetchConversations()]);
      } catch (error) {
        showToast(error.message || "Failed to load messages");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [fetchConversations, fetchUsers]);

  useEffect(() => {
    if (selectedUserId) {
      fetchThread(selectedUserId).catch((error) => {
        showToast(error.message || "Failed to load conversation");
      });
    }
  }, [fetchThread, selectedUserId]);

  useEffect(() => {
    const connect = async () => {
      const token = await getToken();
      if (!token || !user?.id) return;

      const ws = new WebSocket(buildWsUrl(token));
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.event === "chat:read") {
            const readReceipt = payload.data || {};
            const messageIds = new Set((readReceipt.messageIds || []).map(String));

            setMessages((current) =>
              current.map((item) =>
                messageIds.has(String(item._id))
                  ? { ...item, readAt: readReceipt.readAt, deliveryStatus: "sent" }
                  : item,
              ),
            );
            fetchConversations();
            return;
          }

          if (payload.event !== "chat:message") return;

          const nextMessage = payload.data;
          const otherUserId =
            String(getEntityId(nextMessage.sender)) === String(currentUserId)
              ? String(getEntityId(nextMessage.recipient))
              : String(getEntityId(nextMessage.sender));

          if (String(otherUserId) === String(selectedUserId)) {
            setMessages((current) => {
              if (current.some((item) => item._id === nextMessage._id)) {
                return current.map((item) =>
                  item._id === nextMessage._id ? withSentStatus({ ...item, ...nextMessage }) : item,
                );
              }
              return [...current, withSentStatus(nextMessage)];
            });
          }

          fetchConversations();
        } catch (error) {
          console.error("Message websocket parse error:", error);
        }
      };
    };

    connect();

    return () => {
      wsRef.current?.close?.();
    };
  }, [currentUserId, fetchConversations, getToken, selectedUserId]);

  const conversationUsers = useMemo(() => {
    const fromConversations = conversations.map((conversation) => conversation.user);
    const knownIds = new Set(fromConversations.map((conversationUser) => String(conversationUser?._id)));
    const remainingUsers = users.filter((item) => !knownIds.has(String(item._id)));
    const mergedUsers = [...fromConversations, ...remainingUsers].filter(Boolean);
    const query = searchText.trim().toLowerCase();

    if (!query) return mergedUsers;

    return mergedUsers.filter((item) =>
      [
        getDisplayName(item),
        item.username,
        item.email,
        item.jobTitle,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [conversations, searchText, users]);

  const getUnreadCount = (userId) =>
    conversations.find(
      (conversation) => String(conversation.user?._id) === String(userId),
    )?.unreadCount || 0;

  const getConversationPreview = (item) => {
    const conversation = conversationsByUserId.get(String(item._id));
    const lastMessage = conversation?.lastMessage;
    if (!lastMessage?.body) return null;
    const mine = String(getEntityId(lastMessage.sender)) === String(currentUserId);
    return {
      text: `${mine ? "You" : getDisplayName(item)}: ${lastMessage.body}`,
      time: formatConversationTime(lastMessage.createdAt),
    };
  };

  const handleSend = async () => {
    const body = draft.trim();
    if (!selectedUserId || !body) return;

    const tempId = `temp-${Date.now()}`;
    const pendingMessage = {
      _id: tempId,
      sender: currentUserId,
      recipient: selectedUserId,
      body,
      createdAt: new Date().toISOString(),
      deliveryStatus: "sending",
    };

    setDraft("");
    setMessages((current) => [...current, pendingMessage]);

    try {
      setSending(true);
      const data = await authFetch(`${API_BASE}/api/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientId: selectedUserId, body }),
      });

      setMessages((current) =>
        current
          .filter((item) => item._id !== tempId)
          .some((item) => item._id === data.data._id)
          ? current
              .filter((item) => item._id !== tempId)
              .map((item) =>
                item._id === data.data._id ? withSentStatus({ ...item, ...data.data }) : item,
              )
          : [...current.filter((item) => item._id !== tempId), withSentStatus(data.data)],
      );
      fetchConversations();
    } catch (error) {
      setMessages((current) =>
        current.map((item) =>
          item._id === tempId ? { ...item, deliveryStatus: "failed" } : item,
        ),
      );
      showToast(error.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={COLORS.primaryLight} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#F7F9F8" }}>
      <View style={{ backgroundColor: COLORS.white, padding: 12, borderBottomWidth: 1, borderBottomColor: "#E8E8E8" }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            borderWidth: 1,
            borderColor: "#D7DAD8",
            borderRadius: 8,
            paddingHorizontal: 10,
            backgroundColor: "#F8F8F8",
          }}
        >
          <MaterialCommunityIcons name="magnify" size={20} color={COLORS.grayDark} />
          <TextInput
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Search users"
            placeholderTextColor={COLORS.grayDark}
            style={{
              flex: 1,
              height: 40,
              marginLeft: 8,
              fontSize: 13,
              color: COLORS.black,
            }}
          />
          {searchText ? (
            <TouchableOpacity onPress={() => setSearchText("")}>
              <MaterialCommunityIcons name="close-circle" size={18} color={COLORS.grayDark} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <View style={{ maxHeight: 190, backgroundColor: COLORS.white }}>
        <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={{ padding: 12, gap: 8 }}>
          {conversationUsers.map((item) => {
            const active = String(item._id) === String(selectedUserId);
            const unreadCount = getUnreadCount(item._id);
            const imageUrl = getImageUrl(item.image);
            const preview = getConversationPreview(item);
            return (
              <TouchableOpacity
                key={item._id}
                onPress={() => setSelectedUserId(item._id)}
                style={{
                  width: 150,
                  borderWidth: 1,
                  borderColor: active ? COLORS.primaryLight : "#E1E4E2",
                  backgroundColor: active ? "#E9F4F1" : COLORS.white,
                  borderRadius: 8,
                  padding: 10,
                }}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  {imageUrl ? (
                    <Image
                      source={{ uri: imageUrl }}
                      style={{ width: 32, height: 32, borderRadius: 16 }}
                    />
                  ) : (
                    <MaterialCommunityIcons name="account-circle" size={32} color={COLORS.primaryLight} />
                  )}
                  {unreadCount > 0 && (
                    <View style={{ backgroundColor: COLORS.primaryLight, borderRadius: 999, minWidth: 20, height: 20, alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ color: COLORS.white, fontSize: 12 }}>{unreadCount}</Text>
                    </View>
                  )}
                </View>
                <Text numberOfLines={1} style={{ fontSize: 12, fontWeight: "700", marginTop: 6, lineHeight: 13, color: COLORS.black }}>
                  {getDisplayName(item)}
                </Text>
                <Text numberOfLines={1} style={{ fontSize: 11, lineHeight: 12, color: COLORS.grayDark, marginTop: -1 }}>
                  {item.jobTitle || "User"}
                </Text>
                {preview ? (
                  <View style={{ flexDirection: "row", alignItems: "center", marginTop: 10 }}>
                    <Text numberOfLines={1} style={{ flex: 1, fontSize: 10, color: COLORS.grayDark }}>
                      {preview.text}
                    </Text>
                    <Text style={{ marginLeft: 8, fontSize: 10, color: COLORS.grayDark }}>
                      ({preview.time})
                    </Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <View style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: "#E8E8E8", backgroundColor: COLORS.white }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          {selectedUser ? (
            getImageUrl(selectedUser.image) ? (
              <Image
                source={{ uri: getImageUrl(selectedUser.image) }}
                style={{ width: 38, height: 38, borderRadius: 19, marginRight: 10 }}
              />
            ) : (
              <MaterialCommunityIcons
                name="account-circle"
                size={38}
                color={COLORS.primaryLight}
                style={{ marginRight: 10 }}
              />
            )
          ) : null}
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: "700", color: COLORS.black }}>
              {selectedUser ? getDisplayName(selectedUser) : "Select a conversation"}
            </Text>
            <Text style={{ fontSize: 12, color: COLORS.grayDark }}>
              {selectedUser?.jobTitle || "Choose a user above to start messaging"}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 12 }}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd?.({ animated: true })}
      >
        {!selectedUserId && (
          <Text style={{ textAlign: "center", marginTop: 40, color: COLORS.grayDark }}>
            No conversation selected
          </Text>
        )}
        {messages.map((item, index) => {
          const mine = String(getEntityId(item.sender)) === String(currentUserId);
          const isLatestMessage = index === messages.length - 1;
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
                  backgroundColor: mine ? COLORS.primaryLight : COLORS.white,
                  borderRadius: 8,
                  paddingVertical: 9,
                  paddingHorizontal: 12,
                  borderWidth: mine ? 0 : 1,
                  borderColor: "#E1E4E2",
                }}
              >
                <Text style={{ color: mine ? COLORS.white : COLORS.black, fontSize: 13 }}>
                  {item.body}
                </Text>
              </View>
              {isLatestMessage ? (
                <Text
                  style={{
                    marginTop: 3,
                    paddingRight: mine ? 2 : 0,
                    paddingLeft: mine ? 0 : 2,
                    color: COLORS.grayDark,
                    fontSize: 10,
                  }}
                >
                  {formatConversationTime(item.createdAt)}
                  {mine ? ` ${getMessageStatus(item)}` : ""}
                </Text>
              ) : null}
            </View>
          );
        })}
      </ScrollView>

      <View style={{ flexDirection: "row", padding: 10, gap: 8, backgroundColor: COLORS.white, borderTopWidth: 1, borderTopColor: "#E8E8E8" }}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Write a message"
          multiline
          maxLength={1000}
          editable={Boolean(selectedUserId)}
          style={{
            flex: 1,
            maxHeight: 90,
            minHeight: 42,
            borderWidth: 1,
            borderColor: "#D7DAD8",
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 9,
            fontSize: 13,
            color: COLORS.black,
          }}
        />
        <TouchableOpacity
          onPress={handleSend}
          disabled={!selectedUserId || !draft.trim() || sending}
          style={{
            width: 44,
            height: 44,
            borderRadius: 8,
            backgroundColor: selectedUserId && draft.trim() ? COLORS.primaryLight : "#B7C6C2",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {sending ? (
            <ActivityIndicator color={COLORS.white} size="small" />
          ) : (
            <MaterialCommunityIcons name="send" size={20} color={COLORS.white} />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
