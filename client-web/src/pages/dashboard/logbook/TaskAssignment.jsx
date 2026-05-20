import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Button,
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
  Table,
  Tabs,
  Tag,
  Typography,
  DatePicker,
  message,
} from "antd";
import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { AuthContext } from "../../../context/AuthContext";
import { API_BASE } from "../../../utils/API_BASE";
import { confirmAction } from "../../../utils/confirmAction";
import PinVerifiedSignatureModal from "../../../components/common/PinVerifiedSignatureModal";

const { Text } = Typography;
const ACTIVE_OPEN = new Set(["pending", "ongoing", "returned"]);
const CUSTOM_INSPECTION_ID = "custom-task";
const MINIMUM_TASK_MINUTES = 60;
const BASE_TASK_MINUTES = 10;
const CONTEXT_SWITCH_MINUTES_PER_ITEM = 2;
const DEFAULT_ITEM_MINUTES = 12;

const normalizeStatus = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();
const isTurnedIn = (task) => normalizeStatus(task?.status) === "turned in";
const isReviewed = (task) =>
  task?.isApproved || normalizeStatus(task?.status) === "approved";

const addMinutesToDate = (date, minutes) => {
  const safeDate = date instanceof Date ? date : new Date(date);
  return new Date(safeDate.getTime() + minutes * 60 * 1000);
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

  if (["soap", "hoist", "overhaul", "cargo swing"].some((key) => text.includes(key))) return 30;
  if (["coupling", "mast", "reduction gear", "free wheel", "damper"].some((key) => text.includes(key))) return 20;
  if (["rotor", "swash", "pitch change", "servocontrol", "drive shaft"].some((key) => text.includes(key))) return 15;
  if (["fuel", "oil", "hydraulic", "brake", "gear", "structure"].some((key) => text.includes(key))) return 12.5;
  if (["door", "window", "seat", "harness", "pitot", "camera", "light"].some((key) => text.includes(key))) return 10;
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
  };
};

const formatEstimatedDuration = (minutes) => {
  const wholeMinutes = Math.max(0, Math.round(minutes));
  const hours = Math.floor(wholeMinutes / 60);
  const remainingMinutes = wholeMinutes % 60;
  if (hours === 0) return `${remainingMinutes} min`;
  if (remainingMinutes === 0) return `${hours} hr`;
  return `${hours} hr ${remainingMinutes} min`;
};

const formatDisplayDateTime = (value) =>
  value ? dayjs(value).format("MMM D, YYYY h:mm A") : "Not set";

const isPastDueTask = (task) => {
  const deadline = task?.endDateTime || task?.dueDate;
  if (!deadline) return false;
  const dueDate = new Date(deadline);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return dueDate < today;
};

const getDefaultStart = () => addMinutesToDate(new Date(), 5);

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
  conditions: { modificationStatus: "", modificationNumbers: [], effectivity: [] },
  interval: { flightHours: 0, calendarMonths: 0, specificInterval: "" },
});

