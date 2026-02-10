import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Modal,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { styles } from "../../stylesheets/styles";

export default function MaintenanceNewEntry({ visible, onClose, onSave }) {
  const [formData, setFormData] = useState({
    reportedBy: "",
    aircraft: "",
    defectDescription: "",
    dateDefectDiscovered: "",
    correctiveActionDone: "N/A",
    dateDefectRectified: "N/A",
  });

  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleDateChange = (e) => {
    const selectedDate = e.target.value;
    if (selectedDate) {
      const [year, month, day] = selectedDate.split("-");
      handleChange("dateDefectDiscovered", `${month}/${day}/${year}`);
    } else {
      handleChange("dateDefectDiscovered", "");
    }
  };

  const handleSave = () => {
    if (!formData.aircraft || !formData.defectDescription) {
      alert("Please fill in Aircraft and Defect Description");
      return;
    }

    const today = new Date();
    const todayFormatted = `${(today.getMonth() + 1)
      .toString()
      .padStart(2, "0")}/${today
      .getDate()
      .toString()
      .padStart(2, "0")}/${today.getFullYear()}`;

    onSave?.({
      aircraft: formData.aircraft,
      defectDescription: formData.defectDescription,
      dateDefectDiscovered: formData.dateDefectDiscovered || todayFormatted,
      correctiveActionDone: "N/A",
      dateDefectRectified: "N/A",
    });

    handleDiscard();
  };
  const handleDiscard = () => {
    setFormData({
      reportedBy: "",
      aircraft: "",
      defectDescription: "",
      dateDefectDiscovered: "",
      correctiveActionDone: "N/A",
      dateDefectRectified: "N/A",
    });
    onClose();
  };

  if (!visible) return null;

  const getDateInputValue = () => {
    if (!formData.dateDefectDiscovered) return "";

    const [month, day, year] = formData.dateDefectDiscovered.split("/");
    if (month && day && year) {
      return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }
    return "";
  };

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.newEntryOverlay}>
        <View style={styles.newEntryCard}>
          <Text style={styles.newEntryTitle}>Maintenance Log Entry</Text>

          <ScrollView keyboardShouldPersistTaps="handled">
            <View style={styles.newEntryField}>
              <Text style={styles.newEntryLabel}>Reported by</Text>
              <TextInput
                style={styles.newEntryInput}
                value={formData.reportedBy}
                onChangeText={(t) => handleChange("reportedBy", t)}
              />
            </View>

            <View style={styles.newEntryField}>
              <Text style={styles.newEntryLabel}>Aircraft *</Text>
              <TextInput
                style={styles.newEntryInput}
                value={formData.aircraft}
                onChangeText={(t) => handleChange("aircraft", t)}
                placeholder="Enter aircraft number"
              />
            </View>

            <View style={styles.newEntryField}>
              <Text style={styles.newEntryLabel}>Defect Description *</Text>
              <TextInput
                style={styles.newEntryTextArea}
                value={formData.defectDescription}
                onChangeText={(t) => handleChange("defectDescription", t)}
                multiline
                numberOfLines={4}
                placeholder="Enter defect description..."
              />
            </View>
            <View style={styles.newEntryField}>
              <Text style={styles.newEntryLabel}>Date Defect Discovered</Text>
              <TextInput
                type="date"
                style={{
                  ...styles.newEntryInput,
                  padding: 12,
                  borderWidth: 1,
                  borderColor: "#ccc",
                  borderRadius: 4,
                  fontSize: 16,
                  width: "100%",
                  boxSizing: "border-box",
                  backgroundColor: "#fff",
                }}
                value={getDateInputValue()}
                onChange={handleDateChange}
                max={new Date().toISOString().split("T")[0]}
              />
            </View>

            <View style={styles.newEntryField}>
              <Text style={styles.newEntryLabel}>Corrective Action Done</Text>
              <TextInput
                style={styles.newEntryInput}
                value="N/A"
                editable={false}
              />
            </View>

            <View style={styles.newEntryField}>
              <Text style={styles.newEntryLabel}>Date Defect Rectified</Text>
              <TextInput
                style={styles.newEntryInput}
                value="N/A"
                editable={false}
              />
            </View>

            <View style={styles.newEntryButtonRow}>
              <TouchableOpacity
                style={styles.newEntrySaveBtn}
                onPress={handleSave}
              >
                <Text style={styles.newEntryBtnText}>Save</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.newEntryDiscardBtn}
                onPress={handleDiscard}
              >
                <Text style={styles.newEntryBtnText}>Discard</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
