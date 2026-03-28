import React from "react";
import { Row, Space, Typography } from "antd";

import AreaChartComponent from "../../../components/common/AreaChart";
const { Title, Text } = Typography;

export default function MaintenancePerformance({ data }) {
  const currentMonthYear = new Date().toLocaleString("en-PH", {
    month: "long",
    year: "numeric",
  });

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 20,
        marginBottom: 10,
      }}
    >
      <Row>
        <Space orientation="vertical" size={0}>
          <Title level={4} style={{ margin: 0 }}>
            Maintenance Performance
          </Title>
          <Text type="secondary">{currentMonthYear}</Text>
        </Space>
        <AreaChartComponent data={data} />
      </Row>
    </div>
  );
}
