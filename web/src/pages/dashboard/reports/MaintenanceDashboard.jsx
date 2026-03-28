import React, { useState } from "react";
import {
  Row,
  Col,
  Input,
  Button,
  Card,
  Typography,
  Space,
  Statistic,
  message,
  Select,
} from "antd";
import { SearchOutlined, ExportOutlined } from "@ant-design/icons";

import MaintenancePerformance from "./MaintenancePerformance";
import MaintenanceSummary from "./MaintenanceSummary";
import MaintenanceHistory from "./MaintenanceHistory";
import ComponentUsage from "./ComponentUsage";
import {
  repairData,
  mhistorydata,
  summarydata,
  componentData,
  PACChartMock,
} from "../../../components/common/MockData";
import {
  exportToExcel,
  exportToPDF,
} from "../../../components/common/ExportFile";
const { Title } = Typography;

export default function MaintenanceDashboard() {
  const [selectedFileType, setSelectedFileType] = useState("PDF");
  const [fileTypeOptions, setFileTypeOptions] = useState(["PDF", "Excel"]);
  if (selectedFileType === "PDF") {
    exportToPDF();
  } else {
    exportToExcel();
  }
  return (
    <div
      style={{
        padding: 20,
        minHeight: "100vh",
        overflowY: "scroll",
        height: "100%",
      }}
    >
      <Card style={{ marginBottom: 20 }}>
        <Row justify="space-between" align="middle" gutter={[16, 16]}>
          <Col xs={24} md={6}>
            <Title level={3} style={{ margin: 0 }}>
              Maintenance Dashboard
            </Title>
          </Col>

          <Col xs={24} md={10}>
            <Input
              size="large"
              placeholder="Search..."
              prefix={<SearchOutlined />}
            />
          </Col>

          <Col xs={24} md={4}>
            <Select
              value={selectedFileType}
              onChange={(value) => setSelectedFileType(value)}
              size="large"
              style={{ width: "100%" }}
              options={fileTypeOptions.map((type) => ({
                label: type,
                value: type,
              }))}
            />
            <Button
              type="primary"
              icon={<ExportOutlined />}
              block
              onClick={() => {
                if (selectedFileType === "PDF") {
                  exportToPDF();
                } else {
                  exportToExcel();
                }
              }}
            >
              Export
            </Button>
          </Col>
        </Row>
      </Card>

      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic title="Total Tasks" value={534} />
          </Card>
        </Col>

        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic
              title="Completed Tasks"
              value={34}
              styles={{ content: { color: "#3f8600" } }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic
              title="Overdue Tasks"
              value={5}
              styles={{ content: { color: "#cf1322" } }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Space orientation="vertical" size="large" style={{ width: "100%" }}>
            <Card title="Performance Overview">
              <div id="performanceChart">
                <MaintenancePerformance data={PACChartMock} />
              </div>
            </Card>

            <Card title="Maintenance Insights">
              <div id="summaryChart">
                <MaintenanceSummary
                  summaryData={summarydata}
                  repairData={repairData}
                />
              </div>
            </Card>
            <Card title="Component Analysis">
              <div id="componentChart">
                <ComponentUsage data={componentData} />
              </div>
            </Card>
          </Space>
        </Col>

        <Col xs={24} lg={8}>
          <Space orientation="vertical" size="large" style={{ width: "100%" }}>
            <Card title="Maintenance History">
              <div id="historyChart">
                <MaintenanceHistory data={mhistorydata} />
              </div>
            </Card>
          </Space>
        </Col>
      </Row>
    </div>
  );
}
