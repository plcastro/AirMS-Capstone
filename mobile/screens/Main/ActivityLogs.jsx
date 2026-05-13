import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
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

export default function ActivityLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionType, setActionType] = useState("all");

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

    const query = searchQuery.trim().toLowerCase();
    if (!query) return next;

    return next.filter((item) =>
      [item.actionMade, item.username, item.dateTime]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [actionType, logs, searchQuery]);

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
    <View style={{ flex: 1, backgroundColor: COLORS.grayLight, padding: 10 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: COLORS.white,
          borderRadius: 8,
          paddingHorizontal: 10,
          borderWidth: 1,
          borderColor: COLORS.border,
          marginBottom: 10,
        }}
      >
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
          style={{
            flex: 1,
            color: COLORS.black,
            fontSize: 12,
            marginLeft: 6,
            height: 40,
          }}
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginBottom: 10 }}
      >
        <View style={{ flexDirection: "row", gap: 6 }}>
          {ACTION_TYPES.map((type) => {
            const selected = actionType === type;
            return (
              <TouchableOpacity
                key={type}
                onPress={() => setActionType(type)}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 8,
                  borderRadius: 7,
                  borderWidth: 1,
                  borderColor: selected
                    ? COLORS.primaryLight
                    : COLORS.grayMedium,
                  backgroundColor: selected
                    ? COLORS.primaryLight
                    : COLORS.white,
                }}
              >
                <Text
                  style={{
                    color: selected ? COLORS.white : COLORS.grayDark,
                    fontSize: 12,
                    fontWeight: "600",
                  }}
                >
                  {type === "all"
                    ? "All Actions"
                    : type[0].toUpperCase() + type.slice(1)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <ScrollView
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
          <View style={{ alignItems: "center", marginTop: 40 }}>
            <MaterialCommunityIcons
              name="history"
              size={44}
              color={COLORS.grayMedium}
            />
            <Text style={{ marginTop: 8, color: COLORS.grayDark }}>
              No logs found
            </Text>
          </View>
        ) : (
          filteredLogs.map((item) => (
            <View
              key={String(item._id)}
              style={{
                backgroundColor: COLORS.white,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: COLORS.border,
                marginBottom: 10,
                padding: 12,
              }}
            >
              <Text
                style={{ color: COLORS.black, fontSize: 13, fontWeight: "700" }}
              >
                {item.actionMade || "N/A"}
              </Text>
              <Text
                style={{ marginTop: 4, color: COLORS.grayDark, fontSize: 12 }}
              >
                User: {item.username || "Unknown"}
              </Text>
              <Text
                style={{ marginTop: 2, color: COLORS.grayDark, fontSize: 12 }}
              >
                {formatDisplayDate(item.dateTime)}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}
