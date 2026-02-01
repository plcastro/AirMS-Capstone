import React, { useEffect } from "react";
import { Alert } from "react-native";

export default function AlertComp({ title, message, onPressFunction }) {
  useEffect(() => {
    if (title && message) {
      Alert.alert(
        title,
        message,
        [
          {
            text: "OK",
            onPress: () => onPressFunction && onPressFunction(),
          },
        ],
        { cancelable: true },
      );
    }
  }, [title, message]);

  return null; // nothing rendered on screen
}
