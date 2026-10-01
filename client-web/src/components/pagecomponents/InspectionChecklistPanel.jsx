import React, { useEffect, useState } from "react";
import { Button, Checkbox, Input, Pagination, Space, Tooltip, Typography } from "antd";
import { FlagFilled, FlagOutlined } from "@ant-design/icons";

const PAGE_SIZE = 12;

// The full inspection checklist. The mechanic ticks items one by one, can tick
// a whole page or every item at once, and can flag any item as a discrepancy
// with a note. Nothing is ticked on the mechanic's behalf.
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
  const flaggedCount = Object.keys(discrepancies).length;
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
        {flaggedCount ? ` · ${flaggedCount} flagged` : ""}
      </Typography.Paragraph>
      {visible.map((item) => {
        const flagged = isFlagged(item.key);
        return (
          <div key={item.key} style={{ marginBottom: 10 }}>
            <Space align="start" wrap>
              {flagged && (
                <span
                  role="img"
                  aria-label="Discrepancy flagged"
                  title="Discrepancy flagged"
                  style={{
                    display: "inline-block",
                    width: 8,
                    height: 8,
                    marginTop: 8,
                    borderRadius: "50%",
                    background: "#d93025",
                  }}
                />
              )}
              <Checkbox
                disabled={disabled || flagged}
                checked={checked[item.key] === true}
                onChange={(e) =>
                  emit({ ...checked, [item.key]: e.target.checked })
                }
              >
                {item.title}
                {item.description ? ` — ${item.description}` : ""}
              </Checkbox>
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
            </Space>
            {flagged && (
              <Input.TextArea
                aria-label={`Discrepancy note for ${item.title}`}
                status={discrepancies[item.key].note.trim() ? undefined : "error"}
                disabled={disabled}
                rows={2}
                style={{ marginTop: 6 }}
                placeholder="Describe the discrepancy for this item"
                value={discrepancies[item.key].note}
                onChange={(e) =>
                  emit(checked, {
                    ...discrepancies,
                    [item.key]: { ...discrepancies[item.key], note: e.target.value },
                  })
                }
              />
            )}
          </div>
        );
      })}
      {items.length > PAGE_SIZE && (
        <Pagination
          simple
          current={page}
          pageSize={PAGE_SIZE}
          total={items.length}
          showSizeChanger={false}
          onChange={setPage}
        />
      )}
    </div>
  );
}
