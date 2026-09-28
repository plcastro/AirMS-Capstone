import React from "react";
import { Button, Card, Col, Empty, Row, Space, Typography } from "antd";
import { RequisitionStatus } from "./PRMTable";
import {
  displayStatus,
  timeSinceUpdate,
  updatedFirst,
} from "../../../../shared/partsRequisitionWorkflow";
export default function PRMCardView({
  records = [],
  loading,
  onOpen,
  oversight,
  onFollowUp,
  canFollowUp,
  busy,
}) {
  if (!records.length)
    return (
      <Empty
        description={
          loading ? "Loading requisitions…" : "No requisitions found"
        }
      />
    );
  return (
    <Row gutter={[16, 16]}>
      {[...records].sort(updatedFirst).map((record) => (
        <Col xs={24} sm={12} key={record._id}>
          <Card
            title={record.wrsNo}
            extra={<RequisitionStatus status={displayStatus(record)} />}
            style={{ borderRadius: 12 }}
          >
            <Space orientation="vertical">
              <Typography.Text>
                {record.aircraft} · {record.items?.length || 0} items
              </Typography.Text>
              <Typography.Text>{record.staff?.requisitioner}</Typography.Text>
              <Typography.Text type="secondary">
                Updated {timeSinceUpdate(record)}
              </Typography.Text>
              <Space wrap>
                <Button onClick={() => onOpen(record)}>Details</Button>
                {oversight && canFollowUp(record) && (
                  <Button disabled={busy} onClick={() => onFollowUp(record)}>
                    Follow Up
                  </Button>
                )}
              </Space>
            </Space>
          </Card>
        </Col>
      ))}
    </Row>
  );
}
