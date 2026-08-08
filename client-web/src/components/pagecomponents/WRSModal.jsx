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
import ResultPopup from "../common/ResultPopup";

const { Paragraph, Text, Title } = Typography;

const normalizeRequisitionStatus = (status) => {
  const normalized = String(status || "")
    .trim()
    .toLowerCase();

  switch (normalized) {
    case "pending":
      return "Parts Requested";
    case "in progress":
      return "Ordered";
    case "completed":
      return "Delivered";
    case "rejected":
      return "Cancelled";
    case "parts requested":
      return "Parts Requested";
    case "availability checked":
      return "Availability Checked";
    case "to be ordered":
      return "To Be Ordered";
    case "ordered":
      return "Ordered";
    case "approved":
      return "Approved";
    case "delivered":
      return "Delivered";
    case "cancelled":
      return "Cancelled";
    default:
      return status;
  }
};

const normalizeItemStatus = (status) => {
  const normalized = String(status || "")
    .trim()
    .toLowerCase();

  switch (normalized) {
    case "ready for pickup":
      return "Ordered";
    case "to be ordered":
      return "To Be Ordered";
    case "ordered":
      return "Ordered";
    case "approved":
      return "Approved";
    case "delivered":
      return "Delivered";
    case "cancelled":
      return "Cancelled";
    case "in stock":
      return "In Stock";
    case "out of stock":
      return "Out of Stock";
    case "parts requested":
      return "Parts Requested";
    default:
      return status;
  }
};

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
    case "Availability Checked":
      return {
        color: "gold",
        icon: <ClockCircleOutlined />,
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

const getStatusDisplayLabel = (status) =>
  status === "Ordered" ? "Restocked" : status;

const getItemStockStatus = (record, availQty) => {
  const currentItemStatus = normalizeItemStatus(record.stockStatus);

  if (currentItemStatus === "Approved") {
    return "Approved";
  }

  if (currentItemStatus === "Delivered") {
    return "Delivered";
  }

  if (currentItemStatus === "Cancelled") {
    return "Cancelled";
  }

  if (
    currentItemStatus === "To Be Ordered" ||
    currentItemStatus === "Ordered"
  ) {
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
  const userRole = user?.jobTitle?.toLowerCase() || "";
  const userTitle = user?.jobTitle || user?.access || "User";
  const isWarehouseStaff = userRole === "warehouse staff";
  const isMaintenanceReviewer = [
    "superadmin",
    "maintenance manager",
    "officer-in-charge",
  ].includes(userRole);
  const [availQtyMap, setAvailQtyMap] = useState({});
  const [persistedQtyMap, setPersistedQtyMap] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [closeAfterSuccess, setCloseAfterSuccess] = useState(false);
  const [successPopup, setSuccessPopup] = useState({
    open: false,
    status: "success",
    title: "",
    subTitle: "",
  });

  useEffect(() => {
    if (!selectedRecord) {
      return;
    }

    const normalizedStatus = normalizeRequisitionStatus(selectedRecord.status);
    const isInitialStockReview =
      normalizedStatus === "Parts Requested" &&
      !selectedRecord.dateWarehouseReviewed;

    const nextMap = {};
    (selectedRecord.items || []).forEach((item) => {
      nextMap[item._id] = isInitialStockReview
        ? undefined
        : (item.availableQty ?? item.availQty);
    });
    setAvailQtyMap(nextMap);
    setPersistedQtyMap(nextMap);
  }, [selectedRecord]);

  const rawStatus = normalizeRequisitionStatus(selectedRecord?.status);
  const currentStatus =
    rawStatus === "Parts Requested" && selectedRecord?.dateWarehouseReviewed
      ? "Availability Checked"
      : rawStatus;
  const hasNotInStockItems = useMemo(
    () =>
      (selectedRecord?.items || []).some((item) => {
        const requestedQty = Number(item.quantity) || 0;
        const availableQty = Number(item.availableQty) || 0;
        const stockStatus = normalizeItemStatus(item.stockStatus);

        return (
          availableQty < requestedQty ||
          stockStatus === "Out of Stock" ||
          stockStatus === "To Be Ordered"
        );
      }),
    [selectedRecord],
  );

  const shouldShowOrderingSteps = useMemo(
    () =>
      hasNotInStockItems ||
      Boolean(selectedRecord?.dateOrdered) ||
      ["To Be Ordered", "Ordered"].includes(currentStatus),
    [currentStatus, hasNotInStockItems, selectedRecord],
  );

  const statusSteps = useMemo(() => {
    const steps = ["Parts Requested", "Availability Checked"];

    if (shouldShowOrderingSteps) {
      steps.push("To Be Ordered", "Ordered");
    }

    steps.push("Approved", "Delivered");
    return steps;
  }, [shouldShowOrderingSteps]);

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

  const hasUnsavedStockChanges = useMemo(
    () =>
      (selectedRecord?.items || []).some((item) => {
        const currentValue = Number(availQtyMap[item._id] ?? 0);
        const persistedValue = Number(persistedQtyMap[item._id] ?? 0);
        return currentValue !== persistedValue;
      }),
    [availQtyMap, persistedQtyMap, selectedRecord],
  );

  const allRestockItemsReady = useMemo(
    () =>
      (selectedRecord?.items || []).every((item) => {
        const persistedValue = Number(persistedQtyMap[item._id] ?? 0);
        return persistedValue >= Number(item.quantity || 0);
      }),
    [persistedQtyMap, selectedRecord],
  );
  const hasItemsStillOutOfStock = useMemo(
    () =>
      (selectedRecord?.items || []).some((item) => {
        const requestedQty = Number(item.quantity || 0);
        const availableQty = Number(item.availableQty || 0);
        return availableQty < requestedQty;
      }),
    [selectedRecord],
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
      if (!isWarehouseStaff) {
        return {
          title: "Awaiting Delivery",
          description:
            "Approved requisition is waiting for warehouse to mark delivery.",
          buttonText: "Waiting",
          disabled: true,
        };
      }

      return {
        title: "Delivery",
        description:
          "Warehouse can now mark this approved requisition as delivered.",
        buttonText: "Mark Delivered",
        disabled: false,
      };
    }

    if (currentStatus === "Delivered" || currentStatus === "Cancelled") {
      return {
        title: "Completed",
        description:
          "No further warehouse action is needed for this requisition.",
        buttonText: "",
        disabled: true,
      };
    }

    if (currentStatus === "Availability Checked") {
      if (isMaintenanceReviewer) {
        return {
          title: hasItemsStillOutOfStock
            ? "Order Decision"
            : "Approval Decision",
          description: hasItemsStillOutOfStock
            ? "Some items are not enough in stock. Send this requisition to ordering."
            : "All requested quantities are available. You can approve this requisition.",
          buttonText: hasItemsStillOutOfStock
            ? "Mark To Be Ordered"
            : "Approve",
          disabled: false,
        };
      }

      return {
        title: "Awaiting Maintenance Review",
        description:
          "Stock availability has been submitted. Waiting for maintenance reviewer action.",
        buttonText: "Waiting",
        disabled: true,
      };
    }

    if (currentStatus === "To Be Ordered") {
      if (!isWarehouseStaff) {
        return {
          title: "Awaiting Warehouse Restock",
          description:
            "Warehouse is updating and confirming restocked quantities.",
          buttonText: "Waiting",
          disabled: true,
        };
      }

      return {
        title: hasUnsavedStockChanges ? "Save Stock" : "Confirm Restock",
        description: hasUnsavedStockChanges
          ? "Save the edited stock quantities first."
          : "Once saved quantities are enough, warehouse can mark the requisition as restocked.",
        buttonText: hasUnsavedStockChanges ? "Save Stock" : "Mark as Restocked",
        disabled: hasUnsavedStockChanges
          ? !allQuantitiesFilled
          : !allRestockItemsReady,
      };
    }

    if (currentStatus === "Ordered") {
      if (isMaintenanceReviewer) {
        return {
          title: "Final Approval",
          description:
            "Warehouse confirmed restock. You can now approve this requisition.",
          buttonText: "Approve",
          disabled: false,
        };
      }

      return {
        title: "Awaiting Approval",
        description:
          "Warehouse already confirmed the items are restocked. Waiting for maintenance reviewer approval.",
        buttonText: "Waiting",
        disabled: true,
      };
    }

    return {
      title: isWarehouseStaff ? "Stock Review" : "Awaiting Warehouse Review",
      description: isWarehouseStaff
        ? "Enter available quantities for all items so warehouse can return in-stock and out-of-stock results."
        : "Warehouse is currently reviewing stock availability for this requisition.",
      buttonText: isWarehouseStaff ? "Submit Stock Review" : "Waiting",
      disabled: isWarehouseStaff ? !allQuantitiesFilled : true,
    };
  }, [
    allQuantitiesFilled,
    allRestockItemsReady,
    currentStatus,
    hasItemsStillOutOfStock,
    hasUnsavedStockChanges,
    isMaintenanceReviewer,
    isWarehouseStaff,
    selectedRecord,
  ]);

  const updateRequisition = async (
    payload,
    successMessage,
    shouldClose = true,
  ) => {
    setSubmitting(true);

    try {
      const response = await fetch(
        `${API_BASE}/api/parts-requisition/update-requisition/${selectedRecord._id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-action-confirmed": "true",
            ...(await getAuthHeader()),
          },
          body: JSON.stringify({
            ...payload,
            confirmAction: true,
          }),
        },
      );

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => null);
        console.error("WRS update failed", {
          payload,
          responseStatus: response.status,
          errorPayload,
        });
        throw new Error(
          errorPayload?.message || "Failed to update requisition",
        );
      }

      setCloseAfterSuccess(shouldClose);
      setSuccessPopup({
        open: true,
        status: "success",
        title: "Success",
        subTitle: successMessage,
      });
      onUpdated?.();
    } catch (error) {
      setCloseAfterSuccess(false);
      setSuccessPopup({
        open: true,
        status: "error",
        title: "Operation failed!",
        subTitle: error.message || "Failed to update requisition",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSuccessPopupClose = () => {
    setSuccessPopup((current) => ({ ...current, open: false }));
    if (closeAfterSuccess) {
      setCloseAfterSuccess(false);
      onClose();
    }
  };

  const handleSubmit = async () => {
    if (!selectedRecord) {
      return;
    }

    const confirmSubmit = (content) =>
      new Promise((resolve) => {
        Modal.confirm({
          title: nextAction.buttonText || "Confirm Action",
          content:
            content ||
            nextAction.description ||
            "Are you sure you want to continue?",
          okText: nextAction.buttonText || "Confirm",
          cancelText: "Cancel",
          centered: true,
          zIndex: 1200,
          onOk: () => resolve(true),
          onCancel: () => resolve(false),
        });
      });

    const warehouseName =
      `${user?.firstName || ""} ${user?.lastName || ""}`.trim() ||
      "Warehouse Staff";
    const reviewerName =
      `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || userTitle;

    if (isMaintenanceReviewer && currentStatus === "Availability Checked") {
      const nextReviewerStatus = hasItemsStillOutOfStock
        ? "To Be Ordered"
        : "Approved";
      const confirmed = await confirmSubmit(
        nextReviewerStatus === "Approved"
          ? "Approve this requisition?"
          : "Mark this requisition as to be ordered?",
      );
      if (!confirmed) return;
      await updateRequisition(
        {
          status: nextReviewerStatus,
          ...(nextReviewerStatus === "To Be Ordered"
            ? {
                items: (selectedRecord.items || []).map((item) => ({
                  ...item,
                  stockStatus:
                    Number(item.availableQty || 0) < Number(item.quantity || 0)
                      ? "To Be Ordered"
                      : normalizeItemStatus(item.stockStatus),
                })),
              }
            : {}),
          approvedBy: reviewerName,
          approvedByTitle: userTitle,
          dateApproved:
            nextReviewerStatus === "Approved"
              ? new Date().toISOString()
              : undefined,
          approvedAt:
            nextReviewerStatus === "Approved"
              ? new Date().toISOString()
              : undefined,
        },
        nextReviewerStatus === "Approved"
          ? "Requisition approved."
          : "Requisition marked to be ordered.",
      );
      return;
    }

    if (isMaintenanceReviewer && currentStatus === "Ordered") {
      const confirmed = await confirmSubmit(
        "Approve this restocked requisition?",
      );
      if (!confirmed) return;
      await updateRequisition(
        {
          status: "Approved",
          approvedBy: reviewerName,
          approvedByTitle: userTitle,
          dateApproved: new Date().toISOString(),
          approvedAt: new Date().toISOString(),
        },
        "Requisition approved.",
      );
      return;
    }

    if (currentStatus === "Approved") {
      if (!isWarehouseStaff) {
        return;
      }

      const confirmed = await confirmSubmit(
        "Mark this approved requisition as delivered?",
      );
      if (!confirmed) return;
      await updateRequisition(
        {
          status: "Delivered",
          dateDelivered: new Date().toISOString(),
          dateReceived: new Date().toISOString(),
          deliveredBy: warehouseName,
          deliveredByTitle: userTitle,
          warehouseBy: warehouseName,
          warehouseByTitle: userTitle,
          items: (selectedRecord.items || []).map((item) => ({
            ...item,
            availableQty: Number(
              availQtyMap[item._id] ?? item.availableQty ?? 0,
            ),
            stockStatus: "Delivered",
          })),
        },
        "Requisition marked as delivered.",
      );
      return;
    }

    const updatedItems = (selectedRecord.items || []).map((item) => {
      const availableQty = Number(
        availQtyMap[item._id] ?? item.availableQty ?? 0,
      );
      const requestedQty = Number(item.quantity) || 0;

      return {
        ...item,
        availableQty,
        stockStatus:
          currentStatus === "To Be Ordered" && availableQty < requestedQty
            ? "To Be Ordered"
            : getItemStockStatus(item, availableQty),
      };
    });

    if (currentStatus === "To Be Ordered" && hasUnsavedStockChanges) {
      if (!isWarehouseStaff) {
        return;
      }

      const confirmed = await confirmSubmit(
        "Save the updated stock quantities for this requisition?",
      );
      if (!confirmed) return;
      const savedItems = (selectedRecord.items || []).map((item) => {
        const availableQty = Number(
          availQtyMap[item._id] ?? item.availableQty ?? 0,
        );
        const requestedQty = Number(item.quantity) || 0;

        return {
          ...item,
          availableQty,
          stockStatus:
            availableQty < requestedQty
              ? "To Be Ordered"
              : normalizeItemStatus(item.stockStatus),
        };
      });

      await updateRequisition(
        {
          status: "To Be Ordered",
          warehouseBy: warehouseName,
          warehouseByTitle: userTitle,
          items: savedItems,
        },
        "Stock quantities saved.",
        false,
      );
      setPersistedQtyMap({ ...availQtyMap });
      return;
    }

    const nextStatus =
      currentStatus === "To Be Ordered"
        ? updatedItems.some(
            (item) => normalizeItemStatus(item.stockStatus) === "To Be Ordered",
          )
          ? "To Be Ordered"
          : "Ordered"
        : currentStatus;

    const finalItems = updatedItems;

    if (currentStatus === "Parts Requested") {
      const hasPartialOrZeroStock = finalItems.some(
        (item) => Number(item.availableQty) < Number(item.quantity),
      );

      if (hasPartialOrZeroStock) {
        const proceed = await new Promise((resolve) => {
          Modal.confirm({
            title: "Confirm Stock Review Submission",
            content:
              "Some items have partial or zero available quantity. Submit stock review anyway?",
            okText: "Submit",
            cancelText: "Cancel",
            centered: true,
            zIndex: 1200,
            onOk: () => resolve(true),
            onCancel: () => resolve(false),
          });
        });

        if (!proceed) {
          return;
        }
      } else {
        const confirmed = await confirmSubmit(
          "Submit this warehouse stock review?",
        );
        if (!confirmed) return;
      }
    } else {
      const confirmed = await confirmSubmit(
        currentStatus === "To Be Ordered"
          ? "Mark this requisition as restocked?"
          : undefined,
      );
      if (!confirmed) return;
    }

    await updateRequisition(
      {
        status: nextStatus,
        ...(currentStatus === "Parts Requested"
          ? { dateWarehouseReviewed: new Date().toISOString() }
          : {}),
        ...(currentStatus === "To Be Ordered"
          ? { dateOrdered: new Date().toISOString() }
          : {}),
        warehouseBy: warehouseName,
        warehouseByTitle: userTitle,
        items: finalItems,
      },
      currentStatus === "To Be Ordered"
        ? nextStatus === "Ordered"
          ? "Requisition marked as restocked."
          : "Remaining items are still to be restocked."
        : "Warehouse stock review submitted successfully.",
    );
  };

  if (!selectedRecord) return null;

  return (
    <>
      <Modal
        open={visible}
        onCancel={onClose}
        width={"95%"}
        height={"90vh"}
        centered
        footer={null}
        zIndex={1100}
        title={
          <div>
            <Title level={4} style={{ margin: 0 }}>
              Warehouse Requisition Details
            </Title>
            <Text type="secondary">
              Review stock, confirm ordered items, and mark approved requisitions
              as delivered.
            </Text>
          </div>
        }
      >
        <Row gutter={[20, 20]}>
          <Col xs={24} xl={17}>
            <Card
              variant="borderless"
              style={{ borderRadius: 18, background: "#fafafa" }}
            >
              <Row gutter={[16, 16]}>
                <Col xs={12} sm={12} md={6}>
                  <Text type="secondary">WRS No.</Text>
                  <Title level={5} style={{ marginTop: 6 }}>
                    {selectedRecord.wrsNo}
                  </Title>
                </Col>
                <Col xs={12} sm={12} md={6}>
                  <Text type="secondary">Status</Text>
                  <div style={{ marginTop: 6 }}>
                    <Tag color={statusMeta.color} icon={statusMeta.icon}>
                      {getStatusDisplayLabel(currentStatus)}
                    </Tag>
                  </div>
                </Col>
                <Col xs={12} sm={12} md={6}>
                  <Text type="secondary">Aircraft</Text>
                  <Paragraph style={{ marginTop: 6, marginBottom: 0 }}>
                    <Text strong>{selectedRecord.aircraft}</Text>
                  </Paragraph>
                </Col>
                <Col xs={12} sm={12} md={6}>
                  <Text type="secondary">Requested By</Text>
                  <Paragraph style={{ marginTop: 6, marginBottom: 0 }}>
                    <Text strong>
                      {selectedRecord.staff?.employeeName ||
                        selectedRecord.staff?.requisitioner}
                    </Text>
                  </Paragraph>
                </Col>
                <Col xs={12} sm={12} md={6}>
                  <Text type="secondary">Date Requested</Text>
                  <Paragraph style={{ marginTop: 6, marginBottom: 0 }}>
                    <Text strong>{selectedRecord.dateRequested}</Text>
                  </Paragraph>
                </Col>
                <Col xs={12} sm={12} md={6}>
                  <Text type="secondary">Total Items</Text>
                  <Paragraph style={{ marginTop: 6, marginBottom: 0 }}>
                    <Text strong>{selectedRecord.items.length}</Text>
                  </Paragraph>
                </Col>
                <Col xs={12} sm={12} md={6}>
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
              persistedQtyMap={persistedQtyMap}
              setAvailQtyMap={setAvailQtyMap}
              disabled={
                !isWarehouseStaff ||
                (currentStatus !== "Parts Requested" &&
                  currentStatus !== "To Be Ordered")
              }
            />
          </Col>

          <Col xs={24} xl={7}>
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
                        <Text strong>{getStatusDisplayLabel(step)}</Text>
                        <div>
                          <Text type="secondary">
                            {step === "Approved" &&
                              "Maintenance manager approved the requisition because all items are available."}
                            {step === "Parts Requested" &&
                              "Warehouse checks whether each requested item is in stock or out of stock."}
                            {step === "Availability Checked" &&
                              "Stock review submitted. Maintenance is now reviewing warehouse availability."}
                            {step === "To Be Ordered" &&
                              "Maintenance manager requested ordering for the unavailable items."}
                            {step === "Ordered" &&
                              "Warehouse confirmed the previously unavailable items are now restocked."}
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

              {nextAction.buttonText && (
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
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
              )}
            </Card>
          </Col>
        </Row>
      </Modal>
      <ResultPopup
        open={successPopup.open}
        status={successPopup.status}
        title={successPopup.title}
        subTitle={successPopup.subTitle}
        duration={2000}
        zIndex={1300}
        onClose={handleSuccessPopupClose}
      />
    </>
  );
}
