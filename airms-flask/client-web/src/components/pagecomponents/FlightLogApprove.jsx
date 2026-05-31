import React, { useState, useEffect } from "react";
import { Modal, Form, Input, Button, Row, Col, DatePicker } from "antd";
import dayjs from "dayjs";

export default function FlightLogApprove({
  visible,
  entry,
  onConfirm,
  onCancel,
}) {
  const [form] = Form.useForm();
  const parseDate = (value) => {
    if (!value) return null;
    const parsed = dayjs(value);
    return parsed.isValid() ? parsed : null;
  };

  const formatDate = (value) =>
    value && dayjs.isDayjs(value) ? value.format("MM/DD/YYYY") : "";

  useEffect(() => {
    if (visible) {
      form.setFieldsValue({
        station: entry?.station || "",
        frequency: entry?.frequency || "",
        date: parseDate(entry?.date),
        vor1: entry?.vor1 || "",
        vor2: entry?.vor2 || "",
        dueNext: parseDate(entry?.dueNext),
        signature: "",
        preFlightDate: parseDate(entry?.preFlightDate),
        ap: "",
        mmel: entry?.mmel || Array(6).fill(""),
      });
    }
  }, [visible, entry, form]);

  const handleConfirm = () => {
    form
      .validateFields()
      .then((values) => {
        onConfirm?.({
          ...values,
          date: formatDate(values.date),
          dueNext: formatDate(values.dueNext),
          preFlightDate: formatDate(values.preFlightDate),
        });
      })
      .catch((info) => {
        console.log("Validation Failed:", info);
      });
  };

  return (
    <Modal
      title="VOR Check & MMEL Verification"
      open={visible}
      onCancel={onCancel}
      width={720}
      okText="Confirm"
      cancelText="Cancel"
      onOk={handleConfirm}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          station: "",
          frequency: "",
          date: "",
          vor1: "",
          vor2: "",
          dueNext: "",
          signature: "",
          preFlightDate: "",
          ap: "",
          mmel: Array(6).fill(""),
        }}
      >
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="Station"
              name="station"
              rules={[{ required: true, message: "Station is required" }]}
            >
              <Input placeholder="Station" />
            </Form.Item>
            <Form.Item
              label="Frequency"
              name="frequency"
              rules={[{ required: true, message: "Frequency is required" }]}
            >
              <Input placeholder="Frequency" />
            </Form.Item>
            <Form.Item label="Date" name="date">
              <DatePicker style={{ width: "100%" }} format="MM/DD/YYYY" />
            </Form.Item>
            <Form.Item label="VOR 1" name="vor1">
              <Input placeholder="Bearing/Error" />
            </Form.Item>
            <Form.Item label="VOR 2" name="vor2">
              <Input placeholder="Bearing/Error" />
            </Form.Item>
            <Form.Item label="Due Next" name="dueNext">
              <DatePicker style={{ width: "100%" }} format="MM/DD/YYYY" />
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item label="MMEL Items">
              <Row gutter={8}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <Col span={12} key={i}>
                    <Form.Item name={["mmel", i]}>
                      <Input placeholder={`Item ${i + 1}`} />
                    </Form.Item>
                  </Col>
                ))}
              </Row>
            </Form.Item>

            <Form.Item
              label="Released for Flight By (Signature)"
              name="signature"
            >
              <Input placeholder="Signature" />
            </Form.Item>
            <Form.Item label="Pre-Flight Release Date" name="preFlightDate">
              <DatePicker style={{ width: "100%" }} format="MM/DD/YYYY" />
            </Form.Item>
            <Form.Item label="A&P" name="ap">
              <Input placeholder="A&P" />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
}
