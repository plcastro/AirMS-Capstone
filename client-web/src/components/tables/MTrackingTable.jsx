import { Button, Space, Table, Tag, Typography } from "antd";
import React, { useState, useMemo } from "react";

const { Text } = Typography;

export default function MTrackingTable({
  headers = [],
  data = [],
  loading = false,
  onRectifyFinding,
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
            { text: "OpenAI", value: "OpenAI" },
            { text: "Rule Fallback", value: "Rule Fallback" },
          ],
          onFilter: (value, record) => record.managerSummarySource === value,
          render: (summarySource) => {
            const color = summarySource === "OpenAI" ? "blue" : "default";
            return <Tag color={color}>{summarySource}</Tag>;
          },
        };
      }

      if (header.key === "maintenanceFinding") {
        return {
          title: header.title,
          dataIndex: "maintenanceFinding",
          key: "maintenanceFinding",
          width: 420,
          sorter: (a, b) =>
            String(a.maintenanceFinding?.title ?? "").localeCompare(
              String(b.maintenanceFinding?.title ?? ""),
            ),
          render: (finding) => {
            const source = finding?.source || "Rule-based";
            const sourceColor = source === "OpenAI" ? "blue" : "default";
            const defectDetails = finding?.defectDetails;
            const hasDefectDetails =
              defectDetails &&
              [
                defectDetails.defectType,
                defectDetails.symptom,
                defectDetails.affectedComponent,
                defectDetails.maintenanceMeaning,
              ].some(Boolean);

            return (
              <Space direction="vertical" size={4}>
                <Space size={6} wrap>
                  <Text strong>{finding?.title || "No issue detected"}</Text>
                  <Tag color={sourceColor}>{source}</Tag>
                </Space>
                <Text type="secondary">
                  {finding?.summary || "No active maintenance finding."}
                </Text>
                {hasDefectDetails && (
                  <Space direction="vertical" size={2}>
                    {defectDetails.defectType && (
                      <Text>
                        <Text strong>Defect:</Text> {defectDetails.defectType}
                      </Text>
                    )}
                    {defectDetails.symptom && (
                      <Text type="secondary">
                        <Text strong>Symptom:</Text> {defectDetails.symptom}
                      </Text>
                    )}
                    {defectDetails.maintenanceMeaning && (
                      <Text type="secondary">
                        <Text strong>Meaning:</Text>{" "}
                        {defectDetails.maintenanceMeaning}
                      </Text>
                    )}
                    <Tag color="purple">
                      Detail confidence: {defectDetails.confidence || "low"}
                    </Tag>
                  </Space>
                )}
              </Space>
            );
          },
        };
      }

      if (header.key === "rectifyAction") {
        return {
          title: header.title,
          dataIndex: "rectifyAction",
          key: "rectifyAction",
          width: 130,
          render: (draft) => (
            <Button
              type="primary"
              size="small"
              disabled={!draft}
              loading={Boolean(draft?.rectifying)}
              onClick={() => draft && onRectifyFinding?.(draft)}
            >
              Rectify
            </Button>
          ),
        };
      }

      if (header.key === "procedureSummary") {
        return {
          title: header.title,
          dataIndex: "procedureSummary",
          key: "procedureSummary",
          width: 460,
          render: (procedure) => {
            if (!procedure?.summary) {
              return <Text type="secondary">No AMM summary available.</Text>;
            }

            return (
              <Space direction="vertical" size={4}>
                {procedure?.reference && (
                  <Text strong>{procedure.reference}</Text>
                )}
                {procedure?.title && (
                  <Text type="secondary">{procedure.title}</Text>
                )}
                <Text>{procedure.summary}</Text>
              </Space>
            );
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
  }, [headers, onRectifyFinding]);
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
