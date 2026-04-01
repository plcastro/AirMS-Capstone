import React, { useState } from "react";
import { Table } from "antd";

export default function ActivityLogTable({ headers = [], data = [], loading }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const handlePageChange = (page, pageSize) => {
    setCurrentPage(page);
    setPageSize(pageSize);
  };
  return (
    <Table
      columns={headers}
      dataSource={data}
      rowKey={(record) => record.index || record._id}
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
