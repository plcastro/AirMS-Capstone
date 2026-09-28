import React, { useMemo } from "react";
import { FlatList, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  EmptyState,
  FieldRow,
  InfoCard,
  LoadingState,
  SearchBar,
  SectionTitle,
  StatusChip,
} from "./MobileModule";
import { COLORS } from "../../stylesheets/colors";
import { formatDate, formatDateTime } from "../../utilities/mobileApi";
import { matchesSearch } from "../../utilities/search";
import { groupAircraftLogs } from "../../../shared/aircraftLogGroups";
import { unviewedAircraftCounts } from "../../../shared/viewedLogs";
import NewLogBadge from "./NewLogBadge";

export default function AircraftLogGroups({
  records = [],
  loading = false,
  query = "",
  onQueryChange,
  onSelect,
  emptyText = "No logs found yet.",
  sortBy = "rpc",
  isNew,
  ...listProps
}) {
  const newCounts = useMemo(() => unviewedAircraftCounts(records, isNew), [records, isNew]);
  const groups = useMemo(
    () =>
      groupAircraftLogs(records, sortBy).filter((group) =>
        matchesSearch(query, [group.rpc, group.aircraftType, group.base]),
      ),
    [records, query, sortBy],
  );

  return (
    <View style={{ flex: 1 }}>
      <SearchBar
        value={query}
        onChangeText={onQueryChange}
        placeholder="Search aircraft or base"
      />
      <SectionTitle subtitle="Select an aircraft to view and filter its logs." />
      <FlatList
        ListEmptyComponent={
          loading ? (
            <LoadingState text="Loading aircraft logs..." />
          ) : (
            <EmptyState
              text={query.trim() ? "No aircraft match your search." : emptyText}
            />
          )
        }
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 110 }}
        keyboardShouldPersistTaps="handled"
        data={loading ? [] : groups}
        keyExtractor={(item, index) => String(item.rpc)}
        initialNumToRender={12}
        maxToRenderPerBatch={8}
        windowSize={7}
        {...listProps}
        renderItem={({ item: group }) => (
          <InfoCard
            key={group.rpc}
            title={group.rpc}
            subtitle="View aircraft logs"
            right={
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <View style={{ alignItems: "flex-start", gap: 4 }}>
                  <StatusChip
                    label={`${group.count} ${group.count === 1 ? "log" : "logs"}`}
                  />
                  {newCounts.get(group.rpc) > 0 && <NewLogBadge count={newCounts.get(group.rpc)} />}
                </View>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={22}
                  color={COLORS.primary}
                />
              </View>
            }
            onPress={() => onSelect(group.rpc)}
          >
            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
              <FieldRow
                label="Aircraft type"
                value={group.aircraftType || "N/A"}
              />
              <FieldRow label="Base" value={group.base || "N/A"} />
              {sortBy === "latestActivity" ? (
                <FieldRow
                  label="Last updated"
                  value={formatDateTime(group.latestActivity)}
                />
              ) : (
                <FieldRow
                  label="Latest log"
                  value={formatDate(group.latestDate)}
                />
              )}
            </View>
          </InfoCard>
        )}
      />
    </View>
  );
}
