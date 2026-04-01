import React, { useState } from "react";
import { Modal, Typography, Button, Row, Col } from "antd";
import WRSTable from "../tables/WRSTable";
const { Text } = Typography;

export default function WRSModal({ wrsNo, visible, onClose }) {
  const [staff] = useState({
    employeeName: "Jeonghan Yoon",
    cchead: "Jeonghan Yoon",
    enduser: "Junhui Wen",
    notedby: "Mingyu Kim",
  });
  return (
    <Modal
      open={visible}
      onCancel={onClose}
      footer={null}
      title={`Warehouse Requisition Slip Details - WRS No. ${wrsNo} `}
      width={"80%"}
      style={{ height: "fit-content", maxHeight: "90vh" }}
    >
      <Row
        gutter={10}
        style={{ marginBottom: 20 }}
        justify="space-between"
        align="middle"
      >
        <Col xs={24} md={12}>
          <Text>
            SLOC NAME/CODE: <strong>AVIATION/H001</strong>
          </Text>
        </Col>
        <Col xs={24} md={12}>
          <Text>
            Date: <strong>{new Date().toLocaleDateString()}</strong>
          </Text>
        </Col>
      </Row>
      <Row
        gutter={10}
        style={{ marginBottom: 20 }}
        justify="space-between"
        align="middle"
      >
        <Col xs={24} md={8}>
          <Text>
            Requisitioned by: <strong>{staff.employeeName}</strong>
          </Text>
        </Col>
        <Col xs={24} md={8}>
          <Text>
            Approved by: <strong>{staff.cchead}</strong>
          </Text>
        </Col>
        <Col xs={24} md={8}>
          <Text>
            End-User: <strong>{staff.enduser}</strong>
          </Text>
        </Col>
        <Col xs={24} md={24}>
          <Text>
            Noted by: <strong>{staff.notedby}</strong>
          </Text>
        </Col>
      </Row>

      <WRSTable wrsNo={wrsNo} loading={false} />
      <div style={{ marginTop: 20, textAlign: "right" }}>
        <Button type="primary" onClick={onClose}>
          Close
        </Button>
      </div>
    </Modal>
  );
}
