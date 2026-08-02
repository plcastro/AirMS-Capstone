import React, { useState } from "react";
import {
  Button,
  Card,
  Grid,
  Modal,
  Pagination,
  Space,
  Tooltip,
  Typography,
} from "antd";
import {
  DeleteOutlined,
  EditOutlined,
  FileSearchOutlined,
} from "@ant-design/icons";
import ResponsiveTable from "../common/ResponsiveTable";

const { Text } = Typography;
const { useBreakpoint } = Grid;

export default function FLogTable({
  headers = [],
  columns: providedColumns,
  data = [],
  dataSource,
  loading = false,
  rowKey,
  pagination,
  scroll,
  locale,
  renderCard,
  mobileCardBreakpoint = "xs",
  tableProps = {},
  userJobTitle,
  onEditLog,
  onDeleteLog,
  onShowLog,
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const screens = useBreakpoint();
  const records = dataSource || data;
  const isCardView =
    Boolean(renderCard) &&
    (mobileCardBreakpoint === "xs" ? screens.xs : !screens.md);

  const handlePageChange = (page, nextPageSize = pageSize) => {
    const nextPage = nextPageSize !== pageSize ? 1 : page;
    setCurrentPage(nextPage);
    setPageSize(nextPageSize);
    pagination?.onChange?.(nextPage, nextPageSize);
  };

  const handleDelete = (row) => {
    Modal.confirm({
      title: "Confirm Delete",
      content: "Are you sure you want to delete this log?",
      okText: "Yes",
      cancelText: "Cancel",
      onOk: () => onDeleteLog?.(row),
    });
  };

  const renderActions = (row) => {
    if (userJobTitle === "pilot") {
      return (
        <Space size={12}>
          <Tooltip title="Edit">
            <Button
              type="primary"
              size="small"
              aria-label="Edit"
              icon={<EditOutlined />}
              onClick={() => onEditLog?.(row)}
            />
          </Tooltip>
          <Tooltip title="Delete">
            <Button
              danger
              size="small"
              aria-label="Delete"
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(row)}
            />
          </Tooltip>
        </Space>
      );
    }

    return (
      <Tooltip title="Verify Details">
        <Button
          type="default"
          size="small"
          aria-label="Verify Details"
          icon={<FileSearchOutlined />}
          onClick={() => onShowLog?.(row)}
        />
      </Tooltip>
    );
  };

  const columns =
    providedColumns ||
    headers.map((col) => ({
      ...col,
      render:
        col.key === "action" ? (_, record) => renderActions(record) : undefined,
    }));

  const paginationConfig =
    pagination ||
    {
      current: currentPage,
      pageSize,
      total: records.length,
      showSizeChanger: true,
      pageSizeOptions: ["10", "15", "20"],
      onChange: handlePageChange,
      onShowSizeChange: handlePageChange,
      showQuickJumper: true,
      showTotal: (total, range) => `${range[0]}-${range[1]} of ${total}`,
      placement: "bottomEnd",
    };
  const resolvedCurrent = paginationConfig?.current || currentPage;
  const resolvedPageSize = paginationConfig?.pageSize || pageSize;
  const resolvedTotal = paginationConfig?.total || records.length;
  const maxPage = Math.max(1, Math.ceil(resolvedTotal / resolvedPageSize));
  const effectiveCurrent = Math.min(resolvedCurrent, maxPage);
  const pagedRecords =
    paginationConfig === false
      ? records
      : records.slice(
          (effectiveCurrent - 1) * resolvedPageSize,
          effectiveCurrent * resolvedPageSize,
        );

  if (isCardView) {
    return records.length ? (
      <Space orientation="vertical" size={10} style={{ width: "100%" }}>
        {pagedRecords.map(renderCard)}
        {paginationConfig !== false && resolvedTotal > resolvedPageSize ? (
          <Pagination
            current={effectiveCurrent}
            pageSize={resolvedPageSize}
            total={resolvedTotal}
            showLessItems
            showSizeChanger={paginationConfig.showSizeChanger}
            pageSizeOptions={paginationConfig.pageSizeOptions}
            size={paginationConfig.size || "small"}
            align="end"
            onChange={handlePageChange}
            onShowSizeChange={handlePageChange}
          />
        ) : null}
      </Space>
    ) : (
      <Card style={{ borderRadius: 10 }}>
        <Text type="secondary">{locale?.emptyText || "No flight logs found"}</Text>
      </Card>
    );
  }

  return (
    <ResponsiveTable
      columns={columns}
      dataSource={records}
      rowKey={rowKey || ((record) => record.index)}
      size={"small"}
      loading={loading}
      pagination={paginationConfig}
      scroll={scroll || { x: "max-content" }}
      locale={locale}
      {...tableProps}
    />
  );
}
