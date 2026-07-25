import React from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AppText from "./AppText";
import { COLORS } from "../../stylesheets/colors";

const privacySections = [
  {
    title: "Information We Collect",
    body: "AirMS may collect account profile details, login and session activity, assigned role and base, profile images, device or browser information, notification preferences, uploaded files, and maintenance workflow records created through the system.",
  },
  {
    title: "How Information Is Used",
    body: "Information is used to authenticate users, provide authorized access, maintain operational records, support inspections and approvals, send relevant notifications, protect accounts, troubleshoot issues, and support audit or compliance reviews.",
  },
  {
    title: "Maintenance and Audit Records",
    body: "AirMS stores activity logs, timestamps, signatures, approvals, inspection entries, requisitions, messages, and related records to preserve accountability and traceability across maintenance operations.",
  },
  {
    title: "Sharing and Access",
    body: "Information is available only to authorized personnel based on role, operational need, administrative responsibility, or compliance requirement. AirMS information should not be disclosed outside approved company processes.",
  },
  {
    title: "Security",
    body: "AirMS uses access controls, authentication, session management, and activity tracking to help protect user accounts and operational data. Users must also protect their credentials and devices.",
  },
  {
    title: "Retention",
    body: "Records may be retained as needed for aviation maintenance history, audit trails, legal obligations, company policy, safety review, and system administration.",
  },
  {
    title: "User Responsibilities",
    body: "Users should keep profile information current where permitted, report suspicious account activity, avoid uploading unnecessary personal information, and contact an administrator for access or data concerns.",
  },
  {
    title: "Policy Updates",
    body: "This Privacy Policy may be updated as AirMS features, operational processes, or compliance requirements change. Continued use of AirMS means you acknowledge the current policy.",
  },
];

export default function PrivacyPolicyModal({ visible, onClose }) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.modalCard}>
          <View style={styles.header}>
            <AppText style={styles.title}>Privacy Policy</AppText>
            <TouchableOpacity
              onPress={onClose}
              accessibilityLabel="Close privacy policy"
              style={styles.closeButton}
            >
              <MaterialCommunityIcons
                name="close"
                size={22}
                color={COLORS.grayDark}
              />
            </TouchableOpacity>
          </View>
          <ScrollView
            style={styles.scrollBody}
            showsVerticalScrollIndicator
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.content}
          >
            <AppText style={styles.intro}>
              This policy explains how AirMS handles user and operational
              information.
            </AppText>
            {privacySections.map((section) => (
              <View key={section.title} style={styles.section}>
                <AppText style={styles.sectionTitle}>{section.title}</AppText>
                <AppText style={styles.body}>{section.body}</AppText>
              </View>
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "center",
    padding: 18,
    backgroundColor: COLORS.overlayDark,
  },
  modalCard: {
    maxHeight: "82%",
    borderRadius: 14,
    backgroundColor: COLORS.white,
    overflow: "hidden",
  },
  scrollBody: {
    flexGrow: 0,
    flexShrink: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    flex: 1,
    paddingRight: 12,
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.black,
  },
  closeButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    backgroundColor: COLORS.grayLight,
  },
  content: {
    padding: 18,
    paddingBottom: 24,
  },
  intro: {
    color: COLORS.grayDark,
    lineHeight: 20,
  },
  section: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.black,
    marginBottom: 4,
  },
  body: {
    color: COLORS.grayDark,
    lineHeight: 20,
  },
});
