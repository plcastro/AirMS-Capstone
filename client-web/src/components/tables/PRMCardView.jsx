import React, { useState } from "react";
import { Card, Col, Empty, Row, Tag, Typography } from "antd";
import {
  CalendarOutlined,
  CheckCircleOutlined,
  FileDoneOutlined,
  InboxOutlined,
  SyncOutlined,
  ShoppingCartOutlined,
  UserOutlined,
} from "@ant-design/icons";
import WRSModal from "../pagecomponents/WRSModal";

const { Paragraph, Text, Title } = Typography;

const getStatusMeta = (status) => {
  switch (status) {
    case "Parts Requested":
      return {
        color: "default",
        icon: <InboxOutlined />,
      };
    case "To Be Ordered":
      return {
        color: "orange",
        icon: <ShoppingCartOutlined />,
      };
    case "Ordered":
      return {
        color: "blue",
        icon: <SyncOutlined spin />,
      };
    case "Approved":
      return {
        color: "cyan",
        icon: <CheckCircleOutlined />,
      };
    case "Delivered":
      return {
        color: "green",
        icon: <FileDoneOutlined />,
      };
    default:
      return {
        color: "default",
        icon: <InboxOutlined />,
      };
  }
};

export default function PRMCardView({
  data = [],
  loading = false,
  onUpdated,
}) {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedWRS, setSelectedWRS] = useState(null);

  const handleShowModal = (record) => {
    setSelectedWRS(record);
    setIsModalVisible(true);
  };

  if (!data.length && !loading) {
    return (
      <Card
        variant="borderless"
        style={{ borderRadius: 18, padding: 24, textAlign: "center" }}
      >
        <Empty
          description="No warehouse requisitions match the current filters."
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </Card>
    );
  }

  return (
    <>
      <Row gutter={[16, 16]}>
        {data.map((record) => {
          const visibleItems = record.items.slice(0, 3);
          const remainingCount = record.items.length - visibleItems.length;
          const statusMeta = getStatusMeta(record.status);

          return (
            <Col xs={24} md={12} xl={8} key={record._id}>
              <Card
                hoverable
                loading={loading}
                onClick={() => handleShowModal(record)}
                variant="borderless"
                style={{
                  height: "100%",
                  minHeight: 340,
                  borderRadius: 18,
                  boxShadow: "0 12px 28px rgba(0, 0, 0, 0.06)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 16,
                    marginBottom: 18,
                  }}
                >
                  <div>
                    <Title level={4} style={{ margin: 0 }}>
                      {record.wrsNo}
                    </Title>
                    <Text type="secondary">{record.aircraft}</Text>
                  </div>
                  <Tag color={statusMeta.color} icon={statusMeta.icon}>
                    {record.status}
                  </Tag>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                    gap: 12,
                    marginBottom: 18,
                  }}
                >
                  <Card size="small" style={{ borderRadius: 12, background: "#fafafa" }}>
                    <Text type="secondary">Items</Text>
                    <Title level={3} style={{ margin: "6px 0 0" }}>
                      {record.noOfItems}
                    </Title>
                  </Card>
                  <Card size="small" style={{ borderRadius: 12, background: "#fafafa" }}>
                    <Text type="secondary">Total Qty</Text>
                    <Title level={3} style={{ margin: "6px 0 0" }}>
                      {record.totalQty}
                    </Title>
                  </Card>
                </div>

                <div
                  style={{
                    borderRadius: 14,
                    background: "#fafafa",
                    padding: 14,
                    marginBottom: 18,
                    minHeight: 116,
                  }}
                >
                  {visibleItems.map((item) => (
                    <div
                      key={item._id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 16,
                        marginBottom: 10,
                      }}
                    >
                      <Paragraph
                        ellipsis={{ rows: 1 }}
                        style={{ marginBottom: 0, flex: 1 }}
                      >
                        {item.particular}
                      </Paragraph>
                      <Text strong>
                        x{item.quantity} {item.unitOfMeasure}
                      </Text>
                    </div>
                  ))}
                  {remainingCount > 0 && (
                    <Text type="secondary">+{remainingCount} more item(s)</Text>
                  )}
                </div>

                <div style={{ display: "grid", gap: 8 }}>
                  <Text>
                    <UserOutlined style={{ marginRight: 8 }} />
                    <Text strong>{record.staff.employeeName}</Text>
                  </Text>
                  <Text>
                    <CalendarOutlined style={{ marginRight: 8 }} />
                    <Text strong>{record.dateRequested}</Text>
                  </Text>
                </div>
              </Card>
            </Col>
          );
        })}
      </Row>

      <WRSModal
        visible={isModalVisible}
        selectedRecord={selectedWRS}
        onUpdated={onUpdated}
        onClose={() => {
          setIsModalVisible(false);
          setSelectedWRS(null);
        }}
      />
    </>
  );
}
