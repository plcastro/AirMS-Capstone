import React, { useContext, useEffect, useState } from "react";
import AppPaperInput from "../../components/common/AppPaperInput";
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  PermissionsAndroid,
  Linking,
  } from "react-native";
import {
  Card,
  Button,
  SegmentedButtons,
  Avatar,
  Text,
  Switch
} from "react-native-paper";
import Slider from "@react-native-community/slider";
import * as ImagePicker from "expo-image-picker";
import messaging from "@react-native-firebase/messaging";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthContext } from "../../Context/AuthContext";
import { API_BASE } from "../../utilities/API_BASE";
import UpdateSecurity from "./UpdateSecurity";
import { showToast } from "../../utilities/toast";
import { getUserImageUri, getUserInitials } from "../../utilities/avatar";
import { useFontScale } from "../../Context/FontScaleContext";
export default function Profile() {
  const { user, setUser } = useContext(AuthContext);
  const {
    fontScalePreference,
    setFontScalePreference,
    scale: scaled,
  } = useFontScale();

  const [activeTab, setActiveTab] = useState("info");
  const [previewUri, setPreviewUri] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const MOBILE_SETTINGS_KEY = "mobileProfileSettings";

  const MOBILE_FONT_RECOMMENDED = 1;
  const MOBILE_FONT_MAX = 1.3;

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
        setNotificationsEnabled(
          typeof stored.notificationsEnabled === "boolean"
            ? stored.notificationsEnabled
            : true,
        );
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

  const prepareMessagingForNotifications = async () => {
    try {
      await messaging().registerDeviceForRemoteMessages();
      await messaging().getToken();
    } catch (error) {
      console.warn("Notification token refresh skipped:", error);
    }
  };

  const requestNotificationPermission = async () => {
    try {
      if (Platform.OS === "web") {
        showToast("Notifications are not configured for web.");
        return false;
      }

      if (Platform.OS === "ios") {
        const authStatus = await messaging().requestPermission();
        const granted =
          authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          authStatus === messaging.AuthorizationStatus.PROVISIONAL;
        if (granted) {
          await prepareMessagingForNotifications();
          showToast("Notification permission granted.");
          return true;
        }
        showToast("Notification permission denied.");
        return false;
      }

      if (Platform.OS === "android" && Number(Platform.Version) >= 33) {
        const alreadyGranted = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        );
        if (alreadyGranted) {
          await prepareMessagingForNotifications();
          showToast("Notifications are enabled.");
          return true;
        }

        const result = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        );
        if (result === PermissionsAndroid.RESULTS.GRANTED) {
          await prepareMessagingForNotifications();
          showToast("Notification permission granted.");
          return true;
        }
        showToast(
          result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN
            ? "Enable notifications from Android app settings."
            : "Notification permission denied.",
        );
        if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
          Linking.openSettings();
        }
        return false;
      }

      await prepareMessagingForNotifications();
      showToast("Notifications are enabled.");
      return true;
    } catch (error) {
      console.error("Notification permission update failed:", error);
      showToast("Could not update notification permission.");
      return false;
    }
  };

  const requestImagePickerPermission = async () => {
    const permission = await ImagePicker.getMediaLibraryPermissionsAsync();
    if (permission.granted) {
      return true;
    }

    const requested = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (requested.granted) {
      return true;
    }

    Alert.alert(
      "Permission Denied",
      "Enable photo library access in your device settings to change your profile image.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Open Settings", onPress: () => Linking.openSettings() },
      ],
    );
    return false;
  };

  // --- IMAGE PICKER HANDLER ---
  const handleImagePick = async () => {
    // 1. Ask for permission
    const hasPermission = await requestImagePickerPermission();
    if (!hasPermission) {
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

      const normalizedFile = {
        uri: selectedFile.uri,
        type: fileType,
        name: fileName,
      };

      setPreviewUri(selectedFile.uri);
      await handleSaveImage(normalizedFile);
    }
  };
  const handleSaveImage = async (file) => {
    if (!file?.uri) return;
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
      const uploadedImagePath = getUserImageUri(data?.user?.image) || null;
      setPreviewUri(uploadedImagePath || null);
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
              <Text style={styles.editBadgeText}>
                {loading ? "..." : "Edit"}
              </Text>
            </View>
          </TouchableOpacity>

          <Text
            variant="titleLarge"
            style={[styles.userName, { fontSize: scaled(20) }]}
          >
            {`${user?.firstName || ""} ${user?.lastName || ""}`}
          </Text>
          <Text
            variant="bodyMedium"
            style={[styles.userRole, { fontSize: scaled(12) }]}
          >
            {user?.jobTitle}
          </Text>

          <View style={[styles.buttonRow, { marginTop: 15 }]}>
            <Button
              icon="delete"
              textColor="red"
              onPress={handleRemoveImage}
              disabled={!user?.image && !previewUri}
              style={styles.actionButton}
              labelStyle={{ fontSize: scaled(13) }}
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
                labelStyle: { fontSize: scaled(12) },
              },
              {
                value: "security",
                label: "Security",
                icon: "shield-check-outline",
                labelStyle: { fontSize: scaled(12) },
              },
              {
                value: "settings",
                label: "Settings",
                icon: "cog-outline",
                labelStyle: { fontSize: scaled(12) },
              },
            ]}
            style={styles.segmented}
          />
        </Card.Content>
      </Card>

      {activeTab === "info" ? (
        <Card style={styles.formCard}>
          <Card.Content>
            <AppPaperInput
              label="First Name"
              mode="outlined"
              value={user?.firstName || ""}
              editable={false}
              style={styles.input}
              contentStyle={{ fontSize: scaled(14) }}
            />

            <AppPaperInput
              label="Last Name"
              mode="outlined"
              value={user?.lastName || ""}
              editable={false}
              style={styles.input}
              contentStyle={{ fontSize: scaled(14) }}
            />

            <AppPaperInput
              label="Username"
              mode="outlined"
              value={user?.username}
              editable={false}
              style={styles.input}
              contentStyle={{ fontSize: scaled(14) }}
            />
            <AppPaperInput
              label="Email Address"
              mode="outlined"
              value={user?.email}
              editable={false}
              style={styles.input}
              contentStyle={{ fontSize: scaled(14) }}
            />
            <AppPaperInput
              label="Last Login"
              mode="outlined"
              value={formatDate(user?.lastLogin)}
              editable={false}
              style={styles.input}
              contentStyle={{ fontSize: scaled(14) }}
            />

            <Text style={{ color: "#6b7280", fontSize: scaled(12) }}>
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
            <Text style={[styles.settingsTitle, { fontSize: scaled(16) }]}>
              App Settings
            </Text>

            <Text style={[styles.settingLabel, { fontSize: scaled(14) }]}>
              Font Size
            </Text>
            <Text style={[styles.settingSub, { fontSize: scaled(12) }]}>
              Range: Recommended ({MOBILE_FONT_RECOMMENDED.toFixed(2)}x) to Max
              ({MOBILE_FONT_MAX.toFixed(2)}x)
            </Text>
            <Slider
              minimumValue={MOBILE_FONT_RECOMMENDED}
              maximumValue={MOBILE_FONT_MAX}
              step={0.05}
              value={fontScalePreference}
              minimumTrackTintColor="#26866F"
              maximumTrackTintColor="#CFE7E0"
              thumbTintColor="#26866F"
              onValueChange={(value) =>
                setFontScalePreference(value, { persist: false })
              }
              onSlidingComplete={async (value) => {
                await setFontScalePreference(value);
                await saveSettings({ fontSizePreference: value });
                showToast("Font size preference saved.");
              }}
            />
            <Text
              style={[
                styles.settingSub,
                { marginBottom: 14, fontSize: scaled(12) },
              ]}
            >
              Current: {fontScalePreference.toFixed(2)}x
            </Text>

            <View style={styles.settingRow}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text
                  style={[styles.settingLabel, { fontSize: scaled(14) }]}
                >
                  Enable Notifications
                </Text>
                <Text style={[styles.settingSub, { fontSize: scaled(12) }]}>
                  Managed by device settings.
                </Text>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={async (value) => {
                  if (value) {
                    const granted = await requestNotificationPermission();
                    setNotificationsEnabled(granted);
                    await saveSettings({ notificationsEnabled: granted });
                    return;
                  }

                  setNotificationsEnabled(false);
                  await saveSettings({ notificationsEnabled: false });
                  showToast(
                    "Notifications toggled off in app. You can re-enable from device settings.",
                  );
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
  userName: { marginTop: 12, fontWeight: "600" },
  userRole: { fontSize: 12, color: "#666", marginTop: 4 },
  segmented: { marginTop: 10 },
  input: { marginBottom: 16, backgroundColor: "#fff" },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    flexWrap: "wrap",
  },
  actionButton: { flex: 1, minWidth: 140, marginTop: 8 },
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
  editBadgeText: { color: "#fff", fontSize: 14, fontWeight: "600" },
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
