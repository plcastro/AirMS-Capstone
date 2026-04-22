import React from "react";
import { Table } from "antd";

export default function MLogTable({ headers, data, onRowClick, isSimple, isWorkReport }) {
  const tableData = (data || []).map((record, idx) => ({
    ...record,
    __rowKey:
      record?._id ||
      record?.id ||
      record?.key ||
      `${record?.aircraft || "row"}-${record?.dateDefectRectified || "date"}-${idx}`,
  }));

  const columns = headers.map((header) => ({
    title: header.title,
    dataIndex: header.key,
    key: header.key,
    render: (text, record, index) => {
      if (isWorkReport && header.key === "description") {
        return <div style={{ minHeight: '30px' }}>{index + 1}. {text}</div>;
      }
      return text || "N/A";
    }
  }));

  return (
    <Table
      columns={columns}
      dataSource={tableData}
      rowKey="__rowKey"
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
