import {
  View,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import AppText from "../common/AppText";
import React, { useEffect, useMemo, useState, useContext } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import TaskCard from "./TaskCard";
import Button from "../Button";
import { styles } from "../../stylesheets/styles";
import { AuthContext } from "../../Context/AuthContext";
import AddTask from "./AddTask";
import EditTask from "./EditTask";
import { COLORS } from "../../stylesheets/colors";
import { resolveUserRole } from "../../../shared/navigationAccess";

const TASK_CALENDAR_STORAGE_KEY = "airms.taskCalendar.enabled";
const TASK_CALENDAR_ENV_ENABLED =
  process.env.EXPO_PUBLIC_TASK_CALENDAR_ENABLED === "true";
const OPEN_TASK_STATUSES = new Set(["pending", "returned", "ongoing"]);
const COMPLETED_TASK_STATUSES = new Set([
  "completed",
  "turned in",
  "approved",
]);
const CALENDAR_COLORS = [
  { bg: "#E6F4FF", border: "#91CAFF", text: "#0958D9" },
  { bg: "#F6FFED", border: "#B7EB8F", text: "#237804" },
  { bg: "#FFF7E6", border: "#FFD591", text: "#AD6800" },
  { bg: "#FFF0F6", border: "#FFADD2", text: "#C41D7F" },
  { bg: "#F9F0FF", border: "#D3ADF7", text: "#531DAB" },
  { bg: "#E6FFFB", border: "#87E8DE", text: "#006D75" },
  { bg: "#FFF1F0", border: "#FFA39E", text: "#CF1322" },
  { bg: "#F0F5FF", border: "#ADC6FF", text: "#1D39C4" },
];

const getStableColorIndex = (value = "") => {
  const text = String(value || "unassigned");
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) % CALENDAR_COLORS.length;
  }
  return hash;
};

const getTaskDate = (task, key) => {
  const value = task?.[key];
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
};

const startOfDay = (date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const endOfDay = (date) =>
  new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    23,
    59,
    59,
    999,
  );

const isTaskOnCalendarDate = (task, date) => {
  const start =
    getTaskDate(task, "startDateTime") || getTaskDate(task, "dueDate");
  const end =
    getTaskDate(task, "endDateTime") || getTaskDate(task, "dueDate") || start;
  if (!start) return false;

  return start <= endOfDay(date) && end >= startOfDay(date);
};

const normalizeTaskStatus = (status) =>
  String(status || "")
    .trim()
    .toLowerCase();

const getCalendarDays = (monthDate) => {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const leadingDays = firstDay.getDay();
  const start = new Date(year, month, 1 - leadingDays);

  return Array.from({ length: 42 }, (_, index) => {
    const nextDate = new Date(start);
    nextDate.setDate(start.getDate() + index);
    return nextDate;
  });
};

const getAssigneeColor = (task) => {
  const assignee =
    task?.assignedTo?._id ||
    task?.assignedTo?.id ||
    [task?.assignedTo?.firstName, task?.assignedTo?.lastName]
      .filter(Boolean)
      .join(" ") ||
    task?.assignedTo ||
    task?.assignedToName ||
    "unassigned";
  return CALENDAR_COLORS[getStableColorIndex(assignee)];
};

const getAssigneeName = (task) => {
  if (task?.assignedToName) return task.assignedToName;
  if (task?.assignedTo && typeof task.assignedTo === "object") {
    return [task.assignedTo.firstName, task.assignedTo.lastName]
      .filter(Boolean)
      .join(" ");
  }
  return "Assigned mechanic";
};

