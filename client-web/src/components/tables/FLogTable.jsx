import React, { useState } from "react";
import { Button, Modal, Space, Tooltip } from "antd";
import {
  DeleteOutlined,
  EditOutlined,
  FileSearchOutlined,
} from "@ant-design/icons";
import ResponsiveTable from "../common/ResponsiveTable";

export default function FLogTable({
  headers = [],
  data = [],
  userJobTitle,
  onEditLog,
  onDeleteLog,
  onShowLog,
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const handlePageChange = (page, pageSize) => {
    setCurrentPage(page);
    setPageSize(pageSize);
  };

  const handleDelete = (row) => {
    Modal.confirm({
      title: "Confirm Delete",
      content: "Are you sure you want to delete this log?",
      okText: "Yes",
      cancelText: "Cancel",
      onOk: () => onDeleteLog?.(row),
    });
  };

  const renderActions = (row) => {
    if (userJobTitle === "pilot") {
      return (
        <Space size={12}>
          <Tooltip title="Edit">
            <Button
              type="primary"
              size="small"
              aria-label="Edit"
              icon={<EditOutlined />}
              onClick={() => onEditLog?.(row)}
            />
          </Tooltip>
          <Tooltip title="Delete">
            <Button
              danger
              size="small"
              aria-label="Delete"
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(row)}
            />
          </Tooltip>
        </Space>
      );
    }

    return (
      <Tooltip title="Verify Details">
        <Button
          type="default"
          size="small"
          aria-label="Verify Details"
          icon={<FileSearchOutlined />}
          onClick={() => onShowLog?.(row)}
        />
      </Tooltip>
    );
  };

  const columns = headers.map((col) => ({
    ...col,
    render:
      col.key === "action" ? (_, record) => renderActions(record) : undefined,
  }));

  return (
    <ResponsiveTable
      columns={columns}
      dataSource={data}
      rowKey={(record) => record.index}
      size={"small"}
      pagination={{
        current: currentPage,
        pageSize,
        total: data.length,
        showSizeChanger: true,
        pageSizeOptions: ["10", "15", "20"],
        onChange: handlePageChange,
        onShowSizeChange: handlePageChange,
        showQuickJumper: true,
        showTotal: (total, range) => `${range[0]}-${range[1]} of ${total}`,
        placement: "bottomEnd",
      }}
      scroll={{ x: "max-content" }}
    />
  );
}
