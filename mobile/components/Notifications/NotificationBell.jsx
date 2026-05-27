import React, { useContext, useMemo, useState } from "react";
import AppText from "../common/AppText";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  TouchableOpacity,
  View
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { NotificationContext } from "../../Context/NotificationContext";
import { COLORS } from "../../stylesheets/colors";

const formatTimeAgo = (dateValue) => {
  const parsedDate = new Date(dateValue);

  if (Number.isNaN(parsedDate.getTime())) {
    return "";
  }

  const diffInSeconds = Math.floor((Date.now() - parsedDate.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return "Just now";
  }

  if (diffInSeconds < 3600) {
    return `${Math.floor(diffInSeconds / 60)} min ago`;
  }

  if (diffInSeconds < 86400) {
    return `${Math.floor(diffInSeconds / 3600)} hr ago`;
  }

  return parsedDate.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const getDisplayNotification = (notification = {}) => {
  const title = String(notification.title || "");
  const description = String(notification.description || "");
  const isMessage = String(notification.module || "") === "messages";

  if (!isMessage) {
    return { title, description };
  }

  const separatorIndex = title.indexOf(": ");
  if (separatorIndex > 0) {
    const sender = title.slice(0, separatorIndex).trim();
    const titleMessage = title.slice(separatorIndex + 2).trim();

    if (sender && titleMessage && titleMessage === description.trim()) {
      return { title: sender, description };
    }
  }

  return { title, description };
};

export default function NotificationBell({ navigation }) {
  const [visible, setVisible] = useState(false);
  const [actionLoadingKey, setActionLoadingKey] = useState("");
  const {
    notifications,
    unreadCount,
    loadingNotifications,
    fetchNotifications,
    markAllAsRead,
    openNotificationTarget,
  } = useContext(NotificationContext);

  const sortedNotifications = useMemo(
    () =>
      [...notifications].sort(
        (left, right) =>
          new Date(right.createdAt).getTime() -
          new Date(left.createdAt).getTime(),
      ),
    [notifications],
  );

  const openNotifications = async () => {
    setVisible(true);
  };

  const runWithLoading = async (key, action) => {
    if (actionLoadingKey) return;
    setActionLoadingKey(key);
    try {
      await action();
    } finally {
      setActionLoadingKey("");
    }
  };

  const handleNotificationPress = async (notification) => {
    setVisible(false);
    await openNotificationTarget(notification);
  };

  return (
    <>
      <TouchableOpacity
        onPress={() => runWithLoading("open", () => openNotifications())}
        activeOpacity={0.8}
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          marginRight: 10,
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
      >
        <MaterialCommunityIcons
          name="bell-outline"
          size={24}
          color={COLORS.black}
        />

        {unreadCount > 0 && (
          <View
            style={{
              position: "absolute",
              top: 4,
              right: 4,
              minWidth: 16,
              height: 16,
              borderRadius: 8,
              paddingHorizontal: 4,
              backgroundColor: "#d31e1e",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <AppText
              style={{
                color: COLORS.white,
                fontSize: 10,
                fontWeight: "700",
                includeFontPadding: false,
                textAlignVertical: "center",
              }}
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </AppText>
          </View>
        )}
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <Pressable
          onPress={() => setVisible(false)}
          style={{
            flex: 1,
            backgroundColor: "rgba(0, 0, 0, 0.35)",
            justifyContent: "flex-start",
            paddingTop: 92,
            paddingHorizontal: 14,
          }}
        >
          <Pressable
            style={{
              alignSelf: "flex-end",
              width: "100%",
              maxWidth: 420,
              maxHeight: "78%",
              backgroundColor: COLORS.white,
              borderRadius: 18,
              paddingTop: 16,
              paddingHorizontal: 14,
              paddingBottom: 10,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 14,
              }}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <MaterialCommunityIcons
                  name="bell-outline"
                  size={20}
                  color={COLORS.black}
                />
                <AppText
                  style={{
                    fontSize: 14,
                    fontWeight: "600",
                    color: COLORS.black,
                  }}
                >
                  Notifications
                </AppText>
                <View
                  style={{
                    backgroundColor: "#E9F4F1",
                    paddingHorizontal: 10,
                    paddingVertical: 3,
                    borderRadius: 999,
                  }}
                >
                  <AppText
                    style={{
                      color: "#26866F",
                      fontSize: 14,
                      fontWeight: "600",
                    }}
                  >
                    {unreadCount} Unread
                  </AppText>
                </View>
              </View>

              <TouchableOpacity onPress={() => setVisible(false)} disabled={Boolean(actionLoadingKey)}>
                <MaterialCommunityIcons name="close" size={22} color="#666" />
              </TouchableOpacity>
            </View>

            {loadingNotifications && sortedNotifications.length === 0 ? (
              <View style={{ paddingVertical: 40, alignItems: "center" }}>
                <ActivityIndicator size="small" color="#26866F" />
                <AppText style={{ marginTop: 10, color: "#666" }}>
                  Loading notifications...
                </AppText>
              </View>
            ) : sortedNotifications.length === 0 ? (
              <View style={{ paddingVertical: 36, alignItems: "center" }}>
                <MaterialCommunityIcons
                  name="bell-off-outline"
                  size={32}
                  color="#A0A0A0"
                />
                <AppText style={{ marginTop: 10, color: "#666", fontSize: 12 }}>
                  No notifications
                </AppText>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {sortedNotifications.map((notification) => {
                  const displayNotification = getDisplayNotification(notification);

                  return (
                    <TouchableOpacity
                      key={notification._id}
                      activeOpacity={0.85}
                      onPress={() =>
                        runWithLoading("open-notification", () =>
                          handleNotificationPress(notification),
                        )
                      }
                      disabled={Boolean(actionLoadingKey)}
                      style={{
                        flexDirection: "row",
                        alignItems: "flex-start",
                        padding: 12,
                        borderRadius: 12,
                        backgroundColor: notification.read
                          ? COLORS.white
                          : "#F6FFED",
                        borderWidth: 1,
                        borderColor: notification.read ? "#E4E4E4" : "#CDECCB",
                        marginBottom: 10,
                      }}
                    >
                      <View
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 20,
                          backgroundColor: notification.read
                            ? "#D9D9D9"
                            : "#52C41A",
                          alignItems: "center",
                          justifyContent: "center",
                          marginRight: 12,
                        }}
                      >
                        <MaterialCommunityIcons
                          name="bell-outline"
                          size={20}
                          color={COLORS.white}
                        />
                      </View>

                      <View style={{ flex: 1 }}>
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            flexWrap: "wrap",
                            gap: 6,
                          }}
                        >
                          <AppText
                            style={{
                              color: COLORS.black,
                              fontSize: 12,
                              fontWeight: notification.read ? "600" : "700",
                              flexShrink: 1,
                            }}
                          >
                            {displayNotification.title}
                          </AppText>
                          {!notification.read && (
                            <View
                              style={{
                                backgroundColor: "#52C41A",
                                borderRadius: 999,
                                paddingHorizontal: 8,
                                paddingVertical: 2,
                              }}
                            >
                              <AppText
                                style={{
                                  color: COLORS.white,
                                  fontSize: 12,
                                  fontWeight: "700",
                                }}
                              >
                                New
                              </AppText>
                            </View>
                          )}
                        </View>

                        <AppText
                          style={{
                            marginTop: 4,
                            color: "#666",
                            fontSize: 12,
                            lineHeight: 18,
                          }}
                        >
                          {displayNotification.description}
                        </AppText>

                        <AppText
                          style={{ marginTop: 6, color: "#999", fontSize: 12 }}
                        >
                          {formatTimeAgo(notification.createdAt)}
                        </AppText>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            <View
              style={{
                marginTop: 14,
                paddingTop: 12,
                borderTopWidth: 1,
                borderTopColor: "#EFEFEF",
                flexDirection: "row",
                justifyContent: "space-between",
              }}
            >
              <TouchableOpacity
                onPress={() =>
                  runWithLoading("mark-all", () => markAllAsRead())
                }
                disabled={Boolean(actionLoadingKey)}
              >
                <AppText
                  style={{ color: "#26866F", fontSize: 14, fontWeight: "600" }}
                >
                  {actionLoadingKey === "mark-all" ? "Processing..." : "Mark all as read"}
                </AppText>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() =>
                  runWithLoading("refresh", () => fetchNotifications({ force: true }))
                }
                disabled={Boolean(actionLoadingKey)}
              >
                <AppText
                  style={{ color: "#D9534F", fontSize: 14, fontWeight: "600" }}
                >
                  {actionLoadingKey === "refresh" ? "Refreshing..." : "Refresh"}
                </AppText>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