export default function TaskTabs({
  tasks = [],
  employees = [],
  onTaskPress,
  onRefresh,
  refreshing = false,
}) {
  const { user } = useContext(AuthContext);
  const userRole = resolveUserRole(user);
  const isHead = ["maintenance manager", "superadmin"].includes(userRole);
  const now = new Date();

  const mechanicTabs = ["Upcoming", "Past Due", "Completed"];
  const headTabs = ["Tasks", "Submitted"];
  const [activeTab, setActiveTab] = useState(isHead ? "Tasks" : "Upcoming");
  const [taskCalendarEnabled, setTaskCalendarEnabled] = useState(
    TASK_CALENDAR_ENV_ENABLED,
  );
  const [calendarMonth, setCalendarMonth] = useState(
    new Date(now.getFullYear(), now.getMonth(), 1),
  );

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const loadCalendarFlag = async () => {
      try {
        const storedValue = await AsyncStorage.getItem(
          TASK_CALENDAR_STORAGE_KEY,
        );
        if (!isMounted) return;

        if (storedValue === "true") {
          setTaskCalendarEnabled(true);
        } else if (storedValue === "false") {
          setTaskCalendarEnabled(false);
        } else {
          setTaskCalendarEnabled(TASK_CALENDAR_ENV_ENABLED);
        }
      } catch {
        if (isMounted) setTaskCalendarEnabled(TASK_CALENDAR_ENV_ENABLED);
      }
    };

    loadCalendarFlag();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!taskCalendarEnabled && activeTab === "Calendar") {
      setActiveTab(isHead ? "Tasks" : "Upcoming");
    }
  }, [activeTab, isHead, taskCalendarEnabled]);

  const formatDisplayDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const filterTasks = () => {
    if (isHead) {
      switch (activeTab) {
        case "Tasks":
          return tasks;
        case "Submitted":
          return tasks.filter((task) =>
            ["completed", "turned in"].includes(
              normalizeTaskStatus(task.status),
            ),
          );
        default:
          return [];
      }
    } else {
      return tasks.filter((task) => {
        const taskStatus = normalizeTaskStatus(task.status);
        const deadline = task.endDateTime || task.dueDate;
        if (!deadline) return false;
        const dueDate = new Date(deadline);
        const today = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
        );
        const isPastDue = dueDate < today;

        switch (activeTab) {
          case "Upcoming":
            return OPEN_TASK_STATUSES.has(taskStatus) && !isPastDue;
          case "Past Due":
            return OPEN_TASK_STATUSES.has(taskStatus) && isPastDue;
          case "Completed":
            return COMPLETED_TASK_STATUSES.has(taskStatus);
          default:
            return false;
        }
      });
    }
  };

  const getMechanicTabCount = (tab) =>
    tasks.filter((task) => {
      const taskStatus = normalizeTaskStatus(task.status);
      const deadline = task.endDateTime || task.dueDate;
      if (!deadline) return false;

      const dueDate = new Date(deadline);
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const isPastDue = dueDate < today;

      switch (tab) {
        case "Upcoming":
          return OPEN_TASK_STATUSES.has(taskStatus) && !isPastDue;
        case "Past Due":
          return OPEN_TASK_STATUSES.has(taskStatus) && isPastDue;
        case "Completed":
          return COMPLETED_TASK_STATUSES.has(taskStatus);
        default:
          return false;
      }
    }).length;

  const getTabLabel = (tab) =>
    isHead ? tab : `${tab} (${getMechanicTabCount(tab)})`;

  const calendarTasks = useMemo(() => tasks, [tasks]);
  const calendarDays = useMemo(
    () => getCalendarDays(calendarMonth),
    [calendarMonth],
  );

  const getCalendarTaskCount = () =>
    calendarTasks.filter(
      (task) =>
        getTaskDate(task, "startDateTime") ||
        getTaskDate(task, "endDateTime") ||
        getTaskDate(task, "dueDate"),
    ).length;

  const moveCalendarMonth = (offset) => {
    setCalendarMonth(
      (current) =>
        new Date(current.getFullYear(), current.getMonth() + offset, 1),
    );
  };

  const formatCalendarMonth = (date) =>
    date.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });

  const getGroupedTasks = () => {
    if (isHead) return [];

    const filtered = filterTasks();
    const grouped = {};

    filtered.forEach((task) => {
      const deadline = task.endDateTime || task.dueDate;
      const date = new Date(deadline);
      const formattedDate = formatDisplayDate(date);

      if (!grouped[formattedDate]) {
        grouped[formattedDate] = [];
      }
      grouped[formattedDate].push(task);
    });

    return Object.keys(grouped)
      .sort((a, b) => {
        const dateA = new Date(a);
        const dateB = new Date(b);
        return activeTab === "Completed" ? dateB - dateA : dateA - dateB;
      })
      .map((date) => ({
        title: date,
        data: grouped[date],
      }));
  };

  const getCardVariant = () => {
    if (isHead) return "default";
    if (activeTab === "Upcoming") return "upcoming";
    if (activeTab === "Past Due") return "pastdue";
    if (activeTab === "Completed") return "completed";
    return "default";
  };

  const tasksToRender = filterTasks();
  const tabsToRender = [
    ...(isHead ? headTabs : mechanicTabs),
    ...(taskCalendarEnabled ? ["Calendar"] : []),
  ];
  const groupedTasks = getGroupedTasks();
  const isCalendarTab = taskCalendarEnabled && activeTab === "Calendar";

  const handleTaskAction = (task, action) => {
    if (action === "start") {
      onTaskPress?.(task);
    } else if (action === "edit") {
      setSelectedTask(task);
      setShowEditModal(true);
    }
  };

  const renderCalendar = () => (
    <ScrollView
      contentContainerStyle={{ padding: 10, paddingBottom: 110 }}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        ) : undefined
      }
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 10,
        }}
      >
        <Button
          label="<"
          onPress={() => moveCalendarMonth(-1)}
          buttonStyle={[
            styles.secondaryBtn,
            { minWidth: 44, paddingHorizontal: 0 },
          ]}
          buttonTextStyle={[styles.secondaryBtnTxt, { color: COLORS.grayDark }]}
        />
        <AppText style={{ fontSize: 15, fontWeight: "700" }}>
          {formatCalendarMonth(calendarMonth)}
        </AppText>
        <Button
          label=">"
          onPress={() => moveCalendarMonth(1)}
          buttonStyle={[
            styles.secondaryBtn,
            { minWidth: 44, paddingHorizontal: 0 },
          ]}
          buttonTextStyle={[styles.secondaryBtnTxt, { color: COLORS.grayDark }]}
        />
      </View>

      <View style={{ flexDirection: "row", marginBottom: 4 }}>
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <AppText
            key={day}
            style={{
              flex: 1,
              textAlign: "center",
              fontSize: 11,
              fontWeight: "700",
              color: COLORS.grayDark,
            }}
          >
            {day}
          </AppText>
        ))}
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        {calendarDays.map((date) => {
          const inCurrentMonth = date.getMonth() === calendarMonth.getMonth();
          const dayTasks = calendarTasks.filter((task) =>
            isTaskOnCalendarDate(task, date),
          );
          const visibleTasks = dayTasks.slice(0, 3);

          return (
            <View
              key={date.toISOString()}
              style={{
                width: `${100 / 7}%`,
                minHeight: 92,
                padding: 3,
                borderWidth: 0.5,
                borderColor: COLORS.border,
                backgroundColor: inCurrentMonth ? COLORS.white : "#F7F7F7",
              }}
            >
              <AppText
                style={{
                  fontSize: 11,
                  fontWeight: "700",
                  color: inCurrentMonth ? COLORS.black : COLORS.grayMedium,
                  marginBottom: 3,
                }}
              >
                {date.getDate()}
              </AppText>

              {visibleTasks.map((task) => {
                const color = getAssigneeColor(task);
                const title = task.title || task.maintenanceType || "Task";
                const aircraft = task.aircraft ? `${task.aircraft} - ` : "";
                const mechanicName = getAssigneeName(task);

                return (
                  <TouchableOpacity
                    key={`${task.id || task._id}-${date.toISOString()}`}
                    activeOpacity={0.75}
                    onPress={() => onTaskPress?.(task)}
                    style={{
                      backgroundColor: color.bg,
                      borderColor: color.border,
                      borderWidth: 1,
                      borderRadius: 5,
                      paddingHorizontal: 4,
                      paddingVertical: 2,
                      marginBottom: 3,
                    }}
                  >
                    <AppText
                      numberOfLines={1}
                      style={{
                        color: color.text,
                        fontSize: 10,
                        fontWeight: "700",
                      }}
                    >
                      {aircraft}
                      {title}
                    </AppText>
                    {isHead && (
                      <AppText
                        numberOfLines={1}
                        style={{
                          color: color.text,
                          fontSize: 9,
                          opacity: 0.75,
                        }}
                      >
                        {mechanicName}
                      </AppText>
                    )}
                  </TouchableOpacity>
                );
              })}

              {dayTasks.length > visibleTasks.length && (
                <AppText style={{ fontSize: 10, color: COLORS.grayDark }}>
                  +{dayTasks.length - visibleTasks.length} more
                </AppText>
              )}
            </View>
          );
        })}
      </View>

      {getCalendarTaskCount() === 0 && (
        <AppText style={{ textAlign: "center", marginTop: 20 }}>
          No scheduled tasks
        </AppText>
      )}
    </ScrollView>
  );

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          flexDirection: "row",
          justifyContent: "flex-start",
          gap: 3,
          paddingRight: 8,
        }}
      >
        {tabsToRender.map((tab) => (
          <Button
            key={tab}
            label={
              tab === "Calendar"
                ? `Calendar (${getCalendarTaskCount()})`
                : getTabLabel(tab)
            }
            onPress={() => setActiveTab(tab)}
            buttonStyle={[
              activeTab === tab ? styles.primaryAlertBtn : styles.secondaryBtn,
              { minWidth: 100, paddingHorizontal: 7 },
            ]}
            buttonTextStyle={[
              activeTab === tab
                ? styles.primaryBtnTxt
                : [styles.secondaryBtnTxt, { color: COLORS.grayDark }],
              { fontSize: 12 },
            ]}
          />
        ))}

        {/* Head: Add Task button */}
        {isHead && (
          <Button
            label="+ Add Task"
            onPress={() => setShowAddModal(true)}
            buttonStyle={[styles.unifiedActionButton, { width: 130 }]}
            buttonTextStyle={styles.primaryBtnTxt}
          />
        )}
      </ScrollView>

      {/* Task List */}
      <View style={styles.taskTable}>
        {isCalendarTab ? (
          renderCalendar()
        ) : (
          <ScrollView
            contentContainerStyle={{ padding: 10, paddingBottom: 110 }}
            refreshControl={
              onRefresh ? (
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              ) : undefined
            }
          >
            {!isHead && groupedTasks.length > 0
              ? groupedTasks.map((section) => (
                  <View key={section.title}>
                    <View
                      style={{
                        paddingVertical: 2,
                        paddingHorizontal: 6,
                        marginBottom: 5,
                        borderTopLeftRadius: 4,
                        borderTopRightRadius: 4,
                      }}
                    >
                      <AppText
                        style={{
                          fontWeight: "700",
                          fontSize: 12,
                        }}
                      >
                        {section.title}
                      </AppText>
                    </View>

                    {section.data.map((task) => (
                      <TaskCard
                        key={task.id}
                        data={task}
                        variant={getCardVariant()}
                        onPress={onTaskPress}
                        onStartTask={() => handleTaskAction(task, "start")}
                        onEditTask={() => handleTaskAction(task, "edit")}
                        onDeleteTask={() => handleTaskAction(task, "delete")}
                      />
                    ))}
                  </View>
                ))
              : tasksToRender.map((task) => (
                  <TaskCard
                    key={task.id}
                    data={task}
                    variant={getCardVariant()}
                    onPress={onTaskPress}
                    onStartTask={() => handleTaskAction(task, "start")}
                    onEditTask={() => handleTaskAction(task, "edit")}
                    onDeleteTask={() => handleTaskAction(task, "delete")}
                  />
                ))}

            {tasksToRender.length === 0 && (
              <AppText style={{ textAlign: "center", marginTop: 20 }}>
                No tasks available
              </AppText>
            )}
          </ScrollView>
        )}
      </View>

      {/* Add Task Modal - only render for head */}
      {isHead && (
        <>
          <AddTask
            visible={showAddModal}
            onClose={() => setShowAddModal(false)}
            onAddTask={(newTask) => {
              setShowAddModal(false);
            }}
            employees={employees}
          />

          <EditTask
            visible={showEditModal}
            onClose={() => setShowEditModal(false)}
            onSave={(updatedTask) => {
              setShowEditModal(false);
            }}
            task={selectedTask}
            employees={employees}
          />
        </>
      )}
    </View>
  );
}
