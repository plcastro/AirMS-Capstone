import React, { useContext, useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  Col,
  Divider,
  Modal,
  Row,
  Tag,
  Timeline,
  Typography,
  message,
} from "antd";
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  FileDoneOutlined,
  InboxOutlined,
  ShoppingCartOutlined,
  SyncOutlined,
} from "@ant-design/icons";
import { AuthContext } from "../../context/AuthContext";
import { API_BASE } from "../../utils/API_BASE";
import WRSTable from "../tables/WRSTable";

const { Paragraph, Text, Title } = Typography;

const statusSteps = [
  "Parts Requested",
  "To Be Ordered",
  "Ordered",
  "Approved",
  "Delivered",
];

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

const getItemStockStatus = (record, availQty) => {
  if (record.stockStatus === "Approved") {
    return "Approved";
  }

  if (record.stockStatus === "Delivered") {
    return "Delivered";
  }

  if (record.stockStatus === "Cancelled") {
    return "Cancelled";
  }

  if (record.stockStatus === "To Be Ordered" || record.stockStatus === "Ordered") {
    return availQty >= record.quantity ? "Ordered" : "To Be Ordered";
  }

  return availQty >= record.quantity ? "In Stock" : "Out of Stock";
};

export default function WRSModal({
  visible,
  onClose,
  selectedRecord,
  onUpdated,
}) {
  const { user, getAuthHeader } = useContext(AuthContext);
  const [availQtyMap, setAvailQtyMap] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!selectedRecord) {
      return;
    }

    const nextMap = {};
    (selectedRecord.items || []).forEach((item) => {
      nextMap[item._id] = item.availableQty ?? item.availQty ?? 0;
    });
    setAvailQtyMap(nextMap);
  }, [selectedRecord]);

  const currentStatus = selectedRecord?.status;
  const currentStepIndex = statusSteps.indexOf(currentStatus);
  const statusMeta = getStatusMeta(currentStatus);

  const totalQty = useMemo(
    () =>
      selectedRecord?.items?.reduce(
        (sum, item) => sum + (Number(item.quantity) || 0),
        0,
      ) || 0,
    [selectedRecord],
  );

  const allQuantitiesFilled = useMemo(
    () =>
      (selectedRecord?.items || []).every((item) => {
        const value = availQtyMap[item._id];
        return value !== undefined && value !== null && value !== "";
      }),
    [availQtyMap, selectedRecord],
  );

  const nextAction = useMemo(() => {
    if (!selectedRecord) {
      return {
        title: "Next Action",
        description: "",
        buttonText: "Submit",
        disabled: true,
      };
    }

    if (currentStatus === "Approved") {
      return {
        title: "Delivery",
        description: "Warehouse can now mark this approved requisition as delivered.",
        buttonText: "Mark Delivered",
        disabled: false,
      };
    }

    if (currentStatus === "Delivered" || currentStatus === "Cancelled") {
      return {
        title: "Completed",
        description: "No further warehouse action is needed for this requisition.",
        buttonText: "Done",
        disabled: true,
      };
    }

    if (currentStatus === "To Be Ordered") {
      return {
        title: "Ordered Stock",
        description:
          "Update quantities for items marked to be ordered. Enough stock will move them to Ordered.",
        buttonText: "Update Ordered Items",
        disabled: !allQuantitiesFilled,
      };
    }

    if (currentStatus === "Ordered") {
      return {
        title: "Awaiting Approval",
        description:
          "Warehouse already confirmed the ordered items are available. Waiting for maintenance manager approval.",
        buttonText: "Waiting",
        disabled: true,
      };
    }

    return {
      title: "Stock Review",
      description:
        "Enter available quantities for all items so warehouse can return in-stock and out-of-stock results.",
      buttonText: "Submit Stock Review",
      disabled: !allQuantitiesFilled,
    };
  }, [allQuantitiesFilled, currentStatus, selectedRecord]);

  const updateRequisition = async (payload, successMessage) => {
    setSubmitting(true);

    try {
      const response = await fetch(
        `${API_BASE}/api/parts-requisition/update-requisition/${selectedRecord._id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(await getAuthHeader()),
          },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => null);
        throw new Error(errorPayload?.message || "Failed to update requisition");
      }

      message.success(successMessage);
      onUpdated?.();
      onClose();
    } catch (error) {
      message.error(error.message || "Failed to update requisition");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedRecord) {
      return;
    }

    const warehouseName =
      `${user?.firstName || ""} ${user?.lastName || ""}`.trim() ||
      "Warehouse Department";

    if (currentStatus === "Approved") {
      await updateRequisition(
        {
          status: "Delivered",
          dateDelivered: new Date().toISOString(),
          dateReceived: new Date().toISOString(),
          deliveredBy: warehouseName,
          warehouseBy: warehouseName,
          items: (selectedRecord.items || []).map((item) => ({
            ...item,
            availableQty: Number(availQtyMap[item._id] ?? item.availableQty ?? 0),
            stockStatus: "Delivered",
          })),
        },
        "Requisition marked as delivered.",
      );
      return;
    }

    const updatedItems = (selectedRecord.items || []).map((item) => {
      const availableQty = Number(availQtyMap[item._id] ?? item.availableQty ?? 0);

      return {
        ...item,
        availableQty,
        stockStatus: getItemStockStatus(item, availableQty),
      };
    });

    const nextStatus =
      currentStatus === "To Be Ordered"
        ? updatedItems.some((item) => item.stockStatus === "To Be Ordered")
          ? "To Be Ordered"
          : "Ordered"
        : currentStatus;

    await updateRequisition(
      {
        status: nextStatus,
        dateWarehouseReviewed: new Date().toISOString(),
        warehouseBy: warehouseName,
        items: updatedItems,
      },
      currentStatus === "To Be Ordered"
        ? "Ordered items updated successfully."
        : "Warehouse stock review submitted successfully.",
    );
  };

  if (!selectedRecord) return null;

  return (
    <Modal
      open={visible}
      onCancel={onClose}
      width={1100}
      centered
      footer={null}
      title={
        <div>
          <Title level={4} style={{ margin: 0 }}>
            Warehouse Requisition Details
          </Title>
          <Text type="secondary">
            Review stock, confirm ordered items, and mark approved requisitions as
            delivered.
          </Text>
        </div>
      }
    >
      <Row gutter={[20, 20]}>
        <Col xs={24} xl={15}>
          <Card
            variant="borderless"
            style={{ borderRadius: 18, background: "#fafafa" }}
          >
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12}>
                <Text type="secondary">WRS No.</Text>
                <Title level={5} style={{ marginTop: 6 }}>
                  {selectedRecord.wrsNo}
                </Title>
              </Col>
              <Col xs={24} sm={12}>
                <Text type="secondary">Status</Text>
                <div style={{ marginTop: 6 }}>
                  <Tag color={statusMeta.color} icon={statusMeta.icon}>
                    {selectedRecord.status}
                  </Tag>
                </div>
              </Col>
              <Col xs={24} sm={12}>
                <Text type="secondary">Aircraft</Text>
                <Paragraph style={{ marginTop: 6, marginBottom: 0 }}>
                  <Text strong>{selectedRecord.aircraft}</Text>
                </Paragraph>
              </Col>
              <Col xs={24} sm={12}>
                <Text type="secondary">Requested By</Text>
                <Paragraph style={{ marginTop: 6, marginBottom: 0 }}>
                  <Text strong>
                    {selectedRecord.staff?.employeeName ||
                      selectedRecord.staff?.requisitioner}
                  </Text>
                </Paragraph>
              </Col>
              <Col xs={24} sm={12}>
                <Text type="secondary">Date Requested</Text>
                <Paragraph style={{ marginTop: 6, marginBottom: 0 }}>
                  <Text strong>{selectedRecord.dateRequested}</Text>
                </Paragraph>
              </Col>
              <Col xs={24} sm={12}>
                <Text type="secondary">Total Items</Text>
                <Paragraph style={{ marginTop: 6, marginBottom: 0 }}>
                  <Text strong>{selectedRecord.items.length}</Text>
                </Paragraph>
              </Col>
              <Col xs={24} sm={12}>
                <Text type="secondary">Total Quantity</Text>
                <Paragraph style={{ marginTop: 6, marginBottom: 0 }}>
                  <Text strong>{totalQty}</Text>
                </Paragraph>
              </Col>
            </Row>
          </Card>

          <Divider titlePlacement="left">Requested Items</Divider>

          <WRSTable
            data={selectedRecord.items}
            availQtyMap={availQtyMap}
            setAvailQtyMap={setAvailQtyMap}
            disabled={
              currentStatus === "Ordered" ||
              currentStatus === "Approved" ||
              currentStatus === "Delivered"
            }
          />
        </Col>

        <Col xs={24} xl={9}>
          <Card
            variant="borderless"
            style={{ borderRadius: 18, marginBottom: 16 }}
          >
            <Title level={5}>Warehouse Flow</Title>
            <Timeline
              items={statusSteps.map((step, index) => {
                const isCompleted = index < currentStepIndex;
                const isCurrent = index === currentStepIndex;

                return {
                  icon: isCompleted ? (
                    <CheckCircleOutlined style={{ color: "#52c41a" }} />
                  ) : isCurrent ? (
                    <ClockCircleOutlined style={{ color: "#13c2c2" }} />
                  ) : (
                    <ClockCircleOutlined style={{ color: "#d9d9d9" }} />
                  ),
                  content: (
                    <div
                      style={{ opacity: isCompleted || isCurrent ? 1 : 0.55 }}
                    >
                      <Text strong>{step}</Text>
                      <div>
                        <Text type="secondary">
                          {step === "Approved" &&
                            "Maintenance manager approved the requisition because all items are available."}
                          {step === "Parts Requested" &&
                            "Warehouse checks whether each requested item is in stock or out of stock."}
                          {step === "To Be Ordered" &&
                            "Maintenance manager requested ordering for the unavailable items."}
                          {step === "Ordered" &&
                            "Warehouse confirmed the previously unavailable items are now available."}
                          {step === "Delivered" &&
                            "Warehouse completed the release and marked the requisition as delivered."}
                        </Text>
                      </div>
                    </div>
                  ),
                };
              })}
            />
          </Card>

          <Card variant="borderless" style={{ borderRadius: 18 }}>
            <Title level={5}>{nextAction.title}</Title>
            <Paragraph type="secondary">{nextAction.description}</Paragraph>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Button onClick={onClose}>Close</Button>
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                loading={submitting}
                disabled={nextAction.disabled}
                onClick={handleSubmit}
              >
                {nextAction.buttonText}
              </Button>
            </div>
          </Card>
        </Col>
      </Row>
    </Modal>
  );
}
