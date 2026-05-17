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
  Switch,
} from "react-native-paper";
import Slider from "@react-native-community/slider";
import * as ImagePicker from "expo-image-picker";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthContext } from "../../Context/AuthContext";
import { API_BASE } from "../../utilities/API_BASE";
import UpdateSecurity from "./UpdateSecurity";
import { showToast } from "../../utilities/toast";
import { getUserImageUri, getUserInitials } from "../../utilities/avatar";
export default function Profile() {
  const { user, setUser } = useContext(AuthContext);

  const [activeTab, setActiveTab] = useState("info");
  const [previewUri, setPreviewUri] = useState(null);
  const [file, setFile] = useState(null); // New state to track selected but unsaved file
  const [loading, setLoading] = useState(false);
  const [fontScalePreference, setFontScalePreference] = useState(1);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [notificationPermission, setNotificationPermission] =
    useState("undetermined");
  const MOBILE_SETTINGS_KEY = "mobileProfileSettings";

  const MOBILE_FONT_RECOMMENDED = 1;
  const MOBILE_FONT_MAX = 1.3;
  const fontScale = Number(fontScalePreference) || 1;

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
      setPreviewUri(getUserImageUri(user.image));
    }
  }, [user]);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const stored = JSON.parse(
          (await AsyncStorage.getItem(MOBILE_SETTINGS_KEY)) || "{}",
        );
        const storedFont = stored.fontSizePreference;
        if (typeof storedFont === "number") {
          setFontScalePreference(storedFont);
        } else {
          const legacyMap = {
            small: 0.9,
            medium: 1,
            large: 1.1,
          };
          setFontScalePreference(legacyMap[storedFont] || MOBILE_FONT_RECOMMENDED);
        }
        setNotificationsEnabled(
          typeof stored.notificationsEnabled === "boolean"
            ? stored.notificationsEnabled
            : true,
        );
      } catch {}

      try {
        const permissionStatus = await Notifications.getPermissionsAsync();
        setNotificationPermission(permissionStatus.status || "undetermined");
      } catch {}
    };

    loadSettings();
  }, []);

  const saveSettings = async (next = {}) => {
    const payload = {
      fontSizePreference:
        typeof next.fontSizePreference === "number"
          ? next.fontSizePreference
          : fontScalePreference,
      notificationsEnabled:
        typeof next.notificationsEnabled === "boolean"
          ? next.notificationsEnabled
          : notificationsEnabled,
    };
    await AsyncStorage.setItem(MOBILE_SETTINGS_KEY, JSON.stringify(payload));
  };

  // --- IMAGE PICKER HANDLER ---
  const handleImagePick = async () => {
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
      // Expo ImagePicker v17+ expects string array values like "images".
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets?.length) {
      const selectedFile = result.assets[0];
      const fileName =
        selectedFile.fileName || `profile_${user.id || user._id}.jpg`;
      const fileType = selectedFile.mimeType || "image/jpeg";

      setFile({
        uri: selectedFile.uri,
        type: fileType,
        name: fileName,
      });

      setPreviewUri(selectedFile.uri);
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
      name: file.name || file.fileName || `profile_${user.id || user._id}.jpg`,
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
        getUserImageUri(data?.user?.image) || null;
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
            {previewUri ? (
              <Avatar.Image
                size={120}
                source={{ uri: previewUri }}
                style={styles.avatar}
              />
            ) : (
              <Avatar.Text
                size={120}
                label={getUserInitials(user?.firstName, user?.lastName)}
                style={styles.avatar}
              />
            )}
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
                label: "Information",
                icon: "account-details-outline",
              },
              {
                value: "security",
                label: "Security",
                icon: "shield-check-outline",
              },
              {
                value: "settings",
                label: "Settings",
                icon: "cog-outline",
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
              value={user?.firstName || ""}
              editable={false}
              style={styles.input}
            />

            <TextInput
              label="Last Name"
              mode="outlined"
              value={user?.lastName || ""}
              editable={false}
              style={styles.input}
            />

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

            <Text style={{ color: "#6b7280", fontSize: 12 }}>
              Name editing is disabled. Contact an administrator to update your
              legal profile name.
            </Text>
          </Card.Content>
        </Card>
      ) : activeTab === "security" ? (
        <UpdateSecurity />
      ) : (
        <Card style={styles.formCard}>
          <Card.Content>
            <Text style={[styles.settingsTitle, { fontSize: 16 * fontScale }]}>
              App Settings
            </Text>

            <Text style={[styles.settingLabel, { fontSize: 14 * fontScale }]}>
              Font Size
            </Text>
            <Text style={styles.settingSub}>
              Range: Recommended ({MOBILE_FONT_RECOMMENDED.toFixed(2)}x) to Max ({MOBILE_FONT_MAX.toFixed(2)}x)
            </Text>
            <Slider
              minimumValue={MOBILE_FONT_RECOMMENDED}
              maximumValue={MOBILE_FONT_MAX}
              step={0.05}
              value={fontScalePreference}
              minimumTrackTintColor="#26866F"
              maximumTrackTintColor="#CFE7E0"
              thumbTintColor="#26866F"
              onValueChange={(value) => setFontScalePreference(value)}
              onSlidingComplete={async (value) => {
                await saveSettings({ fontSizePreference: value });
                showToast("Font size preference saved.");
              }}
            />
            <Text style={[styles.settingSub, { marginBottom: 14 }]}>
              Current: {fontScalePreference.toFixed(2)}x
            </Text>

            <View style={styles.settingRow}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text
                  style={[styles.settingLabel, { fontSize: 14 * fontScale }]}
                >
                  Enable Notifications
                </Text>
                <Text style={styles.settingSub}>
                  Permission: {notificationPermission}
                </Text>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={async (value) => {
                  if (value) {
                    const permissionRequest =
                      await Notifications.requestPermissionsAsync();
                    const status = permissionRequest.status || "undetermined";
                    setNotificationPermission(status);
                    if (status !== "granted") {
                      setNotificationsEnabled(false);
                      await saveSettings({ notificationsEnabled: false });
                      showToast("Notification permission not granted.");
                      return;
                    }
                  }
                  setNotificationsEnabled(value);
                  await saveSettings({ notificationsEnabled: value });
                  showToast("Notification preference saved.");
                }}
              />
            </View>
          </Card.Content>
        </Card>
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
  userName: { marginTop: 12, fontSize: 14, fontWeight: "600"},
  userRole: { fontSize: 12, color: "#666", marginTop: 4 },
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
  editBadgeText: { color: "#fff", fontSize: 14, fontWeight: "600"},
  settingsTitle: {
    fontWeight: "700",
    marginBottom: 14,
  },
  settingLabel: {
    fontWeight: "600",
    color: "#1f2937",
  },
  settingSub: {
    color: "#6b7280",
    fontSize: 12,
    marginTop: 4,
  },
  settingRow: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
});
