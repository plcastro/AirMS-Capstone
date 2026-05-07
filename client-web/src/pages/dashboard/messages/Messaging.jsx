import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  Avatar,
  Badge,
  Button,
  Card,
  Col,
  Empty,
  Input,
  List,
  Modal,
  Row,
  Select,
  Space,
  Typography,
  message as antdMessage,
} from "antd";
import { SearchOutlined, SendOutlined, TeamOutlined, UserOutlined } from "@ant-design/icons";
import { AuthContext } from "../../../context/AuthContext";
import { API_BASE } from "../../../utils/API_BASE";
import "./Messaging.css";

const { Text } = Typography;
const { TextArea } = Input;
const LIVE_SYNC_INTERVAL_MS = 1000;

const getStoredToken = () =>
  localStorage.getItem("token") || sessionStorage.getItem("token");

const getDisplayName = (user = {}) =>
  `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
  user.username ||
  "User";

const getImageUrl = (image) => {
  if (!image) return null;
  return String(image).startsWith("http") ? image : `${API_BASE}${image}`;
};

const getEntityId = (value) => value?._id || value?.id || value;

const getConversationTitle = (conversation) =>
  conversation.type === "group"
    ? conversation.group?.name || "Group chat"
    : getDisplayName(conversation.user);

const formatConversationTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();

  if (sameDay) {
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
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
  const baseUrl = API_BASE || window.location.origin;
  const url = new URL(baseUrl, window.location.origin);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.searchParams.set("token", token);
  return url.toString();
};

export default function Messaging() {
  const { user, getAuthHeader } = useContext(AuthContext);
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
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const selectedConversationRef = useRef(null);
  const threadBottomRef = useRef(null);

  const currentUserId = user?.id || user?._id;
  const selectedConversationId = selectedConversation?.id || null;

  const usersById = useMemo(() => {
    const byId = new Map();
    users.forEach((item) => byId.set(String(item._id), item));
    return byId;
  }, [users]);

  const authFetch = useCallback(
    async (url, options = {}) => {
      const headers = {
        ...(await getAuthHeader()),
        ...(options.headers || {}),
      };

      const response = await fetch(url, { ...options, headers });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "Request failed");
      }

      return data;
    },
    [getAuthHeader],
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
    const loadInitialData = async () => {
      try {
        setLoading(true);
        await Promise.all([fetchUsers(), fetchConversations()]);
      } catch (error) {
        antdMessage.error(error.message || "Failed to load messages");
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, [fetchConversations, fetchUsers]);

  useEffect(() => {
    if (selectedConversationId) {
      fetchThread(selectedConversationId).catch((error) => {
        antdMessage.error(error.message || "Failed to load thread");
      });
    }
  }, [fetchThread, selectedConversationId]);

  useEffect(() => {
    threadBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    selectedConversationRef.current = selectedConversation;
  }, [selectedConversation]);

  useEffect(() => {
    const syncIfVisible = () => {
      if (document.visibilityState === "hidden") return;
      syncMessaging().catch((error) => {
        console.error("Message live sync failed:", error);
      });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        syncIfVisible();
      }
    };

    const intervalId = window.setInterval(syncIfVisible, LIVE_SYNC_INTERVAL_MS);
    window.addEventListener("focus", syncIfVisible);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", syncIfVisible);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [syncMessaging]);

  useEffect(() => {
    const token = getStoredToken();
    if (!token || !currentUserId) return undefined;

    let closedByEffect = false;

    const connect = () => {
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
                console.error("Failed to refresh realtime messages:", error);
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
                console.error("Failed to refresh realtime thread:", error);
              });
            }
          }

          fetchConversations();
        } catch (error) {
          console.error("Message websocket parse error:", error);
        }
      };

      ws.onclose = () => {
        if (!closedByEffect) {
          reconnectTimeoutRef.current = window.setTimeout(connect, 1500);
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
        window.clearTimeout(reconnectTimeoutRef.current);
      }
      wsRef.current?.close();
    };
  }, [currentUserId, fetchConversations, fetchThread]);

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

  const selectedGroupMembers =
    selectedConversationDetails?.type === "group"
      ? selectedConversationDetails.group?.members || []
      : [];

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
        : getConversationTitle(item);

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
      antdMessage.error(error.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleCreateGroup = async () => {
    const name = groupName.trim();
    if (!name || groupMemberIds.length === 0) {
      antdMessage.warning("Add a group name and at least one member");
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
      await fetchConversations();
    } catch (error) {
      antdMessage.error(error.message || "Failed to create group chat");
    } finally {
      setCreatingGroup(false);
    }
  };

  return (
    <div style={{ padding: 16, height: "100%" }}>
      <Row gutter={[12, 12]} style={{ height: "100%" }}>
        <Col xs={24} md={8} lg={7} style={{ height: "100%" }}>
          <Card
            title="Messages"
            size="small"
            extra={
              <Button size="small" icon={<TeamOutlined />} onClick={() => setGroupModalOpen(true)}>
                New group
              </Button>
            }
            styles={{
              body: {
                flex: 1,
                minHeight: 0,
                padding: 0,
                display: "flex",
                flexDirection: "column",
              },
            }}
            style={{ height: "100%", display: "flex", flexDirection: "column" }}
          >
            <div style={{ padding: 12 }}>
              <Input
                allowClear
                prefix={<SearchOutlined />}
                placeholder="Search users or groups"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
              />
            </div>
            <List
              className="messages-user-list"
              loading={loading}
              dataSource={conversationItems}
              locale={{ emptyText: <Empty description="No conversations" /> }}
              renderItem={(item) => {
                const preview = getConversationPreview(item);
                const isSelected =
                  selectedConversation?.type === item.type &&
                  String(selectedConversation?.id) === String(item.id);

                return (
                  <List.Item
                    onClick={() => handleSelectConversation(item)}
                    style={{
                      cursor: "pointer",
                      padding: "10px 14px",
                      background: isSelected ? "#e9f4f1" : "transparent",
                    }}
                  >
                    <List.Item.Meta
                      avatar={
                        <Badge count={item.unreadCount || 0} size="small">
                          <Avatar
                            src={item.type === "direct" ? getImageUrl(item.user?.image) : null}
                            icon={item.type === "group" ? <TeamOutlined /> : <UserOutlined />}
                          />
                        </Badge>
                      }
                      title={<Text className="message-card-name" strong>{item.title}</Text>}
                      description={
                        <Space className="message-card-details" direction="vertical" size={0} style={{ width: "100%" }}>
                          <Text className="message-card-role" type="secondary" ellipsis>
                            {item.subtitle}
                          </Text>
                          {preview ? (
                            <div className="message-card-preview-row">
                              <Text className="message-card-preview" type="secondary" ellipsis>
                                {preview.text}
                              </Text>
                              <Text className="message-card-preview-time" type="secondary">
                                ({preview.time})
                              </Text>
                            </div>
                          ) : null}
                        </Space>
                      }
                    />
                  </List.Item>
                );
              }}
            />
          </Card>
        </Col>
        <Col xs={24} md={16} lg={17} style={{ height: "100%" }}>
          <Card
            title={
              selectedConversationDetails ? (
                <Space>
                  <Avatar
                    src={
                      selectedConversationDetails.type === "direct"
                        ? getImageUrl(selectedConversationDetails.user?.image)
                        : null
                    }
                    icon={selectedConversationDetails.type === "group" ? <TeamOutlined /> : <UserOutlined />}
                  />
                  <span>
                    <Text strong>{selectedConversationDetails.title}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {selectedConversationDetails.subtitle || "Conversation"}
                    </Text>
                  </span>
                </Space>
              ) : (
                "Select a conversation"
              )
            }
            extra={
              selectedConversationDetails?.type === "group" ? (
                <Button size="small" icon={<TeamOutlined />} onClick={() => setMembersModalOpen(true)}>
                  Members
                </Button>
              ) : null
            }
            size="small"
            style={{ height: "100%" }}
            styles={{
              body: {
                height: "calc(100% - 56px)",
                display: "flex",
                flexDirection: "column",
                padding: 0,
              },
            }}
          >
            {!selectedConversationId ? (
              <Empty description="Choose a conversation to start messaging" style={{ margin: "auto" }} />
            ) : (
              <>
                <div
                  style={{
                    flex: 1,
                    overflowY: "auto",
                    padding: 16,
                    background: "#f7f9f8",
                  }}
                >
                  {messages.map((item, index) => {
                    const mine = String(getEntityId(item.sender)) === String(currentUserId);
                    const isLatestMessage = index === messages.length - 1;
                    return (
                      <div
                        key={item._id}
                        className={`message-row ${isLatestMessage ? "message-row-latest" : ""}`}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: mine ? "flex-end" : "flex-start",
                          marginBottom: 8,
                        }}
                      >
                        <div
                          style={{
                            maxWidth: "72%",
                            padding: "9px 12px 7px",
                            borderRadius: 8,
                            background: mine ? "#26866f" : "#ffffff",
                            color: mine ? "#fff" : "#111",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                            overflowWrap: "anywhere",
                          }}
                        >
                          <div style={{ whiteSpace: "pre-wrap" }}>{item.body}</div>
                        </div>
                        <div
                          className="message-meta"
                          style={{
                            paddingRight: mine ? 2 : 0,
                            paddingLeft: mine ? 0 : 2,
                            textAlign: mine ? "right" : "left",
                          }}
                        >
                          {[
                            item.createdAt ? formatConversationTime(item.createdAt) : null,
                            mine ? getMessageStatus(item, selectedConversation?.type) : null,
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={threadBottomRef} />
                </div>
                <div style={{ padding: 12, borderTop: "1px solid #eee" }}>
                  <Space.Compact style={{ width: "100%" }}>
                    <TextArea
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      onPressEnter={(event) => {
                        if (!event.shiftKey) {
                          event.preventDefault();
                          handleSend();
                        }
                      }}
                      autoSize={{ minRows: 1, maxRows: 4 }}
                      placeholder="Write a message"
                      maxLength={1000}
                    />
                    <Button
                      type="primary"
                      icon={<SendOutlined />}
                      loading={sending}
                      onClick={handleSend}
                    />
                  </Space.Compact>
                </div>
              </>
            )}
          </Card>
        </Col>
      </Row>

      <Modal
        title="New group chat"
        open={groupModalOpen}
        onOk={handleCreateGroup}
        onCancel={() => setGroupModalOpen(false)}
        okText="Create"
        confirmLoading={creatingGroup}
      >
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          <Input
            value={groupName}
            onChange={(event) => setGroupName(event.target.value)}
            placeholder="Group name"
            maxLength={80}
          />
          <Select
            mode="multiple"
            value={groupMemberIds}
            onChange={setGroupMemberIds}
            placeholder="Add members"
            optionFilterProp="label"
            style={{ width: "100%" }}
            options={users.map((item) => ({
              value: String(item._id),
              label: getDisplayName(item),
            }))}
          />
        </Space>
      </Modal>

      <Modal
        title={`${selectedConversationDetails?.title || "Group chat"} members`}
        open={membersModalOpen}
        onCancel={() => setMembersModalOpen(false)}
        footer={null}
      >
        <List
          dataSource={selectedGroupMembers}
          locale={{ emptyText: <Empty description="No members" /> }}
          renderItem={(member) => (
            <List.Item>
              <List.Item.Meta
                avatar={<Avatar src={getImageUrl(member.image)} icon={<UserOutlined />} />}
                title={<Text strong>{getDisplayName(member)}</Text>}
                description={member.jobTitle || "User"}
              />
            </List.Item>
          )}
        />
      </Modal>
    </div>
  );
}
