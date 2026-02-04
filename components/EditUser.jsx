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
import { styles } from "../stylesheets/styles";
import AlertComp from "./AlertComp";

export default function EditUser({ visible, onClose, user, onUserUpdated }) {
  if (!visible) return null;

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [role, setRole] = useState("");
  const [joinedDate, setJoinedDate] = useState("");
  const [message, setMessage] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [showCancel, setShowCancel] = useState(false);

  useEffect(() => {
    if (user) {
      setFullName(`${user.firstName || ""} ${user.lastName || ""}`.trim());
      setEmail(user.email || "");
      setUsername(user.username || "");
      setRole(user.role || "");
      setJoinedDate(user.dateCreated || "");
      setMessage("");
    }
  }, [user]);

  const validateForm = () => {
    if (!fullName || !email || !username || !role) {
      setMessage("Please fill in all required fields.");
      return false;
    }
    return true;
  };

  const handleUpdateClick = () => {
    if (validateForm()) {
      setShowConfirm(true);
    }
  };

  const handleConfirmUpdate = () => {
    console.log("Updating user:", {
      fullName,
      email,
      username,
      role,
    });

    if (onUserUpdated) {
      onUserUpdated();
    }

    setMessage("");
    setShowConfirm(false);
    setShowCancel(false);
    onClose();
  };

  const handleCancelUpdate = () => {
    setShowConfirm(false);
  };

  const handleCancel = () => {
    setMessage("");
    setShowCancel(true); // show confirmation modal
  };

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
                <Text style={styles.label}>Full Name:</Text>
                <TextInput
                  style={styles.input}
                  value={fullName}
                  onChangeText={setFullName}
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
                  onValueChange={(itemValue) => setRole(itemValue)}
                  style={styles.picker}
                  mode="dropdown"
                >
                  <Picker.Item label="Change Role" value="" />
                  <Picker.Item label="user" value="user" />
                  <Picker.Item label="superuser" value="superuser" />
                  <Picker.Item label="admin" value="admin" />
                </Picker>
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
                  style={styles.saveBtn}
                  onPress={handleUpdateClick}
                >
                  <Text style={styles.btnText}>UPDATE</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={handleCancel}
                >
                  <Text style={styles.btnText}>CANCEL</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </View>
      {showCancel && (
        <AlertComp
          title="CANCEL EDIT"
          message="Are you sure you want to discard changes?"
          type="confirm"
          onConfirm={() => {
            setShowCancel(false);
            onClose(); // actually close modal
          }}
          onCancel={() => setShowCancel(false)} // keep editing
          confirmText="Yes, discard"
          cancelText="No, keep editing"
        />
      )}
      {showConfirm && (
        <AlertComp
          title="SAVE CHANGES"
          message="Are you sure you want to save changes?"
          type="confirm"
          onConfirm={handleConfirmUpdate}
          onCancel={handleCancelUpdate}
          confirmText="Yes, update"
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
