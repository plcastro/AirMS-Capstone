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
  Alert,
} from "react-native";
import { styles } from "../stylesheets/styles";
import Button from "./Button";
import AlertComp from "./AlertComp";
import { AuthContext } from "../Context/AuthContext";
import { launchImageLibrary } from "react-native-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE } from "../utilities/API_BASE";

export default function UpdateProfile({ visible, onClose }) {
  const isMobile = Platform.OS !== "web";
  const { user, setUser } = useContext(AuthContext);
  const fileInputRef = useRef(null);
  const { image } = user;

  const profileImage =
    image && typeof image === "string"
      ? image.startsWith("http")
        ? image
        : `${API_BASE}${image}`
      : `${API_BASE}/uploads/default_avatar.jpg`;

  /* ---------------- STATE ---------------- */
  const [formData, setFormData] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
  });
  const [file, setFile] = useState(user?.image ? { uri: profileImage } : null);
  const [fileName, setFileName] = useState(file ? "Current Image" : "");
  const [previewUri, setPreviewUri] = useState(profileImage);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formErrors, setFormErrors] = useState({});
  const [errorMessage, setErrorMessage] = useState("");
  const [alertVisible, setAlertVisible] = useState(false);
  const [passwordRequirements, setPasswordRequirements] = useState({
    minLength: false,
    hasUppercase: false,
    hasNumber: false,
  });

  useEffect(() => {
    if (!visible || !user) return;

    setFormData({ firstName: user.firstName, lastName: user.lastName });
    setFile(user.image ? { uri: profileImage } : null);
    setFileName(user.image ? "Current Image" : "");
  }, [visible]);

  useEffect(() => {
    if (file?.uri) {
      setPreviewUri(file.uri);
    } else {
      setPreviewUri(profileImage);
    }
  }, [file, profileImage]);

  const currentpass = currentPassword.trim();
  const newpass = newPassword.trim();
  const confpass = confirmPassword.trim();

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
    if (currentpass.includes(" ")) {
      errors.currentPassword = "Password should not include spaces";
    }

    if (newpass.includes(" ")) {
      errors.newPassword = "Password should not include spaces";
    }

    if (confpass.includes(" ")) {
      errors.confirmPassword = "Password should not include spaces";
    }

    if (currentpass && newpass !== confpass) {
      errors.confirmPassword = "Passwords do not match";
    }

    if (currentpass && newpass !== confpass)
      errors.confirmPassword = "Passwords do not match";

    setFormErrors(errors);

    setPasswordRequirements({
      minLength: newPassword.length >= 8,
      hasUppercase: /[A-Z]/.test(newPassword),
      hasNumber: /\d/.test(newPassword),
    });
  }, [formData, newPassword, confirmPassword]);

  /* ---------------- IMAGE PICKER + UPLOAD ---------------- */
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
      const asset = result.assets[0];

      setFile({
        uri: asset.uri,
        fileName: asset.fileName || "profile.jpg",
        type: asset.type || "image/jpeg",
      });

      setFileName(asset.fileName || "profile.jpg");
    }
  };
  /* ---------------- CHANGE DETECTION ---------------- */
  const imageChanged =
    file?.uri &&
    file.uri !== (user?.image || "") &&
    !file.uri.startsWith("http");

  const nameChanged =
    formData.firstName !== user?.firstName ||
    formData.lastName !== user?.lastName;

  const passwordChanged = currentpass || newpass || confpass;

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

  const saveProfile = async () => {
    if (!nameChanged) return true;
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
            firstName: formData.firstName.trim(),
            lastName: formData.lastName.trim(),
          }),
        },
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Profile update failed");
      setErrorMessage("Profile update failed");
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const savePassword = async () => {
    if (!passwordChanged) return true;

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

      if (!res.ok) {
        setErrorMessage(data.message || "Incorrect current password");
        return false;
      }

      return true;
    } catch (err) {
      console.error(err);
      setErrorMessage("Password update failed");
      return false;
    }
  };

  /* ---------------- IMAGE UPLOAD API CALL ---------------- */
  const saveImage = async () => {
    if (!file || !file.uri || file.uri.startsWith("http")) return true;

    try {
      const form = new FormData();

      if (Platform.OS === "web") {
        form.append("image", file.rawFile);
      } else {
        form.append("image", {
          uri:
            Platform.OS === "ios" ? file.uri.replace("file://", "") : file.uri,
          name: file.fileName,
          type: file.type,
        });
      }

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
      return data.user.image;
    } catch (err) {
      console.error("Image upload error:", err);
      setErrorMessage("Image upload failed");
      return false;
    }
  };

  /* ---------------- WEB FILE INPUT ---------------- */
  const handleWebFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;

    setFile({
      uri: URL.createObjectURL(f),
      fileName: f.name,
      type: f.type,
      rawFile: f, // needed for FormData on web
    });

    setFileName(f.name);
  };

  const confirmSave = async () => {
    setErrorMessage("");

    const newImageUrl = await saveImage();

    if (newImageUrl === null && file?.uri && !file.uri.startsWith("http")) {
      setAlertVisible(false);
      return;
    }

    const profileOk = await saveProfile();
    if (!profileOk) {
      setAlertVisible(false);
      return;
    }

    const passwordOk = await savePassword();
    if (!passwordOk) {
      setAlertVisible(false);
      return;
    }

    setUser((prevUser) => ({
      ...prevUser,
      firstName: formData.firstName,
      lastName: formData.lastName,
      image: newImageUrl || prevUser.image,
    }));

    Alert.alert("Success", "Updated Successfully");

    resetForm();
    setAlertVisible(false);
    onClose();
  };

  return (
    <Modal transparent visible={visible} animationType="fade">
      <ScrollView>
        <View style={styles.alertOverlay}>
          <View
            style={[
              styles.alertContainer,
              {
                alignItems: "center",
                justifyContent: "center",
                width: isMobile ? "100%" : 600,
                flexDirection: isMobile ? "column" : "row",
                gap: 10,
              },
            ]}
          >
            <View style={{ alignSelf: "flex-start" }}>
              {Platform.OS === "web" && (
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  style={{ display: "none" }}
                  onChange={handleWebFileChange}
                />
              )}
              <TouchableOpacity onPress={pickImage}>
                <Image
                  source={{ uri: previewUri }}
                  style={{ width: 100, height: 100, borderRadius: 50 }}
                />
              </TouchableOpacity>
            </View>

            {/* EXISTING PROFILE FORM */}
            <View style={{ flexDirection: "column", width: 300 }}>
              <View>
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
              </View>
              <View>
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
              </View>
              <View>
                <Text>Email</Text>
                <TextInput
                  style={styles.formInput}
                  value={user.email}
                  editable={false}
                />
              </View>
              <View>
                <Text>Username</Text>
                <TextInput
                  style={styles.formInput}
                  value={user.username}
                  editable={false}
                />
              </View>
              <View>
                <Text>Current Password</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Current Password"
                  placeholderTextColor="gray"
                  secureTextEntry
                  value={currentPassword}
                  onChangeText={(t) => setCurrentPassword(t.trim())}
                />
                {formErrors.currentPassword && (
                  <Text style={styles.error}>{formErrors.currentPassword}</Text>
                )}
              </View>
              <View>
                <Text>New Password</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="New Password"
                  placeholderTextColor="gray"
                  secureTextEntry
                  value={newPassword}
                  onChangeText={(t) => setNewPassword(t.trim())}
                />
                {formErrors.newPassword && (
                  <Text style={styles.error}>{formErrors.newPassword}</Text>
                )}
              </View>
              <View>
                <Text>Confirm New Password</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Confirm New Password"
                  placeholderTextColor="gray"
                  secureTextEntry
                  value={confirmPassword}
                  onChangeText={(t) => setConfirmPassword(t.trim())}
                />
                {formErrors.confirmPassword && (
                  <Text style={styles.error}>{formErrors.confirmPassword}</Text>
                )}
              </View>
              <View style={{ marginVertical: 10 }}>
                <Text style={{ fontSize: 12, color: "#666" }}>
                  Password Requirements:
                </Text>
                <Text
                  style={getRequirementStyle(passwordRequirements.minLength)}
                >
                  ✓ At least 8 characters
                </Text>
                <Text
                  style={getRequirementStyle(passwordRequirements.hasUppercase)}
                >
                  ✓ One uppercase letter
                </Text>
                <Text
                  style={getRequirementStyle(passwordRequirements.hasNumber)}
                >
                  ✓ One number
                </Text>
              </View>
              {errorMessage && <Text style={styles.error}>{errorMessage}</Text>}
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
            </View>
          </View>
        </View>
      </ScrollView>
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
          onCancel={() => setAlertVisible(false)}
        />
      )}
    </Modal>
  );
}
