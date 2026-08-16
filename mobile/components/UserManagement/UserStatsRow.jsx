import React from "react";
import AppText from "../common/AppText";
import { ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import { COLORS } from "../../stylesheets/colors";

const STAT_ITEMS = [
  { key: "all", label: "Total", valueKey: "total" },
  { key: "active", label: "Active", valueKey: "active" },
  { key: "inactive", label: "Inactive", valueKey: "inactive" },
  { key: "deactivated", label: "Deactivated", valueKey: "deactivated" },
];

export default function UserStatsRow({
  counts,
  statusFilter = "all",
  onStatusPress,
}) {
  const shouldScrollStats = STAT_ITEMS.length > 2;

  return (
    <ScrollView
      horizontal={shouldScrollStats}
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.statsRow}
      style={styles.statsScroller}
    >
      {STAT_ITEMS.map((item) => {
        const isActive = statusFilter === item.key;
        return (
          <TouchableOpacity
            key={item.key}
            style={[styles.statCard, isActive && styles.statCardActive]}
            activeOpacity={0.85}
            onPress={() => onStatusPress?.(item.key)}
          >
            <AppText
              style={[styles.statLabel, isActive && styles.statLabelActive]}
            >
              {item.label}
            </AppText>
            <AppText
              style={[styles.statValue, isActive && styles.statValueActive]}
            >
              {counts[item.valueKey] ?? 0}
            </AppText>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  statsScroller: {
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: "row",
    columnGap: 8,
    paddingRight: 4,
  },
  statCard: {
    width: 104,
    backgroundColor: COLORS.white,
    padding: 9,
    borderRadius: 10,
    alignItems: "center",
  },
  statCardActive: {
    backgroundColor: "#E6F4F1",
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
  },
  statLabel: { fontSize: 9, color: COLORS.grayDark, marginBottom: 4 },
  statLabelActive: { color: COLORS.primary },
  statValue: { fontSize: 15, fontWeight: "bold" },
  statValueActive: { color: COLORS.primaryLight },
});
