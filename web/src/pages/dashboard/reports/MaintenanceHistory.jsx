import React, { useState } from "react";
import { Row, Col, message, Button, Card, Typography } from "antd";

import { SDMChart, ARTChart } from "../../../components/common/PieChart";
import MHistoryTable from "../../../components/tables/MHistoryTable";

const { Title } = Typography;

export default function MaintenanceHistory({ data }) {
  const [loading, setLoading] = useState(false);

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
        gap: 10,
        marginBottom: 10,
      }}
    >
      <Row gutter={24}>
        <Col xs={24}>
          <Card size="small">
            <Title level={5} style={{ margin: 0 }}>
              Same-day Repairs (Last 30 days)
            </Title>
            <SDMChart />
          </Card>
        </Col>
        <Col xs={24}>
          <Card size="small">
            <Title level={5} style={{ margin: 0 }}>
              Average Rectification Time
            </Title>
            <ARTChart />
          </Card>
        </Col>
      </Row>
      <Row>
        <MHistoryTable headers={headers} data={data} loading={loading} />
      </Row>
    </div>
  );
}
