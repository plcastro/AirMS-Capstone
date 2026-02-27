import React, { useState } from "react";
import { Table, Button, Modal } from "antd";
import "../common/PaginationFix.css";
export default function FLogTable({
  headers = [],
  data = [],
  userPosition,
  onEditLog,
  onDeleteLog,
  onShowLog,
}) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const [logToModify, setLogToModify] = useState(null);
  const [showApproveModal, setShowApproveModal] = useState(false);

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
    if (userPosition === "Pilot") {
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

  const columns = [
    ...headers.map((header) => ({
      title: header.label,
      dataIndex: header.key,
      key: header.key,
      render: (text, record) =>
        header.key === "defectAction" || header.key === "technicalAction"
          ? renderActions(record)
          : text || "-",
      align:
        header.key === "index" ||
        header.key === "aircraft" ||
        header.key === "tailNum" ||
        header.numeric
          ? "center"
          : "left",
    })),
  ];

  return (
    <>
      <Table
        columns={columns}
        dataSource={data}
        rowKey={(record) => record.id || record.index}
        pagination={{
          current: page,
          pageSize,
          onChange: (p, ps) => {
            setPage(p);
            setPageSize(ps);
          },
          pageSizeOptions: ["5", "10", "15"],
          showSizeChanger: true,
        }}
      />

      {/* Approval Modal for delete
      <ApproveMaintenance
        visible={showApproveModal}
        aircraftNumber={logToModify?.tailNum || logToModify?.aircraft || "---"}
        onConfirm={handleApproveDelete}
        onCancel={handleApproveCancel}
      /> */}
    </>
  );
}
