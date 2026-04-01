import React, { useMemo, useState } from "react";
import { Table, Button, Tag, Space, Popconfirm, message } from "antd";
import { EyeOutlined } from "@ant-design/icons";
import WRSModal from "../pagecomponents/WRSModal";

const tableColumns = [
  {
    title: "WRS No.",
    dataIndex: "wrsNo",
    key: "wrsNo",
  },
  {
    title: "No. of Items",
    dataIndex: "noOfItems",
    key: "noOfItems",
  },
  {
    title: "Date Requested",
    dataIndex: "dateRequested",
    key: "dateRequested",
  },
  {
    title: "Aircraft",
    dataIndex: "aircraft",
    key: "aircraft",
  },
  {
    title: "Status",
    dataIndex: "status",
    key: "status",
  },
  {
    title: "Actions",
    key: "actions",
  },
];

export default function PRMTable({
  data = [],
  onShowDetails,
  selectedRequisition,
  loading = false,
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedWRS, setSelectedWRS] = useState(null);
  const pageSize = 10;
  const columns = useMemo(() => {
    return tableColumns.map((column) => {
      if (column.key === "actions") {
        return {
          title: column.title,
          key: "actions",
          render: (_, record) => (
            <Space>
              <Button
                type="link"
                icon={<EyeOutlined />}
                onClick={() => handleShowModal(record.wrsNo)}
              >
                View Details
              </Button>
              {["Pending"].includes(record.status) && (
                <Popconfirm
                  title="Cancel this requisition?"
                  onConfirm={() => {
                    message.success("Requisition cancelled");
                  }}
                >
                  <Button danger type="link">
                    Cancel
                  </Button>
                </Popconfirm>
              )}
            </Space>
          ),
        };
      }

      if (column.key === "status") {
        return {
          title: column.title,
          dataIndex: "status",
          key: "status",
          filters: [
            { text: "Pending", value: "Pending" },
            { text: "Delivered", value: "Delivered" },
            { text: "Cancelled", value: "Cancelled" },
          ],
          onFilter: (value, record) => record.status === value,
          render: (status) => {
            let color = "default";
            if (status === "Pending") color = "blue";
            if (status === "Delivered") color = "green";
            if (status === "Cancelled") color = "red";
            return <Tag color={color}>{status}</Tag>;
          },
        };
      }

      return {
        title: column.title,
        dataIndex: column.dataIndex,
        key: column.key,
        sorter: (a, b) =>
          String(a[column.key] ?? "").localeCompare(
            String(b[column.key] ?? ""),
          ),
      };
    });
  }, [tableColumns, selectedRequisition, onShowDetails]);

  const handleShowModal = (wrsNo) => {
    setSelectedWRS(wrsNo);
    setIsModalVisible(true);
  };
  return (
    <>
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
      <WRSModal
        visible={isModalVisible}
        wrsNo={selectedWRS}
        onClose={() => {
          setIsModalVisible(false);
          setSelectedWRS(null);
        }}
      />
    </>
  );
}
