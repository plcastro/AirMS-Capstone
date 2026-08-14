import React, { useState } from "react";
import { Button as PaperButton } from "react-native-paper";

const MIN_LOADING_MS = 250;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isThenable = (value) =>
  value && typeof value === "object" && typeof value.then === "function";

export default function AsyncPaperButton({
  disabled = false,
  loading = false,
  onPress,
  ...props
}) {
  const [autoLoading, setAutoLoading] = useState(false);
  const isLoading = Boolean(loading) || autoLoading;

  const handlePress = async (...args) => {
    if (disabled || isLoading) return;

    const startedAt = Date.now();
    setAutoLoading(true);

    try {
      const result = onPress?.(...args);
      if (isThenable(result)) {
        await result;
      }
    } finally {
      const elapsed = Date.now() - startedAt;
      if (elapsed < MIN_LOADING_MS) {
        await sleep(MIN_LOADING_MS - elapsed);
      }
      setAutoLoading(false);
    }
  };

  return (
    <PaperButton
      {...props}
      disabled={disabled || isLoading}
      loading={loading || autoLoading}
      onPress={handlePress}
    />
  );
}
