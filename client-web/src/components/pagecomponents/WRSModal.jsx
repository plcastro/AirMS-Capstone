import React, { useMemo, useState } from "react";
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
  SyncOutlined,
} from "@ant-design/icons";
import WRSTable from "../tables/WRSTable";

const { Paragraph, Text, Title } = Typography;

const statusSteps = ["Approved", "In Progress", "Completed"];

const getStatusMeta = (status) => {
  switch (status) {
    case "Approved":
      return {
        color: "cyan",
        icon: <CheckCircleOutlined />,
      };
    case "In Progress":
      return {
        color: "orange",
        icon: <SyncOutlined spin />,
      };
    case "Completed":
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

export default function WRSModal({ visible, onClose, selectedRecord }) {
  const [availQtyMap, setAvailQtyMap] = useState({});

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

  const isAllFilled = () =>
    selectedRecord?.items?.every((item) => {
      const value = availQtyMap[item._id];
      return value !== undefined && value !== null && value !== "";
    });

  const handleSubmit = () => {
    message.success("Available quantities submitted successfully.");
    onClose();
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
            Encode available quantities and monitor release progress for this
            requisition.
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
                <Text type="secondary">SLOC Name / Code</Text>
                <Paragraph style={{ marginTop: 6, marginBottom: 0 }}>
                  <Text strong>{selectedRecord.slocNameCode}</Text>
                </Paragraph>
              </Col>
              <Col xs={24} sm={12}>
                <Text type="secondary">Requested By</Text>
                <Paragraph style={{ marginTop: 6, marginBottom: 0 }}>
                  <Text strong>{selectedRecord.staff.employeeName}</Text>
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
            disabled={selectedRecord.status === "Completed"}
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
                    step === "In Progress" ? (
                      <SyncOutlined spin style={{ color: "#fa8c16" }} />
                    ) : (
                      <ClockCircleOutlined style={{ color: "#13c2c2" }} />
                    )
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
                            "Request is approved and ready for warehouse processing."}
                          {step === "In Progress" &&
                            "Warehouse staff is encoding available quantities and preparing release."}
                          {step === "Completed" &&
                            "Items have been prepared and the requisition is finished."}
                        </Text>
                      </div>
                    </div>
                  ),
                };
              })}
            />
          </Card>

          <Card variant="borderless" style={{ borderRadius: 18 }}>
            <Title level={5}>Next Action</Title>
            <Paragraph type="secondary">
              Fill in every available quantity before submitting warehouse
              processing.
            </Paragraph>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Button onClick={onClose}>Close</Button>
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                disabled={
                  selectedRecord.status === "Completed" || !isAllFilled()
                }
                onClick={handleSubmit}
              >
                Submit Quantities
              </Button>
            </div>
          </Card>
        </Col>
      </Row>
    </Modal>
  );
}
