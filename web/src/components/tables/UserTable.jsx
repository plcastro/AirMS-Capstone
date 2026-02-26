import React, { useMemo, useState } from "react";
import { Table, Button, Tag, Space, Popconfirm, message } from "antd";
import { EditOutlined } from "@ant-design/icons";
import "../common/PaginationFix.css";

export default function UserTable({
  headers = [],
  data = [],
  onEditUser,
  onDeactivateUser,
  onReactivateUser,
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
  }, [headers, currentUserId, onEditUser, onDeactivateUser, onReactivateUser]);

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