export default function TaskAssignment() {
  const { user, getAuthHeader } = useContext(AuthContext);
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [aircraftOptions, setAircraftOptions] = useState([]);
  const [inspectionOptions, setInspectionOptions] = useState([]);
  const [selectedAircraft, setSelectedAircraft] = useState("all");
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState("assigned");
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
  const role = user?.jobTitle?.toLowerCase() || "";
  const isManager = ["maintenance manager", "admin"].includes(role);
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
        const userResponse = await fetch(`${API_BASE}/api/user/assignable-users`, {
          headers,
        });
        const userData = await userResponse.json();
        if (!userResponse.ok)
          throw new Error(userData.message || "Failed to load users");
        setUsers(Array.isArray(userData.data) ? userData.data : []);
      } else {
        setUsers([]);
      }
    } catch (error) {
      message.error(error.message || "Failed to load tasks");
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
          setAircraftOptions(Array.isArray(aircraftData?.data) ? aircraftData.data : []);
        }

        if (inspectionsResponse.ok) {
          const inspectionData = await inspectionsResponse.json();
          const options = Array.from(
            new Map(
              (Array.isArray(inspectionData) ? inspectionData : []).map((inspection) => [
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
        }
      } catch {
        setAircraftOptions([]);
        setInspectionOptions([]);
      }
    };

    loadAuxiliaryData();
  }, []);

  useEffect(() => {
    const nextTab = isManager ? "assigned" : "upcoming";
    setActiveTab(nextTab);
  }, [isManager]);

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

  const myTasks = useMemo(
    () =>
      isManager
        ? tasks
        : tasks.filter((task) => String(task.assignedTo) === String(user?.id)),
    [isManager, tasks, user?.id],
  );

  const filteredByTab = useMemo(() => {
    return myTasks.filter((task) => {
      if (!isManager && selectedAircraft !== "all" && task.aircraft !== selectedAircraft) {
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
        return ACTIVE_OPEN.has(normalizeStatus(task.status)) && !isPastDueTask(task);
      if (activeTab === "past_due")
        return ACTIVE_OPEN.has(normalizeStatus(task.status)) && isPastDueTask(task);
      if (activeTab === "completed")
        return normalizeStatus(task.status) === "completed" || isTurnedIn(task);
      return true;
    });
  }, [activeTab, isManager, myTasks, selectedAircraft]);

  const displayedTasks = useMemo(() => {
    return filteredByTab.filter((task) => {
      const needle = query.trim().toLowerCase();
      if (!needle) return true;
      return [task.id, task.title, task.aircraft, task.assignedToName].some(
        (value) =>
          String(value || "")
            .toLowerCase()
            .includes(needle),
      );
    });
  }, [filteredByTab, query]);

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
        (task) => ACTIVE_OPEN.has(normalizeStatus(task.status)) && !isPastDueTask(task),
      ).length,
      pastDue: myTasks.filter(
        (task) => ACTIVE_OPEN.has(normalizeStatus(task.status)) && isPastDueTask(task),
      ).length,
      completed: myTasks.filter(
        (task) => normalizeStatus(task.status) === "completed" || isTurnedIn(task),
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
    const nextStart = startDate instanceof Date ? startDate : new Date(startDate);
    const currentEnd = task?.endDateTime ? new Date(task.endDateTime) : null;
    if (currentEnd && currentEnd > nextStart) return task.endDateTime;
    return new Date(nextStart.getTime() + 60 * 1000).toISOString();
  };

  const loadInspectionTasks = async (inspectionId) => {
    if (inspectionId === CUSTOM_INSPECTION_ID) {
      const items = [createCustomChecklistItem(0)];
      const start = form.getFieldValue("startDateTime") || dayjs(getDefaultStart());
      const estimate = estimateInspectionSchedule(items);
      form.setFieldsValue({
        title: form.getFieldValue("title") || "Custom Task",
        maintenanceType: "Custom Task",
        checklistItems: items,
        endDateTime: dayjs(addMinutesToDate(start.toDate(), estimate.minutes)),
      });
      return;
    }

    const inspection = inspectionOptions.find((item) => item.id === inspectionId);
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
      const start = form.getFieldValue("startDateTime") || dayjs(getDefaultStart());
      const estimate = estimateInspectionSchedule(items);
      form.setFieldsValue({
        checklistItems: items,
        maintenanceType: "Inspection",
        endDateTime: dayjs(addMinutesToDate(start.toDate(), estimate.minutes)),
      });
    } catch (error) {
      message.error(error.message || "Failed to fetch inspection tasks");
      form.setFieldsValue({ checklistItems: [] });
    }
  };

  const openCreateTask = () => {
    const start = getDefaultStart();
    form.resetFields();
    form.setFieldsValue({
      startDateTime: dayjs(start),
      endDateTime: dayjs(addMinutesToDate(start, 60)),
      priority: "Normal",
      maintenanceType: "Inspection",
      checklistItems: [],
    });
    setEditingTask(null);
    setCreateOpen(true);
  };

  const openEditTask = (task) => {
    setEditingTask(task);
    form.resetFields();
    form.setFieldsValue({
      title: task.title,
      aircraft: task.aircraft,
      assignedTo: task.assignedTo,
      priority: task.priority || "Normal",
      maintenanceType: task.maintenanceType || "Inspection",
      startDateTime: task.startDateTime ? dayjs(task.startDateTime) : null,
      endDateTime: task.endDateTime ? dayjs(task.endDateTime) : null,
      checklistItems: Array.isArray(task.checklistItems) ? task.checklistItems : [],
      inspectionType: CUSTOM_INSPECTION_ID,
    });
    setCreateOpen(true);
  };

  const deleteTask = async (task) => {
    try {
      const response = await fetch(`${API_BASE}/api/tasks/${task.id || task._id}`, {
        method: "DELETE",
        headers: await getAuthHeader(),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Failed to delete task");
      message.success("Task deleted");
      await load();
    } catch (error) {
      message.error(error.message || "Failed to delete task");
    }
  };

  const handleStart = async () => {
    if (!selectedTask) return;
    const confirmed = await confirmAction({
      title: "Start Task",
      content: "Start this task now?",
      okText: "Start",
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
      message.success("Task started");
      setChecklistOpen(false);
      await load();
    } catch (error) {
      message.error(error.message || "Failed to start task");
    }
  };

  const handleSaveDraftOrTurnIn = async (turnIn = false, options = {}) => {
    if (!selectedTask) return;
    const now = new Date().toISOString();
    const next = {
      ...selectedTask,
      status: options.undo ? "Ongoing" : turnIn ? "Turned in" : selectedTask.status,
      completedAt: options.undo ? null : turnIn ? now : selectedTask.completedAt,
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
        message.error("Please complete all checklist items before turning in");
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
      });
      if (!confirmed) return;
    }

    try {
      await upsertTask(next);
      message.success(options.undo ? "Turn in undone" : turnIn ? "Task turned in" : "Draft saved");
      setChecklistOpen(false);
      await load();
    } catch (error) {
      message.error(error.message || "Failed to update task");
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
      });
      if (!confirmed) return;

      const selectedMechanic = mechanics.find(
        (item) => String(item.id) === String(values.assignedTo),
      );
      const selectedInspection = inspectionOptions.find(
        (item) => String(item.id) === String(values.inspectionType),
      );
      const checklistItems = Array.isArray(values.checklistItems)
        ? values.checklistItems
            .filter((item) => String(item?.taskName || "").trim())
            .map((item, index) => ({
              ...item,
              taskId: item.taskId || `custom-${Date.now()}-${index + 1}`,
              taskName: String(item.taskName || "").trim(),
              inspectionName:
                values.inspectionType === CUSTOM_INSPECTION_ID
                  ? values.title || "Custom Task"
                  : item.inspectionName || values.title,
              inspectionType:
                values.inspectionType === CUSTOM_INSPECTION_ID
                  ? "Custom"
                  : item.inspectionType,
              inspectionTypeFull:
                values.inspectionType === CUSTOM_INSPECTION_ID
                  ? "Custom Task"
                  : item.inspectionTypeFull,
            }))
        : [];
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
        checklistState: Array.isArray(editingTask?.checklistState)
          ? editingTask.checklistState.slice(0, checklistItems.length)
          : checklistItems.map(() => false),
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
      if (!response.ok)
        throw new Error(data.message || "Failed to save task");
      message.success(editingTask ? "Task updated" : "Task created");
      form.resetFields();
      setEditingTask(null);
      setCreateOpen(false);
      await load();
    } catch (error) {
      if (!error?.errorFields)
        message.error(error.message || "Failed to create task");
    }
  };

  const submitReturn = async () => {
    if (!selectedTask || !reviewNote.trim()) {
      message.error("Return remarks are required");
      return;
    }

    const confirmed = await confirmAction({
      title: "Return Task",
      content: "Return this task to the mechanic with the selected checklist changes?",
      okText: "Return",
      okButtonProps: { danger: true },
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
      message.success("Task returned");
      setReviewOpen(false);
      setChecklistOpen(false);
      setReviewNote("");
      setItemsToUncheck([]);
      await load();
    } catch (error) {
      message.error(error.message || "Failed to return task");
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
      message.success("Task approved");
      setSignatureState({ open: false, mode: null });
      setChecklistOpen(false);
      await load();
    } catch (error) {
      message.error(error.message || "Failed to approve task");
    }
  };

  const requestApprove = async () => {
    const confirmed = await confirmAction({
      title: "Approve Task",
      content: "Approve this turned-in task?",
      okText: "Approve",
    });
    if (confirmed) setSignatureState({ open: true, mode: "approve" });
  };

  const tabs = isManager
    ? [
        { key: "assigned", label: `Assigned (${counts.assigned})` },
        { key: "for_review", label: `For Review (${counts.forReview})` },
        { key: "reviewed", label: `Reviewed (${counts.reviewed})` },
      ]
    : [
        { key: "upcoming", label: `Upcoming (${counts.upcoming})` },
        { key: "past_due", label: `Past Due (${counts.pastDue})` },
        { key: "completed", label: `Completed (${counts.completed})` },
      ];

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
            />
          </Col>
          {isManager && (
            <Col xs={24} md={6}>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={openCreateTask}
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

      <Table
        style={{ marginTop: 12 }}
        loading={loading}
        rowKey={(record) => record._id || record.id}
        dataSource={displayedTasks}
        pagination={{ pageSize: 10 }}
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
              const total = record.checklistItems?.length || 0;
              const done = record.checklistState?.filter(Boolean).length || 0;
              return total ? (
                <Progress percent={Math.round((done / total) * 100)} size="small" />
              ) : (
                "-"
              );
            },
          },
          {
            title: "Status",
            dataIndex: "status",
            render: (value) => <Tag>{value || "Pending"}</Tag>,
          },
          {
            title: "Due",
            render: (_, record) =>
              formatDisplayDateTime(record.endDateTime || record.dueDate),
          },
          ...(isManager
            ? [
                {
                  title: "Actions",
                  render: (_, record) => {
                    const canEditDelete =
                      activeTab === "assigned" &&
                      normalizeStatus(record.status) === "pending";
                    if (!canEditDelete) return null;
                    return (
                      <Space onClick={(event) => event.stopPropagation()}>
                        <Button
                          size="small"
                          icon={<EditOutlined />}
                          onClick={() => openEditTask(record)}
                        />
                        <Popconfirm
                          title="Delete task?"
                          description="This task assignment will be removed permanently."
                          okText="Delete"
                          okButtonProps={{ danger: true }}
                          onConfirm={() => deleteTask(record)}
                        >
                          <Button size="small" danger icon={<DeleteOutlined />} />
                        </Popconfirm>
                      </Space>
                    );
                  },
                },
              ]
            : []),
        ]}
      />

      <Modal
        open={createOpen}
        onCancel={() => {
          setCreateOpen(false);
          setEditingTask(null);
        }}
        onOk={handleCreate}
        title={editingTask ? "Edit Task" : "Task"}
        okText={editingTask ? "Save" : "Add Task"}
        width={960}
      >
        <Form form={form} layout="vertical">
          <Space direction="vertical" size={6} style={{ width: "100%" }}>
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
                    options={aircraftOptions.map((aircraft) => ({
                      value: aircraft,
                      label: aircraft,
                    }))}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  label="Inspection"
                  name="inspectionType"
                  rules={[{ required: true, message: "Inspection is required" }]}
                >
                  <Select
                    size="large"
                    placeholder="Pick Inspection"
                    disabled={Boolean(editingTask)}
                    onChange={loadInspectionTasks}
                    options={[
                      { value: CUSTOM_INSPECTION_ID, label: "Custom Task" },
                      ...inspectionOptions.map((inspection) => ({
                        value: inspection.id,
                        label: inspection.name,
                      })),
                    ]}
                  />
                </Form.Item>
              </Col>
              {watchedInspectionType === CUSTOM_INSPECTION_ID && (
                <Col xs={24}>
                  <Form.Item
                    label="Custom Task Name"
                    name="title"
                    rules={[
                      { required: true, message: "Custom task name is required" },
                      { min: 3, message: "Task name must be at least 3 characters" },
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
                    options={(editingTask ? mechanics : availableMechanics).map((item) => ({
                      value: item.id,
                      label: `${item.name}${item.isBusy ? " (busy)" : ""}`,
                      disabled: !editingTask && item.isBusy,
                    }))}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item label="Priority" name="priority" initialValue="Normal">
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
                    format="YYYY-MM-DD HH:mm"
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
                    format="YYYY-MM-DD HH:mm"
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
                <Divider orientation="left">Checklist</Divider>
                <Text type="secondary">
                  Estimated duration: {formatEstimatedDuration(scheduleEstimate.minutes)} |{" "}
                  {scheduleEstimate.itemCount} checklist item
                  {scheduleEstimate.itemCount === 1 ? "" : "s"}
                </Text>
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
                    <Space direction="vertical" style={{ width: "100%", marginTop: 12 }}>
                      {fields.map((field, index) => {
                        const item = watchedChecklistItems?.[index] || {};
                        return (
                          <Card
                            key={field.key}
                            size="small"
                            title={[item.taskId, item.inspectionTypeFull].filter(Boolean).join(" | ") || `Item ${index + 1}`}
                            extra={
                              watchedInspectionType === CUSTOM_INSPECTION_ID ? (
                                <Button danger size="small" onClick={() => remove(field.name)}>
                                  Remove
                                </Button>
                              ) : null
                            }
                          >
                            <Form.Item
                              {...field}
                              name={[field.name, "taskName"]}
                              rules={[{ required: true, message: "Checklist item is required" }]}
                            >
                              <Input
                                placeholder="Checklist item"
                                disabled={watchedInspectionType !== CUSTOM_INSPECTION_ID}
                              />
                            </Form.Item>
                            {watchedInspectionType === CUSTOM_INSPECTION_ID ? (
                              <Form.Item {...field} name={[field.name, "description"]}>
                                <Input.TextArea rows={2} placeholder="Description / notes" />
                              </Form.Item>
                            ) : (
                              <Text type="secondary">{item.description || item.documentation || ""}</Text>
                            )}
                          </Card>
                        );
                      })}
                      {watchedInspectionType === CUSTOM_INSPECTION_ID && (
                        <Button
                          icon={<PlusOutlined />}
                          onClick={() => add(createCustomChecklistItem(fields.length))}
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
        width={900}
        footer={null}
      >
        {selectedTask && (
          <Space orientation="vertical" style={{ width: "100%" }} size={14}>
            <Text type="secondary">
              Aircraft: {selectedTask.aircraft} | Due:{" "}
              {selectedTask.endDateTime || selectedTask.dueDate || "-"}
            </Text>
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
                      <Tag color="green">Approved</Tag>
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
                      <Tag color="orange">Pending Approval</Tag>
                      <Text type="secondary">
                        Pending review by Maintenance Manager
                      </Text>
                    </>
                  )}
                </div>
              </Card>
            )}

            {(selectedTask.checklistItems || []).map((item, index) => {
              const isDone = Array.isArray(selectedTask.checklistState)
                ? Boolean(selectedTask.checklistState[index])
                : false;
              const readOnly =
                isManager ||
                isReviewed(selectedTask) ||
                isTurnedIn(selectedTask) ||
                normalizeStatus(selectedTask.status) === "completed";
              return (
                <div
                  key={`${item.taskId || item.taskName}-${index}`}
                  style={{ display: "flex", gap: 8 }}
                >
                  <Checkbox
                    checked={isDone}
                    disabled={readOnly}
                    onChange={(e) => {
                      const state = Array.isArray(selectedTask.checklistState)
                        ? [...selectedTask.checklistState]
                        : (selectedTask.checklistItems || []).map(() => false);
                      state[index] = e.target.checked;
                      setSelectedTask((prev) => ({
                        ...prev,
                        checklistState: state,
                      }));
                    }}
                  />
                  <div>
                    {!isManager && (
                      <div>
                        <Text type="secondary">
                          {[item.taskId, item.inspectionTypeFull]
                            .filter(Boolean)
                            .join(" | ")}
                        </Text>
                      </div>
                    )}
                    <Text strong>{item.taskName || "Checklist item"}</Text>
                    {!!item.documentation && (
                      <div>
                        <Text type="secondary">AMM: {item.documentation}</Text>
                      </div>
                    )}
                    {item.description && (
                      <div>
                        <Text type="secondary">{item.description}</Text>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

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
                      disabled={isReviewed(selectedTask) || isTurnedIn(selectedTask)}
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
                    <Button
                      type="primary"
                      onClick={requestApprove}
                    >
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
                      const checklist = Array.isArray(selectedTask.checklistState)
                        ? selectedTask.checklistState
                        : [];
                      const allChecked =
                        selectedTask.checklistItems?.length > 0 &&
                        selectedTask.checklistItems.every((_, index) => checklist[index]);
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
                    onClick={() => handleSaveDraftOrTurnIn(false, { undo: true })}
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
        <Space direction="vertical" style={{ width: "100%" }} size={10}>
          <Text>Uncheck items that need rework:</Text>
          <Row gutter={[8, 8]}>
            {(selectedTask?.checklistItems || [])
              .map((item, index) => ({ item, index }))
              .filter(
                ({ index }) => (selectedTask?.checklistState || [])[index],
              )
              .map(({ item, index }) => (
                <Col xs={24} md={12} key={`${item.taskId || item.taskName}-${index}`}>
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
    </div>
  );
}
