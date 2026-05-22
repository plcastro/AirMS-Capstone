import React from "react";
import AppText from "./AppText";
import AppInput from "./AppInput";
import {
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  View
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { COLORS } from "../../stylesheets/colors";

export const moduleStyles = {
  screen: {
    flex: 1,
    backgroundColor: COLORS.grayLight,
    paddingHorizontal: 10,
    paddingTop: 10,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    marginBottom: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.primary,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.grayDark,
    marginTop: 3,
  },
  label: {
    fontSize: 11,
    color: COLORS.grayDark,
    textTransform: "uppercase",
  },
  value: {
    fontSize: 13,
    color: COLORS.black,
    fontWeight: "600",
    marginTop: 2,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
    backgroundColor: "#E6F4F1",
    alignSelf: "flex-start",
  },
  chipText: {
    color: COLORS.primaryLight,
    fontSize: 11,
    fontWeight: "700",
  },
  button: {
    borderRadius: 8,
    backgroundColor: COLORS.primaryLight,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "700",
  },
};

export function ModuleContainer({ children, contentStyle }) {
  return (
    <View style={moduleStyles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[{ paddingBottom: 28 }, contentStyle]}
      >
        {children}
      </ScrollView>
    </View>
  );
}

export function SearchBar({ value, onChangeText, placeholder = "Search" }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: COLORS.white,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: COLORS.grayMedium,
        height: 46,
        paddingHorizontal: 12,
        marginBottom: 10,
      }}
    >
      <MaterialCommunityIcons name="magnify" size={21} color={COLORS.grayDark} />
      <AppInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.grayDark}
        style={{ flex: 1, marginLeft: 9, fontSize: 12, color: COLORS.black }}
      />
    </View>
  );
}

export function InfoCard({ title, subtitle, right, children, onPress }) {
  const Wrapper = onPress ? TouchableOpacity : View;

  return (
    <Wrapper
      activeOpacity={0.82}
      onPress={onPress}
      style={moduleStyles.card}
    >
      <View style={[moduleStyles.row, { justifyContent: "space-between" }]}>
        <View style={{ flex: 1, paddingRight: 8 }}>
          {!!title && <AppText style={moduleStyles.title}>{title}</AppText>}
          {!!subtitle && <AppText style={moduleStyles.subtitle}>{subtitle}</AppText>}
        </View>
        {right}
      </View>
      {children}
    </Wrapper>
  );
}

export function FieldRow({ label, value }) {
  return (
    <View style={{ flex: 1, minWidth: "45%", marginTop: 10, paddingRight: 8 }}>
      <AppText style={moduleStyles.label}>{label}</AppText>
      <AppText style={moduleStyles.value}>{value ?? "N/A"}</AppText>
    </View>
  );
}

export function EmptyState({ text = "No records found." }) {
  return (
    <View style={[moduleStyles.card, { alignItems: "center", padding: 22 }]}>
      <MaterialCommunityIcons
        name="database-search-outline"
        size={30}
        color={COLORS.grayDark}
      />
      <AppText style={{ color: COLORS.grayDark, fontSize: 12, marginTop: 8 }}>
        {text}
      </AppText>
    </View>
  );
}

export function LoadingState({ text = "Loading records..." }) {
  return (
    <View style={[moduleStyles.card, { alignItems: "center", padding: 22 }]}>
      <ActivityIndicator color={COLORS.primaryLight} />
      <AppText style={{ color: COLORS.grayDark, fontSize: 12, marginTop: 8 }}>
        {text}
      </AppText>
    </View>
  );
}

export function StatCard({
  label,
  value,
  tone = COLORS.primaryLight,
  compact = false,
}) {
  return (
    <View
      style={[
        moduleStyles.card,
        { flex: 1, minWidth: compact ? "48%" : "45%" },
        compact ? { padding: 9, marginBottom: 8 } : null,
      ]}
    >
      <AppText style={[moduleStyles.label, compact ? { fontSize: 10 } : null]}>
        {label}
      </AppText>
      <AppText
        style={{
          color: tone,
          fontSize: compact ? 16 : 22,
          fontWeight: "800",
          marginTop: compact ? 1 : 0,
        }}
      >
        {value ?? 0}
      </AppText>
    </View>
  );
}

export function StatusChip({ label, color = COLORS.primaryLight }) {
  return (
    <View style={[moduleStyles.chip, { backgroundColor: `${color}18` }]}>
      <AppText style={[moduleStyles.chipText, { color }]}>{label || "N/A"}</AppText>
    </View>
  );
}

export function SectionTitle({ title, subtitle }) {
  return (
    <View style={{ marginBottom: 10 }}>
      <AppText style={moduleStyles.title}>{title}</AppText>
      {!!subtitle && <AppText style={moduleStyles.subtitle}>{subtitle}</AppText>}
    </View>
  );
}
