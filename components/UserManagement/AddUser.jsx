import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  Platform,
  ScrollView,
  Alert,
  Image,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { styles } from "../../stylesheets/styles";
import { launchImageLibrary } from "react-native-image-picker";
import AlertComp from "../AlertComp";
import { API_BASE } from "../../utilities/API_BASE";

export default function AddUser({ visible, onClose, onUserAdded }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [isEmailValid, setIsEmailValid] = useState(false);
  const [username, setUsername] = useState("");
  const [position, setPosition] = useState("");
  const [accessLevel, setAccessLevel] = useState("");
  const [joinedDate, setJoinedDate] = useState("");
  const [message, setMessage] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState("");
  const [previewUri, setPreviewUri] = useState(null);
  const fileInputRef = useRef(null);

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

  useEffect(() => {
    if (position) {
      setAccessLevel(getAccessLevel(position));
    } else {
      setAccessLevel("");
    }
  }, [position]);

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    setJoinedDate(today);
  }, []);

  useEffect(() => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    setIsEmailValid(emailRegex.test(email.trim()));
  }, [email]);

  useEffect(() => {
    if (!firstName || !lastName) {
      setUsername("");
      return;
    }

    const generated = `${lastName}${firstName[0]}`
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/[^a-z0-9]/g, "");

    setUsername(generated);
  }, [firstName, lastName]);
  const capitalizeWords = (text) => {
    if (!text) return "";
    return text
      .split(" ")
      .map((word) =>
        word ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() : "",
      )
      .join(" ");
  };
  const validateForm = () => {
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

    if (!isEmailValid) {
      setMessage("Invalid email format.");
      return false;
    }

    return true;
  };

  const handleSaveClick = () => {
    const isValid = validateForm();
    console.log(isValid);
    if (isValid) setShowConfirm(true);
  };

  const handleConfirmSave = async () => {
    const tempPassword = Math.random().toString(36).slice(-8);

    const formData = new FormData();
    formData.append("firstName", firstName.trim());
    formData.append("lastName", lastName.trim());
    formData.append("email", email.trim());
    formData.append("username", username.trim());
    formData.append("password", tempPassword);
    formData.append("position", position);
    formData.append("access", accessLevel);
    formData.append("dateCreated", new Date().toISOString());

    if (file) {
      if (Platform.OS === "web") {
        formData.append("image", file.rawFile);
      } else {
        formData.append("image", {
          uri:
            Platform.OS === "ios" ? file.uri.replace("file://", "") : file.uri,
          name: file.fileName,
          type: file.type,
        });
      }
    }

    try {
      const response = await fetch(`${API_BASE}/api/user/create`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        console.log(data.message);
        setMessage(data.message || "User already exists.");
        setShowConfirm(false);
        return;
      }

      Alert.alert("User added successfully.");
      if (onUserAdded) onUserAdded();
      resetForm();
      onClose();
    } catch (error) {
      console.error("Error adding user:", error);
      setMessage("Server error. Please try again.");
      setShowConfirm(false);
    }
  };

  // 5. Update pickImage function
  const pickImage = async () => {
    if (Platform.OS === "web") {
      fileInputRef.current?.click();
      return;
    }

    const options = {
      mediaType: "photo",
      quality: 0.8,
    };

    const result = await launchImageLibrary(options);

    if (result.didCancel) {
      console.log("User cancelled image picker");
    } else if (result.errorCode) {
      console.log("ImagePicker Error: ", result.errorMessage);
    } else if (result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      setFile({
        uri: asset.uri,
        fileName: asset.fileName || "profile.jpg",
        type: asset.type || "image/jpeg",
      });
      setFileName(asset.fileName || "profile.jpg");
      setPreviewUri(asset.uri);
    }
  };

  const resetForm = () => {
    setFirstName("");
    setLastName("");
    setEmail("");
    setUsername("");
    setPosition("");
    setAccessLevel("");
    setJoinedDate("");
    setFile(null);
    setFileName("");
    setPreviewUri(null);
    setMessage("");
    setShowConfirm(false);
  };

  const handleCancelSave = () => setShowConfirm(false);
  const handleCancel = () => {
    setMessage("");
    onClose();
  };
  if (!visible) return null;

  const Content = (
    <View style={styles.addUserOverlay}>
      <View style={[styles.addUserCard, { width: 500 }]}>
        <Text style={styles.addUserTitle}>ADD USER</Text>
        <View style={styles.addUserContent}>
          {/* Image Upload Section */}
          <View style={{ alignItems: "center", marginBottom: 10 }}>
            {/* Hidden file input */}
            {Platform.OS === "web" && (
              <input
                type="file"
                accept=".jpg,.png"
                ref={fileInputRef}
                style={{ display: "none" }}
                onChange={(e) => {
                  const selectedFile = e.target.files[0];
                  if (selectedFile) {
                    setFile({
                      uri: URL.createObjectURL(selectedFile),
                      fileName: selectedFile.name,
                      type: selectedFile.type,
                      rawFile: selectedFile,
                    });
                    setFileName(selectedFile.name);
                    setPreviewUri(URL.createObjectURL(selectedFile));
                  }
                }}
              />
            )}

            {/* Plus button */}
            <TouchableOpacity
              style={[
                styles.imageBox,
                { overflow: "hidden", width: 80, height: 80 },
              ]}
              onPress={pickImage}
            >
              {previewUri ? (
                <Image
                  source={{ uri: previewUri }}
                  style={{ width: "100%", height: "100%" }}
                />
              ) : (
                <Text style={styles.plus}>＋</Text>
              )}
            </TouchableOpacity>

            {/* {fileName ? (
              <Text
                style={{
                  marginTop: 4,
                  fontSize: 12,
                  textAlign: "center",
                  width: 100,
                }}
              >
                {fileName}
              </Text>
            ) : null} */}
          </View>

          <ScrollView style={styles.form}>
            <View style={styles.formRow}>
              <Text style={styles.label}>
                First Name: <Text style={{ color: "#f33434" }}>*</Text>
              </Text>
              <TextInput
                maxLength={50}
                style={styles.input}
                value={firstName}
                onChangeText={(text) => setFirstName(capitalizeWords(text))}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.formRow}>
              <Text style={styles.label}>
                Last Name: <Text style={{ color: "#f33434" }}>*</Text>
              </Text>
              <TextInput
                maxLength={50}
                style={styles.input}
                value={lastName}
                onChangeText={(text) => setLastName(capitalizeWords(text))}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.formRow}>
              <Text style={styles.label}>
                Email: <Text style={{ color: "#f33434" }}>*</Text>
              </Text>
              <TextInput
                maxLength={100}
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
              />
            </View>
            {email.length > 0 && !isEmailValid && (
              <Text style={{ color: "red" }}>Invalid email format</Text>
            )}

            <View style={styles.formRow}>
              <Text style={styles.label}>Username:</Text>
              <TextInput
                maxLength={30}
                style={styles.input}
                value={username}
                onChangeText={setUsername}
                disabled
              />
            </View>

            <View style={styles.formRow}>
              <Text style={styles.label}>
                Position: <Text style={{ color: "#f33434" }}>*</Text>
              </Text>
              <Picker
                selectedValue={position}
                onValueChange={(value) => setPosition(value)}
                style={styles.picker}
              >
                <Picker.Item label="Select Position" value="" />
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
              <TextInput style={styles.input} value={accessLevel} disabled />
            </View>

            <View style={styles.formRow}>
              <Text style={styles.label}>Joined Date:</Text>
              <TextInput style={styles.input} value={joinedDate} disabled />
            </View>

            {message ? (
              <Text style={{ color: "red", marginTop: 6, fontSize: 12 }}>
                {message}
              </Text>
            ) : null}

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.primaryAlertBtn}
                onPress={handleSaveClick}
              >
                <Text style={styles.primaryBtnTxt}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={handleCancel}
              >
                <Text style={styles.secondaryBtnTxt}>Cancel</Text>
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
          visible={showConfirm}
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
