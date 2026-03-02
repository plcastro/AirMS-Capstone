import React, { useState } from "react";
import { Table, Button, Modal, Space } from "antd";

export default function InventoryTable({
  headers = [],
  data = [],
  onEditComponent,
  onDeleteComponent, // new prop
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortedInfo, setSortedInfo] = useState({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [componentToModify, setComponentToModify] = useState(null);

  // Handlers for confirm modal
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

  // Columns conversion from headers
  const columns = headers.map((header) => {
    if (header.key === "actions") {
      return {
        title: "Action",
        key: "actions",
        align: "center",
        render: (_, record) => (
          <Space>
            <Button type="primary" onClick={() => onEditComponent(record)}>
              Edit
            </Button>
            <Button
              type="default"
              danger
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
                textAlign: "center",
                borderRadius: 6,
                padding: "2px 6px",
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
      sorter: (a, b) =>
        (a[header.key] ?? "")
          .toString()
          .localeCompare((b[header.key] ?? "").toString()),
      sortOrder: sortedInfo.columnKey === header.key && sortedInfo.order,
    };
  });

  return (
    <>
      <Table
        columns={columns}
        dataSource={data}
        rowKey={(record) => record.id || record.index}
        pagination={{
          current: currentPage,
          pageSize,
          total: data.length,
          showSizeChanger: true,
          onChange: (page, size) => {
            setCurrentPage(page);
            setPageSize(size);
          },
        }}
        onChange={(_, __, sorter) => setSortedInfo(sorter)}
      />

      <Modal
        visible={showDeleteConfirm}
        title="Delete Component"
        onOk={confirmDelete}
        onCancel={cancelDelete}
        okText="Yes, delete"
        cancelText="Cancel"
      >
        <p>Are you sure you want to delete this component?</p>
      </Modal>
    </>
  );
}
