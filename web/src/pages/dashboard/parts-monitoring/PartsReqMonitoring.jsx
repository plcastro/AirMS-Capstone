import React, { useState, useEffect, useContext } from "react";
import { Input, Statistic, Card, Row, Col } from "antd";
import {
  SearchOutlined,
  FileDoneOutlined,
  HourglassOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import PRMTable from "../../../components/tables/PRMTable";
const requisitions = [
  {
    id: 1,
    wrsNo: "WRS-001",
    noOfItems: 5,
    dateRequested: "2024-06-01",
    aircraft: "Boeing 737",
    status: "Pending",
  },
  {
    id: 2,
    wrsNo: "WRS-002",
    noOfItems: 3,
    dateRequested: "2024-06-02",
    aircraft: "Airbus A320",
    status: "Delivered",
  },
];

export default function PartsRequisition() {
  const [searchText, setSearchText] = useState("");
  const [cardsData] = useState({
    totalRequisitions: requisitions.length,
    pending: requisitions.filter((req) => req.status === "Pending").length,
    delivered: requisitions.filter((req) => req.status === "Delivered").length,
  });

  const filteredRequisitions = requisitions.filter(
    (r) =>
      r.wrsNo.toLowerCase().includes(searchText.toLowerCase()) ||
      r.aircraft.toLowerCase().includes(searchText.toLowerCase()) ||
      r.status.toLowerCase().includes(searchText.toLowerCase()),
  );
  return (
    <div style={{ padding: 20 }}>
      <Row>
        <Col xs={24} md={12}>
          <Input
            size="large"
            placeholder="Search by date, parts, or status..."
            prefix={<SearchOutlined />}
            allowClear
            onChange={(e) => setSearchText(e.target.value)}
          />
        </Col>
      </Row>
      <Row gutter={10} style={{ marginTop: 10 }}>
        <Col span={8}>
          <Card>
            <Statistic
              title="Total Requisitions"
              value={cardsData.totalRequisitions}
              prefix={<FileDoneOutlined />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="Pending"
              value={cardsData.pending}
              prefix={<HourglassOutlined />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="Delivered"
              value={cardsData.delivered}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>
      <Row style={{ marginTop: 10 }}>
        <Col span={24}>
          <PRMTable data={filteredRequisitions} />
        </Col>
      </Row>
    </div>
  );
}
