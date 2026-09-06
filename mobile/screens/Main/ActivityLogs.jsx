import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import AppText from "../../components/common/AppText";
import {
  ActivityIndicator,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { API_BASE } from "../../utilities/API_BASE";
import { COLORS } from "../../stylesheets/colors";
import { showToast } from "../../utilities/toast";
import AreaChart from "../../components/common/AreaChart";
import { SearchBar } from "../../components/common/MobileModule";
import { exportReportPdf } from "../../utilities/reportExport";
import { matchesSearch } from "../../utilities/search";
import { AuthContext } from "../../Context/AuthContext";
import { canExportModule } from "../../../shared/exportAccess";
import {
  AUDIT_ACTION_CHART_CATEGORIES,
  buildEmptyAuditCategoryCounts,
  getAuditActionCategory,
  getAuditActionCategoryOptions,
} from "../../utilities/auditActions";

const ACTION_TYPE_OPTIONS = getAuditActionCategoryOptions();
const DATE_RANGE_OPTIONS = [
  { label: "Last 7 days", value: "7" },
  { label: "Last 30 days", value: "30" },
];
const SCOPE_TYPE_OPTIONS = [
  { label: "All Scope", value: "all" },
  { label: "Base", value: "base" },
  { label: "Platform", value: "platform" },
];
const LOGS_PER_PAGE = 10;
const ACTIVITY_TREND_SERIES = AUDIT_ACTION_CHART_CATEGORIES.map(
  ({ value, label, color }) => ({
    key: value,
    name: label,
    color,
  }),
);
const ACTION_TAG_COLORS = AUDIT_ACTION_CHART_CATEGORIES.reduce(
  (colors, category) => ({
    ...colors,
    [category.value]: { bg: "#F2F4F7", text: category.color },
  }),
  {},
);

const DAY_MS = 24 * 60 * 60 * 1000;

const startOfDay = (date) => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};

const endOfDay = (date) => {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
};

const buildTrendData = (items = [], dateRangeFilter = "7") => {
  const dailyStats = {};

  items.forEach((log) => {
    if (!log.dateTime) return;

    const parsedDate = new Date(log.dateTime);

    if (Number.isNaN(parsedDate.getTime())) return;

    const dateKey = parsedDate.toISOString().slice(0, 10);

    if (!dailyStats[dateKey]) {
      dailyStats[dateKey] = {
        label: dateKey,
        ...buildEmptyAuditCategoryCounts(),
      };
    }

    const category = getAuditActionCategory(log.actionMade);

    dailyStats[dateKey][category]++;
  });

  const endDate = endOfDay(new Date());

  let startDate;

  if (dateRangeFilter === "all") {
    const dates = Object.keys(dailyStats).sort();

    startDate = dates.length
      ? startOfDay(new Date(`${dates[0]}T00:00:00`))
      : startOfDay(new Date());
  } else {
    const days = Number(dateRangeFilter);

    startDate = startOfDay(new Date(endDate.getTime() - (days - 1) * DAY_MS));
  }

  const filledData = [];

  let cursor = startDate;

  while (cursor <= endDate) {
    const dateKey = cursor.toISOString().slice(0, 10);

    filledData.push(
      dailyStats[dateKey] || {
        label: dateKey,
        ...buildEmptyAuditCategoryCounts(),
      },
    );

    cursor = new Date(cursor.getTime() + DAY_MS);
  }

  return filledData;
};

