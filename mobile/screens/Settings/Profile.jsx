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
} from "react-native";
import { Card, Button, SegmentedButtons } from "react-native-paper";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage"; // Add this
import DefaultAvatar from "../../assets/images/default_avatar.jpg";
import { AuthContext } from "../../Context/AuthContext";
import { API_BASE } from "../../utilities/API_BASE";
import UpdateSecurity from "./UpdateSecurity";

export default function Profile() {
  const { user, setUser } = useContext(AuthContext);

  const [activeTab, setActiveTab] = useState("info");
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ firstName: "", lastName: "" });
  const [previewUri, setPreviewUri] = useState(null);
  const [file, setFile] = useState(null); // New state to track selected but unsaved file
  const [loading, setLoading] = useState(false);

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
        : `${API_BASE}${user.image || DefaultAvatar}`;
      setPreviewUri(imgPath);
    }
  }, [user]);

  // --- IMAGE PICKER HANDLER ---
  const handleImagePick = async () => {
    console.log("this is working");
    // 1. Ask for permission
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== "granted") {
      Alert.alert(
        "Permission Denied",
        "Enable permissions in settings to change your photo.",
      );
      return;
    }

    // 2. Launch the library
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaType.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled) {
      const selectedFile = result.assets[0];
      setFile({
        uri: selectedFile.uri,
        type: "image/jpeg",
        name: `profile_${user.id}.jpg`,
      });

      setPreviewUri(selectedFile.uri);
    }
  };
  // --- HANDLERS ---
  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("currentUserToken");
      const res = await fetch(
        `${API_BASE}/api/user/update-user-profile/${user.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(formData),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Update failed");

      setUser({ ...user, ...formData });
      setIsEditing(false);
      Alert.alert("Success", "Profile updated!");
    } catch (err) {
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveImage = async () => {
    if (!file || !file.uri) return;
    setLoading(true);

    const uploadData = new FormData();
    uploadData.append("image", {
      uri:
        Platform.OS === "android" ? file.uri : file.uri.replace("file://", ""),
      type: file.type || "image/jpeg",
      name: file.fileName || `profile_${user.id}.jpg`,
    });

    try {
      const token = await AsyncStorage.getItem("currentUserToken");
      const res = await fetch(
        `${API_BASE}/api/user/update-user-image/${user.id}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            // Note: Content-Type must be omitted for FormData in RN
          },
          body: uploadData,
        },
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to upload");

      setUser(data.user);
      setPreviewUri(`${API_BASE}${data.user.image}`);
      setFile(null);
      Alert.alert("Success", "Image updated!");
    } catch (err) {
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveImage = () => {
    // "Popconfirm" equivalent in Mobile
    Alert.alert(
      "Delete Image",
      "Are you sure you want to delete your profile image?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes",
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem("currentUserToken");
              const res = await fetch(
                `${API_BASE}/api/user/update-user-image/${user.id}`,
                {
                  method: "PUT",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                  },
                  body: JSON.stringify({ image: null }),
                },
              );

              const data = await res.json();
              if (!res.ok)
                throw new Error(data.message || "Failed to remove image");

              setUser((prev) => ({ ...prev, image: null }));
              setPreviewUri(null); // Will fallback to DefaultAvatar in render
              setFile(null);
              Alert.alert("Success", "Profile picture removed!");
            } catch (err) {
              Alert.alert("Error", err.message || "Image removal failed");
            }
          },
        },
      ],
    );
  };

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.headerCard}>
        <View style={styles.avatarContainer}>
          <TouchableOpacity onPress={handleImagePick}>
            <Image
              source={previewUri ? { uri: previewUri } : DefaultAvatar}
              style={styles.avatar}
            />
            <View style={styles.editBadge}>
              <Text style={styles.editBadgeText}>{file ? "New" : "Edit"}</Text>
            </View>
          </TouchableOpacity>

          <Text
            style={styles.userName}
          >{`${user?.firstName} ${user?.lastName}`}</Text>
          <Text style={styles.userRole}>{user?.jobTitle}</Text>

          {/* Action buttons for Image */}
          <View style={[styles.buttonRow, { marginTop: 15 }]}>
            {file && (
              <Button
                mode="contained"
                onPress={handleSaveImage}
                loading={loading}
              >
                Save Picture
              </Button>
            )}
            <Button
              icon="delete"
              textColor="red"
              onPress={handleRemoveImage}
              disabled={!user?.image && !file}
            >
              Remove Image
            </Button>
          </View>
        </View>

        <SegmentedButtons
          value={activeTab}
          onValueChange={setActiveTab}
          buttons={[
            {
              value: "info",
              label: "User Information",
              icon: "account-details-outline",
            },
            {
              value: "security",
              label: "Security",
              icon: "shield-check-outline",
            },
          ]}
          style={{ borderRadius: 0 }}
          theme={{ roundness: 0 }}
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
            value={user?.email}
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
                  loading={loading}
                >
                  Save Changes
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
                Edit User Information
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
  container: { flex: 1, backgroundColor: "#fff" },
  headerCard: {
    margin: 15,
    padding: 15,
    borderRadius: 10,
    elevation: 2,
    backgroundColor: "#fff",
  },
  avatarContainer: { alignItems: "center", marginBottom: 15 },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#eee",
  },
  userName: { fontSize: 20, fontWeight: "bold", marginTop: 10 },
  userRole: { fontSize: 14, color: "gray" },
  formContainer: { padding: 20 },
  label: { fontSize: 14, fontWeight: "600", marginBottom: 5, color: "#333" },
  editBadge: {
    position: "absolute",
    bottom: 5,
    right: 5,
    backgroundColor: "#23a08b",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#fff",
  },
  editBadgeText: { color: "#fff", fontSize: 11, fontWeight: "bold" },
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
  buttonRow: { flexDirection: "row", justifyContent: "center", gap: 10 },
});
