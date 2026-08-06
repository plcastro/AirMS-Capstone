import { useEffect, useRef } from "react";
import { Modal, Result } from "antd";

export default function ResultPopup({
  open,
  onClose,
  title,
  subTitle,
  status = "success",
  duration = 2000,
  autoClose = true,
  zIndex,
}) {
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open || !autoClose) return;

    const timer = setTimeout(() => {
      onCloseRef.current?.();
    }, duration);

    return () => clearTimeout(timer);
  }, [open, autoClose, duration]);

  return (
    <Modal
      open={open}
      footer={null}
      closable={!autoClose}
      maskClosable={!autoClose}
      centered
      width={500}
      zIndex={zIndex}
      onCancel={onClose}
      destroyOnHidden
    >
      <Result status={status} title={title} subTitle={subTitle} />
    </Modal>
  );
}
