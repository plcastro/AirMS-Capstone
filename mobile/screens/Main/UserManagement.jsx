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
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useNavigation, useRoute } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Picker } from "@react-native-picker/picker";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { AuthContext } from "../../Context/AuthContext";
import { API_BASE } from "../../utilities/API_BASE";
import { COLORS } from "../../stylesheets/colors";
import { showToast } from "../../utilities/toast";
import { confirmAction } from "../../utilities/confirmAction";
import UserStatsRow from "../../components/UserManagement/UserStatsRow";
import UserCard from "../../components/UserManagement/UserCard";
import UserFormModal from "../../components/UserManagement/UserFormModal";
import { JOB_TITLE_OPTIONS } from "../../components/UserManagement/constants";

const parseJsonResponse = async (response, fallbackMessage) => {
  const raw = await response.text();
  let json = {};
  try {
    json = raw ? JSON.parse(raw) : {};
  } catch {
    throw new Error(fallbackMessage);
  }
  return json;
};

export default function UserManagement() {
  const { user } = useContext(AuthContext);
  const navigation = useNavigation();
  const route = useRoute();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [jobTitleFilter, setJobTitleFilter] = useState("all");
  const [formVisible, setFormVisible] = useState(false);
  const [userToEdit, setUserToEdit] = useState(null);
  const [savingUser, setSavingUser] = useState(false);

  const currentUserId = user?.id || user?._id || "";

  const fetchUsers = useCallback(async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true);
      const token = await AsyncStorage.getItem("currentUserToken");
      if (!token) throw new Error("Session not found. Please log in again.");
      const response = await fetch(`${API_BASE}/api/user/get-all-users`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const json = await parseJsonResponse(
        response,
        "Invalid server response while loading users.",
      );
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

    const confirmed = await confirmAction({
      title: `${status === "active" ? "Reactivate" : "Deactivate"} User`,
      message: `Are you sure you want to ${status === "active" ? "reactivate" : "deactivate"} ${targetUser.firstName || "this user"}?`,
      confirmText: status === "active" ? "Reactivate" : "Deactivate",
      destructive: status !== "active",
    });
    if (!confirmed) return;

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
          body: JSON.stringify({ status, confirmAction: true }),
        },
      );

      const json = await parseJsonResponse(
        response,
        "Invalid server response while updating status.",
      );
      if (!response.ok) throw new Error(json?.message || "Update failed");

      showToast(`User ${status === "active" ? "reactivated" : "deactivated"}.`);
      fetchUsers({ silent: true });
    } catch (error) {
      showToast(error.message);
    }
  };

  const openCreateModal = () => {
    setUserToEdit(null);
    setFormVisible(true);
  };

  useEffect(() => {
    if (route?.params?.fabAction === "addUser") {
      openCreateModal();
      navigation.setParams?.({ fabAction: undefined, at: undefined });
    }
  }, [navigation, route?.params?.at, route?.params?.fabAction]);

  const openEditModal = (selectedUser) => {
    setUserToEdit(selectedUser);
    setFormVisible(true);
  };

  const handleSubmitUser = async (payload, isEdit) => {
    const confirmed = await confirmAction({
      title: isEdit ? "Update User" : "Create User",
      message: isEdit
        ? "Save changes to this user account?"
        : "Create this user account now?",
      confirmText: isEdit ? "Save" : "Create",
    });
    if (!confirmed) return;

    try {
      setSavingUser(true);
      const token = await AsyncStorage.getItem("currentUserToken");

      const response = await fetch(
        isEdit
          ? `${API_BASE}/api/user/update-user/${userToEdit?._id}`
          : `${API_BASE}/api/user/create`,
        {
          method: isEdit ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            ...payload,
            confirmAction: true,
          }),
        },
      );

      const json = await parseJsonResponse(
        response,
        `Invalid server response while ${isEdit ? "updating" : "creating"} user.`,
      );
      if (!response.ok) {
        throw new Error(
          json?.message || `Failed to ${isEdit ? "update" : "create"} user`,
        );
      }

      showToast(
        isEdit ? "User updated successfully." : "User created successfully.",
      );
      setFormVisible(false);
      setUserToEdit(null);
      fetchUsers({ silent: true });
    } catch (error) {
      showToast(error.message);
    } finally {
      setSavingUser(false);
    }
  };

  const filteredUsers = useMemo(() => {
    let next = [...users];
    if (statusFilter !== "all") {
      next = next.filter(
        (u) => String(u.status || "").toLowerCase() === statusFilter,
      );
    }
    if (jobTitleFilter !== "all") {
      next = next.filter(
        (u) =>
          String(u.jobTitle || "")
            .trim()
            .toLowerCase() === jobTitleFilter,
      );
    }
    const query = searchQuery.trim().toLowerCase();
    if (!query) return next;

    return next.filter((u) =>
      `${u.firstName} ${u.lastName} ${u.username} ${u.email} ${u.jobTitle || ""} ${u.base || ""}`
        .toLowerCase()
        .includes(query),
    );
  }, [jobTitleFilter, searchQuery, statusFilter, users]);

  const counts = useMemo(() => {
    const base = {
      total: users.length,
      active: 0,
      inactive: 0,
      deactivated: 0,
    };
    users.forEach((u) => {
      const s = String(u.status || "").toLowerCase();
      if (base[s] !== undefined) base[s] += 1;
    });
    return base;
  }, [users]);

  const jobTitleOptions = useMemo(() => {
    const dynamicTitles = users
      .map((u) => String(u.jobTitle || "").trim())
      .filter(Boolean);
    const merged = Array.from(new Set([...JOB_TITLE_OPTIONS, ...dynamicTitles]));
    return ["all", ...merged];
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
      <UserStatsRow
        counts={counts}
        statusFilter={statusFilter}
        onStatusPress={setStatusFilter}
      />

      <View style={ui.searchBar}>
        <MaterialCommunityIcons
          name="magnify"
          size={20}
          color={COLORS.grayDark}
        />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search name, email, role, or base..."
          placeholderTextColor={COLORS.grayDark}
          style={ui.searchInput}
        />
      </View>

      <View style={ui.filterDropdownWrap}>
        <Picker selectedValue={jobTitleFilter} onValueChange={setJobTitleFilter}>
          {jobTitleOptions.map((option) => (
            <Picker.Item
              key={option}
              value={String(option).toLowerCase()}
              label={
                option === "all"
                  ? "All Roles / Job Titles"
                  : String(option)
              }
            />
          ))}
        </Picker>
      </View>

      <ScrollView
        contentContainerStyle={ui.listContent}
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
          filteredUsers.map((item) => (
            <UserCard
              key={String(item._id)}
              item={item}
              isCurrentUser={String(item._id) === String(currentUserId)}
              onEdit={openEditModal}
              onToggleStatus={runStatusAction}
            />
          ))
        )}
      </ScrollView>

      <UserFormModal
        visible={formVisible}
        onClose={() => {
          setFormVisible(false);
          setUserToEdit(null);
        }}
        onSubmit={handleSubmitUser}
        users={users}
        userToEdit={userToEdit}
        saving={savingUser}
      />

    </View>
  );
}

const ui = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7F8", padding: 12 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  pageTitle: { fontSize: 18, fontWeight: "700", color: "#1A1A1A" },
  listContent: { paddingBottom: 92 },
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
  filterDropdownWrap: {
    height: 50,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 10,
    marginBottom: 10,
    justifyContent: "center",
    overflow: "hidden",
  },
  emptyState: { alignItems: "center", marginTop: 50, gap: 10 },
});
