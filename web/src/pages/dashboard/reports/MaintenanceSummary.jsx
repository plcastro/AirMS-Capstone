import React from "react";
import { Card, Col, Row, Statistic, Input, Button } from "antd";
import { ExportOutlined } from "@ant-design/icons";
export default function MaintenanceSummary() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Input placeholder="Search by..." style={{ width: 200 }} />
      <div>
        <Button type="primary" icon={<ExportOutlined />}>
          Export
        </Button>
      </div>
    </div>
  );
}
