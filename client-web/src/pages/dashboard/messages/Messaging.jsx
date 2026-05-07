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
  Row,
  Space,
  Typography,
  message as antdMessage,
} from "antd";
import { SearchOutlined, SendOutlined, UserOutlined } from "@ant-design/icons";
import { AuthContext } from "../../../context/AuthContext";
import { API_BASE } from "../../../utils/API_BASE";
import "./Messaging.css";

const { Text } = Typography;
const { TextArea } = Input;

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
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const selectedUserIdRef = useRef(null);
  const threadBottomRef = useRef(null);

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
    if (selectedUserId) {
      fetchThread(selectedUserId).catch((error) => {
        antdMessage.error(error.message || "Failed to load thread");
      });
    }
  }, [fetchThread, selectedUserId]);

  useEffect(() => {
    threadBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    selectedUserIdRef.current = selectedUserId;
  }, [selectedUserId]);

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
            if (selectedUserIdRef.current) {
              fetchThread(selectedUserIdRef.current).catch((error) => {
                console.error("Failed to refresh realtime messages:", error);
              });
            }
            return;
          }

          if (payload.event !== "chat:message") return;

          const nextMessage = withSentStatus(payload.data);
          const otherUserId =
            String(getEntityId(nextMessage.sender)) === String(currentUserId)
              ? String(getEntityId(nextMessage.recipient))
              : String(getEntityId(nextMessage.sender));

          if (String(otherUserId) === String(selectedUserIdRef.current)) {
            setMessages((current) => {
              if (current.some((item) => item._id === nextMessage._id)) {
                return current.map((item) =>
                  item._id === nextMessage._id ? withSentStatus({ ...item, ...nextMessage }) : item,
                );
              }
              return [...current, nextMessage];
            });

            if (String(getEntityId(nextMessage.sender)) !== String(currentUserId)) {
              fetchThread(otherUserId).catch((error) => {
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
      antdMessage.error(error.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

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

  return (
    <div style={{ padding: 16, height: "100%" }}>
      <Row gutter={[12, 12]} style={{ height: "100%" }}>
        <Col xs={24} md={8} lg={7} style={{ height: "100%" }}>
          <Card
            title="Messages"
            size="small"
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
                placeholder="Search users"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
              />
            </div>
            <List
              className="messages-user-list"
              loading={loading}
              dataSource={conversationUsers}
              locale={{ emptyText: <Empty description="No conversations" /> }}
              renderItem={(item) => {
                const preview = getConversationPreview(item);

                return (
                  <List.Item
                    onClick={() => setSelectedUserId(item._id)}
                    style={{
                      cursor: "pointer",
                      padding: "10px 14px",
                      background:
                        String(selectedUserId) === String(item._id)
                          ? "#e9f4f1"
                          : "transparent",
                    }}
                  >
                    <List.Item.Meta
                      avatar={
                        <Badge count={getUnreadCount(item._id)} size="small">
                          <Avatar src={getImageUrl(item.image)} icon={<UserOutlined />} />
                        </Badge>
                      }
                      title={<Text className="message-card-name" strong>{getDisplayName(item)}</Text>}
                      description={
                        <Space className="message-card-details" direction="vertical" size={0} style={{ width: "100%" }}>
                          <Text className="message-card-role" type="secondary" ellipsis>
                            {item.jobTitle || "User"}
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
              selectedUser ? (
                <Space direction="vertical" size={0}>
                  <Space>
                    <Avatar
                      src={getImageUrl(selectedUser.image)}
                      icon={<UserOutlined />}
                    />
                    <span>
                      <Text strong>{getDisplayName(selectedUser)}</Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {selectedUser.jobTitle || "User"}
                      </Text>
                    </span>
                  </Space>
                </Space>
              ) : (
                "Select a conversation"
              )
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
            {!selectedUserId ? (
              <Empty description="Choose a user to start messaging" style={{ margin: "auto" }} />
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
                          {formatConversationTime(item.createdAt)}
                          {mine ? ` ${getMessageStatus(item)}` : ""}
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
    </div>
  );
}
