import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Modal,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { styles } from "../../stylesheets/styles";
//import ApproveMaintenance from "../MaintenanceLog/ApproveMaintenance";
import AlertComp from "../AlertComp";

export default function FlightLogEditDefects({
  visible,
  entry,
  onClose,
  onSave,
}) {
  const [formData, setFormData] = useState({
    aircraft: "",
    description: "",
    date: "",
    reportedBy: "",
    action: "",
  });

  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [pendingUpdate, setPendingUpdate] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    if (entry) {
      setFormData({
        aircraft: entry.aircraft || "",
        description: entry.destination || "",
        date: entry.date || "",
        reportedBy: entry.fullname || "",
        action: entry.defectAction || "",
      });
      setValidationErrors({});
    }
  }, [entry]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    if (validationErrors[field]) {
      setValidationErrors((prev) => ({
        ...prev,
        [field]: "",
      }));
    }
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.action || formData.action.trim() === "") {
      errors.action = "Action is required";
    }

    if (!formData.description || formData.description.trim() === "") {
      errors.description = "Description is required";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) {
      return;
    }

    const updatedEntry = {
      ...entry,
      defectAction: formData.action,
      destination: formData.description,
      status: "pending_approval",
    };

    setPendingUpdate(updatedEntry);
    setShowSaveConfirm(true);
  };

  const confirmSave = () => {
    setShowSaveConfirm(false);
    setShowApproveModal(true);
  };

  const handleApproveConfirm = (username, password) => {
    console.log("Defect edit approved with:", { username, password });

    if (pendingUpdate) {
      const approvedUpdate = {
        ...pendingUpdate,
        approvedBy: username,
        approvedAt: new Date().toISOString(),
        status: "approved",
      };
      onSave?.(approvedUpdate);
    }

    setShowApproveModal(false);
    setPendingUpdate(null);
    onClose();
  };

  const handleApproveCancel = () => {
    setShowApproveModal(false);
    setPendingUpdate(null);
  };

  const handleDiscard = () => {
    onClose();
  };

  if (!visible || !entry) return null;

  return (
    <>
      <Modal transparent visible={visible} animationType="fade">
        <View style={styles.newEntryOverlay}>
          <View style={[styles.newEntryCard, { maxWidth: 700 }]}>
            <Text style={styles.newEntryTitle}>Edit Defect Entry</Text>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ padding: 4 }}
            >
              {/* Aircraft Selection - Read Only */}
              <View style={styles.newEntryField}>
                <Text style={styles.newEntryLabel}>Aircraft</Text>
                <TextInput
                  style={[styles.newEntryInput, { backgroundColor: "#f0f0f0" }]}
                  value={formData.aircraft}
                  editable={false}
                />
              </View>

              {/* Date - Read Only */}
              <View style={styles.newEntryField}>
                <Text style={styles.newEntryLabel}>Date</Text>
                <TextInput
                  style={[styles.newEntryInput, { backgroundColor: "#f0f0f0" }]}
                  value={formData.date}
                  editable={false}
                />
              </View>

              {/* Reported By - Read Only */}
              <View style={styles.newEntryField}>
                <Text style={styles.newEntryLabel}>Reported By</Text>
                <TextInput
                  style={[styles.newEntryInput, { backgroundColor: "#f0f0f0" }]}
                  value={formData.reportedBy}
                  editable={false}
                />
              </View>

              {/* Description - Editable */}
              <View style={styles.newEntryField}>
                <Text style={styles.newEntryLabel}>Description *</Text>
                <TextInput
                  style={[
                    styles.newEntryTextArea,
                    validationErrors.description && { borderColor: "#dc3545" },
                  ]}
                  value={formData.description}
                  onChangeText={(t) => handleChange("description", t)}
                  placeholder="Enter defect description..."
                  multiline
                  numberOfLines={4}
                />
                {validationErrors.description && (
                  <Text
                    style={{ color: "#dc3545", fontSize: 12, marginTop: 4 }}
                  >
                    {validationErrors.description}
                  </Text>
                )}
              </View>

              {/* Action - Editable */}
              <View style={styles.newEntryField}>
                <Text style={styles.newEntryLabel}>Action *</Text>
                <TextInput
                  style={[
                    styles.newEntryTextArea,
                    validationErrors.action && { borderColor: "#dc3545" },
                  ]}
                  value={formData.action}
                  onChangeText={(t) => handleChange("action", t)}
                  placeholder="Enter required action..."
                  multiline
                  numberOfLines={4}
                />
                {validationErrors.action && (
                  <Text
                    style={{ color: "#dc3545", fontSize: 12, marginTop: 4 }}
                  >
                    {validationErrors.action}
                  </Text>
                )}
              </View>

              <View style={styles.newEntryButtonRow}>
                <TouchableOpacity
                  style={styles.primaryAlertBtn}
                  onPress={handleSave}
                >
                  <Text style={styles.secondaryBtnTxt}>Update</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryBtn}
                  onPress={handleDiscard}
                >
                  <Text style={styles.secondaryBtnTxt}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Save Confirmation */}
      {showSaveConfirm && (
        <AlertComp
          title="SUBMIT LOG"
          message="Are you sure you want to submit log?"
          type="confirm"
          visible={showSaveConfirm}
          onConfirm={confirmSave}
          onCancel={() => setShowSaveConfirm(false)}
          confirmText="YES"
          cancelText="CANCEL"
        />
      )}

      {/* Approval Modal */}
      <ApproveMaintenance
        visible={showApproveModal}
        aircraftNumber={formData.aircraft}
        onConfirm={handleApproveConfirm}
        onCancel={handleApproveCancel}
      />
    </>
  );
}
