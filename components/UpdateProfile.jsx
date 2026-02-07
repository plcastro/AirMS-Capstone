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

export default function UpdateProfile({ visible, onClose }) {
  const { user, loginUser } = useContext(AuthContext);

  const [formData, setFormData] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
  });
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

  // --- File/image upload state and ref (same as AddUser) ---
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState("");
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (user) {
      setFormData({ firstName: user.firstName, lastName: user.lastName });
      if (user.image) {
        setFile(user.image); // prefill existing image URL
        setFileName("Current Image");
      }
    }
  }, [user]);

  // --- Live validation ---
  useEffect(() => {
    const errors = {};
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

  const handleChange = (key, value) =>
    setFormData({ ...formData, [key]: value });

  const hasChanges =
    formData.firstName !== user?.firstName ||
    formData.lastName !== user?.lastName ||
    currentPassword ||
    newPassword ||
    confirmPassword ||
    file !== user?.image;

  const isSaveEnabled =
    hasChanges &&
    Object.keys(formErrors).length === 0 &&
    formData.firstName.trim() &&
    formData.lastName.trim() &&
    (!newPassword || (currentPassword && newPassword && confirmPassword));

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
    setFile(user.image || null);
    setFileName(user.image ? "Current Image" : "");
  };

  // --- File/Image picker (web + mobile) ---
  const pickImage = async () => {
    if (Platform.OS === "web") {
      fileInputRef.current?.click();
    } else {
      const options = {
        mediaType: "photo",
        quality: 0.8,
        maxWidth: 500,
        maxHeight: 500,
      };
      const result = await launchImageLibrary(options);
      if (result.didCancel) return;
      if (result.errorCode)
        console.error("ImagePicker Error:", result.errorMessage);
      else if (result.assets && result.assets.length > 0) {
        setFile(result.assets[0].uri);
        setFileName(result.assets[0].fileName || "selected-image");
      }
    }
  };

  const saveProfile = async () => {
    if (!user?.id) return false;

    try {
      const API_BASE =
        Platform.OS === "android"
          ? "http://10.0.2.2:8000"
          : "http://localhost:8000";

      const formDataToSend = new FormData();
      formDataToSend.append("firstName", formData.firstName);
      formDataToSend.append("lastName", formData.lastName);

      if (file && !file.startsWith("http")) {
        // only append if new file selected
        const name = fileName || "profile.jpg";
        const type = name.split(".").pop();
        formDataToSend.append("file", {
          uri: file,
          name,
          type: `image/${type}`,
        });
      }

      const response = await fetch(
        `${API_BASE}/api/user/updateUserProfile/${user.id}`,
        {
          method: "PUT",
          headers: { Authorization: `Bearer ${user.token}` },
          body: formDataToSend,
        },
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setFormErrors({
          ...formErrors,
          currentPassword: data?.message || "Failed to update profile",
        });
        return false;
      }

      const data = await response.json();
      loginUser(data.user, true);
      return true;
    } catch (err) {
      console.error(err);
      setFormErrors({
        ...formErrors,
        currentPassword: "Failed to update profile",
      });
      return false;
    }
  };

  const savePassword = async () => {
    if (!user?.id || !newPassword) return false;
    try {
      const API_BASE =
        Platform.OS === "android"
          ? "http://10.0.2.2:8000"
          : "http://localhost:8000";
      const response = await fetch(
        `${API_BASE}/api/user/updatePassword/${user.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${user.token}`,
          },
          body: JSON.stringify({ currentPassword, newPassword }),
        },
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setFormErrors({
          ...formErrors,
          currentPassword: data?.message || "Failed to update password",
        });
        return false;
      }
      return true;
    } catch (err) {
      console.error(err);
      setFormErrors({
        ...formErrors,
        currentPassword: "Failed to update password",
      });
      return false;
    }
  };

  const confirmSave = async () => {
    setAlertVisible(false);

    let profileUpdated = false;
    let passwordUpdated = false;

    if (hasChanges) profileUpdated = await saveProfile();
    if (newPassword) passwordUpdated = await savePassword();

    if (profileUpdated || passwordUpdated) {
      resetForm();
      onClose();
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.alertOverlay}>
        <ScrollView contentContainerStyle={{ padding: 10 }}>
          {/* Profile picture upload */}
          <View style={{ alignItems: "center", marginBottom: 15 }}>
            {Platform.OS === "web" && (
              <input
                type="file"
                accept=".jpg,.png"
                ref={fileInputRef}
                style={{ display: "none" }}
                onChange={(e) => {
                  const selectedFile = e.target.files[0];
                  if (selectedFile) {
                    setFile(selectedFile);
                    setFileName(selectedFile.name);
                  }
                }}
              />
            )}
            <TouchableOpacity onPress={pickImage} style={styles.imageBox}>
              <Text style={styles.plus}>＋</Text>
            </TouchableOpacity>
            {fileName ? <Text style={{ fontSize: 12 }}>{fileName}</Text> : null}
          </View>

          {/* First Name / Last Name */}
          <Text>First Name</Text>
          <TextInput
            style={styles.formInput}
            value={formData.firstName}
            onChangeText={(t) => handleChange("firstName", t)}
          />
          {formErrors.firstName && (
            <Text style={styles.error}>{formErrors.firstName}</Text>
          )}

          <Text>Last Name</Text>
          <TextInput
            style={styles.formInput}
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

          {/* Password */}
          <Text>Current Password</Text>
          <TextInput
            style={styles.formInput}
            placeholder="Current Password"
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
            secureTextEntry
            value={newPassword}
            onChangeText={setNewPassword}
          />

          <Text>Confirm New Password</Text>
          <TextInput
            style={styles.formInput}
            placeholder="Confirm New Password"
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />

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
              buttonStyle={styles.alertCancelBtn}
              buttonTextStyle={styles.alertCancelBtnText}
            />
          </View>
        </ScrollView>
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
