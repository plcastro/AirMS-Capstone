import React, { useMemo, useState } from "react";
import { Button, Grid, Space, Tag, Tooltip, Typography } from "antd";
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  DownloadOutlined,
  EyeOutlined,
  FileDoneOutlined,
  InboxOutlined,
  ShoppingCartOutlined,
  SyncOutlined,
} from "@ant-design/icons";
import WRSModal from "../pagecomponents/WRSModal";
import DateOnlyCell from "../common/DateOnlyCell";
import ResponsiveTable from "../common/ResponsiveTable";

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

export default function PRMTable({
  data = [],
  loading = false,
  onUpdated,
  initialSelectedRecord = null,
  onExportExcel,
}) {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isModalVisible, setIsModalVisible] = useState(
    Boolean(initialSelectedRecord),
  );
  const [selectedWRS, setSelectedWRS] = useState(initialSelectedRecord);
  const [exportingRecordId, setExportingRecordId] = useState(null);
  const [viewedUpdates, setViewedUpdates] = useState({});

  const handleShowModal = (record) => {
    setSelectedWRS(record);
    setIsModalVisible(true);

    if (record?._id && record?.updatedAt) {
      setViewedUpdates((prev) => ({
        ...prev,
        [record._id]: record.updatedAt,
      }));
    }
  };
  const getRecordTimestamp = (value) => {
    if (!value) return 0;

    const timestamp = new Date(value).getTime();
    return Number.isNaN(timestamp) ? 0 : timestamp;
  };

  const isNewUpdate = (record) => {
    if (!record?._id || !record?.updatedAt) return false;

    const updatedAt = getRecordTimestamp(record.updatedAt);
    const dateRequested = getRecordTimestamp(record.dateRequested);
    const viewedAt = getRecordTimestamp(viewedUpdates[record._id]);

    return updatedAt > dateRequested && updatedAt > viewedAt;
  };

  const handlePageChange = (page, nextPageSize) => {
    setCurrentPage(page);
    setPageSize(nextPageSize);
  };

  const handleExportExcel = async (event, record) => {
    event.stopPropagation();
    if (!onExportExcel || exportingRecordId) return;

    setExportingRecordId(record._id);
    try {
      await onExportExcel(record);
    } finally {
      setExportingRecordId(null);
    }
  };

  const columns = useMemo(
    () => [
      {
        title: "WRS No.",
        dataIndex: "wrsNo",
        key: "wrsNo",
        width: 120,
        sorter: (a, b) =>
          String(a.wrsNo ?? "").localeCompare(String(b.wrsNo ?? "")),
        render: (value, record) => (
          <Space size={6}>
            {isNewUpdate(record) && (
              <Tooltip title="New update">
                <span
                  aria-label="New update"
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    backgroundColor: "#1677ff",
                    display: "inline-block",
                    flexShrink: 0,
                  }}
                />
              </Tooltip>
            )}

            <strong>{value || "N/A"}</strong>
          </Space>
        ),
      },

      {
        title: "Aircraft",
        dataIndex: "aircraft",
        key: "aircraft",
        width: 120,
        sorter: (a, b) =>
          String(a.aircraft ?? "").localeCompare(String(b.aircraft ?? "")),
      },
      {
        title: "Requester",
        key: "requester",
        width: 200,
        render: (_, record) =>
          record.staff?.employeeName || record.staff?.requisitioner || "N/A",
        sorter: (a, b) =>
          String(
            a.staff?.employeeName ?? a.staff?.requisitioner ?? "",
          ).localeCompare(
            String(b.staff?.employeeName ?? b.staff?.requisitioner ?? ""),
          ),
      },
      {
        title: "Date Requested",
        dataIndex: "dateRequested",
        key: "dateRequested",
        width: 150,
        render: (value) => (
          <DateOnlyCell value={value} fallback={value || "N/A"} />
        ),
      },
      {
        title: "Items",
        dataIndex: "noOfItems",
        key: "noOfItems",
        width: 50,
        align: "right",
        sorter: (a, b) => Number(a.noOfItems || 0) - Number(b.noOfItems || 0),
      },
      {
        title: "Total Qty",
        dataIndex: "totalQty",
        key: "totalQty",
        width: 100,
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
        width: onExportExcel ? 140 : 120,
        fixed: screens.lg ? "right" : undefined,
        render: (_, record) => (
          <Space size={6}>
            <Tooltip title="Review">
              <Button
                type="primary"
                size="small"
                aria-label="Review"
                icon={<EyeOutlined />}
                onClick={(event) => {
                  event.stopPropagation();
                  handleShowModal(record);
                }}
              />
            </Tooltip>
            {onExportExcel && (
              <Tooltip title="Export Excel">
                <Button
                  size="small"
                  aria-label="Export Excel"
                  icon={<DownloadOutlined />}
                  loading={exportingRecordId === record._id}
                  disabled={
                    Boolean(exportingRecordId) &&
                    exportingRecordId !== record._id
                  }
                  onClick={(event) => handleExportExcel(event, record)}
                />
              </Tooltip>
            )}
          </Space>
        ),
      },
    ],
    [exportingRecordId, onExportExcel, screens.lg, viewedUpdates],
  );

  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => {
      const aUpdated = isNewUpdate(a) ? getRecordTimestamp(a.updatedAt) : 0;

      const bUpdated = isNewUpdate(b) ? getRecordTimestamp(b.updatedAt) : 0;

      if (aUpdated !== bUpdated) {
        return bUpdated - aUpdated;
      }

      return (
        getRecordTimestamp(b.dateRequested) -
        getRecordTimestamp(a.dateRequested)
      );
    });
  }, [data, viewedUpdates]);

  return (
    <>
      <ResponsiveTable
        columns={columns}
        dataSource={sortedData}
        autoDateSort={false}
        rowKey={(record) => record._id}
        loading={loading}
        scroll={{ x: "max-content" }}
        size={"small"}
        onRow={(record) => ({
          onClick: () => handleShowModal(record),
          style: {
            cursor: "pointer",
            backgroundColor: isNewUpdate(record) ? "#f0f7ff" : undefined,
          },
        })}
        pagination={{
          current: currentPage,
          pageSize,
          total: sortedData.length,
          showSizeChanger: true,
          pageSizeOptions: ["10", "20", "50"],
          onChange: handlePageChange,
          onShowSizeChange: handlePageChange,
          showTotal: (total, range) => `${range[0]}-${range[1]} of ${total}`,
          showLessItems: isMobile,
          size: isMobile ? "small" : "default",
          placement: ["bottomRight"],
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
