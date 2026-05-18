import { Alert } from "react-native";

export const confirmAction = ({
  title = "Confirm Action",
  message = "Are you sure you want to continue?",
  confirmText = "Confirm",
  cancelText = "Cancel",
  destructive = false,
} = {}) =>
  new Promise((resolve) => {
    Alert.alert(title, message, [
      {
        text: cancelText,
        style: "cancel",
        onPress: () => resolve(false),
      },
      {
        text: confirmText,
        style: destructive ? "destructive" : "default",
        onPress: () => resolve(true),
      },
    ]);
  });

