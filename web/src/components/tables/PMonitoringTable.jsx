import { Table, Tag } from "antd";
import React, { useState, useMemo } from "react";

export default function PMonitoringTable({
  headers = [],
  data = [],
  loading = false,
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
          render: (value) => {
            if (!value) return null;
            return (
              <Tag color="#ea0000" style={{ fontWeight: "bold" }}>
                DUE
              </Tag>
            );
          },
        };
      }

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

      return {
        title: header.title,
        dataIndex: header.key,
        key: header.key,
        width: header.width,
        onCell: (_, index) => getColumnStyle(header.key),
        render: (value) => value || "",
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

  const columns = useMemo(() => {
    return processColumns(headers);
  }, [headers]);

  return (
    <Table
      columns={columns}
      dataSource={data}
      rowKey={(record) => record._id || record.id || record.componentName}
      loading={loading}
      scroll={{ x: 1500, y: "calc(100vh - 400px)" }}
      sticky={true}
      pagination={{
        pageSize: pageSize,
        showSizeChanger: true,
        pageSizeOptions: ["10", "20", "50"],
        current: currentPage,
        onChange: (page, size) => {
          setCurrentPage(page);
          setPageSize(size);
        },
        placement: "bottomEnd",
      }}
      size="small"
      bordered
      style={{
        backgroundColor: "#fff",
        borderRadius: "4px",
      }}
      rowClassName={(record, index) => {
        return index % 2 === 0 ? "table-row-light" : "table-row-dark";
      }}
    />
  );
}
