import React, { useContext, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
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

export default function NotificationBell({ navigation }) {
  const [visible, setVisible] = useState(false);
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
    await fetchNotifications();
    setVisible(true);
  };

  const handleNotificationPress = async (notification) => {
    setVisible(false);
    await openNotificationTarget(notification);
  };

  return (
    <>
      <TouchableOpacity
        onPress={openNotifications}
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
              right: 2,
              minWidth: 18,
              height: 18,
              paddingHorizontal: 4,
              borderRadius: 9,
              backgroundColor: "#26866F",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text
              style={{ color: COLORS.white, fontSize: 14, fontWeight: "600" }}
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Text>
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
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "600",
                    color: COLORS.black,
                  }}
                >
                  Notifications
                </Text>
                <View
                  style={{
                    backgroundColor: "#E9F4F1",
                    paddingHorizontal: 10,
                    paddingVertical: 3,
                    borderRadius: 999,
                  }}
                >
                  <Text
                    style={{
                      color: "#26866F",
                      fontSize: 14,
                      fontWeight: "600",
                    }}
                  >
                    {unreadCount} Unread
                  </Text>
                </View>
              </View>

              <TouchableOpacity onPress={() => setVisible(false)}>
                <MaterialCommunityIcons name="close" size={22} color="#666" />
              </TouchableOpacity>
            </View>

            {loadingNotifications ? (
              <View style={{ paddingVertical: 40, alignItems: "center" }}>
                <ActivityIndicator size="small" color="#26866F" />
                <Text style={{ marginTop: 10, color: "#666" }}>
                  Loading notifications...
                </Text>
              </View>
            ) : sortedNotifications.length === 0 ? (
              <View style={{ paddingVertical: 36, alignItems: "center" }}>
                <MaterialCommunityIcons
                  name="bell-off-outline"
                  size={32}
                  color="#A0A0A0"
                />
                <Text style={{ marginTop: 10, color: "#666", fontSize: 12 }}>
                  No notifications
                </Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {sortedNotifications.map((notification) => (
                  <TouchableOpacity
                    key={notification._id}
                    activeOpacity={0.85}
                    onPress={() => handleNotificationPress(notification)}
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
                        <Text
                          style={{
                            color: COLORS.black,
                            fontSize: 12,
                            fontWeight: notification.read ? "600" : "700",
                            flexShrink: 1,
                          }}
                        >
                          {notification.title}
                        </Text>
                        {!notification.read && (
                          <View
                            style={{
                              backgroundColor: "#52C41A",
                              borderRadius: 999,
                              paddingHorizontal: 8,
                              paddingVertical: 2,
                            }}
                          >
                            <Text
                              style={{
                                color: COLORS.white,
                                fontSize: 12,
                                fontWeight: "700",
                              }}
                            >
                              New
                            </Text>
                          </View>
                        )}
                      </View>

                      <Text
                        style={{
                          marginTop: 4,
                          color: "#666",
                          fontSize: 12,
                          lineHeight: 18,
                        }}
                      >
                        {notification.description}
                      </Text>

                      <Text
                        style={{ marginTop: 6, color: "#999", fontSize: 12 }}
                      >
                        {formatTimeAgo(notification.createdAt)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
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
              <TouchableOpacity onPress={markAllAsRead}>
                <Text
                  style={{ color: "#26866F", fontSize: 14, fontWeight: "600" }}
                >
                  Mark all as read
                </Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={fetchNotifications}>
                <Text
                  style={{ color: "#D9534F", fontSize: 14, fontWeight: "600" }}
                >
                  Refresh
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
