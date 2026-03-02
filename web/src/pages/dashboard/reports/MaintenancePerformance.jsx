import React from "react";
import { Card, Col, Row, Statistic, Input, Button } from "antd";
import { ExportOutlined } from "@ant-design/icons";
export default function MaintenancePerformance() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Input placeholder="Search by..." style={{ width: 200 }} />
      <div>
        <Button type="primary" icon={<ExportOutlined />}>
          Export
        </Button>
      </div>
      <div style={{ display: "flex" }}>
        <Row gutter={24} style={{ flex: 1 }}>
          <Col span={8}>
            <Card variant="borderless">
              <Statistic
                title="Total Tasks"
                value={534}
                styles={{ content: { color: "#000000" } }}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card variant="borderless">
              <Statistic
                title="Completed Tasks"
                value={34}
                styles={{ content: { color: "#048a25" } }}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card variant="borderless">
              <Statistic
                title="Overdue"
                value={5}
                styles={{ content: { color: "#cf1322" } }}
              />
            </Card>
          </Col>
        </Row>
      </div>
      <Card>
        <p>Task Completion Rate</p>
        <h1>78.5%</h1>
      </Card>
    </div>
  );
}
