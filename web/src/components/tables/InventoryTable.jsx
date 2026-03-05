import React, { useState } from "react";
import { Table, Button, Modal, Space } from "antd";

export default function InventoryTable({
  headers = [],
  data = [],
  onEditComponent,
  onDeleteComponent,
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [sortedInfo, setSortedInfo] = useState({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [componentToModify, setComponentToModify] = useState(null);

  const handlePageChange = (page, size) => {
    setCurrentPage(page);
    setPageSize(size);
  };

  const confirmDelete = () => {
    if (componentToModify && onDeleteComponent) {
      onDeleteComponent(componentToModify.id);
    }
    setShowDeleteConfirm(false);
    setComponentToModify(null);
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setComponentToModify(null);
  };

  const columns = headers.map((header) => {
    if (header.key === "actions") {
      return {
        title: "Action",
        key: "actions",
        align: "center",
        width: 160,
        render: (_, record) => (
          <Space wrap>
            <Button
              type="primary"
              size="small"
              onClick={() => onEditComponent(record)}
            >
              Edit
            </Button>
            <Button
              danger
              size="small"
              onClick={() => {
                setComponentToModify(record);
                setShowDeleteConfirm(true);
              }}
            >
              Delete
            </Button>
          </Space>
        ),
      };
    }

    if (header.key === "stockLevel") {
      return {
        title: header.label,
        dataIndex: header.key,
        key: header.key,
        align: "center",
        width: 120,
        sorter: (a, b) =>
          (a[header.key] ?? "").localeCompare(b[header.key] ?? ""),
        render: (text) => {
          let color = "#087e64";
          const level = text?.toLowerCase();
          if (level === "critical") color = "#b41010";
          if (level === "low") color = "#ff9900";

          return (
            <div
              style={{
                backgroundColor: color,
                color: "#fff",
                fontWeight: "bold",
                borderRadius: 6,
                padding: "4px 8px",
                textAlign: "center",
              }}
            >
              {level ? level.charAt(0).toUpperCase() + level.slice(1) : "-"}
            </div>
          );
        },
      };
    }

    return {
      title: header.label,
      dataIndex: header.key,
      key: header.key,
      align: header.numeric ? "center" : "left",
      ellipsis: true,
      sorter: (a, b) =>
        (a[header.key] ?? "")
          .toString()
          .localeCompare((b[header.key] ?? "").toString()),
      sortOrder: sortedInfo.columnKey === header.key && sortedInfo.order,
    };
  });

  return (
    <div style={{ width: "100%" }}>
      <Table
        columns={columns}
        dataSource={data}
        rowKey={(record) => record.id || record.index}
        style={{ width: "100%" }}
        tableLayout="auto"
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
        scroll={{ x: "100%" }}
        onChange={(_, __, sorter) => setSortedInfo(sorter)}
      />

      <Modal
        open={showDeleteConfirm}
        title="Delete Component"
        onOk={confirmDelete}
        onCancel={cancelDelete}
        okText="Yes, delete"
        cancelText="Cancel"
      >
        <p>Are you sure you want to delete this component?</p>
      </Modal>
    </div>
  );
}