export default function ActivityLogs() {
  const { user } = useContext(AuthContext);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionType, setActionType] = useState("all");
  const [scopeType, setScopeType] = useState("all");
  const [scopeValue, setScopeValue] = useState("all");
  const [dateRangeFilter, setDateRangeFilter] = useState("30");
  const [openFilter, setOpenFilter] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const canExportActivityLogs = canExportModule(user?.jobTitle, "activityLogs");

  const fetchLogs = useCallback(
    async ({ silent = false } = {}) => {
      try {
        if (!silent) setLoading(true);
        const token = await AsyncStorage.getItem("currentUserToken");
        const query = new URLSearchParams({ page: "1", limit: "1000" });

        if (dateRangeFilter !== "all") {
          const days = Number(dateRangeFilter);
          if (Number.isFinite(days) && days > 0) {
            const endDate = new Date();
            const startDate = new Date(
              endDate.getTime() - days * 24 * 60 * 60 * 1000,
            );
            query.set("startDate", startDate.toISOString());
            query.set("endDate", endDate.toISOString());
          }
        }

        const response = await fetch(
          `${API_BASE}/api/logs/getAllUserLogs?${query.toString()}`,
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

        const responseLogs = Array.isArray(json.data) ? json.data : [];
        const mapped = responseLogs.map((item, index) => ({
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
            .toUpperCase(),
        }));

        setLogs(mapped);
      } catch (error) {
        console.error("Fetch logs error:", error);
        showToast(error.message || "Failed to fetch logs");
      } finally {
        if (!silent) setLoading(false);
        setRefreshing(false);
      }
    },
    [dateRangeFilter],
  );

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
        (item) => getAuditActionCategory(item.actionMade) === actionType,
      );
    }

    if (scopeType !== "all" && scopeValue !== "all") {
      if (scopeType === "base") {
        next = next.filter(
          (item) =>
            String(item.base || "unknown").toUpperCase() ===
            String(scopeValue).toUpperCase(),
        );
      } else if (scopeType === "platform") {
        next = next.filter(
          (item) =>
            String(item.platform || "unknown").toUpperCase() ===
            String(scopeValue).toUpperCase(),
        );
      }
    }

    return next.filter((item) => matchesSearch(searchQuery, item));
  }, [actionType, dateRangeFilter, logs, scopeType, scopeValue, searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [actionType, dateRangeFilter, scopeType, scopeValue, searchQuery]);

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
        const category = getAuditActionCategory(log.actionMade);
        counts[category] = (counts[category] || 0) + 1;
        return counts;
      },
      { ...buildEmptyAuditCategoryCounts() },
    );
  }, [filteredLogs]);

  const trendSeries = useMemo(() => {
    return buildTrendData(filteredLogs, dateRangeFilter);
  }, [dateRangeFilter, filteredLogs]);

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

  const scopeValueOptions = useMemo(() => {
    if (scopeType === "base") {
      const values = Array.from(
        new Set([
          "MANILA",
          "CEBU",
          "CDO",
          ...logs
            .map((item) =>
              String(item.base || "")
                .trim()
                .toUpperCase(),
            )
            .filter(Boolean),
        ]),
      ).sort();
      return [
        { label: "All Base", value: "all" },
        ...values.map((value) => ({ label: value, value })),
      ];
    }
    if (scopeType === "platform") {
      const values = Array.from(
        new Set([
          "WEB",
          "MOBILE",
          ...logs
            .map((item) =>
              String(item.platform || "")
                .trim()
                .toUpperCase(),
            )
            .filter(Boolean),
        ]),
      ).sort();
      return [
        { label: "All Platform", value: "all" },
        ...values.map((value) => ({ label: value, value })),
      ];
    }
    return [];
  }, [logs, scopeType]);

  const selectedActionLabel =
    ACTION_TYPE_OPTIONS.find((option) => option.value === actionType)?.label ||
    "Action Type";
  const selectedDateRangeLabel =
    DATE_RANGE_OPTIONS.find((option) => option.value === dateRangeFilter)
      ?.label || "Date Range";
  const selectedScopeTypeLabel =
    SCOPE_TYPE_OPTIONS.find((option) => option.value === scopeType)?.label ||
    "Scope";
  const selectedScopeValueLabel =
    scopeValueOptions.find((option) => option.value === scopeValue)?.label ||
    (scopeType === "base" ? "All Base" : "All Platform");
  const visibleTrendSeries = useMemo(
    () =>
      actionType === "all"
        ? ACTIVITY_TREND_SERIES
        : ACTIVITY_TREND_SERIES.filter((series) => series.key === actionType),
    [actionType],
  );

  const toggleFilter = (filterKey) => {
    setOpenFilter((current) => (current === filterKey ? null : filterKey));
  };

  const selectFilterValue = (setter, value) => {
    setter(value);
    setOpenFilter(null);
  };

  const renderFilterDropdown = ({
    filterKey,
    label,
    selectedLabel,
    options,
    onSelect,
    widthStyle,
  }) => {
    const isOpen = openFilter === filterKey;

    return (
      <View
        key={filterKey}
        style={[
          styles.filterDropdownWrap,
          widthStyle,
          isOpen ? styles.filterDropdownWrapOpen : null,
          Platform.OS === "android" && isOpen && filterKey === "action"
            ? styles.filterDropdownWrapOpenAndroid
            : null,
        ]}
      >
        <TouchableOpacity
          style={styles.unifiedFilterButton}
          activeOpacity={0.82}
          onPress={() => toggleFilter(filterKey)}
        >
          <MaterialCommunityIcons
            name="tune"
            size={16}
            color={COLORS.primaryLight}
            style={{ marginRight: 6 }}
          />
          <AppText style={styles.unifiedFilterButtonText} numberOfLines={1}>
            {selectedLabel || label}
          </AppText>
          <MaterialCommunityIcons
            name={isOpen ? "chevron-up" : "chevron-down"}
            size={22}
            color={COLORS.grayDark}
          />
        </TouchableOpacity>

        {isOpen && (
          <View style={styles.unifiedDropdownMenu}>
            <ScrollView
              style={styles.unifiedDropdownScroll}
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator
            >
              {options.map((option, index) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.unifiedDropdownItem,
                    index < options.length - 1
                      ? styles.unifiedDropdownItemBordered
                      : null,
                  ]}
                  onPress={() => onSelect(option.value)}
                >
                  <AppText
                    style={styles.unifiedDropdownItemText}
                    numberOfLines={2}
                  >
                    {option.label}
                  </AppText>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>
    );
  };

  const filterControls = [
    {
      filterKey: "action",
      label: "Action Type",
      selectedLabel: selectedActionLabel,
      options: ACTION_TYPE_OPTIONS,
      onSelect: (value) => selectFilterValue(setActionType, value),
    },
    {
      filterKey: "dateRange",
      label: "Date Range",
      selectedLabel: selectedDateRangeLabel,
      options: DATE_RANGE_OPTIONS,
      onSelect: (value) => selectFilterValue(setDateRangeFilter, value),
    },
    {
      filterKey: "scope",
      label: "Scope",
      selectedLabel: selectedScopeTypeLabel,
      options: SCOPE_TYPE_OPTIONS,
      onSelect: (value) => {
        setScopeType(value);
        setScopeValue("all");
        setOpenFilter(null);
      },
    },
    ...(scopeType === "all"
      ? []
      : [
          {
            filterKey: "scopeValue",
            label: scopeType === "base" ? "Base" : "Platform",
            selectedLabel: selectedScopeValueLabel,
            options: scopeValueOptions,
            onSelect: (value) => selectFilterValue(setScopeValue, value),
          },
        ]),
  ];
  const shouldScrollFilters = filterControls.length > 2;

  const formatDisplayDate = useCallback((dateValue) => {
    const parsedDate = new Date(dateValue);
    if (Number.isNaN(parsedDate.getTime())) return "N/A";

    return parsedDate.toLocaleString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }, []);

  const handleExportPdf = useCallback(async () => {
    if (!filteredLogs.length) {
      showToast("No activity logs available to export.");
      return;
    }

    try {
      setExporting(true);
      await exportReportPdf({
        title: "Activity Logs Report",
        sections: [
          {
            title: "Activity Logs",
            columns: ["Date / Time", "User", "Action", "Platform", "Base"],
            rows: filteredLogs.map((log) => ({
              "Date / Time": formatDisplayDate(log.dateTime),
              User: log.username || "Unknown",
              Action: log.actionMade || "N/A",
              Platform: log.platform || "Not captured",
              Base: log.base || "Not captured",
            })),
          },
        ],
      });
    } catch (error) {
      console.error("Activity logs PDF export failed:", error);
      showToast(error.message || "Failed to export activity logs.");
    } finally {
      setExporting(false);
    }
  }, [filteredLogs, formatDisplayDate]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={COLORS.primaryLight} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SearchBar
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Search logs"
      />

      <ScrollView
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
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
        {shouldScrollFilters ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            contentContainerStyle={styles.filtersScrollContent}
            style={[
              styles.filtersScroll,
              Platform.OS === "android" && openFilter === "action"
                ? styles.filtersScrollOpenAndroid
                : null,
            ]}
          >
            {filterControls.map((filter) =>
              renderFilterDropdown({
                ...filter,
                widthStyle: styles.scrollableFilterDropdownWrap,
              }),
            )}
          </ScrollView>
        ) : (
          <View style={styles.filtersRow}>
            {filterControls.map((filter) => renderFilterDropdown(filter))}
          </View>
        )}

        {canExportActivityLogs && (
          <TouchableOpacity
            activeOpacity={0.86}
            disabled={exporting || filteredLogs.length === 0}
            onPress={handleExportPdf}
            style={[
              styles.exportButton,
              (exporting || filteredLogs.length === 0) &&
                styles.exportButtonDisabled,
            ]}
          >
            {exporting ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <MaterialCommunityIcons
                name="file-pdf-box"
                size={18}
                color={COLORS.white}
              />
            )}
            <AppText style={styles.exportButtonText}>
              {exporting ? "Exporting..." : "Export PDF"}
            </AppText>
          </TouchableOpacity>
        )}

        <View style={styles.analyticsCard}>
          <AppText style={styles.analyticsTitle}>Activity Trends</AppText>
          <AreaChart
            data={trendSeries}
            height={160}
            series={visibleTrendSeries}
            showLegend={false}
            xKey="label"
          />
          <View style={styles.legendRow}>
            {AUDIT_ACTION_CHART_CATEGORIES.filter(
              (category) =>
                actionType === "all" || category.value === actionType,
            ).map((category) => (
              <View key={category.value} style={styles.legendItem}>
                <View
                  style={[
                    styles.legendDot,
                    { backgroundColor: category.color },
                  ]}
                />
                <AppText style={styles.legendText} numberOfLines={1}>
                  {category.label} ({actionCounts[category.value] || 0})
                </AppText>
              </View>
            ))}
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
            const actionCategory = getAuditActionCategory(item.actionMade);
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
  filtersRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
    zIndex: 20,
  },
  filtersScroll: {
    height: 48,
    marginBottom: 20,
    overflow: "visible",
    zIndex: 20,
  },
  filtersScrollOpenAndroid: {
    height: 312,
    zIndex: 1000,
  },
  filtersScrollContent: {
    columnGap: 12,
    paddingRight: 8,
    overflow: "visible",
  },
  filterDropdownWrap: {
    flex: 1,
    minWidth: 0,
  },
  scrollableFilterDropdownWrap: {
    flex: 0,
    width: 172,
  },
  filterDropdownWrapOpen: {
    zIndex: 1000,
    elevation: 6,
  },
  filterDropdownWrapOpenAndroid: {
    height: 312,
  },
  unifiedFilterButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.grayMedium,
    height: 48,
    paddingHorizontal: 12,
  },
  unifiedFilterButtonText: {
    flex: 1,
    minWidth: 0,
    fontSize: 12,
    color: COLORS.black,
    fontWeight: "600",
  },
  unifiedDropdownMenu: {
    position: "absolute",
    top: 52,
    left: 0,
    right: 0,
    maxHeight: 260,
    backgroundColor: COLORS.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.grayMedium,
    overflow: "hidden",
    zIndex: 1000,
    elevation: 5,
    shadowColor: "#0A0D12",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  unifiedDropdownScroll: {
    maxHeight: 258,
  },
  unifiedDropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 44,
    justifyContent: "center",
  },
  unifiedDropdownItemBordered: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.grayMedium,
  },
  unifiedDropdownItemText: {
    color: COLORS.black,
    fontSize: 12,
    fontWeight: "500",
  },
  exportButton: {
    minHeight: 46,
    borderRadius: 10,
    backgroundColor: COLORS.primaryLight,
    marginBottom: 10,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    columnGap: 8,
    shadowColor: "#0A0D12",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  exportButtonDisabled: {
    backgroundColor: COLORS.grayMedium,
    opacity: 0.75,
  },
  exportButtonText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: "700",
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
  legendRow: {
    marginTop: 6,
    flexDirection: "row",
    flexWrap: "wrap",
    columnGap: 10,
    rowGap: 5,
  },
  legendItem: {
    alignItems: "center",
    flexDirection: "row",
    maxWidth: "48%",
  },
  legendDot: {
    borderRadius: 4,
    height: 7,
    marginRight: 5,
    width: 7,
  },
  legendText: {
    color: COLORS.grayDark,
    fontSize: 10,
    fontWeight: "600",
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
