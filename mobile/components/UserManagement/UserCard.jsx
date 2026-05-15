import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
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

export default function UserCard({ item, isCurrentUser, onEdit, onToggleStatus }) {
  const status = String(item.status || "inactive").toLowerCase();
  const isActive = status === "active";

  return (
    <View style={styles.userCard}>
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          {getUserImageUri(item?.image) ? (
            <Image source={getUserAvatarSource(item?.image)} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarText}>{getInitials(item.firstName, item.lastName)}</Text>
          )}
        </View>
        <View style={styles.mainInfo}>
          <Text style={styles.userName}>
            {`${item.firstName || ""} ${item.lastName || ""}`.trim() || "New User"}
          </Text>
          <Text style={styles.userMeta}>@{item.username} | {item.access}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: isActive ? "#E8F5E9" : "#FFEBEE" }]}>
          <Text style={[styles.badgeText, { color: isActive ? "#2E7D32" : "#C62828" }]}>{status}</Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.infoRow}>
          <MaterialCommunityIcons name="email-outline" size={14} color={COLORS.grayDark} />
          <Text style={styles.infoText}>{maskEmail(item.email)}</Text>
        </View>
        <View style={styles.infoRow}>
          <MaterialCommunityIcons name="briefcase-outline" size={14} color={COLORS.grayDark} />
          <Text style={styles.infoText}>{item.jobTitle || "No Title Set"}</Text>
        </View>
        <View style={styles.infoRow}>
          <MaterialCommunityIcons name="map-marker-outline" size={14} color={COLORS.grayDark} />
          <Text style={styles.infoText}>{item.base || "No Base Set"}</Text>
        </View>
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity onPress={() => onEdit(item)} style={[styles.actionBtn, styles.btnEdit]}>
          <MaterialCommunityIcons name="account-edit-outline" size={16} color="white" />
          <Text style={styles.actionBtnText}> Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => onToggleStatus(item, isActive ? "deactivated" : "active")}
          style={[styles.actionBtn, isActive ? styles.btnDanger : styles.btnSuccess, isCurrentUser && styles.btnDisabled]}
          disabled={isCurrentUser}
        >
          <MaterialCommunityIcons name={isActive ? "account-remove" : "account-check"} size={16} color="white" />
          <Text style={styles.actionBtnText}>{isActive ? " Deactivate" : " Reactivate"}</Text>
        </TouchableOpacity>
      </View>
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
  cardActions: {
    marginTop: 15,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  btnEdit: { backgroundColor: "#1565C0" },
  btnDanger: { backgroundColor: "#FF5252" },
  btnSuccess: { backgroundColor: "#4CAF50" },
  btnDisabled: { opacity: 0.5 },
  actionBtnText: { color: "white", fontWeight: "bold", fontSize: 12 },
});
