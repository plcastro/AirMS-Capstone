import React from "react";

import { Tabs, Input, Row, Col } from "antd";
import MaintenancePerformance from "./MaintenancePerformance";
import MaintenanceSummary from "./MaintenanceSummary";
import ComponentUsage from "./ComponentUsage";
import MaintenanceHistory from "./MaintenanceHistory";
import { SearchOutlined } from "@ant-design/icons";

const onChange = (key) => {
  console.log(key);
};
const items = [
  {
    key: "1",
    label: "Performance",
    children: <MaintenancePerformance />,
  },
  {
    key: "2",
    label: "Summary",
    children: <MaintenanceSummary />,
  },
  {
    key: "3",
    label: "History",
    children: <MaintenanceHistory />,
  },
  {
    key: "4",
    label: "Usage",
    children: <ComponentUsage />,
  },
];
export default function MaintenanceDashboard() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 20,
        width: "100%",
        height: "100vh",
        overflowY: "auto",
        padding: 20,
        marginBottom: 300,
      }}
    >
      <Row>
        <Col xs={24} md={8}>
          <Input
            size="large"
            placeholder="Search by..."
            prefix={<SearchOutlined />}
          />
        </Col>
      </Row>
      <div style={{ flex: 1 }}>
        <Tabs defaultActiveKey="1" items={items} onChange={onChange} />
      </div>
    </div>
  );
}
