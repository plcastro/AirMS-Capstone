import React, { useState } from "react";
import {
  Layout,
  Tabs,
  Table,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
  Tag,
  Space,
  Card,
  Row,
  Col,
  Statistic,
  message,
  Tooltip,
} from "antd";
import {
  FileProtectOutlined,
  RocketOutlined,
  DashboardOutlined,
  PlusOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

const { Content } = Layout;

const ComplianceTracking = () => {
  const [requirements, setRequirements] = useState([
    {
      id: 1,
      name: "Certificate of Registration",
      validity: 365,
      desc: "Legal proof of ownership",
    },
    {
      id: 2,
      name: "Certificate of Airworthiness",
      validity: 365,
      desc: "Safety compliance cert",
    },
    {
      id: 3,
      name: "Aviation Insurance",
      validity: 365,
      desc: "Liability coverage",
    },
  ]);

  const [records, setRecords] = useState([
    {
      key: "1",
      aircraft: "RP-C7057",
      requirementId: 1,
      issueDate: "2023-05-01",
      expiryDate: "2024-05-01",
    },
    {
      key: "2",
      aircraft: "RP-C7226",
      requirementId: 2,
      issueDate: "2026-03-01",
      expiryDate: "2026-04-10",
    },
  ]);

  const [isReqModalVisible, setIsReqModalVisible] = useState(false);
  const [isRecordModalVisible, setIsRecordModalVisible] = useState(false);
  const [form] = Form.useForm();

  // --- Status Calculation ---
  const getComplianceStatus = (expiryDate) => {
    const today = dayjs();
    const expiry = dayjs(expiryDate);
    const diffDays = expiry.diff(today, "day");

    if (diffDays < 0)
      return {
        label: "Non-Compliant",
        color: "red",
        icon: <CloseCircleOutlined />,
      };
    if (diffDays <= 30)
      return {
        label: "Expiring Soon",
        color: "orange",
        icon: <ExclamationCircleOutlined />,
      };
    return {
      label: "Compliant",
      color: "green",
      icon: <CheckCircleOutlined />,
    };
  };

  // --- Summary Dashboard ---
  const getAircraftSummary = () => {
    const aircraftList = ["RP-C7057", "RP-C7226", "2810"];
    return aircraftList.map((ac) => {
      const acRecords = records.filter((r) => r.aircraft === ac);
      const statuses = acRecords.map(
        (r) => getComplianceStatus(r.expiryDate).label,
      );
      return {
        aircraft: ac,
        total: acRecords.length,
        compliant: statuses.filter((s) => s === "Compliant").length,
        expiring: statuses.filter((s) => s === "Expiring Soon").length,
        nonCompliant: statuses.filter((s) => s === "Non-Compliant").length,
      };
    });
  };

  // --- Actions ---
  const handleAddRequirement = (values) => {
    const newReq = { ...values, id: Date.now() };
    setRequirements([...requirements, newReq]);
    setIsReqModalVisible(false);
    message.success("Requirement added successfully");
    form.resetFields();
  };

  const handleAddRecord = (values) => {
    const expiryDate = values.issueDate.add(values.validityDays || 365, "day");
    const newRecord = {
      key: Date.now().toString(),
      aircraft: values.aircraft,
      requirementId: values.requirementId,
      issueDate: values.issueDate.format("YYYY-MM-DD"),
      expiryDate: expiryDate.format("YYYY-MM-DD"),
    };
    setRecords([...records, newRecord]);
    setIsRecordModalVisible(false);
    message.success("Compliance record saved");
    form.resetFields();
  };

  // --- Table Columns ---
  const recordColumns = [
    { title: "Aircraft", dataIndex: "aircraft", key: "aircraft" },
    {
      title: "Requirement",
      dataIndex: "requirementId",
      render: (id) => requirements.find((r) => r.id === id)?.name || "Unknown",
    },
    { title: "Issue Date", dataIndex: "issueDate", key: "issueDate" },
    { title: "Expiry Date", dataIndex: "expiryDate", key: "expiryDate" },
    {
      title: "Status",
      key: "status",
      render: (_, record) => {
        const status = getComplianceStatus(record.expiryDate);
        return (
          <Tag color={status.color} icon={status.icon}>
            {status.label.toUpperCase()}
          </Tag>
        );
      },
    },
  ];

  return (
    <Content style={{ padding: 24, minHeight: "100vh" }}>
      {/* Header */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col span={24}>
          <Card variant={"borderless"} style={{ borderRadius: 8 }}>
            <Space orientation="vertical" style={{ width: "100%" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <h2 style={{ margin: 0 }}>Airworthiness Compliance</h2>
                <Space>
                  <Button
                    icon={<PlusOutlined />}
                    onClick={() => setIsReqModalVisible(true)}
                  >
                    New Requirement
                  </Button>
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => setIsRecordModalVisible(true)}
                  >
                    Assign Record
                  </Button>
                </Space>
              </div>
            </Space>
          </Card>
        </Col>
      </Row>

      {/* Tabs */}
      <Tabs
        defaultActiveKey="1"
        items={[
          {
            key: "1",
            label: (
              <span>
                <DashboardOutlined /> Dashboard
              </span>
            ),
            children: (
              <Row gutter={[16, 16]}>
                {getAircraftSummary().map((ac) => (
                  <Col xs={24} md={8} key={ac.aircraft}>
                    <Card title={ac.aircraft} variant="borderless" hoverable>
                      <Statistic title="Total Docs" value={ac.total} />
                      <div style={{ marginTop: 15 }}>
                        <Tooltip title="Compliant">
                          <Tag color="green">{ac.compliant}</Tag>
                        </Tooltip>
                        <Tooltip title="Expiring Soon">
                          <Tag color="orange">{ac.expiring}</Tag>
                        </Tooltip>
                        <Tooltip title="Non-Compliant">
                          <Tag color="red">{ac.nonCompliant}</Tag>
                        </Tooltip>
                      </div>
                    </Card>
                  </Col>
                ))}
              </Row>
            ),
          },
          {
            key: "2",
            label: (
              <span>
                <FileProtectOutlined /> Compliance Records
              </span>
            ),
            children: (
              <Card variant={"borderless"}>
                <Table
                  columns={recordColumns}
                  dataSource={records}
                  pagination={{ pageSize: 5 }}
                />
              </Card>
            ),
          },
          {
            key: "3",
            label: (
              <span>
                <RocketOutlined /> Requirements Library
              </span>
            ),
            children: (
              <Card variant={"borderless"}>
                <Table
                  dataSource={requirements}
                  rowKey="id"
                  columns={[
                    { title: "Name", dataIndex: "name" },
                    { title: "Validity (Days)", dataIndex: "validity" },
                    { title: "Description", dataIndex: "desc" },
                  ]}
                />
              </Card>
            ),
          },
        ]}
      />

      {/* Modals */}
      <Modal
        title="Create New Requirement"
        open={isReqModalVisible}
        onCancel={() => setIsReqModalVisible(false)}
        footer={null}
      >
        <Form layout="vertical" onFinish={handleAddRequirement} form={form}>
          <Form.Item
            name="name"
            label="Requirement Name"
            rules={[{ required: true }]}
          >
            <Input placeholder="e.g. Insurance" />
          </Form.Item>
          <Form.Item
            name="validity"
            label="Validity Period (Days)"
            rules={[{ required: true }]}
          >
            <InputNumber style={{ width: "100%" }} min={1} />
          </Form.Item>
          <Form.Item name="desc" label="Description">
            <Input.TextArea />
          </Form.Item>
          <Button type="primary" htmlType="submit" block>
            Save Requirement
          </Button>
        </Form>
      </Modal>

      <Modal
        title="Assign Compliance Record"
        open={isRecordModalVisible}
        onCancel={() => setIsRecordModalVisible(false)}
        footer={null}
      >
        <Form layout="vertical" onFinish={handleAddRecord} form={form}>
          <Form.Item
            name="aircraft"
            label="Aircraft"
            rules={[{ required: true }]}
          >
            <Select
              placeholder="Select Aircraft"
              options={[
                { label: "RP-C7057", value: "RP-C7057" },
                { label: "RP-C7226", value: "RP-C7226" },
                { label: "2810", value: "2810" },
              ]}
            />
          </Form.Item>
          <Form.Item
            name="requirementId"
            label="Requirement Type"
            rules={[{ required: true }]}
          >
            <Select
              placeholder="Select Type"
              options={requirements.map((r) => ({
                label: r.name,
                value: r.id,
              }))}
            />
          </Form.Item>
          <Form.Item
            name="issueDate"
            label="Issue Date"
            rules={[{ required: true }]}
          >
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item
            name="validityDays"
            label="Validity applied (Days)"
            initialValue={365}
          >
            <InputNumber style={{ width: "100%" }} />
          </Form.Item>
          <Button type="primary" htmlType="submit" block>
            Assign Record
          </Button>
        </Form>
      </Modal>
    </Content>
  );
};

export default ComplianceTracking;
