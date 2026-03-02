import React, { useState, useEffect } from "react";
import {
  Modal,
  Form,
  Input,
  InputNumber,
  Button,
  Space,
  message as AntMessage,
} from "antd";

export function AddComponent({ visible, onClose, onComponentAdded }) {
  const [form] = Form.useForm();

  const handleSave = () => {
    form
      .validateFields()
      .then((values) => {
        onComponentAdded(values);
        form.resetFields();
        onClose();
        AntMessage.success("Component added successfully");
      })
      .catch((info) => {
        console.log("Validate Failed:", info);
      });
  };

  return (
    <Modal
      title="Add Component"
      open={visible}
      onCancel={() => {
        form.resetFields();
        onClose();
      }}
      footer={[
        <Button
          key="cancel"
          onClick={() => {
            form.resetFields();
            onClose();
          }}
        >
          Cancel
        </Button>,
        <Button key="add" type="primary" onClick={handleSave}>
          Add
        </Button>,
      ]}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{ currQty: 0, pricePerUnit: 0, partsConsumed: 0 }}
      >
        <Form.Item
          label="Part Name"
          name="partName"
          rules={[{ required: true, message: "Please enter part name" }]}
        >
          <Input maxLength={50} />
        </Form.Item>

        <Form.Item
          label="Part Location"
          name="partLoc"
          rules={[{ required: true, message: "Please enter part location" }]}
        >
          <Input maxLength={50} />
        </Form.Item>

        <Form.Item
          label="Current Quantity"
          name="currQty"
          rules={[{ required: true, message: "Please enter quantity" }]}
        >
          <InputNumber min={0} style={{ width: "100%" }} />
        </Form.Item>

        <Form.Item
          label="Price per Unit"
          name="pricePerUnit"
          rules={[{ required: true, message: "Please enter price" }]}
        >
          <InputNumber min={0} style={{ width: "100%" }} />
        </Form.Item>

        <Form.Item
          label="Total Parts Consumed"
          name="partsConsumed"
          rules={[{ required: true, message: "Please enter parts consumed" }]}
        >
          <InputNumber min={0} style={{ width: "100%" }} />
        </Form.Item>
      </Form>
    </Modal>
  );
}

export function EditComponent({
  visible,
  onClose,
  onComponentEdited,
  initialData,
}) {
  const [form] = Form.useForm();

  useEffect(() => {
    if (initialData) {
      form.setFieldsValue(initialData);
    }
  }, [initialData]);

  const handleSave = () => {
    form
      .validateFields()
      .then((values) => {
        onComponentEdited(values);
        form.resetFields();
        onClose();
        AntMessage.success("Component updated successfully");
      })
      .catch((info) => {
        console.log("Validate Failed:", info);
      });
  };

  return (
    <Modal
      title="Edit Component"
      open={visible}
      onCancel={() => {
        form.resetFields();
        onClose();
      }}
      footer={[
        <Button
          key="cancel"
          onClick={() => {
            form.resetFields();
            onClose();
          }}
        >
          Cancel
        </Button>,
        <Button key="save" type="primary" onClick={handleSave}>
          Save
        </Button>,
      ]}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          label="Part Name"
          name="partName"
          rules={[{ required: true, message: "Please enter part name" }]}
        >
          <Input maxLength={50} />
        </Form.Item>

        <Form.Item
          label="Part Location"
          name="partLoc"
          rules={[{ required: true, message: "Please enter part location" }]}
        >
          <Input maxLength={50} />
        </Form.Item>

        <Form.Item
          label="Current Quantity"
          name="currQty"
          rules={[{ required: true, message: "Please enter quantity" }]}
        >
          <InputNumber min={0} style={{ width: "100%" }} />
        </Form.Item>

        <Form.Item
          label="Price per Unit"
          name="pricePerUnit"
          rules={[{ required: true, message: "Please enter price" }]}
        >
          <InputNumber min={0} style={{ width: "100%" }} />
        </Form.Item>

        <Form.Item
          label="Total Parts Consumed"
          name="partsConsumed"
          rules={[{ required: true, message: "Please enter parts consumed" }]}
        >
          <InputNumber min={0} style={{ width: "100%" }} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
