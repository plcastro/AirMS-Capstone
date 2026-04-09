import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  Platform,
  Alert,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import Button from "../Button";
import CheckBox from "../CheckBox";
import { styles } from "../../stylesheets/styles";
import { COLORS } from "../../stylesheets/colors";
import { API_BASE } from "../../utilities/API_BASE";

const { width } = Dimensions.get("window");
const INSPECTION_NAME_ALIASES = {
  "TBO Inspection": ["Time Between Overhaul"],
  "OC Inspection": ["ON CONDITION (OC)"],
  "OTL Inspection": ["OPERATING TIME LIMIT (OTL)"],
  "ALF Inspection": ["ALF"],
  "10 FH Inspection": ["10 FH"],
  "10 FH - 1 M Inspection": ["10 FH // 1 M"],
  "12 M Inspection": ["12 M"],
  "24 M Inspection": ["24 M"],
  "48 M Inspection": ["48 M"],
  "150 FH Inspection": ["150 FH"],
  "150 FH - 12 M Inspection": ["150 FH / 12 M", "150 FH // 12 M"],
  "750 FH Inspection": ["750 FH"],
  "750 FH - 24 M Inspection": ["750 FH // 24 M", "750 FH / 24 M"],
  "1500 FH Inspection": ["1500 FH"],
  "1500 FH - 48 M Inspection": ["1500 FH // 48 M", "1500 FH / 48 M"],
};

const getPickerValue = (event) => {
  if (event?.type === "dismissed") {
    return null;
  }

  return event;
};

