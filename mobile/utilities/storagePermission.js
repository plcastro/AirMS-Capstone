import { PermissionsAndroid, Platform } from "react-native";

export const requestStoragePermissionForDownload = async () => {
  if (Platform.OS === "web") {
    return true;
  }

  if (Platform.OS !== "android") {
    return true;
  }

  const androidVersion = Number(Platform.Version) || 0;
  if (androidVersion > 32) {
    return true;
  }

  const permission = PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE;
  const alreadyGranted = await PermissionsAndroid.check(permission);
  if (alreadyGranted) {
    return true;
  }

  const result = await PermissionsAndroid.request(permission, {
    title: "Storage Permission",
    message: "AirMS needs storage access to save downloaded files.",
    buttonPositive: "Allow",
    buttonNegative: "Deny",
  });

  return result === PermissionsAndroid.RESULTS.GRANTED;
};
