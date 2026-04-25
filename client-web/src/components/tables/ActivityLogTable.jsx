import React, { useState } from "react";
import { Table, Grid } from "antd";
const { useBreakpoint } = Grid;
const headers = [
  {
    title: "#",
    dataIndex: "index",
    key: "index",
    width: 60,
  },

  {
    title: "Action Made",
    dataIndex: "actionMade",
    key: "actionMade",
    width: 500,
    ellipsis: true,
  },
  {
    title: "Performed by",
    dataIndex: "username",
    key: "username",
    width: 260,
    render: (text) => <b style={{ color: "#1890ff" }}>{text}</b>,
  },
  {
    title: "Date and Time",
    dataIndex: "dateTime",
    key: "dateTime",
    sorter: (a, b) => new Date(a.dateTime) - new Date(b.dateTime),
    width: 260,
  },
];
export default function ActivityLogTable({
  data = [],
  loading,
}) {
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
        position: isMobile ? ["bottomCenter"] : ["bottomRight"],
      }}
    />
  );
}
