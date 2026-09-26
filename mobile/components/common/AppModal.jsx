import React from "react";
import { Modal as NativeModal } from "react-native";
import ToastHost from "./ToastHost";

export default function AppModal({ children, visible = true, ...props }) {
  return (
    <NativeModal visible={visible} {...props}>
      {children}
      {visible && <ToastHost embedded />}
    </NativeModal>
  );
}
