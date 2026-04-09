import React, { useEffect, useState } from "react";
import { Card, Col, Row, Tag } from "antd";
import MTrackingTable from "../../../components/tables/MTrackingTable";
import { API_BASE } from "../../../utils/API_BASE";

const columnHeader = [
  { title: "Aircraft", dataIndex: "aircraft", key: "aircraft" },
  {
    title: "Recommendation",
    dataIndex: "recommendation",
    key: "recommendation",
  },
  {
    title: "Estimated Action Time",
    dataIndex: "estimatedActionTime",
    key: "estimatedActionTime",
  },
  { title: "Priority", dataIndex: "priority", key: "priority" },
];

export default function MaintenanceTracking() {
  const [flightHoursData, setFlightHoursData] = useState([]);

  // Fetch initial data
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/parts-monitoring`);
      const json = await res.json();

      const computed = json.data.map((aircraft) => {
        const remainingList = aircraft.parts
          .filter((p) => p.rowType === "part")
          .map(
            (p) =>
              (parseFloat(p.hourLimit1) || 0) - (parseFloat(p.hoursCW) || 0),
          );

        const minRemaining = remainingList.length
          ? Math.min(...remainingList)
          : 0;

        return {
          aircraft: aircraft.aircraft,
          remainingMs: minRemaining * 3600 * 1000,
        };
      });

      setFlightHoursData(computed);
    } catch (err) {
      console.error("Fetch error:", err);
    }
  };

  // Countdown/up timer: subtract 1s if positive, add 1s if negative
  useEffect(() => {
    const interval = setInterval(() => {
      setFlightHoursData((prev) =>
        prev.map((item) => ({
          ...item,
          remainingMs: item.remainingMs - 1000,
        })),
      );
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatFlightHours = (ms) => {
    const negative = ms < 0;
    const absMs = Math.abs(ms);
    const hh = Math.floor(absMs / (1000 * 60 * 60));
    const mm = Math.floor((absMs % (1000 * 60 * 60)) / (1000 * 60));
    const ss = Math.floor((absMs % (1000 * 60)) / 1000);
    return `${negative ? "-" : ""}${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
  };

  const getColor = (ms) => {
    const hours = ms / (1000 * 60 * 60);
    if (hours <= 0) return "red";
    if (hours <= 150) return "orange";
    return "green";
  };

  const criticalAircraft = flightHoursData.filter(
    (a) => a.remainingMs / (1000 * 60 * 60) <= 0,
  );

  return (
    <div style={{ padding: 20 }}>
      <Row gutter={[16, 16]}>
        {/* Flight Hours */}
        <Col xs={24} md={8}>
          <Card title="Flight Hours Remaining" variant="borderless">
            {flightHoursData.map((item) => (
              <div
                key={item.aircraft}
                style={{
                  marginBottom: 12,
                  color: getColor(item.remainingMs),
                  fontWeight: 500,
                }}
              >
                <strong>{item.aircraft}</strong>:{" "}
                {formatFlightHours(item.remainingMs)}
              </div>
            ))}
          </Card>
        </Col>

        {/* Alerts */}
        <Col xs={24} md={8}>
          <Card title="Maintenance Alerts" variant="borderless">
            {criticalAircraft.length === 0 ? (
              <Tag color="green">No Critical Issues</Tag>
            ) : (
              criticalAircraft.map((a) => (
                <Tag key={a.aircraft} color="red">
                  {a.aircraft} Overdue
                </Tag>
              ))
            )}
          </Card>
        </Col>

        <Col xs={24} md={8}>
          <Card title="Maintenance Schedule Status" variant="borderless"></Card>
        </Col>
      </Row>

      {/* Table */}
      <Row gutter={24}>
        <Col span={24}>
          <h2>Predictive Maintenance Recommendations</h2>
        </Col>
        <Col span={24}>
          <MTrackingTable
            headers={columnHeader}
            data={flightHoursData.map((a) => {
              const hours = a.remainingMs / (1000 * 60 * 60);
              return {
                _id: a.aircraft,
                aircraft: a.aircraft,
                recommendation:
                  hours <= 0
                    ? "Immediate maintenance required"
                    : hours <= 150
                      ? "Schedule maintenance soon"
                      : "Normal condition",
                estimatedActionTime: hours <= 0 ? 30 : 120,
                priority:
                  hours <= 0 ? "Critical" : hours <= 150 ? "Warning" : "Normal",
              };
            })}
            loading={false}
          />
        </Col>
      </Row>
    </div>
  );
}
