import React from "react";
import { Card, Col, Row, Statistic, Input, Button } from "antd";
import { ExportOutlined } from "@ant-design/icons";
export default function MaintenanceHistory() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Row style={{ justifyContent: "flex-end" }}>
        <div>
          <Button type="primary" icon={<ExportOutlined />}>
            Export
          </Button>
        </div>
      </Row>
    </div>
  );
}
