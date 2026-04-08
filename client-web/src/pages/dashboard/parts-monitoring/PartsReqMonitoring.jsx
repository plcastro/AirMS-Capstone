import React, { useState, useMemo } from "react";
import { Input, Statistic, Card, Row, Col, Select, Tabs } from "antd";
import {
  SearchOutlined,
  FileDoneOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";
import PRMCardView from "../../../components/tables/PRMCardView";
import { MOCK_WRS_RECORDS } from "../../../components/common/MockData";

export default function PartsRequisition() {
  const [searchText, setSearchText] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all"); // For selectable cards
  const [dateSortOrder, setDateSortOrder] = useState("newest");
  const parseRequestedDate = (dateValue) => {
    const [month, day, year] = dateValue.split("/").map(Number);
    return new Date(year, month - 1, day).getTime();
  };

  const allRequisitionsWithCounts = useMemo(() => {
    return MOCK_WRS_RECORDS.map((record) => ({
      ...record,
      noOfItems: record.items?.length || 0,
      totalQty:
        record.items?.reduce((sum, item) => sum + item.quantity, 0) || 0,
    }));
  }, []);

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
      cancelled: allRequisitionsWithCounts.filter(
        (r) => r.status === "Cancelled",
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
        data = data.filter(
          (r) => r.status === "Approved" || r.status === "In Progress",
        );
      } else {
        data = data.filter((r) => r.status === selectedStatus);
      }
    }

    return [...data].sort((a, b) => {
      const firstDate = parseRequestedDate(a.dateRequested);
      const secondDate = parseRequestedDate(b.dateRequested);

      return dateSortOrder === "oldest"
        ? firstDate - secondDate
        : secondDate - firstDate;
    });
  }, [searchText, allRequisitionsWithCounts, selectedStatus, dateSortOrder]);

  // Card definitions
  const cards = [
    {
      title: "Total",
      value: stats.total,
      icon: <FileDoneOutlined />,
      statusKey: "all",
      color: "default",
    },
    {
      title: "Pending",
      value: stats.pending,
      icon: <ClockCircleOutlined />,
      statusKey: "Pending",
      color: "blue",
    },
    {
      title: "Approved",
      value: stats.approved,
      icon: <CheckCircleOutlined />,
      statusKey: "Approved",
      color: "cyan",
    },
    {
      title: "In Progress",
      value: stats.approved + stats.inProgress,
      icon: <CheckCircleOutlined />,
      statusKey: "In Progress",
      color: "orange",
    },
    {
      title: "Completed",
      value: stats.completed,
      icon: <FileDoneOutlined />,
      statusKey: "Completed",
      color: "green",
    },
    {
      title: "Cancelled",
      value: stats.cancelled,
      icon: <FileDoneOutlined />,
      statusKey: "Cancelled",
      color: "red",
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
      <Row gutter={[16, 16]} align="middle">
        <Col xs={24} md={8}>
          <Input
            size="large"
            placeholder="Search by WRS No, aircraft, or status..."
            prefix={<SearchOutlined />}
            allowClear
            onChange={(e) => setSearchText(e.target.value)}
          />
        </Col>
        <Col xs={24} md={6} lg={6}>
          <Select
            size="large"
            value={dateSortOrder}
            onChange={setDateSortOrder}
            style={{ width: "100%" }}
            options={[
              { value: "newest", label: "Date: Newest First" },
              { value: "oldest", label: "Date: Oldest First" },
            ]}
          />
        </Col>
      </Row>
      <Row gutter={[16, 16]} style={{ marginTop: 20, flexWrap: "wrap" }}>
        {cards.map((card) => (
          <Col
            key={card.statusKey}
            xs={12}
            sm={8}
            md={4}
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
                height: 120,
              }}
              variant="borderless"
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

      <Row style={{ marginTop: 20 }}>
        <Col span={24}>
          <PRMCardView data={filteredRequisitions} />
        </Col>
      </Row>
    </div>
  );
}
