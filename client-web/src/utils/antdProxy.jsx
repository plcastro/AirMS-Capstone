import React, { useState } from "react";
import AntdButton from "antd/es/button";
import AntdModal from "antd/es/modal";

const MIN_LOADING_MS = 250;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isThenable = (value) =>
  value && typeof value === "object" && typeof value.then === "function";

const withMinimumLoadingTime = async (startedAt) => {
  const elapsed = Date.now() - startedAt;
  if (elapsed < MIN_LOADING_MS) {
    await sleep(MIN_LOADING_MS - elapsed);
  }
};

const wrapConfirmConfig = (config = {}) => {
  if (!config || typeof config !== "object" || typeof config.onOk !== "function") {
    return config;
  }

  let running = false;

  return {
    ...config,
    onOk: async (...args) => {
      if (running) return undefined;

      running = true;
      const startedAt = Date.now();

      try {
        return await config.onOk(...args);
      } finally {
        await withMinimumLoadingTime(startedAt);
        running = false;
      }
    },
  };
};

const wrapModalApi = (modalApi = {}) => ({
  ...modalApi,
  confirm: (config) => modalApi.confirm(wrapConfirmConfig(config)),
  error: (config) => modalApi.error(wrapConfirmConfig(config)),
  info: (config) => modalApi.info(wrapConfirmConfig(config)),
  success: (config) => modalApi.success(wrapConfirmConfig(config)),
  warning: (config) => modalApi.warning(wrapConfirmConfig(config)),
});

const AutoLoadingButton = React.forwardRef(function AutoLoadingButton(
  { disabled = false, loading = false, onClick, ...props },
  ref,
) {
  const [autoLoading, setAutoLoading] = useState(false);
  const isLoading = Boolean(loading) || autoLoading;
  const hasClickHandler = typeof onClick === "function";

  const handleClick = async (event) => {
    if (!hasClickHandler) return;

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
      await withMinimumLoadingTime(startedAt);
      setAutoLoading(false);
    }
  };

  return (
    <AntdButton
      {...props}
      ref={ref}
      disabled={disabled || isLoading}
      loading={loading || autoLoading}
      onClick={hasClickHandler ? handleClick : undefined}
    />
  );
});

const AutoLoadingModal = React.forwardRef(function AutoLoadingModal(
  {
    cancelButtonProps,
    confirmLoading = false,
    okButtonProps,
    onOk,
    ...props
  },
  ref,
) {
  const [autoConfirmLoading, setAutoConfirmLoading] = useState(false);
  const isConfirmLoading = Boolean(confirmLoading) || autoConfirmLoading;
  const hasOkHandler = typeof onOk === "function";

  const handleOk = async (...args) => {
    if (!hasOkHandler || isConfirmLoading) return undefined;

    const startedAt = Date.now();
    setAutoConfirmLoading(true);

    try {
      const result = onOk(...args);
      if (isThenable(result)) {
        await result;
      }
      return result;
    } finally {
      await withMinimumLoadingTime(startedAt);
      setAutoConfirmLoading(false);
    }
  };

  return (
    <AntdModal
      {...props}
      ref={ref}
      confirmLoading={isConfirmLoading}
      okButtonProps={{
        ...okButtonProps,
        disabled: Boolean(okButtonProps?.disabled) || isConfirmLoading,
      }}
      cancelButtonProps={{
        ...cancelButtonProps,
        disabled: Boolean(cancelButtonProps?.disabled) || isConfirmLoading,
      }}
      onOk={hasOkHandler ? handleOk : onOk}
    />
  );
});

Object.assign(AutoLoadingModal, AntdModal);
AutoLoadingModal.confirm = (config) => AntdModal.confirm(wrapConfirmConfig(config));
AutoLoadingModal.error = (config) => AntdModal.error(wrapConfirmConfig(config));
AutoLoadingModal.info = (config) => AntdModal.info(wrapConfirmConfig(config));
AutoLoadingModal.success = (config) => AntdModal.success(wrapConfirmConfig(config));
AutoLoadingModal.warning = (config) => AntdModal.warning(wrapConfirmConfig(config));
AutoLoadingModal.useModal = (...args) => {
  const [modalApi, contextHolder] = AntdModal.useModal(...args);
  return [React.useMemo(() => wrapModalApi(modalApi), [modalApi]), contextHolder];
};

export * from "antd/es";
export const Button = AutoLoadingButton;
export const Modal = AutoLoadingModal;
