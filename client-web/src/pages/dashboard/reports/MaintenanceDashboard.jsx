import React, { useState, useEffect } from "react";
import { Row, Col, Card, Input, Button, Select, Statistic } from "antd";
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
} from "../../../components/common/MockData";
import {
  exportToExcel,
  exportToPDF,
} from "../../../components/common/ExportFile";

export default function MaintenanceDashboard() {
  const [searchText, setSearchText] = useState("");
  const [selectedFileType, setSelectedFileType] = useState("PDF");
  const [fileTypeOptions] = useState(["PDF", "Excel"]);

  // Stats state
  const [stats, setStats] = useState({ completed: 0, dueSoon: 0, overdue: 0 });

  // Fetch stats from MaintenancePerformance API
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(`${API_BASE}/api/tasks/getAll`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const result = await response.json();
        const tasks = result.data || [];

        const completed = tasks.filter((t) => t.status === "Completed").length;
        const dueSoon = tasks.filter(
          (t) =>
            t.status !== "Completed" &&
            t.dueDate &&
            new Date(t.dueDate) >= new Date() &&
            new Date(t.dueDate) <=
              new Date(new Date().setDate(new Date().getDate() + 3)),
        ).length;
        const overdue = tasks.filter(
          (t) =>
            t.status !== "Completed" &&
            t.dueDate &&
            new Date(t.dueDate) < new Date(),
        ).length;

        setStats({ completed, dueSoon, overdue });
      } catch (err) {
        console.error("Failed to fetch stats", err);
      }
    };

    fetchStats();
  }, []);

  const cards = [
    {
      key: "performance",
      title: "Performance Overview",
      component: <MaintenancePerformance />, // only fetches stats if needed
      keywords: ["performance", "overview"],
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
    .sort((a, b) => b.relevance - a.relevance)
    .filter((card) => searchText === "" || card.relevance > 0);

  return (
    <div
      style={{
        padding: 20,
        minHeight: "100vh",
        overflowY: "scroll",
        height: "100%",
      }}
    >
      {/* Search + Export Row */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }} align="middle">
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

        <Col xs={12} sm={8} md={6} lg={5}>
          <Select
            value={selectedFileType}
            onChange={setSelectedFileType}
            size="large"
            style={{ width: "100%" }}
            options={fileTypeOptions.map((type) => ({
              label: type,
              value: type,
            }))}
          />
        </Col>

        <Col xs={12} sm={8} md={6} lg={4}>
          <Button
            type="primary"
            icon={<ExportOutlined />}
            block
            onClick={() => {
              if (selectedFileType === "PDF") exportToPDF();
              else exportToExcel();
            }}
          >
            Export
          </Button>
        </Col>
      </Row>

      {/* Statistics Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic
              title="Completed Tasks"
              value={stats.completed}
              styles={{ content: { color: "#048a25" } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic
              title="Due Soon (next 3 days)"
              value={stats.dueSoon}
              styles={{ content: { color: "#faad14" } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic
              title="Overdue Tasks"
              value={stats.overdue}
              styles={{ content: { color: "#cf1322" } }}
            />
          </Card>
        </Col>
      </Row>

      {/* Dashboard Cards */}
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
