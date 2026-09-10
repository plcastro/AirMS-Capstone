const fs = require("node:fs");
const path = require("node:path");

const IOS_GOOGLE_SERVICES_FILE = "GoogleService-Info.plist";

const getIosGoogleServicesFile = (config) => {
  if (process.env.GOOGLE_SERVICE_INFO_PLIST) {
    return process.env.GOOGLE_SERVICE_INFO_PLIST;
  }

  if (config.ios?.googleServicesFile) {
    return config.ios.googleServicesFile;
  }

  const legacyBase64Value = String(
    process.env.GOOGLE_SERVICE_INFO_PLIST_BASE64 || "",
  ).trim();
  if (legacyBase64Value && !legacyBase64Value.startsWith("@")) {
    return `./${IOS_GOOGLE_SERVICES_FILE}`;
  }

  const localFilePath = path.join(__dirname, IOS_GOOGLE_SERVICES_FILE);
  return fs.existsSync(localFilePath) ? `./${IOS_GOOGLE_SERVICES_FILE}` : null;
};

const getApnsEnvironment = () => {
  const buildProfile = String(
    process.env.EAS_BUILD_PROFILE || process.env.NODE_ENV || "development",
  ).toLowerCase();

  return ["preview", "production"].includes(buildProfile)
    ? "production"
    : "development";
};

module.exports = ({ config }) => {
  const iosGoogleServicesFile = getIosGoogleServicesFile(config);
  const backgroundModes = config.ios?.infoPlist?.UIBackgroundModes || [];

  return {
    ...config,
    android: {
      ...config.android,
      googleServicesFile:
        process.env.GOOGLE_SERVICES_JSON ||
        config.android?.googleServicesFile ||
        "./google-services.json",
    },
    ios: {
      ...config.ios,
      ...(iosGoogleServicesFile
        ? { googleServicesFile: iosGoogleServicesFile }
        : {}),
      entitlements: {
        ...config.ios?.entitlements,
        "aps-environment": getApnsEnvironment(),
      },
      infoPlist: {
        ...config.ios?.infoPlist,
        UIBackgroundModes: [
          ...new Set([...backgroundModes, "fetch", "remote-notification"]),
        ],
      },
    },
  };
};
