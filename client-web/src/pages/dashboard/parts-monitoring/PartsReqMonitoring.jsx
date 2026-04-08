import React, { useState, useMemo, useContext } from "react";
import { Input, Statistic, Card, Row, Col } from "antd";
import {
  SearchOutlined,
  FileDoneOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  SyncOutlined,
} from "@ant-design/icons";
import PRMCardView from "../../../components/tables/PRMCardView";
import { MOCK_WRS_RECORDS } from "../../../components/common/MockData";
import { AuthContext } from "../../../context/AuthContext";

export default function PartsRequisition() {
  const { user } = useContext(AuthContext);
  const isMMorOIC = ["maintenance manager", "officer-in-charge"].includes(
    user?.jobTitle?.toLowerCase(),
  );

  const [searchText, setSearchText] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all"); // For selectable cards

  const allRequisitionsWithCounts = useMemo(() => {
    return MOCK_WRS_RECORDS.map((record) => ({
      ...record,
      noOfItems: record.items?.length || 0,
      totalQty:
        record.items?.reduce((sum, item) => sum + item.quantity, 0) || 0,
    }));
  }, []);

  // Compute counts for cards
  const stats = useMemo(() => {
    return {
      total: allRequisitionsWithCounts.length,
      pending: allRequisitionsWithCounts.filter((r) => r.status === "Pending")
        .length,
      approved: allRequisitionsWithCounts.filter((r) => r.status === "Approved")
        .length,
      inProgress: allRequisitionsWithCounts.filter(
        (r) => r.status === "In Progress",
      ).length,
      completed: allRequisitionsWithCounts.filter(
        (r) => r.status === "Completed",
      ).length,
    };
  }, [allRequisitionsWithCounts]);

  // Filter based on search and selected card
  const filteredRequisitions = useMemo(() => {
    let data = allRequisitionsWithCounts;

    // Search filter
    if (searchText.trim()) {
      data = data.filter(
        (r) =>
          r.wrsNo.toLowerCase().includes(searchText.toLowerCase()) ||
          r.aircraft.toLowerCase().includes(searchText.toLowerCase()) ||
          r.status.toLowerCase().includes(searchText.toLowerCase()),
      );
    }

    // Card filter
    if (selectedStatus !== "all") {
      if (selectedStatus === "Approved/In Progress") {
        return data.filter(
          (r) => r.status === "Approved" || r.status === "In Progress",
        );
      }
      return data.filter((r) => r.status === selectedStatus);
    }

    return data;
  }, [searchText, allRequisitionsWithCounts, selectedStatus]);

  // Card definitions
  const cards = [
    {
      title: "Total",
      value: stats.total,
      icon: <FileDoneOutlined />,
      statusKey: "all",
      color: "#1890ff",
    },
    {
      title: "Pending",
      value: stats.pending,
      icon: <ClockCircleOutlined />,
      statusKey: "Pending",
      color: "#faad14",
    },
    {
      title: "Approved/In Progress",
      value: stats.approved + stats.inProgress,
      icon: <CheckCircleOutlined />,
      statusKey: "Approved/In Progress",
      color: "#13c2c2",
    },
    {
      title: "Completed",
      value: stats.completed,
      icon: <FileDoneOutlined />,
      statusKey: "Completed",
      color: "#52c41a",
    },
  ];

  return (
    <div
      style={{
        padding: 20,
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        overflowY: "auto",
        paddingBottom: 120,
      }}
    >
      {/* Search */}
      <Row>
        <Col xs={24} md={8}>
          <Input
            size="large"
            placeholder="Search by WRS No, aircraft, or status..."
            prefix={<SearchOutlined />}
            allowClear
            onChange={(e) => setSearchText(e.target.value)}
          />
        </Col>
      </Row>

      {/* Selectable Cards */}
      <Row gutter={[16, 16]} style={{ marginTop: 20, flexWrap: "wrap" }}>
        {cards.map((card) => (
          <Col
            key={card.statusKey}
            xs={12}
            sm={8}
            md={6}
            style={{ flexShrink: 0 }}
          >
            <Card
              hoverable
              onClick={() => setSelectedStatus(card.statusKey)}
              style={{
                border:
                  selectedStatus === card.statusKey
                    ? `2px solid ${card.color}`
                    : "1px solid #f0f0f0",
                cursor: "pointer",
              }}
            >
              <Statistic
                title={card.title}
                value={card.value}
                prefix={card.icon}
              />
            </Card>
          </Col>
        ))}
      </Row>

      {/* Table */}
      <Row style={{ marginTop: 20 }}>
        <Col span={24}>
          <PRMCardView data={filteredRequisitions} />
        </Col>
      </Row>
    </div>
  );
}
