import React from "react";
import { Input, Table } from "antd";

export default function MLogTable({
  headers,
  data,
  onRowClick,
  isSimple,
  isWorkReport,
  isWorkReportEditable = false,
  onWorkDetailChange,
}) {
  const columns = headers.map((header) => ({
    title: header.title,
    dataIndex: header.key,
    key: header.key,
    render: (text, record, index) => {
      if (isWorkReport && header.key === "description") {
        if (isWorkReportEditable) {
          return (
            <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
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
        return <div style={{ minHeight: '30px' }}>{index + 1}. {text}</div>;
      }
      return text || "N/A";
    }
  }));

  return (
    <Table
      columns={columns}
      dataSource={data}
      rowKey={(record, index) => index}
      pagination={false}
      onRow={(record) => ({
        onClick: () => onRowClick && onRowClick(record),
        style: { cursor: onRowClick ? 'pointer' : 'default' }
      })}
      components={isSimple ? {
        header: {
          cell: (props) => (
            <th {...props} style={{ 
              background: '#26866f', color: 'white', textAlign: 'center',
              display: isWorkReport ? 'none' : 'table-cell' 
            }}>
              {props.children}
            </th>
          ),
        },
      } : undefined}
      bordered={true}
      size="small"
    />
  );
}
