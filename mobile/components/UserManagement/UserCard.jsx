import React from "react";
import AppText from "../common/AppText";
import {
  Image,
  StyleSheet,
  View
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import ActionIconButton from "../common/ActionIconButton";
import { COLORS } from "../../stylesheets/colors";
import { getUserAvatarSource, getUserImageUri } from "../../utilities/avatar";

const maskEmail = (email) => {
  if (!email) return "";
  const [name, domain] = String(email).split("@");
  if (!name || !domain) return email;
  return `${name.slice(0, 2)}${"*".repeat(Math.max(name.length - 2, 0))}@${domain}`;
};

const getInitials = (firstName, lastName) =>
  `${(firstName || "").charAt(0)}${(lastName || "").charAt(0)}`.toUpperCase() || "?";

export default function UserCard({
  item,
  isCurrentUser,
  onEdit,
  onToggleStatus,
  onResendInvite,
  onExtendInvite,
  onRevokeInvite,
  inviteActionLoading,
}) {
  const status = String(item.status || "inactive").toLowerCase();
  const isActive = status === "active";
  const invitationStatus = String(item.invitationStatus || "").toLowerCase();
  const canShowInviteActions = status === "inactive";
  const inviteExpiryDate = item?.invitationExpiresAt
    ? new Date(item.invitationExpiresAt)
    : null;
  const inviteExpired =
    inviteExpiryDate && !Number.isNaN(inviteExpiryDate.getTime())
      ? inviteExpiryDate.getTime() < Date.now()
      : false;
  const inviteStatusLabel = invitationStatus || (inviteExpired ? "expired" : "pending");
  const inviteStatusTone =
    inviteStatusLabel === "claimed"
      ? { bg: "#E7F7ED", text: "#157A38" }
      : inviteStatusLabel === "expired"
        ? { bg: "#FDEAEA", text: "#B42318" }
        : inviteStatusLabel === "revoked"
          ? { bg: "#F5F5F5", text: "#374151" }
          : { bg: "#FFF4E5", text: "#9A3412" };
  const formatExpiry = (value) => {
    if (!value) return "N/A";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "N/A";
    return parsed.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <View style={styles.userCard}>
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          {getUserImageUri(item?.image) ? (
            <Image source={getUserAvatarSource(item?.image)} style={styles.avatarImage} />
          ) : (
            <AppText style={styles.avatarText}>{getInitials(item.firstName, item.lastName)}</AppText>
          )}
        </View>
        <View style={styles.mainInfo}>
          <AppText style={styles.userName}>
            {`${item.firstName || ""} ${item.lastName || ""}`.trim() || "New User"}
          </AppText>
          <AppText style={styles.userMeta}>@{item.username} | {item.access}</AppText>
        </View>
        <View style={[styles.badge, { backgroundColor: isActive ? "#E8F5E9" : "#FFEBEE" }]}>
          <AppText style={[styles.badgeText, { color: isActive ? "#2E7D32" : "#C62828" }]}>{status}</AppText>
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.infoRow}>
          <MaterialCommunityIcons name="email-outline" size={14} color={COLORS.grayDark} />
          <AppText style={styles.infoText}>{maskEmail(item.email)}</AppText>
        </View>
        <View style={styles.infoRow}>
          <MaterialCommunityIcons name="briefcase-outline" size={14} color={COLORS.grayDark} />
          <AppText style={styles.infoText}>{item.jobTitle || "No Title Set"}</AppText>
        </View>
        {canShowInviteActions && (
          <View style={styles.inviteMetaWrap}>
            <View style={[styles.inviteBadge, { backgroundColor: inviteStatusTone.bg }]}>
              <AppText style={[styles.inviteBadgeText, { color: inviteStatusTone.text }]}>
                INVITE: {inviteStatusLabel.toUpperCase()}
              </AppText>
            </View>
            <AppText style={styles.inviteExpiryText}>
              Expires: {formatExpiry(item?.invitationExpiresAt)}
            </AppText>
          </View>
        )}
      </View>

      <View style={styles.cardActions}>
        <ActionIconButton
          icon="account-edit-outline"
          tooltip="Edit"
          onPress={() => onEdit(item)}
          color="white"
          backgroundColor="#1565C0"
          borderColor="#1565C0"
        />
        <ActionIconButton
          icon={isActive ? "account-remove" : "account-check"}
          tooltip={isActive ? "Deactivate" : "Reactivate"}
          onPress={() => onToggleStatus(item, isActive ? "deactivated" : "active")}
          disabled={isCurrentUser}
          color="white"
          backgroundColor={isActive ? "#FF5252" : "#4CAF50"}
          borderColor={isActive ? "#FF5252" : "#4CAF50"}
        />
      </View>

      {canShowInviteActions && (
        <View style={styles.inviteActions}>
          {(invitationStatus === "pending" || invitationStatus === "expired") && (
            <>
              <ActionIconButton
                icon="email-send-outline"
                tooltip={inviteActionLoading ? "Working..." : "Resend"}
                onPress={() => onResendInvite?.(item)}
                disabled={inviteActionLoading}
                color="white"
                backgroundColor="#1976D2"
                borderColor="#1976D2"
              />
              <ActionIconButton
                icon="clock-plus-outline"
                tooltip="Extend 24h"
                onPress={() => onExtendInvite?.(item)}
                disabled={inviteActionLoading}
                color="white"
                backgroundColor="#D97706"
                borderColor="#D97706"
              />
            </>
          )}
          {invitationStatus !== "revoked" && (
            <ActionIconButton
              icon="email-remove-outline"
              tooltip="Revoke"
              onPress={() => onRevokeInvite?.(item)}
              disabled={inviteActionLoading}
              color="white"
              backgroundColor="#B91C1C"
              borderColor="#B91C1C"
            />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  avatarImage: { width: 40, height: 40, borderRadius: 20 },
  avatarText: { fontWeight: "bold", color: COLORS.primaryLight, fontSize: 16 },
  mainInfo: { flex: 1, marginLeft: 12 },
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
  inviteMetaWrap: { marginTop: 6, gap: 4 },
  inviteBadge: { alignSelf: "flex-start", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  inviteBadgeText: { fontSize: 10, fontWeight: "700" },
  inviteExpiryText: { fontSize: 11, color: COLORS.grayDark },
  cardActions: {
    marginTop: 15,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
  inviteActions: {
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    flexWrap: "wrap",
  },
});
