import React, { useEffect, useMemo, useState } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { COLORS } from "../../stylesheets/colors";
import {
  BASE_OPTIONS,
  JOB_TITLE_OPTIONS,
  ROLE_MAP,
  ROLES_REQUIRING_LICENSE,
} from "./constants";

const buildUsername = ({ firstName, lastName, users = [], currentUserId = "" }) => {
  const safeFirst = String(firstName || "").trim();
  const safeLast = String(lastName || "").trim();
  if (!safeFirst || !safeLast) return "";

  const base = `${safeLast}${safeFirst[0]}`
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9]/g, "");
  if (!base) return "";

  const taken = new Set(
    users
      .filter((u) => String(u?._id || "") !== String(currentUserId || ""))
      .map((u) => String(u?.username || "").toLowerCase()),
  );

  if (!taken.has(base)) return base;
  let index = 2;
  let candidate = `${base}${index}`;
  while (taken.has(candidate)) {
    index += 1;
    candidate = `${base}${index}`;
  }
  return candidate;
};

const emptyForm = {
  firstName: "",
  lastName: "",
  email: "",
  username: "",
  jobTitle: "",
  base: "",
  access: "",
  licenseNo: "",
};

export default function UserFormModal({
  visible,
  onClose,
  onSubmit,
  users,
  userToEdit,
  saving,
}) {
  const isEdit = Boolean(userToEdit?._id);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!visible) return;
    if (isEdit) {
      setForm({
        firstName: userToEdit?.firstName || "",
        lastName: userToEdit?.lastName || "",
        email: userToEdit?.email || "",
        username: userToEdit?.username || "",
        jobTitle: userToEdit?.jobTitle || "",
        base: userToEdit?.base || "",
        access:
          userToEdit?.access || ROLE_MAP[userToEdit?.jobTitle || ""] || "",
        licenseNo: userToEdit?.licenseNo || "",
      });
    } else {
      setForm(emptyForm);
    }
    setError("");
  }, [isEdit, userToEdit, visible]);

  useEffect(() => {
    if (!visible || isEdit) return;
    const suggested = buildUsername({
      firstName: form.firstName,
      lastName: form.lastName,
      users,
    });
    setForm((prev) => ({ ...prev, username: suggested }));
  }, [form.firstName, form.lastName, isEdit, users, visible]);

  const requiresLicense = useMemo(
    () => ROLES_REQUIRING_LICENSE.has(String(form.jobTitle || "").toLowerCase()),
    [form.jobTitle],
  );

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const validateAndSubmit = () => {
    const payload = {
      ...form,
      firstName: String(form.firstName).trim(),
      lastName: String(form.lastName).trim(),
      email: String(form.email).trim(),
      username: String(form.username).trim(),
      licenseNo: String(form.licenseNo || "").trim(),
    };

    if (!payload.firstName || !payload.lastName || !payload.email) {
      setError("First name, last name, and email are required.");
      return;
    }
    if (!payload.jobTitle || !payload.base || !payload.access) {
      setError("Job title, base, and access are required.");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(payload.email)) {
      setError("Please enter a valid email.");
      return;
    }
    if (!payload.username) {
      setError("Username is required.");
      return;
    }
    if (requiresLicense && !/^\d{6}$/.test(payload.licenseNo)) {
      setError("License number must be 6 digits.");
      return;
    }

    setError("");
    onSubmit(payload, isEdit);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>{isEdit ? "Edit User" : "Add User"}</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.label}>First Name</Text>
            <TextInput
              style={styles.input}
              value={form.firstName}
              onChangeText={(value) =>
                updateField("firstName", value.replace(/[^a-zA-Z'\-\s]/g, ""))
              }
              placeholder="Enter first name"
            />
            <Text style={styles.label}>Last Name</Text>
            <TextInput
              style={styles.input}
              value={form.lastName}
              onChangeText={(value) =>
                updateField("lastName", value.replace(/[^a-zA-Z'\-\s]/g, ""))
              }
              placeholder="Enter last name"
            />
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={form.email}
              onChangeText={(value) => updateField("email", value)}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="Enter email"
            />
            <Text style={styles.label}>Username</Text>
            <TextInput
              style={[styles.input, styles.disabledInput]}
              value={form.username}
              onChangeText={(value) => updateField("username", value)}
              editable={isEdit}
              placeholder="Auto-generated"
            />

            <Text style={styles.label}>Job Title</Text>
            <View style={styles.pickerWrap}>
              <Picker
                selectedValue={form.jobTitle}
                onValueChange={(value) => {
                  updateField("jobTitle", value);
                  updateField("access", ROLE_MAP[value] || "");
                  if (!ROLES_REQUIRING_LICENSE.has(String(value).toLowerCase())) {
                    updateField("licenseNo", "");
                  }
                }}
              >
                <Picker.Item label="Select job title" value="" />
                {JOB_TITLE_OPTIONS.map((item) => (
                  <Picker.Item key={item} label={item} value={item} />
                ))}
              </Picker>
            </View>

            <Text style={styles.label}>Base</Text>
            <View style={styles.pickerWrap}>
              <Picker selectedValue={form.base} onValueChange={(value) => updateField("base", value)}>
                <Picker.Item label="Select base" value="" />
                {BASE_OPTIONS.map((item) => (
                  <Picker.Item key={item} label={item} value={item} />
                ))}
              </Picker>
            </View>

            <Text style={styles.label}>Access</Text>
            <TextInput style={[styles.input, styles.disabledInput]} value={form.access} editable={false} />

            {requiresLicense ? (
              <>
                <Text style={styles.label}>License No. (6 digits)</Text>
                <TextInput
                  style={styles.input}
                  value={form.licenseNo}
                  onChangeText={(value) => updateField("licenseNo", value.replace(/\D/g, "").slice(0, 6))}
                  keyboardType="number-pad"
                  placeholder="Enter license number"
                />
              </>
            ) : null}

            {error ? <Text style={styles.error}>{error}</Text> : null}
          </ScrollView>

          <View style={styles.actions}>
            <TouchableOpacity style={[styles.btn, styles.secondary]} onPress={onClose} disabled={saving}>
              <Text style={styles.secondaryTxt}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.primary]} onPress={validateAndSubmit} disabled={saving}>
              <Text style={styles.primaryTxt}>{saving ? "Saving..." : isEdit ? "Save" : "Create"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.42)",
    justifyContent: "center",
    padding: 14,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 14,
    maxHeight: "92%",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 10,
    color: "#1A1A1A",
  },
  label: {
    fontSize: 12,
    color: COLORS.grayDark,
    marginBottom: 4,
    marginTop: 6,
  },
  input: {
    height: 42,
    borderWidth: 1,
    borderColor: "#DDDDDD",
    borderRadius: 8,
    paddingHorizontal: 10,
    backgroundColor: COLORS.white,
  },
  disabledInput: {
    backgroundColor: "#F3F4F6",
  },
  pickerWrap: {
    borderWidth: 1,
    borderColor: "#DDDDDD",
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: COLORS.white,
  },
  error: {
    marginTop: 10,
    color: "#C62828",
    fontSize: 12,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 12,
    gap: 8,
  },
  btn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  secondary: {
    backgroundColor: "#ECEFF1",
  },
  secondaryTxt: {
    color: "#37474F",
    fontWeight: "700",
  },
  primary: {
    backgroundColor: COLORS.primaryLight,
  },
  primaryTxt: {
    color: COLORS.white,
    fontWeight: "700",
  },
});

