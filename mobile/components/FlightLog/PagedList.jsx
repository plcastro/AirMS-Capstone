import React, { useEffect, useState } from "react";
import { View, TouchableOpacity } from "react-native";
import AppText from "../common/AppText";
import { COLORS } from "../../stylesheets/colors";

// Shows a long list a few rows at a time so the dialog does not need endless scrolling.
export default function PagedList({ items, pageSize = 6, renderItem }) {
  const [page, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(items.length / pageSize));
  useEffect(() => {
    if (page > pages) setPage(pages);
  }, [page, pages]);
  const nav = (label, disabled, onPress) => (
    <TouchableOpacity
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={{
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: COLORS.grayMedium,
        borderRadius: 6,
        opacity: disabled ? 0.45 : 1,
      }}
    >
      <AppText style={{ fontSize: 12 }}>{label}</AppText>
    </TouchableOpacity>
  );
  return (
    <View>
      {items.slice((page - 1) * pageSize, page * pageSize).map(renderItem)}
      {pages > 1 && (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            marginTop: 8,
            gap: 10,
          }}
        >
          {nav("Previous", page <= 1, () => setPage(page - 1))}
          <AppText style={{ fontSize: 12 }}>
            Page {page} of {pages}
          </AppText>
          {nav("Next", page >= pages, () => setPage(page + 1))}
        </View>
      )}
    </View>
  );
}
