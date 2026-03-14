import React from "react";

import { Card } from "antd";
import { AntDesignOutlined } from "@ant-design/icons";

export default function TechnicalSummaryCards({ cardData }) {
  return (
    <div style={{ flexDirection: "row", marginBottom: 10 }}>
      {cardData.map((card, i) => (
        <Card
          key={i}
          style={{
            backgroundColor: "#26866F",
            borderRadius: 8,
            padding: 7,
            marginRight: 5,
            alignItems: "center",
            justifyContent: "center",
            width: "30%",
          }}
        >
          <p style={{ color: "#fff", fontSize: 14, textAlign: "center" }}>
            {card.label}
          </p>
          <div
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginTop: 6,
            }}
          >
            <MaterialCommunityIcons
              name={card.icon}
              size={24}
              color="#fff"
              style={{ marginRight: 5 }}
            />
            <p style={{ color: "#fff", fontSize: 16, fontWeight: "500" }}>
              {card.value}
            </p>
          </div>
        </Card>
      ))}
    </div>
  );
}
