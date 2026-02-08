import React, { useState, useEffect, useContext, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  Modal,
  ScrollView,
  Platform,
  TouchableOpacity,
  Image,
} from "react-native";
import { styles } from "../stylesheets/styles";
import Button from "./Button";
import AlertComp from "./AlertComp";
import { AuthContext } from "../Context/AuthContext";
import { launchImageLibrary } from "react-native-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE } from "../utilities/API_BASE";

export default function UpdateProfile({ visible, onClose }) {
  const { user, loginUser, setUser } = useContext(AuthContext);
  const fileInputRef = useRef(null);
  /* ---------------- STATE ---------------- */
  const [formData, setFormData] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
  });
  const [file, setFile] = useState(user?.image ? { uri: user.image } : null);
  const [fileName, setFileName] = useState(file ? "Current Image" : "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formErrors, setFormErrors] = useState({});
  const [alertVisible, setAlertVisible] = useState(false);
  const [passwordRequirements, setPasswordRequirements] = useState({
    minLength: false,
    hasUppercase: false,
    hasNumber: false,
  });

  useEffect(() => {
    if (user) {
      setFormData({ firstName: user.firstName, lastName: user.lastName });
      setFile(user.image ? { uri: user.image } : null);
      setFileName(user.image ? "Current Image" : "");
    }
  }, [user, visible]);

  // --- Live validation ---
  useEffect(() => {
    const errors = {};

    const firstName = formData.firstName || "";
    const lastName = formData.lastName || "";
    if (!formData.firstName.trim()) errors.firstName = "First name is required";
    else if (/[^a-zA-Z\s\-\.'’]/.test(formData.firstName))
      errors.firstName = "Invalid characters in first name";

    if (!formData.lastName.trim()) errors.lastName = "Last name is required";
    else if (/[^a-zA-Z\s\-\.'’]/.test(formData.lastName))
      errors.lastName = "Invalid characters in last name";

    if (confirmPassword && newPassword !== confirmPassword)
      errors.confirmPassword = "Passwords do not match";

    setFormErrors(errors);

    setPasswordRequirements({
      minLength: newPassword.length >= 8,
      hasUppercase: /[A-Z]/.test(newPassword),
      hasNumber: /\d/.test(newPassword),
    });
  }, [formData, newPassword, confirmPassword]);

  /* ---------------- IMAGE PICKER ---------------- */
  const pickImage = async () => {
    if (Platform.OS === "web") {
      fileInputRef.current?.click();
      return;
    }

    const result = await launchImageLibrary({
      mediaType: "photo",
      quality: 0.8,
    });

    if (!result.didCancel && result.assets?.length) {
      setFile(result.assets[0]);
      setFileName(result.assets[0].fileName || "profile.jpg");
    }
  };

  /* ---------------- CHANGE DETECTION ---------------- */
  const imageChanged =
    file?.uri &&
    file.uri !== (user?.image || "") &&
    !file.uri.startsWith("http");
  const hasChanges =
    imageChanged ||
    formData.firstName !== user?.firstName ||
    formData.lastName !== user?.lastName ||
    currentPassword ||
    newPassword ||
    confirmPassword;

  const isSaveEnabled =
    hasChanges &&
    Object.keys(formErrors).length === 0 &&
    formData.firstName.trim() &&
    formData.lastName.trim() &&
    (!newPassword || (currentPassword && newPassword && confirmPassword));

  const handleChange = (key, value) =>
    setFormData({ ...formData, [key]: value });

  const getRequirementStyle = (met) => ({
    color: met ? "#26866F" : "#999",
    fontSize: 12,
  });

  const resetForm = () => {
    setFormData({ firstName: user.firstName, lastName: user.lastName });
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setFormErrors({});
    setAlertVisible(false);
    setPasswordRequirements({
      minLength: false,
      hasUppercase: false,
      hasNumber: false,
    });
    setFile(user.image ? { uri: user.image } : null);
    setFileName(user.image ? "Current Image" : "");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // --- You can keep saveProfile and savePassword functions as before ---
  const saveProfile = async () => {
    try {
      const res = await fetch(
        `${API_BASE}/api/user/updateUserProfile/${user.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${await AsyncStorage.getItem("currentUserToken")}`,
          },
          body: JSON.stringify({
            firstName: formData.firstName,
            lastName: formData.lastName,
          }),
        },
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Profile update failed");
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const savePassword = async () => {
    if (!newPassword) return true; // no change
    try {
      const res = await fetch(
        `${API_BASE}/api/user/updatePassword/${user.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${await AsyncStorage.getItem("currentUserToken")}`,
          },
          body: JSON.stringify({
            currentPassword,
            newPassword,
          }),
        },
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Password update failed");
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const saveImage = async () => {
    if (!imageChanged) return true;
    try {
      const form = new FormData();
      form.append("image", {
        uri: file.uri,
        name: file.fileName || "profile.jpg",
        type: "image/jpeg",
      });

      const res = await fetch(
        `${API_BASE}/api/user/updateUserImage/${user.id}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${await AsyncStorage.getItem("currentUserToken")}`,
          },
          body: form,
        },
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Image update failed");
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const confirmSave = async () => {
    setAlertVisible(false);

    await saveImage();

    const updatedUser = await saveProfile();

    await savePassword();

    if (updatedUser) {
      setUser(updatedUser);
    }

    resetForm();
    onClose();
  };

  const logAudit = async (action, details) => {
    if (!user?.token) return;
    try {
      await fetch(`${API_BASE}/api/audit-log`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          action,
          details,
          performedBy: user.id,
        }),
      });
    } catch (err) {
      console.error("Audit log failed:", err);
    }
  };

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.alertOverlay}>
        <View style={[styles.alertContainer, { width: 500 }]}>
          <ScrollView contentContainerStyle={{ padding: 10 }}>
            {/* IMAGE PICKER */}
            <View style={{ alignItems: "center", marginBottom: 15 }}>
              {Platform.OS === "web" && (
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const f = e.target.files[0];
                    if (f) {
                      setFile({
                        uri: URL.createObjectURL(f),
                        fileName: f.name,
                      });
                      setFileName(f.name);
                    }
                  }}
                />
              )}
              <TouchableOpacity onPress={pickImage}>
                {file?.uri ? (
                  <Image
                    source={{ uri: file.uri }}
                    style={{ width: 100, height: 100, borderRadius: 50 }}
                  />
                ) : (
                  <Text style={{ fontSize: 32 }}>＋</Text>
                )}
              </TouchableOpacity>
              <Text>{fileName}</Text>
            </View>

            {/* EXISTING PROFILE FORM */}
            <Text>First Name</Text>
            <TextInput
              style={styles.formInput}
              placeholder="First Name"
              placeholderTextColor="gray"
              value={formData.firstName}
              onChangeText={(t) => handleChange("firstName", t)}
            />
            {formErrors.firstName && (
              <Text style={styles.error}>{formErrors.firstName}</Text>
            )}

            <Text>Last Name</Text>
            <TextInput
              style={styles.formInput}
              placeholder="Last Name"
              placeholderTextColor="gray"
              value={formData.lastName}
              onChangeText={(t) => handleChange("lastName", t)}
            />
            {formErrors.lastName && (
              <Text style={styles.error}>{formErrors.lastName}</Text>
            )}

            <Text>Email</Text>
            <TextInput
              style={styles.formInput}
              value={user.email}
              editable={false}
            />

            <Text>Username</Text>
            <TextInput
              style={styles.formInput}
              value={user.username}
              editable={false}
            />

            <Text>Current Password</Text>
            <TextInput
              style={styles.formInput}
              placeholder="Current Password"
              placeholderTextColor="gray"
              secureTextEntry
              value={currentPassword}
              onChangeText={setCurrentPassword}
            />
            {formErrors.currentPassword && (
              <Text style={styles.error}>{formErrors.currentPassword}</Text>
            )}

            <Text>New Password</Text>
            <TextInput
              style={styles.formInput}
              placeholder="New Password"
              placeholderTextColor="gray"
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
            />
            {formErrors.newPassword && (
              <Text style={styles.error}>{formErrors.newPassword}</Text>
            )}

            <Text>Confirm New Password</Text>
            <TextInput
              style={styles.formInput}
              placeholder="Confirm New Password"
              placeholderTextColor="gray"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
            {formErrors.confirmPassword && (
              <Text style={styles.error}>{formErrors.confirmPassword}</Text>
            )}

            <View style={{ marginVertical: 10 }}>
              <Text style={{ fontSize: 12, color: "#666" }}>
                Password Requirements:
              </Text>
              <Text style={getRequirementStyle(passwordRequirements.minLength)}>
                ✓ At least 8 characters
              </Text>
              <Text
                style={getRequirementStyle(passwordRequirements.hasUppercase)}
              >
                ✓ One uppercase letter
              </Text>
              <Text style={getRequirementStyle(passwordRequirements.hasNumber)}>
                ✓ One number
              </Text>
            </View>

            <View style={{ flexDirection: "row", marginTop: 20, gap: 10 }}>
              <Button
                label="Save changes"
                onPress={() => setAlertVisible(true)}
                disabled={!isSaveEnabled}
                buttonStyle={[
                  styles.alertConfirmBtn,
                  { opacity: isSaveEnabled ? 1 : 0.5 },
                ]}
                buttonTextStyle={styles.alertConfirmBtnText}
              />
              <Button
                label="Cancel"
                onPress={handleClose}
                buttonStyle={[styles.alertCancelBtn]}
                buttonTextStyle={styles.alertCancelBtnText}
              />
            </View>
          </ScrollView>
        </View>
      </View>

      {alertVisible && (
        <AlertComp
          visible={alertVisible}
          onClose={() => setAlertVisible(false)}
          title="Profile Update"
          message="Are you sure you want to update your profile?"
          type="confirm"
          onConfirm={confirmSave}
          confirmText="Yes, update"
          cancelText="Cancel"
        />
      )}
    </Modal>
  );
}
