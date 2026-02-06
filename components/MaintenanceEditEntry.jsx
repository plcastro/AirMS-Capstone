import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Modal,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { styles } from "../stylesheets/styles";
import ApproveMaintenance from "./ApproveMaintenance";

export default function EditEntry({ visible, entry, onClose, onSave }) {
  const [formData, setFormData] = useState({
    aircraft: "",
    defectDescription: "",
    dateDefectDiscovered: "",
    correctiveActionDone: "N/A",
    dateDefectRectified: "N/A",
  });
  
  const [dateError, setDateError] = useState("");
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [pendingUpdate, setPendingUpdate] = useState(null);

  useEffect(() => {
    if (entry) {
      setFormData({
        aircraft: entry.aircraft || "",
        defectDescription: entry.defects || "",
        dateDefectDiscovered: entry.dateDefectDiscovered || "",
        correctiveActionDone: entry.correctiveActionDone || "N/A",
        dateDefectRectified: entry.dateDefectRectified || "N/A",
      });
      setDateError("");
    }
  }, [entry]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const convertToYYYYMMDD = (dateString) => {
    if (!dateString || dateString === "N/A" || dateString.trim() === "") return "";
    
    const [month, day, year] = dateString.split("/");
    if (month && day && year) {
      return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }
    return "";
  };

  const parseDate = (dateString) => {
    if (!dateString || dateString === "N/A") return null;
    const [month, day, year] = dateString.split("/");
    return new Date(year, month - 1, day);
  };

  const handleDateChange = (e, field) => {
    const selectedDate = e.target.value;
    if (selectedDate) {
      const [year, month, day] = selectedDate.split("-");
      const newDate = `${month}/${day}/${year}`;
      
      if (field === "dateDefectRectified" && formData.dateDefectDiscovered) {
        const rectifiedDate = parseDate(newDate);
        const discoveredDate = parseDate(formData.dateDefectDiscovered);
        
        if (rectifiedDate && discoveredDate && rectifiedDate < discoveredDate) {
          setDateError("Date Defect Rectified cannot be before Date Defect Discovered");
        } else {
          setDateError("");
        }
      }
      
      handleChange(field, newDate);
    } else {
      handleChange(field, "N/A");
      if (field === "dateDefectRectified") {
        setDateError("");
      }
    }
  };

  const handleSave = () => {
    if (!formData.correctiveActionDone || formData.correctiveActionDone === "N/A") {
      alert("Please fill in Corrective Action Done");
      return;
    }

    if (dateError) {
      alert(dateError);
      return;
    }

    if (formData.dateDefectRectified && formData.dateDefectRectified !== "N/A") {
      const rectifiedDate = parseDate(formData.dateDefectRectified);
      const discoveredDate = parseDate(formData.dateDefectDiscovered);
      
      if (rectifiedDate && discoveredDate && rectifiedDate < discoveredDate) {
        alert("Date Defect Rectified cannot be before Date Defect Discovered");
        return;
      }
    }

    const updatedEntry = {
      ...entry,
      defects: formData.defectDescription,
      correctiveActionDone: formData.correctiveActionDone,
      dateDefectRectified: formData.dateDefectRectified,
    };

    setPendingUpdate(updatedEntry);
    setShowApproveModal(true);
  };

  const handleApproveConfirm = (username, password) => {
    console.log("Approved with:", { username, password });
    
    // Proceed with the update
    if (pendingUpdate) {
      onSave?.(pendingUpdate);
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

  const getMinDate = () => {
    if (!formData.dateDefectDiscovered) return "";
    return convertToYYYYMMDD(formData.dateDefectDiscovered);
  };

  return (
    <>
      <Modal transparent visible={visible} animationType="fade">
        <View style={styles.newEntryOverlay}>
          <View style={styles.newEntryCard}>
            <Text style={styles.newEntryTitle}>
              Edit Maintenance Entry
            </Text>

            <ScrollView keyboardShouldPersistTaps="handled">
              <View style={styles.newEntryField}>
                <Text style={styles.newEntryLabel}>Aircraft</Text>
                <TextInput
                  style={[styles.newEntryInput, { backgroundColor: "#f0f0f0" }]}
                  value={formData.aircraft}
                  editable={false}
                />
              </View>

              <View style={styles.newEntryField}>
                <Text style={styles.newEntryLabel}>Defect Description</Text>
                <TextInput
                  style={[styles.newEntryTextArea, { backgroundColor: "#f0f0f0" }]}
                  value={formData.defectDescription}
                  editable={false}
                  multiline
                  numberOfLines={4}
                />
              </View>

              <View style={styles.newEntryField}>
                <Text style={styles.newEntryLabel}>Date Defect Discovered</Text>
                <TextInput
                  style={[styles.newEntryInput, { backgroundColor: "#f0f0f0" }]}
                  value={formData.dateDefectDiscovered}
                  editable={false}
                />
              </View>

              <View style={styles.newEntryField}>
                <Text style={styles.newEntryLabel}>Corrective Action Done *</Text>
                <TextInput
                  style={styles.newEntryInput}
                  value={formData.correctiveActionDone}
                  onChangeText={(t) => handleChange("correctiveActionDone", t)}
                  placeholder="Enter corrective action taken..."
                />
              </View>

              <View style={styles.newEntryField}>
                <Text style={styles.newEntryLabel}>Date Defect Rectified *</Text>
                <input
                  type="date"
                  style={{
                    ...styles.newEntryInput,
                    padding: 12,
                    borderWidth: 1,
                    borderColor: dateError ? "#dc3545" : "#ccc",
                    borderRadius: 4,
                    fontSize: 16,
                    width: "100%",
                    boxSizing: "border-box",
                    backgroundColor: "#fff",
                  }}
                  value={convertToYYYYMMDD(formData.dateDefectRectified)}
                  onChange={(e) => handleDateChange(e, "dateDefectRectified")}
                  min={getMinDate()}
                  max={new Date().toISOString().split("T")[0]}
                />
                {dateError ? (
                  <Text style={{ color: "#dc3545", fontSize: 12, marginTop: 4 }}>
                    {dateError}
                  </Text>
                ) : null}
                <Text style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
                  Must be on or after {formData.dateDefectDiscovered}
                </Text>
              </View>

              <View style={styles.newEntryButtonRow}>
                <TouchableOpacity
                  style={styles.newEntrySaveBtn}
                  onPress={handleSave}
                >
                  <Text style={styles.newEntryBtnText}>Update</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.newEntryDiscardBtn}
                  onPress={handleDiscard}
                >
                  <Text style={styles.newEntryBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

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