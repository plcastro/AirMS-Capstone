import { Table, Tag, Input } from "antd";
import React, { useState } from "react";

// Helper to format YYYY-MM-DD to DD/MM/YYYY for display
const formatDateForDisplay = (dateStr) => {
  if (!dateStr || dateStr === "N/A") return dateStr || "";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  const [year, month, day] = parts;
  return `${day}/${month}/${year}`;
};

export default function PMonitoringTable({
  headers = [],
  data = [],
  loading = false,
  editable = false,
  isCellEditable = () => false,
  onCellEdit = () => {},
  rowKey = "_id",
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const processColumns = (headers) => {
    return headers.map((header) => {
      if (header.children) {
        return {
          title: header.title,
          children: processColumns(header.children),
        };
      }
      if (header.key === "daysRemaining") {
        return {
          title: header.title,
          dataIndex: "daysRemaining",
          key: "daysRemaining",
          width: header.width,
          sorter: (a, b) => (a.daysRemaining || 0) - (b.daysRemaining || 0),
          render: (value) => {
            if (value === undefined || value === null) return "-";
            const numValue = parseFloat(value);
            if (isNaN(numValue)) return value;

            let color = "inherit";
            let fontWeight = "normal";

            if (numValue <= 0) {
              color = "#ea0000";
              fontWeight = "bold";
            } else if (numValue <= 30) {
              color = "#f4ab00";
              fontWeight = "bold";
            }

            return (
              <span style={{ color, fontWeight }}>{Math.round(numValue)}</span>
            );
          },
        };
      }

      if (header.key === "due") {
        return {
          title: header.title,
          dataIndex: "due",
          key: "due",
          width: header.width,
          sorter: (a, b) => {
            // Calculate priority: 0 = DUE, 1 = Due Soon, 2 = OK/No tag
            const getPriority = (record) => {
              const days = parseFloat(record.daysRemaining);
              if (isNaN(days)) return 2; // No tag or invalid
              if (days <= 0) return 0; // DUE
              if (days <= 30) return 1; // Due Soon
              return 2; // OK
            };
            return getPriority(a) - getPriority(b);
          },
          render: (value, record) => {
            if (value) {
              return (
                <Tag color="#ea0000" style={{ fontWeight: "bold" }}>
                  DUE
                </Tag>
              );
            }
            const daysRemaining = parseFloat(record.daysRemaining);
            if (
              !isNaN(daysRemaining) &&
              daysRemaining > 0 &&
              daysRemaining <= 30
            ) {
              return (
                <Tag color="#f4ab00" style={{ fontWeight: "bold" }}>
                  Due Soon
                </Tag>
              );
            }
            return null;
          },
        };
      }

      // Define which columns are date fields
      const isDateColumn = header.key === "dateCW" || header.key === "dateDue";

      // Helper to apply dark gray background to specific columns
      const getColumnStyle = (key) => {
        const darkGrayColumns = [
          "hourLimit1",
          "hourLimit2",
          "hourLimit3",
          "dayType",
          "hoursCW",
          "timeRemaining",
          "ttCycleDue",
        ];
        if (darkGrayColumns.includes(key)) {
          return {
            style: {
              backgroundColor: "#f0f0f0",
            },
          };
        }
        return {};
      };

      // Default column rendering – editable if needed
      const renderCell = (value, record) => {
        if (!editable) {
          // Non-editable: format date columns for display
          if (isDateColumn && value && value !== "N/A") {
            return formatDateForDisplay(value);
          }
          return value || "";
        }

        if (!isCellEditable(record, header.key)) {
          // Not editable: format date columns for display
          if (isDateColumn && value && value !== "N/A") {
            return formatDateForDisplay(value);
          }
          return value || "";
        }

        // Editable date column – use native date picker
        if (isDateColumn) {
          // Ensure value is in YYYY-MM-DD format; if not, try to parse
          let dateValue = value;
          if (value && value.includes("/")) {
            // Convert from DD/MM/YYYY to YYYY-MM-DD if needed (fallback)
            const parts = value.split("/");
            if (parts.length === 3) {
              const [day, month, year] = parts;
              dateValue = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
            }
          }
          return (
            <Input
              type="date"
              value={dateValue || ""}
              onChange={(e) =>
                onCellEdit(record[rowKey], header.key, e.target.value)
              }
              size="small"
              style={{ width: "100%" }}
            />
          );
        }

        // Default text input for other editable columns
        return (
          <Input
            value={value || ""}
            onChange={(e) =>
              onCellEdit(record[rowKey], header.key, e.target.value)
            }
            size="small"
            style={{ width: "100%" }}
          />
        );
      };

      return {
        title: header.title,
        dataIndex: header.key,
        key: header.key,
        width: header.width,
        onCell: () => getColumnStyle(header.key),
        render: renderCell,
        sorter: (a, b) => {
          const valA = a[header.key] ?? "";
          const valB = b[header.key] ?? "";
          if (typeof valA === "number" && typeof valB === "number") {
            return valA - valB;
          }
          return String(valA).localeCompare(String(valB));
        },
      };
    });
  };

  const columns = processColumns(headers);

  return (
    <Table
      columns={columns}
      dataSource={data}
      rowKey={rowKey}
      loading={loading}
      scroll={{ x: 1500, y: "calc(100vh - 400px)" }}
      sticky={true}
      pagination={{
        pageSize: pageSize,
        showSizeChanger: true,
        pageSizeOptions: ["10", "15", "30"],
        current: currentPage,
        onChange: (page, size) => {
          setCurrentPage(page);
          setPageSize(size);
        },
        placement: "bottomEnd",
      }}
      size="small"
      bordered
      rowClassName={(record, index) => {
        return index % 2 === 0 ? "table-row-light" : "table-row-dark";
      }}
    />
  );
}
