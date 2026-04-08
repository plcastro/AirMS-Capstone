import React, { useState } from "react";
import { Card, Tag, Row, Col, Typography } from "antd";
import {
  UserOutlined,
  CalendarOutlined,
  InboxOutlined,
  CheckOutlined,
  CloseOutlined,
  FileDoneOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  SyncOutlined,
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
        return "purple";
      case "Completed":
        return "green";
      case "Rejected":
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
            <Col xs={24} md={12} lg={8} key={record._id}>
              <Card
                style={{
                  height: 330,
                }}
                title={record.wrsNo}
                variant="borderless"
                extra={
                  <Tag
                    variant="outlined"
                    color={getStatusColor(record.status)}
                    icon={
                      record.status === "Pending" ? (
                        <ClockCircleOutlined />
                      ) : record.status === "Approved" ? (
                        <CheckCircleOutlined />
                      ) : record.status === "In Progress" ? (
                        <SyncOutlined spin />
                      ) : record.status === "Completed" ? (
                        <FileDoneOutlined />
                      ) : (
                        <CloseOutlined />
                      )
                    }
                  >
                    {record.status}
                  </Tag>
                }
                loading={loading}
                onClick={() => handleShowModal(record)}
                size="small"
              >
                <Row gutter={[0, 5]}>
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
                    <Card
                      size="small"
                      style={{
                        backgroundColor: "#efefef",
                        marginBottom: 20,
                        marginTop: 8,
                      }}
                    >
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
