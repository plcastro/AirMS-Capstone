import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
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
import { AuthContext } from "../../Context/AuthContext";
import { API_BASE } from "../../utilities/API_BASE";
import { COLORS } from "../../stylesheets/colors";
import { showToast } from "../../utilities/toast";

const STATUS_OPTIONS = ["all", "active", "inactive", "deactivated"];

const maskEmail = (email) => {
  if (!email) return "";
  const [name, domain] = String(email).split("@");
  if (!name || !domain) return email;
  const visible = name.slice(0, 2);
  return `${visible}${"*".repeat(Math.max(name.length - 2, 0))}@${domain}`;
};

export default function UserManagement() {
  const { user } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const currentUserId = user?.id || user?._id || "";

  const fetchUsers = useCallback(async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true);
      const token = await AsyncStorage.getItem("currentUserToken");
      const response = await fetch(`${API_BASE}/api/user/get-all-users`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(json?.message || "Failed to load users");
      }

      setUsers(Array.isArray(json.data) ? json.data : []);
    } catch (error) {
      console.error("User list fetch error:", error);
      showToast(error.message || "Failed to load users");
    } finally {
      if (!silent) setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useFocusEffect(
    useCallback(() => {
      fetchUsers({ silent: true });
    }, [fetchUsers]),
  );

  const runStatusAction = async (targetUser, status) => {
    if (!targetUser?._id) return;
    if (String(targetUser._id) === String(currentUserId)) {
      showToast("You cannot change your own status here.");
      return;
    }

    try {
      const token = await AsyncStorage.getItem("currentUserToken");
      const response = await fetch(
        `${API_BASE}/api/user/update-user-status/${targetUser._id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ status }),
        },
      );

      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(json?.message || "Status update failed");
      }

      showToast(`User ${status === "active" ? "reactivated" : "deactivated"}.`);
      fetchUsers({ silent: true });
    } catch (error) {
      console.error("Status action error:", error);
      showToast(error.message || "Status update failed");
    }
  };

  const filteredUsers = useMemo(() => {
    let next = [...users];
    if (statusFilter !== "all") {
      next = next.filter(
        (item) => String(item.status || "").toLowerCase() === statusFilter,
      );
    }

    const query = searchQuery.trim().toLowerCase();
    if (!query) return next;

    return next.filter((item) =>
      [
        `${item.firstName || ""} ${item.lastName || ""}`,
        item.username,
        item.email,
        item.jobTitle,
        item.access,
        item.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [searchQuery, statusFilter, users]);

  const counts = useMemo(() => {
    const base = { total: users.length, active: 0, inactive: 0, deactivated: 0 };
    users.forEach((item) => {
      const status = String(item.status || "").toLowerCase();
      if (base[status] !== undefined) base[status] += 1;
    });
    return base;
  }, [users]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={COLORS.primaryLight} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.grayLight, padding: 10 }}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
        {[
          { label: "Total", value: counts.total },
          { label: "Active", value: counts.active },
          { label: "Inactive", value: counts.inactive },
          { label: "Deactivated", value: counts.deactivated },
        ].map((item) => (
          <View key={item.label} style={{ backgroundColor: COLORS.white, borderRadius: 8, padding: 10, minWidth: "23%", borderWidth: 1, borderColor: COLORS.border }}>
            <Text style={{ color: COLORS.grayDark, fontSize: 11 }}>{item.label}</Text>
            <Text style={{ color: COLORS.black, fontSize: 16, fontWeight: "700" }}>{item.value}</Text>
          </View>
        ))}
      </View>

      <View style={{ flexDirection: "row", gap: 8, marginBottom: 10 }}>
        <View style={{ flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: COLORS.white, borderRadius: 8, paddingHorizontal: 10, borderWidth: 1, borderColor: COLORS.border }}>
          <MaterialCommunityIcons name="magnify" size={20} color={COLORS.grayDark} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search user"
            placeholderTextColor={COLORS.grayDark}
            style={{ flex: 1, color: COLORS.black, fontSize: 12, marginLeft: 6, height: 40 }}
          />
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
        <View style={{ flexDirection: "row", gap: 6 }}>
          {STATUS_OPTIONS.map((option) => {
            const selected = statusFilter === option;
            return (
              <TouchableOpacity
                key={option}
                onPress={() => setStatusFilter(option)}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 8,
                  borderRadius: 7,
                  borderWidth: 1,
                  borderColor: selected ? COLORS.primaryLight : COLORS.grayMedium,
                  backgroundColor: selected ? COLORS.primaryLight : COLORS.white,
                }}
              >
                <Text style={{ color: selected ? COLORS.white : COLORS.grayDark, fontSize: 12, fontWeight: "600" }}>
                  {option === "all" ? "All" : option[0].toUpperCase() + option.slice(1)}
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
              fetchUsers({ silent: true });
            }}
            colors={[COLORS.primaryLight]}
          />
        }
      >
        {filteredUsers.length === 0 ? (
          <View style={{ alignItems: "center", marginTop: 40 }}>
            <MaterialCommunityIcons name="account-search-outline" size={44} color={COLORS.grayMedium} />
            <Text style={{ marginTop: 8, color: COLORS.grayDark }}>No users found</Text>
          </View>
        ) : (
          filteredUsers.map((item) => {
            const status = String(item.status || "inactive").toLowerCase();
            const canReactivate = status === "deactivated";

            return (
              <View key={String(item._id)} style={{ backgroundColor: COLORS.white, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, marginBottom: 10, padding: 12 }}>
                <Text style={{ fontSize: 14, fontWeight: "700", color: COLORS.black }}>
                  {`${item.firstName || ""} ${item.lastName || ""}`.trim() || item.username || "Unknown"}
                </Text>
                <Text style={{ marginTop: 2, fontSize: 12, color: COLORS.grayDark }}>
                  @{item.username || "-"}
                </Text>
                <Text style={{ marginTop: 2, fontSize: 12, color: COLORS.grayDark }}>
                  {maskEmail(item.email || "-")}
                </Text>
                <Text style={{ marginTop: 2, fontSize: 12, color: COLORS.grayDark }}>
                  {item.jobTitle || "N/A"} · {item.access || "N/A"}
                </Text>
                <Text style={{ marginTop: 2, fontSize: 12, color: status === "active" ? "#1D7A3B" : status === "deactivated" ? COLORS.dangerBorder : "#A46A00" }}>
                  {status.toUpperCase()}
                </Text>

                <View style={{ flexDirection: "row", justifyContent: "flex-end", marginTop: 8 }}>
                  {canReactivate ? (
                    <TouchableOpacity
                      onPress={() => runStatusAction(item, "active")}
                      style={{ backgroundColor: COLORS.primaryLight, borderRadius: 7, paddingHorizontal: 10, paddingVertical: 7 }}
                    >
                      <Text style={{ color: COLORS.white, fontSize: 12, fontWeight: "700" }}>Reactivate</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      onPress={() => runStatusAction(item, "deactivated")}
                      style={{ backgroundColor: COLORS.dangerBorder, borderRadius: 7, paddingHorizontal: 10, paddingVertical: 7 }}
                    >
                      <Text style={{ color: COLORS.white, fontSize: 12, fontWeight: "700" }}>Deactivate</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}
