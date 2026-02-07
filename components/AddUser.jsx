import React, { useState, useEffect } from "react";
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
import { styles } from "../stylesheets/styles";
import AlertComp from "./AlertComp";

export default function AddUser({ visible, onClose, onUserAdded }) {
  if (!visible) return null;

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [role, setRole] = useState("");
  const [accessLevel, setAccessLevel] = useState("");
  const [joinedDate, setJoinedDate] = useState("");
  const [message, setMessage] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);

  // Automatically determine access level from role
  const getAccessLevel = (role) => {
    switch (role) {
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

  // Update accessLevel automatically whenever role changes
  useEffect(() => {
    if (role) {
      setAccessLevel(getAccessLevel(role));
    } else {
      setAccessLevel("");
    }
  }, [role]);

  // Set joined date to today on component mount
  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    setJoinedDate(today);
  }, []);

  const validateForm = async () => {
    if (
      !firstName ||
      !lastName ||
      !email ||
      !username ||
      !role ||
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
      const response = await fetch(`${API_BASE}/api/user/getAllUsers`);
      const data = await response.json();

      const emailTaken = data.data.some((user) => user.email === email.trim());
      const usernameTaken = data.data.some(
        (user) => user.username === username.trim(),
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

  const handleSaveClick = async () => {
    const isValid = await validateForm();
    if (isValid) setShowConfirm(true);
  };

  const handleConfirmSave = async () => {
    const API_BASE =
      Platform.OS === "android"
        ? "http://10.0.2.2:8000"
        : "http://localhost:8000";
    const today = new Date().toISOString().split("T")[0];

    try {
      const response = await fetch(`${API_BASE}/api/user/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          username: username.trim(),
          role,
          access: accessLevel,
          joinedDate: today,
        }),
      });

      const data = await response.json();
      setMessage(
        response.ok
          ? "User added successfully."
          : data.message || "Failed to add user.",
      );
    } catch (error) {
      console.error(error);
      setMessage("An error occurred while adding the user.");
    }

    if (onUserAdded) onUserAdded();

    // Reset form
    setFirstName("");
    setLastName("");
    setEmail("");
    setUsername("");
    setRole("");
    setAccessLevel("");
    setJoinedDate("");
    setMessage("");
    setShowConfirm(false);
    onClose();
  };

  const handleCancelSave = () => setShowConfirm(false);
  const handleCancel = () => {
    setMessage("");
    onClose();
  };

  const Content = (
    <View style={styles.addUserOverlay}>
      <View style={styles.addUserCard}>
        <Text style={styles.addUserTitle}>ADD USER</Text>
        <View style={styles.addUserContent}>
          {/* Image Upload Placeholder */}
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
              <Text style={styles.label}>Role:</Text>
              <Picker
                selectedValue={role}
                onValueChange={(value) => setRole(value)}
                style={styles.picker}
              >
                <Picker.Item label="Select Role" value="" />
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

            <View style={styles.formRow}>
              <Text style={styles.label}>Access Control:</Text>
              <TextInput
                style={styles.input}
                value={accessLevel}
                editable={false}
              />
            </View>

            <View style={styles.formRow}>
              <Text style={styles.label}>Joined Date:</Text>
              <TextInput
                style={styles.input}
                value={joinedDate}
                editable={false}
              />
            </View>

            {message ? (
              <Text style={{ color: "red", marginTop: 6, fontSize: 12 }}>
                {message}
              </Text>
            ) : null}

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSaveClick}
              >
                <Text style={styles.btnText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
                <Text style={styles.btnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>

      {showConfirm && (
        <AlertComp
          title="CONFIRM USER"
          message="Are you sure you want to add this user?"
          type="confirm"
          onConfirm={handleConfirmSave}
          onCancel={handleCancelSave}
          confirmText="Yes, add user"
          cancelText="Cancel"
        />
      )}
    </View>
  );

  if (Platform.OS === "web") return Content;
  return (
    <Modal transparent animationType="fade" visible={visible}>
      {Content}
    </Modal>
  );
}
