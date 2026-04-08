import React, { useContext, useState } from "react";
import {
  Modal,
  Typography,
  Button,
  Row,
  Col,
  message,
  Popconfirm,
  Tag,
  Table,
  Card,
} from "antd";
import WRSTable from "../tables/WRSTable";
import {
  CheckOutlined,
  CloseOutlined,
  FileDoneOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  SyncOutlined,
} from "@ant-design/icons";
import { AuthContext } from "../../context/AuthContext";

const { Title, Text } = Typography;

export default function WRSModal({ visible, onClose, selectedRecord }) {
  const [availQtyMap, setAvailQtyMap] = useState({});
  const { user } = useContext(AuthContext);

  if (!selectedRecord) return null;

  const isWD = user.jobTitle.toLowerCase() === "warehouse department";
  const isMMorOIC = ["maintenance manager", "officer-in-charge"].includes(
    user?.jobTitle?.toLowerCase(),
  );

  // Check if all available quantities are filled
  const isAllFilled = () => {
    return selectedRecord.items.every((item) => {
      const value = availQtyMap[item._id];
      return value !== undefined && value !== null && value !== "";
    });
  };

  const renderActionButtons = (status) => {
    // MM or OIC approve/reject
    if (isMMorOIC && status === "Pending") {
      return (
        <Row
          style={{
            flexDirection: "row",
            alignItems: "center",
            textAlign: "center",
            gap: 16,
            justifyContent: "space-between",
            padding: 20,
          }}
        >
          <Col span={24}>
            <Text>SELECT AN ACTION</Text>
          </Col>
          <Col
            span={24}
            style={{ display: "flex", justifyContent: "center", gap: 8 }}
          >
            <Popconfirm
              title="Are you sure you want to approve this requisition?"
              onConfirm={() => {
                message.success("Requisition approved!");
                onClose();
              }}
            >
              <Button type="primary" icon={<CheckOutlined />} size="large">
                APPROVE
              </Button>
            </Popconfirm>
            <Popconfirm
              title="Are you sure you want to reject this requisition?"
              onConfirm={() => {
                message.error("Requisition rejected!");
                onClose();
              }}
            >
              <Button danger icon={<CloseOutlined />} size="large">
                REJECT
              </Button>
            </Popconfirm>
          </Col>
        </Row>
      );
    }

    // Warehouse Department submit/cancel
    if (isWD && ["Approved", "In Progress"].includes(status)) {
      return (
        <Row
          style={{
            flexDirection: "row",
            alignItems: "center",
            textAlign: "center",
            gap: 16,
            justifyContent: "space-between",
            padding: 20,
          }}
        >
          <Col span={24}>
            <Text>SELECT AN ACTION</Text>
          </Col>
          <Col
            span={24}
            style={{ display: "flex", justifyContent: "center", gap: 8 }}
          >
            <Popconfirm
              title="Submit available quantities?"
              description="This will save the entered quantities and update item statuses."
              onConfirm={() => {
                message.success("Available quantities submitted successfully.");
                onClose();
              }}
              disabled={!isAllFilled()}
            >
              <Button
                type="primary"
                icon={<CheckOutlined />}
                size="large"
                disabled={!isAllFilled()}
              >
                SUBMIT
              </Button>
            </Popconfirm>
            <Popconfirm
              title="Discard entered quantities?"
              description="This will reset all entered values for this requisition."
              onConfirm={() => {
                setAvailQtyMap({});
                message.warning("Entered quantities have been discarded.");
                onClose();
              }}
            >
              <Button danger icon={<CloseOutlined />} size="large">
                CANCEL
              </Button>
            </Popconfirm>
          </Col>
        </Row>
      );
    }

    return null;
  };

  return (
    <Modal
      open={visible}
      onCancel={onClose}
      width="max(700px, 70vw)"
      centered
      title={
        <Title level={4} style={{ margin: 0 }}>
          {isMMorOIC && selectedRecord.status === "Pending"
            ? "Review Requisition"
            : "Warehouse Requisition Details"}
        </Title>
      }
      footer={null}
    >
      <Card
        style={{ backgroundColor: "#f6f6f6", marginBottom: 20 }}
        bordered={false}
      >
        <Row gutter={[10, 10]}>
          <Col
            xs={12}
            sm={12}
            style={{ display: "flex", flexDirection: "column" }}
          >
            <Text type="secondary">WRS NO:</Text>
            <Text strong>{selectedRecord.wrsNo}</Text>
          </Col>
          <Col
            xs={12}
            sm={12}
            style={{ display: "flex", flexDirection: "column" }}
          >
            <Text type="secondary">Status:</Text>
            <Tag
              icon={
                selectedRecord.status === "Pending" ? (
                  <ClockCircleOutlined />
                ) : selectedRecord.status === "Approved" ? (
                  <CheckCircleOutlined />
                ) : selectedRecord.status === "In Progress" ? (
                  <SyncOutlined spin />
                ) : selectedRecord.status === "Completed" ? (
                  <FileDoneOutlined />
                ) : (
                  <CloseOutlined />
                )
              }
              color={
                selectedRecord.status === "Pending"
                  ? "blue"
                  : selectedRecord.status === "Approved"
                    ? "cyan"
                    : selectedRecord.status === "In Progress"
                      ? "purple"
                      : selectedRecord.status === "Completed"
                        ? "green"
                        : "red"
              }
              style={{
                height: 30,
                width: 100,
                textAlign: "center",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 5,
              }}
            >
              {selectedRecord.status}
            </Tag>
          </Col>
          <Col
            xs={24}
            sm={12}
            style={{ display: "flex", flexDirection: "column" }}
          >
            <Text type="secondary">SLOC NAME/CODE</Text>
            <Text strong>{selectedRecord.slocNameCode}</Text>
          </Col>
          <Col
            xs={24}
            sm={12}
            style={{ display: "flex", flexDirection: "column" }}
          >
            <Text type="secondary">REQUISITIONED BY</Text>
            <Text strong>{selectedRecord.staff.employeeName}</Text>
          </Col>
          <Col
            xs={24}
            sm={12}
            style={{ display: "flex", flexDirection: "column" }}
          >
            <Text type="secondary">DATE REQUESTED</Text>
            <Text strong>{selectedRecord.dateRequested}</Text>
          </Col>
          <Col
            xs={24}
            sm={12}
            style={{ display: "flex", flexDirection: "column" }}
          >
            <Text type="secondary">TOTAL ITEMS</Text>
            <Text strong>{selectedRecord.items.length}</Text>
          </Col>
          <Col
            xs={24}
            sm={12}
            style={{ display: "flex", flexDirection: "column" }}
          >
            <Text type="secondary">TOTAL QUANTITY</Text>
            <Text strong>{selectedRecord.totalQty}</Text>
          </Col>
        </Row>
      </Card>

      <Row gutter={[10, 10]}>
        <Col xs={24}>
          {!isWD ? (
            <>
              <Text type="secondary">REQUESTED ITEMS</Text>
              <Table
                dataSource={selectedRecord.items}
                pagination={
                  selectedRecord.items.length > 5
                    ? { pageSize: 5, hideOnSinglePage: true }
                    : false
                }
                scroll={{ y: 200 }}
                columns={[
                  {
                    title: "MATCODE NO.",
                    dataIndex: "matCodeNo",
                    width: "20%",
                  },
                  {
                    title: "PARTICULAR",
                    dataIndex: "particular",
                    width: "65%",
                  },
                  { title: "QTY", dataIndex: "quantity", width: "15%" },
                ]}
                size="small"
              />
            </>
          ) : (
            <WRSTable
              data={selectedRecord.items}
              availQtyMap={availQtyMap}
              setAvailQtyMap={setAvailQtyMap}
            />
          )}
        </Col>

        <Col
          span={24}
          style={{ display: "flex", justifyContent: "center", gap: 8 }}
        >
          {renderActionButtons(selectedRecord.status)}
        </Col>
      </Row>
    </Modal>
  );
}
