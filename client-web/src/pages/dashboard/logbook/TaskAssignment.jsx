import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Button,
  Calendar,
  Card,
  Checkbox,
  Col,
  Divider,
  Form,
  Input,
  Modal,
  Popconfirm,
  Progress,
  Row,
  Select,
  Space,
  Tabs,
  Tooltip,
  Typography,
  DatePicker,
  App as AntdApp,
} from "antd";
import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useLocation, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../context/AuthContext";
import { API_BASE } from "../../../utils/API_BASE";
import ResponsiveTable from "../../../components/common/ResponsiveTable";
import DateTimeCell from "../../../components/common/DateTimeCell";
import { confirmAction } from "../../../utils/confirmAction";
import { renderStatusTag } from "../../../utils/statusTags";
import ResultPopup from "../../../components/common/ResultPopup";
import PinVerifiedSignatureModal from "../../../components/common/PinVerifiedSignatureModal";
import { matchesSearch } from "../../../utils/search";

const { Text } = Typography;
const ACTIVE_OPEN = new Set(["pending", "ongoing", "returned"]);
const CUSTOM_INSPECTION_ID = "custom-task";
const MINIMUM_TASK_MINUTES = 60;
const BASE_TASK_MINUTES = 10;
const CONTEXT_SWITCH_MINUTES_PER_ITEM = 2;
const DEFAULT_ITEM_MINUTES = 12;
const TASK_MODAL_WIDTH = "min(1280px, calc(100vw - 48px))";
const TASK_MODAL_BODY_STYLE = {
  maxHeight: "calc(100vh - 180px)",
  overflowY: "auto",
  paddingBottom: 8,
};
const TASK_DETAIL_MODAL_WIDTH = "min(1180px, calc(100vw - 48px))";
const TASK_CALENDAR_STORAGE_KEY = "airms.taskCalendar.enabled";
const TASK_CALENDAR_ENV_ENABLED =
  import.meta.env.VITE_TASK_CALENDAR_ENABLED === "true";
const MECHANIC_CALENDAR_COLORS = [
  { bg: "#e6f4ff", border: "#91caff", text: "#0958d9" },
  { bg: "#f6ffed", border: "#b7eb8f", text: "#237804" },
  { bg: "#fff7e6", border: "#ffd591", text: "#ad6800" },
  { bg: "#fff0f6", border: "#ffadd2", text: "#c41d7f" },
  { bg: "#f9f0ff", border: "#d3adf7", text: "#531dab" },
  { bg: "#e6fffb", border: "#87e8de", text: "#006d75" },
  { bg: "#fff1f0", border: "#ffa39e", text: "#cf1322" },
  { bg: "#f0f5ff", border: "#adc6ff", text: "#1d39c4" },
];

const getTaskCalendarFeatureFlag = () => {
  if (typeof window === "undefined") return TASK_CALENDAR_ENV_ENABLED;

  const storedValue = window.localStorage.getItem(TASK_CALENDAR_STORAGE_KEY);
  if (storedValue === "true") return true;
  if (storedValue === "false") return false;
  return TASK_CALENDAR_ENV_ENABLED;
};

const normalizeStatus = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();
const isTurnedIn = (task) => normalizeStatus(task?.status) === "turned in";
const isReviewed = (task) =>
  task?.isApproved || normalizeStatus(task?.status) === "approved";
const getTaskDate = (task, key) => {
  const value = task?.[key];
  const date = value ? dayjs(value) : null;
  return date?.isValid() ? date : null;
};
const isTaskOnCalendarDate = (task, date) => {
  const start =
    getTaskDate(task, "startDateTime") || getTaskDate(task, "dueDate");
  const end =
    getTaskDate(task, "endDateTime") || getTaskDate(task, "dueDate") || start;
  if (!start) return false;

  return (
    !start.isAfter(date.endOf("day")) && !end.isBefore(date.startOf("day"))
  );
};
const getStableColorIndex = (value = "") => {
  const text = String(value || "unassigned");
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash =
      (hash * 31 + text.charCodeAt(index)) % MECHANIC_CALENDAR_COLORS.length;
  }
  return hash;
};

const addMinutesToDate = (date, minutes) => {
  const safeDate = date instanceof Date ? date : new Date(date);
  return new Date(safeDate.getTime() + minutes * 60 * 1000);
};

const addDaysToDate = (date, days) => {
  const safeDate = date instanceof Date ? date : new Date(date);
  return new Date(safeDate.getTime() + days * 24 * 60 * 60 * 1000);
};

