import { Alert, PermissionsAndroid, Platform } from "react-native";

const askUserConsent = ({
  title = "Allow File Download?",
  message = "AirMS needs your permission to prepare this file in app storage and open your device's save or share options.",
} = {}) =>
  new Promise((resolve) => {
    Alert.alert(title, message, [
      {
        text: "Cancel",
        style: "cancel",
        onPress: () => resolve(false),
      },
      {
        text: "Allow",
        onPress: () => resolve(true),
      },
    ]);
  });

export const requestStoragePermissionForDownload = async (options = {}) => {
  if (Platform.OS === "web") {
    return true;
  }

  const consentGranted = await askUserConsent(options);
  if (!consentGranted) {
    return false;
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
