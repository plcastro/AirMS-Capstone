import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  Platform,
  ScrollView,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { styles } from "../../stylesheets/styles";
import AlertComp from "../AlertComp";

export default function EditUser({ visible, onClose, user, onUserUpdated }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [position, setPosition] = useState("");
  const [accessLevel, setAccessLevel] = useState("");
  const [message, setMessage] = useState("");
  const [isChanged, setIsChanged] = useState(false);

  const [confirmMessage, setConfirmMessage] = useState(
    "Are you sure you want to save changes?",
  );
  const [showConfirm, setShowConfirm] = useState(false);

  // Automatically determine access level from position
  const getAccessLevel = (position) => {
    switch (position) {
      case "Admin":
        return "Admin";
      case "Pilot":
      case "Manager":
      case "Head of Maintenance":
        return "Superuser";
      case "Mechanic":
        return "User";
      default:
        return "";
    }
  };

  // Update accessLevel automatically whenever position changes
  useEffect(() => {
    if (position) {
      setAccessLevel(getAccessLevel(position));
    } else {
      setAccessLevel("");
    }
  }, [position]);
  useEffect(() => {
    if (!user) return;

    setFirstName(user.firstName || "");
    setLastName(user.lastName || "");
    setEmail(user.email || "");
    setUsername(user.username || "");
    setPosition(user.position || "");
  }, [user]);

  // Check if form has changed
  useEffect(() => {
    if (!user) return;

    const hasChanged =
      firstName !== (user.firstName || "") ||
      lastName !== (user.lastName || "") ||
      email.trim() !== (user.email || "") ||
      username.trim() !== (user.username || "") ||
      position !== (user.position || "") ||
      accessLevel !== (user.accessLevel || "");

    setIsChanged(hasChanged);
  }, [firstName, lastName, email, username, position, accessLevel, user]);

  const validateForm = async () => {
    if (
      !firstName ||
      !lastName ||
      !email ||
      !username ||
      !position ||
      !accessLevel
    ) {
      setMessage("Please fill in all required fields.");
      return false;
    }

    const API_BASE =
      Platform.OS === "android"
        ? "http://10.0.2.2:8000"
        : "http://localhost:8000";
    try {
      const response = await fetch(`${API_BASE}/api/user/getAllUsers`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });

      console.log("Response status:", response.status);

      const data = await response.json();

      console.log("Data received:", data);

      const users = Array.isArray(data) ? data : data.data || [];
      const emailTaken = users.some(
        (u) =>
          u._id.toString() !== user._id.toString() &&
          u.email.toLowerCase().trim() === email.toLowerCase().trim(),
      );

      const usernameTaken = users.some(
        (u) =>
          u._id.toString() !== user._id.toString() &&
          u.username.toLowerCase().trim() === username.toLowerCase().trim(),
      );

      if (emailTaken || usernameTaken) {
        setMessage("Email or username already registered.");
        return false;
      }
    } catch (err) {
      console.error("Error checking duplicates:", err);
      setMessage("Failed to check email/username availability.");
      return false;
    }
    return true;
  };

  const handleUpdateClick = async () => {
    if (!user) return;

    const isValid = await validateForm();
    if (isValid) {
      setConfirmMessage("Are you sure you want to save changes?");
      setShowConfirm(true);
    }
  };

  const handleConfirmUpdate = async () => {
    const API_BASE =
      Platform.OS === "android"
        ? "http://10.0.2.2:8000"
        : "http://localhost:8000";

    try {
      const response = await fetch(
        `${API_BASE}/api/user/updateUser/${user._id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            firstName,
            lastName,
            email: email.trim(),
            username: username.trim(),
            position,
            accessLevel,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Update failed");
      }
    } catch (error) {
      console.error("Error updating user:", error);
      setMessage("Failed to update user. Please try again.");
      return;
    }

    onUserUpdated?.();
    setMessage("");
    setShowConfirm(false);
    onClose();
  };

  const handleCancelUpdate = () => {
    setShowConfirm(false);
  };

  const handleCancel = () => {
    setMessage("");
    onClose();
  };
  if (!visible) return null;
  const Content = (
    <>
      <View style={styles.addUserOverlay}>
        <View style={styles.addUserCard}>
          <Text style={styles.addUserTitle}>EDIT USER</Text>

          <View style={styles.addUserContent}>
            <View>
              <Text style={styles.label}>Image:</Text>
              <TouchableOpacity style={styles.imageBox}>
                <Text style={styles.plus}>＋</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.form}>
              <View style={styles.formRow}>
                <Text style={styles.label}>First Name:</Text>
                <TextInput
                  style={styles.input}
                  value={firstName}
                  onChangeText={setFirstName}
                />
              </View>
              <View style={styles.formRow}>
                <Text style={styles.label}>Last Name:</Text>
                <TextInput
                  style={styles.input}
                  value={lastName}
                  onChangeText={setLastName}
                />
              </View>

              <View style={styles.formRow}>
                <Text style={styles.label}>Email:</Text>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                />
              </View>

              <View style={styles.formRow}>
                <Text style={styles.label}>Username:</Text>
                <TextInput
                  style={styles.input}
                  value={username}
                  onChangeText={setUsername}
                />
              </View>

              <View style={styles.formRow}>
                <Text style={styles.label}>Position:</Text>
                <Picker
                  selectedValue={position}
                  onValueChange={(itemValue) => setPosition(itemValue)}
                  style={styles.picker}
                  mode="dropdown"
                >
                  <Picker.Item label="Change Position" value="" />
                  <Picker.Item label="Admin" value="Admin" />
                  <Picker.Item
                    label="Head of Maintenance"
                    value="Head of Maintenance"
                  />
                  <Picker.Item label="Pilot" value="Pilot" />
                  <Picker.Item label="Manager" value="Manager" />
                  <Picker.Item label="Mechanic" value="Mechanic" />
                </Picker>
              </View>

              {/* Access Control Field */}
              <View style={styles.formRow}>
                <Text style={styles.label}>Access Control:</Text>
                <TextInput
                  style={styles.input}
                  value={accessLevel}
                  editable={false} // auto-set based on position
                />
              </View>

              {message ? (
                <Text
                  style={{
                    color: "red",
                    marginTop: 6,
                    fontSize: 12,
                    marginBottom: 10,
                  }}
                >
                  {message}
                </Text>
              ) : null}

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.saveBtn, !isChanged && styles.saveBtnDisabled]}
                  onPress={handleUpdateClick}
                  disabled={!isChanged}
                >
                  <Text style={styles.btnText}>UPDATE</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={handleCancel}
                >
                  <Text style={styles.cancelBtnText}>CANCEL</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </View>

      {showConfirm && (
        <AlertComp
          visible={showConfirm}
          title="SAVE CHANGES"
          message={confirmMessage}
          type="confirm"
          onConfirm={handleConfirmUpdate}
          onCancel={handleCancelUpdate}
          confirmText="Yes, update user"
          cancelText="Cancel"
        />
      )}
    </>
  );

  if (Platform.OS === "web") return Content;

  return (
    <Modal transparent animationType="fade" visible={visible}>
      {Content}
    </Modal>
  );
}
