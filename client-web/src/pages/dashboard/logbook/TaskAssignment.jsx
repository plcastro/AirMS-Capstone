import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  Checkbox,
  Col,
  Form,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from "antd";
import { PlusOutlined, SearchOutlined } from "@ant-design/icons";
import { AuthContext } from "../../../context/AuthContext";
import { API_BASE } from "../../../utils/API_BASE";
import PinVerifiedSignatureModal from "../../../components/common/PinVerifiedSignatureModal";

const { Text } = Typography;
const ACTIVE_OPEN = new Set(["pending", "ongoing", "returned"]);

const normalizeStatus = (value) => String(value || "").trim().toLowerCase();
const isTurnedIn = (task) => normalizeStatus(task?.status) === "turned in";
const isReviewed = (task) => task?.isApproved || normalizeStatus(task?.status) === "approved";

export default function TaskAssignment() {
  const { user, getAuthHeader } = useContext(AuthContext);
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState("assigned");
  const [selectedTask, setSelectedTask] = useState(null);
  const [checklistOpen, setChecklistOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [form] = Form.useForm();
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewNote, setReviewNote] = useState("");
  const [itemsToUncheck, setItemsToUncheck] = useState([]);
  const [signatureState, setSignatureState] = useState({ open: false, mode: null });
  const role = user?.jobTitle?.toLowerCase() || "";
  const isManager = role === "maintenance manager";

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const headers = await getAuthHeader();
      const [taskResponse, userResponse] = await Promise.all([
        fetch(`${API_BASE}/api/tasks/getAll`, { headers }),
        fetch(`${API_BASE}/api/user/get-all-users`, { headers }),
      ]);
      const taskData = await taskResponse.json();
      const userData = await userResponse.json();
      if (!taskResponse.ok) throw new Error(taskData.message || "Failed to load tasks");
      if (!userResponse.ok) throw new Error(userData.message || "Failed to load users");
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

  const mechanics = useMemo(() => users.filter((item) => String(item.jobTitle || "").toLowerCase() === "mechanic" && String(item.status || "").toLowerCase() === "active"), [users]);

  const myTasks = useMemo(() => (isManager ? tasks : tasks.filter((task) => String(task.assignedTo) === String(user?.id))), [isManager, tasks, user?.id]);

  const filteredByTab = useMemo(() => {
    return myTasks.filter((task) => {
      if (activeTab === "assigned") return ACTIVE_OPEN.has(normalizeStatus(task.status));
      if (activeTab === "for_review") return isTurnedIn(task) || (normalizeStatus(task.status) === "completed" && !task.isApproved);
      if (activeTab === "reviewed") return isReviewed(task);
      if (activeTab === "ongoing") return ACTIVE_OPEN.has(normalizeStatus(task.status));
      if (activeTab === "completed") return isTurnedIn(task) || isReviewed(task);
      return true;
    });
  }, [activeTab, myTasks]);

  const displayedTasks = useMemo(() => {
    return filteredByTab.filter((task) => {
      const needle = query.trim().toLowerCase();
      if (!needle) return true;
      return [task.id, task.title, task.aircraft, task.assignedToName].some((value) => String(value || "").toLowerCase().includes(needle));
    });
  }, [filteredByTab, query]);

  const counts = useMemo(() => ({
    assigned: myTasks.filter((task) => ACTIVE_OPEN.has(normalizeStatus(task.status))).length,
    forReview: myTasks.filter((task) => isTurnedIn(task) || (normalizeStatus(task.status) === "completed" && !task.isApproved)).length,
    reviewed: myTasks.filter((task) => isReviewed(task)).length,
    ongoing: myTasks.filter((task) => ACTIVE_OPEN.has(normalizeStatus(task.status))).length,
    completed: myTasks.filter((task) => isTurnedIn(task) || isReviewed(task)).length,
  }), [myTasks]);

  const upsertTask = async (taskPayload) => {
    const response = await fetch(`${API_BASE}/api/tasks/${taskPayload.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...(await getAuthHeader()) },
      body: JSON.stringify({ ...taskPayload, confirmAction: true }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Failed to update task");
    return data.data;
  };

  const handleStart = async () => {
    if (!selectedTask) return;
    const now = new Date().toISOString();
    const next = { ...selectedTask, status: "Ongoing", startDateTime: now };
    try {
      await upsertTask(next);
      message.success("Task started");
      setChecklistOpen(false);
      await load();
    } catch (error) {
      message.error(error.message || "Failed to start task");
    }
  };

  const handleSaveDraftOrTurnIn = async (turnIn = false) => {
    if (!selectedTask) return;
    const now = new Date().toISOString();
    const next = {
      ...selectedTask,
      status: turnIn ? "Turned in" : selectedTask.status,
      completedAt: turnIn ? now : selectedTask.completedAt,
    };

    if (turnIn) {
      const checklist = Array.isArray(next.checklistState) ? next.checklistState : [];
      if (checklist.length > 0 && checklist.some((value) => !value)) {
        message.error("Please complete all checklist items before turning in");
        return;
      }
    }

    try {
      await upsertTask(next);
      message.success(turnIn ? "Task turned in" : "Draft saved");
      setChecklistOpen(false);
      await load();
    } catch (error) {
      message.error(error.message || "Failed to update task");
    }
  };

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      const selectedMechanic = mechanics.find((item) => String(item._id) === String(values.assignedTo));
      const response = await fetch(`${API_BASE}/api/tasks/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await getAuthHeader()) },
        body: JSON.stringify({
          id: `TSK-${Date.now()}`,
          title: values.title,
          aircraft: values.aircraft,
          assignedTo: values.assignedTo,
          assignedToName: `${selectedMechanic?.firstName || ""} ${selectedMechanic?.lastName || ""}`.trim(),
          startDateTime: values.startDateTime,
          endDateTime: values.endDateTime,
          dueDate: values.endDateTime,
          status: "Pending",
          priority: values.priority,
          maintenanceType: values.maintenanceType,
          checklistItems: values.checklistItems
            .split("\n")
            .map((name) => name.trim())
            .filter(Boolean)
            .map((name, index) => ({ taskId: `CL-${index + 1}`, taskName: name })),
          checklistState: values.checklistItems
            .split("\n")
            .map((name) => name.trim())
            .filter(Boolean)
            .map(() => false),
          confirmAction: true,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to create task");
      message.success("Task created");
      form.resetFields();
      setCreateOpen(false);
      await load();
    } catch (error) {
      if (!error?.errorFields) message.error(error.message || "Failed to create task");
    }
  };

  const submitReturn = async () => {
    if (!selectedTask || !reviewNote.trim()) {
      message.error("Return remarks are required");
      return;
    }

    const nextChecklist = Array.isArray(selectedTask.checklistState)
      ? [...selectedTask.checklistState]
      : (selectedTask.checklistItems || []).map(() => false);

    itemsToUncheck.forEach((index) => {
      if (index >= 0 && index < nextChecklist.length) nextChecklist[index] = false;
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
    const approver = `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || user?.username || "Maintenance Manager";
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

  const tabs = isManager
    ? [
        { key: "assigned", label: `Assigned (${counts.assigned})` },
        { key: "for_review", label: `For Review (${counts.forReview})` },
        { key: "reviewed", label: `Reviewed (${counts.reviewed})` },
      ]
    : [
        { key: "ongoing", label: `Ongoing (${counts.ongoing})` },
        { key: "completed", label: `Completed (${counts.completed})` },
      ];

  return (
    <div style={{ padding: 20 }}>
      <Card>
        <Row gutter={[12, 12]}>
          <Col xs={24} md={10}><Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search tasks" prefix={<SearchOutlined />} /></Col>
          {isManager && <Col xs={24} md={6}><Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>Add Task</Button></Col>}
        </Row>
        <Tabs style={{ marginTop: 10 }} activeKey={activeTab} onChange={setActiveTab} items={tabs} />
      </Card>

      <Table
        style={{ marginTop: 12 }}
        loading={loading}
        rowKey={(record) => record._id || record.id}
        dataSource={displayedTasks}
        pagination={{ pageSize: 10 }}
        onRow={(record) => ({ onClick: () => { setSelectedTask(record); setChecklistOpen(true); } })}
        columns={[
          { title: "Task ID", dataIndex: "id" },
          { title: "Title", dataIndex: "title" },
          { title: "Aircraft", dataIndex: "aircraft" },
          { title: "Assigned To", dataIndex: "assignedToName" },
          { title: "Status", dataIndex: "status", render: (value) => <Tag>{value || "Pending"}</Tag> },
          { title: "Due", render: (_, record) => record.endDateTime || record.dueDate || "-" },
        ]}
      />

      <Modal open={createOpen} onCancel={() => setCreateOpen(false)} onOk={handleCreate} title="Create Task" okText="Create">
        <Form form={form} layout="vertical">
          <Form.Item label="Title" name="title" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item label="Aircraft" name="aircraft" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item label="Assign Mechanic" name="assignedTo" rules={[{ required: true }]}>
            <Select options={mechanics.map((item) => ({ value: item._id, label: `${item.firstName} ${item.lastName}` }))} />
          </Form.Item>
          <Form.Item label="Start Date/Time" name="startDateTime" rules={[{ required: true }]}><Input placeholder="YYYY-MM-DD HH:mm" /></Form.Item>
          <Form.Item label="End Date/Time" name="endDateTime" rules={[{ required: true }]}><Input placeholder="YYYY-MM-DD HH:mm" /></Form.Item>
          <Form.Item label="Priority" name="priority" initialValue="Normal"><Select options={["Low", "Normal", "High"].map((value) => ({ value, label: value }))} /></Form.Item>
          <Form.Item label="Maintenance Type" name="maintenanceType" initialValue="Corrective Maintenance"><Select options={["Corrective Maintenance", "Preventive Maintenance"].map((value) => ({ value, label: value }))} /></Form.Item>
          <Form.Item label="Checklist Items (one per line)" name="checklistItems" rules={[{ required: true }]}><Input.TextArea rows={5} /></Form.Item>
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
          <Space direction="vertical" style={{ width: "100%" }} size={14}>
            <Text type="secondary">Aircraft: {selectedTask.aircraft} | Due: {selectedTask.endDateTime || selectedTask.dueDate || "-"}</Text>
            {!!selectedTask.returnComments && <Card size="small" style={{ background: "#fff1f0", borderColor: "#ffccc7" }}><Text strong>Remarks:</Text> {selectedTask.returnComments}</Card>}

            {(selectedTask.checklistItems || []).map((item, index) => {
              const isDone = Array.isArray(selectedTask.checklistState) ? Boolean(selectedTask.checklistState[index]) : false;
              const readOnly = isManager || isReviewed(selectedTask) || isTurnedIn(selectedTask);
              return (
                <div key={`${item.taskId || item.taskName}-${index}`} style={{ display: "flex", gap: 8 }}>
                  <Checkbox
                    checked={isDone}
                    disabled={readOnly}
                    onChange={(e) => {
                      const state = Array.isArray(selectedTask.checklistState)
                        ? [...selectedTask.checklistState]
                        : (selectedTask.checklistItems || []).map(() => false);
                      state[index] = e.target.checked;
                      setSelectedTask((prev) => ({ ...prev, checklistState: state }));
                    }}
                  />
                  <div>
                    <Text strong>{item.taskName || "Checklist item"}</Text>
                    {item.description && <div><Text type="secondary">{item.description}</Text></div>}
                  </div>
                </div>
              );
            })}

            {!isManager && (
              <Input.TextArea
                rows={4}
                value={selectedTask.findings || ""}
                onChange={(e) => setSelectedTask((prev) => ({ ...prev, findings: e.target.value }))}
                placeholder="Findings"
                disabled={isReviewed(selectedTask)}
              />
            )}

            <Space style={{ justifyContent: "flex-end", width: "100%" }}>
              {isManager && isTurnedIn(selectedTask) && !isReviewed(selectedTask) && (
                <>
                  <Button danger onClick={() => setReviewOpen(true)}>Return</Button>
                  <Button type="primary" onClick={() => setSignatureState({ open: true, mode: "approve" })}>Approve</Button>
                </>
              )}

              {!isManager && normalizeStatus(selectedTask.status) === "pending" && (
                <Button type="primary" onClick={handleStart}>Start Task</Button>
              )}

              {!isManager && (normalizeStatus(selectedTask.status) === "ongoing" || normalizeStatus(selectedTask.status) === "returned") && (
                <>
                  <Button onClick={() => handleSaveDraftOrTurnIn(false)}>Save</Button>
                  <Button type="primary" onClick={() => handleSaveDraftOrTurnIn(true)}>Turn In</Button>
                </>
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
      >
        <Space direction="vertical" style={{ width: "100%" }}>
          <Text>Uncheck items that need rework:</Text>
          {(selectedTask?.checklistItems || [])
            .map((item, index) => ({ item, index }))
            .filter(({ index }) => (selectedTask?.checklistState || [])[index])
            .map(({ item, index }) => (
              <Checkbox
                key={`${item.taskId || item.taskName}-${index}`}
                checked={!itemsToUncheck.includes(index)}
                onChange={(e) => {
                  setItemsToUncheck((prev) => {
                    if (!e.target.checked) return prev.filter((v) => v !== index);
                    if (prev.includes(index)) return prev;
                    return [...prev, index];
                  });
                }}
              >
                {item.taskName}
              </Checkbox>
            ))}
          <Input.TextArea rows={4} value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} placeholder="Return remarks" />
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
