export const formatActivityLogPlatform = (devicePlatform, platform) => {
  const normalizedDevice = String(devicePlatform || "")
    .trim()
    .toUpperCase();

  if (normalizedDevice === "MOBILE_IOS") return "IOS";
  if (normalizedDevice === "MOBILE_ANDROID") return "ANDROID";
  if (normalizedDevice) return normalizedDevice.replace(/_/g, " ");

  return String(platform || "")
    .trim()
    .toUpperCase();
};
