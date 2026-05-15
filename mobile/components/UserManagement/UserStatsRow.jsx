import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { COLORS } from "../../stylesheets/colors";

export default function UserStatsRow({ counts }) {
  return (
    <View style={styles.statsRow}>
      <View style={styles.statCard}>
        <Text style={styles.statLabel}>Total</Text>
        <Text style={styles.statValue}>{counts.total}</Text>
      </View>
      <View style={styles.statCard}>
        <Text style={styles.statLabel}>Active</Text>
        <Text style={styles.statValue}>{counts.active}</Text>
      </View>
      <View style={styles.statCard}>
        <Text style={styles.statLabel}>Inactive</Text>
        <Text style={styles.statValue}>{counts.inactive}</Text>
      </View>
      <View style={styles.statCard}>
        <Text style={styles.statLabel}>Deactivated</Text>
        <Text style={styles.statValue}>{counts.deactivated}</Text>
      </View>
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
  statLabel: { fontSize: 10, color: COLORS.grayDark, marginBottom: 4 },
  statValue: { fontSize: 15, fontWeight: "bold" },
});

