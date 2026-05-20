const { auditLog } = require("../controllers/logsController");
const { hasAuditLogged } = require("./requestContext");

const AUDITED_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const SENSITIVE_READ_PATTERNS = [
  /^\/api\/logs\/getAllUserLogs$/,
  /^\/api\/admin-activity\/(logs|summary|details\/[^/]+|export)$/,
  /^\/api\/admin-security-alerts\/?$/,
  /^\/api\/admin-security-alerts\/(stats|unacknowledged-count)$/,
  /^\/api\/inspections\/(pre|post)\/[^/]+\/export-(document|pdf)$/,
];

const routeLabels = [
  { pattern: /^\/api\/user\/login$/, action: "User login attempted" },
  { pattern: /^\/api\/user\/logout$/, action: "User logout attempted" },
  {
    pattern: /^\/api\/user\/refresh-token$/,
    action: "User session refreshed",
  },
  {
    pattern: /^\/api\/user\/register-mobile-push-device$/,
    action: "Mobile push device registered",
  },
  { pattern: /^\/api\/user\/create$/, action: "User created" },
  { pattern: /^\/api\/user\/update-user\//, action: "User updated" },
  {
    pattern: /^\/api\/user\/update-user-profile\//,
    action: "User profile updated",
  },
  {
    pattern: /^\/api\/user\/change-password\//,
    action: "User password changed",
  },
  { pattern: /^\/api\/user\/update-pin\//, action: "User PIN updated" },
  { pattern: /^\/api\/user\/verify-pin\//, action: "User PIN verified" },
  {
    pattern: /^\/api\/user\/update-user-status\//,
    action: "User status updated",
  },
  {
    pattern: /^\/api\/user\/update-user-image\//,
    action: "User image updated",
  },
  {
    pattern: /^\/api\/user\/updateSignature\//,
    action: "User signature updated",
  },
  { pattern: /^\/api\/user\/activate$/, action: "User activated" },
  {
    pattern: /^\/api\/user\/resend-activation/,
    action: "Activation email resent",
  },
  {
    pattern: /^\/api\/user\/extend-invitation-expiry\//,
    action: "Invitation expiry extended",
  },
  {
    pattern: /^\/api\/user\/revoke-invitation\//,
    action: "Invitation revoked",
  },
  {
    pattern: /^\/api\/user\/complete-security-setup$/,
    action: "Security setup completed",
  },
  {
    pattern: /^\/api\/user\/request-password-reset$/,
    action: "Password reset requested",
  },
  { pattern: /^\/api\/user\/verify-otp$/, action: "Password OTP verified" },
  { pattern: /^\/api\/user\/reset-password$/, action: "Password reset" },
  {
    pattern: /^\/api\/user\/request-pin-reset/,
    action: "PIN reset requested",
  },
  { pattern: /^\/api\/user\/verify-pin-otp$/, action: "PIN OTP verified" },
  { pattern: /^\/api\/user\/reset-pin$/, action: "PIN reset" },
  {
    pattern: /^\/api\/notifications\/mark-all-read$/,
    action: "All notifications marked read",
  },
  {
    pattern: /^\/api\/notifications\/[^/]+\/read$/,
    action: "Notification marked read",
  },
  { pattern: /^\/api\/flightlogs$/, action: "Flight log created" },
  { pattern: /^\/api\/flightlogs\/[^/]+$/, action: "Flight log updated" },
  {
    pattern: /^\/api\/flightlogs\/[^/]+\/release$/,
    action: "Flight log released",
  },
  {
    pattern: /^\/api\/flightlogs\/[^/]+\/accept$/,
    action: "Flight log accepted",
  },
  {
    pattern: /^\/api\/flightlogs\/[^/]+\/complete$/,
    action: "Flight log completed",
  },
  {
    pattern: /^\/api\/maintenance-logs\/createMaintenanceLog$/,
    action: "Maintenance log created",
  },
  {
    pattern: /^\/api\/maintenance-logs\/updateMaintenanceLogById\//,
    action: "Maintenance log updated",
  },
  {
    pattern: /^\/api\/maintenance-logs\/deleteMaintenanceLogById\//,
    action: "Maintenance log deleted",
  },
  {
    pattern: /^\/api\/technical-logs\/createTechnicalLog$/,
    action: "Technical log created",
  },
  {
    pattern: /^\/api\/technical-logs\/updateTechnicalLogById\//,
    action: "Technical log updated",
  },
  {
    pattern: /^\/api\/technical-logs\/deleteTechnicalLogById\//,
    action: "Technical log deleted",
  },
  {
    pattern: /^\/api\/approve-technical-logs\/createApproval$/,
    action: "Technical log approval created",
  },
  {
    pattern: /^\/api\/approve-technical-logs\/updateApprovalById\//,
    action: "Technical log approval updated",
  },
  {
    pattern: /^\/api\/approve-technical-logs\/deleteApprovalById\//,
    action: "Technical log approval deleted",
  },
  {
    pattern: /^\/api\/defect-logs\/createDefect$/,
    action: "Defect log created",
  },
  {
    pattern: /^\/api\/defect-logs\/updateDefectById\//,
    action: "Defect log updated",
  },
  {
    pattern: /^\/api\/defect-logs\/deleteDefectById\//,
    action: "Defect log deleted",
  },
  {
    pattern: /^\/api\/pre-inspections\/createPreInspection$/,
    action: "Pre-inspection created",
  },
  {
    pattern: /^\/api\/pre-inspections\/updatePreInspectionById\//,
    action: "Pre-inspection updated",
  },
  {
    pattern: /^\/api\/pre-inspections\/deletePreInspectionById\//,
    action: "Pre-inspection deleted",
  },
  {
    pattern: /^\/api\/post-inspections\/createPostInspection$/,
    action: "Post-inspection created",
  },
  {
    pattern: /^\/api\/post-inspections\/updatePostInspectionById\//,
    action: "Post-inspection updated",
  },
  {
    pattern: /^\/api\/post-inspections\/deletePostInspectionById\//,
    action: "Post-inspection deleted",
  },
  { pattern: /^\/api\/tasks\/create$/, action: "Task created" },
  {
    pattern: /^\/api\/tasks\/[^/]+\/status$/,
    action: "Task status changed",
  },
  { pattern: /^\/api\/tasks\/[^/]+$/, action: "Task updated or deleted" },
  {
    pattern: /^\/api\/parts-requisition\/create-requisition$/,
    action: "Parts requisition created",
  },
  {
    pattern: /^\/api\/parts-requisition\/update-requisition\//,
    action: "Parts requisition status updated",
  },
  {
    pattern: /^\/api\/parts-monitoring\/save$/,
    action: "Parts monitoring saved",
  },
  {
    pattern: /^\/api\/parts-monitoring\/maintenance-priority\/rules$/,
    action: "Maintenance priority rules updated",
  },
  {
    pattern: /^\/api\/parts-monitoring\/[^/]+\/update-totals$/,
    action: "Aircraft totals updated",
  },
  {
    pattern: /^\/api\/parts-monitoring\/aircraft\//,
    action: "Aircraft parts monitoring data deleted",
  },
  {
    pattern: /^\/api\/parts-monitoring\//,
    action: "Parts monitoring record deleted",
  },
  {
    pattern: /^\/api\/admin-security-alerts\/[^/]+\/acknowledge$/,
    action: "Security alert acknowledged",
  },
  {
    pattern: /^\/api\/admin-security-alerts\/[^/]+\/resolve$/,
    action: "Security alert resolved",
  },
  { pattern: /^\/api\/logs\/getAllUserLogs$/, action: "Audit logs viewed" },
  {
    pattern: /^\/api\/admin-activity\/logs$/,
    action: "Admin activity logs viewed",
  },
  {
    pattern: /^\/api\/admin-activity\/summary$/,
    action: "Admin activity summary viewed",
  },
  {
    pattern: /^\/api\/admin-activity\/details\//,
    action: "Admin activity details viewed",
  },
  {
    pattern: /^\/api\/admin-activity\/export$/,
    action: "Admin activity logs exported",
  },
  {
    pattern: /^\/api\/admin-security-alerts\/?$/,
    action: "Security alerts viewed",
  },
  {
    pattern: /^\/api\/admin-security-alerts\/stats$/,
    action: "Security alert stats viewed",
  },
  {
    pattern: /^\/api\/admin-security-alerts\/unacknowledged-count$/,
    action: "Security alert count viewed",
  },
  {
    pattern: /^\/api\/inspections\/pre\/[^/]+\/export-document$/,
    action: "Pre-inspection document exported",
  },
  {
    pattern: /^\/api\/inspections\/pre\/[^/]+\/export-pdf$/,
    action: "Pre-inspection PDF exported",
  },
  {
    pattern: /^\/api\/inspections\/post\/[^/]+\/export-document$/,
    action: "Post-inspection document exported",
  },
  {
    pattern: /^\/api\/inspections\/post\/[^/]+\/export-pdf$/,
    action: "Post-inspection PDF exported",
  },
  { pattern: /^\/api\/ai-insights\/rules$/, action: "AI manual rules updated" },
  {
    pattern: /^\/api\/ai-insights\/rectification-task$/,
    action: "AI rectification task created",
  },
  { pattern: /^\/api\/messages\/groups$/, action: "Group chat created" },
  { pattern: /^\/api\/messages$/, action: "Message sent" },
];

const methodAction = {
  POST: "created or submitted",
  PUT: "updated",
  PATCH: "partially updated",
  DELETE: "deleted",
};

const toTitleCase = (value) =>
  value
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const stripQuery = (url = "") => String(url || "").split("?")[0];

const getActorId = (req) =>
  req.user?.id || req.user?._id || req.user?.userId || null;

const describeRoute = (req) => {
  const path = stripQuery(req.originalUrl);
  const explicit = routeLabels.find(({ pattern }) => pattern.test(path));
  if (explicit) {
    return explicit.action;
  }

  const resource = path
    .replace(/^\/api\//, "")
    .split("/")
    .filter(Boolean)[0];

  const label = resource ? toTitleCase(resource) : "API resource";
  const verb = methodAction[req.method] || "changed";
  return `${label} ${verb}`;
};

const shouldAuditRequest = (req) => {
  const method = String(req.method || "").toUpperCase();
  const path = stripQuery(req.originalUrl);

  if (
    !AUDITED_METHODS.has(method) &&
    !(
      method === "GET" &&
      SENSITIVE_READ_PATTERNS.some((pattern) => pattern.test(path))
    )
  ) {
    return false;
  }

  if (!path.startsWith("/api/")) {
    return false;
  }

  return true;
};

const auditMutatingRequest = (req, res, next) => {
  res.on("finish", () => {
    if (!shouldAuditRequest(req) || hasAuditLogged()) {
      return;
    }

    const path = stripQuery(req.originalUrl);
    const isNoisyAuthSuccess =
      res.statusCode < 400 &&
      (/^\/api\/user\/login$/.test(path) ||
        /^\/api\/user\/refresh-token$/.test(path));
    if (isNoisyAuthSuccess) {
      return;
    }

    const status = res.statusCode < 400 ? "succeeded" : "failed";
    const action = `${describeRoute(req)} ${status} (status ${res.statusCode})`;

    auditLog(action, getActorId(req)).catch((error) => {
      console.error("Automatic audit log failed:", error);
    });
  });

  next();
};

module.exports = {
  auditMutatingRequest,
};
