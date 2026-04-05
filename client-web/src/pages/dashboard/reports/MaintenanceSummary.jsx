import React, { useState } from "react";
import { Row, Col, Button, Tag, DatePicker, Space } from "antd";
import { CheckCircleOutlined, SyncOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import MSummaryTable from "../../../components/tables/MSummaryTable";

import RepairFrequencyChart from "../../../components/common/RepairFrequencyChart";

dayjs.extend(isBetween);

const { RangePicker } = DatePicker;

export default function MaintenanceSummary({
  summaryData = [],
  repairData = [],
}) {
  const [loading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [dateRange, setDateRange] = useState(null);

  const filteredData = summaryData.filter((item) => {
    const matchesSearch =
      item.aircraft.toLowerCase().includes(searchText.toLowerCase()) ||
      item.task.toLowerCase().includes(searchText.toLowerCase());

    let matchesDate = true;
    if (dateRange && dateRange[0] && dateRange[1]) {
      const itemDate = dayjs(item.date);
      matchesDate = itemDate.isBetween(dateRange[0], dateRange[1], "day", "[]");
    }

    return matchesSearch && matchesDate;
  });

  const headers = [
    {
      title: "Aircraft",
      dataIndex: "aircraft",
      key: "aircraft",
      render: (text) => <strong>{text}</strong>,
    },
    {
      title: "Date",
      dataIndex: "date",
      key: "date",
    },
    {
      title: "Task",
      dataIndex: "task",
      key: "task",
    },
    {
      title: "Assigned Mechanic",
      dataIndex: "assignedMechanic",
      key: "assignedMechanic",
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => {
        const isCompleted = status?.toLowerCase() === "completed";
        const isOngoing = status?.toLowerCase() === "ongoing";

        const color = isCompleted
          ? "success"
          : isOngoing
            ? "processing"
            : "default";
        const icon = isCompleted ? (
          <CheckCircleOutlined />
        ) : isOngoing ? (
          <SyncOutlined spin />
        ) : null;

        return (
          <Tag
            icon={icon}
            color={color}
            style={{
              fontWeight: 600,
              borderRadius: "4px",
              padding: "2px 8px",
            }}
          >
            {(status || "N/A").toUpperCase()}
          </Tag>
        );
      },
    },
  ];

  const getRangeLabel = () => {
    if (dateRange && dateRange[0] && dateRange[1]) {
      const diff = dateRange[1].diff(dateRange[0], "day");
      return `in the selected ${diff} days`;
    }
    return "in the last 30 days";
  };
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 10,
        marginBottom: 10,
      }}
    >
      <Row gutter={16} align="middle" justify="space-between">
        <Col xs={24} lg={16}>
          <Space size="large" wrap>
            <RangePicker
              onChange={(values) => setDateRange(values)}
              format="YYYY-MM-DD"
            />
            {(searchText || dateRange) && (
              <Button
                type="link"
                onClick={() => {
                  setSearchText("");
                  setDateRange(null);
                }}
              >
                Reset Filters
              </Button>
            )}
          </Space>
        </Col>
      </Row>
      <Row gutter={21}>
        <Col xs={24}>
          <RepairFrequencyChart
            data={repairData}
            title={`Aircraft repair frequency ${getRangeLabel()}`}
          />
        </Col>
        <Col xs={24}>
          <MSummaryTable
            headers={headers}
            data={filteredData}
            loading={loading}
          />
        </Col>
      </Row>
    </div>
  );
}
