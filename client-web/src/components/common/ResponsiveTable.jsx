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
const DATE_FIELD_CANDIDATES = [
  "date",
  "createdAt",
  "updatedAt",
  "submittedAt",
  "completedAt",
  "approvedAt",
  "acceptedAt",
  "releasedAt",
  "reviewedAt",
  "returnedAt",
  "loginAt",
  "logoutAt",
  "lastActivityAt",
  "lastSeenAt",
  "dueDate",
  "endDateTime",
  "startDateTime",
  "dateDiscovered",
  "dateRectified",
  "dateRequested",
  "dateAdded",
  "timestamp",
];
const DATE_TITLE_PATTERN =
  /\b(date|time|due|requested|created|updated|submitted|completed|approved|accepted|released|reviewed|returned|login|logout|activity|seen)\b/i;

const getColumnKey = (column, index) =>
  column.key || column.dataIndex || `column-${index}`;

const getTitleText = (title) =>
  typeof title === "string" || typeof title === "number" ? String(title) : "";

const normalizeDateKey = (value) =>
  String(value || "")
    .replace(/[^a-z0-9]/gi, "")
    .toLowerCase();

const getValueByPath = (record, dataIndex) => {
  if (!dataIndex) return undefined;
  const path = Array.isArray(dataIndex)
    ? dataIndex
    : String(dataIndex).split(".");
  return path.reduce((value, key) => value?.[key], record);
};

const parseDateValue = (value) => {
  if (!value) return null;
  if (value instanceof Date) {
    const time = value.getTime();
    return Number.isNaN(time) ? null : time;
  }

  const raw = String(value).trim();
  if (!raw) return null;

  const slashDate = raw.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?)?$/i,
  );
  if (slashDate) {
    const [, month, day, yearValue, hourValue, minuteValue, secondValue, ampm] =
      slashDate;
    const year =
      yearValue.length === 2 ? 2000 + Number(yearValue) : Number(yearValue);
    let hour = Number(hourValue || 0);
    if (ampm) {
      const marker = ampm.toUpperCase();
      if (marker === "PM" && hour < 12) hour += 12;
      if (marker === "AM" && hour === 12) hour = 0;
    }
    const date = new Date(
      year,
      Number(month) - 1,
      Number(day),
      hour,
      Number(minuteValue || 0),
      Number(secondValue || 0),
    );
    const time = date.getTime();
    return Number.isNaN(time) ? null : time;
  }

  const parsed = new Date(raw);
  const time = parsed.getTime();
  return Number.isNaN(time) ? null : time;
};

const isDateColumn = (column) => {
  const title = getTitleText(column.title);
  const key = normalizeDateKey(getColumnKey(column));
  const dataIndex = normalizeDateKey(
    Array.isArray(column.dataIndex)
      ? column.dataIndex.join(".")
      : column.dataIndex,
  );

  return (
    DATE_TITLE_PATTERN.test(title) ||
    DATE_FIELD_CANDIDATES.some((candidate) => {
      const normalizedCandidate = normalizeDateKey(candidate);
      return key === normalizedCandidate || dataIndex === normalizedCandidate;
    })
  );
};

const getNewestSortValue = (record, dateColumns = []) => {
  for (const column of dateColumns) {
    const time = parseDateValue(getValueByPath(record, column.dataIndex));
    if (time !== null) return time;
  }

  for (const field of DATE_FIELD_CANDIDATES) {
    const time = parseDateValue(getValueByPath(record, field));
    if (time !== null) return time;
  }

  return null;
};

const sortRowsNewestFirst = (records = [], columns = []) => {
  const flatDateColumns = flattenColumns(columns).filter(isDateColumn);
  const hasDateSignal =
    flatDateColumns.length > 0 ||
    records.some((record) =>
      DATE_FIELD_CANDIDATES.some(
        (field) => parseDateValue(getValueByPath(record, field)) !== null,
      ),
    );

  if (!hasDateSignal) return records;

  return [...records].sort((left, right) => {
    const leftTime = getNewestSortValue(left, flatDateColumns);
    const rightTime = getNewestSortValue(right, flatDateColumns);

    if (leftTime === null && rightTime === null) return 0;
    if (leftTime === null) return 1;
    if (rightTime === null) return -1;
    return rightTime - leftTime;
  });
};

const getDateSorter = (column) => (left, right) => {
  const leftTime = getNewestSortValue(left, [column]);
  const rightTime = getNewestSortValue(right, [column]);

  if (leftTime === null && rightTime === null) return 0;
  if (leftTime === null) return 1;
  if (rightTime === null) return -1;
  return leftTime - rightTime;
};

const addDateSortersToColumns = (sourceColumns = []) =>
  sourceColumns.map((column) => {
    if (Array.isArray(column.children) && column.children.length) {
      return {
        ...column,
        children: addDateSortersToColumns(column.children),
      };
    }

    if (!isDateColumn(column) || column.sorter) return column;

    return {
      ...column,
      sorter: getDateSorter(column),
      sortDirections: column.sortDirections || ["descend", "ascend"],
    };
  });

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
  const sortedDataSource = useMemo(
    () => sortRowsNewestFirst(dataSource, columns),
    [dataSource, columns],
  );

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
    () =>
      addDateSortersToColumns(
        colorizeActionColumns(pruneEmptyActionColumns(columns, sortedDataSource)),
      ),
    [columns, sortedDataSource],
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
        dataSource={sortedDataSource}
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
      ? sortedDataSource
      : sortedDataSource.slice((current - 1) * pageSize, current * pageSize);

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
