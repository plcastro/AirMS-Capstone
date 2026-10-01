import React, { useEffect, useState } from "react";
import { View, TextInput, TouchableOpacity } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AppText from "../common/AppText";
import { COLORS } from "../../stylesheets/colors";

const PAGE_SIZE = 10;
const small = {
  paddingVertical: 8,
  paddingHorizontal: 12,
  borderRadius: 6,
  borderWidth: 1,
  borderColor: COLORS.grayMedium,
  marginRight: 6,
  marginBottom: 6,
};

function Chip({ label, onPress, disabled, danger }) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[
        small,
        danger && { borderColor: COLORS.dangerBorder },
        disabled && { opacity: 0.45 },
      ]}
    >
      <AppText style={{ fontSize: 12, color: danger ? COLORS.dangerBorder : COLORS.black }}>
        {label}
      </AppText>
    </TouchableOpacity>
  );
}

// The full inspection checklist. The mechanic ticks items one by one, can tick
// a whole page or every item at once, and can flag any item as a discrepancy
// with a note. Nothing is ticked on the mechanic's behalf.
export default function InspectionChecklistPanel({
  items,
  checked,
  discrepancies,
  onChange,
  disabled = false,
}) {
  const [page, setPage] = useState(1);
  // Only go back to page 1 when the checklist itself changes, not on every tick.
  const checklistId = `${items.length}:${items[0]?.key ?? ""}`;
  useEffect(() => setPage(1), [checklistId]);
  const pages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const isFlagged = (key) => Object.prototype.hasOwnProperty.call(discrepancies, key);
  const visible = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const checkedCount = items.filter((item) => checked[item.key]).length;
  const flaggedCount = Object.keys(discrepancies).length;
  const emit = (nextChecked, nextDiscrepancies = discrepancies) =>
    onChange({ checked: nextChecked, discrepancies: nextDiscrepancies });
  const setItems = (list, value) => {
    const next = { ...checked };
    list.forEach((item) => {
      if (!isFlagged(item.key)) next[item.key] = value;
    });
    emit(next);
  };
  const toggleFlag = (key) => {
    const nextDiscrepancies = { ...discrepancies };
    const nextChecked = { ...checked };
    if (isFlagged(key)) delete nextDiscrepancies[key];
    else {
      nextDiscrepancies[key] = { note: "" };
      nextChecked[key] = false;
    }
    emit(nextChecked, nextDiscrepancies);
  };
  return (
    <View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 6 }}>
        <Chip label="Mark all items good" disabled={disabled} onPress={() => setItems(items, true)} />
        <Chip label="Clear all" disabled={disabled} onPress={() => setItems(items, false)} />
        <Chip label="Select all on this page" disabled={disabled} onPress={() => setItems(visible, true)} />
        <Chip label="Clear this page" disabled={disabled} onPress={() => setItems(visible, false)} />
      </View>
      <AppText style={{ fontSize: 12, color: COLORS.grayDark, marginBottom: 8 }}>
        {checkedCount} of {items.length} items checked
        {flaggedCount ? ` · ${flaggedCount} flagged` : ""}
      </AppText>
      {visible.map((item) => {
        const flagged = isFlagged(item.key);
        const ticked = checked[item.key] === true;
        return (
          <View
            key={item.key}
            style={{ paddingVertical: 8, borderBottomWidth: 1, borderColor: "#eee" }}
          >
            <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
              <View
                accessibilityLabel={flagged ? "Discrepancy flagged" : undefined}
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  marginTop: 5,
                  marginRight: 6,
                  backgroundColor: flagged ? COLORS.dangerBorder : "transparent",
                }}
              />
              <TouchableOpacity
                accessibilityRole="checkbox"
                accessibilityState={{ checked: ticked, disabled: disabled || flagged }}
                disabled={disabled || flagged}
                style={{ flex: 1 }}
                onPress={() => emit({ ...checked, [item.key]: !ticked })}
              >
                <AppText>
                  {ticked ? "☑" : "☐"} {item.title}
                  {item.description ? ` — ${item.description}` : ""}
                </AppText>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={flagged ? "Remove flag" : "Flag discrepancy"}
                disabled={disabled}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                onPress={() => toggleFlag(item.key)}
                style={{ paddingLeft: 10, paddingTop: 2, opacity: disabled ? 0.45 : 1 }}
              >
                <MaterialCommunityIcons
                  name={flagged ? "flag" : "flag-outline"}
                  size={22}
                  color={COLORS.dangerBorder}
                />
              </TouchableOpacity>
            </View>
            {flagged && (
              <TextInput
                multiline
                editable={!disabled}
                placeholder="Describe the discrepancy for this item"
                value={discrepancies[item.key].note}
                onChangeText={(note) =>
                  emit(checked, {
                    ...discrepancies,
                    [item.key]: { ...discrepancies[item.key], note },
                  })
                }
                style={{
                  minHeight: 56,
                  padding: 10,
                  borderWidth: 1,
                  borderColor: discrepancies[item.key].note.trim()
                    ? "#ccc"
                    : COLORS.dangerBorder,
                  borderRadius: 6,
                  textAlignVertical: "top",
                }}
              />
            )}
          </View>
        );
      })}
      {pages > 1 && (
        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8 }}>
          <Chip label="Previous" disabled={page <= 1} onPress={() => setPage(page - 1)} />
          <AppText style={{ marginHorizontal: 8, fontSize: 12 }}>
            Page {page} of {pages}
          </AppText>
          <Chip label="Next" disabled={page >= pages} onPress={() => setPage(page + 1)} />
        </View>
      )}
    </View>
  );
}
