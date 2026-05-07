import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { AuthContext } from "../../Context/AuthContext";
import { API_BASE } from "../../utilities/API_BASE";
import { COLORS } from "../../stylesheets/colors";
import { showToast } from "../../utilities/toast";

const LIVE_SYNC_INTERVAL_MS = 1000;
const LIVE_SYNC_FAILURE_BACKOFF_MS = 10000;
const DEVICE_HEADER_TOP_PADDING = StatusBar.currentHeight || 0;

const ignoreBackgroundMessagingError = () => {};

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

const getMessageStatus = (message, conversationType) => {
  if (message.deliveryStatus === "sending") return "Sending...";
  if (message.deliveryStatus === "failed") return "Failed";
  if (conversationType === "group") return "Sent";
  if (message.readAt) return "Seen";
  return "Sent";
};

const withSentStatus = (message) => ({
  ...message,
  deliveryStatus: message.deliveryStatus || "sent",
});

const mergeFetchedMessages = (currentMessages, fetchedMessages) => {
  const fetched = fetchedMessages.map(withSentStatus);
  const fetchedIds = new Set(fetched.map((item) => String(item._id)));
  const localOnly = currentMessages.filter(
    (item) =>
      !fetchedIds.has(String(item._id)) &&
      (String(item._id).startsWith("temp-") || item.deliveryStatus === "failed"),
  );

  return [...fetched, ...localOnly].sort((first, second) => {
    const firstTime = first.createdAt ? new Date(first.createdAt).getTime() : Number.MAX_SAFE_INTEGER;
    const secondTime = second.createdAt ? new Date(second.createdAt).getTime() : Number.MAX_SAFE_INTEGER;
    return firstTime - secondTime;
  });
};

const buildWsUrl = (token) => {
  const wsBase = String(API_BASE || "").replace(/^http/i, (match) =>
    match.toLowerCase() === "https" ? "wss" : "ws",
  );
  const separator = wsBase.includes("?") ? "&" : "?";
  return `${wsBase}${separator}token=${encodeURIComponent(token)}`;
};

