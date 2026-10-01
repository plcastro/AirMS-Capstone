import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Portal, Snackbar } from "react-native-paper";
import { getRecentToast, subscribeToToast } from "../../utilities/toast";

const TOAST_DURATION_MS = 2000;

export default function ToastHost({ embedded = false }) {
  const nextMessageId = useRef(0);
  const [messages, setMessages] = useState(() => {
    // Inside a modal, pick up a toast that appeared just before it opened.
    const recent = embedded ? getRecentToast() : null;
    if (!recent) return [];
    nextMessageId.current += 1;
    return [{ id: nextMessageId.current, text: recent }];
  });

  useEffect(
    () =>
      subscribeToToast((message) => {
        nextMessageId.current += 1;
        const queuedMessage = { id: nextMessageId.current, text: message };

        setMessages((currentMessages) => [
          ...currentMessages,
          queuedMessage,
        ]);
      }),
    [],
  );

  const dismissCurrentMessage = () => {
    setMessages((currentMessages) => currentMessages.slice(1));
  };

  const currentMessage = messages[0];

  const toastContent = (
    <View pointerEvents="box-none" style={styles.toastLayer}>
      <Snackbar
        key={currentMessage?.id || "empty"}
        visible={Boolean(currentMessage)}
        duration={TOAST_DURATION_MS}
        onDismiss={dismissCurrentMessage}
      >
        {currentMessage?.text || ""}
      </Snackbar>
    </View>
  );

  if (embedded) {
    return toastContent;
  }

  return <Portal>{toastContent}</Portal>;
}

const styles = StyleSheet.create({
  toastLayer: {
    ...StyleSheet.absoluteFillObject,
    elevation: 1000,
    zIndex: 1000,
  },
});
