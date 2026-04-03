import React from "react";
import { Card, Row, Col } from "antd";

const ICON_MAP = {
  fuel: "local_gas_station",
  oil: "oil_barrel",
  "map-marker-distance": "distance",
};

export default function TechnicalSummaryCards({ cardData }) {
  return (
    <Row gutter={[16, 16]} wrap={false} style={{ overflowX: "auto" }}>
      {cardData.map((card, index) => {
        const iconName = ICON_MAP[card.icon] || "";

        return (
          <Col key={index} flex="0 0 200px">
            <Card
              style={{
                backgroundColor: "#26866F",
                color: "#fff",
                borderRadius: 8,
                textAlign: "center",
              }}
              styles={{
                body: {
                  padding: "16px",
                },
              }}
            >
              <p style={{ fontSize: 16, marginBottom: 8 }}>{card.label}</p>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: 24 }}
                >
                  {iconName}
                </span>
                <span style={{ fontSize: 16, fontWeight: 500 }}>
                  {card.value}
                </span>
              </div>
            </Card>
          </Col>
        );
      })}
    </Row>
  );
}
