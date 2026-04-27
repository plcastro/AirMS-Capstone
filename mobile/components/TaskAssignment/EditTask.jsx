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
import { showToast } from "../../utilities/toast";

const { width } = Dimensions.get("window");

const getNow = () => new Date();
const clampToNow = (date) => {
  const now = getNow();
  return date < now ? now : date;
};

export default function EditTask({
  visible,
  onClose,
  onSave,
  task,
  employees,
}) {
  const [taskTitle, setTaskTitle] = useState("");
  const [selectedAircraft, setSelectedAircraft] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState("");

  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());

  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [showAircraftDropdown, setShowAircraftDropdown] = useState(false);
  const [showMechanicDropdown, setShowMechanicDropdown] = useState(false);
  const [androidPickerMode, setAndroidPickerMode] = useState("date");

  const [checklistItems, setChecklistItems] = useState([]);
  const [aircraftOptions, setAircraftOptions] = useState([]);

  useEffect(() => {
    const fetchAircraft = async () => {
      try {
        const response = await fetch(
          `${API_BASE}/api/parts-monitoring/aircraft-list`,
        );
        if (!response.ok) {
          throw new Error("Failed to fetch aircraft");
        }
        const data = await response.json();
        const options = (data.data || []).map((aircraft) => ({
          id: aircraft,
          name: aircraft,
        }));
        setAircraftOptions(options);
      } catch (error) {
        console.error("Error fetching aircraft:", error);
      }
    };
    fetchAircraft();
  }, []);

  useEffect(() => {
    if (task) {
      setTaskTitle(task.title || "");
      setSelectedAircraft(task.aircraft || "");
      setSelectedEmployee(task.assignedTo || "");

      if (task.startDateTime) {
        setStartDate(new Date(task.startDateTime));
      }
      if (task.endDateTime) {
        setEndDate(new Date(task.endDateTime));
      }

      setChecklistItems(task.checklistItems || []);
    }
  }, [task]);

  const confirmSave = () => {
    if (startDate < getNow() || endDate < getNow()) {
      showToast("Start and end date/time must be today or later.");
      return;
    }

    if (endDate < startDate) {
      showToast("End date/time must be after the start date/time.");
      return;
    }

    const updatedTask = {
      ...task,
      title: taskTitle,
      aircraft: selectedAircraft,
      startDateTime: startDate.toISOString(),
      endDateTime: endDate.toISOString(),
      assignedTo: selectedEmployee,
      assignedToName:
        employees.find((e) => e.id === selectedEmployee)?.name ||
        task.assignedToName,
      checklistItems,
    };
    onSave(updatedTask);
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
    }

    closePicker();

    if (Platform.OS === "android") {
      setAndroidPickerMode("date");
    }
  };

  const onStartChange = (event, selectedDate) => {
    handleDateTimeChange("start", event, selectedDate);
  };

  const onEndChange = (event, selectedDate) => {
    handleDateTimeChange("end", event, selectedDate);
  };

  const closeAllDropdowns = () => {
    setShowAircraftDropdown(false);
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
        onPress={() => {
          if (disabled) return;
          const nextVisible = !visible;
          closeAllDropdowns();
          onToggle(nextVisible);
        }}
        disabled={disabled}
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
  const selectedEmployeeLabel =
    employees.find((emp) => emp.id === selectedEmployee)?.name || "";

  return (
    <Modal visible={visible} animationType="slide" transparent>
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

            <View
              style={{
                minHeight: 48,
                backgroundColor: COLORS.grayLight,
                borderWidth: 1,
                borderColor: COLORS.border,
                borderRadius: 8,
                paddingHorizontal: 14,
                justifyContent: "center",
                marginBottom: 15,
              }}
            >
              <Text
                style={{ color: taskTitle ? COLORS.black : COLORS.grayDark }}
              >
                {taskTitle || "Maintenance Task"}
              </Text>
            </View>

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
              disabled: true,
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
              onPress={() => openDateTimePicker("end")}
            >
              <Text style={{ color: COLORS.grayDark }}>
                {formatDateTime(endDate)}
              </Text>
            </TouchableOpacity>

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
              <View
                key={index}
                style={{ flexDirection: "row", marginBottom: 12 }}
              >
                <View style={{ paddingTop: 2 }}>
                  <Checkbox value={false} disabled={true} />
                </View>

                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={{ fontSize: 12, color: COLORS.grayDark }}>
                    {[item.taskId, item.inspectionTypeFull]
                      .filter(Boolean)
                      .join(" | ")}
                  </Text>
                  <Text
                    style={{
                      borderBottomWidth: 1,
                      borderBottomColor: COLORS.border,
                      paddingVertical: 6,
                      fontSize: 14,
                    }}
                  >
                    {item.taskName}
                  </Text>
                </View>
              </View>
            ))}

            {checklistItems.length === 0 && (
              <Text style={{ color: COLORS.grayDark, marginBottom: 20 }}>
                No checklist items attached to this task.
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
              label="Discard"
              onPress={confirmDiscard}
              buttonStyle={[styles.secondaryAlertBtn, { flex: 1 }]}
              buttonTextStyle={styles.secondaryAlertBtnTxt}
            />
            <Button
              label="Save Changes"
              onPress={confirmSave}
              buttonStyle={[styles.primaryAlertBtn, { flex: 1 }]}
              buttonTextStyle={styles.primaryBtnTxt}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}
