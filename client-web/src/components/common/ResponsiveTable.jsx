import React, { useMemo, useState } from "react";
import {
  Card,
  Empty,
  Grid,
  Pagination,
  Spin,
  Space,
  Table,
  Typography,
} from "antd";

const { Text } = Typography;
const { useBreakpoint } = Grid;

const ACTION_KEYS = new Set(["action", "actions", "operation", "operations"]);
const ACTION_BUTTON_COLORS = {
  danger: {
    background: "#ff4d4f",
    borderColor: "#ff4d4f",
    color: "#fff",
  },
  edit: {
    background: "#faad14",
    borderColor: "#faad14",
    color: "#1f1f1f",
  },
  more: {
    background: "#f0f2f5",
    borderColor: "#d9d9d9",
    color: "#344054",
  },
  primary: {
    background: "#1677ff",
    borderColor: "#1677ff",
    color: "#fff",
  },
  success: {
    background: "#048a25",
    borderColor: "#048a25",
    color: "#fff",
  },
  warning: {
    background: "#fa8c16",
    borderColor: "#fa8c16",
    color: "#fff",
  },
};

const getColumnKey = (column, index) =>
  column.key || column.dataIndex || `column-${index}`;

const getTitleText = (title) =>
  typeof title === "string" || typeof title === "number" ? String(title) : "";

const getValueByPath = (record, dataIndex) => {
  if (!dataIndex) return undefined;
  const path = Array.isArray(dataIndex)
    ? dataIndex
    : String(dataIndex).split(".");
  return path.reduce((value, key) => value?.[key], record);
};

const flattenColumns = (columns = []) =>
  columns.flatMap((column) =>
    Array.isArray(column.children) && column.children.length
      ? flattenColumns(column.children)
      : column,
  );

const getRowKeyValue = (rowKey, record, index) => {
  if (typeof rowKey === "function") return rowKey(record, index);
  if (typeof rowKey === "string") return getValueByPath(record, rowKey);
  return record?.key ?? record?._id ?? record?.id ?? index;
};

const renderColumnValue = (column, record, index) => {
  const value = getValueByPath(record, column.dataIndex);
  if (typeof column.render === "function") {
    return column.render(value, record, index);
  }
  if (value === null || value === undefined || value === "") return "N/A";
  return value;
};

const isActionColumn = (column, index, columns) => {
  const key = String(getColumnKey(column, index)).toLowerCase();
  const title = getTitleText(column.title).toLowerCase();
  return (
    ACTION_KEYS.has(key) ||
    ACTION_KEYS.has(title) ||
    (index === columns.length - 1 && ACTION_KEYS.has(title))
  );
};

const getActionTone = (label = "") => {
  const text = String(label || "").toLowerCase();

  if (
    ["delete", "remove", "revoke", "cancel", "deactivate", "return"].some(
      (keyword) => text.includes(keyword),
    )
  ) {
    return "danger";
  }

  if (["edit", "update", "save"].some((keyword) => text.includes(keyword))) {
    return "edit";
  }

  if (
    ["approve", "accept", "unlock", "reactivate", "rectify", "complete"].some(
      (keyword) => text.includes(keyword),
    )
  ) {
    return "success";
  }

  if (
    ["resend", "extend", "retry", "regenerate"].some((keyword) =>
      text.includes(keyword),
    )
  ) {
    return "warning";
  }

  if (["more", "view"].some((keyword) => text.includes(keyword))) {
    return "more";
  }

  if (
    ["review", "verify", "details", "export", "download"].some(
      (keyword) => text.includes(keyword),
    )
  ) {
    return "primary";
  }

  return "primary";
};

const isButtonLikeElement = (node) =>
  React.isValidElement(node) &&
  (node.type?.__ANT_BUTTON ||
    node.type?.displayName === "Button" ||
    node.type?.name === "Button" ||
    (node.props?.icon && Object.prototype.hasOwnProperty.call(node.props, "onClick")));

const colorizeActionNode = (node, inheritedLabel = "") => {
  if (Array.isArray(node)) {
    return node.map((child) => colorizeActionNode(child, inheritedLabel));
  }

  if (!React.isValidElement(node)) return node;

  const label =
    node.props?.["aria-label"] ||
    getTitleText(node.props?.title) ||
    inheritedLabel;

  if (isButtonLikeElement(node)) {
    const tone = getActionTone(label);
    const toneStyle = ACTION_BUTTON_COLORS[tone] || ACTION_BUTTON_COLORS.primary;

    return React.cloneElement(node, {
      style: {
        ...toneStyle,
        ...node.props?.style,
      },
    });
  }

  const nextLabel =
    getTitleText(node.props?.title) ||
    node.props?.["aria-label"] ||
    inheritedLabel;
  const children = colorizeActionNode(node.props?.children, nextLabel);

  return React.cloneElement(node, undefined, children);
};

