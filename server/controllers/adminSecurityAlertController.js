const AdminSecurityAlert = require("../models/adminSecurityAlertModel");
const UserModel = require("../models/userModel");
const sendEmail = require("../utilities/sendEmail");

/**
 * Create a security alert for critical operations
 */
const createSecurityAlert = async ({
  alertType,
  severity = "WARNING",
  title,
  description,
  affectedUser,
  triggeredBy,
  details,
}) => {
  try {
    const alert = new AdminSecurityAlert({
      alertType,
      severity,
      title,
      description,
      affectedUser,
      triggeredBy,
      details,
      notificationsSent: new Map(),
    });

    await alert.save();

    // Trigger notifications immediately for CRITICAL alerts
    if (severity === "CRITICAL") {
      await notifyAdmins(alert);
    }

    return alert;
  } catch (error) {
    console.error("Error creating security alert:", error);
    return null;
  }
};

/**
 * Send notifications to all admins about a security alert
 */
const notifyAdmins = async (alert) => {
  try {
    // Get all admin users
    const admins = await UserModel.find({
      access: { $in: ["Admin", "Superuser"] },
      status: "active",
    });

    for (const admin of admins) {
      // Send email notification
      try {
        const emailBody = generateAlertEmailBody(alert, admin);
        await sendEmail(admin.email, alert.title, emailBody);

        // Update notification status
        if (!alert.notificationsSent) {
          alert.notificationsSent = new Map();
        }
        alert.notificationsSent.set(`email-${admin._id}`, {
          method: "email",
          sentAt: new Date(),
          recipient: admin.email,
          status: "sent",
        });
      } catch (emailError) {
        console.error(`Failed to send email to ${admin.email}:`, emailError);

        if (!alert.notificationsSent) {
          alert.notificationsSent = new Map();
        }
        alert.notificationsSent.set(`email-${admin._id}`, {
          method: "email",
          sentAt: new Date(),
          recipient: admin.email,
          status: "failed",
        });
      }
    }

    await alert.save();
  } catch (error) {
    console.error("Error notifying admins:", error);
  }
};

/**
 * Generate alert email body
 */
const generateAlertEmailBody = (alert, admin) => {
  const severityColor = {
    INFO: "blue",
    WARNING: "orange",
    CRITICAL: "red",
  };

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px;">
      <h2 style="color: ${severityColor[alert.severity] || "black"};">
        🔔 Security Alert: ${alert.title}
      </h2>
      
      <p><strong>Severity:</strong> <span style="color: ${severityColor[alert.severity]}">${alert.severity}</span></p>
      <p><strong>Description:</strong> ${alert.description}</p>
      
      ${
        alert.affectedUser
          ? `<p><strong>Affected User:</strong> ${alert.affectedUser.username} (${alert.affectedUser.email})</p>`
          : ""
      }
      
      ${
        alert.triggeredBy
          ? `<p><strong>Triggered By:</strong> ${alert.triggeredBy.username} (${alert.triggeredBy.email})</p>`
          : ""
      }
      
      ${
        alert.details?.ipAddress
          ? `<p><strong>IP Address:</strong> <code>${alert.details.ipAddress}</code></p>`
          : ""
      }
      
      <p><strong>Time:</strong> ${new Date(alert.createdAt).toLocaleString()}</p>
      
      <p>Please review this alert and take appropriate action if necessary.</p>
      
      <hr />
      <p style="color: #666; font-size: 12px;">
        This is an automated security alert. Do not reply to this email.
      </p>
    </div>
  `;
};

/**
 * Get all security alerts with filtering
 */
const getSecurityAlerts = async (req, res) => {
  try {
    const {
      alertType,
      severity,
      acknowledged,
      limit = 50,
      page = 1,
    } = req.query;

    let filter = {};

    if (alertType) filter.alertType = alertType;
    if (severity) filter.severity = severity;
    if (acknowledged !== undefined) {
      filter.acknowledged = acknowledged === "true";
    }

    const skip = (page - 1) * limit;

    const alerts = await AdminSecurityAlert.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await AdminSecurityAlert.countDocuments(filter);

    res.json({
      success: true,
      data: alerts,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching security alerts:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get security alert statistics
 */
const getAlertStats = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const stats = await AdminSecurityAlert.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
        },
      },
      {
        $facet: {
          byType: [
            {
              $group: {
                _id: "$alertType",
                count: { $sum: 1 },
              },
            },
            {
              $sort: { count: -1 },
            },
          ],
          bySeverity: [
            {
              $group: {
                _id: "$severity",
                count: { $sum: 1 },
              },
            },
          ],
          unacknowledged: [
            {
              $match: { acknowledged: false },
            },
            {
              $count: "count",
            },
          ],
          critical: [
            {
              $match: { severity: "CRITICAL", acknowledged: false },
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
      data: stats[0] || {
        byType: [],
        bySeverity: [],
        unacknowledged: [],
        critical: [],
      },
    });
  } catch (error) {
    console.error("Error fetching alert statistics:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Acknowledge a security alert
 */
const acknowledgeAlert = async (req, res) => {
  try {
    const { alertId } = req.params;
    const { actionNotes } = req.body;

    const alert = await AdminSecurityAlert.findByIdAndUpdate(
      alertId,
      {
        acknowledged: true,
        "acknowledgedBy.id": req.user.id,
        "acknowledgedBy.username": req.user.username,
        "acknowledgedBy.acknowledgedAt": new Date(),
        actionNotes,
      },
      { new: true },
    );

    res.json({
      success: true,
      data: alert,
      message: "Alert acknowledged",
    });
  } catch (error) {
    console.error("Error acknowledging alert:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Mark alert as resolved
 */
const resolveAlert = async (req, res) => {
  try {
    const { alertId } = req.params;
    const { actionTaken, actionNotes } = req.body;

    const alert = await AdminSecurityAlert.findByIdAndUpdate(
      alertId,
      {
        actionTaken: actionTaken || "resolved",
        actionNotes,
        "acknowledgedBy.id": req.user.id,
        "acknowledgedBy.username": req.user.username,
        "acknowledgedBy.acknowledgedAt": new Date(),
      },
      { new: true },
    );

    res.json({
      success: true,
      data: alert,
      message: "Alert resolved",
    });
  } catch (error) {
    console.error("Error resolving alert:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get unacknowledged critical alerts count
 */
const getUnacknowledgedCount = async (req, res) => {
  try {
    const count = await AdminSecurityAlert.countDocuments({
      acknowledged: false,
      severity: "CRITICAL",
    });

    res.json({
      success: true,
      count,
    });
  } catch (error) {
    console.error("Error getting unacknowledged count:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createSecurityAlert,
  notifyAdmins,
  getSecurityAlerts,
  getAlertStats,
  acknowledgeAlert,
  resolveAlert,
  getUnacknowledgedCount,
};
