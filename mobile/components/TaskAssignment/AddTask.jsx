import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  TextInput,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  Platform,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import Button from "../Button";
import CheckBox from "../CheckBox";
import { styles } from "../../stylesheets/styles";
import { COLORS } from "../../stylesheets/colors";

const { width } = Dimensions.get("window");

export default function AddTask({
  visible,
  onClose,
  onAddTask,
  employees,
  taskOptions,
}) {
  const [taskTitle, setTaskTitle] = useState("");
  const [selectedAircraft, setSelectedAircraft] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState("");

  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(
    new Date(new Date().getTime() + 60 * 60 * 1000),
  ); // 1 hour later
  const [dueDate1, setDueDate1] = useState(new Date());
  const [dueDate2, setDueDate2] = useState(new Date());

  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [showDue1Picker, setShowDue1Picker] = useState(false);
  const [showDue2Picker, setShowDue2Picker] = useState(false);

  const [checklistItems, setChecklistItems] = useState([""]);

  // Update end date when start date changes (keep 1 hour later)
  useEffect(() => {
    const newEndDate = new Date(startDate.getTime() + 60 * 60 * 1000);
    setEndDate(newEndDate);
  }, [startDate]);

  // Aircraft options
  const aircraftOptions = [
    { id: "2810", name: "2810" },
    { id: "2811", name: "2811" },
    { id: "2812", name: "2812" },
  ];

  const handleAddChecklistItem = () => {
    setChecklistItems([...checklistItems, ""]);
  };

  const handleUpdateChecklistItem = (index, text) => {
    const updated = [...checklistItems];
    updated[index] = text;
    setChecklistItems(updated);
  };

  const handleDeleteChecklistItem = (index) => {
    const updated = checklistItems.filter((_, i) => i !== index);
    setChecklistItems(updated);
  };

  const confirmAdd = () => {
    const filteredChecklist = checklistItems.filter(
      (item) => item.trim() !== "",
    );

    const newTask = {
      id: Date.now().toString(),
      title: taskTitle,
      aircraft: selectedAircraft,
      dueDate: dueDate1.toISOString(),
      startDateTime: startDate.toISOString(),
      endDateTime: endDate.toISOString(),
      status: "Pending",
      priority: "Normal",
      maintenanceType: "Corrective Maintenance",
      assignedTo: selectedEmployee,
      assignedToName:
        employees.find((e) => e.id === selectedEmployee)?.name || "",
      checklistItems:
        filteredChecklist.length > 0
          ? filteredChecklist
          : ["New checklist item"],
    };
    onAddTask(newTask);
  };

  const confirmDiscard = () => {
    onClose();
  };

  const formatDateTime = (date) => {
    return (
      date.toLocaleDateString("en-US", {
        month: "2-digit",
        day: "2-digit",
        year: "numeric",
      }) +
      " " +
      date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
    );
  };

  const onStartChange = (event, selectedDate) => {
    setShowStartPicker(Platform.OS === "ios");
    if (selectedDate) {
      setStartDate(selectedDate);
    }
  };

  const onEndChange = (event, selectedDate) => {
    setShowEndPicker(Platform.OS === "ios");
    if (selectedDate) {
      setEndDate(selectedDate);
    }
  };

  const onDue1Change = (event, selectedDate) => {
    setShowDue1Picker(Platform.OS === "ios");
    if (selectedDate) {
      setDueDate1(selectedDate);
    }
  };

  const onDue2Change = (event, selectedDate) => {
    setShowDue2Picker(Platform.OS === "ios");
    if (selectedDate) {
      setDueDate2(selectedDate);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.alertOverlay}>
        <View
          style={[
            styles.alertContainer,
            {
              width: width > 425 ? 600 : "95%",
              maxHeight: "90%",
              padding: 20,
            },
          ]}
        >
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Task Section */}
            <Text
              style={[
                styles.alertTitle,
                { textAlign: "left", marginBottom: 15 },
              ]}
            >
              Task
            </Text>

            <TextInput
              style={[
                styles.formInput,
                {
                  borderRadius: 8,
                  marginBottom: 15,
                  backgroundColor: COLORS.grayLight,
                  paddingHorizontal: 12,
                },
              ]}
              placeholder="Maintenance Task"
              placeholderTextColor={COLORS.grayDark}
              value={taskTitle}
              onChangeText={setTaskTitle}
            />

            {/* Aircraft Section */}
            <Text
              style={{ fontSize: 14, color: COLORS.grayDark, marginBottom: 5 }}
            >
              Aircraft
            </Text>
            <View
              style={[
                styles.filterContainer,
                {
                  marginBottom: 15,
                  backgroundColor: COLORS.grayLight,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                  borderRadius: 8,
                  overflow: "hidden",
                },
              ]}
            >
              <Picker
                selectedValue={selectedAircraft}
                onValueChange={(itemValue) => setSelectedAircraft(itemValue)}
                style={{ height: 40 }}
                dropdownIconColor={COLORS.primaryLight}
              >
                <Picker.Item label="Tail No." value="" />
                {aircraftOptions.map((aircraft) => (
                  <Picker.Item
                    key={aircraft.id}
                    label={aircraft.name}
                    value={aircraft.id}
                  />
                ))}
              </Picker>
            </View>

            {/* Mechanic Section */}
            <Text
              style={{ fontSize: 14, color: COLORS.grayDark, marginBottom: 5 }}
            >
              Mechanic
            </Text>
            <View
              style={[
                styles.filterContainer,
                {
                  marginBottom: 15,
                  backgroundColor: COLORS.grayLight,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                  borderRadius: 8,
                  overflow: "hidden",
                },
              ]}
            >
              <Picker
                selectedValue={selectedEmployee}
                onValueChange={(itemValue) => setSelectedEmployee(itemValue)}
                style={{ height: 40 }}
                dropdownIconColor={COLORS.primaryLight}
              >
                <Picker.Item label="Pick Mechanic" value="" />
                {employees.map((emp) => (
                  <Picker.Item key={emp.id} label={emp.name} value={emp.id} />
                ))}
              </Picker>
            </View>

            {/* Start Date Section */}
            <Text
              style={{ fontSize: 14, color: COLORS.grayDark, marginBottom: 5 }}
            >
              Start Date and Time
            </Text>
            <TouchableOpacity
              style={{
                backgroundColor: COLORS.grayLight,
                borderWidth: 1,
                borderColor: COLORS.border,
                borderRadius: 8,
                padding: 12,
                marginBottom: 15,
              }}
              onPress={() => setShowStartPicker(true)}
            >
              <Text style={{ color: COLORS.grayDark }}>
                {formatDateTime(startDate)}
              </Text>
            </TouchableOpacity>

            {showStartPicker && (
              <DateTimePicker
                value={startDate}
                mode="datetime"
                display="default"
                onChange={onStartChange}
              />
            )}

            {/* End Date Section */}
            <Text
              style={{ fontSize: 14, color: COLORS.grayDark, marginBottom: 5 }}
            >
              End Date and Time
            </Text>
            <TouchableOpacity
              style={{
                backgroundColor: COLORS.grayLight,
                borderWidth: 1,
                borderColor: COLORS.border,
                borderRadius: 8,
                padding: 12,
                marginBottom: 20,
              }}
              onPress={() => setShowEndPicker(true)}
            >
              <Text style={{ color: COLORS.grayDark }}>
                {formatDateTime(endDate)}
              </Text>
            </TouchableOpacity>

            {showEndPicker && (
              <DateTimePicker
                value={endDate}
                mode="datetime"
                display="default"
                onChange={onEndChange}
              />
            )}

            {/* Checklist Section */}
            <Text style={{ fontSize: 18, fontWeight: "600", marginBottom: 15 }}>
              Checklist
            </Text>

            {checklistItems.map((item, index) => (
              <View key={index} style={{ marginBottom: 12 }}>
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
                >
                  <CheckBox
                    value={false}
                    onValueChange={() => {}}
                    disabled={true}
                    checkboxColor="#ccc"
                  />
                  <TextInput
                    style={{
                      flex: 1,
                      padding: 4,
                      borderBottomWidth: 1,
                      borderBottomColor: COLORS.border,
                      fontSize: 14,
                    }}
                    value={item}
                    onChangeText={(text) =>
                      handleUpdateChecklistItem(index, text)
                    }
                    placeholder="Checklist task"
                    placeholderTextColor={COLORS.grayDark}
                  />
                  <TouchableOpacity
                    onPress={() => handleDeleteChecklistItem(index)}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 4,
                      backgroundColor: COLORS.dangerBg,
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{
                        color: COLORS.dangerBorder,
                        fontSize: 18,
                        fontWeight: "bold",
                      }}
                    >
                      ×
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            {/* Add Checklist Button */}
            <TouchableOpacity
              onPress={handleAddChecklistItem}
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginTop: 10,
                marginBottom: 20,
              }}
            >
              <Text
                style={{
                  fontSize: 20,
                  color: COLORS.primaryLight,
                  marginRight: 8,
                }}
              >
                +
              </Text>
              <Text style={{ color: COLORS.primaryLight, fontSize: 16 }}>
                Add Checklist
              </Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Buttons */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginTop: 20,
              gap: 10,
            }}
          >
            <Button
              label="Discard Task"
              onPress={confirmDiscard}
              buttonStyle={[styles.secondaryAlertBtn, { flex: 1 }]}
              buttonTextStyle={styles.secondaryAlertBtnTxt}
            />
            <Button
              label="Add Task"
              onPress={confirmAdd}
              buttonStyle={[styles.primaryAlertBtn, { flex: 1 }]}
              buttonTextStyle={styles.primaryBtnTxt}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}
