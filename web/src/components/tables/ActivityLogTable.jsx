import React, { useMemo, useState } from "react";
import { Table, Button, Tag, Space, Popconfirm, message } from "antd";
import { EditOutlined } from "@ant-design/icons";
import "../common/PaginationFix.css";

export default function ActivityLogTable({
  headers = [],
  data = [],
  loading = false,
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  return (
    <Table
      columns={headers}
      dataSource={data}
      rowKey={(record) => record._id}
      loading={loading}
      scroll={{ x: "max-content" }}
      pagination={{
        pageSize: pageSize,
        showSizeChanger: true,
        pageSizeOptions: ["10", "20", "50"],
        current: currentPage,
        onChange: (page) => setCurrentPage(page),
        placement: "bottomEnd",
      }}
    />
  );
}
