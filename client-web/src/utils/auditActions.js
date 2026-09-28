export const AUDIT_ACTION_CATEGORIES = [
  {
    value: "create",
    label: "Create",
    color: "#389e0d",
    keywords: ["created", "added", "submitted", "registered"],
  },
  {
    value: "update",
    label: "Update",
    color: "#1677ff",
    keywords: ["updated", "changed", "modified", "edited", "saved"],
  },
  {
    value: "delete",
    label: "Delete",
    color: "#cf1322",
    keywords: ["deleted", "removed", "revoked", "destroyed", "erased"],
  },
  {
    value: "view",
    label: "View",
    color: "#13c2c2",
    keywords: ["viewed", "opened", "read", "accessed"],
  },
  {
    value: "export",
    label: "Export",
    color: "#595959",
    keywords: [
      "export",
      "downloaded",
      "printed",
      "generated pdf",
      "generated document",
    ],
  },
  {
    value: "authentication",
    label: "Authentication",
    color: "#722ed1",
    keywords: [
      "login",
      "logout",
      "session refreshed",
      "otp",
      "password reset",
      "pin reset",
      "trusted device",
      "security setup",
      "activated",
    ],
  },
  {
    value: "notification",
    label: "Notification",
    color: "#fa8c16",
    keywords: ["notification", "message", "email"],
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