export default function Messaging({ navigation }) {
  const { user } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [membersModalOpen, setMembersModalOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupMemberIds, setGroupMemberIds] = useState([]);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const scrollRef = useRef(null);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const selectedConversationRef = useRef(null);
  const liveSyncPausedUntilRef = useRef(0);

  const currentUserId = user?.id || user?._id;
  const selectedConversationId = selectedConversation?.id || null;

  const usersById = useMemo(() => {
    const byId = new Map();
    users.forEach((item) => byId.set(String(item._id), item));
    return byId;
  }, [users]);

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
        const error = new Error(data.message || `Request failed (${response.status})`);
        error.status = response.status;
        throw error;
      }

      return data;
    },
    [getToken],
  );

  const fetchUsers = useCallback(async () => {
    try {
      const data = await authFetch(`${API_BASE}/api/messages/users`);
      setUsers(Array.isArray(data.data) ? data.data : []);
    } catch (error) {
      if (error.status !== 404) {
        throw error;
      }

      const data = await authFetch(`${API_BASE}/api/user/get-all-users`);
      const fallbackUsers = Array.isArray(data.data)
        ? data.data.filter(
            (item) =>
              String(item._id) !== String(currentUserId) &&
              String(item.status || "").toLowerCase() === "active",
          )
        : [];
      setUsers(fallbackUsers);
    }
  }, [authFetch, currentUserId]);

  const fetchConversations = useCallback(async () => {
    try {
      const data = await authFetch(`${API_BASE}/api/messages/conversations`);
      setConversations(Array.isArray(data.data) ? data.data : []);
    } catch (error) {
      if (error.status === 404) {
        setConversations([]);
        return;
      }

      throw error;
    }
  }, [authFetch]);

  const fetchThread = useCallback(
    async (conversationId) => {
      if (!conversationId) {
        setMessages([]);
        return;
      }

      const data = await authFetch(`${API_BASE}/api/messages/${conversationId}`);
      const nextMessages = Array.isArray(data.data) ? data.data : [];
      setMessages((current) => mergeFetchedMessages(current, nextMessages));
      fetchConversations();
    },
    [authFetch, fetchConversations],
  );

  const syncMessaging = useCallback(async () => {
    const activeConversation = selectedConversationRef.current;
    if (activeConversation?.id) {
      await fetchThread(activeConversation.id);
      return;
    }

    await fetchConversations();
  }, [fetchConversations, fetchThread]);

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
    if (selectedConversationId) {
      fetchThread(selectedConversationId).catch((error) => {
        showToast(error.message || "Failed to load conversation");
      });
    }
  }, [fetchThread, selectedConversationId]);

  useEffect(() => {
    selectedConversationRef.current = selectedConversation;
  }, [selectedConversation]);

  useEffect(() => {
    let currentAppState = AppState.currentState;

    const syncIfActive = () => {
      if (currentAppState !== "active") return;
      if (Date.now() < liveSyncPausedUntilRef.current) return;

      syncMessaging().catch((error) => {
        liveSyncPausedUntilRef.current = Date.now() + LIVE_SYNC_FAILURE_BACKOFF_MS;
        ignoreBackgroundMessagingError(error);
      });
    };

    const subscription = AppState.addEventListener("change", (nextAppState) => {
      currentAppState = nextAppState;
      if (nextAppState === "active") {
        syncIfActive();
      }
    });

    const intervalId = setInterval(syncIfActive, LIVE_SYNC_INTERVAL_MS);

    return () => {
      clearInterval(intervalId);
      subscription.remove();
    };
  }, [syncMessaging]);

  useEffect(() => {
    let closedByEffect = false;

    const connect = async () => {
      const token = await getToken();
      if (!token || !currentUserId) return;

      const ws = new WebSocket(buildWsUrl(token));
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);

          if (payload.event === "chat:conversation") {
            fetchConversations();
            return;
          }

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

          if (
            payload.event === "data-changed" &&
            String(payload.data?.url || "").startsWith("/api/messages")
          ) {
            fetchConversations();
            if (selectedConversationRef.current?.id) {
              fetchThread(selectedConversationRef.current.id).catch((error) => {
                ignoreBackgroundMessagingError(error);
              });
            }
            return;
          }

          if (payload.event !== "chat:message") return;

          const nextMessage = withSentStatus(payload.data);
          const conversationId = nextMessage.conversation
            ? String(getEntityId(nextMessage.conversation))
            : String(getEntityId(nextMessage.sender)) === String(currentUserId)
              ? String(getEntityId(nextMessage.recipient))
              : String(getEntityId(nextMessage.sender));

          if (String(conversationId) === String(selectedConversationRef.current?.id)) {
            setMessages((current) => {
              if (current.some((item) => item._id === nextMessage._id)) {
                return current.map((item) =>
                  item._id === nextMessage._id ? withSentStatus({ ...item, ...nextMessage }) : item,
                );
              }
              return [...current, nextMessage];
            });

            if (String(getEntityId(nextMessage.sender)) !== String(currentUserId)) {
              fetchThread(conversationId).catch((error) => {
                ignoreBackgroundMessagingError(error);
              });
            }
          }

          fetchConversations();
        } catch (error) {
          ignoreBackgroundMessagingError(error);
        }
      };

      ws.onclose = () => {
        if (!closedByEffect) {
          reconnectTimeoutRef.current = setTimeout(connect, 1500);
        }
      };

      ws.onerror = () => {
        ws.close();
      };
    };

    connect();

    return () => {
      closedByEffect = true;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      wsRef.current?.close?.();
    };
  }, [currentUserId, fetchConversations, fetchThread, getToken]);

  const conversationItems = useMemo(() => {
    const directFromConversations = conversations
      .filter((conversation) => conversation.type !== "group" && conversation.user)
      .map((conversation) => ({
        ...conversation,
        id: String(getEntityId(conversation.user)),
        title: getDisplayName(conversation.user),
        subtitle: conversation.user.jobTitle || "User",
      }));
    const groupFromConversations = conversations
      .filter((conversation) => conversation.type === "group" && conversation.group)
      .map((conversation) => ({
        ...conversation,
        id: String(getEntityId(conversation.group)),
        title: conversation.group.name || "Group chat",
        subtitle: `${conversation.group.members?.length || 0} members`,
      }));
    const knownDirectIds = new Set(directFromConversations.map((conversation) => String(conversation.id)));
    const remainingUsers = users
      .filter((item) => !knownDirectIds.has(String(item._id)))
      .map((item) => ({
        type: "direct",
        id: String(item._id),
        user: item,
        title: getDisplayName(item),
        subtitle: item.jobTitle || "User",
        lastMessage: null,
        unreadCount: 0,
      }));
    const merged = [...groupFromConversations, ...directFromConversations, ...remainingUsers].filter(Boolean);
    const query = searchText.trim().toLowerCase();

    if (!query) return merged;

    return merged.filter((item) =>
      [item.title, item.subtitle, item.user?.username, item.user?.email]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [conversations, searchText, users]);

  const selectedConversationDetails = useMemo(() => {
    if (!selectedConversation) return null;

    const currentItem = conversationItems.find(
      (item) => item.type === selectedConversation.type && String(item.id) === String(selectedConversation.id),
    );

    if (currentItem) return currentItem;

    if (selectedConversation.type === "direct") {
      const selectedUser = usersById.get(String(selectedConversation.id));
      return selectedUser
        ? {
            type: "direct",
            id: String(selectedUser._id),
            user: selectedUser,
            title: getDisplayName(selectedUser),
            subtitle: selectedUser.jobTitle || "User",
          }
        : selectedConversation;
    }

    return selectedConversation;
  }, [conversationItems, selectedConversation, usersById]);

  const getConversationPreview = (item) => {
    const lastMessage = item?.lastMessage;
    if (!lastMessage?.body) return null;
    const mine = String(getEntityId(lastMessage.sender)) === String(currentUserId);
    const groupSender = item.group?.members?.find((member) =>
      String(getEntityId(member)) === String(getEntityId(lastMessage.sender)),
    );
    const senderName =
      item.type === "group" && !mine
        ? getDisplayName(groupSender || usersById.get(String(getEntityId(lastMessage.sender))) || {})
        : item.title;

    return {
      text: `${mine ? "You" : senderName}: ${lastMessage.body}`,
      time: formatConversationTime(lastMessage.createdAt),
    };
  };

  const handleSelectConversation = (item) => {
    setSelectedConversation({
      type: item.type === "group" ? "group" : "direct",
      id: String(item.id),
      title: item.title,
    });
    setMessages([]);
  };

  const handleSend = async () => {
    const body = draft.trim();
    if (!selectedConversation?.id || !body) return;

    const isGroup = selectedConversation.type === "group";
    const tempId = `temp-${Date.now()}`;
    const pendingMessage = {
      _id: tempId,
      sender: currentUserId,
      recipient: isGroup ? undefined : selectedConversation.id,
      conversation: isGroup ? selectedConversation.id : undefined,
      body,
      deliveryStatus: "sending",
    };

    setDraft("");
    setMessages((current) => [...current, pendingMessage]);

    try {
      setSending(true);
      const data = await authFetch(`${API_BASE}/api/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isGroup
            ? { conversationId: selectedConversation.id, body }
            : { recipientId: selectedConversation.id, body },
        ),
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

  const handleCreateGroup = async () => {
    const name = groupName.trim();
    if (!name || groupMemberIds.length === 0) {
      showToast("Add a group name and at least one member");
      return;
    }

    try {
      setCreatingGroup(true);
      const data = await authFetch(`${API_BASE}/api/messages/groups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, memberIds: groupMemberIds }),
      });

      const group = data.data?.group;
      if (group?._id) {
        setSelectedConversation({ type: "group", id: String(group._id), title: group.name });
      }
      setGroupModalOpen(false);
      setGroupName("");
      setGroupMemberIds([]);
      fetchConversations();
    } catch (error) {
      showToast(error.message || "Failed to create group chat");
    } finally {
      setCreatingGroup(false);
    }
  };

  const toggleGroupMember = (memberId) => {
    setGroupMemberIds((current) =>
      current.includes(memberId)
        ? current.filter((item) => item !== memberId)
        : [...current, memberId],
    );
  };

  const renderAvatar = (item, size = 42) => {
    if (item?.type === "group") {
      return (
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#E9F4F1",
          }}
        >
          <MaterialCommunityIcons name="account-group" size={Math.round(size * 0.58)} color={COLORS.primaryLight} />
        </View>
      );
    }

    const imageUrl = getImageUrl(item?.user?.image || item?.image);
    if (imageUrl) {
      return <Image source={{ uri: imageUrl }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
    }

    return <MaterialCommunityIcons name="account-circle" size={size} color={COLORS.primaryLight} />;
  };

  const selectedGroupMembers =
    selectedConversationDetails?.type === "group"
      ? selectedConversationDetails.group?.members || []
      : [];

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={COLORS.primaryLight} />
      </View>
    );
  }

  if (!selectedConversationId) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.white, paddingTop: DEVICE_HEADER_TOP_PADDING }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 16,
            paddingTop: 8,
            paddingBottom: 6,
            backgroundColor: COLORS.white,
          }}
        >
          <TouchableOpacity
            onPress={() => navigation?.openDrawer?.()}
            style={{
              width: 38,
              height: 38,
              borderRadius: 19,
              alignItems: "center",
              justifyContent: "center",
              marginRight: 10,
              backgroundColor: "#F1F3F5",
            }}
          >
            <MaterialCommunityIcons name="menu" size={22} color={COLORS.black} />
          </TouchableOpacity>
          <Text style={{ flex: 1, fontSize: 16, fontWeight: "800", color: COLORS.black }}>
            Chats
          </Text>
          <TouchableOpacity
            onPress={() => setGroupModalOpen(true)}
            style={{
              width: 38,
              height: 38,
              borderRadius: 19,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#F1F3F5",
            }}
          >
            <MaterialCommunityIcons name="pencil" size={19} color={COLORS.black} />
          </TouchableOpacity>
        </View>

        <View style={{ paddingHorizontal: 16, paddingTop: 6, paddingBottom: 8, backgroundColor: COLORS.white }}>
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
            <MaterialCommunityIcons name="magnify" size={20} color={COLORS.grayDark} />
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
                <MaterialCommunityIcons name="close-circle" size={18} color={COLORS.grayDark} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: 4, paddingBottom: 18 }}>
          {conversationItems.length === 0 ? (
            <View style={{ alignItems: "center", marginTop: 56, paddingHorizontal: 32 }}>
              <MaterialCommunityIcons name="message-text-outline" size={42} color="#B7C6C2" />
              <Text style={{ marginTop: 10, fontSize: 14, color: COLORS.grayDark, textAlign: "center" }}>
                No conversations found
              </Text>
            </View>
          ) : (
            conversationItems.map((item) => {
              const unreadCount = item.unreadCount || 0;
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
                    backgroundColor: COLORS.white,
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
                          backgroundColor: COLORS.primaryLight,
                          borderWidth: 2,
                          borderColor: COLORS.white,
                        }}
                      >
                        <Text style={{ color: COLORS.white, fontSize: 9, fontWeight: "700" }}>
                          {unreadCount}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <View style={{ flex: 1, marginLeft: 12, minWidth: 0 }}>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <Text numberOfLines={1} style={{ flex: 1, fontSize: 15, fontWeight: "800", color: COLORS.black }}>
                        {item.title}
                      </Text>
                      {preview?.time ? (
                        <Text style={{ marginLeft: 8, fontSize: 11, color: COLORS.grayDark }}>
                          {preview.time}
                        </Text>
                      ) : null}
                    </View>
                    <Text numberOfLines={1} style={{ marginTop: 0, fontSize: 12, color: COLORS.grayDark }}>
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

        <Modal visible={groupModalOpen} transparent animationType="fade" onRequestClose={() => setGroupModalOpen(false)}>
          <View style={{ flex: 1, justifyContent: "center", padding: 18, backgroundColor: "rgba(0,0,0,0.35)" }}>
            <View style={{ maxHeight: "82%", borderRadius: 8, padding: 16, backgroundColor: COLORS.white }}>
              <Text style={{ fontSize: 17, fontWeight: "800", color: COLORS.black }}>New group chat</Text>
              <TextInput
                value={groupName}
                onChangeText={setGroupName}
                placeholder="Group name"
                placeholderTextColor={COLORS.grayDark}
                maxLength={80}
                style={{
                  height: 42,
                  marginTop: 14,
                  borderWidth: 1,
                  borderColor: "#D8DEDC",
                  borderRadius: 6,
                  paddingHorizontal: 10,
                  color: COLORS.black,
                }}
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
                <TouchableOpacity
                  onPress={() => setGroupModalOpen(false)}
                  style={{ paddingHorizontal: 14, paddingVertical: 9, borderRadius: 6 }}
                >
                  <Text style={{ color: COLORS.grayDark, fontWeight: "700" }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleCreateGroup}
                  disabled={creatingGroup}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 9,
                    borderRadius: 6,
                    backgroundColor: COLORS.primaryLight,
                  }}
                >
                  <Text style={{ color: COLORS.white, fontWeight: "800" }}>
                    {creatingGroup ? "Creating..." : "Create"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F7F9F8", paddingTop: DEVICE_HEADER_TOP_PADDING }}>
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
            borderRadius: 19,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.black} />
        </TouchableOpacity>
        {renderAvatar(selectedConversationDetails, 38)}
        <TouchableOpacity
          activeOpacity={selectedConversationDetails?.type === "group" ? 0.7 : 1}
          onPress={() => {
            if (selectedConversationDetails?.type === "group") {
              setMembersModalOpen(true);
            }
          }}
          style={{ flex: 1, marginLeft: 10, minWidth: 0 }}
        >
          <Text numberOfLines={1} style={{ fontSize: 15, fontWeight: "800", color: COLORS.black }}>
            {selectedConversationDetails?.title || "Conversation"}
          </Text>
          <Text numberOfLines={1} style={{ fontSize: 11, color: COLORS.grayDark }}>
            {selectedConversationDetails?.subtitle || "Conversation"}
          </Text>
        </TouchableOpacity>
        {selectedConversationDetails?.type === "group" ? (
          <TouchableOpacity
            onPress={() => setMembersModalOpen(true)}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <MaterialCommunityIcons name="information-outline" size={22} color={COLORS.black} />
          </TouchableOpacity>
        ) : null}
      </View>

      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 14 }}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd?.({ animated: true })}
      >
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
                  backgroundColor: mine ? COLORS.primaryLight : "#E9ECEF",
                  borderRadius: 18,
                  borderBottomRightRadius: mine ? 5 : 18,
                  borderBottomLeftRadius: mine ? 18 : 5,
                  paddingVertical: 9,
                  paddingHorizontal: 13,
                }}
              >
                <Text style={{ color: mine ? COLORS.white : COLORS.black, fontSize: 14, lineHeight: 19 }}>
                  {item.body}
                </Text>
              </View>
              {isLatestMessage ? (
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
                    item.createdAt ? formatConversationTime(item.createdAt) : null,
                    mine ? getMessageStatus(item, selectedConversation?.type) : null,
                  ]
                    .filter(Boolean)
                    .join(" ")}
                </Text>
              ) : null}
            </View>
          );
        })}
      </ScrollView>

      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-end",
          paddingHorizontal: 10,
          paddingVertical: 8,
          backgroundColor: COLORS.white,
          borderTopWidth: 1,
          borderTopColor: "#ECEFEE",
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
          }}
        >
          {sending ? (
            <ActivityIndicator color={COLORS.white} size="small" />
          ) : (
            <MaterialCommunityIcons name="send" size={20} color={COLORS.white} />
          )}
        </TouchableOpacity>
      </View>
      <Modal visible={membersModalOpen} transparent animationType="fade" onRequestClose={() => setMembersModalOpen(false)}>
        <View style={{ flex: 1, justifyContent: "center", padding: 18, backgroundColor: "rgba(0,0,0,0.35)" }}>
          <View style={{ maxHeight: "78%", borderRadius: 14, padding: 16, backgroundColor: COLORS.white }}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
              <Text style={{ flex: 1, fontSize: 18, fontWeight: "900", color: COLORS.black }}>Members</Text>
              <TouchableOpacity
                onPress={() => setMembersModalOpen(false)}
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
    </SafeAreaView>
  );
}
