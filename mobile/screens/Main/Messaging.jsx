import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ActivityIndicator, AppState, BackHandler, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect } from "@react-navigation/native";
import { AuthContext } from "../../Context/AuthContext";
import { API_BASE } from "../../utilities/API_BASE";
import { COLORS } from "../../stylesheets/colors";
import { showToast } from "../../utilities/toast";
import MessagingAvatar from "../../components/Messaging/MessagingAvatar";
import ConversationListView from "../../components/Messaging/ConversationListView";
import ChatView from "../../components/Messaging/ChatView";

const LIVE_SYNC_INTERVAL_MS = 1000;
const LIVE_SYNC_FAILURE_BACKOFF_MS = 10000;

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

const getAttachmentUrl = (url) => {
  if (!url) return "";
  return String(url).startsWith("http") || String(url).startsWith("file:")
    ? url
    : `${API_BASE}${url}`;
};

const getAttachmentLabel = (attachments = []) => {
  const attachment = attachments[0];
  if (!attachment) return "";
  const prefix = attachment.kind === "image" ? "Photo" : "File";
  return attachments.length > 1
    ? `${prefix}: ${attachment.name} +${attachments.length - 1}`
    : `${prefix}: ${attachment.name}`;
};

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

  return date.toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });
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
      (String(item._id).startsWith("temp-") ||
        item.deliveryStatus === "failed"),
  );

  return [...fetched, ...localOnly].sort((first, second) => {
    const firstTime = first.createdAt
      ? new Date(first.createdAt).getTime()
      : Number.MAX_SAFE_INTEGER;
    const secondTime = second.createdAt
      ? new Date(second.createdAt).getTime()
      : Number.MAX_SAFE_INTEGER;
    return firstTime - secondTime;
  });
};

const buildWsUrl = (token) => {
  const wsBase = String(API_BASE || "")
    .replace(/\/+$/, "")
    .replace(/^http/i, (match) =>
      match.toLowerCase() === "https" ? "wss" : "ws",
    );
  return `${wsBase}/ws?token=${encodeURIComponent(token)}`;
};

