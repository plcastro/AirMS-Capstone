import React, { useMemo, useState } from "react";
import { Card, Empty, Grid, Pagination, Spin, Space, Table, Typography } from "antd";

const { Text } = Typography;
const { useBreakpoint } = Grid;

const ACTION_KEYS = new Set(["action", "actions", "operation", "operations"]);

const getColumnKey = (column, index) =>
  column.key || column.dataIndex || `column-${index}`;

const getTitleText = (title) =>
  typeof title === "string" || typeof title === "number" ? String(title) : "";

const getValueByPath = (record, dataIndex) => {
  if (!dataIndex) return undefined;
  const path = Array.isArray(dataIndex) ? dataIndex : String(dataIndex).split(".");
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
    index === columns.length - 1 && ACTION_KEYS.has(title)
  );
};

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
  ...tableProps
}) {
  const screens = useBreakpoint();
  const isMobile =
    mobileBreakpoint === "sm" ? !screens.md : !screens.sm || screens.xs;
  const [localPage, setLocalPage] = useState(1);
  const [localPageSize, setLocalPageSize] = useState(
    typeof pagination === "object" && pagination.pageSize ? pagination.pageSize : 10,
  );

  const flatColumns = useMemo(() => flattenColumns(columns), [columns]);
  const visibleColumns = flatColumns.filter((column) => !column.hidden);
  const actionColumns = visibleColumns.filter(isActionColumn);
  const detailColumns = visibleColumns.filter(
    (column, index) => !isActionColumn(column, index, visibleColumns),
  );

  if (!isMobile) {
    return (
      <Table
        columns={columns}
        dataSource={dataSource}
        rowKey={rowKey}
        pagination={pagination}
        loading={loading}
        onRow={onRow}
        {...tableProps}
      />
    );
  }

  const paginationConfig = pagination === false ? false : pagination || {};
  const current =
    typeof paginationConfig === "object" && paginationConfig.current
      ? paginationConfig.current
      : localPage;
  const pageSize =
    typeof paginationConfig === "object" && paginationConfig.pageSize
      ? paginationConfig.pageSize
      : localPageSize;
  const total =
    typeof paginationConfig === "object" && paginationConfig.total
      ? paginationConfig.total
      : dataSource.length;
  const pagedData =
    pagination === false
      ? dataSource
      : dataSource.slice((current - 1) * pageSize, current * pageSize);

  const preferredPrimary =
    detailColumns.find((column) => getColumnKey(column) === mobilePrimaryColumn) ||
    detailColumns[0];
  const preferredSecondary =
    detailColumns.find((column) => getColumnKey(column) === mobileSecondaryColumn) ||
    detailColumns.find((column) => column !== preferredPrimary);

  const handlePageChange = (page, nextPageSize) => {
    setLocalPage(page);
    setLocalPageSize(nextPageSize);
    if (typeof paginationConfig?.onChange === "function") {
      paginationConfig.onChange(page, nextPageSize);
    }
  };

  return (
    <Spin spinning={Boolean(loading)}>
      <Space direction="vertical" size={10} style={{ width: "100%" }}>
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
                style={{ borderRadius: 10, ...rowProps.style }}
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
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>
                      {primaryValue}
                    </div>
                    {secondaryValue ? (
                      <div style={{ color: "#667085", fontSize: 12 }}>
                        {secondaryValue}
                      </div>
                    ) : null}
                  </div>
                </div>

                {metaColumns.length ? (
                  <div
                    style={{
                      display: "grid",
                      gap: 6,
                      marginTop: 10,
                    }}
                  >
                    {metaColumns.map((column, metaIndex) => (
                      <div
                        key={getColumnKey(column, metaIndex)}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "minmax(92px, 36%) 1fr",
                          gap: 8,
                          alignItems: "start",
                        }}
                      >
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {getTitleText(column.title)}
                        </Text>
                        <div style={{ minWidth: 0, fontSize: 12 }}>
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
