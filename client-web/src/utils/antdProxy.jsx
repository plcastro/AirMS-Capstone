import React, { useState } from "react";
import AntdButton from "antd/es/button";
import AntdForm from "antd/es/form";
import AntdModal from "antd/es/modal";

const MIN_LOADING_MS = 600;
const FormSubmitLoadingContext = React.createContext(false);

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
  { disabled = false, htmlType, loading = false, onClick, ...props },
  ref,
) {
  const [autoLoading, setAutoLoading] = useState(false);
  const formSubmitting = React.useContext(FormSubmitLoadingContext);
  const isSubmitButton = htmlType === "submit";
  const isLoading = Boolean(loading) || autoLoading || (isSubmitButton && formSubmitting);
  const hasClickHandler = typeof onClick === "function";

  const handleClick = async (event) => {
    if (disabled || isLoading) {
      event?.preventDefault?.();
      return;
    }

    if (!hasClickHandler) return;

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
      htmlType={htmlType}
      disabled={disabled || isLoading}
      loading={isLoading}
      onClick={hasClickHandler || isSubmitButton ? handleClick : undefined}
    />
  );
});

const AutoLoadingForm = React.forwardRef(function AutoLoadingForm(
  { children, onFinish, onFinishFailed, ...props },
  ref,
) {
  const parentSubmitting = React.useContext(FormSubmitLoadingContext);
  const [submitting, setSubmitting] = useState(false);
  const isSubmitting = parentSubmitting || submitting;

  const runWithSubmitting = async (handler, ...args) => {
    if (typeof handler !== "function") return undefined;

    const startedAt = Date.now();
    setSubmitting(true);

    try {
      const result = handler(...args);
      if (isThenable(result)) {
        return await result;
      }
      return result;
    } finally {
      await withMinimumLoadingTime(startedAt);
      setSubmitting(false);
    }
  };

  return (
    <AntdForm
      {...props}
      ref={ref}
      onFinish={onFinish ? (...args) => runWithSubmitting(onFinish, ...args) : onFinish}
      onFinishFailed={
        onFinishFailed
          ? (...args) => runWithSubmitting(onFinishFailed, ...args)
          : onFinishFailed
      }
    >
      <FormSubmitLoadingContext.Provider value={isSubmitting}>
        {children}
      </FormSubmitLoadingContext.Provider>
    </AntdForm>
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

Object.assign(AutoLoadingForm, AntdForm);

export * from "antd/es";
export const Button = AutoLoadingButton;
export const Form = AutoLoadingForm;
export const Modal = AutoLoadingModal;
