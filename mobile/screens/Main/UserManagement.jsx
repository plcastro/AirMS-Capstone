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
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useNavigation, useRoute } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { AuthContext } from "../../Context/AuthContext";
import { API_BASE } from "../../utilities/API_BASE";
import { COLORS } from "../../stylesheets/colors";
import { showToast } from "../../utilities/toast";
import { confirmAction } from "../../utilities/confirmAction";
import UserStatsRow from "../../components/UserManagement/UserStatsRow";
import UserCard from "../../components/UserManagement/UserCard";
import UserFormModal from "../../components/UserManagement/UserFormModal";
import { SearchBar } from "../../components/common/MobileModule";
import { JOB_TITLE_OPTIONS } from "../../components/UserManagement/constants";
import { matchesSearch } from "../../utilities/search";

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
  const [accessFilter, setAccessFilter] = useState("all");
  const [openFilter, setOpenFilter] = useState(null);
  const [formVisible, setFormVisible] = useState(false);
  const [userToEdit, setUserToEdit] = useState(null);
  const [savingUser, setSavingUser] = useState(false);
  const [inviteActionLoadingByUser, setInviteActionLoadingByUser] = useState(
    {},
  );

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

      const now = Date.now();
      const mapped = Array.isArray(json.data)
        ? json.data.map((u) => ({
            ...u,
            invitationStatus:
              u.invitationStatus ||
              (String(u.status || "").toLowerCase() === "active"
                ? "claimed"
                : u.tempPasswordExpires &&
                    new Date(u.tempPasswordExpires).getTime() < now
                  ? "expired"
                  : "pending"),
            invitationExpiresAt:
              u.invitationExpiresAt || u.tempPasswordExpires || null,
          }))
        : [];
      setUsers(mapped);
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
            "x-action-confirmed": "true",
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

  const runInviteAction = async (endpoint, method = "PUT", payload = null) => {
    const token = await AsyncStorage.getItem("currentUserToken");
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        "x-action-confirmed": "true",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        ...(payload || {}),
        confirmAction: true,
      }),
    });

    const json = await parseJsonResponse(response, "Invalid invite response.");
    if (!response.ok) throw new Error(json?.message || "Invite action failed");
    return json;
  };
  const withInviteActionLoading = async (userId, work) => {
    const key = String(userId || "");
    setInviteActionLoadingByUser((prev) => ({ ...prev, [key]: true }));
    try {
      await work();
    } finally {
      setInviteActionLoadingByUser((prev) => ({ ...prev, [key]: false }));
    }
  };

  const handleResendInvite = async (targetUser) => {
    const confirmed = await confirmAction({
      title: "Resend Activation Invite",
      message: `Resend activation email to ${targetUser?.email || "this user"}?`,
      confirmText: "Resend",
    });
    if (!confirmed) return;

    try {
      await withInviteActionLoading(targetUser?._id, async () => {
        await runInviteAction(
          `/api/user/resend-activation/${targetUser._id}`,
          "POST",
        );
      });
      showToast(`Activation email resent to ${targetUser?.email || "user"}.`);
      fetchUsers({ silent: true });
    } catch (error) {
      showToast(error.message);
    }
  };

  const handleExtendInvite = async (targetUser) => {
    const confirmed = await confirmAction({
      title: "Extend Invitation",
      message: `Extend invitation expiry for ${targetUser?.email || "this user"} by 24 hours?`,
      confirmText: "Extend",
    });
    if (!confirmed) return;

    try {
      await withInviteActionLoading(targetUser?._id, async () => {
        await runInviteAction(
          `/api/user/extend-invitation-expiry/${targetUser._id}`,
          "PUT",
          { hours: 24 },
        );
      });
      showToast("Invitation expiry extended by 24 hours.");
      fetchUsers({ silent: true });
    } catch (error) {
      showToast(error.message);
    }
  };

  const handleRevokeInvite = async (targetUser) => {
    const confirmed = await confirmAction({
      title: "Revoke Invitation",
      message: `Revoke invitation for ${targetUser?.email || "this user"}?`,
      confirmText: "Revoke",
      destructive: true,
    });
    if (!confirmed) return;

    try {
      await withInviteActionLoading(targetUser?._id, async () => {
        await runInviteAction(
          `/api/user/revoke-invitation/${targetUser._id}`,
          "PUT",
        );
      });
      showToast("Invitation revoked.");
      fetchUsers({ silent: true });
    } catch (error) {
      showToast(error.message);
    }
  };

  const handleUnlockUser = async (targetUser) => {
    const confirmed = await confirmAction({
      title: "Unlock User",
      message: `Unlock ${targetUser?.username || targetUser?.firstName || "this user"}? They will be able to try logging in again.`,
      confirmText: "Unlock",
    });
    if (!confirmed) return;

    try {
      await withInviteActionLoading(targetUser?._id, async () => {
        await runInviteAction(`/api/user/unlock-user/${targetUser._id}`, "PUT");
      });
      showToast("User unlocked. They can log in again.");
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

      const isMultipart = Boolean(payload?.__multipart);
      const requestPayload = { ...payload };
      delete requestPayload.__multipart;
      const response = await fetch(
        isEdit
          ? `${API_BASE}/api/user/update-user/${userToEdit?._id}`
          : `${API_BASE}/api/user/create`,
        {
          method: isEdit ? "PUT" : "POST",
          headers: isMultipart
            ? {
                "x-action-confirmed": "true",
                Authorization: `Bearer ${token}`,
              }
            : {
                "Content-Type": "application/json",
                "x-action-confirmed": "true",
                Authorization: `Bearer ${token}`,
              },
          body: isMultipart
            ? (() => {
                const formData = new FormData();
                Object.entries(requestPayload || {}).forEach(([key, value]) => {
                  if (value === undefined || value === null || value === "")
                    return;
                  formData.append(key, value);
                });
                formData.append("confirmAction", "true");
                return formData;
              })()
            : JSON.stringify({
                ...requestPayload,
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
    if (accessFilter !== "all") {
      next = next.filter(
        (u) =>
          String(u.access || "")
            .trim()
            .toLowerCase() === accessFilter,
      );
    }
    return next.filter((u) => matchesSearch(searchQuery, u));
  }, [accessFilter, jobTitleFilter, searchQuery, statusFilter, users]);

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
    const merged = Array.from(
      new Set([...JOB_TITLE_OPTIONS, ...dynamicTitles]),
    );
    return ["all", ...merged];
  }, [users]);

  const accessOptions = useMemo(() => {
    const dynamicAccess = users
      .map((u) => String(u.access || "").trim())
      .filter(Boolean);
    const merged = Array.from(
      new Set(["Superadmin", "Superuser", "User", ...dynamicAccess]),
    );
    return ["all", ...merged];
  }, [users]);

  const roleFilterOptions = useMemo(
    () =>
      jobTitleOptions.map((option) => ({
        value: String(option).toLowerCase(),
        label: option === "all" ? "All Roles" : String(option),
      })),
    [jobTitleOptions],
  );

  const accessFilterOptions = useMemo(
    () =>
      accessOptions.map((option) => ({
        value: String(option).toLowerCase(),
        label: option === "all" ? "All Access" : String(option),
      })),
    [accessOptions],
  );

  const roleFilterLabel =
    roleFilterOptions.find((option) => option.value === jobTitleFilter)
      ?.label || "All Roles";
  const accessFilterLabel =
    accessFilterOptions.find((option) => option.value === accessFilter)
      ?.label || "All Access";

  const toggleFilter = (filterKey) => {
    setOpenFilter((current) => (current === filterKey ? null : filterKey));
  };

  const selectFilterValue = (setter, value) => {
    setter(value);
    setOpenFilter(null);
  };

  const renderFilterDropdown = ({
    filterKey,
    selectedLabel,
    options,
    onSelect,
  }) => {
    const isOpen = openFilter === filterKey;

    return (
      <View
        style={[
          ui.filterDropdownWrap,
          isOpen ? ui.filterDropdownWrapOpen : null,
        ]}
      >
        <TouchableOpacity
          style={ui.unifiedFilterButton}
          activeOpacity={0.82}
          onPress={() => toggleFilter(filterKey)}
        >
          <MaterialCommunityIcons
            name="tune"
            size={16}
            color={COLORS.primaryLight}
            style={{ marginRight: 6 }}
          />
          <AppText style={ui.unifiedFilterButtonText} numberOfLines={1}>
            {selectedLabel}
          </AppText>
          <MaterialCommunityIcons
            name={isOpen ? "chevron-up" : "chevron-down"}
            size={22}
            color={COLORS.grayDark}
          />
        </TouchableOpacity>

        {isOpen && (
          <View style={ui.unifiedDropdownMenu}>
            <ScrollView nestedScrollEnabled>
              {options.map((option, index) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    ui.unifiedDropdownItem,
                    index < options.length - 1
                      ? ui.unifiedDropdownItemBordered
                      : null,
                  ]}
                  onPress={() => onSelect(option.value)}
                >
                  <AppText style={ui.unifiedDropdownItemText} numberOfLines={2}>
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

      <View style={ui.searchFilterRow}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search users"
          containerStyle={ui.searchControl}
        />
      </View>

      <View style={ui.filterControlsRow}>
        {renderFilterDropdown({
          filterKey: "role",
          selectedLabel: roleFilterLabel,
          options: roleFilterOptions,
          onSelect: (value) => selectFilterValue(setJobTitleFilter, value),
        })}
        {renderFilterDropdown({
          filterKey: "access",
          selectedLabel: accessFilterLabel,
          options: accessFilterOptions,
          onSelect: (value) => selectFilterValue(setAccessFilter, value),
        })}
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
            <AppText style={{ color: COLORS.grayDark }}>
              No users matched your criteria
            </AppText>
          </View>
        ) : (
          filteredUsers.map((item) => (
            <UserCard
              key={String(item._id)}
              item={item}
              isCurrentUser={String(item._id) === String(currentUserId)}
              onEdit={openEditModal}
              onToggleStatus={runStatusAction}
              onResendInvite={handleResendInvite}
              onExtendInvite={handleExtendInvite}
              onRevokeInvite={handleRevokeInvite}
              onUnlockUser={handleUnlockUser}
              inviteActionLoading={Boolean(
                inviteActionLoadingByUser[String(item._id)],
              )}
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
        currentUserId={currentUserId}
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
  searchFilterRow: {
    marginBottom: 10,
    zIndex: 20,
  },
  searchControl: {
    height: 48,
    marginBottom: 0,
  },
  filterControlsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
    zIndex: 30,
  },
  filterDropdownWrap: {
    flex: 1,
    minWidth: 0,
  },
  filterDropdownWrapOpen: {
    zIndex: 1000,
    elevation: 6,
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
  emptyState: { alignItems: "center", marginTop: 50, gap: 10 },
});
