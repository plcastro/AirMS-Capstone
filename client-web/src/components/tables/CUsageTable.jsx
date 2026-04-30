import React, { useState } from "react";
import { Table } from "antd";

export default function CUsageTable({ headers = [], data = [], loading }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const handlePageChange = (page, pageSize) => {
    setCurrentPage(page);
    setPageSize(pageSize);
  };

  return (
    <Table
      columns={headers}
      dataSource={data}
      rowKey={(record) =>
        record._id ||
        record.id ||
        `${record.rpc || record.aircraft || "unknown"}-${record.component || record.name || "item"}-${record.date || record.dateDiscovered || "na"}`
      }
      loading={loading}
      scroll={{ x: "max-content", y: "100%" }}
      pagination={{
        current: currentPage,
        pageSize,
        total: data.length,
        showSizeChanger: true,
        pageSizeOptions: ["5", "10", "15"],
        onChange: handlePageChange,
        onShowSizeChange: handlePageChange,
        showTotal: (total, range) => `${range[0]}-${range[1]} of ${total}`,
        placement: "bottomEnd",
      }}
    />
  );
}
