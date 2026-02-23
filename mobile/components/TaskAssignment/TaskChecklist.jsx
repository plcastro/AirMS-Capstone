import React, { useState, useEffect } from "react";
import { View, Text, Modal, ScrollView, TextInput } from "react-native";
import Button from "../Button";
import { styles } from "../../stylesheets/styles";
import CheckBox from "../CheckBox";

export default function TaskChecklist({ visible, onClose, task }) {
  const [checklistState, setChecklistState] = useState([]);
  const [findings, setFindings] = useState("");

  useEffect(() => {
    if (task?.checklistItems) {
      setChecklistState(task.checklistItems.map(() => false));
    }
  }, [task]);

  const toggleItem = (index) => {
    const updated = [...checklistState];
    updated[index] = !updated[index];
    setChecklistState(updated);
  };

  const handleSave = () => {
    console.log("Checklist:", checklistState);
    console.log("Findings:", findings);
    onClose();
  };

  if (!task) return null;

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View
          style={{
            maxWidth: "95%",
            width: 500,
            maxHeight: "100%",
            backgroundColor: "#fff",
            borderRadius: 10,
            padding: 20,
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: "bold", marginBottom: 10 }}>
            {task.title}
          </Text>

          <ScrollView style={{ marginBottom: 20 }}>
            {task.checklistItems.map((item, index) => (
              <CheckBox
                key={index}
                title={item}
                value={checklistState[index]} // controlled from parent
                onValueChange={() => toggleItem(index)}
                checkboxStyle={styles.checkBox}
              />
            ))}

            <Text style={{ marginTop: 15, fontWeight: "600" }}>Findings:</Text>
            <TextInput
              style={[styles.formInput, { height: 150 }]}
              multiline
              value={findings}
              onChangeText={setFindings}
              placeholder="Enter your findings here..."
            />
          </ScrollView>

          <View
            style={{ flexDirection: "row", justifyContent: "space-between" }}
          >
            <Button
              label="Cancel"
              onPress={onClose}
              buttonStyle={[
                styles.secondaryBtn,
                { width: 200, maxWidth: "48%" },
              ]}
              buttonTextStyle={styles.secondaryBtnTxt}
            />
            <Button
              label="Save"
              onPress={handleSave}
              buttonStyle={[
                styles.primaryAlertBtn,
                { width: 200, maxWidth: "48%" },
              ]}
              buttonTextStyle={styles.primaryBtnTxt}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}
