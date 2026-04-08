import React, { useState } from "react";
import {
  Card,
  Button,
  Tag,
  Row,
  Col,
  Popconfirm,
  message,
  Typography,
  Space,
} from "antd";
import {
  EyeOutlined,
  UserOutlined,
  CalendarOutlined,
  InboxOutlined,
} from "@ant-design/icons";
import WRSModal from "../pagecomponents/WRSModal";
const { Text } = Typography;

export default function PRMCardView({ data = [], loading = false }) {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedWRS, setSelectedWRS] = useState(null);

  const handleShowModal = (record) => {
    setSelectedWRS(record);
    setIsModalVisible(true);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Pending":
        return "blue";
      case "Approved":
        return "cyan";
      case "In Progress":
        return "orange";
      case "Completed":
        return "green";
      case "Cancelled":
        return "red";
      default:
        return "default";
    }
  };

  return (
    <>
      <Row gutter={[16, 16]}>
        {data.map((record) => {
          const visibleItems = record.items.slice(0, 2);
          const remainingCount = record.items.length - visibleItems.length;

          const totalQty = record.items.reduce((sum, i) => sum + i.quantity, 0);

          return (
            <Col xs={24} sm={12} md={8} lg={12} key={record._id}>
              <Card
                title={record.wrsNo}
                variant="borderless"
                extra={
                  <Tag color={getStatusColor(record.status)}>
                    {record.status}
                  </Tag>
                }
                loading={loading}
                onClick={() => handleShowModal(record)}
              >
                <Row gutter={[0, 8]}>
                  <Col span={24}>
                    <Text strong style={{ fontSize: 24 }}>
                      {record.items.length} Item/s Requested
                    </Text>
                  </Col>
                  <Col span={24}>
                    <InboxOutlined style={{ marginRight: 4 }} />
                    <Text>Total QTY: </Text>
                    <Text strong>{totalQty}</Text>
                  </Col>
                  <Col span={24}>
                    {" "}
                    <Card size="small" style={{ marginTop: 8 }}>
                      {visibleItems.map((item) => (
                        <div
                          key={item._id}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                          }}
                        >
                          <Text>{item.particular}</Text>
                          <Text strong>x{item.quantity}</Text>
                        </div>
                      ))}
                      {remainingCount > 0 && (
                        <Text type="secondary">+{remainingCount} item/s</Text>
                      )}
                    </Card>
                  </Col>
                  <Col span={24}>
                    <UserOutlined style={{ marginRight: 4 }} />

                    <Text strong>{record.staff.employeeName}</Text>
                  </Col>
                  <Col span={24}>
                    <CalendarOutlined style={{ marginRight: 4 }} />

                    <Text strong>{record.dateRequested}</Text>
                  </Col>
                  <Col span={24}></Col>
                </Row>
              </Card>
            </Col>
          );
        })}
      </Row>

      <WRSModal
        visible={isModalVisible}
        selectedRecord={selectedWRS}
        onClose={() => {
          setIsModalVisible(false);
          setSelectedWRS(null);
        }}
      />
    </>
  );
}
