import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
} from "react-native";
import { styles } from "../../stylesheets/styles";
import AlertComp from "../AlertComp";
import { API_BASE } from "../../utilities/API_BASE";

export default function EditComponent({ visible, onClose, onComponentEdited }) {
  const [partName, setPartName] = useState("");
  const [partLoc, setPartLoc] = useState("");
  const [currQty, setCurrQTY] = useState(0);
  const [pricePerUnit, setPricePerUnit] = useState(0);
  const [partsConsumed, setPartsConsumed] = useState(0);
  const [message, setMessage] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const validateForm = () => {
    // if (
    //   !firstName ||
    //   !lastName ||
    //   !email ||
    //   !username ||
    //   !position ||
    //   !accessLevel
    // ) {
    //   setMessage("Please fill in all required fields.");
    //   return false;
    // }
    // if (!isEmailValid) {
    //   setMessage("Invalid email format.");
    //   return false;
    // }
    // return true;
  };

  const handleSaveClick = () => {
    setShowConfirm(true);
  };

  const handleConfirmSave = () => {
    const updatedComponent = {
      partName,
      partLoc,
      currQty: Number(currQty),
      pricePerUnit: Number(pricePerUnit),
      partsConsumed: Number(partsConsumed),
    };
    onComponentEdited(updatedComponent);
    resetForm();
    onClose();
  };

  const resetForm = () => {
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
      <View
        style={[
          styles.addUserCard,
          { width: "90%", maxWidth: 500, alignSelf: "center" },
        ]}
      >
        <Text style={styles.addUserTitle}>EDIT COMPONENT</Text>
        <View style={styles.addUserContent}>
          {/* Image Upload Section */}

          <ScrollView style={styles.form}>
            <View style={styles.formRow}>
              <Text style={styles.label}>Part Name:</Text>
              <TextInput
                maxLength={50}
                style={styles.input}
                value={partName}
                onChangeText={setPartName}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.formRow}>
              <Text style={styles.label}>Part Location:</Text>
              <TextInput
                maxLength={50}
                style={styles.input}
                value={partLoc}
                onChangeText={setPartLoc}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.formRow}>
              <Text style={styles.label}>Current Quantity:</Text>
              <TextInput
                maxLength={100}
                style={styles.input}
                value={currQty}
                onChangeText={setCurrQTY}
                keyboardType="number-pad"
              />
            </View>

            <View style={styles.formRow}>
              <Text style={styles.label}>Price per Unit:</Text>
              <TextInput
                maxLength={30}
                style={styles.input}
                value={pricePerUnit}
                onChangeText={setPricePerUnit}
                keyboardType="number-pad"
              />
            </View>
            <View style={styles.formRow}>
              <Text style={styles.label}>Total Parts Consumed:</Text>
              <TextInput
                maxLength={30}
                style={styles.input}
                value={partsConsumed}
                onChangeText={setPartsConsumed}
                keyboardType="number-pad"
              />
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSaveClick}
              >
                <Text style={styles.btnText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>

      {showConfirm && (
        <AlertComp
          title="EDIT COMPONENT"
          message="Are you sure you want to save this component?"
          type="confirm"
          visible={showConfirm}
          onConfirm={handleConfirmSave}
          onCancel={handleCancelSave}
          confirmText="Yes, save"
          cancelText="Cancel"
        />
      )}
    </View>
  );

  //   if (Platform.OS === "web") return Content;
  return (
    <Modal transparent animationType="fade" visible={visible}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {Content}
      </KeyboardAvoidingView>
    </Modal>
  );
}