export default function Messaging({ navigation, route }) {
  const { user } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [attachments, setAttachments] = useState([]);
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
  const notifiedMessageIdsRef = useRef(new Set());
  const handledNotificationTargetRef = useRef("");

  const currentUserId = user?.id || user?._id;
  const selectedConversationId = selectedConversation?.id || null;

  const usersById = useMemo(() => {
    const byId = new Map();
    users.forEach((item) => byId.set(String(item._id), item));
    return byId;
  }, [users]);

  const getToken = useCallback(
    () => AsyncStorage.getItem("currentUserToken"),
    [],
  );

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
        const error = new Error(
          data.message || `Request failed (${response.status})`,
        );
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

      const data = await authFetch(
        `${API_BASE}/api/messages/${conversationId}`,
      );
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

  const notifyIncomingChat = useCallback(
    (messagePayload) => {
      const messageId = String(messagePayload?._id || "");
      if (!messageId || notifiedMessageIdsRef.current.has(messageId)) return;
      notifiedMessageIdsRef.current.add(messageId);

      const senderId = String(getEntityId(messagePayload?.sender));
      if (!senderId || senderId === String(currentUserId)) return;

      const senderUser = usersById.get(senderId) || {};
      const senderName = getDisplayName(senderUser);
      const preview =
        String(messagePayload?.body || "").trim() ||
        getAttachmentLabel(messagePayload?.attachments || []) ||
        "sent a message";
      showToast(`${senderName}: ${preview}`);
    },
    [currentUserId, usersById],
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
    if (selectedConversationId) {
      fetchThread(selectedConversationId).catch((error) => {
        showToast(error.message || "Failed to load conversation");
      });
    }
  }, [fetchThread, selectedConversationId]);

  useEffect(() => {
    selectedConversationRef.current = selectedConversation;
  }, [selectedConversation]);

  useFocusEffect(
    useCallback(() => {
      const onHardwareBackPress = () => {
        if (selectedConversationRef.current?.id) {
          setSelectedConversation(null);
          setMessages([]);
          return true;
        }

        if (navigation?.canGoBack?.()) {
          navigation.goBack();
          return true;
        }

        return false;
      };

      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        onHardwareBackPress,
      );

      return () => subscription.remove();
    }, [navigation]),
  );

  useEffect(() => {
    let currentAppState = AppState.currentState;

    const syncIfActive = () => {
      if (currentAppState !== "active") return;
      if (Date.now() < liveSyncPausedUntilRef.current) return;

      syncMessaging().catch((error) => {
        liveSyncPausedUntilRef.current =
          Date.now() + LIVE_SYNC_FAILURE_BACKOFF_MS;
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
            const messageIds = new Set(
              (readReceipt.messageIds || []).map(String),
            );

            setMessages((current) =>
              current.map((item) =>
                messageIds.has(String(item._id))
                  ? {
                      ...item,
                      readAt: readReceipt.readAt,
                      deliveryStatus: "sent",
                    }
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
          notifyIncomingChat(nextMessage);
          const conversationId = nextMessage.conversation
            ? String(getEntityId(nextMessage.conversation))
            : String(getEntityId(nextMessage.sender)) === String(currentUserId)
              ? String(getEntityId(nextMessage.recipient))
              : String(getEntityId(nextMessage.sender));

          if (
            String(conversationId) ===
            String(selectedConversationRef.current?.id)
          ) {
            setMessages((current) => {
              if (current.some((item) => item._id === nextMessage._id)) {
                return current.map((item) =>
                  item._id === nextMessage._id
                    ? withSentStatus({ ...item, ...nextMessage })
                    : item,
                );
              }
              return [...current, nextMessage];
            });

            if (
              String(getEntityId(nextMessage.sender)) !== String(currentUserId)
            ) {
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
  }, [currentUserId, fetchConversations, fetchThread, getToken, notifyIncomingChat]);

  const conversationItems = useMemo(() => {
    const directFromConversations = conversations
      .filter(
        (conversation) => conversation.type !== "group" && conversation.user,
      )
      .map((conversation) => ({
        ...conversation,
        id: String(getEntityId(conversation.user)),
        title: getDisplayName(conversation.user),
        subtitle: conversation.user.jobTitle || "User",
      }));
    const groupFromConversations = conversations
      .filter(
        (conversation) => conversation.type === "group" && conversation.group,
      )
      .map((conversation) => ({
        ...conversation,
        id: String(getEntityId(conversation.group)),
        title: conversation.group.name || "Group chat",
        subtitle: `${conversation.group.members?.length || 0} members`,
      }));
    const knownDirectIds = new Set(
      directFromConversations.map((conversation) => String(conversation.id)),
    );
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
    const merged = [
      ...groupFromConversations,
      ...directFromConversations,
      ...remainingUsers,
    ]
      .filter(Boolean)
      .sort((first, second) => {
        const firstTime = new Date(
          first.lastMessage?.createdAt || first.group?.updatedAt || 0,
        ).getTime();
        const secondTime = new Date(
          second.lastMessage?.createdAt || second.group?.updatedAt || 0,
        ).getTime();
        return secondTime - firstTime;
      });
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
      (item) =>
        item.type === selectedConversation.type &&
        String(item.id) === String(selectedConversation.id),
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

  useEffect(() => {
    const targetConversationId = route?.params?.targetConversationId;
    const targetConversationType = route?.params?.targetConversationType;
    const refreshAt = route?.params?.refreshAt;
    if (!targetConversationId || !targetConversationType) return;

    const targetKey = `${targetConversationType}:${targetConversationId}:${refreshAt || ""}`;
    if (handledNotificationTargetRef.current === targetKey) return;

    const target = conversationItems.find(
      (item) =>
        String(item.type) === String(targetConversationType) &&
        String(item.id) === String(targetConversationId),
    );
    if (!target) return;

    handledNotificationTargetRef.current = targetKey;
    setSelectedConversation(target);
  }, [
    conversationItems,
    route?.params?.refreshAt,
    route?.params?.targetConversationId,
    route?.params?.targetConversationType,
  ]);

  const getConversationPreview = (item) => {
    const lastMessage = item?.lastMessage;
    if (!lastMessage?.body && !lastMessage?.attachments?.length) return null;
    const mine =
      String(getEntityId(lastMessage.sender)) === String(currentUserId);
    const groupSender = item.group?.members?.find(
      (member) =>
        String(getEntityId(member)) === String(getEntityId(lastMessage.sender)),
    );
    const senderName =
      item.type === "group" && !mine
        ? getDisplayName(
            groupSender ||
              usersById.get(String(getEntityId(lastMessage.sender))) ||
              {},
          )
        : item.title;

    return {
      text: `${mine ? "You" : senderName}: ${
        lastMessage.body || getAttachmentLabel(lastMessage.attachments)
      }`,
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
    if (!selectedConversation?.id || (!body && attachments.length === 0)) {
      return;
    }

    const isGroup = selectedConversation.type === "group";
    const tempId = `temp-${Date.now()}`;
    const pendingAttachments = attachments.map((file) => ({
      url: file.uri,
      name: file.name,
      mimeType: file.type,
      size: file.size,
      kind: file.type?.startsWith("image/") ? "image" : "file",
    }));
    const pendingMessage = {
      _id: tempId,
      sender: currentUserId,
      recipient: isGroup ? undefined : selectedConversation.id,
      conversation: isGroup ? selectedConversation.id : undefined,
      body,
      attachments: pendingAttachments,
      deliveryStatus: "sending",
    };

    setDraft("");
    setAttachments([]);
    setMessages((current) => [...current, pendingMessage]);

    try {
      setSending(true);
      const formData = new FormData();
      formData.append(isGroup ? "conversationId" : "recipientId", selectedConversation.id);
      formData.append("body", body);
      attachments.forEach((file) => {
        formData.append("attachments", {
          uri: file.uri,
          name: file.name,
          type: file.type || "application/octet-stream",
        });
      });

      const data = await authFetch(`${API_BASE}/api/messages`, {
        method: "POST",
        body: formData,
      });

      setMessages((current) =>
        current
          .filter((item) => item._id !== tempId)
          .some((item) => item._id === data.data._id)
          ? current
              .filter((item) => item._id !== tempId)
              .map((item) =>
                item._id === data.data._id
                  ? withSentStatus({ ...item, ...data.data })
                  : item,
              )
          : [
              ...current.filter((item) => item._id !== tempId),
              withSentStatus(data.data),
            ],
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

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      showToast("Enable photo permission to send images.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      allowsMultipleSelection: true,
    });

    if (result.canceled || !result.assets?.length) return;

    const selected = result.assets.map((asset, index) => ({
      uri: asset.uri,
      name: asset.fileName || `image-${Date.now()}-${index}.jpg`,
      type: asset.mimeType || "image/jpeg",
      size: asset.fileSize || 0,
    }));

    setAttachments((current) => [...current, ...selected].slice(0, 5));
  };

  const handlePickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      multiple: true,
      copyToCacheDirectory: true,
      type: [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "image/*",
        "text/*",
      ],
    });

    if (result.canceled || !result.assets?.length) return;

    const selected = result.assets.map((asset) => ({
      uri: asset.uri,
      name: asset.name || `attachment-${Date.now()}`,
      type: asset.mimeType || "application/octet-stream",
      size: asset.size || 0,
    }));

    setAttachments((current) => [...current, ...selected].slice(0, 5));
  };

  const removeAttachment = (index) => {
    setAttachments((current) =>
      current.filter((item, itemIndex) => itemIndex !== index),
    );
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
        setSelectedConversation({
          type: "group",
          id: String(group._id),
          title: group.name,
        });
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

  const renderAvatar = (item, size = 42) => (
    <MessagingAvatar item={item} size={size} getImageUrl={getImageUrl} />
  );

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
      <ConversationListView
        navigation={navigation}
        searchText={searchText}
        setSearchText={setSearchText}
        conversationItems={conversationItems}
        getConversationPreview={getConversationPreview}
        handleSelectConversation={handleSelectConversation}
        renderAvatar={renderAvatar}
        groupModalOpen={groupModalOpen}
        setGroupModalOpen={setGroupModalOpen}
        groupName={groupName}
        setGroupName={setGroupName}
        users={users}
        groupMemberIds={groupMemberIds}
        toggleGroupMember={toggleGroupMember}
        creatingGroup={creatingGroup}
        handleCreateGroup={handleCreateGroup}
        getDisplayName={getDisplayName}
      />
    );
  }

  return (
    <ChatView
      selectedConversationDetails={selectedConversationDetails}
      setSelectedConversation={setSelectedConversation}
      setMessages={setMessages}
      setMembersModalOpen={setMembersModalOpen}
      messages={messages}
      currentUserId={currentUserId}
      getEntityId={getEntityId}
      formatConversationTime={formatConversationTime}
      getMessageStatus={getMessageStatus}
      selectedConversation={selectedConversation}
      scrollRef={scrollRef}
      draft={draft}
      setDraft={setDraft}
      attachments={attachments}
      removeAttachment={removeAttachment}
      handlePickImage={handlePickImage}
      handlePickFile={handlePickFile}
      getAttachmentUrl={getAttachmentUrl}
      handleSend={handleSend}
      sending={sending}
      membersModalOpen={membersModalOpen}
      selectedGroupMembers={selectedGroupMembers}
      renderAvatar={renderAvatar}
      getDisplayName={getDisplayName}
    />
  );
}
