import React from "react";
import {
  App as AntdApp,
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  Input,
  Modal,
  Row,
  Select,
  Typography,
} from "antd";
import {
  estimateInspectionSchedule,
  formatEstimatedDuration,
} from "../../utils/inspectionTiming";
import dayjs from "dayjs";

const { Text, Title } = Typography;

const CUSTOM_INSPECTION_ID = "custom-task";
const BASE_OPTIONS = ["MANILA", "CEBU", "CDO"];
const TASK_MODAL_WIDTH = "min(1280px, calc(100vw - 48px))";
const TASK_MODAL_BODY_STYLE = {
  maxHeight: "calc(100vh - 180px)",
  overflowY: "auto",
  paddingBottom: 8,
};

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

export default function CreateTaskModal({
  open,
  onCancel,
  onOk,
  confirmLoading,
  form,
  aircraftList,
  selectedInspectionId,
  setSelectedInspectionId,
  inspectionOptions,
  checklistDraftItems,
  setChecklistDraftItems,
  customTaskTitle,
  setCustomTaskTitle,
  isCustomTask,
  mechanics,
  setEndDateManuallyAdjusted,
  fetchInspectionTasks,
  setCreateLoading,
  messageApi,
  endDateManuallyAdjusted,
}) {
  const { modal } = AntdApp.useApp();
  const scheduleEstimate = estimateInspectionSchedule(checklistDraftItems);
  const hasUnsavedChanges =
    (open && form?.isFieldsTouched(true)) ||
    Boolean(selectedInspectionId) ||
    checklistDraftItems.length > 0 ||
    Boolean(isCustomTask && customTaskTitle?.trim());
  const handleCancelWithWarning = () => {
    if (!hasUnsavedChanges) {
      onCancel?.();
      return;
    }
    modal.confirm({
      title: "Discard changes?",
      content: "You have unsaved changes. Cancel and discard them?",
      okText: "Discard",
      cancelText: "Keep editing",
      okButtonProps: { danger: true },
      onOk: () => onCancel?.(),
    });
  };

  return (
    <Modal
      open={open}
      onCancel={handleCancelWithWarning}
      onOk={onOk}
      title="Create Task"
      okText="Create"
      width={TASK_MODAL_WIDTH}
      centered
      zIndex={9999}
      styles={{
        body: TASK_MODAL_BODY_STYLE,
      }}
      confirmLoading={confirmLoading}
      forceRender
    >
      <Form form={form} layout="vertical">
        <Row gutter={[12, 4]}>
          <Col xs={24} md={12}>
            <Form.Item
              label="Aircraft"
              name="aircraft"
              rules={[{ required: true, message: "Aircraft is required" }]}
            >
              <Select
                showSearch
                size="large"
                options={toUniqueSelectOptions(
                  aircraftList,
                  (aircraft) => aircraft,
                )}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              label="Inspection"
              rules={[{ required: true, message: "Inspection is required" }]}
            >
              <Select
                size="large"
                value={selectedInspectionId || undefined}
                onChange={async (value) => {
                  setSelectedInspectionId(value);
                  if (value === CUSTOM_INSPECTION_ID) {
                    setChecklistDraftItems([
                      {
                        taskId: `custom-${Date.now()}-1`,
                        taskName: "",
                        description: "",
                        inspectionType: "Custom",
                        inspectionTypeFull: "Custom Task",
                      },
                    ]);
                    return;
                  }

                  const selected = inspectionOptions.find(
                    (item) => item.id === value,
                  );
                  if (!selected) return;

                  try {
                    setCreateLoading(true);
                    const tasksFromInspection =
                      await fetchInspectionTasks(selected);
                    setChecklistDraftItems(tasksFromInspection);
                  } catch (error) {
                    messageApi.error(
                      error.message || "Failed to fetch inspection tasks",
                    );
                    setChecklistDraftItems([]);
                  } finally {
                    setCreateLoading(false);
                  }
                }}
                options={[
                  { value: CUSTOM_INSPECTION_ID, label: "Custom Task" },
                  ...toUniqueSelectOptions(
                    inspectionOptions,
                    (inspection) => inspection.id,
                    (inspection) =>
                      inspection.aircraftModel
                        ? `${inspection.name} (${inspection.aircraftModel})`
                        : inspection.name,
                  ),
                ]}
              />
            </Form.Item>
          </Col>
          {isCustomTask && (
            <Col xs={24}>
              <Form.Item label="Custom Task Name">
                <Input
                  size="large"
                  value={customTaskTitle}
                  onChange={(e) => setCustomTaskTitle(e.target.value)}
                  placeholder="Enter custom task name"
                />
              </Form.Item>
            </Col>
          )}
          <Col xs={24} md={12}>
            <Form.Item
              label="Base"
              name="base"
              rules={[{ required: true, message: "Base is required" }]}
            >
              <Select
                aria-label="Base"
                size="large"
                options={BASE_OPTIONS.map((base) => ({
                  value: base,
                  label: base,
                }))}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              label="Assign Mechanic"
              name="assignedTo"
              rules={[{ required: true, message: "Assignee is required" }]}
            >
              <Select
                size="large"
                options={toUniqueSelectOptions(
                  mechanics,
                  (item) => item._id || item.id,
                  (item) =>
                    item.name ||
                    `${item.firstName || ""} ${item.lastName || ""}`.trim(),
                )}
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
                format="MM/DD/YYYY HH:mm"
                showTime={{ format: "HH:mm" }}
                onChange={() => setEndDateManuallyAdjusted(false)}
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
                onChange={() => setEndDateManuallyAdjusted(true)}
              />
            </Form.Item>
          </Col>
          <Col xs={24}>
            <Form.Item
              label="Maintenance Type"
              name="maintenanceType"
              initialValue="Corrective Maintenance"
            >
              <Select
                size="large"
                options={[
                  "Corrective Maintenance",
                  "Preventive Maintenance",
                ].map((value) => ({
                  value,
                  label: value,
                }))}
              />
            </Form.Item>
          </Col>
          <Col xs={24}>
            <Text type="secondary">
              Estimated duration:{" "}
              {formatEstimatedDuration(scheduleEstimate.minutes)} |{" "}
              {scheduleEstimate.itemCount} checklist item
              {scheduleEstimate.itemCount === 1 ? "" : "s"}
              {endDateManuallyAdjusted ? " | End time manually adjusted" : ""}
            </Text>
          </Col>
          <Col xs={24} style={{ marginTop: 10 }}>
            <Title level={3} style={{ marginBottom: 8, fontSize: 18 }}>
              Checklist
            </Title>
            {checklistDraftItems.map((item, index) => (
              <Card
                key={`${item.taskId || "item"}-${index}`}
                size="small"
                style={{ marginBottom: 8 }}
              >
                <Text type="secondary">
                  {[item.taskId, item.inspectionTypeFull]
                    .filter(Boolean)
                    .join(" | ")}
                </Text>
                {isCustomTask ? (
                  <>
                    <Input
                      style={{ marginTop: 6 }}
                      value={item.taskName || ""}
                      placeholder="Checklist item"
                      onChange={(e) =>
                        setChecklistDraftItems((prev) =>
                          prev.map((entry, idx) =>
                            idx === index
                              ? { ...entry, taskName: e.target.value }
                              : entry,
                          ),
                        )
                      }
                    />
                    <Input.TextArea
                      style={{ marginTop: 6 }}
                      rows={2}
                      value={item.description || ""}
                      placeholder="Description / notes"
                      onChange={(e) =>
                        setChecklistDraftItems((prev) =>
                          prev.map((entry, idx) =>
                            idx === index
                              ? { ...entry, description: e.target.value }
                              : entry,
                          ),
                        )
                      }
                    />
                    <Button
                      danger
                      type="link"
                      style={{ paddingLeft: 0 }}
                      onClick={() =>
                        setChecklistDraftItems((prev) =>
                          prev.filter((_, idx) => idx !== index),
                        )
                      }
                    >
                      Remove
                    </Button>
                  </>
                ) : (
                  <div style={{ marginTop: 6 }}>
                    <Text>{item.taskName}</Text>
                  </div>
                )}
              </Card>
            ))}
            {isCustomTask && (
              <Button
                onClick={() =>
                  setChecklistDraftItems((prev) => [
                    ...prev,
                    {
                      taskId: `custom-${Date.now()}-${prev.length + 1}`,
                      taskName: "",
                      description: "",
                      inspectionType: "Custom",
                      inspectionTypeFull: "Custom Task",
                    },
                  ])
                }
              >
                Add Checklist Item
              </Button>
            )}
          </Col>
        </Row>
      </Form>
    </Modal>
  );
}
