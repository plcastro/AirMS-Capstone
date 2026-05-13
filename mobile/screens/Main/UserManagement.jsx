import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  StyleSheet,
  Image,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { AuthContext } from "../../Context/AuthContext";
import { API_BASE } from "../../utilities/API_BASE";
import { COLORS } from "../../stylesheets/colors";
import { showToast } from "../../utilities/toast";
import defaultAvatar from "../../assets/images/default_avatar.jpg";
const STATUS_OPTIONS = ["all", "active", "inactive", "deactivated"];

const maskEmail = (email) => {
  if (!email) return "";
  const [name, domain] = String(email).split("@");
  if (!name || !domain) return email;
  return `${name.slice(0, 2)}${"*".repeat(Math.max(name.length - 2, 0))}@${domain}`;
};

// Helper for User Avatar Initials
const getInitials = (firstName, lastName) => {
  return (
    `${(firstName || "").charAt(0)}${(lastName || "").charAt(0)}`.toUpperCase() ||
    "?"
  );
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
          Authorization: `Bearer ${token}`,
        },
      });

      const json = await response.json();
      if (!response.ok)
        throw new Error(json?.message || "Failed to load users");

      setUsers(Array.isArray(json.data) ? json.data : []);
    } catch (error) {
      showToast(error.message);
    } finally {
      setLoading(false);
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
    if (String(targetUser._id) === String(currentUserId)) {
      showToast("You cannot change your own status.");
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
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status }),
        },
      );

      if (!response.ok) throw new Error("Update failed");

      showToast(`User ${status === "active" ? "reactivated" : "deactivated"}.`);
      fetchUsers({ silent: true });
    } catch (error) {
      showToast(error.message);
    }
  };

  const filteredUsers = useMemo(() => {
    let next = [...users];
    if (statusFilter !== "all") {
      next = next.filter(
        (u) => String(u.status || "").toLowerCase() === statusFilter,
      );
    }
    const query = searchQuery.trim().toLowerCase();
    if (!query) return next;

    return next.filter((u) =>
      `${u.firstName} ${u.lastName} ${u.username} ${u.email}`
        .toLowerCase()
        .includes(query),
    );
  }, [searchQuery, statusFilter, users]);

  const counts = useMemo(() => {
    const base = {
      total: users.length,
      active: 0,
      inactive: 0,
      deactivated: 0,
    };
    users.forEach((u) => {
      const s = String(u.status || "").toLowerCase();
      if (base[s] !== undefined) base[s]++;
    });
    return base;
  }, [users]);

  if (loading) {
    return (
      <View style={ui.center}>
        <ActivityIndicator color={COLORS.primaryLight} size="large" />
      </View>
    );
  }

  return (
    <View style={ui.container}>
      {/* Stats Section */}
      <View style={ui.statsRow}>
        {[
          { label: "Total", value: counts.total, icon: "account-group" },
          { label: "Active", value: counts.active, icon: "account-check" },
          { label: "Inactive", value: counts.inactive, icon: "account-clock" },
          {
            label: "Deactivated",
            value: counts.deactivated,
            icon: "account-off",
          },
        ].map((item) => (
          <View key={item.label} style={ui.statCard}>
            <Text style={ui.statLabel}>{item.label}</Text>
            <Text style={ui.statValue}>{item.value}</Text>
          </View>
        ))}
      </View>

      {/* Search & Filters */}
      <View style={ui.searchBar}>
        <MaterialCommunityIcons
          name="magnify"
          size={20}
          color={COLORS.grayDark}
        />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search name, email, or role..."
          placeholderTextColor={COLORS.grayDark}
          style={ui.searchInput}
        />
      </View>

      <View style={{ height: 55 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={ui.filterScroll}
        >
          {STATUS_OPTIONS.map((option) => {
            const selected = statusFilter === option;
            return (
              <TouchableOpacity
                key={option}
                onPress={() => setStatusFilter(option)}
                style={[ui.filterBtn, selected && ui.filterBtnActive]}
              >
                <Text style={[ui.filterText, selected && ui.filterTextActive]}>
                  {option.toUpperCase()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchUsers({ silent: true })}
          />
        }
      >
        {filteredUsers.length === 0 ? (
          <View style={ui.emptyState}>
            <MaterialCommunityIcons
              name="account-search-outline"
              size={60}
              color={COLORS.grayMedium}
            />
            <Text style={{ color: COLORS.grayDark }}>
              No users matched your criteria
            </Text>
          </View>
        ) : (
          filteredUsers.map((item) => {
            const status = String(item.status || "inactive").toLowerCase();
            const isActive = status === "active";

            return (
              <View key={String(item._id)} style={ui.userCard}>
                <View style={ui.cardHeader}>
                  <View style={ui.avatar}>
                    {item.image ? (
                      <Image
                        source={
                          item?.image ? { uri: item.image } : defaultAvatar
                        }
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 20,
                        }}
                      />
                    ) : (
                      <Text style={ui.avatarText}>
                        {getInitials(item.firstName, item.lastName)}
                      </Text>
                    )}
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={ui.userName}>
                      {`${item.firstName || ""} ${item.lastName || ""}`.trim() ||
                        "New User"}
                    </Text>
                    <Text style={ui.userMeta}>
                      @{item.username} • {item.access}
                    </Text>
                  </View>
                  <View
                    style={[
                      ui.badge,
                      { backgroundColor: isActive ? "#E8F5E9" : "#FFEBEE" },
                    ]}
                  >
                    <Text
                      style={[
                        ui.badgeText,
                        { color: isActive ? "#2E7D32" : "#C62828" },
                      ]}
                    >
                      {status}
                    </Text>
                  </View>
                </View>

                <View style={ui.cardBody}>
                  <View style={ui.infoRow}>
                    <MaterialCommunityIcons
                      name="email-outline"
                      size={14}
                      color={COLORS.grayDark}
                    />
                    <Text style={ui.infoText}>{maskEmail(item.email)}</Text>
                  </View>
                  <View style={ui.infoRow}>
                    <MaterialCommunityIcons
                      name="briefcase-outline"
                      size={14}
                      color={COLORS.grayDark}
                    />
                    <Text style={ui.infoText}>
                      {item.jobTitle || "No Title Set"}
                    </Text>
                  </View>
                </View>

                <View style={ui.cardActions}>
                  <TouchableOpacity
                    onPress={() =>
                      runStatusAction(item, isActive ? "deactivated" : "active")
                    }
                    style={[
                      ui.actionBtn,
                      isActive ? ui.btnDanger : ui.btnSuccess,
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={isActive ? "account-remove" : "account-check"}
                      size={16}
                      color="white"
                    />
                    <Text style={ui.actionBtnText}>
                      {isActive ? " Deactivate" : " Reactivate"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const ui = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7F8", padding: 12 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  statCard: {
    backgroundColor: COLORS.white,
    padding: 10,
    borderRadius: 10,
    width: "23%",
    elevation: 2,
    alignItems: "center",
  },
  statLabel: { fontSize: 10, color: COLORS.grayDark, marginBottom: 4 },
  statValue: { fontSize: 16, fontWeight: "bold" },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 45,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    marginBottom: 10,
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14 },
  filterScroll: { gap: 8, paddingVertical: 5 },
  filterBtn: {
    paddingHorizontal: 16,
    height: 36,
    justifyContent: "center",
    borderRadius: 20,
    backgroundColor: COLORS.white,
    borderSize: 1,
    borderColor: "#DDD",
  },
  filterBtnActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primaryLight,
  },
  filterText: { fontSize: 12, fontWeight: "600", color: COLORS.grayDark },
  filterTextActive: { color: COLORS.white },
  userCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  avatar: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: "#F0F2F5",
    justifyContent: "center",
    alignItems: "center",
    borderSize: 1,
    borderColor: "#E0E0E0",
  },
  avatarText: { fontWeight: "bold", color: COLORS.primaryLight, fontSize: 16 },
  userName: { fontSize: 16, fontWeight: "700", color: "#1A1A1A" },
  userMeta: { fontSize: 12, color: COLORS.grayDark },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 10, fontWeight: "bold", textTransform: "uppercase" },
  cardBody: {
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    paddingTop: 10,
    gap: 5,
  },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  infoText: { fontSize: 13, color: "#444" },
  cardActions: {
    marginTop: 15,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  btnDanger: { backgroundColor: "#FF5252" },
  btnSuccess: { backgroundColor: "#4CAF50" },
  actionBtnText: { color: "white", fontWeight: "bold", fontSize: 12 },
  emptyState: { alignItems: "center", marginTop: 50, gap: 10 },
});
