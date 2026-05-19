import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { COLORS } from "../../stylesheets/colors";

const STAT_ITEMS = [
  { key: "all", label: "Total", valueKey: "total" },
  { key: "active", label: "Active", valueKey: "active" },
  { key: "inactive", label: "Inactive", valueKey: "inactive" },
  { key: "deactivated", label: "Deactivated", valueKey: "deactivated" },
];

export default function UserStatsRow({ counts, statusFilter = "all", onStatusPress }) {
  return (
    <View style={styles.statsRow}>
      {STAT_ITEMS.map((item) => {
        const isActive = statusFilter === item.key;
        return (
          <TouchableOpacity
            key={item.key}
            style={[styles.statCard, isActive && styles.statCardActive]}
            activeOpacity={0.85}
            onPress={() => onStatusPress?.(item.key)}
          >
            <Text style={[styles.statLabel, isActive && styles.statLabelActive]}>
              {item.label}
            </Text>
            <Text style={[styles.statValue, isActive && styles.statValueActive]}>
              {counts[item.valueKey] ?? 0}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    gap: 6,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    padding: 9,
    borderRadius: 10,
    elevation: 2,
    alignItems: "center",
  },
  statCardActive: {
    backgroundColor: "#E6F4F1",
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
  },
  statLabel: { fontSize: 10, color: COLORS.grayDark, marginBottom: 4 },
  statLabelActive: { color: COLORS.primary },
  statValue: { fontSize: 15, fontWeight: "bold" },
  statValueActive: { color: COLORS.primaryLight },
});
