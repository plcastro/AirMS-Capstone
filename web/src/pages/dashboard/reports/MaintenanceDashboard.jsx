import React from "react";

import { Tabs } from "antd";
import MaintenancePerformance from "./MaintenancePerformance";
import MaintenanceSummary from "./MaintenanceSummary";
import ComponentUsage from "./ComponentUsage";
import MaintenanceHistory from "./MaintenanceHistory";
import { Input } from "antd";

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
        minHeight: "100%",
      }}
    >
      <Input size="large" placeholder="Search by..." style={{ width: 300 }} />
      <Tabs defaultActiveKey="1" items={items} onChange={onChange} />
    </div>
  );
}
