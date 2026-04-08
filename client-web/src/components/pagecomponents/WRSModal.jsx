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
  const { user } = useContext(AuthContext);

  if (!selectedRecord) return null;

  const isWD = user.jobTitle.toLowerCase() === "warehouse department";
  const isMMorOIC = ["maintenance manager", "officer-in-charge"].includes(
    user?.jobTitle?.toLowerCase(),
  );

  const renderActionButtons = (status) => {
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
              onConfirm={() => message.success("Requisition approved!")}
            >
              <Button
                color="green"
                variant="outlined"
                type="primary"
                icon={<CheckOutlined />}
                size="large"
              >
                APPROVE
              </Button>
            </Popconfirm>
            <Popconfirm
              title="Are you sure you want to reject this requisition?"
              onConfirm={() => message.error("Requisition rejected!")}
            >
              <Button
                color="red"
                variant="outlined"
                icon={<CloseOutlined />}
                size="large"
              >
                REJECT
              </Button>
            </Popconfirm>
          </Col>
        </Row>
      );
    }
    if (isWD && status === "Approved") {
      return <>asd</>;
    }
  };

  return (
    <Modal
      open={visible}
      onCancel={onClose}
      width="max(700px, 50vw)"
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
      <Row gutter={[10, 10]}>
        <Col
          xs={12}
          sm={12}
          style={{ display: "flex", flexDirection: "column" }}
        >
          <Text type="secondary">WRS NO: </Text>
          <Text strong>{selectedRecord.wrsNo}</Text>
        </Col>
        <Col
          xs={12}
          sm={12}
          style={{
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Text type="secondary" textAlign="left">
            Status:
          </Text>
          <Tag
            variant="outlined"
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
                ? "orange"
                : selectedRecord.status === "Approved"
                  ? "blue"
                  : selectedRecord.status === "In Progress"
                    ? "cyan"
                    : selectedRecord.status === "Completed"
                      ? "green"
                      : "red" //for cancelled or rejected
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
        <Col xs={24}>
          <Text type="secondary">REQUESTED ITEMS</Text>
          <Table
            dataSource={selectedRecord.items}
            pagination={
              selectedRecord.items.length > 5
                ? {
                    pageSize: 5,
                    hideOnSinglePage: true,
                  }
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
              {
                title: "QTY",
                dataIndex: "quantity",
                width: "15%",
              },
            ]}
            size="small"
          />
        </Col>
        <Col
          span={24}
          style={{ display: "flex", justifyContent: "center" }}
        ></Col>

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
