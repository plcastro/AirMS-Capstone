import React, { useState, useEffect } from "react";
import { Modal, Input, Button, Form } from "antd";
import FlightLogApprove from "../MaintenanceLog/ApproveMaintenance";

export default function FlightLogEditDefects({
  visible,
  entry,
  onClose,
  onSave,
}) {
  const [form] = Form.useForm();
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [pendingUpdate, setPendingUpdate] = useState(null);

  useEffect(() => {
    if (entry) {
      form.setFieldsValue({
        aircraft: entry.aircraft || "",
        description: entry.destination || "",
        date: entry.date || "",
        reportedBy: entry.fullname || "",
        action: entry.defectAction || "",
      });
    }
  }, [entry, form]);

  const handleSave = () => {
    form
      .validateFields()
      .then((values) => {
        const updatedEntry = {
          ...entry,
          defectAction: values.action,
          destination: values.description,
          status: "pending_approval",
        };
        setPendingUpdate(updatedEntry);
        Modal.confirm({
          title: "Submit Log",
          content: "Are you sure you want to submit this log?",
          okText: "Yes",
          cancelText: "Cancel",
          onOk: () => setShowApproveModal(true),
        });
      })
      .catch((info) => {
        console.log("Validation Failed:", info);
      });
  };

  const handleApproveConfirm = (username, password) => {
    if (pendingUpdate) {
      const approvedUpdate = {
        ...pendingUpdate,
        approvedBy: username,
        approvedAt: new Date().toISOString(),
        status: "approved",
      };
      onSave?.(approvedUpdate);
    }
    setPendingUpdate(null);
    setShowApproveModal(false);
    onClose();
  };

  return (
    <>
      <Modal
        visible={visible}
        title="Edit Defect Entry"
        onCancel={onClose}
        footer={[
          <Button key="discard" onClick={onClose}>
            Cancel
          </Button>,
          <Button key="save" type="primary" onClick={handleSave}>
            Update
          </Button>,
        ]}
      >
        <Form form={form} layout="vertical">
          <Form.Item label="Aircraft" name="aircraft">
            <Input readOnly />
          </Form.Item>

          <Form.Item label="Date" name="date">
            <Input readOnly />
          </Form.Item>

          <Form.Item label="Reported By" name="reportedBy">
            <Input readOnly />
          </Form.Item>

          <Form.Item
            label="Description *"
            name="description"
            rules={[{ required: true, message: "Description is required" }]}
          >
            <Input.TextArea
              rows={4}
              placeholder="Enter defect description..."
            />
          </Form.Item>

          <Form.Item
            label="Action *"
            name="action"
            rules={[{ required: true, message: "Action is required" }]}
          >
            <Input.TextArea rows={4} placeholder="Enter required action..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* Approval Modal */}
      <FlightLogApprove
        visible={showApproveModal}
        aircraftNumber={form.getFieldValue("aircraft")}
        onConfirm={handleApproveConfirm}
        onCancel={() => setShowApproveModal(false)}
      />
    </>
  );
}
