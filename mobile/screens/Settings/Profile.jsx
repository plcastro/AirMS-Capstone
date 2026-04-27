import React, { useContext, useEffect, useState } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  Platform,
} from "react-native";
import {
  Card,
  Button,
  SegmentedButtons,
  TextInput,
  Avatar,
  Text,
} from "react-native-paper";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DefaultAvatar from "../../assets/images/default_avatar.jpg";
import { AuthContext } from "../../Context/AuthContext";
import { API_BASE } from "../../utilities/API_BASE";
import UpdateSecurity from "./UpdateSecurity";
import { showToast } from "../../utilities/toast";
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
      showToast("Profile updated!");
    } catch (err) {
      showToast(err.message);
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

      setUser((prev) => ({
        ...prev,
        ...data.user,
        id: data?.user?.id || data?.user?._id || prev?.id,
      }));
      const uploadedImagePath =
        data?.user?.image && data.user.image.startsWith("http")
          ? data.user.image
          : `${API_BASE}${data?.user?.image || ""}`;
      setPreviewUri(uploadedImagePath || null);
      setFile(null);
      showToast("Image updated!");
    } catch (err) {
      showToast(err.message);
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
              showToast("Profile picture removed!");
            } catch (err) {
              showToast(err.message || "Image removal failed");
            }
          },
        },
      ],
    );
  };

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.headerCard}>
        <Card.Content style={styles.avatarContainer}>
          <TouchableOpacity onPress={handleImagePick}>
            <Avatar.Image
              size={120}
              source={previewUri ? { uri: previewUri } : DefaultAvatar}
              style={styles.avatar}
            />
            <View style={styles.editBadge}>
              <Text style={styles.editBadgeText}>{file ? "New" : "Edit"}</Text>
            </View>
          </TouchableOpacity>

          <Text variant="titleLarge" style={styles.userName}>
            {`${user?.firstName || ""} ${user?.lastName || ""}`}
          </Text>
          <Text variant="bodyMedium" style={styles.userRole}>
            {user?.jobTitle}
          </Text>

          <View style={[styles.buttonRow, { marginTop: 15 }]}>
            {file && (
              <Button
                mode="contained"
                onPress={handleSaveImage}
                loading={loading}
                style={styles.actionButton}
              >
                Save Picture
              </Button>
            )}
            <Button
              icon="delete"
              textColor="red"
              onPress={handleRemoveImage}
              disabled={!user?.image && !file}
              style={styles.actionButton}
            >
              Remove Image
            </Button>
          </View>
        </Card.Content>

        <Card.Content>
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
            style={styles.segmented}
          />
        </Card.Content>
      </Card>

      {activeTab === "info" ? (
        <Card style={styles.formCard}>
          <Card.Content>
            <TextInput
              label="First Name"
              mode="outlined"
              value={formData.firstName}
              onChangeText={(t) => setFormData({ ...formData, firstName: t })}
              editable={isEditing}
              error={isEditing && hasNumbers(formData.firstName)}
              style={styles.input}
            />
            {isEditing && hasNumbers(formData.firstName) && (
              <Text style={styles.errorText}>Numbers are not allowed.</Text>
            )}

            <TextInput
              label="Last Name"
              mode="outlined"
              value={formData.lastName}
              onChangeText={(t) => setFormData({ ...formData, lastName: t })}
              editable={isEditing}
              error={isEditing && hasNumbers(formData.lastName)}
              style={styles.input}
            />
            {isEditing && hasNumbers(formData.lastName) && (
              <Text style={styles.errorText}>Numbers are not allowed.</Text>
            )}

            <TextInput
              label="Username"
              mode="outlined"
              value={user?.username}
              editable={false}
              style={styles.input}
            />
            <TextInput
              label="Email Address"
              mode="outlined"
              value={user?.email}
              editable={false}
              style={styles.input}
            />
            <TextInput
              label="Last Login"
              mode="outlined"
              value={formatDate(user?.lastLogin)}
              editable={false}
              style={styles.input}
            />

            <View style={styles.buttonRow}>
              {isEditing ? (
                <>
                  <Button
                    mode="contained"
                    onPress={handleSaveProfile}
                    disabled={isSaveDisabled}
                    loading={loading}
                    style={styles.actionButton}
                  >
                    Save Changes
                  </Button>
                  <Button
                    mode="outlined"
                    onPress={() => {
                      setIsEditing(false);
                      setFormData({
                        firstName: user.firstName,
                        lastName: user.lastName,
                      });
                    }}
                    style={styles.actionButton}
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <Button
                  icon="pencil"
                  mode="contained"
                  onPress={() => setIsEditing(true)}
                  style={styles.fullWidthButton}
                >
                  Edit User Information
                </Button>
              )}
            </View>
          </Card.Content>
        </Card>
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
    borderRadius: 12,
    elevation: 2,
    backgroundColor: "#fff",
  },
  formCard: {
    marginHorizontal: 15,
    marginBottom: 24,
    borderRadius: 12,
    elevation: 2,
    backgroundColor: "#fff",
  },
  avatarContainer: { alignItems: "center", padding: 16 },
  avatar: {
    backgroundColor: "#eee",
  },
  userName: { marginTop: 12, fontSize: 20, fontWeight: "700" },
  userRole: { fontSize: 14, color: "#666", marginTop: 4 },
  segmented: { marginTop: 10 },
  input: { marginBottom: 16, backgroundColor: "#fff" },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    flexWrap: "wrap",
  },
  actionButton: { flex: 1, minWidth: 140, marginTop: 8 },
  fullWidthButton: { width: "100%", marginTop: 8 },
  errorText: { color: "#b00020", fontSize: 12, marginBottom: 12 },
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
  editBadgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
});
