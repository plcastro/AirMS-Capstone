import React from "react";

import { Input, Button } from "antd";
import { ExportOutlined } from "@ant-design/icons";
import ResponsiveTable from "../common/ResponsiveTable";

export default function MLogTable({
  headers,
  data,
  onRowClick,
  isSimple,
  isWorkReport,
  isWorkReportEditable = false,
  onWorkDetailChange,
  onExport,
}) {
  const tableData = (data || []).map((item, index) => ({
    ...item,
    __rowKey: item?._id || item?.id || `row-${index}`,
  }));

  const columns = [
    ...headers.map((header) => ({
      title: header.title,
      dataIndex: header.key,
      key: header.key,
      width: header.width,
      render: (text, record, index) => {
        if (isWorkReport && header.key === "description") {
          if (isWorkReportEditable) {
            return (
              <div
                style={{ display: "flex", gap: 8, alignItems: "flex-start" }}
              >
                <span style={{ paddingTop: 5 }}>{index + 1}.</span>

                <Input.TextArea
                  value={text}
                  autoSize={{ minRows: 1, maxRows: 4 }}
                  onChange={(event) =>
                    onWorkDetailChange?.(index, event.target.value)
                  }
                  placeholder="Enter description of work"
                />
              </div>
            );
          }

          return (
            <div style={{ minHeight: "30px" }}>
              {index + 1}. {text}
            </div>
          );
        }

        return text || "N/A";
      },
    })),

    ...(onExport
      ? [
          {
            title: "ACTION",
            key: "__action",
            width: "15%",
            align: "center",
            render: (_, record) => (
              <Button
                icon={<ExportOutlined />}
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onExport(record);
                }}
                style={{
                  border: "none",
                  background: "#26866f",
                  color: "#ffffff",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                Export
              </Button>
            ),
          },
        ]
      : []),
  ];
  return (
    <ResponsiveTable
      columns={columns}
      dataSource={tableData}
      rowKey="__rowKey"
      pagination={
        tableData.length > 10
          ? {
              pageSize: 10,
              showSizeChanger: false,
              showQuickJumper: false,
            }
          : false
      }
      onRow={(record) => ({
        onClick: () => onRowClick && onRowClick(record),
        style: { cursor: onRowClick ? "pointer" : "default" },
      })}
      components={
        isSimple
          ? {
              header: {
                cell: (props) => (
                  <th
                    {...props}
                    style={{
                      background: "#26866f",
                      color: "white",
                      textAlign: "center",
                      display: isWorkReport ? "none" : "table-cell",
                    }}
                  >
                    {props.children}
                  </th>
                ),
              },
            }
          : undefined
      }
      bordered={true}
      size="small"
    />
  );
}
