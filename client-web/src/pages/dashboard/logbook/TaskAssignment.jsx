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
  DatePicker,
  Empty,
  Form,
  Input,
  Modal,
  Progress,
  Row,
  Select,
  Space,
  Tag,
  Typography,
  message,
} from "antd";
import { PlusOutlined, SearchOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { AuthContext } from "../../../context/AuthContext";
import { API_BASE } from "../../../utils/API_BASE";
import PinVerifiedSignatureModal from "../../../components/common/PinVerifiedSignatureModal";
import TaskCard from "../../../components/TaskAssignment/TaskCard";
import CreateTaskModal from "../../../components/TaskAssignment/CreateTaskModal";
import {
  addMinutesToDate,
  estimateInspectionSchedule,
} from "../../../utils/inspectionTiming";
import { confirmAction } from "../../../utils/confirmAction";
import { useLocation, useNavigate } from "react-router-dom";

const { Text, Title } = Typography;
const OPEN_STATUSES = new Set(["pending", "ongoing", "returned"]);
const CUSTOM_INSPECTION_ID = "custom-task";

const normalizeStatus = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const isTurnedIn = (task) => normalizeStatus(task?.status) === "turned in";
const isReviewed = (task) =>
  task?.isApproved || normalizeStatus(task?.status) === "approved";

const formatDateTime = (value) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

export default function TaskAssignment() {
  const { user, getAuthHeader } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState("assigned");
  const [selectedAircraft, setSelectedAircraft] = useState("all");
  const [selectedTask, setSelectedTask] = useState(null);
  const [checklistOpen, setChecklistOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewNote, setReviewNote] = useState("");
  const [itemsToUncheck, setItemsToUncheck] = useState([]);
  const [signatureState, setSignatureState] = useState({
    open: false,
    mode: null,
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [aircraftList, setAircraftList] = useState([]);
  const [inspectionOptions, setInspectionOptions] = useState([]);
  const [selectedInspectionId, setSelectedInspectionId] = useState("");
  const [customTaskTitle, setCustomTaskTitle] = useState("Custom Task");
  const [checklistDraftItems, setChecklistDraftItems] = useState([]);
  const [endDateManuallyAdjusted, setEndDateManuallyAdjusted] = useState(false);
  const [pendingTargetTaskId, setPendingTargetTaskId] = useState("");
  const [form] = Form.useForm();

  const role = user?.jobTitle?.toLowerCase() || "";
  const isManager = ["maintenance manager", "admin"].includes(role);
  const currentUserId = user?.id || user?._id;

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const headers = await getAuthHeader();

      const [taskResponse, userResponse] = await Promise.all([
        fetch(`${API_BASE}/api/tasks/getAll`, { headers }),
        fetch(`${API_BASE}/api/user/assignable-users`, { headers }),
      ]);

      const taskData = await taskResponse.json();
      const userData = await userResponse.json();

      if (!taskResponse.ok) {
        throw new Error(taskData.message || "Failed to load tasks");
      }
      if (!userResponse.ok) {
        throw new Error(userData.message || "Failed to load users");
      }

      setTasks(Array.isArray(taskData.data) ? taskData.data : []);
      setUsers(Array.isArray(userData.data) ? userData.data : []);
    } catch (error) {
      message.error(error.message || "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }, [getAuthHeader]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const targetTaskId = params.get("targetTaskId") || params.get("taskId");
    const notificationStatus =
      params.get("notificationStatus") || params.get("status");
    const openAddTaskRaw = params.get("openAddTask");
    const openAddTask =
      openAddTaskRaw === "1" || String(openAddTaskRaw).toLowerCase() === "true";
    const routeStateDraft = location.state?.addTaskDraft || null;

    if (targetTaskId) {
      setPendingTargetTaskId(targetTaskId);
    }

    if (isManager) {
      if (notificationStatus && notificationStatus.toLowerCase() === "turned in") {
        setActiveTab("for_review");
      }
    } else if (notificationStatus) {
      const normalized = notificationStatus.toLowerCase();
      if (["approved", "completed"].includes(normalized)) {
        setActiveTab("completed");
      } else if (normalized === "turned in") {
        setActiveTab("completed");
      } else {
        setActiveTab("upcoming");
      }
    }

    if (isManager && (openAddTask || routeStateDraft)) {
      const draftAircraft = routeStateDraft?.aircraft || params.get("aircraft") || "";
      const draftAircraftModel =
        routeStateDraft?.aircraftModel || params.get("aircraftModel") || "";
      const draftInspectionName =
        routeStateDraft?.inspectionName || params.get("inspectionName") || "OC Inspection";
      const draftIssueTitle =
        routeStateDraft?.issueTitle ||
        params.get("issueTitle") ||
        "Rectify maintenance finding";
      const draftComponent = routeStateDraft?.component || params.get("component") || "";
      const draftRiskLevel = routeStateDraft?.riskLevel || params.get("riskLevel") || "";
      const draftRecommendedAction =
        routeStateDraft?.recommendedAction || params.get("recommendedAction") || "";
      const draftManualReference =
        routeStateDraft?.manualReference || params.get("manualReference") || "";

      const start = addMinutesToDate(new Date(), 5);
      const end = addMinutesToDate(start, 60);

      form.setFieldsValue({
        aircraft: draftAircraft || undefined,
        base: user?.base || undefined,
        startDateTime: dayjs(start),
        endDateTime: dayjs(end),
        priority:
          ["critical", "high"].includes(String(draftRiskLevel).toLowerCase())
            ? "High"
            : "Normal",
        maintenanceType: "Corrective Maintenance",
      });

      setSelectedInspectionId(CUSTOM_INSPECTION_ID);
      setCustomTaskTitle(draftInspectionName || "Custom Task");
      setChecklistDraftItems([
        {
          inspectionName: draftInspectionName,
          aircraftModel: draftAircraftModel,
          ata: {
            chapter: 0,
            chapterName: "",
            section: 0,
            sectionName: "",
          },
          taskId: `ai-rectify-${Date.now()}`,
          taskName: draftIssueTitle,
          component: draftComponent,
          componentModel: "",
          inspectionType: "Corrective",
          inspectionTypeFull: draftManualReference || draftInspectionName,
          documentation: draftManualReference,
          description: draftIssueTitle,
          correctiveAction: draftRecommendedAction,
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
            specificInterval: draftInspectionName,
          },
        },
      ]);
      setEndDateManuallyAdjusted(false);
      setCreateOpen(true);

      const cleanupParams = new URLSearchParams(location.search);
      cleanupParams.delete("openAddTask");
      cleanupParams.delete("aircraft");
      cleanupParams.delete("aircraftModel");
      cleanupParams.delete("inspectionName");
      cleanupParams.delete("issueTitle");
      cleanupParams.delete("component");
      cleanupParams.delete("riskLevel");
      cleanupParams.delete("recommendedAction");
      cleanupParams.delete("manualReference");
      navigate(
        {
          pathname: "/dashboard/tasks",
          search: cleanupParams.toString() ? `?${cleanupParams.toString()}` : "",
        },
        { replace: true, state: null },
      );
    }
  }, [form, isManager, location.search, location.state, navigate]);

  useEffect(() => {
    if (!pendingTargetTaskId || !tasks.length) return;
    const matched = tasks.find(
      (task) =>
        String(task._id) === String(pendingTargetTaskId) ||
        String(task.id) === String(pendingTargetTaskId),
    );
    if (!matched) return;

    setSelectedTask(matched);
    setChecklistOpen(true);
    setPendingTargetTaskId("");

    const params = new URLSearchParams(location.search);
    if (params.toString()) {
      navigate("/dashboard/tasks", { replace: true });
    }
  }, [location.search, navigate, pendingTargetTaskId, tasks]);

  useEffect(() => {
    if (!createOpen) return;

    const initializeCreateModal = async () => {
      try {
        setCreateLoading(true);
        const [aircraftResponse, inspectionResponse] = await Promise.all([
          fetch(`${API_BASE}/api/parts-monitoring/aircraft-list`),
          fetch(`${API_BASE}/api/inspections/schedules`),
        ]);

        const aircraftData = await aircraftResponse.json();
        const inspectionData = await inspectionResponse.json();

        setAircraftList(
          Array.isArray(aircraftData?.data) ? aircraftData.data : [],
        );

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
      } catch (error) {
        message.error(error.message || "Failed to load task setup data");
      } finally {
        setCreateLoading(false);
      }
    };

    const start = addMinutesToDate(new Date(), 5);
    const end = addMinutesToDate(start, 60);
    form.setFieldsValue({
      startDateTime: dayjs(start),
      endDateTime: dayjs(end),
      base: user?.base || undefined,
      priority: "Normal",
      maintenanceType: "Corrective Maintenance",
    });
    setSelectedInspectionId("");
    setChecklistDraftItems([]);
    setCustomTaskTitle("Custom Task");
    setEndDateManuallyAdjusted(false);

    initializeCreateModal();
  }, [createOpen, form, user?.base]);
  const scheduleEstimate = useMemo(
    () => estimateInspectionSchedule(checklistDraftItems),
    [checklistDraftItems],
  );
  useEffect(() => {
    if (!createOpen || endDateManuallyAdjusted) return;
    const start = form.getFieldValue("startDateTime");
    if (!start) return;
    const nextEnd = addMinutesToDate(
      dayjs(start).toDate(),
      scheduleEstimate.minutes,
    );
    form.setFieldValue("endDateTime", dayjs(nextEnd));
  }, [createOpen, endDateManuallyAdjusted, form, scheduleEstimate.minutes]);

  const mechanics = useMemo(
    () =>
      users.filter(
        (item) =>
          String(item.jobTitle || "").toLowerCase() === "mechanic" &&
          String(item.status || "").toLowerCase() === "active",
      ),
    [users],
  );

  const isCustomTask = selectedInspectionId === CUSTOM_INSPECTION_ID;

  const dedupeChecklistItems = (items = []) => {
    const seen = new Set();
    return items.filter((item) => {
      const key = `${item.taskId || ""}|${item.taskName || ""}|${item.inspectionTypeFull || ""}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  const fetchInspectionTasks = async (inspection) => {
    const response = await fetch(
      `${API_BASE}/api/inspections/tasks?inspectionName=${encodeURIComponent(inspection?.name || "")}&aircraftModel=${encodeURIComponent(inspection?.aircraftModel || "")}`,
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

  const myTasks = useMemo(() => {
    if (isManager) return tasks;
    return tasks.filter(
      (task) => String(task.assignedTo || "") === String(currentUserId || ""),
    );
  }, [currentUserId, isManager, tasks]);

  const aircraftOptions = useMemo(() => {
    const values = Array.from(
      new Set(
        myTasks
          .map((item) => String(item?.aircraft || "").trim())
          .filter(Boolean),
      ),
    );
    return [{ label: "All Aircraft", value: "all" }].concat(
      values.map((aircraft) => ({ label: aircraft, value: aircraft })),
    );
  }, [myTasks]);

  const today = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

  const isPastDueOpenTask = useCallback(
    (task) => {
      if (!OPEN_STATUSES.has(normalizeStatus(task?.status))) return false;
      const deadline = task?.endDateTime || task?.dueDate;
      if (!deadline) return false;
      const dueDate = new Date(deadline);
      if (Number.isNaN(dueDate.getTime())) return false;
      return dueDate < today;
    },
    [today],
  );

  const filteredByTab = useMemo(() => {
    return myTasks.filter((task) => {
      const status = normalizeStatus(task?.status);

      if (isManager) {
        if (activeTab === "assigned") return OPEN_STATUSES.has(status);
        if (activeTab === "for_review")
          return (
            isTurnedIn(task) || (status === "completed" && !task.isApproved)
          );
        if (activeTab === "reviewed") return isReviewed(task);
        return true;
      }

      if (activeTab === "upcoming") {
        return OPEN_STATUSES.has(status) && !isPastDueOpenTask(task);
      }
      if (activeTab === "past_due") {
        return isPastDueOpenTask(task);
      }
      if (activeTab === "completed") {
        return isTurnedIn(task) || isReviewed(task) || status === "completed";
      }
      return true;
    });
  }, [activeTab, isManager, isPastDueOpenTask, myTasks]);

  const filteredTasks = useMemo(() => {
    return filteredByTab.filter((task) => {
      const needle = query.trim().toLowerCase();
      if (
        selectedAircraft !== "all" &&
        String(task.aircraft) !== selectedAircraft
      ) {
        return false;
      }
      if (!needle) return true;
      return [
        task.id,
        task.title,
        task.aircraft,
        task.assignedToName,
        task.maintenanceType,
      ].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(needle),
      );
    });
  }, [filteredByTab, query, selectedAircraft]);

  const counts = useMemo(
    () => ({
      assigned: myTasks.filter((task) =>
        OPEN_STATUSES.has(normalizeStatus(task.status)),
      ).length,
      forReview: myTasks.filter(
        (task) =>
          isTurnedIn(task) ||
          (normalizeStatus(task.status) === "completed" && !task.isApproved),
      ).length,
      reviewed: myTasks.filter((task) => isReviewed(task)).length,
      upcoming: myTasks.filter(
        (task) =>
          OPEN_STATUSES.has(normalizeStatus(task.status)) &&
          !isPastDueOpenTask(task),
      ).length,
      pastDue: myTasks.filter((task) => isPastDueOpenTask(task)).length,
      completed: myTasks.filter(
        (task) =>
          isTurnedIn(task) ||
          isReviewed(task) ||
          normalizeStatus(task.status) === "completed",
      ).length,
    }),
    [isPastDueOpenTask, myTasks],
  );

  const taskGroups = useMemo(() => {
    const map = new Map();
    filteredTasks.forEach((task) => {
      const keyDate =
        task?.endDateTime || task?.dueDate || task?.createdAt || new Date();
      const date = new Date(keyDate);
      const label = Number.isNaN(date.getTime())
        ? "No Schedule"
        : date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      if (!map.has(label)) map.set(label, []);
      map.get(label).push(task);
    });

    return Array.from(map.entries()).map(([label, items]) => ({
      label,
      items,
    }));
  }, [filteredTasks]);

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

  const handleStart = async () => {
    if (!selectedTask) return;
    const confirmed = await confirmAction({
      title: "Start Task",
      content: "Start this task now?",
      okText: "Start",
    });
    if (!confirmed) return;

    const nowIso = new Date().toISOString();
    try {
      await upsertTask({
        ...selectedTask,
        status: "Ongoing",
        startDateTime: nowIso,
      });
      message.success("Task started");
      await load();
    } catch (error) {
      message.error(error.message || "Failed to start task");
    }
  };

  const handleSaveDraftOrTurnIn = async (turnIn = false, options = {}) => {
    if (!selectedTask) return;
    const confirmed = await confirmAction({
      title: options.undo
        ? "Undo Turn In"
        : turnIn
          ? "Turn In Task"
          : "Save Task",
      content: options.undo
        ? "Revert this task back to Ongoing?"
        : turnIn
          ? "Submit this task for review?"
          : "Save current task progress?",
      okText: options.undo ? "Undo" : turnIn ? "Turn In" : "Save",
    });
    if (!confirmed) return;

    const nowIso = new Date().toISOString();
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
          ? nowIso
          : selectedTask.completedAt,
    };

    if (turnIn && !options.undo) {
      const checklist = Array.isArray(next.checklistState)
        ? next.checklistState
        : [];
      if (checklist.length > 0 && checklist.some((value) => !value)) {
        message.error("Please complete all checklist items before turning in");
        return;
      }
    }

    try {
      await upsertTask(next);
      message.success(
        options.undo
          ? "Turn in reverted"
          : turnIn
            ? "Task turned in"
            : "Draft saved",
      );
      await load();
    } catch (error) {
      message.error(error.message || "Failed to update task");
    }
  };

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      if (!selectedInspectionId) {
        message.error("Inspection is required");
        return;
      }
      const selectedMechanic = mechanics.find(
        (item) => String(item._id) === String(values.assignedTo),
      );
      const selectedInspection = inspectionOptions.find(
        (item) => String(item.id) === String(selectedInspectionId),
      );
      const selectedInspectionName = isCustomTask
        ? customTaskTitle.trim() || "Custom Task"
        : selectedInspection?.name || values.title;

      const filteredChecklist = checklistDraftItems
        .filter((item) => String(item?.taskName || "").trim())
        .map((item, index) => ({
          ...item,
          inspectionName: selectedInspectionName,
          taskId: item.taskId || `custom-${Date.now()}-${index + 1}`,
          inspectionType: isCustomTask ? "Custom" : item.inspectionType,
          inspectionTypeFull: isCustomTask
            ? "Custom Task"
            : item.inspectionTypeFull,
        }));

      if (!filteredChecklist.length) {
        message.error("Please add at least one checklist item.");
        return;
      }

      const confirmed = await confirmAction({
        title: "Create Task",
        content: "Create this new task assignment?",
        okText: "Create",
      });
      if (!confirmed) return;

      const response = await fetch(`${API_BASE}/api/tasks/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(await getAuthHeader()),
        },
        body: JSON.stringify({
          id: `TSK-${Date.now()}`,
          title: selectedInspectionName,
          aircraft: values.aircraft,
          base: values.base,
          assignedTo: values.assignedTo,
          assignedToName:
            `${selectedMechanic?.firstName || ""} ${selectedMechanic?.lastName || ""}`.trim(),
          startDateTime: dayjs(values.startDateTime).toISOString(),
          endDateTime: dayjs(values.endDateTime).toISOString(),
          dueDate: dayjs(values.endDateTime).toISOString(),
          status: "Pending",
          priority: values.priority,
          maintenanceType: isCustomTask
            ? "Custom Task"
            : values.maintenanceType,
          checklistItems: filteredChecklist,
          checklistState: filteredChecklist.map(() => false),
          performance: { estimatedHours: scheduleEstimate.hours },
          confirmAction: true,
        }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.message || "Failed to create task");

      message.success("Task created");
      form.resetFields();
      setChecklistDraftItems([]);
      setSelectedInspectionId("");
      setCreateOpen(false);
      await load();
    } catch (error) {
      if (!error?.errorFields) {
        message.error(error.message || "Failed to create task");
      }
    }
  };

  const submitReturn = async () => {
    if (!selectedTask || !reviewNote.trim()) {
      message.error("Return remarks are required");
      return;
    }
    const confirmed = await confirmAction({
      title: "Return Task",
      content: "Return this task to the mechanic for revision?",
      okText: "Return",
      okType: "danger",
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
      setReviewNote("");
      setItemsToUncheck([]);
      await load();
    } catch (error) {
      message.error(error.message || "Failed to return task");
    }
  };

  const submitApprove = async (signature) => {
    if (!selectedTask) return;
    const confirmed = await confirmAction({
      title: "Approve Task",
      content: "Approve and finalize this task?",
      okText: "Approve",
    });
    if (!confirmed) return;

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
      await load();
    } catch (error) {
      message.error(error.message || "Failed to approve task");
    }
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
    <div style={{ padding: 18 }}>
      <Card
        style={{
          borderRadius: 14,
          border: "1px solid #E5E7EB",
          boxShadow: "0 6px 22px rgba(16,24,40,0.04)",
        }}
      >
        <Row gutter={[10, 10]}>
          <Col xs={24} lg={10}>
            <Input
              size="large"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tasks"
              prefix={<SearchOutlined />}
              style={{ borderRadius: 10 }}
            />
          </Col>

          {!isManager && (
            <Col xs={24} lg={8}>
              <Select
                size="large"
                value={selectedAircraft}
                onChange={setSelectedAircraft}
                options={aircraftOptions}
                style={{ width: "100%" }}
              />
            </Col>
          )}

          {isManager && (
            <Col xs={24} lg={5}>
              <Button
                type="primary"
                size="large"
                icon={<PlusOutlined />}
                style={{ width: "100%", borderRadius: 10 }}
                onClick={() => setCreateOpen(true)}
              >
                Add Task
              </Button>
            </Col>
          )}
        </Row>

        <div
          style={{ marginTop: 14, display: "flex", flexWrap: "wrap", gap: 8 }}
        >
          {tabs.map((tab) => (
            <Button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              type={activeTab === tab.key ? "primary" : "default"}
              style={{
                borderRadius: 7,
                height: 36,
                fontWeight: 600,
                background: activeTab === tab.key ? "#26866F" : "#fff",
                borderColor: activeTab === tab.key ? "#26866F" : "#D0D5DD",
              }}
            >
              {tab.label}
            </Button>
          ))}
        </div>
      </Card>

      <div style={{ marginTop: 14 }}>
        {loading ? (
          <Card loading style={{ borderRadius: 14 }} />
        ) : taskGroups.length === 0 ? (
          <Card style={{ borderRadius: 14 }}>
            <Empty description="No tasks available in this view" />
          </Card>
        ) : (
          taskGroups.map((group) => (
            <div key={group.label} style={{ marginBottom: 14 }}>
              {!isManager && (
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: "#344054",
                    marginBottom: 8,
                  }}
                >
                  {group.label}
                </Text>
              )}
              <div style={{ display: "grid", gap: 10 }}>
                {group.items.map((task) => (
                  <TaskCard
                    key={task._id || task.id}
                    task={task}
                    highlighted={
                      String(selectedTask?._id || selectedTask?.id) ===
                      String(task?._id || task?.id)
                    }
                    onOpen={(item) => {
                      setSelectedTask(item);
                      setChecklistOpen(true);
                    }}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      <CreateTaskModal
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={handleCreate}
        confirmLoading={createLoading}
        form={form}
        aircraftList={aircraftList}
        selectedInspectionId={selectedInspectionId}
        setSelectedInspectionId={setSelectedInspectionId}
        inspectionOptions={inspectionOptions}
        checklistDraftItems={checklistDraftItems}
        setChecklistDraftItems={setChecklistDraftItems}
        customTaskTitle={customTaskTitle}
        setCustomTaskTitle={setCustomTaskTitle}
        isCustomTask={isCustomTask}
        mechanics={mechanics}
        setEndDateManuallyAdjusted={setEndDateManuallyAdjusted}
        fetchInspectionTasks={fetchInspectionTasks}
        setCreateLoading={setCreateLoading}
        messageApi={message}
        endDateManuallyAdjusted={endDateManuallyAdjusted}
      />

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
              End{" "}
              {formatDateTime(selectedTask.endDateTime || selectedTask.dueDate)}{" "}
              | Aircraft {selectedTask.aircraft || "N/A"}
            </Text>

            {!!selectedTask.returnComments && (
              <Card
                size="small"
                style={{ background: "#fff1f0", borderColor: "#ffccc7" }}
              >
                <Text strong>Remarks:</Text> {selectedTask.returnComments}
              </Card>
            )}

            {(isTurnedIn(selectedTask) || isReviewed(selectedTask)) && (
              <Card
                size="small"
                style={{ background: "#e8f5e9", borderColor: "#c8e6c9" }}
              >
                <Text strong style={{ color: "#2e7d32" }}>
                  Task Completed
                </Text>
                <div>
                  <Text type="secondary">
                    {isReviewed(selectedTask)
                      ? `Approved by ${selectedTask?.approvedBy || "Maintenance Manager"}`
                      : "Pending review by Maintenance Manager"}
                  </Text>
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
                isTurnedIn(selectedTask);
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
                    <Text strong>{item.taskName || "Checklist item"}</Text>
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
                <Text strong>Findings (AI-interpreted)</Text>
                <Input.TextArea
                  rows={4}
                  value={selectedTask.findings || ""}
                  onChange={(e) =>
                    setSelectedTask((prev) => ({
                      ...prev,
                      findings: e.target.value,
                    }))
                  }
                  placeholder="Enter findings, symptoms, affected parts, and inspection results..."
                  disabled={isReviewed(selectedTask)}
                />
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
                      onClick={() =>
                        setSignatureState({ open: true, mode: "approve" })
                      }
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
                  <>
                    <Button onClick={() => handleSaveDraftOrTurnIn(false)}>
                      Save
                    </Button>
                    <Button
                      type="primary"
                      onClick={() => handleSaveDraftOrTurnIn(true)}
                    >
                      Turn In
                    </Button>
                  </>
                )}

              {!isManager &&
                isTurnedIn(selectedTask) &&
                !isReviewed(selectedTask) && (
                  <Button
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
                        if (!e.target.checked)
                          return prev.filter((v) => v !== index);
                        if (prev.includes(index)) return prev;
                        return [...prev, index];
                      });
                    }}
                  >
                    {item.taskName}
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
