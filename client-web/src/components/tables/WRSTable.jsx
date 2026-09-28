import { useState } from "react";
import { Checkbox, Tag } from "antd";
import ResponsiveTable from "../common/ResponsiveTable";

export default function WRSTable({
  data = [],
  loading = false,
  availQtyMap,
  persistedQtyMap,
  setAvailQtyMap,
  disabled,
}) {
  const [currentPage, setCurrentPage] = useState(1);

  const pageSize = 10;

  const hasQtyValue = (record) =>
    Object.prototype.hasOwnProperty.call(availQtyMap, record._id) &&
    availQtyMap[record._id] !== undefined &&
    availQtyMap[record._id] !== null &&
    availQtyMap[record._id] !== "";

  const getQtyValue = (record) =>
    hasQtyValue(record) ? availQtyMap[record._id] : undefined;

  const handleAvailabilityChange = (checked, record) => {
    const requestedQty = Number(record.quantity) || 0;
    setAvailQtyMap((prev) => ({
      ...prev,
      [record._id]: checked ? requestedQty : 0,
    }));
  };

  const getAutoStatus = (record) => {
    const itemStatus = record.stockStatus;
    const hasInput = hasQtyValue(record);

    if (!hasInput && itemStatus === "Parts Requested") {
      return <Tag color="default">Awaiting Input</Tag>;
    }

    const availQty = Number(getQtyValue(record) ?? record.availableQty ?? 0);
    const requestedQty = record.quantity;

    if (itemStatus === "Approved") {
      return <Tag color="cyan">Approved</Tag>;
    }

    if (itemStatus === "Delivered") {
      return <Tag color="green">Delivered</Tag>;
    }

    if (itemStatus === "Cancelled") {
      return <Tag color="red">Cancelled</Tag>;
    }

    if (itemStatus === "To Be Ordered" || itemStatus === "Ordered") {
      if (itemStatus === "Ordered") {
        return <Tag color="blue">Restocked</Tag>;
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
      title: "PARTICULAR",
      dataIndex: "particular",
      key: "particular",
      width: 250,
      onCell: () => ({
        style: {
          whiteSpace: "normal",
          wordBreak: "break-word",
        },
      }),
    },
    {
      title: "REQUESTED QTY",
      dataIndex: "quantity",
      key: "quantity",
      width: 90,
    },

    {
      title: "AVAILABLE",
      dataIndex: "availQty",
      key: "availQty",
      width: 120,
      render: (_, record) => {
        const persistedQty = Number(
          persistedQtyMap?.[record._id] ?? record.availableQty ?? 0,
        );
        const requestedQty = Number(record.quantity) || 0;
        const itemStatus = record.stockStatus;
        const lockedBecauseInStock =
          itemStatus === "In Stock" ||
          itemStatus === "Ordered" ||
          itemStatus === "Approved" ||
          itemStatus === "Delivered" ||
          itemStatus === "Cancelled" ||
          (itemStatus === "To Be Ordered" &&
            persistedQty >= requestedQty &&
            requestedQty > 0);
        const hasInput = hasQtyValue(record);
        const availableQty = Number(
          getQtyValue(record) ?? record.availableQty ?? 0,
        );
        const isAvailable = requestedQty > 0 && availableQty >= requestedQty;

        return (
          <Checkbox
            checked={isAvailable}
            indeterminate={!hasInput && itemStatus === "Parts Requested"}
            onChange={(event) =>
              handleAvailabilityChange(event.target.checked, record)
            }
            disabled={disabled || lockedBecauseInStock}
          >
            Available
          </Checkbox>
        );
      },
    },

    {
      title: "UNIT",
      dataIndex: "unitOfMeasure",
      key: "unitOfMeasure",
      width: 120,
    },
    {
      title: "STATUS",
      key: "autoStatus",
      width: 150,
      render: (_, record) => getAutoStatus(record),
    },
  ];

  return (
    <ResponsiveTable
      columns={tableColumns}
      dataSource={data}
      rowKey={(record) => record._id}
      loading={loading}
      scroll={{ x: "max-content" }}
      size={"small"}
      pagination={{
        pageSize,
        current: currentPage,
        onChange: (page) => setCurrentPage(page),
        placement: "bottomEnd",
      }}
    />
  );
}
