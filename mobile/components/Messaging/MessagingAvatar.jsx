import React from "react";
import { Image, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { COLORS } from "../../stylesheets/colors";
import { getUserAvatarSource, getUserInitials } from "../../utilities/avatar";

export default function MessagingAvatar({ item, size = 42, getImageUrl }) {
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
        <MaterialCommunityIcons
          name="account-group"
          size={Math.round(size * 0.58)}
          color={COLORS.primaryLight}
        />
      </View>
    );
  }

  const imageUrl = getImageUrl(item?.user?.image || item?.image);
  if (imageUrl) {
    return (
      <Image
        source={getUserAvatarSource(imageUrl)}
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    );
  }

  const fallbackUser = item?.user || item || {};
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
      <Text
        style={{
          color: COLORS.primaryLight,
          fontWeight: "700",
          fontSize: Math.max(12, Math.round(size * 0.32)),
        }}
      >
        {getUserInitials(fallbackUser?.firstName, fallbackUser?.lastName)}
      </Text>
    </View>
  );
}
