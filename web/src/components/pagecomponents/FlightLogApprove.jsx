import React, { useState } from "react";
import { Modal, Form, Input, Button, Row, Col } from "antd";

export default function FlightLogApprove({ visible, onConfirm, onCancel }) {
  const [form] = Form.useForm();

  const handleConfirm = () => {
    form
      .validateFields()
      .then((values) => {
        onConfirm?.(values);
      })
      .catch((info) => {
        console.log("Validation Failed:", info);
      });
  };

  return (
    <Modal
      title="VOR Check & MMEL Verification"
      visible={visible}
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
              <Input placeholder="Date" />
            </Form.Item>
            <Form.Item label="VOR 1" name="vor1">
              <Input placeholder="Bearing/Error" />
            </Form.Item>
            <Form.Item label="VOR 2" name="vor2">
              <Input placeholder="Bearing/Error" />
            </Form.Item>
            <Form.Item label="Due Next" name="dueNext">
              <Input placeholder="Due" />
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
              <Input placeholder="PreFlight Date" />
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
