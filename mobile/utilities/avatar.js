import DefaultAvatar from "../assets/images/default_avatar.jpg";
import { API_BASE } from "./API_BASE";

export const getUserImageUri = (image) => {
  if (!image || typeof image !== "string") return null;
  if (image.startsWith("http") || image.startsWith("file:")) return image;
  if (image.startsWith("/")) return `${API_BASE}${image}`;
  return `${API_BASE}/${image}`;
};

export const getUserAvatarSource = (image) => {
  const uri = getUserImageUri(image);
  return uri ? { uri } : DefaultAvatar;
};

export const getUserInitials = (firstName = "", lastName = "", fallback = "U") => {
  const initials = `${String(firstName).charAt(0)}${String(lastName).charAt(0)}`
    .toUpperCase()
    .trim();
  return initials || fallback;
};

export { DefaultAvatar };