const estimateChecklistItemMinutes = (item = {}) => {
  const text = [
    item.taskName,
    item.component,
    item.description,
    item.documentation,
    item.correctiveAction,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (
    ["soap", "hoist", "overhaul", "cargo swing"].some((key) =>
      text.includes(key),
    )
  )
    return 30;
  if (
    ["coupling", "mast", "reduction gear", "free wheel", "damper"].some((key) =>
      text.includes(key),
    )
  )
    return 20;
  if (
    ["rotor", "swash", "pitch change", "servocontrol", "drive shaft"].some(
      (key) => text.includes(key),
    )
  )
    return 15;
  if (
    ["fuel", "oil", "hydraulic", "brake", "gear", "structure"].some((key) =>
      text.includes(key),
    )
  )
    return 12.5;
  if (
    ["door", "window", "seat", "harness", "pitot", "camera", "light"].some(
      (key) => text.includes(key),
    )
  )
    return 10;
  return DEFAULT_ITEM_MINUTES;
};

const estimateInspectionSchedule = (checklistItems = []) => {
  const validItems = checklistItems.filter((item) =>
    String(item?.taskName || "").trim(),
  );
  const checklistMinutes = validItems.reduce(
    (total, item) => total + estimateChecklistItemMinutes(item),
    0,
  );
  const minutes = Math.max(
    MINIMUM_TASK_MINUTES,
    BASE_TASK_MINUTES +
      checklistMinutes +
      validItems.length * CONTEXT_SWITCH_MINUTES_PER_ITEM,
  );
  return {
    itemCount: validItems.length,
    minutes,
    hours: Math.round((minutes / 60) * 100) / 100,
    days: Math.max(1, Math.ceil(minutes / 60)),
  };
};

const formatEstimatedDuration = (minutes) => {
  const days = Math.max(1, Math.ceil(Math.max(0, minutes) / 60));
  return `${days} day${days === 1 ? "" : "s"}`;
};

const formatDisplayDateTime = (value) =>
  value ? dayjs(value).format("MM/DD/YYYY h:mm A") : "Not set";

const isPastDueTask = (task) => {
  const deadline = task?.endDateTime || task?.dueDate;
  if (!deadline) return false;
  const dueDate = new Date(deadline);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return dueDate < today;
};

const getDefaultStart = () => addMinutesToDate(new Date(), 5);

const getScheduleDraftDates = (dueDate) => {
  const fallbackStart = getDefaultStart();
  const parsedDue = dueDate ? dayjs(dueDate) : null;

  if (!parsedDue?.isValid()) {
    return {
      startDateTime: dayjs(fallbackStart),
      endDateTime: dayjs(addDaysToDate(fallbackStart, 1)),
    };
  }

  const endDateTime = parsedDue.hour(17).minute(0).second(0).millisecond(0);
  if (endDateTime.isBefore(dayjs())) {
    return {
      startDateTime: dayjs(fallbackStart),
      endDateTime: dayjs(addDaysToDate(fallbackStart, 1)),
    };
  }

  return {
    startDateTime: endDateTime.subtract(1, "day").hour(8).minute(0),
    endDateTime,
  };
};

const findInspectionOptionForDraft = (inspectionOptions = [], draft = {}) => {
  const draftName = String(draft.inspectionName || "")
    .trim()
    .toLowerCase();
  const draftModel = String(draft.aircraftModel || "")
    .replace(/\s+/g, "")
    .toLowerCase();

  return inspectionOptions.find((inspection) => {
    const optionName = String(inspection.name || "")
      .trim()
      .toLowerCase();
    const optionModel = String(inspection.aircraftModel || "")
      .replace(/\s+/g, "")
      .toLowerCase();
    return (
      optionName === draftName &&
      (!draftModel || !optionModel || optionModel === draftModel)
    );
  });
};

const createCustomChecklistItem = (index = 0) => ({
  inspectionName: "Custom Task",
  aircraftModel: "",
  ata: { chapter: 0, chapterName: "", section: 0, sectionName: "" },
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
  interval: { flightHours: 0, calendarMonths: 0, specificInterval: "" },
});

const getChecklistItemKey = (item = {}) =>
  [
    String(item.taskId || "").trim(),
    String(item.taskName || "")
      .trim()
      .toLowerCase(),
    String(item.inspectionTypeFull || item.inspectionName || "")
      .trim()
      .toLowerCase(),
  ]
    .filter(Boolean)
    .join("|");

const normalizeChecklistItems = (
  rawItems = [],
  { title = "", inspectionType = "", selectedInspection = null } = {},
) =>
  (Array.isArray(rawItems) ? rawItems : [])
    .filter((item) => String(item?.taskName || "").trim())
    .map((item, index) => {
      const isCustom = inspectionType === CUSTOM_INSPECTION_ID;
      const taskId = String(item.taskId || "").trim();
      return {
        ...item,
        taskId: taskId || `custom-${Date.now()}-${index + 1}`,
        taskName: String(item.taskName || "").trim(),
        description: String(item.description || "").trim(),
        documentation: String(item.documentation || "").trim(),
        inspectionName: isCustom
          ? title || "Custom Task"
          : item.inspectionName || selectedInspection?.name || title,
        inspectionType: isCustom ? "Custom" : item.inspectionType || "",
        inspectionTypeFull: isCustom
          ? "Custom Task"
          : item.inspectionTypeFull ||
            item.inspectionName ||
            selectedInspection?.name ||
            "",
      };
    });

const buildChecklistState = (
  items = [],
  previousItems = [],
  previousState = [],
) => {
  const previousByKey = new Map();
  previousItems.forEach((item, index) => {
    const key = getChecklistItemKey(item);
    if (key) previousByKey.set(key, Boolean(previousState[index]));
  });

  return items.map((item) => {
    const key = getChecklistItemKey(item);
    return key && previousByKey.has(key) ? previousByKey.get(key) : false;
  });
};

const getChecklistCounts = (task = {}) => {
  const total = Array.isArray(task.checklistItems)
    ? task.checklistItems.length
    : 0;
  const done = Array.isArray(task.checklistState)
    ? task.checklistState.slice(0, total).filter(Boolean).length
    : 0;

  return { done, total };
};

const getChecklistMeta = (item = {}) =>
  [item.taskId, item.inspectionTypeFull || item.inspectionName]
    .filter(Boolean)
    .join(" | ");

const toUniqueSelectOptions = (items = [], getValue, getLabel = getValue) => {
  const seen = new Set();
  return items.reduce((options, item, index) => {
    const value = getValue(item, index);
    if (value === null || value === undefined || value === "") return options;
    const key = String(value);
    if (seen.has(key)) return options;
    seen.add(key);
    options.push({
      value,
      label: getLabel(item, index),
    });
    return options;
  }, []);
};

export default function TaskAssignment() {
  const { user, getAuthHeader } = useContext(AuthContext);
  const { modal } = AntdApp.useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [aircraftOptions, setAircraftOptions] = useState([]);
  const [inspectionOptions, setInspectionOptions] = useState([]);
  const [auxiliaryDataLoaded, setAuxiliaryDataLoaded] = useState(false);
  const [selectedAircraft, setSelectedAircraft] = useState("all");
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState("assigned");
  const [taskCalendarEnabled] = useState(getTaskCalendarFeatureFlag);
  const [selectedTask, setSelectedTask] = useState(null);
  const [checklistOpen, setChecklistOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [form] = Form.useForm();
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewNote, setReviewNote] = useState("");
  const [itemsToUncheck, setItemsToUncheck] = useState([]);
  const [signatureState, setSignatureState] = useState({
    open: false,
    mode: null,
  });
  const [popup, setPopup] = useState({
    open: false,
    status: "success",
    title: "",
    subTitle: "",
  });
  const consumedCreateDraftRef = useRef("");
  const role = String(user?.jobTitle || user?.access || "")
    .trim()
    .toLowerCase();
  const access = String(user?.access || "")
    .trim()
    .toLowerCase();
  const isSuperadmin = role === "superadmin" || access === "superadmin";
  const isManager = role === "maintenance manager" || isSuperadmin;
  const watchedInspectionType = Form.useWatch("inspectionType", form);
  const rawChecklistItems = Form.useWatch("checklistItems", form);
  const watchedChecklistItems = useMemo(
    () => rawChecklistItems || [],
    [rawChecklistItems],
  );
  const scheduleEstimate = useMemo(
    () => estimateInspectionSchedule(watchedChecklistItems),
    [watchedChecklistItems],
  );

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const headers = await getAuthHeader();
      const taskResponse = await fetch(`${API_BASE}/api/tasks/getAll`, {
        headers,
      });
      const taskData = await taskResponse.json();
      if (!taskResponse.ok)
        throw new Error(taskData.message || "Failed to load tasks");
      setTasks(Array.isArray(taskData.data) ? taskData.data : []);

      if (isManager) {
        const userResponse = await fetch(
          `${API_BASE}/api/user/assignable-users`,
          {
            headers,
          },
        );
        const userData = await userResponse.json();
        if (!userResponse.ok)
          throw new Error(userData.message || "Failed to load users");
        setUsers(Array.isArray(userData.data) ? userData.data : []);
      } else {
        setUsers([]);
      }
    } catch (error) {
      setPopup({
        open: true,
        status: "error",
        title: "Operation failed!",
        subTitle: error.message || "Failed to load tasks",
      });
    } finally {
      setLoading(false);
    }
  }, [getAuthHeader, isManager]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (typeof EventSource === "undefined") return undefined;

    const stream = new EventSource(`${API_BASE}/api/events/stream`);
    const onDataChanged = () => {
      load();
    };

    stream.addEventListener("data-changed", onDataChanged);

    return () => {
      stream.removeEventListener("data-changed", onDataChanged);
      stream.close();
    };
  }, [load]);

  useEffect(() => {
    const loadAuxiliaryData = async () => {
      try {
        const [aircraftResponse, inspectionsResponse] = await Promise.all([
          fetch(`${API_BASE}/api/parts-monitoring/aircraft-list`),
          fetch(`${API_BASE}/api/inspections/schedules`),
        ]);

        if (aircraftResponse.ok) {
          const aircraftData = await aircraftResponse.json();
          setAircraftOptions(
            Array.isArray(aircraftData?.data) ? aircraftData.data : [],
          );
        }

        if (inspectionsResponse.ok) {
          const inspectionData = await inspectionsResponse.json();
          const options = Array.from(
            new Map(
              (Array.isArray(inspectionData) ? inspectionData : []).map(
                (inspection) => [
                  inspection._id,
                  {
                    id: inspection._id,
                    name: inspection.inspectionName,
                    aircraftModel: inspection.aircraftModel,
                  },
                ],
              ),
            ).values(),
          );
          setInspectionOptions(options);
        }
      } catch {
        setAircraftOptions([]);
        setInspectionOptions([]);
      } finally {
        setAuxiliaryDataLoaded(true);
      }
    };

    loadAuxiliaryData();
  }, []);

  useEffect(() => {
    const nextTab = isManager ? "assigned" : "upcoming";
    setActiveTab(nextTab);
  }, [isManager]);

  useEffect(() => {
    if (!taskCalendarEnabled && activeTab === "calendar") {
      setActiveTab(isManager ? "assigned" : "upcoming");
    }
  }, [activeTab, isManager, taskCalendarEnabled]);

  const mechanics = useMemo(
    () =>
      users
        .filter(
          (item) =>
            String(item.jobTitle || "").toLowerCase() === "mechanic" &&
            String(item.status || "").toLowerCase() === "active",
        )
        .map((item) => {
          const id = item._id || item.id;
          return {
            ...item,
            id,
            name:
              item.name ||
              `${item.firstName || ""} ${item.lastName || ""}`.trim(),
            isBusy: tasks.some(
              (task) =>
                String(task.assignedTo || "") === String(id) &&
                ACTIVE_OPEN.has(normalizeStatus(task.status)),
            ),
          };
        }),
    [tasks, users],
  );

  const availableMechanics = useMemo(
    () => mechanics.filter((item) => !item.isBusy),
    [mechanics],
  );

  const getTaskAssigneeId = useCallback((task = {}) => {
    const assignee = task.assignedTo;
    if (assignee && typeof assignee === "object") {
      return assignee._id || assignee.id || "";
    }
    return assignee || "";
  }, []);

  const getTaskAssigneeName = useCallback(
    (task = {}) => {
      const assigneeId = getTaskAssigneeId(task);
      const matchedMechanic = mechanics.find(
        (item) => String(item.id) === String(assigneeId),
      );

      return (
        task.assignedToName ||
        matchedMechanic?.name ||
        (task.assignedTo && typeof task.assignedTo === "object"
          ? [task.assignedTo.firstName, task.assignedTo.lastName]
              .filter(Boolean)
              .join(" ")
          : "") ||
        "Assigned mechanic"
      );
    },
    [getTaskAssigneeId, mechanics],
  );

  const getTaskMechanicColor = useCallback(
    (task = {}) => {
      const colorKey =
        getTaskAssigneeId(task) || getTaskAssigneeName(task) || "unassigned";
      return MECHANIC_CALENDAR_COLORS[getStableColorIndex(colorKey)];
    },
    [getTaskAssigneeId, getTaskAssigneeName],
  );

  const mechanicSelectOptions = useMemo(() => {
    const source = editingTask ? mechanics : availableMechanics;
    const seen = new Set();
    const options = source.reduce((list, item) => {
      if (!item.id) return list;
      const key = String(item.id);
      if (seen.has(key)) return list;
      seen.add(key);
      list.push({
        value: item.id,
        label: `${item.name}${item.isBusy ? " (busy)" : ""}`,
        disabled: !editingTask && item.isBusy,
      });
      return list;
    }, []);

    if (editingTask) {
      const assignedTo = getTaskAssigneeId(editingTask);
      const hasCurrentAssignee = options.some(
        (option) => String(option.value) === String(assignedTo),
      );

      if (assignedTo && !hasCurrentAssignee) {
        options.unshift({
          value: assignedTo,
          label: getTaskAssigneeName(editingTask),
          disabled: false,
        });
      }
    }

    return options;
  }, [
    availableMechanics,
    editingTask,
    getTaskAssigneeId,
    getTaskAssigneeName,
    mechanics,
  ]);

  const aircraftSelectOptions = useMemo(
    () => toUniqueSelectOptions(aircraftOptions, (aircraft) => aircraft),
    [aircraftOptions],
  );

  const inspectionSelectOptions = useMemo(
    () => [
      { value: CUSTOM_INSPECTION_ID, label: "Custom Task" },
      ...toUniqueSelectOptions(
        inspectionOptions,
        (inspection) => inspection.id,
        (inspection) =>
          inspection.aircraftModel
            ? `${inspection.name} (${inspection.aircraftModel})`
            : inspection.name,
      ),
    ],
    [inspectionOptions],
  );

  const myTasks = useMemo(
    () =>
      isManager
        ? tasks
        : tasks.filter((task) => String(task.assignedTo) === String(user?.id)),
    [isManager, tasks, user?.id],
  );

  const filteredByTab = useMemo(() => {
    return myTasks.filter((task) => {
      if (
        !isManager &&
        selectedAircraft !== "all" &&
        task.aircraft !== selectedAircraft
      ) {
        return false;
      }

      if (activeTab === "assigned")
        return ACTIVE_OPEN.has(normalizeStatus(task.status));
      if (activeTab === "for_review")
        return (
          isTurnedIn(task) ||
          (normalizeStatus(task.status) === "completed" && !task.isApproved)
        );
      if (activeTab === "reviewed") return isReviewed(task);
      if (activeTab === "ongoing")
        return ACTIVE_OPEN.has(normalizeStatus(task.status));
      if (activeTab === "upcoming")
        return (
          ACTIVE_OPEN.has(normalizeStatus(task.status)) && !isPastDueTask(task)
        );
      if (activeTab === "past_due")
        return (
          ACTIVE_OPEN.has(normalizeStatus(task.status)) && isPastDueTask(task)
        );
      if (activeTab === "completed")
        return normalizeStatus(task.status) === "completed" || isTurnedIn(task);
      return true;
    });
  }, [activeTab, isManager, myTasks, selectedAircraft]);

  const displayedTasks = useMemo(() => {
    return filteredByTab.filter((task) => matchesSearch(query, task));
  }, [filteredByTab, query]);

  const calendarTasks = useMemo(() => {
    return myTasks.filter((task) => {
      if (
        !isManager &&
        selectedAircraft !== "all" &&
        task.aircraft !== selectedAircraft
      ) {
        return false;
      }

      return matchesSearch(query, task);
    });
  }, [isManager, myTasks, query, selectedAircraft]);

  const counts = useMemo(
    () => ({
      assigned: myTasks.filter((task) =>
        ACTIVE_OPEN.has(normalizeStatus(task.status)),
      ).length,
      forReview: myTasks.filter(
        (task) =>
          isTurnedIn(task) ||
          (normalizeStatus(task.status) === "completed" && !task.isApproved),
      ).length,
      reviewed: myTasks.filter((task) => isReviewed(task)).length,
      ongoing: myTasks.filter((task) =>
        ACTIVE_OPEN.has(normalizeStatus(task.status)),
      ).length,
      upcoming: myTasks.filter(
        (task) =>
          ACTIVE_OPEN.has(normalizeStatus(task.status)) && !isPastDueTask(task),
      ).length,
      pastDue: myTasks.filter(
        (task) =>
          ACTIVE_OPEN.has(normalizeStatus(task.status)) && isPastDueTask(task),
      ).length,
      completed: myTasks.filter(
        (task) =>
          normalizeStatus(task.status) === "completed" || isTurnedIn(task),
      ).length,
    }),
    [myTasks],
  );

  const upsertTask = async (taskPayload) => {
    const response = await fetch(`${API_BASE}/api/tasks/${taskPayload.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(await getAuthHeader()),
      },
      body: JSON.stringify({ ...taskPayload, confirmAction: true }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Failed to update task");
    return data.data;
  };

  const ensureEndAfterStart = (task, startDate) => {
    const nextStart =
      startDate instanceof Date ? startDate : new Date(startDate);
    const currentEnd = task?.endDateTime ? new Date(task.endDateTime) : null;
    if (currentEnd && currentEnd > nextStart) return task.endDateTime;
    return addDaysToDate(nextStart, 1).toISOString();
  };

  const loadInspectionTasks = async (inspectionId) => {
    if (inspectionId === CUSTOM_INSPECTION_ID) {
      const items = [createCustomChecklistItem(0)];
      const start =
        form.getFieldValue("startDateTime") || dayjs(getDefaultStart());
      const estimate = estimateInspectionSchedule(items);
      form.setFieldsValue({
        title: form.getFieldValue("title") || "Custom Task",
        maintenanceType: "Custom Task",
        checklistItems: items,
        endDateTime: dayjs(addDaysToDate(start.toDate(), estimate.days)),
      });
      return;
    }

    const inspection = inspectionOptions.find(
      (item) => item.id === inspectionId,
    );
    if (!inspection) return;

    form.setFieldsValue({ title: inspection.name });
    try {
      const response = await fetch(
        `${API_BASE}/api/inspections/tasks?inspectionName=${encodeURIComponent(inspection.name || "")}&aircraftModel=${encodeURIComponent(inspection.aircraftModel || "")}`,
      );
      const data = await response.json();
      if (!response.ok) throw new Error("Failed to fetch inspection tasks");
      const seen = new Set();
      const items = (Array.isArray(data) ? data : [])
        .map((item) => ({
          ...item,
          taskId: String(item?.taskId || "").trim(),
          taskName: String(item?.taskName || "").trim(),
          inspectionName: inspection.name,
          aircraftModel: inspection.aircraftModel,
        }))
        .filter((item) => {
          const key = `${item.taskId}|${item.taskName}|${item.inspectionTypeFull || ""}`;
          if (!item.taskName || seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      const start =
        form.getFieldValue("startDateTime") || dayjs(getDefaultStart());
      const estimate = estimateInspectionSchedule(items);
      form.setFieldsValue({
        checklistItems: items,
        maintenanceType: "Inspection",
        endDateTime: dayjs(addDaysToDate(start.toDate(), estimate.days)),
      });
    } catch (error) {
      setPopup({
        open: true,
        status: "error",
        title: "Operation failed!",
        subTitle: error.message || "Failed to fetch inspection tasks",
      });
      form.setFieldsValue({ checklistItems: [] });
    }
  };

  const openCreateTask = async (draft = null) => {
    const start = getDefaultStart();
    form.resetFields();
    form.setFieldsValue({
      startDateTime: dayjs(start),
      endDateTime: dayjs(addDaysToDate(start, 1)),
      priority: "Normal",
      maintenanceType: "Inspection",
      checklistItems: [],
    });
    setEditingTask(null);
    setCreateOpen(true);

    if (!draft) return;

    const matchedInspection = findInspectionOptionForDraft(
      inspectionOptions,
      draft,
    );
    const scheduleDates = getScheduleDraftDates(draft.dueDate);
    const inspectionType = matchedInspection?.id || CUSTOM_INSPECTION_ID;
    const remaining = [
      draft.remainingHours !== null && draft.remainingHours !== undefined
        ? `${draft.remainingHours} FH remaining`
        : "",
      draft.remainingDays !== null && draft.remainingDays !== undefined
        ? `${draft.remainingDays} day(s) remaining`
        : "",
      draft.dueAtHours !== null && draft.dueAtHours !== undefined
        ? `Due at ${draft.dueAtHours} FH`
        : "",
    ]
      .filter(Boolean)
      .join(" | ");

    form.setFieldsValue({
      aircraft: draft.aircraft || undefined,
      inspectionType,
      title: draft.inspectionName
        ? `Schedule ${draft.inspectionName}`
        : "Schedule inspection",
      priority: draft.priority || "Normal",
      maintenanceType: "Preventive Maintenance",
      ...scheduleDates,
      checklistItems: matchedInspection
        ? []
        : [
            {
              ...createCustomChecklistItem(0),
              taskName: draft.inspectionName || "Inspection planning",
              inspectionName: draft.inspectionName || "Inspection planning",
              inspectionTypeFull: draft.inspectionName || "Inspection planning",
              description: [
                draft.dueStatus ? `Due status: ${draft.dueStatus}` : "",
                remaining,
              ]
                .filter(Boolean)
                .join("\n"),
            },
          ],
    });

    if (matchedInspection) {
      await loadInspectionTasks(matchedInspection.id);
      form.setFieldsValue({
        aircraft: draft.aircraft || undefined,
        inspectionType: matchedInspection.id,
        priority: draft.priority || "Normal",
        maintenanceType: "Preventive Maintenance",
        ...scheduleDates,
      });
    }
  };

  useEffect(() => {
    const draft = location.state?.createTaskFromInspectionLimit;
    if (!draft || !auxiliaryDataLoaded) return;

    const draftKey = [
      draft.aircraft,
      draft.inspectionName,
      draft.dueDate,
      draft.dueAtHours,
    ].join("|");
    if (consumedCreateDraftRef.current === draftKey) return;
    consumedCreateDraftRef.current = draftKey;

    openCreateTask(draft);
    navigate(`${location.pathname}${location.search}`, {
      replace: true,
      state: null,
    });
  }, [
    auxiliaryDataLoaded,
    inspectionOptions,
    location.pathname,
    location.search,
    location.state,
    navigate,
  ]);

  const openEditTask = (task) => {
    const assignedTo = getTaskAssigneeId(task);
    setEditingTask(task);
    form.resetFields();
    form.setFieldsValue({
      title: task.title,
      aircraft: task.aircraft,
      assignedTo,
      priority: task.priority || "Normal",
      maintenanceType: task.maintenanceType || "Inspection",
      startDateTime: task.startDateTime ? dayjs(task.startDateTime) : null,
      endDateTime: task.endDateTime ? dayjs(task.endDateTime) : null,
      checklistItems: Array.isArray(task.checklistItems)
        ? task.checklistItems
        : [],
      inspectionType: CUSTOM_INSPECTION_ID,
    });
    setCreateOpen(true);
  };

  const deleteTask = async (task) => {
    try {
      const response = await fetch(
        `${API_BASE}/api/tasks/${task.id || task._id}`,
        {
          method: "DELETE",
          headers: {
            "x-action-confirmed": "true",
            ...(await getAuthHeader()),
          },
        },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(data.message || "Failed to delete task");
      setPopup({
        open: true,
        status: "success",
        title: "Task Deleted!",
        subTitle: "The task has been deleted successfully.",
      });
      await load();
    } catch (error) {
      setPopup({
        open: true,
        status: "error",
        title: "Operation failed!",
        subTitle: error.message || "Failed to delete task",
      });
    }
  };

  const handleStart = async () => {
    if (!selectedTask) return;
    const confirmed = await confirmAction({
      title: "Start Task",
      content: "Start this task now?",
      okText: "Start",
      modal,
    });
    if (!confirmed) return;

    const now = new Date();
    const next = {
      ...selectedTask,
      status: "Ongoing",
      startDateTime: now.toISOString(),
      endDateTime: ensureEndAfterStart(selectedTask, now),
    };
    try {
      await upsertTask(next);
      setPopup({
        open: true,
        status: "success",
        title: "Task Started!",
        subTitle: "The task has been started successfully.",
      });
      setChecklistOpen(false);
      await load();
    } catch (error) {
      setPopup({
        open: true,
        status: "error",
        title: "Operation failed!",
        subTitle: error.message || "Failed to start task",
      });
    }
  };

  const handleSaveDraftOrTurnIn = async (turnIn = false, options = {}) => {
    if (!selectedTask) return;
    const now = new Date().toISOString();
    const next = {
      ...selectedTask,
      status: options.undo
        ? "Ongoing"
        : turnIn
          ? "Turned in"
          : selectedTask.status,
      completedAt: options.undo
        ? null
        : turnIn
          ? now
          : selectedTask.completedAt,
      endDateTime: ensureEndAfterStart(
        selectedTask,
        selectedTask.startDateTime || selectedTask.createdAt || new Date(),
      ),
    };

    if (turnIn) {
      const checklist = Array.isArray(next.checklistState)
        ? next.checklistState
        : [];
      if (checklist.length > 0 && checklist.some((value) => !value)) {
        setPopup({
          open: true,
          status: "error",
          title: "Operation failed!",
          subTitle: "Please complete all checklist items before turning in",
        });
        return;
      }
    }

    if (turnIn || options.undo) {
      const confirmed = await confirmAction({
        title: options.undo ? "Undo Turn In" : "Turn In Task",
        content: options.undo
          ? "Move this task back to ongoing?"
          : "Turn in this completed task for review?",
        okText: options.undo ? "Undo" : "Turn In",
        modal,
      });
      if (!confirmed) return;
    }

    try {
      await upsertTask(next);
      const title = options.undo
        ? "Turn In Undone!"
        : turnIn
          ? "Task Turned In!"
          : "Draft Saved!";
      setPopup({
        open: true,
        status: "success",
        title,
        subTitle: "The task has been updated successfully.",
      });
      setChecklistOpen(false);
      await load();
    } catch (error) {
      setPopup({
        open: true,
        status: "error",
        title: "Operation failed!",
        subTitle: error.message || "Failed to update task",
      });
    }
  };

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      const confirmed = await confirmAction({
        title: editingTask ? "Save Task" : "Create Task",
        content: editingTask
          ? "Save changes to this task assignment?"
          : "Create this task assignment?",
        okText: editingTask ? "Save" : "Create",
        modal,
      });
      if (!confirmed) return;

      const selectedMechanic = mechanics.find(
        (item) => String(item.id) === String(values.assignedTo),
      );
      const selectedInspection = inspectionOptions.find(
        (item) => String(item.id) === String(values.inspectionType),
      );
      const checklistItems = normalizeChecklistItems(values.checklistItems, {
        title: values.title,
        inspectionType: values.inspectionType,
        selectedInspection,
      });
      const taskTitle = String(
        values.title ||
          selectedInspection?.name ||
          checklistItems[0]?.inspectionName ||
          checklistItems[0]?.inspectionTypeFull ||
          values.maintenanceType ||
          "Maintenance Task",
      ).trim();
      const payload = {
        id: editingTask?.id || editingTask?._id || Date.now().toString(),
        title: taskTitle,
        aircraft: values.aircraft,
        assignedTo: values.assignedTo,
        assignedToName: selectedMechanic?.name || "",
        startDateTime: values.startDateTime.toISOString(),
        endDateTime: values.endDateTime.toISOString(),
        dueDate: values.endDateTime.toISOString(),
        status: editingTask?.status || "Pending",
        priority: values.priority,
        maintenanceType:
          values.inspectionType === CUSTOM_INSPECTION_ID
            ? "Custom Task"
            : values.maintenanceType || "Inspection",
        performance: {
          estimatedHours: estimateInspectionSchedule(checklistItems).hours,
        },
        checklistItems,
        checklistState: buildChecklistState(
          checklistItems,
          editingTask?.checklistItems,
          editingTask?.checklistState,
        ),
        confirmAction: true,
      };

      const url = editingTask
        ? `${API_BASE}/api/tasks/${editingTask.id || editingTask._id}`
        : `${API_BASE}/api/tasks/create`;
      const response = await fetch(url, {
        method: editingTask ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          ...(await getAuthHeader()),
        },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to save task");
      setPopup({
        open: true,
        status: "success",
        title: editingTask ? "Task Updated!" : "Task Created!",
        subTitle: editingTask
          ? "The task has been updated successfully."
          : "The task has been created successfully.",
      });
      form.resetFields();
      setEditingTask(null);
      setCreateOpen(false);
      await load();
    } catch (error) {
      if (!error?.errorFields)
        setPopup({
          open: true,
          status: "error",
          title: "Operation failed!",
          subTitle: error.message || "Failed to create task",
        });
    }
  };

  const submitReturn = async () => {
    if (!selectedTask || !reviewNote.trim()) {
      setPopup({
        open: true,
        status: "error",
        title: "Operation failed!",
        subTitle: "Return remarks are required",
      });
      return;
    }

    const confirmed = await confirmAction({
      title: "Return Task",
      content:
        "Return this task to the mechanic with the selected checklist changes?",
      okText: "Return",
      okButtonProps: { danger: true },
      modal,
    });
    if (!confirmed) return;

    const nextChecklist = Array.isArray(selectedTask.checklistState)
      ? [...selectedTask.checklistState]
      : (selectedTask.checklistItems || []).map(() => false);

    itemsToUncheck.forEach((index) => {
      if (index >= 0 && index < nextChecklist.length)
        nextChecklist[index] = false;
    });

    try {
      await upsertTask({
        ...selectedTask,
        status: "Returned",
        isApproved: false,
        returnComments: reviewNote,
        returnedAt: new Date().toISOString(),
        reviewedAt: new Date().toISOString(),
        checklistState: nextChecklist,
      });
      setPopup({
        open: true,
        status: "success",
        title: "Task Returned!",
        subTitle: "The task has been returned successfully.",
      });
      setReviewOpen(false);
      setChecklistOpen(false);
      setReviewNote("");
      setItemsToUncheck([]);
      await load();
    } catch (error) {
      setPopup({
        open: true,
        status: "error",
        title: "Operation failed!",
        subTitle: error.message || "Failed to return task",
      });
    }
  };

  const submitApprove = async (signature) => {
    if (!selectedTask) return;
    const approver =
      `${user?.firstName || ""} ${user?.lastName || ""}`.trim() ||
      user?.username ||
      "Maintenance Manager";
    try {
      await upsertTask({
        ...selectedTask,
        status: "Approved",
        isApproved: true,
        approvedBy: approver,
        approvedSignature: signature,
        approvedAt: new Date().toISOString(),
        reviewedAt: new Date().toISOString(),
      });
      setPopup({
        open: true,
        status: "success",
        title: "Task Approved!",
        subTitle: "The task has been approved successfully.",
      });
      setSignatureState({ open: false, mode: null });
      setChecklistOpen(false);
      await load();
    } catch (error) {
      setPopup({
        open: true,
        status: "error",
        title: "Operation failed!",
        subTitle: error.message || "Failed to approve task",
      });
    }
  };

  const requestApprove = async () => {
    const confirmed = await confirmAction({
      title: "Approve Task",
      content: "Approve this turned-in task?",
      okText: "Approve",
      modal,
    });
    if (confirmed) setSignatureState({ open: true, mode: "approve" });
  };

  const tabs = [
    ...(isManager
      ? [
          { key: "assigned", label: `Assigned (${counts.assigned})` },
          { key: "for_review", label: `For Review (${counts.forReview})` },
          { key: "reviewed", label: `Reviewed (${counts.reviewed})` },
        ]
      : [
          { key: "upcoming", label: `Upcoming (${counts.upcoming})` },
          { key: "past_due", label: `Past Due (${counts.pastDue})` },
          { key: "completed", label: `Completed (${counts.completed})` },
        ]),
    ...(taskCalendarEnabled
      ? [{ key: "calendar", label: `Calendar (${calendarTasks.length})` }]
      : []),
  ];

  const renderTaskCalendarDate = (date) => {
    const allTasksForDate = calendarTasks.filter((task) =>
      isTaskOnCalendarDate(task, date),
    );
    const tasksForDate = allTasksForDate.slice(0, 4);

    if (!tasksForDate.length) return null;

    return (
      <Space orientation="vertical" size={2} style={{ width: "100%" }}>
        {tasksForDate.map((task) => {
          const mechanicColor = getTaskMechanicColor(task);
          const mechanicName = getTaskAssigneeName(task);
          const taskLabel = `${task.aircraft ? `${task.aircraft} - ` : ""}${
            task.title || task.maintenanceType || "Task"
          }`;

          return (
            <button
              key={`${task._id || task.id}-${date.format("YYYY-MM-DD")}`}
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setSelectedTask(task);
                setChecklistOpen(true);
              }}
              style={{
                width: "100%",
                border: `1px solid ${mechanicColor.border}`,
                borderRadius: 6,
                background: mechanicColor.bg,
                padding: "2px 6px",
                textAlign: "left",
                cursor: "pointer",
              }}
            >
              <Text
                style={{
                  display: "block",
                  maxWidth: "100%",
                  color: mechanicColor.text,
                  fontSize: 12,
                  fontWeight: 600,
                  lineHeight: 1.4,
                }}
                ellipsis={{
                  tooltip: `${taskLabel} | ${mechanicName}`,
                }}
              >
                {taskLabel}
              </Text>
              {isManager && (
                <Text
                  style={{
                    display: "block",
                    maxWidth: "100%",
                    color: mechanicColor.text,
                    fontSize: 11,
                    lineHeight: 1.3,
                    opacity: 0.78,
                  }}
                  ellipsis={{ tooltip: mechanicName }}
                >
                  {mechanicName}
                </Text>
              )}
            </button>
          );
        })}
        {allTasksForDate.length > tasksForDate.length && (
          <Text type="secondary" style={{ fontSize: 12 }}>
            +{allTasksForDate.length - tasksForDate.length} more
          </Text>
        )}
      </Space>
    );
  };

  return (
    <div style={{ padding: 20 }}>
      <Card>
        <Row gutter={[12, 12]}>
          <Col xs={24} md={10}>
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tasks"
              prefix={<SearchOutlined />}
              size="large"
            />
          </Col>
          {isManager && (
            <Col xs={24} md={6}>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={openCreateTask}
                size="large"
              >
                Task
              </Button>
            </Col>
          )}
          {!isManager && (
            <Col xs={24} md={6}>
              <Select
                style={{ width: "100%" }}
                value={selectedAircraft}
                onChange={setSelectedAircraft}
                options={[
                  { value: "all", label: "All Aircraft" },
                  ...aircraftOptions.map((aircraft) => ({
                    value: aircraft,
                    label: aircraft,
                  })),
                ]}
              />
            </Col>
          )}
        </Row>
        <Tabs
          style={{ marginTop: 10 }}
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabs}
        />
      </Card>

      {activeTab === "calendar" && taskCalendarEnabled ? (
        <Card
          style={{ marginTop: 12 }}
          loading={loading}
          styles={{ body: { padding: 12 } }}
        >
          <Calendar
            cellRender={(date, info) =>
              info.type === "date"
                ? renderTaskCalendarDate(date)
                : info.originNode
            }
          />
        </Card>
      ) : (
        <ResponsiveTable
          style={{ marginTop: 12 }}
          loading={loading}
          size={"small"}
          rowKey={(record, index) =>
            `${record._id || record.id || "task"}-${index}`
          }
          dataSource={displayedTasks}
          pagination={{ pageSize: 10 }}
          scroll={{ x: "max-content" }}
          mobileBreakpoint="sm"
          mobilePrimaryColumn="title"
          mobileSecondaryColumn="id"
          mobileMetaLimit={5}
          onRow={(record) => ({
            onClick: () => {
              setSelectedTask(record);
              setChecklistOpen(true);
            },
          })}
          columns={[
            { title: "Task ID", dataIndex: "id" },
            { title: "Title", dataIndex: "title" },
            { title: "Aircraft", dataIndex: "aircraft" },
            { title: "Assigned To", dataIndex: "assignedToName" },
            {
              title: "Progress",
              render: (_, record) => {
                const { done, total } = getChecklistCounts(record);
                return total ? (
                  <Progress
                    percent={Math.round((done / total) * 100)}
                    size="small"
                  />
                ) : (
                  "-"
                );
              },
            },
            {
              title: "Status",
              dataIndex: "status",
              render: (value) => renderStatusTag(value, "Pending"),
            },
            {
              title: "Due",
              render: (_, record) => (
                <DateTimeCell
                  value={record.endDateTime || record.dueDate}
                  fallback="Not set"
                />
              ),
            },
            ...(isManager
              ? [
                  {
                    title: "Actions",
                    render: (_, record) => {
                      const status = normalizeStatus(record.status);
                      const canEditDelete =
                        activeTab === "assigned" &&
                        (isSuperadmin || status === "pending");
                      if (!canEditDelete) return null;
                      return (
                        <Space
                          size={12}
                          onClick={(event) => event.stopPropagation()}
                        >
                          <Tooltip title="Edit">
                            <Button
                              size="small"
                              aria-label="Edit"
                              icon={<EditOutlined />}
                              onClick={() => openEditTask(record)}
                            />
                          </Tooltip>
                          <Tooltip title="Delete">
                            <Popconfirm
                              title="Delete task?"
                              description="This task assignment will be removed permanently."
                              okText="Delete"
                              okButtonProps={{ danger: true }}
                              onConfirm={() => deleteTask(record)}
                            >
                              <Button
                                size="small"
                                danger
                                aria-label="Delete"
                                icon={<DeleteOutlined />}
                              />
                            </Popconfirm>
                          </Tooltip>
                        </Space>
                      );
                    },
                  },
                ]
              : []),
          ]}
        />
      )}

      <Modal
        open={createOpen}
        onCancel={() => {
          setCreateOpen(false);
          setEditingTask(null);
        }}
        zIndex={9999}
        onOk={handleCreate}
        title={editingTask ? "Edit Task" : "Task"}
        okText={editingTask ? "Save" : "Add Task"}
        width={TASK_MODAL_WIDTH}
        centered
        styles={{
          body: TASK_MODAL_BODY_STYLE,
        }}
      >
        <Form form={form} layout="vertical">
          <Space orientation="vertical" size={6} style={{ width: "100%" }}>
            <Row gutter={[12, 4]}>
              <Col xs={24} md={12}>
                <Form.Item
                  label="Aircraft"
                  name="aircraft"
                  rules={[{ required: true, message: "Aircraft is required" }]}
                >
                  <Select
                    size="large"
                    placeholder="Tail No."
                    showSearch
                    options={aircraftSelectOptions}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  label="Inspection"
                  name="inspectionType"
                  rules={[
                    { required: true, message: "Inspection is required" },
                  ]}
                >
                  <Select
                    size="large"
                    placeholder="Pick Inspection"
                    disabled={Boolean(editingTask)}
                    onChange={loadInspectionTasks}
                    options={inspectionSelectOptions}
                  />
                </Form.Item>
              </Col>
              {watchedInspectionType === CUSTOM_INSPECTION_ID && (
                <Col xs={24}>
                  <Form.Item
                    label="Custom Task Name"
                    name="title"
                    rules={[
                      {
                        required: true,
                        message: "Custom task name is required",
                      },
                      {
                        min: 3,
                        message: "Task name must be at least 3 characters",
                      },
                    ]}
                  >
                    <Input size="large" placeholder="Enter task name" />
                  </Form.Item>
                </Col>
              )}
              <Col xs={24} md={12}>
                <Form.Item
                  label="Assign Mechanic"
                  name="assignedTo"
                  rules={[{ required: true, message: "Assignee is required" }]}
                >
                  <Select
                    size="large"
                    placeholder="Pick Mechanic"
                    showSearch
                    optionFilterProp="label"
                    options={mechanicSelectOptions}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  label="Priority"
                  name="priority"
                  initialValue="Normal"
                >
                  <Select
                    size="large"
                    options={["Low", "Normal", "High"].map((value) => ({
                      value,
                      label: value,
                    }))}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  label="Start Date/Time"
                  name="startDateTime"
                  rules={[
                    { required: true, message: "Start date/time is required" },
                  ]}
                >
                  <DatePicker
                    size="large"
                    style={{ width: "100%" }}
                    format="MM/DD/YYYY HH:mm"
                    showTime={{ format: "HH:mm" }}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  label="End Date/Time"
                  name="endDateTime"
                  dependencies={["startDateTime"]}
                  rules={[
                    { required: true, message: "End date/time is required" },
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        const start = getFieldValue("startDateTime");
                        if (!start || !value) return Promise.resolve();
                        if (dayjs(value).isAfter(dayjs(start)))
                          return Promise.resolve();
                        return Promise.reject(
                          new Error(
                            "End date/time must be later than start date/time",
                          ),
                        );
                      },
                    }),
                  ]}
                >
                  <DatePicker
                    size="large"
                    style={{ width: "100%" }}
                    format="MM/DD/YYYY HH:mm"
                    showTime={{ format: "HH:mm" }}
                  />
                </Form.Item>
              </Col>
              <Col xs={24}>
                <Form.Item
                  label="Maintenance Type"
                  name="maintenanceType"
                  initialValue="Inspection"
                >
                  <Select
                    size="large"
                    options={[
                      "Corrective Maintenance",
                      "Preventive Maintenance",
                      "Inspection",
                      "Custom Task",
                    ].map((value) => ({ value, label: value }))}
                  />
                </Form.Item>
              </Col>
              <Col xs={24}>
                <Divider titlePlacement="left">Checklist</Divider>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <Text type="secondary">
                    Estimated duration:{" "}
                    {formatEstimatedDuration(scheduleEstimate.minutes)}
                  </Text>
                  <Text
                    strong
                    style={{
                      background: "#f0f7f5",
                      border: "1px solid #cfe5de",
                      borderRadius: 999,
                      color: "#155f4e",
                      padding: "3px 10px",
                    }}
                  >
                    {scheduleEstimate.itemCount} item
                    {scheduleEstimate.itemCount === 1 ? "" : "s"}
                  </Text>
                </div>
                <Form.List
                  name="checklistItems"
                  rules={[
                    {
                      validator: async (_, value) => {
                        const count = (value || []).filter((item) =>
                          String(item?.taskName || "").trim(),
                        ).length;
                        if (count > 0) return;
                        throw new Error("Enter at least one checklist item");
                      },
                    },
                  ]}
                >
                  {(fields, { add, remove }, { errors }) => (
                    <Space
                      orientation="vertical"
                      style={{ width: "100%", marginTop: 12 }}
                    >
                      <Row gutter={[8, 8]}>
                        {fields.map((field, index) => {
                          const item = watchedChecklistItems?.[index] || {};
                          const { key: fieldKey, ...fieldProps } = field;
                          return (
                            <Col xs={24} key={fieldKey}>
                              <Card
                                size="small"
                                styles={{
                                  header: {
                                    minHeight: 34,
                                    padding: "0 10px",
                                  },
                                  body: { padding: "8px 10px" },
                                }}
                                title={
                                  <Space
                                    size={8}
                                    style={{ maxWidth: "100%", minWidth: 0 }}
                                  >
                                    <Text strong style={{ fontSize: 12 }}>
                                      #{index + 1}
                                    </Text>
                                    <Text
                                      type="secondary"
                                      style={{
                                        fontSize: 12,
                                        maxWidth: 360,
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap",
                                      }}
                                    >
                                      {getChecklistMeta(item) ||
                                        "Checklist item"}
                                    </Text>
                                  </Space>
                                }
                                extra={
                                  watchedInspectionType ===
                                  CUSTOM_INSPECTION_ID ? (
                                    <Tooltip title="Remove item">
                                      <Button
                                        danger
                                        size="small"
                                        aria-label="Remove checklist item"
                                        icon={<DeleteOutlined />}
                                        onClick={() => remove(field.name)}
                                      />
                                    </Tooltip>
                                  ) : null
                                }
                                style={{ borderRadius: 8, height: "100%" }}
                              >
                                <Form.Item
                                  {...fieldProps}
                                  name={[field.name, "taskName"]}
                                  style={{ marginBottom: 6 }}
                                  rules={[
                                    {
                                      required: true,
                                      message: "Checklist item is required",
                                    },
                                  ]}
                                >
                                  <Input
                                    placeholder="Checklist item"
                                    disabled={
                                      watchedInspectionType !==
                                      CUSTOM_INSPECTION_ID
                                    }
                                  />
                                </Form.Item>
                                {watchedInspectionType ===
                                CUSTOM_INSPECTION_ID ? (
                                  <Form.Item
                                    {...fieldProps}
                                    name={[field.name, "description"]}
                                    style={{ marginBottom: 0 }}
                                  >
                                    <Input.TextArea
                                      rows={1}
                                      placeholder="Description / notes"
                                    />
                                  </Form.Item>
                                ) : (
                                  <div
                                    style={{
                                      background: "#fafafa",
                                      border: "1px solid #f0f0f0",
                                      borderRadius: 6,
                                      padding: "5px 8px",
                                    }}
                                  >
                                    {item.description ? (
                                      <Text
                                        type="secondary"
                                        style={{ fontSize: 12 }}
                                      >
                                        {item.description}
                                      </Text>
                                    ) : item.documentation ? (
                                      <Text
                                        type="secondary"
                                        style={{ fontSize: 12 }}
                                      >
                                        Reference: {item.documentation}
                                      </Text>
                                    ) : (
                                      <Text
                                        type="secondary"
                                        style={{ fontSize: 12 }}
                                      >
                                        No additional notes.
                                      </Text>
                                    )}
                                  </div>
                                )}
                              </Card>
                            </Col>
                          );
                        })}
                      </Row>
                      {watchedInspectionType === CUSTOM_INSPECTION_ID && (
                        <Button
                          icon={<PlusOutlined />}
                          onClick={() =>
                            add(createCustomChecklistItem(fields.length))
                          }
                        >
                          Add Checklist Item
                        </Button>
                      )}
                      <Form.ErrorList errors={errors} />
                    </Space>
                  )}
                </Form.List>
              </Col>
            </Row>
          </Space>
        </Form>
      </Modal>

      <Modal
        open={checklistOpen}
        onCancel={() => setChecklistOpen(false)}
        title={selectedTask?.title || "Task Checklist"}
        width={TASK_DETAIL_MODAL_WIDTH}
        centered
        footer={null}
      >
        {selectedTask && (
          <Space orientation="vertical" style={{ width: "100%" }} size={8}>
            {(() => {
              const { done, total } = getChecklistCounts(selectedTask);
              const percent = total ? Math.round((done / total) * 100) : 0;

              return (
                <Card
                  size="small"
                  styles={{ body: { padding: "8px 10px" } }}
                  style={{ background: "#fbfcfc", borderRadius: 8 }}
                >
                  <Space
                    orientation="vertical"
                    size={4}
                    style={{ width: "100%" }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: 12,
                        flexWrap: "wrap",
                      }}
                    >
                      <div>
                        <Text strong>
                          {selectedTask.aircraft || "Aircraft"}
                        </Text>
                        <div>
                          <Text type="secondary">
                            Due:{" "}
                            {formatDisplayDateTime(
                              selectedTask.endDateTime || selectedTask.dueDate,
                            )}
                          </Text>
                        </div>
                      </div>
                      <Text
                        strong
                        style={{
                          background:
                            done === total && total ? "#e8f5e9" : "#eef6ff",
                          border:
                            done === total && total
                              ? "1px solid #b7eb8f"
                              : "1px solid #cfe3ff",
                          borderRadius: 999,
                          color:
                            done === total && total ? "#2e7d32" : "#1554ad",
                          padding: "3px 10px",
                        }}
                      >
                        {done}/{total} done
                      </Text>
                    </div>
                    {total > 0 && (
                      <Progress
                        percent={percent}
                        size="small"
                        strokeColor="#26866F"
                      />
                    )}
                  </Space>
                </Card>
              );
            })()}
            {!!selectedTask.returnComments && (
              <Card
                size="small"
                style={{ background: "#fff1f0", borderColor: "#ffccc7" }}
              >
                <Text strong>
                  {normalizeStatus(selectedTask.status) === "returned"
                    ? "Returned for Rework:"
                    : "Remarks:"}
                </Text>{" "}
                {selectedTask.returnComments}
              </Card>
            )}

            {(normalizeStatus(selectedTask.status) === "completed" ||
              isTurnedIn(selectedTask) ||
              isReviewed(selectedTask)) && (
              <Card
                size="small"
                style={{ background: "#f6ffed", borderColor: "#b7eb8f" }}
              >
                <Text strong>Task Completed</Text>
                <div style={{ marginTop: 6 }}>
                  {isReviewed(selectedTask) ? (
                    <>
                      {renderStatusTag("approved")}
                      <Text type="secondary">
                        {selectedTask.approvedBy
                          ? `Approved by ${selectedTask.approvedBy}`
                          : "Approved by Maintenance Manager"}
                        {selectedTask.approvedAt
                          ? ` on ${formatDisplayDateTime(selectedTask.approvedAt)}`
                          : ""}
                      </Text>
                      {!!selectedTask.approvedSignature && (
                        <div>
                          <img
                            src={selectedTask.approvedSignature}
                            alt="Approval signature"
                            style={{
                              maxWidth: 360,
                              width: "100%",
                              height: 70,
                              objectFit: "contain",
                              marginTop: 10,
                              border: "1px solid #d9f7be",
                              borderRadius: 6,
                            }}
                          />
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      {renderStatusTag("pending approval")}
                      <Text type="secondary">
                        Pending review by Maintenance Manager
                      </Text>
                    </>
                  )}
                </div>
              </Card>
            )}

            {selectedTask.checklistItems?.length ? (
              <Row gutter={[8, 8]}>
                {selectedTask.checklistItems.map((item, index) => {
                  const isDone = Array.isArray(selectedTask.checklistState)
                    ? Boolean(selectedTask.checklistState[index])
                    : false;
                  const readOnly =
                    isManager ||
                    isReviewed(selectedTask) ||
                    isTurnedIn(selectedTask) ||
                    normalizeStatus(selectedTask.status) === "completed";
                  return (
                    <Col
                      xs={24}
                      lg={12}
                      key={`${item.taskId || item.taskName}-${index}`}
                    >
                      <Card
                        size="small"
                        styles={{ body: { padding: "8px 10px" } }}
                        style={{
                          borderRadius: 8,
                          borderColor: isDone ? "#b7eb8f" : "#eaecf0",
                          background: isDone ? "#f6ffed" : "#ffffff",
                          height: "100%",
                        }}
                      >
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "24px minmax(0, 1fr)",
                            gap: 8,
                            alignItems: "start",
                          }}
                        >
                          <Checkbox
                            checked={isDone}
                            disabled={readOnly}
                            aria-label={`Checklist item ${index + 1}`}
                            onChange={(e) => {
                              const state = Array.isArray(
                                selectedTask.checklistState,
                              )
                                ? [...selectedTask.checklistState]
                                : (selectedTask.checklistItems || []).map(
                                    () => false,
                                  );
                              state[index] = e.target.checked;
                              setSelectedTask((prev) => ({
                                ...prev,
                                checklistState: state,
                              }));
                            }}
                          />
                          <div style={{ minWidth: 0 }}>
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                gap: 8,
                                flexWrap: "wrap",
                              }}
                            >
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                Item {index + 1}
                              </Text>
                              <Text
                                strong
                                style={{
                                  color: isDone ? "#2e7d32" : "#667085",
                                  fontSize: 12,
                                }}
                              >
                                {isDone ? "Done" : "Open"}
                              </Text>
                            </div>
                            {!!getChecklistMeta(item) && (
                              <div>
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                  {getChecklistMeta(item)}
                                </Text>
                              </div>
                            )}
                            <div style={{ marginTop: 2 }}>
                              <Text strong style={{ overflowWrap: "anywhere" }}>
                                {item.taskName || "Checklist item"}
                              </Text>
                            </div>
                            {!!item.documentation && (
                              <div style={{ marginTop: 2 }}>
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                  Reference: {item.documentation}
                                </Text>
                              </div>
                            )}
                            {!!item.description && (
                              <div
                                style={{
                                  marginTop: 4,
                                  background: "#fafafa",
                                  border: "1px solid #f0f0f0",
                                  borderRadius: 6,
                                  padding: "5px 8px",
                                }}
                              >
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                  {item.description}
                                </Text>
                              </div>
                            )}
                          </div>
                        </div>
                      </Card>
                    </Col>
                  );
                })}
              </Row>
            ) : (
              <Card size="small" style={{ background: "#fafafa" }}>
                <Text type="secondary">
                  No checklist items were added to this task.
                </Text>
              </Card>
            )}

            {!isManager && (
              <>
                {(normalizeStatus(selectedTask.status) === "ongoing" ||
                  normalizeStatus(selectedTask.status) === "returned" ||
                  isTurnedIn(selectedTask) ||
                  isReviewed(selectedTask)) && (
                  <>
                    <Text strong>Findings (AI-interpreted)</Text>
                    <Text type="secondary">
                      Include symptoms, affected components, inspection results,
                      and corrective details when available.
                    </Text>
                    <Input.TextArea
                      rows={4}
                      value={selectedTask.findings || ""}
                      onChange={(e) =>
                        setSelectedTask((prev) => ({
                          ...prev,
                          findings: e.target.value,
                        }))
                      }
                      placeholder="Enter findings, symptoms, affected parts, and inspection results here..."
                      disabled={
                        isReviewed(selectedTask) || isTurnedIn(selectedTask)
                      }
                    />
                  </>
                )}
              </>
            )}

            <Space style={{ justifyContent: "flex-end", width: "100%" }}>
              {isManager &&
                isTurnedIn(selectedTask) &&
                !isReviewed(selectedTask) && (
                  <>
                    <Button danger onClick={() => setReviewOpen(true)}>
                      Return
                    </Button>
                    <Button type="primary" onClick={requestApprove}>
                      Approve
                    </Button>
                  </>
                )}

              {!isManager &&
                normalizeStatus(selectedTask.status) === "pending" && (
                  <Button type="primary" onClick={handleStart}>
                    Start Task
                  </Button>
                )}

              {!isManager &&
                (normalizeStatus(selectedTask.status) === "ongoing" ||
                  normalizeStatus(selectedTask.status) === "returned") && (
                  <Button
                    type="primary"
                    onClick={() => {
                      const checklist = Array.isArray(
                        selectedTask.checklistState,
                      )
                        ? selectedTask.checklistState
                        : [];
                      const allChecked =
                        selectedTask.checklistItems?.length > 0 &&
                        selectedTask.checklistItems.every(
                          (_, index) => checklist[index],
                        );
                      handleSaveDraftOrTurnIn(allChecked);
                    }}
                  >
                    {selectedTask.checklistItems?.length > 0 &&
                    selectedTask.checklistItems.every(
                      (_, index) => selectedTask.checklistState?.[index],
                    )
                      ? "Turn in"
                      : "Save"}
                  </Button>
                )}

              {!isManager &&
                (isTurnedIn(selectedTask) ||
                  normalizeStatus(selectedTask.status) === "completed") &&
                !isReviewed(selectedTask) && (
                  <Button
                    type="primary"
                    onClick={() =>
                      handleSaveDraftOrTurnIn(false, { undo: true })
                    }
                  >
                    Undo Turn In
                  </Button>
                )}
            </Space>
          </Space>
        )}
      </Modal>

      <Modal
        open={reviewOpen}
        title="Return Task"
        okText="Return"
        onOk={submitReturn}
        onCancel={() => setReviewOpen(false)}
        width={720}
      >
        <Space orientation="vertical" style={{ width: "100%" }} size={10}>
          <Text>Uncheck items that need rework:</Text>
          <Row gutter={[8, 8]}>
            {(selectedTask?.checklistItems || [])
              .map((item, index) => ({ item, index }))
              .filter(
                ({ index }) => (selectedTask?.checklistState || [])[index],
              )
              .map(({ item, index }) => (
                <Col
                  xs={24}
                  md={12}
                  key={`${item.taskId || item.taskName}-${index}`}
                >
                  <Checkbox
                    checked={!itemsToUncheck.includes(index)}
                    onChange={(e) => {
                      setItemsToUncheck((prev) => {
                        if (!e.target.checked) {
                          if (prev.includes(index)) return prev;
                          return [...prev, index];
                        }
                        if (prev.includes(index)) return prev;
                        return prev.filter((v) => v !== index);
                      });
                    }}
                  >
                    <Text>{item.taskName}</Text>
                    <br />
                    <Text type="secondary">
                      {[item.taskId, item.inspectionTypeFull]
                        .filter(Boolean)
                        .join(" | ")}
                    </Text>
                  </Checkbox>
                </Col>
              ))}
          </Row>
          <Input.TextArea
            rows={4}
            value={reviewNote}
            onChange={(e) => setReviewNote(e.target.value)}
            placeholder="Return remarks"
          />
        </Space>
      </Modal>

      <PinVerifiedSignatureModal
        open={signatureState.open && signatureState.mode === "approve"}
        title="Approve Task"
        description="Draw your approval signature below."
        confirmDescription="Enter your 6-digit PIN to approve this task."
        onCancel={() => setSignatureState({ open: false, mode: null })}
        onSave={submitApprove}
      />
      <ResultPopup
        open={popup.open}
        status={popup.status}
        title={popup.title}
        subTitle={popup.subTitle}
        onClose={() => setPopup((prev) => ({ ...prev, open: false }))}
      />
    </div>
  );
}
