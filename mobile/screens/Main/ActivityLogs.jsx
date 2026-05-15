import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { API_BASE } from "../../utilities/API_BASE";
import { COLORS } from "../../stylesheets/colors";
import { showToast } from "../../utilities/toast";

const ACTION_TYPES = ["all", "create", "update", "delete", "login", "logout"];

const getActionCategory = (actionText = "") => {
  const text = String(actionText).toLowerCase();
  if (["created", "added", "inserted", "new"].some((k) => text.includes(k)))
    return "create";
  if (
    ["updated", "modified", "changed", "edited"].some((k) => text.includes(k))
  )
    return "update";
  if (
    ["deleted", "removed", "destroyed", "erased"].some((k) => text.includes(k))
  )
    return "delete";
  if (
    ["log in", "logged in", "login", "signed in"].some((k) => text.includes(k))
  )
    return "login";
  if (
    ["log out", "logged out", "logout", "signed out"].some((k) =>
      text.includes(k),
    )
  )
    return "logout";
  return "other";
};

const ACTION_TAG_COLORS = {
  create: { bg: "#E7F7ED", text: "#157A38" },
  update: { bg: "#E7F0FF", text: "#1F5FBF" },
  delete: { bg: "#FDEAEA", text: "#B42318" },
  login: { bg: "#EAF7FE", text: "#0B6B9E" },
  logout: { bg: "#FFF2E8", text: "#AD4E00" },
  other: { bg: "#F2F4F7", text: "#344054" },
};

