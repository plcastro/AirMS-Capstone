export const AUDIT_ACTION_CATEGORIES = [
  {
    value: "auth",
    label: "Authentication",
    color: "#722ed1",
    keywords: [
      "login",
      "log in",
      "logged in",
      "logout",
      "log out",
      "logged out",
      "signed in",
      "signed out",
      "session refreshed",
      "activated",
      "security setup",
      "otp",
      "password reset",
      "pin reset",
      "pin verified",
    ],
  },
  {
    value: "user",
    label: "User Management",
    color: "#1677ff",
    keywords: [
      "user",
      "profile",
      "password changed",
      "pin updated",
      "signature",
      "image",
      "invitation",
      "activation email",
      "mobile push device",
    ],
  },
  {
    value: "flight",
    label: "Flight Logs",
    color: "#13c2c2",
    keywords: ["flight log", "flightlogs"],
  },
  {
    value: "inspection",
    label: "Inspections",
    color: "#52c41a",
    keywords: [
      "inspection",
      "pre-inspection",
      "post-inspection",
      "pre-flight",
      "post-flight",
    ],
  },
  {
    value: "maintenance",
    label: "Maintenance",
    color: "#faad14",
    keywords: [
      "maintenance",
      "technical log",
      "defect log",
      "approval",
      "ai manual rules",
      "rectification",
    ],
  },
  {
    value: "task",
    label: "Tasks",
    color: "#eb2f96",
    keywords: ["task"],
  },
  {
    value: "parts",
    label: "Parts",
    color: "#fa8c16",
    keywords: ["parts", "requisition", "aircraft totals", "priority rules"],
  },
  {
    value: "communication",
    label: "Communication",
    color: "#2f54eb",
    keywords: ["message", "group chat", "notification"],
  },
  {
    value: "security",
    label: "Security",
    color: "#f5222d",
    keywords: ["security alert", "audit logs", "superadmin activity"],
  },
  {
    value: "export",
    label: "Exports",
    color: "#595959",
    keywords: ["exported", "export"],
  },
  {
    value: "create",
    label: "Create",
    color: "#389e0d",
    keywords: ["created", "added", "inserted", "new"],
  },
  {
    value: "update",
    label: "Update",
    color: "#0958d9",
    keywords: ["updated", "modified", "changed", "edited", "saved"],
  },
  {
    value: "delete",
    label: "Delete",
    color: "#cf1322",
    keywords: ["deleted", "removed", "destroyed", "erased", "revoked"],
  },
];

export const OTHER_AUDIT_ACTION_CATEGORY = {
  value: "other",
  label: "Other",
  color: "#8c8c8c",
};

export const AUDIT_ACTION_CHART_CATEGORIES = [
  ...AUDIT_ACTION_CATEGORIES,
  OTHER_AUDIT_ACTION_CATEGORY,
];

export const getAuditActionCategory = (actionText = "") => {
  const text = String(actionText || "").toLowerCase();
  const category = AUDIT_ACTION_CATEGORIES.find(({ keywords }) =>
    keywords.some((keyword) => text.includes(keyword)),
  );

  return category?.value || "other";
};

export const getAuditActionCategoryOptions = () => [
  { label: "All Actions", value: "all" },
  ...AUDIT_ACTION_CATEGORIES.map(({ label, value }) => ({ label, value })),
  {
    label: OTHER_AUDIT_ACTION_CATEGORY.label,
    value: OTHER_AUDIT_ACTION_CATEGORY.value,
  },
];

export const buildEmptyAuditCategoryCounts = () =>
  AUDIT_ACTION_CATEGORIES.reduce(
    (counts, category) => ({ ...counts, [category.value]: 0 }),
    { other: 0 },
  );
