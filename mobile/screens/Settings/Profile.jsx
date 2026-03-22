import React, { useContext, useEffect, useState } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  Text,
  TextInput,
  Platform,
  PermissionsAndroid,
} from "react-native";
import { Card, Button, SegmentedButtons } from "react-native-paper";
import * as ImagePicker from "react-native-image-picker";

import { AuthContext } from "../../Context/AuthContext";
import { API_BASE } from "../../utilities/API_BASE";
import UpdateSecurity from "./UpdateSecurity";

export default function Profile() {
  const { user, setUser } = useContext(AuthContext);

  const [activeTab, setActiveTab] = useState("info");
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ firstName: "", lastName: "" });
  const [previewUri, setPreviewUri] = useState(null);

  // --- VALIDATION LOGIC ---
  const hasNumbers = (text) => /\d/.test(text);

  const hasChanges =
    formData.firstName !== user?.firstName ||
    formData.lastName !== user?.lastName;

  const isSaveDisabled =
    hasNumbers(formData.firstName) ||
    hasNumbers(formData.lastName) ||
    formData.firstName.trim() === "" ||
    formData.lastName.trim() === "" ||
    !hasChanges;

  // --- HELPERS ---
  const maskEmail = (email) => {
    if (!email) return "";
    const [name, domain] = email.split("@");
    if (name.length <= 2) return `${name}***@${domain}`;
    return `${name.substring(0, 2)}*******${name.slice(-1)}@${domain}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleString("en-PH", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
      });
      const imgPath = user.image?.startsWith("http")
        ? user.image
        : `${API_BASE}${user.image || "/uploads/default_avatar.jpg"}`;
      setPreviewUri(imgPath);
    }
  }, [user]);

  // --- HANDLERS ---
  const handleSaveProfile = async () => {
    try {
      const res = await fetch(
        `${API_BASE}/api/user/updateUserProfile/${user.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${user.token}`,
          },
          body: JSON.stringify(formData),
        },
      );
      if (!res.ok) throw new Error("Update failed");

      setUser({ ...user, ...formData });
      setIsEditing(false);
      Alert.alert("Success", "Profile updated!");
    } catch (err) {
      Alert.alert("Error", err.message);
    }
  };

  const handleImagePick = async () => {
    if (Platform.OS === "android") {
      try {
        // For Android 13+, we check READ_MEDIA_IMAGES. For older, we check READ_EXTERNAL_STORAGE.
        const permission =
          Platform.Version >= 33
            ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
            : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;

        const hasPermission = await PermissionsAndroid.check(permission);

        if (!hasPermission) {
          const status = await PermissionsAndroid.request(permission);
          if (status !== PermissionsAndroid.RESULTS.GRANTED) {
            Alert.alert(
              "Permission Denied",
              "We need access to your photos to change your profile picture.",
            );
            return;
          }
        }
      } catch (err) {
        console.warn(err);
        return;
      }
    }
    const options = { mediaType: "photo", quality: 1, includeBase64: false };

    ImagePicker.launchImageLibrary(options, async (response) => {
      if (response.didCancel) return;
      if (response.errorCode) {
        Alert.alert("Error", response.errorMessage);
        return;
      }

      const asset = response.assets[0];
      const data = new FormData();
      data.append("image", {
        uri:
          Platform.OS === "android"
            ? asset.uri
            : asset.uri.replace("file://", ""),
        type: asset.type || "image/jpeg",
        name: asset.fileName || `profile_${user.id}.jpg`,
      });

      try {
        const res = await fetch(
          `${API_BASE}/api/user/updateUserImage/${user.id}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "multipart/form-data",
              Authorization: `Bearer ${user.token}`,
            },
            body: data,
          },
        );

        const result = await res.json();
        if (!res.ok) throw new Error(result.message || "Upload failed");

        setPreviewUri(`${API_BASE}${result.image}`);
        setUser({ ...user, image: result.image });
        Alert.alert("Success", "Profile picture updated!");
      } catch (err) {
        Alert.alert("Upload Error", err.message);
      }
    });
  };

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.headerCard}>
        <View style={styles.avatarContainer}>
          <TouchableOpacity onPress={handleImagePick}>
            <Image source={{ uri: previewUri }} style={styles.avatar} />
            <View style={styles.editBadge}>
              <Text style={styles.editBadgeText}>Edit</Text>
            </View>
          </TouchableOpacity>
          <Text
            style={styles.userName}
          >{`${user?.firstName} ${user?.lastName}`}</Text>
          <Text style={styles.userRole}>{user?.jobTitle}</Text>
        </View>

        <SegmentedButtons
          value={activeTab}
          onValueChange={setActiveTab}
          buttons={[
            { value: "info", label: "Profile Info" },
            { value: "security", label: "Security" },
          ]}
        />
      </Card>

      {activeTab === "info" ? (
        <View style={styles.formContainer}>
          <Text style={styles.label}>First Name</Text>
          <TextInput
            style={[
              styles.input,
              !isEditing && styles.disabledInput,
              isEditing && hasNumbers(formData.firstName) && styles.errorBorder,
            ]}
            value={formData.firstName}
            onChangeText={(t) => setFormData({ ...formData, firstName: t })}
            editable={isEditing}
            placeholder="First Name"
          />
          {isEditing && hasNumbers(formData.firstName) && (
            <Text style={styles.errorText}>Numbers are not allowed.</Text>
          )}

          <Text style={styles.label}>Last Name</Text>
          <TextInput
            style={[
              styles.input,
              !isEditing && styles.disabledInput,
              isEditing && hasNumbers(formData.lastName) && styles.errorBorder,
            ]}
            value={formData.lastName}
            onChangeText={(t) => setFormData({ ...formData, lastName: t })}
            editable={isEditing}
            placeholder="Last Name"
          />
          {isEditing && hasNumbers(formData.lastName) && (
            <Text style={styles.errorText}>Numbers are not allowed.</Text>
          )}

          <Text style={styles.label}>Username</Text>
          <TextInput
            style={[styles.input, styles.disabledInput]}
            value={user?.username}
            editable={false}
          />

          <Text style={styles.label}>Email Address</Text>
          <TextInput
            style={[styles.input, styles.disabledInput]}
            value={maskEmail(user?.email)}
            editable={false}
          />

          <Text style={styles.label}>Last Login</Text>
          <TextInput
            style={[styles.input, styles.disabledInput]}
            value={formatDate(user?.lastLogin)}
            editable={false}
          />

          <View style={styles.buttonRow}>
            {isEditing ? (
              <>
                <Button
                  mode="contained"
                  onPress={handleSaveProfile}
                  disabled={isSaveDisabled}
                >
                  Save
                </Button>
                <Button
                  onPress={() => {
                    setIsEditing(false);
                    setFormData({
                      firstName: user.firstName,
                      lastName: user.lastName,
                    });
                  }}
                >
                  Cancel
                </Button>
              </>
            ) : (
              <Button
                icon="pencil"
                mode="contained"
                onPress={() => setIsEditing(true)}
              >
                Edit Profile
              </Button>
            )}
          </View>
        </View>
      ) : (
        <UpdateSecurity />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerCard: { margin: 15, padding: 15, borderRadius: 10, elevation: 2 },
  avatarContainer: { alignItems: "center", marginBottom: 15 },
  avatar: { width: 90, height: 90, borderRadius: 45, backgroundColor: "#eee" },
  userName: { fontSize: 18, fontWeight: "bold", marginTop: 8 },
  userRole: { fontSize: 13, color: "gray" },
  formContainer: { padding: 20 },
  label: { fontSize: 14, fontWeight: "600", marginBottom: 5, color: "#333" },
  editBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#23a08b",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#fff",
  },
  editBadgeText: { color: "#fff", fontSize: 10, fontWeight: "bold" },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 15,
    fontSize: 16,
    color: "#000",
  },
  disabledInput: {
    backgroundColor: "#f5f5f5",
    borderColor: "#e0e0e0",
    color: "#777",
  },
  errorBorder: { borderColor: "red" },
  errorText: { color: "red", fontSize: 12, marginTop: -12, marginBottom: 10 },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 10,
    gap: 10,
  },
});
