import React, { useState } from "react";
import { Table } from "antd";
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
      scroll={{ x: "max-content", y: "100%" }}
      pagination={{
        current: currentPage,
        pageSize,
        total: data.length,
        showSizeChanger: true,
        pageSizeOptions: ["10", "15", "20"],
        onChange: handlePageChange,
        onShowSizeChange: handlePageChange,
        showTotal: (total, range) => `${range[0]}-${range[1]} of ${total}`,
        placement: "bottomEnd",
      }}
    />
  );
}
