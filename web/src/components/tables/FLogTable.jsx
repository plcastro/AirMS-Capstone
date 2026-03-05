import React, { useState } from "react";
import { Table, Button, Modal } from "antd";

export default function FLogTable({
  headers = [],
  data = [],
  userPosition,
  onEditLog,
  onDeleteLog,
  onShowLog,
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const [logToModify, setLogToModify] = useState(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const handlePageChange = (page, pageSize) => {
    setCurrentPage(page);
    setPageSize(pageSize);
  };
  const handleDelete = (row) => {
    setLogToModify(row);
    Modal.confirm({
      title: "Confirm Delete",
      content: "Are you sure you want to delete this log?",
      okText: "Yes",
      cancelText: "Cancel",
      onOk: () => setShowApproveModal(true),
    });
  };

  const handleApproveDelete = (username, password) => {
    console.log("Delete approved with:", { username, password });
    if (logToModify) onDeleteLog?.(logToModify);
    setShowApproveModal(false);
    setLogToModify(null);
  };

  const handleApproveCancel = () => {
    setShowApproveModal(false);
    setLogToModify(null);
  };

  const renderActions = (row) => {
    if (userPosition === "pilot") {
      return (
        <>
          <Button type="primary" size="small" onClick={() => onEditLog?.(row)}>
            Edit
          </Button>
          <Button
            type="danger"
            size="small"
            style={{ marginLeft: 6 }}
            onClick={() => handleDelete(row)}
          >
            Delete
          </Button>
        </>
      );
    }

    return (
      <Button type="default" size="small" onClick={() => onShowLog?.(row)}>
        Verify Details
      </Button>
    );
  };

  const columns = headers.map((col) => ({
    ...col,
    // This ensures your specific render logic for actions still works
    render: (text, record) =>
      col.key === "action"
        ? renderActions(record)
        : col.render
          ? col.render(text, record)
          : text || "-",
  }));

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