export default function AddTask({ visible, onClose, onAddTask, employees }) {
  const [selectedAircraft, setSelectedAircraft] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [inspectionType, setInspectionType] = useState("");
  const [selectedInspection, setSelectedInspection] = useState(null);

  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(
    new Date(new Date().getTime() + 60 * 60 * 1000),
  ); // 1 hour later
  const [dueDate1, setDueDate1] = useState(
    new Date(Date.now() + 24 * 60 * 60 * 1000),
  ); // Tomorrow

  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [showDue1Picker, setShowDue1Picker] = useState(false);
  const [showAircraftDropdown, setShowAircraftDropdown] = useState(false);
  const [showInspectionDropdown, setShowInspectionDropdown] = useState(false);
  const [showMechanicDropdown, setShowMechanicDropdown] = useState(false);
  const [loading, setLoading] = useState(false);

  const [checklistItems, setChecklistItems] = useState([]);

  const [aircraftOptions, setAircraftOptions] = useState([]);

  const [inspectionOptions, setInspectionOptions] = useState([]);

  const fetchInspectionTasks = async (inspection) => {
    const inspectionNames = [
      inspection.name,
      ...(INSPECTION_NAME_ALIASES[inspection.name] || []),
    ];

    for (const inspectionName of inspectionNames) {
      const response = await fetch(
        `${API_BASE}/api/inspections/tasks?inspectionName=${encodeURIComponent(inspectionName)}&aircraftModel=${encodeURIComponent(inspection.aircraftModel || "")}`,
      );

      if (!response.ok) {
        continue;
      }

      const tasks = await response.json();

      if (Array.isArray(tasks) && tasks.length > 0) {
        return tasks;
      }
    }

    return [];
  };

  // Update end date when start date changes (keep 1 hour later)
  useEffect(() => {
    const newEndDate = new Date(startDate.getTime() + 60 * 60 * 1000);
    setEndDate(newEndDate);
  }, [startDate]);

  useEffect(() => {
    setChecklistItems([]);
    setInspectionType("");
    setSelectedInspection(null);
  }, [selectedAircraft]);

  useEffect(() => {
    const fetchAircraft = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `${API_BASE}/api/parts-monitoring/aircraft-list`,
        );

        if (!response.ok) throw new Error("Failed to fetch aircraft");

        const data = await response.json();
        const aircraftList = Array.isArray(data?.data) ? data.data : [];

        const options = aircraftList.map((aircraft) => ({
          id: aircraft,
          name: aircraft,
        }));

        setAircraftOptions(options);
      } catch (error) {
        console.error("Error fetching aircraft:", error);
        Alert.alert("Error", "Failed to fetch aircraft");
      } finally {
        setLoading(false);
      }
    };

    fetchAircraft();
  }, []);

  useEffect(() => {
    const fetchInspections = async () => {
      if (!visible) return;

      try {
        setLoading(true);
        const response = await fetch(`${API_BASE}/api/inspections/schedules`);

        if (!response.ok) throw new Error("Failed to fetch inspections");

        const data = await response.json();

        const options = Array.from(
          new Map(
            data.map((inspection) => [
              inspection._id,
              {
                id: inspection._id,
                name: inspection.inspectionName,
                aircraftModel: inspection.aircraftModel,
              },
            ]),
          ).values(),
        );

        setInspectionOptions(options);
      } catch (error) {
        console.error("Error fetching inspections:", error);
        Alert.alert("Error", "Failed to fetch inspection schedules");
      } finally {
        setLoading(false);
      }
    };

    fetchInspections();
  }, [visible]);

  const confirmAdd = () => {
    if (!selectedAircraft || !inspectionType || !selectedEmployee) {
      Alert.alert(
        "Missing fields",
        "Please select an aircraft, inspection, and mechanic.",
      );
      return;
    }

    const filteredChecklist = checklistItems.filter(
      (item) => item.taskName && item.taskName.trim() !== "",
    );

    const newTask = {
      id: Date.now().toString(),
      title: inspectionOptions.find((i) => i.id === inspectionType)?.name || "",
      aircraft: selectedAircraft,
      dueDate: dueDate1.toISOString(),
      startDateTime: startDate.toISOString(),
      endDateTime: endDate.toISOString(),
      status: "Pending",
      priority: "Normal",
      maintenanceType: "Inspection",
      assignedTo: selectedEmployee,
      assignedToName:
        employees.find((e) => e.id === selectedEmployee)?.name || "",
      checklistItems:
        filteredChecklist.length > 0
          ? filteredChecklist
          : [
              {
                inspectionName: selectedInspection?.name || "",
                aircraftModel: selectedInspection?.aircraftModel || "",
                ata: {
                  chapter: 0,
                  chapterName: "",
                  section: 0,
                  sectionName: "",
                },
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
                conditions: {
                  modificationStatus: "",
                  modificationNumbers: [],
                  effectivity: [],
                },
                interval: {
                  flightHours: 0,
                  calendarMonths: 0,
                  specificInterval: "",
                },
              },
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
    setShowStartPicker(false);
    if (getPickerValue(event) === null) {
      return;
    }
    if (selectedDate) {
      setStartDate(selectedDate);
    }
  };

  const onEndChange = (event, selectedDate) => {
    setShowEndPicker(false);
    if (getPickerValue(event) === null) {
      return;
    }
    if (selectedDate) {
      setEndDate(selectedDate);
    }
  };

  const onDue1Change = (event, selectedDate) => {
    setShowDue1Picker(false);
    if (getPickerValue(event) === null) {
      return;
    }
    if (selectedDate) {
      setDueDate1(selectedDate);
    }
  };

  const closeAllDropdowns = () => {
    setShowAircraftDropdown(false);
    setShowInspectionDropdown(false);
    setShowMechanicDropdown(false);
  };

  const renderDropdownField = ({
    label,
    value,
    placeholder,
    options,
    visible,
    onToggle,
    onSelect,
    disabled = false,
  }) => (
    <View style={{ marginBottom: 15 }}>
      <Text style={{ fontSize: 14, color: COLORS.grayDark, marginBottom: 5 }}>
        {label}
      </Text>

      <TouchableOpacity
        activeOpacity={0.8}
        disabled={disabled}
        onPress={() => {
          if (!disabled) {
            const nextVisible = !visible;
            closeAllDropdowns();
            onToggle(nextVisible);
          }
        }}
        style={{
          minHeight: 48,
          backgroundColor: COLORS.grayLight,
          borderWidth: 1,
          borderColor: COLORS.border,
          borderRadius: 8,
          paddingHorizontal: 14,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Text
          numberOfLines={1}
          style={{
            flex: 1,
            marginRight: 10,
            fontSize: 15,
            color: value ? COLORS.black : COLORS.grayDark,
          }}
        >
          {value || placeholder}
        </Text>

        <Text style={{ color: COLORS.primaryLight, fontSize: 16 }}>
          {visible ? "▲" : "▼"}
        </Text>
      </TouchableOpacity>

      {visible && !disabled && (
        <View
          style={{
            marginTop: 6,
            backgroundColor: COLORS.white,
            borderWidth: 1,
            borderColor: COLORS.border,
            borderRadius: 8,
            maxHeight: 220,
            overflow: "hidden",
          }}
        >
          <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled">
            {options.map((item, index) => (
              <TouchableOpacity
                key={`${item.value}-${index}`}
                activeOpacity={0.85}
                onPress={() => {
                  onSelect(item.value);
                  closeAllDropdowns();
                }}
                style={{
                  paddingVertical: 13,
                  paddingHorizontal: 14,
                  borderBottomWidth: index < options.length - 1 ? 1 : 0,
                  borderBottomColor: COLORS.border,
                  backgroundColor:
                    value === item.label
                      ? `${COLORS.primaryLight}12`
                      : COLORS.white,
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    color: COLORS.black,
                  }}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );

  const selectedAircraftLabel =
    aircraftOptions.find((aircraft) => aircraft.id === selectedAircraft)
      ?.name || "";
  const selectedInspectionLabel =
    inspectionOptions.find((inspection) => inspection.id === inspectionType)
      ?.name || "";
  const selectedEmployeeLabel =
    employees.find((emp) => emp.id === selectedEmployee)?.name || "";

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.alertOverlay}>
        <View
          style={[
            styles.alertContainer,
            {
              width: width > 425 ? 600 : width - 32,
              maxWidth: "92%",
              maxHeight: "90%",
              paddingVertical: 18,
              paddingHorizontal: 14,
            },
          ]}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text
              style={[
                styles.alertTitle,
                { textAlign: "left", marginBottom: 15 },
              ]}
            >
              Task
            </Text>

            {/* Aircraft Section */}
            {renderDropdownField({
              label: "Aircraft",
              value: selectedAircraftLabel,
              placeholder: "Tail No.",
              options: aircraftOptions.map((aircraft) => ({
                label: aircraft.name,
                value: aircraft.id,
              })),
              visible: showAircraftDropdown,
              onToggle: setShowAircraftDropdown,
              onSelect: setSelectedAircraft,
            })}

            {/* Inspection Section */}
            {renderDropdownField({
              label: "Inspection",
              value: selectedInspectionLabel,
              placeholder:
                loading && inspectionOptions.length === 0
                  ? "Loading inspections..."
                  : "Pick Inspection",
              options: inspectionOptions.map((inspection) => ({
                label: inspection.name,
                value: inspection.id,
              })),
              visible: showInspectionDropdown,
              onToggle: setShowInspectionDropdown,
              onSelect: async (itemValue) => {
                setInspectionType(itemValue);

                const matchedInspection = inspectionOptions.find(
                  (i) => i.id === itemValue,
                );

                setSelectedInspection(matchedInspection || null);
                setChecklistItems([]);

                if (!matchedInspection) return;
                try {
                  setLoading(true);
                  const tasks = await fetchInspectionTasks(matchedInspection);
                  setChecklistItems(tasks);
                } catch (error) {
                  console.error("Error fetching tasks:", error);
                  Alert.alert("Error", "Failed to fetch inspection tasks");
                } finally {
                  setLoading(false);
                }
              },
              disabled: loading && inspectionOptions.length === 0,
            })}

            {/* Mechanic Section */}
            {renderDropdownField({
              label: "Mechanic",
              value: selectedEmployeeLabel,
              placeholder: "Pick Mechanic",
              options: employees.map((emp) => ({
                label: emp.name,
                value: emp.id,
              })),
              visible: showMechanicDropdown,
              onToggle: setShowMechanicDropdown,
              onSelect: setSelectedEmployee,
            })}

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
                mode={Platform.OS === "ios" ? "datetime" : "date"}
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
                mode={Platform.OS === "ios" ? "datetime" : "date"}
                display="default"
                onChange={onEndChange}
              />
            )}

            <Text
              style={{ fontSize: 14, color: COLORS.grayDark, marginBottom: 5 }}
            >
              Due Date
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
              onPress={() => setShowDue1Picker(true)}
            >
              <Text style={{ color: COLORS.grayDark }}>
                {formatDateTime(dueDate1)}
              </Text>
            </TouchableOpacity>

            {showDue1Picker && (
              <DateTimePicker
                value={dueDate1}
                mode={Platform.OS === "ios" ? "datetime" : "date"}
                display="default"
                onChange={onDue1Change}
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
                    {[item.taskId, item.inspectionTypeFull]
                      .filter(Boolean)
                      .join(" | ")}
                  </Text>

                  <Text style={{ borderBottomWidth: 1, paddingVertical: 6 }}>
                    {item.taskName}
                  </Text>
                </View>
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
