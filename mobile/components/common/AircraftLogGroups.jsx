import React, { useMemo } from "react";
import { View } from "react-native";
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

export default function AircraftLogGroups({
  records = [],
  loading = false,
  query = "",
  onQueryChange,
  onSelect,
  emptyText = "No logs found yet.",
  sortBy = "rpc",
}) {
  const groups = useMemo(
    () =>
      groupAircraftLogs(records, sortBy).filter((group) =>
        matchesSearch(query, [group.rpc, group.aircraftType, group.base]),
      ),
    [records, query, sortBy],
  );

  return (
    <View>
      <SearchBar
        value={query}
        onChangeText={onQueryChange}
        placeholder="Search aircraft or base"
      />
      <SectionTitle
        title="Aircraft"
        subtitle="Select an aircraft to view and filter its logs."
      />
      {loading ? (
        <LoadingState text="Loading aircraft logs..." />
      ) : groups.length === 0 ? (
        <EmptyState
          text={query.trim() ? "No aircraft match your search." : emptyText}
        />
      ) : (
        groups.map((group) => (
          <InfoCard
            key={group.rpc}
            title={group.rpc}
            subtitle="View aircraft logs"
            right={
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <StatusChip label={`${group.count} ${group.count === 1 ? "log" : "logs"}`} />
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
              <FieldRow label="Aircraft type" value={group.aircraftType || "N/A"} />
              <FieldRow label="Base" value={group.base || "N/A"} />
              {sortBy === "latestActivity" ? (
                <FieldRow label="Last updated" value={formatDateTime(group.latestActivity)} />
              ) : (
                <FieldRow label="Latest log" value={formatDate(group.latestDate)} />
              )}
            </View>
          </InfoCard>
        ))
      )}
    </View>
  );
}
