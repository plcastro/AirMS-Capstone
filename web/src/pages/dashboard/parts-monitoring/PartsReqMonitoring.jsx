import React, { useState, useEffect, useContext } from "react";
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Tabs,
  notification,
  Tag,
  Space,
  Row,
  Col,
} from "antd";
import { MailOutlined, EditOutlined, CheckOutlined } from "@ant-design/icons";

import { API_BASE } from "../../../utils/API_BASE";
import { AuthContext } from "../../../context/AuthContext";

const { TabPane } = Tabs;

export default function PartsRequisition() {
  const { user } = useContext(AuthContext);

  // --- State ---
  const [requisitions, setRequisitions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedReq, setSelectedReq] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [emailModalVisible, setEmailModalVisible] = useState(false);
  const [emailMessage, setEmailMessage] = useState("");

  const [form] = Form.useForm();

  // --- Fetch requisitions ---
  const fetchRequisitions = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/requisitions`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      const data = await res.json();
      setRequisitions(data);
    } catch (err) {
      notification.error({ message: "Failed to fetch requisitions" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequisitions();
  }, []);

  // --- Table columns ---
  const columns = [
    { title: "Part ID", dataIndex: "partId", key: "partId" },
    { title: "Part Name", dataIndex: "partName", key: "partName" },
    { title: "Quantity", dataIndex: "quantity", key: "quantity" },
    { title: "Requested By", dataIndex: "requestedBy", key: "requestedBy" },
    { title: "Date", dataIndex: "date", key: "date" },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => {
        const color =
          status === "Pending"
            ? "orange"
            : status === "Approved"
              ? "green"
              : status === "Rejected"
                ? "red"
                : "blue";
        return <Tag color={color}>{status}</Tag>;
      },
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space>
          <Button icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            Edit
          </Button>
          <Button
            icon={<MailOutlined />}
            type="primary"
            onClick={() => handleSendEmail(record)}
          >
            Send Email
          </Button>
        </Space>
      ),
    },
  ];

  // --- Edit Requisition ---
  const handleEdit = (record) => {
    setSelectedReq(record);
    form.setFieldsValue(record);
    setModalVisible(true);
  };

  const handleSaveEdit = async () => {
    try {
      const values = await form.validateFields();
      // API call to update requisition
      await fetch(`${API_BASE}/requisitions/${selectedReq.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify(values),
      });
      notification.success({ message: "Requisition updated!" });
      setModalVisible(false);
      fetchRequisitions();
    } catch (err) {
      notification.error({ message: "Failed to update requisition" });
    }
  };

  // --- Email Requisition ---
  const handleSendEmail = (record) => {
    setSelectedReq(record);
    setEmailModalVisible(true);
  };

  const handleEmailSend = async () => {
    try {
      // API call to send email
      await fetch(`${API_BASE}/requisitions/send-email/${selectedReq.id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({ message: emailMessage }),
      });
      notification.success({ message: "Email sent successfully!" });
      setEmailModalVisible(false);
      setEmailMessage("");
    } catch (err) {
      notification.error({ message: "Failed to send email" });
    }
  };

  return (
    <div style={{ padding: 24 }}>

      <Tabs defaultActiveKey="1">
        <TabPane tab="All Requisitions" key="1">
          <Table
            columns={columns}
            dataSource={requisitions}
            loading={loading}
            rowKey="id"
          />
        </TabPane>

        <TabPane tab="Warehouse Dashboard" key="2">
          <p>
            {/* Placeholder: Only accessible to warehouse personnel */}
            Warehouse dashboard will show assigned personnel and processing
            options.
          </p>
        </TabPane>

        {/* --- Edit Modal --- */}
        <Modal
          title="Edit Requisition"
          visible={modalVisible}
          onCancel={() => setModalVisible(false)}
          onOk={handleSaveEdit}
        >
          <Form form={form} layout="vertical">
            <Form.Item
              label="Quantity"
              name="quantity"
              rules={[{ required: true, message: "Enter quantity" }]}
            >
              <Input type="number" />
            </Form.Item>
            <Form.Item
              label="Status"
              name="status"
              rules={[{ required: true, message: "Select status" }]}
            >
              <Select
                options={[
                  { label: "Pending", value: "Pending" },
                  { label: "Approved", value: "Approved" },
                  { label: "Rejected", value: "Rejected" },
                  { label: "Processed", value: "Processed" },
                ]}
                placeholder="Select status"
              />
            </Form.Item>
          </Form>
        </Modal>

        {/* --- Email Modal --- */}
        <Modal
          title={`Send Requisition Email`}
          visible={emailModalVisible}
          onCancel={() => setEmailModalVisible(false)}
          onOk={handleEmailSend}
        >
          <Form layout="vertical">
            <Form.Item label="Additional Message">
              <Input.TextArea
                value={emailMessage}
                onChange={(e) => setEmailMessage(e.target.value)}
                placeholder="Optional message to include"
              />
            </Form.Item>
          </Form>
        </Modal>
      </Tabs>
    </div>
  );
}
