import React, { useMemo, useState } from "react";
import { Table, Button, Tag, Space, Grid, Dropdown, Modal } from "antd";
import { EditOutlined, MoreOutlined } from "@ant-design/icons";

const { useBreakpoint } = Grid;

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
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const columns = useMemo(() => {
    return headers.map((header) => {
      if (header.key === "actions") {
        return {
          title: header.label,
          key: "actions",
          render: (_, record) => {
            const moreActions = [];

            if (record.status === "deactivated") {
              moreActions.push({
                key: "reactivate",
                label: "Reactivate",
                title: "Reactivate this user?",
                action: () => onReactivateUser?.(record),
              });
            } else if (record.status === "inactive") {
              moreActions.push({
                key: "resend",
                label: "Resend",
                title: "Resend activation credentials?",
                action: () => onResendInvite?.(record),
              });

              if (record.invitationStatus === "expired") {
                moreActions.push({
                  key: "extend",
                  label: "Extend 24h",
                  title: "Extend invitation expiry by 24 hours?",
                  action: () => onExtendInvite?.(record),
                });
              }

              if (record.invitationStatus !== "revoked") {
                moreActions.push({
                  key: "revoke",
                  label: "Revoke Invite",
                  title: "Revoke this invitation?",
                  action: () => onRevokeInvite?.(record),
                  danger: true,
                });
              }
            } else if (record.status === "active" && record._id !== currentUserId) {
              moreActions.push({
                key: "deactivate",
                label: "Deactivate",
                title: "Deactivate this user?",
                action: () => onDeactivateUser?.(record),
                danger: true,
              });
            }

            const menuItems = moreActions.map((item) => ({
              key: item.key,
              label: item.label,
              danger: item.danger,
            }));

            return (
              <Space>
                <Button
                  type="primary"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => onEditUser?.(record)}
                >
                  Edit
                </Button>

                <Dropdown
                  trigger={["click"]}
                  menu={{
                    items: menuItems,
                    onClick: ({ key }) => {
                      const selected = moreActions.find((item) => item.key === key);
                      if (!selected) return;

                      Modal.confirm({
                        title: selected.title,
                        onOk: selected.action,
                        okText: "Confirm",
                      });
                    },
                  }}
                >
                  <Button size="small" icon={<MoreOutlined />} disabled={!menuItems.length} />
                </Dropdown>
              </Space>
            );
          },
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
      size={isMobile ? "small" : "middle"}
      loading={loading}
      scroll={{ x: "max-content" }}
      pagination={{
        pageSize: pageSize,
        showSizeChanger: true,
        pageSizeOptions: ["10", "20", "50"],
        current: currentPage,
        onChange: (page) => setCurrentPage(page),
        showLessItems: isMobile,
        size: isMobile ? "small" : "default",
        placement: isMobile ? "bottom" : "bottomEnd",
      }}
    />
  );
}
