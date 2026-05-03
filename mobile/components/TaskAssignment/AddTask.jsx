import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  Platform,
  TextInput,
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
const CUSTOM_INSPECTION_ID = "custom-task";

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
  initialDraft = null,
}) {
  const [selectedAircraft, setSelectedAircraft] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [inspectionType, setInspectionType] = useState("");
  const [selectedInspection, setSelectedInspection] = useState(null);
  const [customTaskTitle, setCustomTaskTitle] = useState("Custom Task");

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
  const [appliedDraftKey, setAppliedDraftKey] = useState("");
  const scheduleEstimate = estimateInspectionSchedule(checklistItems);
  const isCustomTask = inspectionType === CUSTOM_INSPECTION_ID;

  const draftKey = initialDraft
    ? JSON.stringify({
        aircraft: initialDraft.aircraft || "",
        inspectionName: initialDraft.inspectionName || "",
        issueTitle: initialDraft.issueTitle || "",
        manualReference: initialDraft.manualReference || "",
      })
    : "";

  const buildRectificationChecklistItem = (draft = {}, inspection = {}) => ({
    inspectionName: inspection.name || draft.inspectionName || "OC Inspection",
    aircraftModel: inspection.aircraftModel || draft.aircraftModel || "",
    ata: {
      chapter: 0,
      chapterName: "",
      section: 0,
      sectionName: "",
    },
    taskId: `ai-rectify-${Date.now()}`,
    taskName: draft.issueTitle || "Rectify maintenance finding",
    component: draft.component || "",
    componentModel: "",
    inspectionType: "Corrective",
    inspectionTypeFull: draft.manualReference || draft.inspectionName || "",
    documentation: draft.manualReference || "",
    description: draft.issueTitle || "",
    correctiveAction: draft.recommendedAction || "",
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
      specificInterval: draft.inspectionName || "",
    },
  });

  const buildCustomChecklistItem = (index = checklistItems.length) => ({
    inspectionName: customTaskTitle || "Custom Task",
    aircraftModel: selectedInspection?.aircraftModel || "",
    ata: {
      chapter: 0,
      chapterName: "",
      section: 0,
      sectionName: "",
    },
    taskId: `custom-${Date.now()}-${index + 1}`,
    taskName: "",
    component: "",
    componentModel: "",
    inspectionType: "Custom",
    inspectionTypeFull: "Custom Task",
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
  });

  const addCustomChecklistItem = () => {
    setChecklistItems((currentItems) => [
      ...currentItems,
      buildCustomChecklistItem(currentItems.length),
    ]);
  };

  const updateChecklistItem = (index, field, value) => {
    setChecklistItems((currentItems) =>
      currentItems.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    );
  };

  const removeChecklistItem = (index) => {
    setChecklistItems((currentItems) =>
      currentItems.filter((_, itemIndex) => itemIndex !== index),
    );
  };

  const findInspectionForDraft = (draft = {}) => {
    const wantedName = String(draft.inspectionName || "").toLowerCase();
    const wantedModel = String(draft.aircraftModel || "").toLowerCase();

    return (
      inspectionOptions.find(
        (inspection) =>
          wantedName &&
          String(inspection.name || "").toLowerCase() === wantedName &&
          (!wantedModel ||
            String(inspection.aircraftModel || "").toLowerCase() ===
              wantedModel),
      ) ||
      inspectionOptions.find(
        (inspection) =>
          wantedName &&
          String(inspection.name || "").toLowerCase() === wantedName,
      ) ||
      inspectionOptions.find(
        (inspection) =>
          String(inspection.name || "").toLowerCase() === "oc inspection",
      ) ||
      null
    );
  };

  const getTaskMatchScore = (item = {}, draft = {}) => {
    const haystack = [
      item.taskName,
      item.inspectionTypeFull,
      item.documentation,
      item.component,
      item.description,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const needles = [draft.component, draft.issueTitle, draft.manualReference]
      .filter(Boolean)
      .flatMap((value) => String(value).split(/[|,/;-]/))
      .map((value) => value.trim().toLowerCase())
      .filter((value) => value.length >= 4);

    return needles.reduce(
      (score, needle) => score + (haystack.includes(needle) ? 1 : 0),
      0,
    );
  };

  const applyDraft = async (draft = {}) => {
    const matchedInspection = findInspectionForDraft(draft);

    if (draft.aircraft) {
      setSelectedAircraft(draft.aircraft);
    }

    if (!matchedInspection) {
      setChecklistItems([buildRectificationChecklistItem(draft)]);
      return;
    }

    setInspectionType(matchedInspection.id);
    setSelectedInspection(matchedInspection);
    setEndDateManuallyAdjusted(false);

    try {
      setLoading(true);
      const tasks = await fetchInspectionTasks(matchedInspection);
      const rankedTasks = [...tasks].sort(
        (left, right) =>
          getTaskMatchScore(right, draft) - getTaskMatchScore(left, draft),
      );
      const bestScore = rankedTasks.length
        ? getTaskMatchScore(rankedTasks[0], draft)
        : 0;
      const rectificationItem = buildRectificationChecklistItem(
        draft,
        matchedInspection,
      );

      setChecklistItems(
        bestScore > 0
          ? [rectificationItem, ...rankedTasks]
          : [rectificationItem, ...tasks],
      );
    } catch (error) {
      console.error("Error applying AI rectification draft:", error);
      setChecklistItems([
        buildRectificationChecklistItem(draft, matchedInspection),
      ]);
      showToast("Opened task with AI rectification item");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    const now = new Date();
    setSelectedAircraft("");
    setSelectedEmployee("");
    setInspectionType("");
    setSelectedInspection(null);
    setStartDate(now);
    setEndDate(new Date(now.getTime() + 60 * 60 * 1000));
    setChecklistItems([]);
    setShowStartPicker(false);
    setShowEndPicker(false);
    setShowAircraftDropdown(false);
    setShowInspectionDropdown(false);
    setShowMechanicDropdown(false);
    setAndroidPickerMode("date");
    setEndDateManuallyAdjusted(false);
  };

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
    if (initialDraft?.aircraft && selectedAircraft === initialDraft.aircraft) {
      return;
    }

    setChecklistItems([]);
    setInspectionType("");
    setSelectedInspection(null);
    setEndDateManuallyAdjusted(false);
  }, [selectedAircraft, initialDraft?.aircraft]);

  useEffect(() => {
    if (!visible || !initialDraft || !inspectionOptions.length) {
      return;
    }

    if (draftKey && appliedDraftKey === draftKey) {
      return;
    }

    setAppliedDraftKey(draftKey);
    applyDraft(initialDraft);
  }, [visible, initialDraft, inspectionOptions, draftKey, appliedDraftKey]);

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
    if (!visible) {
      resetForm();
      return;
    }

    const fetchInspections = async () => {
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

    if (isCustomTask && !customTaskTitle.trim()) {
      showToast("Please enter a custom task name.");
      return;
    }

    if (startDate < getNow() || endDate < getNow()) {
      showToast("Start and end date/time must be today or later.");
      return;
    }

    if (endDate <= startDate) {
      showToast("End date/time must be after the start date/time.");
      return;
    }

    const selectedInspectionName = isCustomTask
      ? customTaskTitle.trim() || "Custom Task"
      : inspectionOptions.find((i) => i.id === inspectionType)?.name || "";

    const filteredChecklist = checklistItems
      .filter((item) => item.taskName && item.taskName.trim() !== "")
      .map((item, index) => ({
        ...item,
        inspectionName: selectedInspectionName,
        taskId: item.taskId || `custom-${Date.now()}-${index + 1}`,
        inspectionType: isCustomTask ? "Custom" : item.inspectionType,
        inspectionTypeFull: isCustomTask
          ? "Custom Task"
          : item.inspectionTypeFull,
      }));

    if (isCustomTask && filteredChecklist.length === 0) {
      showToast("Please add at least one checklist item.");
      return;
    }

    const newTask = {
      id: Date.now().toString(),
      title: selectedInspectionName,
      aircraft: selectedAircraft,
      startDateTime: startDate.toISOString(),
      endDateTime: endDate.toISOString(),
      status: "Pending",
      priority:
        initialDraft?.riskLevel === "Critical" ||
        initialDraft?.riskLevel === "High"
          ? "High"
          : "Normal",
      maintenanceType: isCustomTask
        ? "Custom Task"
        : initialDraft
          ? "Corrective Maintenance"
          : "Inspection",
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
                taskName: "Custom checklist item",
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
      findings: initialDraft?.issueTitle || "",
      defects: initialDraft?.component || "",
      correctiveActionDone: initialDraft?.recommendedAction || "",
      summary: initialDraft
        ? {
            category: "AI Maintenance Finding",
            severity: initialDraft.riskLevel || "",
            result: "Pending rectification",
            remarks: initialDraft.manualReference || "",
          }
        : undefined,
    };

    onAddTask(newTask);
  };

  const confirmDiscard = () => {
    resetForm();
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
        if (endDate <= clampedDate) {
          setEndDate(addMinutesToDate(clampedDate, 1));
        }
      } else {
        if (clampedDate <= startDate) {
          showToast("End date/time must be after the start date/time.");
          setEndDate(addMinutesToDate(startDate, 1));
        } else {
          setEndDate(clampedDate);
        }
      }

      setAndroidPickerMode("time");
      return;
    }

    const nextDate = new Date(currentValue);

    if (Platform.OS === "android") {
      nextDate.setHours(
        selectedDate.getHours(),
        selectedDate.getMinutes(),
        0,
        0,
      );
    } else {
      nextDate.setTime(selectedDate.getTime());
    }

    if (field === "start") {
      const clampedDate = clampToNow(nextDate);
      setStartDate(clampedDate);
      if (endDate <= clampedDate) {
        setEndDate(addMinutesToDate(clampedDate, 1));
      }
    } else {
      const clampedDate = clampToNow(nextDate);
      if (clampedDate <= startDate) {
        showToast("End date/time must be after the start date/time.");
        setEndDate(addMinutesToDate(startDate, 1));
      } else {
        setEndDate(clampedDate);
      }
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
    required = false,
    value,
    placeholder,
    options,
    visible,
    onToggle,
    onSelect,
    disabled = false,
  }) => (
    <View style={{ marginBottom: 15 }}>
      <Text style={{ fontSize: 12, color: COLORS.grayDark, marginBottom: 5 }}>
        {label}
        {required && <Text style={{ color: COLORS.dangerBorder }}> *</Text>}
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
            fontSize: 12,
            color: value ? COLORS.black : COLORS.grayDark,
          }}
        >
          {value || placeholder}
        </Text>

        <Text style={{ color: COLORS.primaryLight, fontSize: 12 }}>
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
                    fontSize: 12,
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
    inspectionType === CUSTOM_INSPECTION_ID
      ? "Custom Task"
      : inspectionOptions.find((inspection) => inspection.id === inspectionType)
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

            {renderDropdownField({
              label: "Aircraft",
              required: true,
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
              required: true,
              value: selectedInspectionLabel,
              placeholder:
                loading && inspectionOptions.length === 0
                  ? "Loading inspections..."
                  : "Pick Inspection",
              options: [
                { label: "Custom Task", value: CUSTOM_INSPECTION_ID },
                ...inspectionOptions.map((inspection) => ({
                  label: inspection.name,
                  value: inspection.id,
                })),
              ],
              visible: showInspectionDropdown,
              onToggle: setShowInspectionDropdown,
              onSelect: async (itemValue) => {
                setInspectionType(itemValue);

                if (itemValue === CUSTOM_INSPECTION_ID) {
                  setSelectedInspection(null);
                  setEndDateManuallyAdjusted(false);
                  setChecklistItems([buildCustomChecklistItem(0)]);
                  return;
                }

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

            {isCustomTask && (
              <View style={{ marginBottom: 15 }}>
                <Text
                  style={{
                    fontSize: 12,
                    color: COLORS.grayDark,
                    marginBottom: 5,
                  }}
                >
                  Custom Task Name *
                </Text>
                <TextInput
                  value={customTaskTitle}
                  onChangeText={setCustomTaskTitle}
                  placeholder="Enter task name"
                  placeholderTextColor={COLORS.grayDark}
                  style={{
                    minHeight: 48,
                    backgroundColor: COLORS.grayLight,
                    borderWidth: 1,
                    borderColor: COLORS.border,
                    borderRadius: 8,
                    paddingHorizontal: 14,
                    color: COLORS.black,
                  }}
                />
              </View>
            )}

            {renderDropdownField({
              label: "Mechanic",
              required: true,
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
              style={{ fontSize: 12, color: COLORS.grayDark, marginBottom: 5 }}
            >
              Start Date and Time
              <Text style={{ color: COLORS.dangerBorder }}> *</Text>
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
              style={{ fontSize: 12, color: COLORS.grayDark, marginBottom: 5 }}
            >
              End Date and Time
              <Text style={{ color: COLORS.dangerBorder }}> *</Text>
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
              Estimated duration:{" "}
              {formatEstimatedDuration(scheduleEstimate.minutes)}
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

            <Text style={{ fontSize: 14, fontWeight: "600", marginBottom: 15 }}>
              Checklist
            </Text>

            {checklistItems.map((item, index) => (
              <View
                key={item.taskId || index}
                style={{ flexDirection: "row", marginTop: 10 }}
              >
                <View style={{ paddingTop: 2 }}>
                  <Checkbox value={false} disabled={true} />
                </View>

                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={{ fontSize: 12, color: "#888" }}>
                    {[item.taskId, item.inspectionTypeFull]
                      .filter(Boolean)
                      .join(" | ")}
                  </Text>

                  {isCustomTask ? (
                    <>
                      <TextInput
                        value={item.taskName || ""}
                        onChangeText={(value) =>
                          updateChecklistItem(index, "taskName", value)
                        }
                        placeholder="Checklist item"
                        placeholderTextColor={COLORS.grayDark}
                        style={{
                          borderBottomWidth: 1,
                          borderBottomColor: COLORS.border,
                          paddingVertical: 6,
                          color: COLORS.black,
                        }}
                      />
                      <TextInput
                        value={item.description || ""}
                        onChangeText={(value) =>
                          updateChecklistItem(index, "description", value)
                        }
                        placeholder="Description / notes"
                        placeholderTextColor={COLORS.grayDark}
                        multiline
                        style={{
                          minHeight: 42,
                          marginTop: 6,
                          borderWidth: 1,
                          borderColor: COLORS.border,
                          borderRadius: 8,
                          padding: 8,
                          color: COLORS.black,
                        }}
                      />
                      <TouchableOpacity
                        onPress={() => removeChecklistItem(index)}
                        style={{ alignSelf: "flex-start", marginTop: 8 }}
                      >
                        <Text style={{ color: COLORS.danger || "#d32f2f" }}>
                          Remove
                        </Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <Text style={{ borderBottomWidth: 1, paddingVertical: 6 }}>
                      {item.taskName}
                    </Text>
                  )}
                </View>
              </View>
            ))}

            {isCustomTask && (
              <TouchableOpacity
                onPress={addCustomChecklistItem}
                style={{
                  marginTop: 14,
                  marginBottom: 10,
                  borderWidth: 1,
                  borderColor: COLORS.primaryLight,
                  borderRadius: 8,
                  paddingVertical: 10,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: COLORS.primaryLight, fontWeight: "600" }}>
                  Add Checklist Item
                </Text>
              </TouchableOpacity>
            )}

            {checklistItems.length === 0 && !isCustomTask && (
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
              label="Discard"
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
