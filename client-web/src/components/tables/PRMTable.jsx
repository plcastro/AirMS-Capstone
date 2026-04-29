import React, { useMemo, useState } from "react";
import { Button, Grid, Space, Table, Tag, Typography } from "antd";
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  EyeOutlined,
  FileDoneOutlined,
  InboxOutlined,
  ShoppingCartOutlined,
  SyncOutlined,
} from "@ant-design/icons";
import WRSModal from "../pagecomponents/WRSModal";

const { Paragraph } = Typography;
const { useBreakpoint } = Grid;

const getStatusMeta = (status) => {
  switch (status) {
    case "Parts Requested":
      return {
        color: "default",
        icon: <InboxOutlined />,
      };
    case "To Be Ordered":
      return {
        color: "orange",
        icon: <ShoppingCartOutlined />,
      };
    case "Availability Checked":
      return {
        color: "gold",
        icon: <ClockCircleOutlined />,
      };
    case "Ordered":
      return {
        color: "blue",
        icon: <SyncOutlined spin />,
      };
    case "Approved":
      return {
        color: "cyan",
        icon: <CheckCircleOutlined />,
      };
    case "Delivered":
      return {
        color: "green",
        icon: <FileDoneOutlined />,
      };
    case "Cancelled":
      return {
        color: "red",
        icon: <FileDoneOutlined />,
      };
    default:
      return {
        color: "default",
        icon: <InboxOutlined />,
      };
  }
};

const getStatusDisplayLabel = (status) =>
  status === "Ordered" ? "Restocked" : status || "N/A";

const parseTableDate = (dateValue) => {
  const parsed = new Date(dateValue);

  if (!Number.isNaN(parsed.getTime())) {
    return parsed.getTime();
  }

  const [month, day, year] = String(dateValue || "")
    .split("/")
    .map(Number);

  return new Date(year, month - 1, day).getTime() || 0;
};

export default function PRMTable({ data = [], loading = false, onUpdated }) {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedWRS, setSelectedWRS] = useState(null);

  const handleShowModal = (record) => {
    setSelectedWRS(record);
    setIsModalVisible(true);
  };

  const handlePageChange = (page, nextPageSize) => {
    setCurrentPage(page);
    setPageSize(nextPageSize);
  };

  const columns = useMemo(
    () => [
      {
        title: "WRS No.",
        dataIndex: "wrsNo",
        key: "wrsNo",
        width: 140,
        sorter: (a, b) => String(a.wrsNo ?? "").localeCompare(b.wrsNo ?? ""),
        render: (value) => <strong>{value || "N/A"}</strong>,
      },
      {
        title: "Aircraft",
        dataIndex: "aircraft",
        key: "aircraft",
        width: 130,
        sorter: (a, b) =>
          String(a.aircraft ?? "").localeCompare(String(b.aircraft ?? "")),
      },
      {
        title: "Requester",
        key: "requester",
        width: 220,
        render: (_, record) =>
          record.staff?.employeeName || record.staff?.requisitioner || "N/A",
        sorter: (a, b) =>
          String(a.staff?.employeeName ?? a.staff?.requisitioner ?? "").localeCompare(
            String(b.staff?.employeeName ?? b.staff?.requisitioner ?? ""),
          ),
      },
      {
        title: "Date Requested",
        dataIndex: "dateRequested",
        key: "dateRequested",
        width: 150,
        sorter: (a, b) =>
          parseTableDate(a.dateRequested) - parseTableDate(b.dateRequested),
      },
      {
        title: "Items",
        dataIndex: "noOfItems",
        key: "noOfItems",
        width: 100,
        align: "right",
        sorter: (a, b) => Number(a.noOfItems || 0) - Number(b.noOfItems || 0),
      },
      {
        title: "Total Qty",
        dataIndex: "totalQty",
        key: "totalQty",
        width: 110,
        align: "right",
        sorter: (a, b) => Number(a.totalQty || 0) - Number(b.totalQty || 0),
      },
      {
        title: "Requested Parts",
        key: "requestedParts",
        width: 320,
        render: (_, record) => {
          const firstItem = record.items?.[0];
          const remainingCount = Math.max((record.items?.length || 0) - 1, 0);

          if (!firstItem) {
            return "N/A";
          }

          return (
            <Space size={4} wrap>
              <Paragraph
                ellipsis={{ rows: 1 }}
                style={{ marginBottom: 0, maxWidth: 230 }}
              >
                {firstItem.particular || "N/A"}
              </Paragraph>
              {remainingCount > 0 && <Tag>+{remainingCount} more</Tag>}
            </Space>
          );
        },
      },
      {
        title: "Status",
        dataIndex: "status",
        key: "status",
        width: 180,
        filters: [
          { text: "Parts Requested", value: "Parts Requested" },
          { text: "Availability Checked", value: "Availability Checked" },
          { text: "To Be Ordered", value: "To Be Ordered" },
          { text: "Restocked", value: "Ordered" },
          { text: "Approved", value: "Approved" },
          { text: "Delivered", value: "Delivered" },
          { text: "Cancelled", value: "Cancelled" },
        ],
        onFilter: (value, record) => record.status === value,
        render: (status) => {
          const statusMeta = getStatusMeta(status);

          return (
            <Tag color={statusMeta.color} icon={statusMeta.icon}>
              {getStatusDisplayLabel(status)}
            </Tag>
          );
        },
      },
      {
        title: "Action",
        key: "action",
        width: 120,
        fixed: screens.lg ? "right" : undefined,
        render: (_, record) => (
          <Button
            type="primary"
            size="small"
            icon={<EyeOutlined />}
            onClick={(event) => {
              event.stopPropagation();
              handleShowModal(record);
            }}
          >
            Review
          </Button>
        ),
      },
    ],
    [screens.lg],
  );

  return (
    <>
      <Table
        columns={columns}
        dataSource={data}
        rowKey={(record) => record._id}
        size={isMobile ? "small" : "middle"}
        loading={loading}
        scroll={{ x: "max-content" }}
        onRow={(record) => ({
          onClick: () => handleShowModal(record),
          style: { cursor: "pointer" },
        })}
        pagination={{
          current: currentPage,
          pageSize,
          total: data.length,
          showSizeChanger: true,
          pageSizeOptions: ["10", "20", "50"],
          onChange: handlePageChange,
          onShowSizeChange: handlePageChange,
          showTotal: (total, range) => `${range[0]}-${range[1]} of ${total}`,
          showLessItems: isMobile,
          size: isMobile ? "small" : "default",
          placement: isMobile ? ["bottomCenter"] : ["bottomRight"],
        }}
      />

      <WRSModal
        visible={isModalVisible}
        selectedRecord={selectedWRS}
        onUpdated={onUpdated}
        onClose={() => {
          setIsModalVisible(false);
          setSelectedWRS(null);
        }}
      />
    </>
  );
}
