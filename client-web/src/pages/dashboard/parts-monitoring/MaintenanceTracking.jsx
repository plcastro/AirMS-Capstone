import React from "react";
import { Card, Col, Row } from "antd";
import MTrackingTable from "../../../components/tables/MTrackingTable";

const columnHeader = [
  {
    title: "Aircraft",
    dataIndex: "aircraft",
    key: "aircraft",
  },
  {
    title: "Recommendation",
    dataIndex: "recommendation",
    key: "recommendation",
  },
  {
    title: "Estimated Action Time",
    dataIndex: "estimatedActionTime",
    key: "estimatedActionTime",
  },
  {
    title: "Priority",
    dataIndex: "priority",
    key: "priority",
  },
];
const data = [
  {
    _id: "1",
    aircraft: "Cessna 172",
    recommendation: "Oil change soon",
    estimatedActionTime: 45,
    priority: "Critical",
  },
];
export default function MaintenanceTracking() {
  return (
    <div
      style={{
        padding: 20,
      }}
    >
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={8}>
          <Card title="Flight Hours Remaining" variant="borderless"></Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card title="Maintenance Alerts" variant="borderless"></Card>
        </Col>
        <Col xs={24} sm={24} md={8}>
          <Card title="Maintenance Schedule Status" variant="borderless"></Card>
        </Col>
      </Row>
      <Row gutter={24}>
        <Col span={24}>
          <h2>Predictive Maintenance Recommendations</h2>
        </Col>
        <Col span={24}>
          <MTrackingTable headers={columnHeader} data={data} loading={false} />
        </Col>
      </Row>
    </div>
  );
}
