const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.join(__dirname, "..");
const platform = String(process.env.EAS_BUILD_PLATFORM || "").toLowerCase();

const platformConfig = {
  android: {
    fileEnvironmentKey: "GOOGLE_SERVICES_JSON",
    base64EnvironmentKey: "GOOGLE_SERVICES_JSON_BASE64",
    outputFileName: "google-services.json",
  },
  ios: {
    fileEnvironmentKey: "GOOGLE_SERVICE_INFO_PLIST",
    base64EnvironmentKey: "GOOGLE_SERVICE_INFO_PLIST_BASE64",
    outputFileName: "GoogleService-Info.plist",
  },
};

const fail = (message) => {
  throw new Error(`[Firebase configuration] ${message}`);
};

const validateAndroidConfig = (fileBuffer, sourceLabel) => {
  let parsedConfig;

  try {
    parsedConfig = JSON.parse(fileBuffer.toString("utf8"));
  } catch {
    fail(`${sourceLabel} is not valid JSON.`);
  }

  const packageNames = (parsedConfig.client || [])
    .map((client) => client?.client_info?.android_client_info?.package_name)
    .filter(Boolean);

  if (!packageNames.includes("com.arckexe.airms")) {
    fail(
      `${sourceLabel} does not contain the Android package com.arckexe.airms.`,
    );
  }
};

const validateIosConfig = (fileBuffer, sourceLabel) => {
  const plist = fileBuffer.toString("utf8");

  if (!plist.includes("<plist") || !plist.includes("com.arckexe.airms")) {
    fail(
      `${sourceLabel} is not an XML Firebase plist for bundle ID com.arckexe.airms.`,
    );
  }
};

const validateConfig = (targetPlatform, fileBuffer, sourceLabel) => {
  if (!fileBuffer.length) {
    fail(`${sourceLabel} is empty.`);
  }

  if (targetPlatform === "android") {
    validateAndroidConfig(fileBuffer, sourceLabel);
    return;
  }

  validateIosConfig(fileBuffer, sourceLabel);
};

const restorePlatformConfig = (targetPlatform) => {
  const config = platformConfig[targetPlatform];
  const outputPath = path.join(projectRoot, config.outputFileName);
  const fileVariablePath = String(
    process.env[config.fileEnvironmentKey] || "",
  ).trim();

  if (fileVariablePath) {
    if (!fs.existsSync(fileVariablePath)) {
      fail(
        `${config.fileEnvironmentKey} must be an EAS file variable that points to an existing file.`,
      );
    }

    validateConfig(
      targetPlatform,
      fs.readFileSync(fileVariablePath),
      config.fileEnvironmentKey,
    );
    console.log(
      `${config.outputFileName} supplied by ${config.fileEnvironmentKey}.`,
    );
    return;
  }

  if (fs.existsSync(outputPath)) {
    validateConfig(
      targetPlatform,
      fs.readFileSync(outputPath),
      config.outputFileName,
    );
    console.log(`${config.outputFileName} is already available locally.`);
    return;
  }

  const base64Value = String(
    process.env[config.base64EnvironmentKey] || "",
  ).trim();

  if (base64Value && !base64Value.startsWith("@")) {
    const fileBuffer = Buffer.from(base64Value, "base64");
    validateConfig(targetPlatform, fileBuffer, config.base64EnvironmentKey);
    fs.writeFileSync(outputPath, fileBuffer);
    console.log(
      `${config.outputFileName} restored from ${config.base64EnvironmentKey}.`,
    );
    return;
  }

  fail(
    `Missing ${config.fileEnvironmentKey}. Add the Firebase ${config.outputFileName} as an EAS file environment variable. ` +
      `The legacy ${config.base64EnvironmentKey} value remains supported as a fallback.`,
  );
};

if (platformConfig[platform]) {
  restorePlatformConfig(platform);
} else {
  console.log(
    "Firebase configuration restore skipped outside an Android or iOS EAS build.",
  );
}
