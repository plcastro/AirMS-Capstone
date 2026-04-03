import { useState } from "react";
import { Table, Tag, Checkbox } from "antd";

export default function WRSTable({
  data = [],
  loading = false,
  isWD,
  status = "Pending",
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [packedItems, setPackedItems] = useState([]);
  const pageSize = 10;
  const handleCheck = (id) => {
    setPackedItems((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const tableColumns = [
    {
      title: "ITEM NO.",
      dataIndex: "itemNo",
      key: "itemNo",
      width: 100,
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
      width: 90,
    },
    {
      title: "UNIT OF MEASURE",
      dataIndex: "unitOfMeasure",
      key: "unitOfMeasure",
      width: 90,
    },
    {
      title: "PURPOSE",
      dataIndex: "purpose",
      key: "purpose",
    },
  ];

  if (isWD) {
    tableColumns.unshift({
      title: "",
      key: "manual-checkbox",
      width: 50,
      align: "center",
      fixed: "left",
      render: (_, record) => (
        <Checkbox
          checked={status === "Completed" || packedItems.includes(record._id)}
          onChange={() => handleCheck(record._id)}
          disabled={status !== "Approved"}
        />
      ),
    });

    tableColumns.push({
      title: "STATUS",
      key: "status-tag",
      width: 150,
      render: (_, record) => {
        const isPacked = packedItems.includes(record._id);
        return (
          <Tag color={isPacked ? "green" : "blue"}>
            {isPacked ? "PACKED" : "PENDING"}
          </Tag>
        );
      },
    });
  }

  return (
    <Table
      columns={tableColumns}
      dataSource={data}
      rowKey={(record) => record._id}
      loading={loading}
      scroll={{ x: "max-content" }}
      pagination={{
        pageSize: pageSize,
        current: currentPage,
        onChange: (page) => setCurrentPage(page),
        placement: "bottomEnd",
      }}
    />
  );
}
