import React, { useCallback, useEffect, useMemo, useState } from "react";
import AppText from "../../components/common/AppText";
import AppInput from "../../components/common/AppInput";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { API_BASE } from "../../utilities/API_BASE";
import { COLORS } from "../../stylesheets/colors";
import { showToast } from "../../utilities/toast";
import AreaChart from "../../components/common/AreaChart";

const ACTION_TYPES = ["all", "create", "update", "delete", "login", "logout"];
const DATE_RANGE_OPTIONS = [
  { label: "Last 7 days", value: "7" },
  { label: "Last 30 days", value: "30" },
  { label: "Last 90 days", value: "90" },
  { label: "All time", value: "all" },
];
const LOGS_PER_PAGE = 10;
const HIDDEN_ACTION_KEYWORDS = [
  "viewed",
  "succeeded",
  "successful",
  "successfully",
];

const getActionCategory = (actionText = "") => {
  const text = String(actionText).toLowerCase();

  // login/logout first
  if (
    ["log in", "logged in", "login", "signed in"].some((k) => text.includes(k))
  ) {
    return "login";
  }

  if (
    ["log out", "logged out", "logout", "signed out"].some((k) =>
      text.includes(k),
    )
  ) {
    return "logout";
  }

  // updates
  if (
    [
      "updated",
      "modified",
      "changed",
      "edited",
      "activated",
      "deactivated",
      "disabled",
      "enabled",
      "status changed",
    ].some((k) => text.includes(k))
  ) {
    return "update";
  }

  // delete
  if (
    ["deleted", "removed", "destroyed", "erased"].some((k) => text.includes(k))
  ) {
    return "delete";
  }

  // create
  if (["created", "added", "inserted"].some((k) => text.includes(k))) {
    return "create";
  }

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

const buildEmptyDailyCategories = () => ({
  create: 0,
  update: 0,
  delete: 0,
  login: 0,
  logout: 0,
  other: 0,
});

export default function ActivityLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionType, setActionType] = useState("all");
  const [scopeFilter, setScopeFilter] = useState("all");
  const [dateRangeFilter, setDateRangeFilter] = useState("30");
  const [currentPage, setCurrentPage] = useState(1);

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
    next = next.filter((item) => {
      const actionText = String(item.actionMade || "").toLowerCase();
      return !HIDDEN_ACTION_KEYWORDS.some((keyword) =>
        actionText.includes(keyword),
      );
    });
    if (dateRangeFilter !== "all") {
      const days = Number(dateRangeFilter);
      if (Number.isFinite(days) && days > 0) {
        const threshold = Date.now() - days * 24 * 60 * 60 * 1000;
        next = next.filter((item) => {
          const time = new Date(item.dateTime).getTime();
          return Number.isFinite(time) && time >= threshold;
        });
      }
    }
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
  }, [actionType, dateRangeFilter, logs, scopeFilter, searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [actionType, dateRangeFilter, scopeFilter, searchQuery]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredLogs.length / LOGS_PER_PAGE),
  );
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * LOGS_PER_PAGE;
    return filteredLogs.slice(start, start + LOGS_PER_PAGE);
  }, [currentPage, filteredLogs]);

  const actionCounts = useMemo(() => {
    return filteredLogs.reduce(
      (counts, log) => {
        const category = getActionCategory(log.actionMade);
        counts[category] = (counts[category] || 0) + 1;
        return counts;
      },
      { ...buildEmptyDailyCategories() },
    );
  }, [filteredLogs]);

  const trendSeries = useMemo(() => {
    const dailyStats = {};

    filteredLogs.forEach((log) => {
      const parsedDate = new Date(log.dateTime);
      if (Number.isNaN(parsedDate.getTime())) return;
      const dateKey = parsedDate.toISOString().slice(0, 10);

      if (!dailyStats[dateKey]) {
        dailyStats[dateKey] = {
          date: dateKey,
          ...buildEmptyDailyCategories(),
        };
      }

      const category = getActionCategory(log.actionMade);
      dailyStats[dateKey][category] += 1;
    });

    const sortedKeys = Object.keys(dailyStats).sort((a, b) =>
      a.localeCompare(b),
    );
    const windowKeys = sortedKeys.slice(-8);

    return windowKeys.map((dateKey) => {
      const row = dailyStats[dateKey];
      const labelDate = new Date(`${dateKey}T00:00:00`);
      return {
        date: dateKey,
        label: Number.isNaN(labelDate.getTime())
          ? dateKey
          : labelDate.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            }),
        value: Object.values(row)
          .filter((value) => typeof value === "number")
          .reduce((sum, value) => sum + value, 0),
        ...row,
      };
    });
  }, [filteredLogs]);
  const groupedSummary = useMemo(() => {
    const byUser = {};
    const byModule = {};
    filteredLogs.forEach((item) => {
      const userKey = String(item.username || "Unknown");
      byUser[userKey] = (byUser[userKey] || 0) + 1;
      const actionText = String(item.actionMade || "").toLowerCase();
      const module = actionText.includes("task")
        ? "tasks"
        : actionText.includes("flight")
          ? "flight logs"
          : actionText.includes("inspection")
            ? "inspections"
            : actionText.includes("requisition")
              ? "requisitions"
              : actionText.includes("user")
                ? "users"
                : "other";
      byModule[module] = (byModule[module] || 0) + 1;
    });
    const topUsers = Object.entries(byUser)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
    const topModules = Object.entries(byModule)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
    return { topUsers, topModules };
  }, [filteredLogs]);

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
        <AppInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search logs"
          placeholderTextColor={COLORS.grayDark}
          style={styles.searchInput}
        />
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
        <View style={styles.filtersRow}>
          <View style={styles.filterCard}>
            <AppText style={styles.filterLabel}>Action Type</AppText>
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
            <AppText style={styles.filterLabel}>Date Range</AppText>
            <Picker
              selectedValue={dateRangeFilter}
              onValueChange={setDateRangeFilter}
            >
              {DATE_RANGE_OPTIONS.map((value) => (
                <Picker.Item
                  key={value.value}
                  value={value.value}
                  label={value.label}
                />
              ))}
            </Picker>
          </View>

          <View style={styles.filterCard}>
            <AppText style={styles.filterLabel}>Scope</AppText>
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

        <View style={styles.analyticsCard}>
          <AppText style={styles.analyticsTitle}>Activity Trends</AppText>
          <AreaChart data={trendSeries} height={130} />
          <View style={styles.trendLabelsRow}>
            {trendSeries.map((point) => (
              <AppText key={point.date} style={styles.trendLabel}>
                {point.label}
              </AppText>
            ))}
          </View>
          <View style={styles.kpiRow}>
            <View style={styles.kpiChip}>
              <AppText style={styles.kpiLabel}>Create</AppText>
              <AppText style={styles.kpiValue}>{actionCounts.create}</AppText>
            </View>
            <View style={styles.kpiChip}>
              <AppText style={styles.kpiLabel}>Update</AppText>
              <AppText style={styles.kpiValue}>{actionCounts.update}</AppText>
            </View>
            <View style={styles.kpiChip}>
              <AppText style={styles.kpiLabel}>Delete</AppText>
              <AppText style={styles.kpiValue}>{actionCounts.delete}</AppText>
            </View>
            <View style={styles.kpiChip}>
              <AppText style={styles.kpiLabel}>Login</AppText>
              <AppText style={styles.kpiValue}>{actionCounts.login}</AppText>
            </View>
            <View style={styles.kpiChip}>
              <AppText style={styles.kpiLabel}>Logout</AppText>
              <AppText style={styles.kpiValue}>{actionCounts.logout}</AppText>
            </View>
          </View>
          <View style={styles.groupSummaryWrap}>
            <AppText style={styles.groupSummaryTitle}>Top Users</AppText>
            {groupedSummary.topUsers.map(([name, count]) => (
              <AppText key={name} style={styles.groupSummaryText}>
                {name}: {count}
              </AppText>
            ))}
            <AppText style={[styles.groupSummaryTitle, { marginTop: 6 }]}>
              Top Modules
            </AppText>
            {groupedSummary.topModules.map(([name, count]) => (
              <AppText key={name} style={styles.groupSummaryText}>
                {name}: {count}
              </AppText>
            ))}
          </View>
        </View>

        {filteredLogs.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons
              name="history"
              size={44}
              color={COLORS.grayMedium}
            />
            <AppText style={styles.emptyText}>No logs found</AppText>
          </View>
        ) : (
          paginatedLogs.map((item) => {
            const actionCategory = getActionCategory(item.actionMade);
            const actionColors =
              ACTION_TAG_COLORS[actionCategory] || ACTION_TAG_COLORS.other;
            return (
              <View key={String(item._id)} style={styles.logCard}>
                <View style={styles.cardHeaderRow}>
                  <AppText style={styles.cardTitle}>
                    {item.actionMade || "N/A"}
                  </AppText>
                  <View
                    style={[
                      styles.tag,
                      {
                        backgroundColor: actionColors.bg,
                        borderColor: actionColors.bg,
                      },
                    ]}
                  >
                    <AppText
                      style={[styles.tagText, { color: actionColors.text }]}
                    >
                      {actionCategory.toUpperCase()}
                    </AppText>
                  </View>
                </View>

                <AppText style={styles.userText}>
                  User: {item.username || "Unknown"}
                </AppText>
                <AppText style={styles.dateText}>
                  {formatDisplayDate(item.dateTime)}
                </AppText>

                <View style={styles.metaTagsRow}>
                  <View style={[styles.tag, styles.baseTag]}>
                    <AppText style={[styles.tagText, styles.baseTagText]}>
                      BASE: {item.base || "UNKNOWN"}
                    </AppText>
                  </View>
                  <View style={[styles.tag, styles.platformTag]}>
                    <AppText style={[styles.tagText, styles.platformTagText]}>
                      {String(item.platform || "unknown").toUpperCase()}
                    </AppText>
                  </View>
                </View>
              </View>
            );
          })
        )}
        {filteredLogs.length > 0 && (
          <View style={styles.paginationRow}>
            <AppText style={styles.paginationText}>
              Page {currentPage} of {totalPages}
            </AppText>
            <View style={styles.paginationButtonsRow}>
              <AppText
                onPress={() => setCurrentPage((page) => Math.max(1, page - 1))}
                style={[
                  styles.paginationButton,
                  currentPage === 1 && styles.paginationButtonDisabled,
                ]}
              >
                Prev
              </AppText>
              <AppText
                onPress={() =>
                  setCurrentPage((page) => Math.min(totalPages, page + 1))
                }
                style={[
                  styles.paginationButton,
                  currentPage >= totalPages && styles.paginationButtonDisabled,
                ]}
              >
                Next
              </AppText>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.grayLight,
    padding: 10,
    height: "100%",
  },
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
    flexDirection: "column",
    rowGap: 8,
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
    minHeight: 56,
    justifyContent: "center",
  },
  filterLabel: {
    fontSize: 10,
    color: COLORS.grayDark,
    fontWeight: "700",
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  analyticsCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 10,
    padding: 10,
  },
  analyticsTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.black,
    marginBottom: 8,
  },
  trendLabelsRow: {
    marginTop: 2,
    flexDirection: "row",
    justifyContent: "space-between",
    columnGap: 4,
  },
  trendLabel: {
    color: COLORS.grayDark,
    fontSize: 10,
  },
  kpiRow: {
    marginTop: 8,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  kpiChip: {
    backgroundColor: "#F4F7F8",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  kpiLabel: {
    color: COLORS.grayDark,
    fontSize: 10,
  },
  kpiValue: {
    color: COLORS.black,
    fontSize: 12,
    fontWeight: "700",
  },
  groupSummaryWrap: { marginTop: 8 },
  groupSummaryTitle: { fontSize: 11, fontWeight: "700", color: COLORS.black },
  groupSummaryText: { fontSize: 11, color: COLORS.grayDark, marginTop: 2 },
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
  listContent: { paddingBottom: 110 },
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
  paginationRow: {
    marginTop: 4,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  paginationText: {
    color: COLORS.grayDark,
    fontSize: 11,
  },
  paginationButtonsRow: {
    flexDirection: "row",
    columnGap: 8,
  },
  paginationButton: {
    backgroundColor: COLORS.primaryLight,
    color: COLORS.white,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    overflow: "hidden",
    fontSize: 11,
    fontWeight: "700",
  },
  paginationButtonDisabled: {
    backgroundColor: COLORS.grayMedium,
  },
});
