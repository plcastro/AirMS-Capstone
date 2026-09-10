import React from "react";
import { Tag } from "antd";

const STATUS_TAG_COLORS = {
  active: "#52c41a",
  approved: "#389e0d",
  complete: "#237804",
  completed: "#237804",
  rectified: "#5b8c00",
  released: "#0958d9",
  verified: "#08979c",
  accepted: "#13c2c2",
  available: "#52c41a",
  open: "blue",
  submitted: "blue",
  "turned in": "blue",
  pending: "#774f00",
  "pending approval": "#774f00",
  "pending acceptance": "#774f00",
  "pending release": "#774f00",
  assigned: "cyan",
  ongoing: "processing",
  "in progress": "processing",
  busy: "processing",
  review: "purple",
  "for review": "purple",
  returned: "orange",
  deferred: "orange",
  overdue: "volcano",
  "past due": "volcano",
  rejected: "red",
  cancelled: "red",
  canceled: "red",
  failed: "red",
  inactive: "default",
  closed: "default",
  offline: "default",
  "n/a": "default",
};

export const getStatusTagColor = (status) => {
  const normalized = String(status || "N/A")
    .trim()
    .replace(/[_-]+/g, " ")
    .toLowerCase();
  return STATUS_TAG_COLORS[normalized] || "default";
};

export const renderStatusTag = (status, fallback = "N/A") => {
  const label = String(status || fallback).trim() || fallback;
  return <Tag color={getStatusTagColor(label)}>{label.toUpperCase()}</Tag>;
};
