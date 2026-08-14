import React, { useState } from "react";
import { Grid, Tag, Typography } from "antd";
import ResponsiveTable from "../common/ResponsiveTable";
import DateTimeCell from "../common/DateTimeCell";
const { useBreakpoint } = Grid;
const { Text } = Typography;

const getPlatformColor = (platform) => {
  if (platform.toUpperCase().includes("WEB")) return "blue";
  if (platform.toUpperCase().includes("MOBILE")) return "purple";
  return "geekblue";
};

const getBaseColor = (base) => {
  if (base.toUpperCase().includes("MANILA")) return "green";
  if (base.toUpperCase().includes("CEBU")) return "orange";
  if (base.toUpperCase().includes("CDO")) return "brown";
  return "cyan";
};

const renderContextValue = (value, getColor) => {
  const normalized = String(value || "")
    .trim()
    .toUpperCase();
  if (!normalized) {
    return <Text type="secondary">Not captured</Text>;
  }
  return <Tag color={getColor(normalized)}>{normalized}</Tag>;
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
    width: 120,
    render: (text) => <b style={{ color: "#1890ff" }}>{text}</b>,
  },
  {
    title: "Platform",
    dataIndex: "platform",
    key: "platform",
    width: 100,
    render: (text) => renderContextValue(text, getPlatformColor),
  },
  {
    title: "Base",
    dataIndex: "base",
    key: "base",
    width: 100,
    render: (text) => renderContextValue(text, getBaseColor),
  },
  {
    title: "Date and Time",
    dataIndex: "dateTime",
    key: "dateTime",
    sorter: (a, b) => new Date(a.dateTime) - new Date(b.dateTime),
    width: 100,
    render: (_, record) =>
      (
        <DateTimeCell
          value={record.dateTime}
          fallback={record.displayDateTime || "N/A"}
        />
      ),
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
    <ResponsiveTable
      columns={headers}
      dataSource={data}
      rowKey={(record) => record._id || record.index}
      loading={loading}
      size={"small"}
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
        placement: "bottomEnd",
      }}
    />
  );
}
