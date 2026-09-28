import { Modal } from "antd";

export const confirmAction = ({
  title = "Confirm Action",
  content = "Are you sure you want to continue?",
  okText = "Confirm",
  cancelText = "Cancel",
  okButtonProps,
  modal,
} = {}) =>
  new Promise((resolve) => {
    const modalApi = modal || Modal;
    modalApi.confirm({
      title,
      content,
      okText,
      cancelText,
      okButtonProps,
      centered: true,
      onOk: () => resolve(true),
      onCancel: () => resolve(false),
    });
  });

