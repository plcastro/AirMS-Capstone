import React, { useState } from "react";
import { Table, Button, Tag } from "antd";

import { EditOutlined } from "@ant-design/icons";

export default function MLogTable({
  headers = [],
  data = [],
  columnWidths = {},
  onEditEntry,
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  // Map headers to AntD Table columns
  const columns = headers.map((header) => {
    // Action column
    if (header.key === "action") {
      return {
        title: header.label,
        key: header.key,
        width: columnWidths[header.key] || 140,
        align: "center",
        render: (_, record) => (
          <Button
            type="primary"
            block
            onClick={() => onEditEntry(record)}
            icon={<EditOutlined />}
          >
            Edit
          </Button>
        ),
      };
    }

    // Status column
    if (header.key === "status") {
      return {
        title: header.label,
        key: header.key,
        dataIndex: header.key,
        width: columnWidths[header.key] || 140,
        align: "center",
        render: (text) => {
          const value = typeof text === "object" ? JSON.stringify(text) : text;
          const color = value === "Verified" ? "green" : "volcano";
          return <Tag color={color}>{value || "Unverified"}</Tag>;
        },
      };
    }

    // Regular columns
    return {
      title: header.label,
      dataIndex: header.key,
      key: header.key,
      width: columnWidths[header.key] || 140,
      ellipsis: true,
      render: (text) => {
        if (!text || text === "N/A") return "N/A";

        if (typeof text === "object") return JSON.stringify(text);

        if (header.key === "defects" || header.key === "correctiveActionDone") {
          return text.length > 80 ? text.substring(0, 80) + "..." : text;
        }

        return text;
      },
    };
  });

  const handlePageChange = (page, pageSize) => {
    setCurrentPage(page);
    setPageSize(pageSize);
  };

  return (
    <Table
      columns={columns}
      dataSource={data}
      rowKey={(record, index) => record.id || index}
      pagination={{
        current: currentPage,
        pageSize,
        total: data.length,
        showSizeChanger: true,
        pageSizeOptions: ["5", "10", "15", "20"],
        onChange: handlePageChange,
        onShowSizeChange: handlePageChange,
        showQuickJumper: true,
        showTotal: (total, range) => `${range[0]}-${range[1]} of ${total}`,
      }}
      scroll={{ x: "max-content" }}
    />
  );
}
