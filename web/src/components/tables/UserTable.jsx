import React, { useState, useMemo } from "react";
import { Table, Button, Modal, Tag, Space, message } from "antd";

export default function UserTable({
  headers = [],
  data = [],
  onEditUser,
  onDeactivateUser,
  onReactivateUser,
  currentUserId,
}) {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalAction, setModalAction] = useState(""); // "deactivate" or "reactivate"
  const [selectedUser, setSelectedUser] = useState(null);

  // Show confirmation modal
  const showConfirmModal = (user, action) => {
    setSelectedUser(user);
    setModalAction(action);
    setIsModalVisible(true);
  };

  const handleConfirm = () => {
    if (!selectedUser) return;
    if (modalAction === "deactivate") {
      onDeactivateUser?.(selectedUser);
      message.success("User deactivated");
    } else if (modalAction === "reactivate") {
      onReactivateUser?.(selectedUser);
      message.success("User reactivated");
    }
    setIsModalVisible(false);
    setSelectedUser(null);
    setModalAction("");
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    setSelectedUser(null);
    setModalAction("");
  };

  // Convert headers to AntD column format
  const columns = useMemo(() => {
    const cols = headers.map((header) => {
      if (header.key === "actions") {
        return {
          title: header.label,
          key: "actions",
          render: (_, record) => (
            <Space>
              <Button
                type="primary"
                size="small"
                onClick={() => onEditUser?.(record)}
              >
                Edit
              </Button>

              {record.status === "deactivated" ? (
                <Button
                  type="default"
                  size="small"
                  onClick={() => showConfirmModal(record, "reactivate")}
                >
                  Reactivate
                </Button>
              ) : record.status === "active" && record._id !== currentUserId ? (
                <Button
                  type="danger"
                  size="small"
                  onClick={() => showConfirmModal(record, "deactivate")}
                >
                  Deactivate
                </Button>
              ) : null}
            </Space>
          ),
        };
      }

      if (header.key === "status") {
        return {
          title: header.label,
          dataIndex: "status",
          key: "status",
          render: (status) => {
            let color = "default";
            if (status === "active") color = "green";
            else if (status === "inactive") color = "orange";
            else if (status === "deactivated") color = "red";

            return <Tag color={color}>{status}</Tag>;
          },
        };
      }

      return {
        title: header.label,
        dataIndex: header.key,
        key: header.key,
        sorter: (a, b) => {
          const valA = a[header.key] ?? "";
          const valB = b[header.key] ?? "";
          return valA > valB ? 1 : -1;
        },
      };
    });

    return cols;
  }, [headers, currentUserId, onEditUser]);

  return (
    <>
      <Table
        columns={columns}
        dataSource={data}
        rowKey={(record) => record._id}
        pagination={{ pageSize: 10 }}
        scroll={{ x: "max-content" }}
      />

      <Modal
        title={
          modalAction === "deactivate" ? "Deactivate User" : "Reactivate User"
        }
        visible={isModalVisible}
        onOk={handleConfirm}
        onCancel={handleCancel}
        okText="Yes"
        cancelText="Cancel"
      >
        <p>
          Are you sure you want to {modalAction} user{" "}
          <strong>{selectedUser?.name}</strong>?
        </p>
      </Modal>
    </>
  );
}
