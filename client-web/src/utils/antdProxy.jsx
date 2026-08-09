import React, { useState } from "react";
import AntdButton from "antd/es/button";

const MIN_LOADING_MS = 250;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isThenable = (value) =>
  value && typeof value === "object" && typeof value.then === "function";

const AutoLoadingButton = React.forwardRef(function AutoLoadingButton(
  { disabled = false, loading = false, onClick, ...props },
  ref,
) {
  const [autoLoading, setAutoLoading] = useState(false);
  const isLoading = Boolean(loading) || autoLoading;

  const handleClick = async (event) => {
    if (disabled || isLoading) {
      event?.preventDefault?.();
      return;
    }

    const startedAt = Date.now();
    setAutoLoading(true);

    try {
      const result = onClick?.(event);
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
    <AntdButton
      {...props}
      ref={ref}
      disabled={disabled || isLoading}
      loading={loading || autoLoading}
      onClick={handleClick}
    />
  );
});

export * from "antd/es";
export const Button = AutoLoadingButton;
