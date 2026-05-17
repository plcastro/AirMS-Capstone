import { Modal } from "antd";

export const confirmAction = ({
  title = "Confirm Action",
  content = "Are you sure you want to continue?",
  okText = "Confirm",
  cancelText = "Cancel",
  okType = "primary",
} = {}) =>
  new Promise((resolve) => {
    Modal.confirm({
      title,
      content,
      okText,
      cancelText,
      okType,
      onOk: () => resolve(true),
      onCancel: () => resolve(false),
    });
  });

