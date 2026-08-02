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
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
        overScrollMode="never"
        contentContainerStyle={[{ paddingBottom: 110 }, contentStyle]}
      >
        {children}
      </ScrollView>
    </View>
  );
}

export function SearchBar({
  value,
  onChangeText,
  placeholder = "Search",
  containerStyle,
  inputStyle,
}) {
  const hasValue = String(value || "").length > 0;

  return (
    <View
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: COLORS.white,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: COLORS.grayMedium,
          height: 46,
          paddingHorizontal: 12,
          marginBottom: 10,
        },
        containerStyle,
      ]}
    >
      <MaterialCommunityIcons name="magnify" size={21} color={COLORS.grayDark} />
      <AppInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.grayDark}
        style={[
          { flex: 1, marginLeft: 9, fontSize: 12, color: COLORS.black },
          inputStyle,
        ]}
      />
      {hasValue && (
        <TouchableOpacity
          onPress={() => onChangeText?.("")}
          accessibilityLabel="Clear search"
          style={{
            width: 30,
            height: 30,
            borderRadius: 15,
            alignItems: "center",
            justifyContent: "center",
            marginLeft: 6,
          }}
        >
          <MaterialCommunityIcons
            name="close-circle"
            size={19}
            color={COLORS.grayDark}
          />
        </TouchableOpacity>
      )}
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

const STATUS_TAG_COLORS = {
  active: "#52c41a",
  approved: "#389e0d",
  complete: "#237804",
  completed: "#237804",
  rectified: "#5b8c00",
  released: "#0958d9",
  verified: "#08979c",
  accepted: "#13c2c2",
  available: "#52c41a",
  open: "#1677ff",
  submitted: "#1677ff",
  "turned in": "#1677ff",
  pending: "#faad14",
  "pending approval": "#d48806",
  "pending acceptance": "#fa8c16",
  "pending release": "#d48806",
  assigned: "#13c2c2",
  ongoing: "#1677ff",
  "in progress": "#1677ff",
  busy: "#1677ff",
  review: "#722ed1",
  "for review": "#722ed1",
  returned: "#fa8c16",
  deferred: "#fa8c16",
  overdue: "#fa541c",
  "past due": "#fa541c",
  rejected: "#ff4d4f",
  cancelled: "#ff4d4f",
  canceled: "#ff4d4f",
  failed: "#ff4d4f",
  inactive: "#8c8c8c",
  closed: "#8c8c8c",
  offline: "#8c8c8c",
  "n/a": "#8c8c8c",
};

export const getStatusTagColor = (status) => {
  const normalized = String(status || "N/A")
    .trim()
    .replace(/[_-]+/g, " ")
    .toLowerCase();

  return STATUS_TAG_COLORS[normalized] || "#8c8c8c";
};

export function StatusTag({ label, fallback = "N/A", style }) {
  const value = String(label || fallback).trim() || fallback;
  const color = getStatusTagColor(value);

  return (
    <View style={[moduleStyles.chip, { backgroundColor: `${color}18` }, style]}>
      <AppText style={[moduleStyles.chipText, { color }]}>
        {value.toUpperCase()}
      </AppText>
    </View>
  );
}

export function StatusField({ label, value }) {
  return (
    <View style={{ flex: 1, minWidth: "45%", marginTop: 10, paddingRight: 8 }}>
      <AppText style={moduleStyles.label}>{label}</AppText>
      <StatusTag label={value} style={{ marginTop: 4 }} />
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
