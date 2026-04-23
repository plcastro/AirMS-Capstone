const AdminActivityLog = require("../models/adminActivityLogModel");

/**
 * Log admin activity for audit trail
 */
const logAdminActivity = async ({
  admin,
  action,
  targetUser,
  details,
  ipAddress,
  userAgent,
  endpoint,
  method,
  statusCode,
  severity,
  status,
}) => {
  try {
    const activityLog = new AdminActivityLog({
      admin,
      action,
      targetUser,
      details,
      ipAddress,
      userAgent,
      endpoint,
      method,
      statusCode,
      severity: severity || "MEDIUM",
      status: status || "SUCCESS",
    });

    await activityLog.save();
    return activityLog;
  } catch (error) {
    console.error("Error logging admin activity:", error);
    // Don't throw error - logging should not break main operations
  }
};

/**
 * Get admin activity logs with filtering
 */
const getAdminActivityLogs = async (req, res) => {
  try {
    const {
      adminId,
      action,
      targetUserId,
      startDate,
      endDate,
      severity,
      limit = 50,
      page = 1,
    } = req.query;

    let filter = {};

    if (adminId) filter["admin.id"] = adminId;
    if (action) filter.action = action;
    if (targetUserId) filter["targetUser.id"] = targetUserId;
    if (severity) filter.severity = severity;

    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) filter.timestamp.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;

    const logs = await AdminActivityLog.find(filter)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await AdminActivityLog.countDocuments(filter);

    res.json({
      success: true,
      data: logs,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching admin activity logs:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get admin activity dashboard summary
 */
const getAdminActivitySummary = async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const summary = await AdminActivityLog.aggregate([
      {
        $match: {
          timestamp: { $gte: startDate },
        },
      },
      {
        $facet: {
          actionCounts: [
            {
              $group: {
                _id: "$action",
                count: { $sum: 1 },
              },
            },
            {
              $sort: { count: -1 },
            },
          ],
          severityCounts: [
            {
              $group: {
                _id: "$severity",
                count: { $sum: 1 },
              },
            },
          ],
          topAdmins: [
            {
              $group: {
                _id: "$admin.username",
                actionCount: { $sum: 1 },
                adminId: { $first: "$admin.id" },
              },
            },
            {
              $sort: { actionCount: -1 },
            },
            {
              $limit: 5,
            },
          ],
          criticalActivities: [
            {
              $match: {
                severity: "CRITICAL",
              },
            },
            {
              $limit: 10,
            },
          ],
        },
      },
    ]);

    res.json({
      success: true,
      data: summary[0] || {
        actionCounts: [],
        severityCounts: [],
        topAdmins: [],
        criticalActivities: [],
      },
    });
  } catch (error) {
    console.error("Error fetching admin activity summary:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get specific admin activity details
 */
const getAdminActivityDetails = async (req, res) => {
  try {
    const { activityId } = req.params;

    const activity = await AdminActivityLog.findById(activityId);

    if (!activity) {
      return res
        .status(404)
        .json({ success: false, message: "Activity log not found" });
    }

    res.json({ success: true, data: activity });
  } catch (error) {
    console.error("Error fetching activity details:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Export admin activity logs (CSV or JSON)
 */
const exportAdminActivityLogs = async (req, res) => {
  try {
    const { format = "json", days = 30, adminId } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    let filter = { timestamp: { $gte: startDate } };
    if (adminId) filter["admin.id"] = adminId;

    const logs = await AdminActivityLog.find(filter)
      .sort({ timestamp: -1 })
      .lean();

    if (format === "csv") {
      const csv = convertToCSV(logs);
      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="admin-activity-${Date.now()}.csv"`,
      );
      res.send(csv);
    } else {
      res.setHeader("Content-Type", "application/json");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="admin-activity-${Date.now()}.json"`,
      );
      res.json(logs);
    }
  } catch (error) {
    console.error("Error exporting admin activity logs:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Helper function to convert logs to CSV format
 */
const convertToCSV = (logs) => {
  if (logs.length === 0) return "No data";

  const headers = [
    "Timestamp",
    "Admin",
    "Email",
    "Action",
    "Target User",
    "Target Email",
    "IP Address",
    "Endpoint",
    "Method",
    "Severity",
    "Status",
  ];

  const rows = logs.map((log) => [
    log.timestamp.toISOString(),
    log.admin.username,
    log.admin.email,
    log.action,
    log.targetUser?.username || "N/A",
    log.targetUser?.email || "N/A",
    log.ipAddress,
    log.endpoint,
    log.method,
    log.severity,
    log.status,
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
  ].join("\n");

  return csvContent;
};

module.exports = {
  logAdminActivity,
  getAdminActivityLogs,
  getAdminActivitySummary,
  getAdminActivityDetails,
  exportAdminActivityLogs,
};
