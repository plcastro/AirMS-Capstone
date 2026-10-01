import React, { useEffect, useState } from "react";
import { Button, Checkbox, Input, Space, Table, Tooltip, Typography } from "antd";
import { FlagFilled, FlagOutlined } from "@ant-design/icons";

const PAGE_SIZE = 12;

// The full inspection checklist as a table. The mechanic ticks items one by
// one, can tick a whole page or every item at once, and can flag any item as a
// discrepancy with a note. Nothing is ticked on the mechanic's behalf.
export default function InspectionChecklistPanel({
  items,
  checked,
  discrepancies,
  onChange,
  disabled = false,
}) {
  const [page, setPage] = useState(1);
  // Only go back to page 1 when the checklist itself changes, not on every tick.
  const checklistId = `${items.length}:${items[0]?.key ?? ""}`;
  useEffect(() => setPage(1), [checklistId]);
  const isFlagged = (key) => Object.hasOwn(discrepancies, key);
  const visible = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const checkedCount = items.filter((item) => checked[item.key]).length;
  const flaggedKeys = Object.keys(discrepancies);
  const emit = (nextChecked, nextDiscrepancies = discrepancies) =>
    onChange({ checked: nextChecked, discrepancies: nextDiscrepancies });
  const setItems = (list, value) => {
    const next = { ...checked };
    list.forEach((item) => {
      if (!isFlagged(item.key)) next[item.key] = value;
    });
    emit(next);
  };
  const toggleFlag = (key) => {
    const nextDiscrepancies = { ...discrepancies };
    const nextChecked = { ...checked };
    if (isFlagged(key)) delete nextDiscrepancies[key];
    else {
      nextDiscrepancies[key] = { note: "" };
      nextChecked[key] = false;
    }
    emit(nextChecked, nextDiscrepancies);
  };
  const columns = [
    {
      title: "",
      key: "checked",
      width: 48,
      align: "center",
      render: (_, item) => (
        <Checkbox
          aria-label={`Check ${item.title}`}
          disabled={disabled || isFlagged(item.key)}
          checked={checked[item.key] === true}
          onChange={(e) => emit({ ...checked, [item.key]: e.target.checked })}
        />
      ),
    },
    {
      title: "Item",
      dataIndex: "title",
      ellipsis: { showTitle: false },
      render: (value, item) => {
        const text = item.description ? `${value} — ${item.description}` : value;
        const flagged = isFlagged(item.key);
        return (
          <Tooltip title={text} placement="topLeft">
            <span
              style={{
                display: "block",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                ...(flagged ? { color: "#d93025", fontWeight: 600 } : null),
              }}
            >
              {flagged && (
                <span
                  role="img"
                  aria-label="Discrepancy flagged"
                  style={{
                    display: "inline-block",
                    width: 8,
                    height: 8,
                    marginRight: 8,
                    borderRadius: "50%",
                    background: "#d93025",
                  }}
                />
              )}
              {text}
            </span>
          </Tooltip>
        );
      },
    },
    {
      title: "Action",
      key: "flag",
      width: 80,
      align: "center",
      render: (_, item) => {
        const flagged = isFlagged(item.key);
        return (
          <Tooltip title={flagged ? "Remove flag" : "Flag discrepancy"}>
            <Button
              size="small"
              shape="circle"
              danger
              type={flagged ? "primary" : "default"}
              aria-label={flagged ? "Remove flag" : "Flag discrepancy"}
              icon={flagged ? <FlagFilled /> : <FlagOutlined />}
              disabled={disabled}
              onClick={() => toggleFlag(item.key)}
            />
          </Tooltip>
        );
      },
    },
  ];
  return (
    <div>
      <Space wrap style={{ marginBottom: 8 }}>
        <Button disabled={disabled} onClick={() => setItems(items, true)}>
          Mark all items good
        </Button>
        <Button disabled={disabled} onClick={() => setItems(items, false)}>
          Clear all
        </Button>
        <Button disabled={disabled} onClick={() => setItems(visible, true)}>
          Select all on this page
        </Button>
        <Button disabled={disabled} onClick={() => setItems(visible, false)}>
          Clear this page
        </Button>
      </Space>
      <Typography.Paragraph type="secondary" style={{ marginBottom: 8 }}>
        {checkedCount} of {items.length} items checked
        {flaggedKeys.length ? ` · ${flaggedKeys.length} flagged` : ""}
      </Typography.Paragraph>
      <Table
        size="small"
        tableLayout="fixed"
        rowKey="key"
        dataSource={items}
        columns={columns}
        pagination={{
          current: page,
          pageSize: PAGE_SIZE,
          onChange: setPage,
          showSizeChanger: false,
          size: "small",
          hideOnSinglePage: true,
        }}
        expandable={{
          expandedRowKeys: flaggedKeys,
          showExpandColumn: false,
          rowExpandable: (item) => isFlagged(item.key),
          expandedRowRender: (item) => (
            <Input.TextArea
              aria-label={`Discrepancy note for ${item.title}`}
              status={discrepancies[item.key]?.note.trim() ? undefined : "error"}
              disabled={disabled}
              rows={2}
              placeholder="Describe the discrepancy for this item"
              value={discrepancies[item.key]?.note ?? ""}
              onChange={(e) =>
                emit(checked, {
                  ...discrepancies,
                  [item.key]: { ...discrepancies[item.key], note: e.target.value },
                })
              }
            />
          ),
        }}
      />
    </div>
  );
}
