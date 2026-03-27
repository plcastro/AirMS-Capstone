import React from "react";

import { Tabs, Input, Row, Col, Button, message } from "antd";
import MaintenancePerformance from "./MaintenancePerformance";
import MaintenanceSummary from "./MaintenanceSummary";
import ComponentUsage from "./ComponentUsage";
import MaintenanceHistory from "./MaintenanceHistory";
import { SearchOutlined, ExportOutlined } from "@ant-design/icons";

export default function MaintenanceDashboard() {
  const exportDocument = () => {
    message.success("Exported successfully");
  };
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100vh",
        overflowY: "auto",
        padding: 20,
      }}
    >
      <Row
        justify={"space-between"}
        align={"flex-start"}
        style={{ marginBottom: 20 }}
      >
        <Col xs={24} md={8}>
          <Input
            size="large"
            placeholder="Search by..."
            prefix={<SearchOutlined />}
          />
        </Col>
        <Col xs={24} md={16} push={1}>
          <Button
            type="primary"
            icon={<ExportOutlined />}
            onClick={() => exportDocument()}
          >
            Export
          </Button>
        </Col>
      </Row>
      <div style={{ flex: 1 }}>
        <h1>Reports and Analytics</h1>
        <MaintenancePerformance />
        <MaintenanceSummary />
        <MaintenanceHistory />
        <ComponentUsage />
      </div>
    </div>
  );
}
