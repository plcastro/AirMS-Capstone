import React, { useEffect, useMemo, useState } from "react";
import AppText from "../common/AppText";
import AppInput from "../common/AppInput";
import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import * as ImagePicker from "expo-image-picker";
import { COLORS } from "../../stylesheets/colors";
import {
  BASE_OPTIONS,
  JOB_TITLE_OPTIONS,
  ROLE_MAP,
  ROLES_REQUIRING_LICENSE,
} from "./constants";
import AlertComp from "../AlertComp";

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
  const [imageUri, setImageUri] = useState("");
  const [pickedImageAsset, setPickedImageAsset] = useState(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [showDiscardAlert, setShowDiscardAlert] = useState(false);

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
      setImageUri(userToEdit?.image || "");
      setPickedImageAsset(null);
    } else {
      setForm(emptyForm);
      setImageUri("");
      setPickedImageAsset(null);
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
  const hasUnsavedChanges = () => {
    const baseline = isEdit
      ? {
          firstName: userToEdit?.firstName || "",
          lastName: userToEdit?.lastName || "",
          email: userToEdit?.email || "",
          username: userToEdit?.username || "",
          jobTitle: userToEdit?.jobTitle || "",
          base: userToEdit?.base || "",
          access: userToEdit?.access || ROLE_MAP[userToEdit?.jobTitle || ""] || "",
          licenseNo: userToEdit?.licenseNo || "",
        }
      : emptyForm;
    const formChanged = JSON.stringify(form) !== JSON.stringify(baseline);
    const imageChanged = Boolean(pickedImageAsset?.uri);
    return formChanged || imageChanged;
  };
  const handleCancelWithWarning = () => {
    if (saving) return;
    if (!hasUnsavedChanges()) {
      onClose?.();
      return;
    }
    setShowDiscardAlert(true);
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
    if (pickedImageAsset?.uri) {
      payload.__multipart = true;
      payload.image = {
        uri: pickedImageAsset.uri,
        name: pickedImageAsset.fileName || `user-${Date.now()}.jpg`,
        type: pickedImageAsset.mimeType || "image/jpeg",
      };
    }

    onSubmit(payload, isEdit);
  };

  const pickImage = async (fromCamera = false) => {
    try {
      setImageLoading(true);
      if (fromCamera) {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (permission.status !== "granted") {
          setError("Camera permission is required to take a profile photo.");
          return;
        }
      } else {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (permission.status !== "granted") {
          setError("Media library permission is required to pick a photo.");
          return;
        }
      }

      const result = fromCamera
        ? await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            quality: 0.7,
            aspect: [1, 1],
          })
        : await ImagePicker.launchImageLibraryAsync({
            allowsEditing: true,
            quality: 0.7,
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            aspect: [1, 1],
          });

      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      setImageUri(asset.uri || "");
      setPickedImageAsset(asset);
      setError("");
    } catch (pickerError) {
      setError("Failed to select image. Please try again.");
    } finally {
      setImageLoading(false);
    }
  };

  return (
    <>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={handleCancelWithWarning}>
        <View style={styles.backdrop}>
          <View style={styles.card}>
            <AppText style={styles.title}>{isEdit ? "Edit User" : "Add User"}</AppText>
            <ScrollView showsVerticalScrollIndicator={false}>
            <AppText style={styles.label}>Profile Image</AppText>
            <View style={styles.imageRow}>
              <View style={styles.imagePreviewWrap}>
                {imageUri ? (
                  <Image source={{ uri: imageUri }} style={styles.imagePreview} />
                ) : (
                  <AppText style={styles.imagePlaceholder}>No image</AppText>
                )}
              </View>
              <View style={{ flex: 1, gap: 8 }}>
                <TouchableOpacity
                  style={[styles.imageBtn, imageLoading && styles.imageBtnDisabled]}
                  onPress={() => pickImage(false)}
                  disabled={imageLoading}
                >
                  <AppText style={styles.imageBtnTxt}>Choose from Gallery</AppText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.imageBtn, imageLoading && styles.imageBtnDisabled]}
                  onPress={() => pickImage(true)}
                  disabled={imageLoading}
                >
                  <AppText style={styles.imageBtnTxt}>Take Photo</AppText>
                </TouchableOpacity>
                {imageLoading ? <ActivityIndicator color={COLORS.primaryLight} /> : null}
              </View>
            </View>
            <AppText style={styles.label}>First Name</AppText>
            <AppInput
              style={styles.input}
              value={form.firstName}
              onChangeText={(value) =>
                updateField("firstName", value.replace(/[^a-zA-Z'\-\s]/g, ""))
              }
              placeholder="Enter first name"
            />
            <AppText style={styles.label}>Last Name</AppText>
            <AppInput
              style={styles.input}
              value={form.lastName}
              onChangeText={(value) =>
                updateField("lastName", value.replace(/[^a-zA-Z'\-\s]/g, ""))
              }
              placeholder="Enter last name"
            />
            <AppText style={styles.label}>Email</AppText>
            <AppInput
              style={styles.input}
              value={form.email}
              onChangeText={(value) => updateField("email", value)}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="Enter email"
            />
            <AppText style={styles.label}>Username</AppText>
            <AppInput
              style={[styles.input, styles.disabledInput]}
              value={form.username}
              onChangeText={(value) => updateField("username", value)}
              editable={isEdit}
              placeholder="Auto-generated"
            />

            <AppText style={styles.label}>Job Title</AppText>
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

            <AppText style={styles.label}>Base</AppText>
            <View style={styles.pickerWrap}>
              <Picker selectedValue={form.base} onValueChange={(value) => updateField("base", value)}>
                <Picker.Item label="Select base" value="" />
                {BASE_OPTIONS.map((item) => (
                  <Picker.Item key={item} label={item} value={item} />
                ))}
              </Picker>
            </View>

            <AppText style={styles.label}>Access</AppText>
            <AppInput style={[styles.input, styles.disabledInput]} value={form.access} editable={false} />

            {requiresLicense ? (
              <>
                <AppText style={styles.label}>License No. (6 digits)</AppText>
                <AppInput
                  style={styles.input}
                  value={form.licenseNo}
                  onChangeText={(value) => updateField("licenseNo", value.replace(/\D/g, "").slice(0, 6))}
                  keyboardType="number-pad"
                  placeholder="Enter license number"
                />
              </>
            ) : null}

            {error ? <AppText style={styles.error}>{error}</AppText> : null}
            </ScrollView>

            <View style={styles.actions}>
              <TouchableOpacity style={[styles.btn, styles.secondary]} onPress={handleCancelWithWarning} disabled={saving}>
                <AppText style={styles.secondaryTxt}>Cancel</AppText>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, styles.primary]} onPress={validateAndSubmit} disabled={saving}>
                <AppText style={styles.primaryTxt}>{saving ? "Saving..." : isEdit ? "Save" : "Create"}</AppText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <AlertComp
        visible={showDiscardAlert}
        title="Discard changes?"
        message="You have unsaved changes. Cancel and discard them?"
        cancelText="Keep editing"
        confirmText="Discard"
        onCancel={() => setShowDiscardAlert(false)}
        onConfirm={() => {
          setShowDiscardAlert(false);
          onClose?.();
        }}
      />
    </>
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
  imageRow: { flexDirection: "row", gap: 10, marginBottom: 6 },
  imagePreviewWrap: {
    width: 78,
    height: 78,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#DDDDDD",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    backgroundColor: "#F8FAFC",
  },
  imagePreview: { width: "100%", height: "100%" },
  imagePlaceholder: { fontSize: 11, color: COLORS.grayDark },
  imageBtn: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: "center",
  },
  imageBtnDisabled: { opacity: 0.6 },
  imageBtnTxt: { color: COLORS.primaryLight, fontSize: 12, fontWeight: "700" },
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
