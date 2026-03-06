import React from "react";
import { Card, Col, Row } from "antd";
import MPriorityTable from "../../../components/tables/MPriorityTable";

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
export default function MaintenancePriority() {
  return (
    <>
      <Row gutter={16}>
        <Col span={8}>
          <Card title="Flight Hours Remaining" variant="borderless"></Card>
        </Col>
        <Col span={8}>
          <Card title="Maintenance Alerts" variant="borderless"></Card>
        </Col>
        <Col span={8}>
          <Card title="Maintenance Schedule Status" variant="borderless"></Card>
        </Col>
      </Row>
      <Row gutter={24}>
        <Col span={24}>
          <h2>Predictive Maintenance Recommendations</h2>
        </Col>
        <Col span={24}>
          <MPriorityTable headers={columnHeader} data={data} loading={false} />
        </Col>
      </Row>
    </>
  );
}
