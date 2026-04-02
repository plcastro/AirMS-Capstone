import React, { useState, useMemo } from "react";
import { Input, Statistic, Card, Row, Col } from "antd";
import {
  SearchOutlined,
  FileDoneOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  SyncOutlined,
} from "@ant-design/icons";
import PRMTable from "../../../components/tables/PRMTable";
import { MOCK_WRS_RECORDS } from "../../../components/common/MockData";

export default function PartsRequisition() {
  const [searchText, setSearchText] = useState("");
  const allRequisitionsWithCounts = useMemo(() => {
    return MOCK_WRS_RECORDS.map((record) => ({
      ...record,
      noOfItems: record.items?.length || 0,
    }));
  }, []);

  const filteredRequisitions = useMemo(() => {
    return allRequisitionsWithCounts.filter(
      (r) =>
        r.wrsNo.toLowerCase().includes(searchText.toLowerCase()) ||
        r.aircraft.toLowerCase().includes(searchText.toLowerCase()) ||
        r.status.toLowerCase().includes(searchText.toLowerCase()),
    );
  }, [searchText, allRequisitionsWithCounts]);

  const stats = useMemo(() => {
    return {
      total: filteredRequisitions.length,
      pending: filteredRequisitions.filter((r) => r.status === "Pending")
        .length,
      approved: filteredRequisitions.filter((r) => r.status === "Approved")
        .length,
      inProgress: filteredRequisitions.filter((r) => r.status === "In Progress")
        .length,
      completed: filteredRequisitions.filter((r) => r.status === "Completed")
        .length,
    };
  }, [filteredRequisitions]);
  return (
    <div style={{ padding: 20 }}>
      <Row>
        <Col xs={24} md={12} lg={8}>
          <Input
            size="large"
            placeholder="Search by WRS No, aircraft, or status..."
            prefix={<SearchOutlined />}
            allowClear
            onChange={(e) => setSearchText(e.target.value)}
          />
        </Col>
      </Row>
      <Row gutter={[10, 10]} style={{ marginTop: 20 }}>
        <Col xs={24} sm={12} md={4}>
          <Card variant={"borderless"}>
            <Statistic
              title="Total"
              value={stats.total}
              prefix={<FileDoneOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={5}>
          <Card variant={"borderless"}>
            <Statistic
              title="Pending"
              value={stats.pending}
              prefix={<ClockCircleOutlined />}
              styles={{ content: { color: "#1890ff" } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={5}>
          <Card variant={"borderless"}>
            <Statistic
              title="Approved"
              value={stats.approved}
              prefix={<CheckCircleOutlined />}
              styles={{ content: { color: "#13c2c2" } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={5}>
          <Card variant={"borderless"}>
            <Statistic
              title="In Progress"
              value={stats.inProgress}
              prefix={<SyncOutlined />}
              styles={{ content: { color: "#faad14" } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={5}>
          <Card variant={"borderless"}>
            <Statistic
              title="Completed"
              value={stats.completed}
              prefix={<FileDoneOutlined />}
              styles={{ content: { color: "#52c41a" } }}
            />
          </Card>
        </Col>
      </Row>

      <Row style={{ marginTop: 20 }}>
        <Col span={24}>
          <PRMTable data={filteredRequisitions} />
        </Col>
      </Row>
    </div>
  );
}
