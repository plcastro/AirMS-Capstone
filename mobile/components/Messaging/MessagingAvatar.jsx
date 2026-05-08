import React from "react";
import { Image, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { COLORS } from "../../stylesheets/colors";

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
        source={{ uri: imageUrl }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    );
  }

  return (
    <MaterialCommunityIcons
      name="account-circle"
      size={size}
      color={COLORS.primaryLight}
    />
  );
}
