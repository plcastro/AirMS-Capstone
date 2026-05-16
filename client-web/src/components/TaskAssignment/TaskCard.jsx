import React from "react";
import { Card, Progress, Tag, Typography } from "antd";

const { Text, Title } = Typography;

const normalizeStatus = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const getStatusMeta = (status) => {
  const normalized = normalizeStatus(status);
  if (normalized === "approved")
    return { bg: "#E8F5E9", color: "#2E7D32", text: "Approved" };
  if (normalized === "returned")
    return { bg: "#FFEBEE", color: "#C62828", text: "Returned" };
  if (normalized === "ongoing")
    return { bg: "#FFF8E1", color: "#ED6C02", text: "Ongoing" };
  if (normalized === "turned in")
    return { bg: "#E3F2FD", color: "#1565C0", text: "Turned In" };
  if (normalized === "pending")
    return { bg: "#F3F4F6", color: "#4B5563", text: "Pending" };
  return { bg: "#F3F4F6", color: "#4B5563", text: status || "Pending" };
};

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

const getProgress = (task) => {
  const items = Array.isArray(task?.checklistItems) ? task.checklistItems : [];
  if (!items.length) return 0;
  const state = Array.isArray(task?.checklistState) ? task.checklistState : [];
  const done = state.filter(Boolean).length;
  return Math.round((done / items.length) * 100);
};

export default function TaskCard({ task, onOpen, highlighted = false }) {
  const statusMeta = getStatusMeta(task.status);
  const progress = getProgress(task);
  const deadline = task.endDateTime || task.dueDate;
  const showProgress = ["ongoing", "returned"].includes(
    normalizeStatus(task.status),
  );

  return (
    <Card
      hoverable
      onClick={() => onOpen(task)}
      bodyStyle={{ padding: 14 }}
      style={{
        borderRadius: 12,
        border: highlighted ? "1px solid #26866F" : "1px solid #E4E7EC",
        boxShadow: "0 2px 10px rgba(16,24,40,0.04)",
        cursor: "pointer",
        backgroundColor: highlighted ? "#F3FAF8" : "#FFFFFF",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
        <div style={{ flex: 1 }}>
          <Title level={5} style={{ margin: 0, fontSize: 15, lineHeight: "22px" }}>
            {task.title || task.maintenanceType || "Maintenance Task"}
          </Title>
          <Text type="secondary">
            Aircraft {task.aircraft || "N/A"} | Due {formatDateTime(deadline)}
          </Text>
        </div>
        <Tag
          style={{
            border: "none",
            borderRadius: 999,
            marginRight: 0,
            alignSelf: "flex-start",
            background: statusMeta.bg,
            color: statusMeta.color,
            fontWeight: 700,
          }}
        >
          {statusMeta.text}
        </Tag>
      </div>

      {!!task.assignedToName && (
        <div style={{ marginTop: 8 }}>
          <Text type="secondary">Assigned to {task.assignedToName}</Text>
        </div>
      )}

      {!!task.returnComments && (
        <div
          style={{
            marginTop: 10,
            background: "#FFF1F0",
            border: "1px solid #FFC4BE",
            borderRadius: 8,
            padding: "8px 10px",
          }}
        >
          <Text style={{ color: "#B42318", fontSize: 12 }}>{task.returnComments}</Text>
        </div>
      )}

      {showProgress && (
        <div style={{ marginTop: 10 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 4,
            }}
          >
            <Text type="secondary">Progress</Text>
            <Text type="secondary">{progress}%</Text>
          </div>
          <Progress percent={progress} showInfo={false} strokeColor="#26866F" />
        </div>
      )}
    </Card>
  );
}
