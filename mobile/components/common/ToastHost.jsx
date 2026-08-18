import React, { useEffect, useRef, useState } from "react";
import { Portal, Snackbar } from "react-native-paper";
import { subscribeToToast } from "../../utilities/toast";

const TOAST_DURATION_MS = 3000;

export default function ToastHost() {
  const [messages, setMessages] = useState([]);
  const nextMessageId = useRef(0);

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

  return (
    <Portal>
      <Snackbar
        key={currentMessage?.id || "empty"}
        visible={Boolean(currentMessage)}
        duration={TOAST_DURATION_MS}
        onDismiss={dismissCurrentMessage}
      >
        {currentMessage?.text || ""}
      </Snackbar>
    </Portal>
  );
}
