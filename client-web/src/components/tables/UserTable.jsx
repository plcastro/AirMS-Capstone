import React, { useMemo, useState } from "react";
import { Table, Button, Tag, Space, Popconfirm, message } from "antd";
import { EditOutlined } from "@ant-design/icons";

export default function UserTable({
  headers = [],
  data = [],
  onEditUser,
  onDeactivateUser,
  onReactivateUser,
  onResendInvite,
  onExtendInvite,
  onRevokeInvite,
  currentUserId,
  loading = false,
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const columns = useMemo(() => {
    return headers.map((header) => {
      if (header.key === "actions") {
        return {
          title: header.label,
          key: "actions",
          fixed: header.fixed,
          width: header.width,
          render: (_, record) => (
            <Space>
              <Button
                type="primary"
                size="small"
                icon={<EditOutlined />}
                onClick={() => onEditUser?.(record)}
                style={{ width: 100 }}
              >
                Edit
              </Button>

              {record.status === "deactivated" ? (
                <Popconfirm
                  title="Reactivate this user?"
                  onConfirm={() => {
                    onReactivateUser?.(record);
                    message.success("User reactivated");
                  }}
                >
                  <Button size="small">Reactivate</Button>
                </Popconfirm>
              ) : record.status === "inactive" ? (
                <>
                  <Popconfirm
                    title="Resend activation credentials?"
                    onConfirm={() => onResendInvite?.(record)}
                  >
                    <Button size="small">Resend</Button>
                  </Popconfirm>
                  {record.invitationStatus === "expired" && (
                    <Popconfirm
                      title="Extend invitation expiry by 24 hours?"
                      onConfirm={() => onExtendInvite?.(record)}
                    >
                      <Button size="small">Extend 24h</Button>
                    </Popconfirm>
                  )}
                  {record.invitationStatus !== "revoked" && (
                    <Popconfirm
                      title="Revoke this invitation?"
                      onConfirm={() => onRevokeInvite?.(record)}
                    >
                      <Button danger size="small">
                        Revoke Invite
                      </Button>
                    </Popconfirm>
                  )}
                </>
              ) : record.status === "active" && record._id !== currentUserId ? (
                <Popconfirm
                  title="Deactivate this user?"
                  onConfirm={() => {
                    onDeactivateUser?.(record);
                    message.success("User deactivated");
                  }}
                >
                  <Button danger size="small" style={{ width: 100 }}>
                    Deactivate
                  </Button>
                </Popconfirm>
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
          filters: [
            { text: "Active", value: "active" },
            { text: "Inactive", value: "inactive" },
            { text: "Deactivated", value: "deactivated" },
          ],
          onFilter: (value, record) => record.status === value,
          render: (status) => {
            let color = "default";
            if (status === "active") color = "green";
            if (status === "inactive") color = "orange";
            if (status === "deactivated") color = "red";
            return <Tag color={color}>{status}</Tag>;
          },
        };
      }

      if (header.key === "invitationStatus") {
        return {
          title: header.label,
          dataIndex: "invitationStatus",
          key: "invitationStatus",
          render: (invitationStatus, record) => {
            if (record.status === "active")
              return <Tag color="green">claimed</Tag>;
            if (!invitationStatus) return "N/A";

            let color = "default";
            if (invitationStatus === "pending") color = "blue";
            if (invitationStatus === "expired") color = "orange";
            if (invitationStatus === "claimed") color = "green";
            if (invitationStatus === "revoked") color = "red";
            return <Tag color={color}>{invitationStatus}</Tag>;
          },
        };
      }

      if (header.key === "invitationExpiresAt") {
        return {
          title: header.label,
          dataIndex: "invitationExpiresAt",
          key: "invitationExpiresAt",
          render: (value, record) => {
            if (record.status === "active") return "N/A";
            return value ? new Date(value).toLocaleString() : "N/A";
          },
          sorter: (a, b) =>
            new Date(a.invitationExpiresAt || 0).getTime() -
            new Date(b.invitationExpiresAt || 0).getTime(),
        };
      }

      return {
        title: header.label,
        dataIndex: header.key,
        key: header.key,
        sorter: (a, b) =>
          String(a[header.key] ?? "").localeCompare(
            String(b[header.key] ?? ""),
          ),
      };
    });
  }, [
    headers,
    currentUserId,
    onEditUser,
    onDeactivateUser,
    onReactivateUser,
    onResendInvite,
    onExtendInvite,
    onRevokeInvite,
  ]);

  return (
    <Table
      columns={columns}
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
