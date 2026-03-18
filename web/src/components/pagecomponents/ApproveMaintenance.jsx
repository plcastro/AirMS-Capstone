import React from "react";
import { Modal, Form, Input } from "antd";

export default function ApproveMaintenance({
  visible,
  aircraftNumber,
  onConfirm,
  onCancel,
}) {
  const [form] = Form.useForm();

  const handleConfirm = async () => {
    try {
      const values = await form.validateFields();
      onConfirm?.(values.username, values.password);
      form.resetFields();
    } catch (error) {
      console.log("Validation failed:", error);
    }
  };

  return (
    <Modal
      title="Maintenance Approval"
      open={visible}
      onOk={handleConfirm}
      onCancel={onCancel}
      okText="Approve"
      cancelText="Cancel"
      width={400}
    >
      <Form form={form} layout="vertical">
        <Form.Item label="Aircraft">
          <Input value={aircraftNumber} readOnly />
        </Form.Item>

        <Form.Item
          label="Username"
          name="username"
          rules={[{ required: true, message: "Please enter your username" }]}
        >
          <Input placeholder="Enter username" />
        </Form.Item>

        <Form.Item
          label="Password"
          name="password"
          rules={[{ required: true, message: "Please enter your password" }]}
        >
          <Input.Password placeholder="Enter password" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
