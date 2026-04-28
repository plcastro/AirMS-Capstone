import { Table, Tag } from "antd";
import React, { useState, useMemo } from "react";

export default function MTrackingTable({
  headers = [],
  data = [],
  loading = false,
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const columns = useMemo(() => {
    return headers.map((header) => {
      if (header.key === "priority") {
        return {
          title: header.title,
          dataIndex: "priority",
          key: "priority",
          filters: [
            { text: "Low", value: "Low" },
            { text: "Medium", value: "Medium" },
            { text: "High", value: "High" },
            { text: "Critical", value: "Critical" },
          ],
          onFilter: (value, record) => record.priority === value,
          render: (priority) => {
            let color = "default";

            if (priority === "Low") color = "#21d804";
            if (priority === "Medium") color = "#efe702";
            if (priority === "High") color = "#f4ab00";
            if (priority === "Critical") color = "#ea0000";
            return (
              <Tag
                color={color}
                variant="solid"
                style={{ fontWeight: "bold", fontSize: 16 }}
              >
                {priority}
              </Tag>
            );
          },
        };
      }

      if (header.key === "riskLevel") {
        return {
          title: header.title,
          dataIndex: "riskLevel",
          key: "riskLevel",
          filters: [
            { text: "Low", value: "Low" },
            { text: "Medium", value: "Medium" },
            { text: "High", value: "High" },
            { text: "Critical", value: "Critical" },
          ],
          onFilter: (value, record) => record.riskLevel === value,
          render: (riskLevel) => {
            let color = "default";

            if (riskLevel === "Low") color = "#21d804";
            if (riskLevel === "Medium") color = "#efe702";
            if (riskLevel === "High") color = "#f4ab00";
            if (riskLevel === "Critical") color = "#ea0000";

            return (
              <Tag
                color={color}
                variant="solid"
                style={{ fontWeight: "bold", fontSize: 16 }}
              >
                {riskLevel}
              </Tag>
            );
          },
        };
      }

      if (header.key === "managerSummarySource") {
        return {
          title: header.title,
          dataIndex: "managerSummarySource",
          key: "managerSummarySource",
          filters: [
            { text: "Gemini AI", value: "Gemini AI" },
            { text: "Rule Fallback", value: "Rule Fallback" },
          ],
          onFilter: (value, record) => record.managerSummarySource === value,
          render: (summarySource) => {
            const color = summarySource === "Gemini AI" ? "blue" : "default";
            return <Tag color={color}>{summarySource}</Tag>;
          },
        };
      }

      return {
        title: header.title,
        dataIndex: header.key,
        key: header.key,
        sorter: (a, b) =>
          String(a[header.key] ?? "").localeCompare(
            String(b[header.key] ?? ""),
          ),
      };
    });
  }, [headers]);
  return (
    <Table
      columns={columns}
      dataSource={data}
      rowKey={(record) => record._id}
      loading={loading}
      scroll={{ x: "max-content" }}
      pagination={{
        pageSize: pageSize,
        showSizeChanger: true,
        pageSizeOptions: ["10", "20", "50"],
        current: currentPage,
        onChange: (page) => setCurrentPage(page),
        placement: "bottomEnd",
      }}
    />
  );
}
