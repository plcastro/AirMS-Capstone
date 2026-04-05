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
  const [searchText, setSearchText] = useState("");
  const [selectedFileType, setSelectedFileType] = useState("PDF");
  const [fileTypeOptions] = useState(["PDF", "Excel"]);

  const cards = [
    {
      key: "performance",
      title: "Performance Overview",
      component: <MaintenancePerformance data={PACChartMock} />,
      keywords: ["performance", "overview", "pac"],
    },
    {
      key: "history",
      title: "Maintenance History",
      component: <MaintenanceHistory data={mhistorydata} />,
      keywords: ["history", "maintenance", "record"],
    },
    {
      key: "summary",
      title: "Maintenance Insights",
      component: (
        <MaintenanceSummary summaryData={summarydata} repairData={repairData} />
      ),
      keywords: ["summary", "insights", "repair"],
    },
    {
      key: "component",
      title: "Component Analysis",
      component: <ComponentUsage data={componentData} />,
      keywords: ["component", "usage", "analysis"],
    },
  ];

  const filteredCards = cards
    .map((card) => ({
      ...card,
      relevance: card.keywords.some((kw) =>
        kw.toLowerCase().includes(searchText.toLowerCase()),
      )
        ? 1
        : 0,
    }))
    .sort((a, b) => b.relevance - a.relevance) // most relevant first
    .filter((card) => searchText === "" || card.relevance > 0); // optionally hide non-relevant cards

  // const filteredSummary = summarydata.filter(
  //   (item) =>
  //     item.aircraft.toLowerCase().includes(searchText.toLowerCase()) ||
  //     item.task.toLowerCase().includes(searchText.toLowerCase()),
  // );

  // const filteredHistory = mhistorydata.filter(
  //   (item) =>
  //     item.aircraft.toLowerCase().includes(searchText.toLowerCase()) ||
  //     item.task.toLowerCase().includes(searchText.toLowerCase()),
  // );

  // const filteredComponents = componentData.filter((item) =>
  //   item.component.toLowerCase().includes(searchText.toLowerCase()),
  // );
  return (
    <div
      style={{
        padding: 20,
        minHeight: "100vh",
        overflowY: "scroll",
        height: "100%",
      }}
    >
      <Row gutter={[16, 16]} style={{ marginBottom: 10 }} align="middle">
        {/* Search Input */}
        <Col xs={24} sm={24} md={12} lg={10}>
          <Input
            size="large"
            placeholder="Search..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
          />
        </Col>

        {/* File Type Selector */}
        <Col xs={12} sm={8} md={6} lg={5}>
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
        </Col>

        {/* Export Button */}
        <Col xs={12} sm={8} md={6} lg={4}>
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

      <Row gutter={[16, 16]} style={{ marginBottom: 100 }}>
        {filteredCards.map((card) => (
          <Col xs={24} key={card.key}>
            <Card title={card.title}>{card.component}</Card>
          </Col>
        ))}
      </Row>
    </div>
  );
}
