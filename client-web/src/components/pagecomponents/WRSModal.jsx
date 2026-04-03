import React, { useContext, useState } from "react";
import {
  Modal,
  Typography,
  Button,
  Row,
  Col,
  Input,
  Steps,
  Divider,
  Space,
  message,
  Popconfirm,
} from "antd";
import WRSTable from "../tables/WRSTable";
import {
  FileDoneOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  SyncOutlined,
} from "@ant-design/icons";
import { AuthContext } from "../../context/AuthContext";

const { Title, Text } = Typography;

export default function WRSModal({ visible, onClose, selectedRecord }) {
  const { user } = useContext(AuthContext);

  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [packedItems, setPackedItems] = useState([]);

  if (!selectedRecord) return null;

  const isWD = user.jobTitle.toLowerCase() === "warehouse department";

  const STATUS_ORDER = ["Pending", "Approved", "In Progress", "Completed"];
  const currentStatusIndex = STATUS_ORDER.indexOf(selectedRecord.status);

  const allItemsPacked =
    selectedRecord.status === "Completed" ||
    packedItems.length === selectedRecord?.items?.length;

  const next = () => setCurrentStep((prev) => prev + 1);
  const prev = () => setCurrentStep((prev) => prev - 1);

  const ICON_STYLE = { fontSize: "20px" };

  const handleDispatch = async () => {
    setLoading(true);
    try {
      message.success("Dispatched successfully!");
      onClose();
    } catch {
      message.error("Dispatch failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleMarkDelivered = async () => {
    setLoading(true);
    try {
      message.success("Marked as delivered!");
      onClose();
    } catch {
      message.error("Update failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={visible}
      onCancel={onClose}
      width="85%"
      centered
      title={
        <Space>
          <Title level={4} style={{ margin: 0 }}>
            Warehouse Requisition Slip
          </Title>
          <Text type="secondary">{selectedRecord.wrsNo}</Text>
        </Space>
      }
      footer={[
        currentStep > 0 && <Button onClick={prev}>Previous</Button>,

        currentStep < 2 && (
          <Button type="primary" onClick={next}>
            Next
          </Button>
        ),

        currentStep === 2 && (
          <>
            {isWD && selectedRecord.status === "Approved" && (
              <Button
                type="primary"
                disabled={!allItemsPacked}
                loading={loading}
                onClick={handleDispatch}
              >
                Dispatch
              </Button>
            )}

            {selectedRecord.status === "Out for Delivery" && (
              <Popconfirm
                title="Confirm Delivery"
                onConfirm={handleMarkDelivered}
              >
                <Button
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  loading={loading}
                >
                  Mark Delivered
                </Button>
              </Popconfirm>
            )}

            <Button onClick={onClose}>Close</Button>
          </>
        ),
      ]}
    >
      {" "}
      <div style={{ marginBottom: 20 }}>
        <Text strong>Status</Text>
        <Steps
          responsive
          current={currentStatusIndex}
          items={[
            {
              title: "Pending",
              icon: <ClockCircleOutlined style={ICON_STYLE} />,
            },
            {
              title: "Approved",
              icon: <CheckCircleOutlined style={ICON_STYLE} />,
            },
            {
              title: "In Progress",
              icon: (
                <SyncOutlined
                  spin={selectedRecord.status === "In Progress"}
                  style={ICON_STYLE}
                />
              ),
            },
            {
              title: "Completed",
              icon: <FileDoneOutlined style={ICON_STYLE} />,
            },
          ]}
        />
      </div>
      <Steps
        current={currentStep}
        items={[
          { title: "General Info" },
          { title: "Items" },
          { title: "Finalize" },
        ]}
        style={{ marginBottom: 20 }}
      />
      <div style={{ minHeight: 300 }}>
        {currentStep === 0 && (
          <>
            <Row gutter={[16, 16]}>
              <Col xs={24} lg={12}>
                <Text type="secondary">SLOC NAME/CODE</Text>
                <Input value={selectedRecord.slocNameCode} disabled />
              </Col>

              <Col xs={24} lg={12}>
                <Text type="secondary">Date Requested</Text>
                <Input value={selectedRecord.dateRequested} disabled />
              </Col>
            </Row>

            <Row gutter={[16, 16]} style={{ marginTop: 10 }}>
              <Col xs={24} lg={12}>
                <Text type="secondary">Requisitioned By</Text>
                <Input value={selectedRecord.staff.employeeName} disabled />
              </Col>

              <Col xs={24} lg={12}>
                <Text type="secondary">Approved By</Text>
                <Input value={selectedRecord.staff.cchead} disabled />
              </Col>

              <Col xs={24} lg={12}>
                <Text type="secondary">Received By</Text>
                <Input value={selectedRecord.staff.enduser} disabled />
              </Col>

              <Col xs={24} lg={12}>
                <Text type="secondary">Noted By</Text>
                <Input value={selectedRecord.staff.notedby} disabled />
              </Col>
            </Row>
          </>
        )}

        {/* STEP 2 */}
        {currentStep === 1 && (
          <WRSTable
            data={selectedRecord.items}
            loading={false}
            isWD={isWD}
            status={selectedRecord.status}
            packedItems={packedItems}
            setPackedItems={setPackedItems}
          />
        )}

        {/* STEP 3 */}
        {currentStep === 2 && (
          <>
            <Text strong>Notes</Text>
            <Input.TextArea rows={4} placeholder="Enter notes..." />

            <Divider />

            <Text type="secondary">Review items and complete the process.</Text>
          </>
        )}
      </div>
    </Modal>
  );
}
