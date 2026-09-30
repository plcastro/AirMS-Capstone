import React, { useMemo } from "react";
import { FlatList, TouchableOpacity, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AppText from "./AppText";
import {
  EmptyState,
  LoadingState,
  SearchBar,
} from "./MobileModule";
import { COLORS } from "../../stylesheets/colors";
import { formatDate, formatDateTime } from "../../utilities/mobileApi";
import { matchesSearch } from "../../utilities/search";
import {
  getLogAircraftRegistration,
  groupAircraftLogs,
} from "../../../shared/aircraftLogGroups";
import { incomingFlightLogHandoff } from "../../../shared/flightWorkflow";
import { unviewedAircraftCounts } from "../../../shared/viewedLogs";
import NewLogBadge, { IncomingLogBadge } from "./NewLogBadge";

function AircraftMetaField({ label, value }) {
  return (
    <View style={{ flex: 1, minWidth: "45%" }}>
      <AppText style={{ fontSize: 10, color: COLORS.grayDark, textTransform: "uppercase", fontWeight: "600" }}>
        {label}
      </AppText>
      <AppText style={{ fontSize: 12, color: COLORS.black, fontWeight: "600", marginTop: 2 }}>
        {value}
      </AppText>
    </View>
  );
}

function AircraftCard({ group, sortBy, newCount, handoff, largeTitle, onPress }) {
  return (
    <TouchableOpacity
      activeOpacity={0.82}
      onPress={onPress}
      style={{
        flexDirection: "row",
        backgroundColor: COLORS.white,
        borderRadius: 10,
        marginBottom: 10,
        elevation: 2,
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 3,
        overflow: "hidden",
      }}
    >
      <View style={{ width: 5, backgroundColor: COLORS.primaryLight }} />
      <View style={{ flex: 1, padding: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: `${COLORS.primaryLight}1A`,
              alignItems: "center",
              justifyContent: "center",
              marginRight: 10,
            }}
          >
            <MaterialCommunityIcons name="helicopter" size={18} color={COLORS.primaryLight} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText style={{ fontSize: largeTitle ? 16 : 14, fontWeight: "700", color: COLORS.black }}>
              {group.rpc}
            </AppText>
            {newCount > 0 && <NewLogBadge count={newCount} />}
          </View>
          <View
            style={{
              backgroundColor: `${COLORS.primaryLight}1A`,
              borderRadius: 999,
              paddingHorizontal: 10,
              paddingVertical: 4,
              marginRight: 8,
            }}
          >
            <AppText style={{ fontSize: 11, fontWeight: "700", color: COLORS.primaryLight }}>
              {group.count} {group.count === 1 ? "log" : "logs"}
            </AppText>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={22} color={COLORS.grayDark} />
        </View>

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
          <AircraftMetaField label="Aircraft type" value={group.aircraftType || "N/A"} />
          <AircraftMetaField label="Base" value={group.base || "N/A"} />
        </View>

        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <MaterialCommunityIcons name="clock-outline" size={13} color={COLORS.grayDark} />
          <AppText style={{ fontSize: 11, color: COLORS.grayDark, marginLeft: 4 }}>
            {sortBy === "latestActivity"
              ? `Updated ${formatDateTime(group.latestActivity)}`
              : `Latest log: ${formatDate(group.latestDate)}`}
          </AppText>
        </View>
        {handoff && <IncomingLogBadge {...handoff} />}
      </View>
    </TouchableOpacity>
  );
}

export default function AircraftLogGroups({
  records = [],
  loading = false,
  query = "",
  onQueryChange,
  onSelect,
  emptyText = "No logs found yet.",
  sortBy = "rpc",
  searchFilters = null,
  isNew,
  showFlightHandoff = false,
  ...listProps
}) {
  const newCounts = useMemo(() => unviewedAircraftCounts(records, isNew), [records, isNew]);
  const handoffs = useMemo(() => {
    if (!showFlightHandoff) return new Map();
    const byAircraft = new Map();
    records.forEach((record) => {
      const rpc = getLogAircraftRegistration(record);
      byAircraft.set(rpc, [...(byAircraft.get(rpc) || []), record]);
    });
    return new Map(
      [...byAircraft].map(([rpc, logs]) => [rpc, incomingFlightLogHandoff(logs)]),
    );
  }, [records, showFlightHandoff]);
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
        containerStyle={{ marginBottom: 6 }}
      />
      <AppText style={{ fontSize: 12, color: COLORS.grayDark, marginBottom: 10 }}>
        Select an aircraft to view and filter its logs.
      </AppText>
      {searchFilters}
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
          <AircraftCard
            key={group.rpc}
            group={group}
            sortBy={sortBy}
            newCount={newCounts.get(group.rpc) || 0}
            handoff={handoffs.get(group.rpc)}
            largeTitle={showFlightHandoff}
            onPress={() => onSelect(group.rpc)}
          />
        )}
      />
    </View>
  );
}
