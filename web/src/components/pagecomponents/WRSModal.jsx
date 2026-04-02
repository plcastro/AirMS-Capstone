import React, { useState } from "react";
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
  Card,
} from "antd";
import WRSTable from "../tables/WRSTable";
import {
  FileDoneOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  SyncOutlined,
} from "@ant-design/icons";

const { Title, Text } = Typography;

export default function WRSModal({ visible, onClose, selectedRecord }) {
  if (!selectedRecord) return null;

  const STATUS_ORDER = ["Pending", "Approved", "In Progress", "Completed"];

  const currentIndex = STATUS_ORDER.indexOf(selectedRecord.status);

  const getStepStatus = () => {
    if (selectedRecord.status === "Cancelled") return "error";
    return "process";
  };

  const ICON_STYLE = { fontSize: "24px" };

  return (
    <Modal
      title={
        <Space size="middle">
          <Title level={4} style={{ margin: 0 }}>
            Warehouse Requisition Slip Details
          </Title>
          <Text type="secondary" strong style={{ fontSize: "18px" }}>
            # {selectedRecord.wrsNo}
          </Text>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="close" type="primary" onClick={onClose} size="large">
          Close
        </Button>,
      ]}
      width={"85%"}
      centered
    >
      <div style={{ padding: "20px 0 40px" }}>
        <Steps
          current={currentIndex}
          status={getStepStatus()}
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

      <Divider orientation="left" plain>
        General Information
      </Divider>

      <Card
        variant="soft"
        style={{ marginBottom: 24, backgroundColor: "#fafafa" }}
      >
        <Row gutter={[24, 16]}>
          <Col xs={24} md={12} lg={6}>
            <Text type="secondary" strong>
              SLOC NAME/CODE
            </Text>
            <Input
              value={selectedRecord.slocNameCode}
              disabled
              style={{ marginTop: 8, color: "black" }}
            />
          </Col>
          <Col xs={24} md={12} lg={6}>
            <Text type="secondary" strong>
              Date Requested
            </Text>
            <Input
              value={selectedRecord.dateRequested}
              disabled
              style={{ marginTop: 8, color: "black" }}
            />
          </Col>
          <Col xs={24} md={12} lg={6}>
            <Text type="secondary" strong>
              Requisitioned By
            </Text>
            <Input
              value={selectedRecord.staff.employeeName}
              disabled
              style={{ marginTop: 8, color: "black" }}
            />
          </Col>
          <Col xs={24} md={12} lg={6}>
            <Text type="secondary" strong>
              Approved By
            </Text>
            <Input
              value={selectedRecord.staff.cchead}
              disabled
              style={{ marginTop: 8, color: "black" }}
            />
          </Col>
          <Col xs={24} md={12} lg={6}>
            <Text type="secondary" strong>
              Received By
            </Text>
            <Input
              value={selectedRecord.staff.enduser}
              disabled
              style={{ marginTop: 8, color: "black" }}
            />
          </Col>
          <Col xs={24} md={12} lg={6}>
            <Text type="secondary" strong>
              Noted By
            </Text>
            <Input
              value={selectedRecord.staff.notedby}
              disabled
              style={{ marginTop: 8, color: "black" }}
            />
          </Col>
        </Row>
      </Card>

      <Divider orientation="left" plain>
        Requisitioned Items
      </Divider>

      <div style={{ minHeight: "200px" }}>
        <WRSTable data={selectedRecord.items} loading={false} />
      </div>
    </Modal>
  );
}
