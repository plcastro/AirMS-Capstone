import { useState } from "react";
import { Table, InputNumber, Tag } from "antd";

export default function WRSTable({
  data = [],
  loading = false,
  availQtyMap,
  setAvailQtyMap,
  disabled,
}) {
  const [currentPage, setCurrentPage] = useState(1);

  const pageSize = 10;

  const handleAvailQtyChange = (value, record) => {
    setAvailQtyMap((prev) => ({
      ...prev,
      [record._id]: value,
    }));
  };

  const getAutoStatus = (record) => {
    const availQty = availQtyMap[record._id] ?? record.availQty ?? 0;
    const requestedQty = record.quantity;
    const currentStatus = record.stockStatus;

    if (currentStatus === "Approved") {
      return <Tag color="cyan">Approved</Tag>;
    }

    if (currentStatus === "Delivered") {
      return <Tag color="green">Delivered</Tag>;
    }

    if (currentStatus === "Cancelled") {
      return <Tag color="red">Cancelled</Tag>;
    }

    if (currentStatus === "To Be Ordered" || currentStatus === "Ordered") {
      if (availQty >= requestedQty && requestedQty > 0) {
        return <Tag color="blue">Ordered</Tag>;
      }

      return <Tag color="orange">To Be Ordered</Tag>;
    }

    if (availQty === 0) {
      return <Tag color="red">Out of Stock</Tag>;
    }

    return availQty >= requestedQty ? (
      <Tag color="green">In Stock</Tag>
    ) : (
      <Tag color="red">Out of Stock</Tag>
    );
  };

  const tableColumns = [
    {
      title: "ITEM NO.",
      dataIndex: "itemNo",
      key: "itemNo",
      width: 50,
    },
    {
      title: "MATCODE NO.",
      dataIndex: "matCodeNo",
      key: "matCodeNo",
      width: 100,
    },
    {
      title: "PARTICULAR",
      dataIndex: "particular",
      key: "particular",
      width: 400,
    },
    {
      title: "REQUESTED QTY",
      dataIndex: "quantity",
      key: "quantity",
      width: 90,
    },

    {
      title: "AVAILABLE QTY",
      dataIndex: "availQty",
      key: "availQty",
      width: 120,
      render: (_, record) => (
        <InputNumber
          min={0}
          max={999}
          style={{ width: "100%" }}
          placeholder="Enter qty"
          value={availQtyMap[record._id] ?? record.availableQty ?? null}
          onChange={(value) => handleAvailQtyChange(value, record)}
          disabled={disabled}
        />
      ),
    },

    {
      title: "UNIT OF MEASURE",
      dataIndex: "unitOfMeasure",
      key: "unitOfMeasure",
      width: 120,
    },
    {
      title: "AUTO STATUS",
      key: "autoStatus",
      width: 150,
      render: (_, record) => getAutoStatus(record),
    },
  ];

  return (
    <Table
      columns={tableColumns}
      dataSource={data}
      rowKey={(record) => record._id}
      loading={loading}
      scroll={{ x: "max-content" }}
      pagination={{
        pageSize,
        current: currentPage,
        onChange: (page) => setCurrentPage(page),
        placement: "bottomEnd",
      }}
    />
  );
}
