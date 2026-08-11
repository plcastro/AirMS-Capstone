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

const termsSections = [
  {
    title: "Authorized Use",
    body: "AirMS is intended for authorized aviation maintenance, logistics, and administrative personnel only. Users must access only the modules, aircraft records, reports, and actions required for their assigned role.",
  },
  {
    title: "Account Responsibility",
    body: "You are responsible for keeping your username, password, PIN, verification codes, and trusted devices secure. Do not share credentials or allow another person to act under your account.",
  },
  {
    title: "Operational Records",
    body: "Entries, approvals, signatures, inspection notes, requisitions, logs, and uploaded files must be accurate, timely, and based on verified information. AirMS records may be used for operational review, audit, compliance, and safety tracking.",
  },
  {
    title: "Data Privacy",
    body: "AirMS may process account details, activity logs, device/session information, uploaded profile images, and maintenance-related records to operate the system, protect accounts, support audits, and improve reliability.",
  },
  {
    title: "Acceptable Conduct",
    body: "Do not misuse AirMS, bypass security controls, upload harmful content, alter records without authority, or use system information outside approved company operations.",
  },
  {
    title: "Maintenance Authority",
    body: "AirMS supports maintenance workflows but does not replace required professional judgment, approved manuals, regulatory requirements, or company procedures. Users remain responsible for following applicable standards.",
  },
  {
    title: "Updates",
    body: "These terms may be updated as AirMS features, company policies, or compliance requirements change. Continued use of AirMS means you agree to the current terms.",
  },
];

export default function TermsAndConditionsModal({ visible, onClose }) {
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
            <AppText style={styles.title}>Terms and Conditions</AppText>
            <TouchableOpacity
              onPress={onClose}
              accessibilityLabel="Close terms and conditions"
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
              Please review these terms before using AirMS.
            </AppText>
            {termsSections.map((section) => (
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
    height: "95%",
    borderRadius: 14,
    backgroundColor: COLORS.white,
    overflow: "hidden",
  },
  scrollBody: {
    flex: 1,
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
    fontSize: 16,
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
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.black,
    marginBottom: 4,
  },
  body: {
    color: COLORS.grayDark,
    lineHeight: 20,
  },
});
