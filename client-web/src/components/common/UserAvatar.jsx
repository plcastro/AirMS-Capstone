import React from "react";
import { Avatar } from "antd";
import { API_BASE } from "../../utils/API_BASE";

const avatarFallbackStyle = {
  backgroundColor: "#E9F4F1",
  color: "#26866F",
  fontWeight: 700,
  userSelect: "none",
};

const getUserImageSrc = (image) => {
  if (!image) return "";
  const imageValue = String(image);
  if (
    imageValue.startsWith("http") ||
    imageValue.startsWith("blob:") ||
    imageValue.startsWith("data:")
  ) {
    return imageValue;
  }
  return imageValue.startsWith("/") ? `${API_BASE}${imageValue}` : imageValue;
};

const getUserInitials = ({
  firstName = "",
  lastName = "",
  name = "",
  fallback = "U",
} = {}) => {
  const resolvedFirstName = String(firstName || "").trim();
  const resolvedLastName = String(lastName || "").trim();

  if (resolvedFirstName || resolvedLastName) {
    const initials =
      `${resolvedFirstName.charAt(0)}${resolvedLastName.charAt(0)}`
        .toUpperCase()
        .trim();
    return initials || fallback;
  }

  const words = String(name).trim().split(/\s+/).filter(Boolean);
  const first = words[0]?.charAt(0) || "";
  const last = words.length > 1 ? words[words.length - 1]?.charAt(0) || "" : "";
  return `${first}${last}`.toUpperCase() || fallback;
};

export default function UserAvatar({
  image,
  firstName,
  lastName,
  name,
  fallback = "U",
  size = 40,
  style,
  ...avatarProps
}) {
  const imageSrc = getUserImageSrc(image) || undefined;
  const altText =
    avatarProps.alt ||
    [firstName, lastName].filter(Boolean).join(" ").trim() ||
    name ||
    "User avatar";

  return (
    <Avatar
      alt={altText}
      size={size}
      src={imageSrc}
      style={{ ...avatarFallbackStyle, ...style }}
      {...avatarProps}
    >
      {getUserInitials({ firstName, lastName, name, fallback })}
    </Avatar>
  );
}
