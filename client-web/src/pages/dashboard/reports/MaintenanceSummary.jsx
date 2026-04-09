import React, { useState } from "react";
import { Row, Col, Button, Tag, DatePicker, Space } from "antd";
import { CheckCircleOutlined, SyncOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import MSummaryTable from "../../../components/tables/MSummaryTable";

import RepairFrequencyChart from "../../../components/common/RepairFrequencyChart";

dayjs.extend(isBetween);

const { RangePicker } = DatePicker;

const formatDate = (value) => {
  if (!value) return "";

  const date = new Date(value);
  if (isNaN(date.getTime())) return "";

  return date.toLocaleDateString("en-CA");
};

export default function MaintenanceSummary({ tasks = [], loading = false }) {
  const [searchText, setSearchText] = useState("");
  const [dateRange, setDateRange] = useState(null);

  const mappedTasks = tasks.map((task, index) => ({
    key: task._id || task.id || `${task.title}-${index}`,
    aircraft: task.aircraft || "---",
    date: formatDate(task.date || task.completedAt || task.createdAt || task.dueDate),
    task: task.title || task.summary?.category || "---",
    assignedMechanic:
      task.assignedMechanic || task.assignedToName || task.assignedTo || "---",
    status: task.status || "Pending",
  }));

  const filteredData = mappedTasks.filter((item) => {
    const matchesSearch =
      item.aircraft.toLowerCase().includes(searchText.toLowerCase()) ||
      item.task.toLowerCase().includes(searchText.toLowerCase());

    let matchesDate = true;
    if (dateRange && dateRange[0] && dateRange[1] && item.date) {
      const itemDate = dayjs(item.date);
      matchesDate = itemDate.isBetween(dateRange[0], dateRange[1], "day", "[]");
    }

    return matchesSearch && matchesDate;
  });

  const visibleTaskKeys = new Set(filteredData.map((item) => item.key));

  const repairData = tasks
    .filter((task, index) =>
      visibleTaskKeys.has(task._id || task.id || `${task.title}-${index}`),
    )
    .reduce((acc, task) => {
      const rawDate = task.date || task.completedAt || task.createdAt || task.dueDate;
      const aircraft = task.aircraft || "Unassigned";
      const parsedDate = new Date(rawDate);

      if (!rawDate || isNaN(parsedDate.getTime())) return acc;

      const label = parsedDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });

      const existing = acc.find((entry) => entry.date === label);
      if (existing) {
        existing[aircraft] = (existing[aircraft] || 0) + 1;
      } else {
        acc.push({ date: label, [aircraft]: 1 });
      }

      return acc;
    }, [])
    .sort(
      (a, b) =>
        new Date(`2000 ${a.date}`).getTime() - new Date(`2000 ${b.date}`).getTime(),
    );

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
        const normalizedStatus = status?.toLowerCase();
        const isCompleted = normalizedStatus === "completed";
        const isOngoing =
          normalizedStatus === "ongoing" || normalizedStatus === "pending";

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
