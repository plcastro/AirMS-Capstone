import React from "react";
import AppText from "../common/AppText";
import {
  View
} from "react-native";
import { InfoCard } from "../common/MobileModule";
import { COLORS } from "../../stylesheets/colors";

export function SimpleRowsTable({ title, subtitle, rows = [], columns = [] }) {
  return (
    <InfoCard title={title} subtitle={subtitle}>
      {rows.length === 0 ? (
        <AppText style={{ color: COLORS.grayDark, fontSize: 12 }}>No data available.</AppText>
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
              <AppText key={column.key} style={{ color: COLORS.black, fontSize: 12 }}>
                <AppText style={{ fontWeight: "700" }}>{column.label}: </AppText>
                {row[column.key] ?? "N/A"}
              </AppText>
            ))}
          </View>
        ))
      )}
    </InfoCard>
  );
}
