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
import { API_BASE } from "../../utilities/API_BASE";

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
  const [inspectionType, setInspectionType] = useState("");

  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(
    new Date(new Date().getTime() + 60 * 60 * 1000),
  ); // 1 hour later
  const [dueDate1, setDueDate1] = useState(new Date(Date.now() + 24 * 60 * 60 * 1000)); // Tomorrow
  const [dueDate2, setDueDate2] = useState(new Date());

  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [showDue1Picker, setShowDue1Picker] = useState(false);
  const [showDue2Picker, setShowDue2Picker] = useState(false);
  const [loading, setLoading] = useState(false);

  const [checklistItems, setChecklistItems] = useState([]);

  const [aircraftOptions, setAircraftOptions] = useState([]);

  const [inspectionOptions, setInspectionOptions] = useState([]);

  // Update end date when start date changes (keep 1 hour later)
  useEffect(() => {
    const newEndDate = new Date(startDate.getTime() + 60 * 60 * 1000);
    setEndDate(newEndDate);
  }, [startDate]);

  useEffect(() => {
    setChecklistItems([]);
    setInspectionOptions([]);
    setInspectionType("");
  }, [selectedAircraft]);

  useEffect(() => {
    const fetchAircraft = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/aircraft/aircraft-tail-numbers`);

        if (!response.ok) throw new Error("Failed to fetch aircraft");

        const data = await response.json();

        const options = data.map(a => ({
          id: a.tailNum,
          name: a.tailNum
        }));

        setAircraftOptions(options);

      } catch (error) {
        console.error("Error fetching aircraft:", error);
      }
    };

    fetchAircraft();
  }, []);

  useEffect(() => {

    const fetchInspections = async () => {

      if (!selectedAircraft) return;

      try {

        const response = await fetch(`${API_BASE}/api/inspections/schedules`);

        if (!response.ok) throw new Error("Failed to fetch inspections");

        const data = await response.json();

        const options = data.map(i => ({
          id: i._id,
          name: i.inspectionName,
          aircraftModel: i.aircraftModel
        }));

        setInspectionOptions(options);

      } catch (error) {
        console.error("Error fetching inspections:", error);
      }

    };

    fetchInspections();

  }, [selectedAircraft]);

  const handleAddChecklistItem = () => {
    setChecklistItems([
      ...checklistItems,
      {
        taskId: "custom",
        taskName: "",
        inspectionTypeFull: "",
      },
    ]);
  };

  const handleUpdateChecklistItem = (index, text) => {
    const updated = [...checklistItems];
    updated[index] = {
      ...updated[index],
      taskName: text,
    };
    setChecklistItems(updated);
  };

  const handleDeleteChecklistItem = (index) => {
    const updated = checklistItems.filter((_, i) => i !== index);
    setChecklistItems(updated);
  };

  const confirmAdd = () => {
  const filteredChecklist = checklistItems.filter(
    (item) => item.taskName && item.taskName.trim() !== ""
  );

  const newTask = {
    id: Date.now().toString(),
    title: inspectionOptions.find(i => i.id === inspectionType)?.name || "",
    aircraft: selectedAircraft,
    dueDate: dueDate1.toISOString(),
    startDateTime: startDate.toISOString(),
    endDateTime: endDate.toISOString(),
    status: "Pending",
    priority: "Normal",
    maintenanceType: "LALALA",
    assignedTo: selectedEmployee,
    assignedToName: employees.find(e => e.id === selectedEmployee)?.name || "",
    // checklistItems now holds full task documents
    checklistItems: filteredChecklist.length > 0 ? filteredChecklist : [
      {
        inspectionName: "",
        aircraftModel: selectedAircraftModel || "",
        ata: { chapter: 0, chapterName: "", section: 0, sectionName: "" },
        taskId: "custom",
        taskName: "New checklist item",
        component: "",
        componentModel: "",
        inspectionType: "",
        inspectionTypeFull: "",
        documentation: "",
        description: "",
        correctiveAction: "",
        environmentalCondition: "",
        engineModel: "",
        conditions: { modificationStatus: "", modificationNumbers: [], effectivity: [] },
        interval: { flightHours: 0, calendarMonths: 0, specificInterval: "" },
        tailNumber: selectedAircraft,
      }
    ],
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
    <Modal visible={visible} animationType="fade" transparent>
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
            <Text
              style={[
                styles.alertTitle,
                { textAlign: "left", marginBottom: 15 },
              ]}
            >
              Task
            </Text>

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
                <Picker.Item key="placeholder-aircraft" label="Tail No." value="" />
                {aircraftOptions.map((aircraft) => (
                  <Picker.Item key={aircraft.id} label={aircraft.name} value={aircraft.id} />
                ))}
              </Picker>
            </View>

            {/* Inspection Section */}
            <Text
              style={{ fontSize: 14, color: COLORS.grayDark, marginBottom: 5 }}
            >
              Inspection
            </Text>

            <Picker
              selectedValue={inspectionType}
              onValueChange={async (itemValue) => {

                setInspectionType(itemValue);

                const selectedInspection = inspectionOptions.find(
                  (i) => i.id === itemValue
                );

                if (!selectedInspection) return;
                try {

                  const response = await fetch(
                    `${API_BASE}/api/inspections/tasks?tailNumber=${selectedAircraft}&inspectionName=${selectedInspection.name}`
                  );

                  if (!response.ok) {
                    throw new Error("Failed to fetch tasks");
                  }

                  const tasks = await response.json();

                  setChecklistItems(tasks);

                } catch (error) {
                  console.error("Error fetching tasks:", error);
                }
              }}
              style={{ height: 40, marginBottom: 15 }}
            >
              <Picker.Item key="placeholder-inspection" label="Pick Inspection" value="" />
              {inspectionOptions.map((inspection) => (
                <Picker.Item key={inspection.id} label={inspection.name} value={inspection.id} />
              ))}
            </Picker>


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
                <Picker.Item key="placeholder-mechanic" label="Pick Mechanic" value="" />
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

              <View key={index} style={{ flexDirection: "row", marginTop: 10 }}>

                <CheckBox value={false} disabled={true} />

                <View style={{ flex: 1, marginLeft: 10 }}>

                  <Text style={{ fontSize: 12, color: "#888" }}>
                    {item.taskId} • {item.inspectionTypeFull}
                  </Text>

                  <TextInput
                    style={{ borderBottomWidth: 1 }}
                    value={item.taskName}
                    onChangeText={(text) => handleUpdateChecklistItem(index, text)}
                  />

                </View>

                <TouchableOpacity onPress={() => handleDeleteChecklistItem(index)}>
                  <Text style={{ color: "red", fontSize: 18 }}>×</Text>
                </TouchableOpacity>

              </View>

            ))}

            {/* Add Checklist Button */}
            {/*<TouchableOpacity
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
            </TouchableOpacity>*/}
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