export default function ActivityLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionType, setActionType] = useState("all");
  const [scopeFilter, setScopeFilter] = useState("all");

  const fetchLogs = useCallback(async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true);
      const token = await AsyncStorage.getItem("currentUserToken");
      const response = await fetch(
        `${API_BASE}/api/logs/getAllUserLogs?page=1&limit=1000`,
        {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        },
      );

      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(json?.message || "Failed to fetch logs");
      }

      const mapped = Array.isArray(json.data)
        ? json.data.map((item, index) => ({
            _id: item._id || String(index),
            index: index + 1,
            dateTime: item.dateTime,
            actionMade: item.actionMade || item.action || "N/A",
            username: item.username || "Unknown",
            base: String(item.base || item.loginBase || "unknown")
              .trim()
              .toUpperCase(),
            platform: String(item.platform || "unknown")
              .trim()
              .toLowerCase(),
          }))
        : [];

      setLogs(mapped);
    } catch (error) {
      console.error("Fetch logs error:", error);
      showToast(error.message || "Failed to fetch logs");
    } finally {
      if (!silent) setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useFocusEffect(
    useCallback(() => {
      fetchLogs({ silent: true });
    }, [fetchLogs]),
  );

  useEffect(() => {
    if (typeof EventSource === "undefined") return undefined;

    const stream = new EventSource(`${API_BASE}/api/events/stream`);
    const onDataChanged = () => fetchLogs({ silent: true });

    stream.addEventListener("data-changed", onDataChanged);

    return () => {
      stream.removeEventListener("data-changed", onDataChanged);
      stream.close();
    };
  }, [fetchLogs]);

  const filteredLogs = useMemo(() => {
    let next = [...logs];
    if (actionType !== "all") {
      next = next.filter(
        (item) => getActionCategory(item.actionMade) === actionType,
      );
    }

    if (scopeFilter !== "all") {
      const [scopeType, scopeValue] = String(scopeFilter).split(":");
      if (scopeType === "base") {
        next = next.filter(
          (item) => String(item.base || "unknown") === String(scopeValue),
        );
      } else if (scopeType === "platform") {
        next = next.filter(
          (item) => String(item.platform || "unknown") === String(scopeValue),
        );
      }
    }

    const query = searchQuery.trim().toLowerCase();
    if (!query) return next;

    return next.filter((item) =>
      [item.actionMade, item.username, item.dateTime, item.base, item.platform]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [actionType, logs, scopeFilter, searchQuery]);

  const scopeOptions = useMemo(() => {
    const platformValues = Array.from(
      new Set(logs.map((item) => item.platform).filter(Boolean)),
    ).sort((a, b) => {
      if (a === "unknown") return 1;
      if (b === "unknown") return -1;
      return a.localeCompare(b);
    });
    const baseValues = Array.from(
      new Set([
        "MANILA",
        "CEBU",
        "CDO",
        ...logs.map((item) => item.base).filter(Boolean),
      ]),
    ).sort();

    return [
      { label: "All Platform/Base", value: "all" },
      ...platformValues.map((value) => ({
        label: `Platform > ${value[0].toUpperCase() + value.slice(1)}`,
        value: `platform:${value}`,
      })),
      ...baseValues.map((value) => ({
        label: `Base > ${value}`,
        value: `base:${value}`,
      })),
    ];
  }, [logs]);

  const formatDisplayDate = (dateValue) => {
    const parsedDate = new Date(dateValue);
    if (Number.isNaN(parsedDate.getTime())) return "N/A";

    return parsedDate.toLocaleString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={COLORS.primaryLight} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <MaterialCommunityIcons
          name="magnify"
          size={20}
          color={COLORS.grayDark}
        />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search logs"
          placeholderTextColor={COLORS.grayDark}
          style={styles.searchInput}
        />
      </View>

      <View style={styles.filtersRow}>
        <View style={styles.filterCard}>
          <Picker selectedValue={actionType} onValueChange={setActionType}>
            {ACTION_TYPES.map((type) => (
              <Picker.Item
                key={type}
                value={type}
                label={
                  type === "all"
                    ? "All Actions"
                    : type[0].toUpperCase() + type.slice(1)
                }
              />
            ))}
          </Picker>
        </View>

        <View style={styles.filterCard}>
          <Picker selectedValue={scopeFilter} onValueChange={setScopeFilter}>
            {scopeOptions.map((value) => (
              <Picker.Item
                key={value.value}
                value={value.value}
                label={value.label}
              />
            ))}
          </Picker>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchLogs({ silent: true });
            }}
            colors={[COLORS.primaryLight]}
          />
        }
      >
        {filteredLogs.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons
              name="history"
              size={44}
              color={COLORS.grayMedium}
            />
            <Text style={styles.emptyText}>No logs found</Text>
          </View>
        ) : (
          filteredLogs.map((item) => {
            const actionCategory = getActionCategory(item.actionMade);
            const actionColors =
              ACTION_TAG_COLORS[actionCategory] || ACTION_TAG_COLORS.other;
            return (
              <View key={String(item._id)} style={styles.logCard}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.cardTitle}>
                    {item.actionMade || "N/A"}
                  </Text>
                  <View
                    style={[
                      styles.tag,
                      {
                        backgroundColor: actionColors.bg,
                        borderColor: actionColors.bg,
                      },
                    ]}
                  >
                    <Text
                      style={[styles.tagText, { color: actionColors.text }]}
                    >
                      {actionCategory.toUpperCase()}
                    </Text>
                  </View>
                </View>

                <Text style={styles.userText}>
                  User: {item.username || "Unknown"}
                </Text>
                <Text style={styles.dateText}>
                  {formatDisplayDate(item.dateTime)}
                </Text>

                <View style={styles.metaTagsRow}>
                  <View style={[styles.tag, styles.baseTag]}>
                    <Text style={[styles.tagText, styles.baseTagText]}>
                      BASE: {item.base || "UNKNOWN"}
                    </Text>
                  </View>
                  <View style={[styles.tag, styles.platformTag]}>
                    <Text style={[styles.tagText, styles.platformTagText]}>
                      {String(item.platform || "unknown").toUpperCase()}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.grayLight, padding: 10 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 10,
    shadowColor: "#0A0D12",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    color: COLORS.black,
    fontSize: 12,
    marginLeft: 6,
    height: 40,
  },
  filtersRow: {
    flexDirection: "row",
    alignItems: "center",
    columnGap: 8,
    marginBottom: 10,
  },
  filterCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
    shadowColor: "#0A0D12",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  filterTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingTop: 8,
  },
  filterTitle: {
    marginLeft: 6,
    color: COLORS.grayDark,
    fontWeight: "700",
    fontSize: 11,
    textTransform: "uppercase",
  },
  listContent: { paddingBottom: 20 },
  emptyState: { alignItems: "center", marginTop: 40 },
  emptyText: { marginTop: 8, color: COLORS.grayDark },
  logCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
    padding: 12,
    shadowColor: "#0A0D12",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  cardTitle: {
    color: COLORS.black,
    fontSize: 13,
    fontWeight: "700",
    flex: 1,
    paddingRight: 8,
  },
  userText: { marginTop: 2, color: COLORS.grayDark, fontSize: 12 },
  dateText: { marginTop: 2, color: COLORS.grayDark, fontSize: 12 },
  metaTagsRow: {
    flexDirection: "row",
    alignItems: "center",
    columnGap: 6,
    marginTop: 8,
  },
  tag: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  tagText: { fontSize: 10, fontWeight: "700" },
  baseTag: { backgroundColor: "#EEF4FF", borderColor: "#D5E3FF" },
  baseTagText: { color: "#2B5CC7" },
  platformTag: { backgroundColor: "#F0FDF4", borderColor: "#CFF5DA" },
  platformTagText: { color: "#137333" },
});