const colorizeActionColumns = (sourceColumns = []) =>
  sourceColumns.map((column, index) => {
    if (Array.isArray(column.children) && column.children.length) {
      return {
        ...column,
        children: colorizeActionColumns(column.children),
      };
    }

    if (!isActionColumn(column, index, sourceColumns)) return column;

    return {
      ...column,
      render: (value, record, rowIndex) =>
        colorizeActionNode(renderColumnValue(column, record, rowIndex)),
    };
  });

const getColumnOutput = (column, record, index) => {
  const value = getValueByPath(record, column.dataIndex);
  if (typeof column.render === "function") {
    return column.render(value, record, index);
  }
  return value;
};

const isEmptyNode = (value) => {
  if (
    value === null ||
    value === undefined ||
    value === false ||
    value === ""
  ) {
    return true;
  }

  if (Array.isArray(value)) {
    return value.every(isEmptyNode);
  }

  if (React.isValidElement(value)) {
    if (value.type === React.Fragment) {
      return isEmptyNode(value.props?.children);
    }

    const hasVisualProps = Boolean(
      value.props?.icon ||
        value.props?.src ||
        value.props?.title ||
        value.props?.href,
    );

    return isEmptyNode(value.props?.children) && !hasVisualProps;
  }

  return false;
};

const pruneEmptyActionColumns = (sourceColumns = [], records = []) =>
  sourceColumns
    .map((column, index) => {
      if (Array.isArray(column.children) && column.children.length) {
        const children = pruneEmptyActionColumns(column.children, records);
        return children.length ? { ...column, children } : null;
      }

      const hasEmptyActionCells =
        records.length > 0 &&
        isActionColumn(column, index, sourceColumns) &&
        records.every((record, rowIndex) =>
          isEmptyNode(getColumnOutput(column, record, rowIndex)),
        );

      return hasEmptyActionCells ? null : column;
    })
    .filter(Boolean);

