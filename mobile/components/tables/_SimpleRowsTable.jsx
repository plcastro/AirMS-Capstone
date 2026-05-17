import React from "react";
import { Text, View } from "react-native";
import { InfoCard } from "../common/MobileModule";
import { COLORS } from "../../stylesheets/colors";

export function SimpleRowsTable({ title, subtitle, rows = [], columns = [] }) {
  return (
    <InfoCard title={title} subtitle={subtitle}>
      {rows.length === 0 ? (
        <Text style={{ color: COLORS.grayDark, fontSize: 12 }}>No data available.</Text>
      ) : (
        rows.slice(0, 20).map((row, index) => (
          <View
            key={`${title}-${index}`}
            style={{
              borderTopWidth: 1,
              borderTopColor: COLORS.border,
              paddingVertical: 8,
              gap: 2,
            }}
          >
            {columns.map((column) => (
              <Text key={column.key} style={{ color: COLORS.black, fontSize: 12 }}>
                <Text style={{ fontWeight: "700" }}>{column.label}: </Text>
                {row[column.key] ?? "N/A"}
              </Text>
            ))}
          </View>
        ))
      )}
    </InfoCard>
  );
}
