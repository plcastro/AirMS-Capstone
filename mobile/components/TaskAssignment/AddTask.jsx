import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  Platform,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import Checkbox from "expo-checkbox";
import Button from "../Button";
import { styles } from "../../stylesheets/styles";
import { COLORS } from "../../stylesheets/colors";
import { API_BASE } from "../../utilities/API_BASE";
import {
  addMinutesToDate,
  estimateInspectionSchedule,
  formatEstimatedDuration,
} from "../../utilities/inspectionTiming";
import { showToast } from "../../utilities/toast";

const { width } = Dimensions.get("window");

const getNow = () => new Date();

const clampToNow = (date) => {
  const now = getNow();
  return date < now ? now : date;
};

const getPickerValue = (event) => {
  if (event?.type === "dismissed") {
    return null;
  }

  return event;
};

const dedupeChecklistItems = (items = []) => {
  const seen = new Set();

  return items.filter((item) => {
    const key = `${item.taskId || ""}|${item.taskName || ""}|${item.inspectionTypeFull || ""}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
};

export default function AddTask({
  visible,
  onClose,
  onAddTask,
  employees,
}) {
  const [selectedAircraft, setSelectedAircraft] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [inspectionType, setInspectionType] = useState("");
  const [selectedInspection, setSelectedInspection] = useState(null);

  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(
    new Date(new Date().getTime() + 60 * 60 * 1000),
  );

  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [showAircraftDropdown, setShowAircraftDropdown] = useState(false);
  const [showInspectionDropdown, setShowInspectionDropdown] = useState(false);
  const [showMechanicDropdown, setShowMechanicDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [androidPickerMode, setAndroidPickerMode] = useState("date");
  const [endDateManuallyAdjusted, setEndDateManuallyAdjusted] = useState(false);

  const [checklistItems, setChecklistItems] = useState([]);
  const [aircraftOptions, setAircraftOptions] = useState([]);
  const [inspectionOptions, setInspectionOptions] = useState([]);
  const scheduleEstimate = estimateInspectionSchedule(checklistItems);

  const fetchInspectionTasks = async (inspection) => {
    const response = await fetch(
      `${API_BASE}/api/inspections/tasks?inspectionName=${encodeURIComponent(inspection.name || "")}&aircraftModel=${encodeURIComponent(inspection.aircraftModel || "")}`,
    );

    if (!response.ok) {
      throw new Error("Failed to fetch inspection tasks");
    }

    const tasks = await response.json();
    const normalizedTasks = Array.isArray(tasks)
      ? tasks.map((item) => ({
          ...item,
          taskId: String(item?.taskId || "").trim(),
          taskName: String(item?.taskName || "").trim(),
          inspectionTypeFull: String(item?.inspectionTypeFull || "").trim(),
        }))
      : [];

    return dedupeChecklistItems(normalizedTasks).filter(
      (item) => item.taskName.length > 0,
    );
  };

  useEffect(() => {
    if (endDateManuallyAdjusted) {
      return;
    }

    setEndDate(addMinutesToDate(startDate, scheduleEstimate.minutes));
  }, [startDate, scheduleEstimate.minutes, endDateManuallyAdjusted]);

  useEffect(() => {
    setChecklistItems([]);
    setInspectionType("");
    setSelectedInspection(null);
    setEndDateManuallyAdjusted(false);
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
        showToast("Failed to fetch aircraft");
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
        showToast("Failed to fetch inspection schedules");
      } finally {
        setLoading(false);
      }
    };

    fetchInspections();
  }, [visible]);

  const confirmAdd = () => {
    if (!selectedAircraft || !inspectionType || !selectedEmployee) {
      showToast("Please select an aircraft, inspection, and mechanic.");
      return;
    }

    if (startDate < getNow() || endDate < getNow()) {
      showToast("Start and end date/time must be today or later.");
      return;
    }

    if (endDate < startDate) {
      showToast("End date/time must be after the start date/time.");
      return;
    }

    const filteredChecklist = checklistItems.filter(
      (item) => item.taskName && item.taskName.trim() !== "",
    );

    const newTask = {
      id: Date.now().toString(),
      title: inspectionOptions.find((i) => i.id === inspectionType)?.name || "",
      aircraft: selectedAircraft,
      startDateTime: startDate.toISOString(),
      endDateTime: endDate.toISOString(),
      status: "Pending",
      priority: "Normal",
      maintenanceType: "Inspection",
      assignedTo: selectedEmployee,
      assignedToName:
        employees.find((e) => e.id === selectedEmployee)?.name || "",
      performance: {
        estimatedHours: scheduleEstimate.hours,
      },
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

  const openDateTimePicker = (field) => {
    if (Platform.OS === "android") {
      setAndroidPickerMode("date");
    }

    if (field === "start") {
      setShowStartPicker(true);
      setShowEndPicker(false);
    } else {
      setShowEndPicker(true);
      setShowStartPicker(false);
    }
  };

  const handleDateTimeChange = (field, event, selectedDate) => {
    const closePicker = () => {
      if (field === "start") {
        setShowStartPicker(false);
      } else {
        setShowEndPicker(false);
      }
    };

    const currentValue = field === "start" ? startDate : endDate;

    if (event?.type === "dismissed") {
      closePicker();
      if (Platform.OS === "android") {
        setAndroidPickerMode("date");
      }
      return;
    }

    if (!selectedDate) {
      return;
    }

    if (Platform.OS === "android" && androidPickerMode === "date") {
      const nextDate = new Date(currentValue);
      nextDate.setFullYear(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate(),
      );

      const clampedDate = clampToNow(nextDate);

      if (field === "start") {
        setStartDate(clampedDate);
        if (endDate < clampedDate) {
          setEndDate(clampedDate);
        }
      } else {
        setEndDate(clampedDate);
      }

      setAndroidPickerMode("time");
      return;
    }

    const nextDate = new Date(currentValue);

    if (Platform.OS === "android") {
      nextDate.setHours(selectedDate.getHours(), selectedDate.getMinutes(), 0, 0);
    } else {
      nextDate.setTime(selectedDate.getTime());
    }

    if (field === "start") {
      const clampedDate = clampToNow(nextDate);
      setStartDate(clampedDate);
      if (endDate < clampedDate) {
        setEndDate(clampedDate);
      }
    } else {
      setEndDate(clampToNow(nextDate));
      setEndDateManuallyAdjusted(true);
    }

    closePicker();

    if (Platform.OS === "android") {
      setAndroidPickerMode("date");
    }
  };

  const onStartChange = (event, selectedDate) => {
    if (getPickerValue(event) === null) {
      setShowStartPicker(false);
      if (Platform.OS === "android") {
        setAndroidPickerMode("date");
      }
      return;
    }

    handleDateTimeChange("start", event, selectedDate);
  };

  const onEndChange = (event, selectedDate) => {
    if (getPickerValue(event) === null) {
      setShowEndPicker(false);
      if (Platform.OS === "android") {
        setAndroidPickerMode("date");
      }
      return;
    }

    handleDateTimeChange("end", event, selectedDate);
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
        {label} *
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
          {visible ? "^" : "v"}
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
                    value === item.label ? `${COLORS.primaryLight}12` : COLORS.white,
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
    aircraftOptions.find((aircraft) => aircraft.id === selectedAircraft)?.name || "";
  const selectedInspectionLabel =
    inspectionOptions.find((inspection) => inspection.id === inspectionType)?.name || "";
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
                setEndDateManuallyAdjusted(false);

                if (!matchedInspection) return;
                try {
                  setLoading(true);
                  const tasks = await fetchInspectionTasks(matchedInspection);
                  setChecklistItems(tasks);
                } catch (error) {
                  console.error("Error fetching tasks:", error);
                  showToast("Failed to fetch inspection tasks");
                } finally {
                  setLoading(false);
                }
              },
              disabled: loading && inspectionOptions.length === 0,
            })}

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

            <Text
              style={{ fontSize: 14, color: COLORS.grayDark, marginBottom: 5 }}
            >
              Start Date and Time *
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
              onPress={() => openDateTimePicker("start")}
            >
              <Text style={{ color: COLORS.grayDark }}>
                {formatDateTime(startDate)}
              </Text>
            </TouchableOpacity>

            {showStartPicker && (
              <DateTimePicker
                value={startDate}
                mode={Platform.OS === "ios" ? "datetime" : androidPickerMode}
                display="default"
                onChange={onStartChange}
                minimumDate={getNow()}
              />
            )}

            <Text
              style={{ fontSize: 14, color: COLORS.grayDark, marginBottom: 5 }}
            >
              End Date and Time *
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
              onPress={() => openDateTimePicker("end")}
            >
              <Text style={{ color: COLORS.grayDark }}>
                {formatDateTime(endDate)}
              </Text>
            </TouchableOpacity>

            <Text
              style={{
                fontSize: 12,
                color: COLORS.grayDark,
                marginTop: -10,
                marginBottom: 20,
              }}
            >
              Estimated duration: {formatEstimatedDuration(scheduleEstimate.minutes)}
              {" | "}
              {scheduleEstimate.itemCount} checklist item
              {scheduleEstimate.itemCount === 1 ? "" : "s"}
              {endDateManuallyAdjusted ? " | End time manually adjusted" : ""}
            </Text>

            {showEndPicker && (
              <DateTimePicker
                value={endDate}
                mode={Platform.OS === "ios" ? "datetime" : androidPickerMode}
                display="default"
                onChange={onEndChange}
                minimumDate={getNow()}
              />
            )}

            <Text style={{ fontSize: 18, fontWeight: "600", marginBottom: 15 }}>
              Checklist
            </Text>

            {checklistItems.map((item, index) => (
              <View key={index} style={{ flexDirection: "row", marginTop: 10 }}>
                <View style={{ paddingTop: 2 }}>
                  <Checkbox value={false} disabled={true} />
                </View>

                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={{ fontSize: 12, color: "#888" }}>
                    {[item.taskId, item.inspectionTypeFull].filter(Boolean).join(" | ")}
                  </Text>

                  <Text style={{ borderBottomWidth: 1, paddingVertical: 6 }}>
                    {item.taskName}
                  </Text>
                </View>
              </View>
            ))}

            {checklistItems.length === 0 && (
              <Text style={{ color: COLORS.grayDark, marginBottom: 20 }}>
                No checklist items were found for this inspection.
              </Text>
            )}
          </ScrollView>

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
