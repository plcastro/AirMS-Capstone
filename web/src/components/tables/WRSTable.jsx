import React, { useState } from "react";
import { Table } from "antd";

const tableColumns = [
  {
    title: "ITEM NO.",
    dataIndex: "itemNo",
    key: "itemNo",
  },
  {
    title: "MATCODE NO.",
    dataIndex: "matCodeNo",
    key: "matCodeNo",
  },
  {
    title: "PARTICULAR",
    dataIndex: "particular",
    key: "particular",
  },
  {
    title: "QUANTITY",
    dataIndex: "quantity",
    key: "quantity",
  },
  {
    title: "UNIT OF MEASURE",
    dataIndex: "unitOfMeasure",
    key: "unitOfMeasure",
  },
  {
    title: "PURPOSE",
    dataIndex: "purpose",
    key: "purpose",
  },
];

export default function WRSTable({ data = [], loading = false }) {
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  return (
    <Table
      columns={tableColumns}
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
