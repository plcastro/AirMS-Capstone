import React, { useState, useEffect } from "react";
import { Modal, Input, Button, Form, DatePicker, message } from "antd";
import dayjs from "dayjs";

export default function MaintenanceEntryModal({
  visible,
  entry, // if provided, it's edit mode
  onClose,
  onSave,
}) {
  const [form] = Form.useForm();
  const [dateError, setDateError] = useState("");

  const isEditMode = !!entry;

  useEffect(() => {
    if (isEditMode) {
      form.setFieldsValue({
        aircraft: entry.aircraft || "",
        defectDescription: entry.defects || "",
        dateDefectDiscovered: entry.dateDefectDiscovered
          ? dayjs(convertToYYYYMMDD(entry.dateDefectDiscovered))
          : null,
        correctiveActionDone: entry.correctiveActionDone || "",
        dateDefectRectified: entry.dateDefectRectified
          ? dayjs(convertToYYYYMMDD(entry.dateDefectRectified))
          : null,
      });
      setDateError("");
    } else {
      form.resetFields();
    }
  }, [entry, form, isEditMode]);

  const convertToYYYYMMDD = (dateString) => {
    if (!dateString || dateString === "N/A") return null;
    const [month, day, year] = dateString.split("/");
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  };

  const handleFinish = (values) => {
    // Validate rectified date
    if (
      values.dateDefectRectified &&
      values.dateDefectDiscovered &&
      values.dateDefectRectified.isBefore(values.dateDefectDiscovered)
    ) {
      message.error(
        "Date Defect Rectified cannot be before Date Defect Discovered",
      );
      return;
    }

    const formattedEntry = {
      aircraft: values.aircraft,
      defects: values.defectDescription,
      dateDefectDiscovered: values.dateDefectDiscovered
        ? values.dateDefectDiscovered.format("MM/DD/YYYY")
        : new Date().toLocaleDateString("en-US"),
      correctiveActionDone: values.correctiveActionDone || "N/A",
      dateDefectRectified: values.dateDefectRectified
        ? values.dateDefectRectified.format("MM/DD/YYYY")
        : "N/A",
    };

    onSave?.(formattedEntry);
    form.resetFields();
  };

  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  return (
    <Modal
      open={visible}
      title={isEditMode ? "Edit Maintenance Entry" : "New Maintenance Entry"}
      onCancel={handleCancel}
      footer={[
        <Button key="cancel" onClick={handleCancel}>
          Cancel
        </Button>,
        <Button key="save" type="primary" onClick={() => form.submit()}>
          {isEditMode ? "Update" : "Save"}
        </Button>,
      ]}
    >
      <Form form={form} layout="vertical" onFinish={handleFinish}>
        <Form.Item
          label="Aircraft"
          name="aircraft"
          rules={[{ required: true }]}
        >
          <Input placeholder="Enter aircraft number" disabled={isEditMode} />
        </Form.Item>

        <Form.Item
          label="Defect Description"
          name="defectDescription"
          rules={[{ required: true }]}
        >
          <Input.TextArea rows={4} placeholder="Enter defect description..." />
        </Form.Item>

        <Form.Item label="Date Defect Discovered" name="dateDefectDiscovered">
          <DatePicker style={{ width: "100%" }} format="MM/DD/YYYY" />
        </Form.Item>

        <Form.Item label="Corrective Action Done" name="correctiveActionDone">
          <Input placeholder="Enter corrective action taken..." />
        </Form.Item>

        <Form.Item label="Date Defect Rectified" name="dateDefectRectified">
          <DatePicker
            style={{ width: "100%" }}
            format="MM/DD/YYYY"
            disabledDate={(current) => {
              const discoveredDate = form.getFieldValue("dateDefectDiscovered");
              return discoveredDate && current.isBefore(discoveredDate, "day");
            }}
          />
        </Form.Item>

        {dateError && (
          <div style={{ color: "#dc3545", marginTop: 4 }}>{dateError}</div>
        )}
      </Form>
    </Modal>
  );
}
