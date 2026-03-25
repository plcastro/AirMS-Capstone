import React, { useState } from "react";
import { Row, Col, message, Button, Card, Typography } from "antd";
import { ExportOutlined } from "@ant-design/icons";
import { SDMChart, ARTChart } from "../../../components/common/PieChart";
import MHistoryTable from "../../../components/tables/MHistoryTable";
import { mhistorydata } from "../../../components/common/MockData";

const { Title, Text } = Typography;

export default function MaintenanceHistory() {
  const [loading, setLoading] = useState(false);
  const exportDocument = () => {
    message.success("Exported successfully");
  };

  const headers = [
    {
      title: "Aircraft",
      dataIndex: "aircraft",
      key: "aircraft",
      render: (text) => <strong>{text}</strong>,
    },
    {
      title: "Date Defect Discovered",
      dataIndex: "dateDiscovered",
      key: "dateDiscovered",
    },
    {
      title: "Date Defect Rectified",
      dataIndex: "dateRectified",
      key: "dateRectified",
    },
    {
      title: "Task",
      dataIndex: "task",
      key: "task",
    },
    {
      title: "Assigned Engineer",
      dataIndex: "assignedEngineer",
      key: "assignedEngineer",
    },
  ];
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 20,
        marginBottom: 100,
      }}
    >
      <Row style={{ justifyContent: "flex-end" }}>
        <div>
          <Button
            type="primary"
            icon={<ExportOutlined />}
            onClick={() => exportDocument()}
          >
            Export
          </Button>
        </div>
      </Row>
      <Row gutter={24}>
        <Col xs={24} md={12}>
          <Card style={{ padding: 16 }}>
            <Title level={4} style={{ margin: 0 }}>
              Same-day Repairs (Last 30 days)
            </Title>
            <SDMChart />
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card style={{ padding: 16 }}>
            <Title level={4} style={{ margin: 0 }}>
              Average Rectification Time
            </Title>
            <ARTChart />
          </Card>
        </Col>
      </Row>
      <Row>
        <MHistoryTable
          headers={headers}
          data={mhistorydata}
          loading={loading}
        />
      </Row>
    </div>
  );
}
