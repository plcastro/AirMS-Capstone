import { useEffect } from "react";
import { Modal, Result } from "antd";

export default function ResultPopup({
  open,
  onClose,
  title,
  subTitle,
  status = "success",
  duration = 3000,
  autoClose = true,
}) {
  useEffect(() => {
    if (!open || !autoClose) return;

    const timer = setTimeout(() => {
      onClose?.();
    }, duration);

    return () => clearTimeout(timer);
  }, [open, autoClose, duration, onClose]);

  return (
    <Modal
      open={open}
      footer={null}
      closable={!autoClose}
      mask={{ closable: !autoClose }}
      centered
      width={500}
      onCancel={onClose}
      destroyOnHidden
    >
      <Result status={status} title={title} subTitle={subTitle} />
    </Modal>
  );
}
