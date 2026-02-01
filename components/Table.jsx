import { View, Text, ScrollView } from "react-native";
import React from "react";
import { styles } from "../stylesheets/styles";

export default function Table({ headers = [], data = [] }) {
  return (
    <View style={styles.tableCard}>
      {/* Header */}
      <View style={styles.tableHeader}>
        {headers.map((header, index) => (
          <View
            key={index}
            style={[
              styles.headerCell,
              index === headers.length - 1 && styles.lastHeaderCell,
            ]}
          >
            <Text style={styles.tableHeaderText}>{header.label}</Text>
          </View>
        ))}
      </View>

      {/* Body */}
      <ScrollView style={styles.tableBody}>
        {data.map((row, rowIndex) => (
          <View key={row.id || rowIndex} style={styles.tableRowContainer}>
            <View style={styles.tableRow}>
              {headers.map((header, colIndex) => (
                <View
                  key={colIndex}
                  style={[
                    styles.cell,
                    colIndex === headers.length - 1 && styles.lastCell,
                  ]}
                >
                  <Text style={styles.tableCell}>{row[header.key] ?? "-"}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
