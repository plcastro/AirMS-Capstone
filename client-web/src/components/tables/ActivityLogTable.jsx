import React, { useState } from "react";
import { Table, Grid, Tag } from "antd";
import dayjs from "dayjs";
const { useBreakpoint } = Grid;

const getPlatformColor = (platform) => {
  if (!platform) return "N/A";
  if (platform.toUpperCase().includes("WEB")) return "blue";
  if (platform.toUpperCase().includes("MOBILE")) return "purple";
  return "geekblue";
};

const getBaseColor = (base) => {
  if (!base) return "N/A";
  if (base.toUpperCase().includes("MANILA")) return "green";
  if (base.toUpperCase().includes("CEBU")) return "orange";
  if (base.toUpperCase().includes("CDO")) return "brown";
  return "cyan";
};

const headers = [
  {
    title: "#",
    dataIndex: "index",
    key: "index",
    width: 15,
  },

  {
    title: "Action Made",
    dataIndex: "actionMade",
    key: "actionMade",
    width: 500,
    flexWrap: "wrap",
  },
  {
    title: "Performed by",
    dataIndex: "username",
    key: "username",
    width: 100,
    render: (text) => <b style={{ color: "#1890ff" }}>{text}</b>,
  },
  {
    title: "Platform",
    dataIndex: "platform",
    key: "platform",
    width: 100,
    render: (text) => <Tag color={getPlatformColor(text)}>{text}</Tag>,
  },
  {
    title: "Base",
    dataIndex: "base",
    key: "base",
    width: 100,
    render: (text) => <Tag color={getBaseColor(text)}>{text}</Tag>,
  },
  {
    title: "Date and Time",
    dataIndex: "dateTime",
    key: "dateTime",
    sorter: (a, b) => new Date(a.dateTime) - new Date(b.dateTime),
    width: 260,
    render: (_, record) =>
      record.displayDateTime ||
      (record.dateTime
        ? dayjs(record.dateTime).format("MMM DD, YYYY hh:mm A")
        : "N/A"),
  },
];
export default function ActivityLogTable({ data = [], loading }) {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const handlePageChange = (page, nextPageSize) => {
    setCurrentPage(page);
    setPageSize(nextPageSize);
  };

  return (
    <Table
      columns={headers}
      dataSource={data}
      rowKey={(record) => record._id || record.index}
      loading={loading}
      size={isMobile ? "small" : "middle"}
      scroll={{ x: 980 }}
      pagination={{
        current: currentPage,
        pageSize,
        total: data.length,
        showSizeChanger: true,
        pageSizeOptions: ["10", "15", "20"],
        onChange: handlePageChange,
        onShowSizeChange: handlePageChange,
        showTotal: (total, range) => `${range[0]}-${range[1]} of ${total}`,
        showLessItems: isMobile,
        size: isMobile ? "small" : "default",
        placement: isMobile ? ["bottomCenter"] : ["bottomRight"],
      }}
    />
  );
}