export default function ResponsiveTable({
  columns = [],
  dataSource = [],
  rowKey = "key",
  pagination,
  loading = false,
  onRow,
  mobileBreakpoint = "xs",
  mobilePrimaryColumn,
  mobileSecondaryColumn,
  mobileMetaLimit = 6,
  mobileStackMeta = false,
  ...tableProps
}) {
  const screens = useBreakpoint();
  const isMobile =
    mobileBreakpoint === "sm" ? !screens.md : !screens.sm || screens.xs;
  const [localPage, setLocalPage] = useState(1);
  const [localPageSize, setLocalPageSize] = useState(
    typeof pagination === "object" && pagination.pageSize
      ? pagination.pageSize
      : 10,
  );
  const paginationConfig = pagination === false ? false : pagination || {};
  const hasPaginationHandler =
    paginationConfig &&
    (typeof paginationConfig.onChange === "function" ||
      typeof paginationConfig.onShowSizeChange === "function");
  const current =
    hasPaginationHandler && paginationConfig.current
      ? paginationConfig.current
      : localPage;
  const pageSize =
    hasPaginationHandler && paginationConfig.pageSize
      ? paginationConfig.pageSize
      : localPageSize;
  const total =
    paginationConfig && paginationConfig.total
      ? paginationConfig.total
      : dataSource.length;

  const handlePageChange = (page, nextPageSize) => {
    const sizeChanged = nextPageSize !== pageSize;
    const nextPage = sizeChanged ? 1 : page;
    setLocalPage(nextPage);
    setLocalPageSize(nextPageSize);
    if (
      sizeChanged &&
      typeof paginationConfig?.onShowSizeChange === "function"
    ) {
      paginationConfig.onShowSizeChange(page, nextPageSize);
    }
    if (typeof paginationConfig?.onChange === "function") {
      paginationConfig.onChange(nextPage, nextPageSize);
    }
  };

  const resolvedPagination =
    pagination === false
      ? false
      : {
          ...paginationConfig,
          current,
          pageSize,
          total,
          onChange: handlePageChange,
        };

  const displayColumns = useMemo(
    () => colorizeActionColumns(pruneEmptyActionColumns(columns, dataSource)),
    [columns, dataSource],
  );
  const flatColumns = useMemo(
    () => flattenColumns(displayColumns),
    [displayColumns],
  );
  const visibleColumns = flatColumns.filter((column) => !column.hidden);
  const actionColumns = visibleColumns.filter(isActionColumn);
  const detailColumns = visibleColumns.filter(
    (column, index) => !isActionColumn(column, index, visibleColumns),
  );

  if (!isMobile) {
    return (
      <Table
        columns={displayColumns}
        dataSource={dataSource}
        rowKey={rowKey}
        pagination={resolvedPagination}
        loading={loading}
        onRow={onRow}
        {...tableProps}
      />
    );
  }

  const pagedData =
    pagination === false
      ? dataSource
      : dataSource.slice((current - 1) * pageSize, current * pageSize);

  const preferredPrimary =
    detailColumns.find(
      (column) => getColumnKey(column) === mobilePrimaryColumn,
    ) || detailColumns[0];
  const preferredSecondary =
    detailColumns.find(
      (column) => getColumnKey(column) === mobileSecondaryColumn,
    ) || detailColumns.find((column) => column !== preferredPrimary);

  return (
    <Spin spinning={Boolean(loading)}>
      <Space orientation="vertical" size={10} style={{ width: "100%" }}>
        {pagedData.length ? (
          pagedData.map((record, index) => {
            const absoluteIndex =
              pagination === false ? index : (current - 1) * pageSize + index;
            const rowProps = onRow?.(record, absoluteIndex) || {};
            const rowClick = rowProps.onClick;
            const primaryValue = preferredPrimary
              ? renderColumnValue(preferredPrimary, record, absoluteIndex)
              : "Record";
            const secondaryValue = preferredSecondary
              ? renderColumnValue(preferredSecondary, record, absoluteIndex)
              : null;
            const metaColumns = detailColumns
              .filter(
                (column) =>
                  column !== preferredPrimary && column !== preferredSecondary,
              )
              .slice(0, mobileMetaLimit);

            return (
              <Card
                key={getRowKeyValue(rowKey, record, absoluteIndex)}
                hoverable={Boolean(rowClick)}
                size="small"
                styles={{ body: { padding: 12 } }}
                style={{
                  width: "100%",
                  maxWidth: "100%",
                  overflow: "hidden",
                  borderRadius: 10,
                  ...rowProps.style,
                }}
                onClick={rowClick}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 10,
                  }}
                >
                  <div style={{ minWidth: 0, width: "100%" }}>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: 14,
                        overflowWrap: "anywhere",
                        wordBreak: "break-word",
                      }}
                    >
                      {primaryValue}
                    </div>
                    {secondaryValue ? (
                      <div
                        style={{
                          color: "#667085",
                          fontSize: 12,
                          overflowWrap: "anywhere",
                          wordBreak: "break-word",
                        }}
                      >
                        {secondaryValue}
                      </div>
                    ) : null}
                  </div>
                </div>

                {metaColumns.length ? (
                  <div
                    style={{
                      display: "grid",
                      gap: mobileStackMeta ? 10 : 6,
                      marginTop: mobileStackMeta ? 12 : 10,
                    }}
                  >
                    {metaColumns.map((column, metaIndex) => (
                      <div
                        key={getColumnKey(column, metaIndex)}
                        style={{
                          display: "grid",
                          gridTemplateColumns: mobileStackMeta
                            ? "minmax(0, 1fr)"
                            : "minmax(86px, 34%) minmax(0, 1fr)",
                          gap: mobileStackMeta ? 3 : 8,
                          alignItems: "start",
                          minWidth: 0,
                          paddingTop: mobileStackMeta ? 10 : 0,
                          borderTop: mobileStackMeta
                            ? "1px solid #eef2f1"
                            : "none",
                        }}
                      >
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {getTitleText(column.title)}
                        </Text>
                        <div
                          style={{
                            minWidth: 0,
                            maxWidth: "100%",
                            fontSize: 12,
                            overflowWrap: "anywhere",
                            wordBreak: "break-word",
                            whiteSpace: "normal",
                          }}
                        >
                          {renderColumnValue(column, record, absoluteIndex)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}

                {actionColumns.length ? (
                  <Space
                    size={12}
                    wrap
                    style={{ marginTop: 10 }}
                    onClick={(event) => event.stopPropagation()}
                  >
                    {actionColumns.map((column, actionIndex) => (
                      <React.Fragment key={getColumnKey(column, actionIndex)}>
                        {renderColumnValue(column, record, absoluteIndex)}
                      </React.Fragment>
                    ))}
                  </Space>
                ) : null}
              </Card>
            );
          })
        ) : (
          <Card size="small" style={{ borderRadius: 10 }}>
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={tableProps.locale?.emptyText || "No records found"}
            />
          </Card>
        )}

        {pagination !== false && total > pageSize ? (
          <Pagination
            current={current}
            pageSize={pageSize}
            total={total}
            showSizeChanger={paginationConfig.showSizeChanger}
            pageSizeOptions={paginationConfig.pageSizeOptions}
            size="small"
            align="end"
            onChange={handlePageChange}
          />
        ) : null}
      </Space>
    </Spin>
  );
}
