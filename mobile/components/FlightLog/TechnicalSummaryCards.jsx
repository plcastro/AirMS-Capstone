// components/FlightLog/TechnicalSummaryCards.js
import React from "react";
import { View, Text } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export default function TechnicalSummaryCards({ cardData, isMobile }) {
  return (
    <View style={{ flexDirection: "row", marginBottom: 10 }}>
      {cardData.map((card, i) => (
        <View
          key={i}
          style={{
            backgroundColor: "#26866F",
            borderRadius: 8,
            padding: 7,
            marginRight: 5,
            alignItems: "center",
            justifyContent: "center",
            width: isMobile ? "30%" : 110,
          }}
        >
          <Text style={{ color: "#fff", fontSize: 14, textAlign: "center" }}>
            {card.label}
          </Text>
          <View
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
            <Text style={{ color: "#fff", fontSize: 16, fontWeight: "500" }}>
              {card.value}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}
