const compactText = (value = "") => String(value || "").trim();

export const getWebDeviceModel = () => {
  if (typeof navigator === "undefined") {
    return "Browser";
  }

  const ua = navigator.userAgent || "";

  const os = ua.includes("Windows")
    ? "Windows"
    : ua.includes("Mac OS")
      ? "macOS"
      : ua.includes("Android")
        ? "Android"
        : ua.includes("iPhone") || ua.includes("iPad")
          ? "iOS"
          : ua.includes("Linux")
            ? "Linux"
            : "Unknown";

  const browser = ua.includes("Edg/")
    ? "Microsoft Edge"
    : ua.includes("Chrome/")
      ? "Google Chrome"
      : ua.includes("Firefox/")
        ? "Mozilla Firefox"
        : ua.includes("Safari/")
          ? "Safari"
          : "Unknown";

  return compactText(`${os} ${browser}`);
};

export const getDeviceAuditHeaders = () => ({
  "x-device-platform": "WEB",
  "x-device-model": getWebDeviceModel(),
});
