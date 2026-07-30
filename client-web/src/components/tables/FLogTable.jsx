import React, { useState } from "react";
import { Button, Card, Grid, Modal, Space, Tooltip, Typography } from "antd";
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

  const handlePageChange = (page, pageSize) => {
    setCurrentPage(page);
    setPageSize(pageSize);
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

  if (isCardView) {
    return records.length ? (
      <div>{records.map(renderCard)}</div>
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
