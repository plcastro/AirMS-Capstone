const UserModel = require("../models/userModel");
const UserLog = require("../models/logsModel");

const auditLog = async (action, userId = null) => {
  try {
    let username = "System";
    if (userId) {
      const user = await UserModel.findById(userId);
      if (user) {
        username = user.username;
      } else {
        username = `Unknown (ID: ${userId})`;
      }
    }

    const newLog = await UserLog.create({
      action,
      performedBy: userId,
      username,
    });

    console.log(
      `Audit Log - User: ${username}, Action: ${action}, Timestamp: ${new Date()}`,
    );

    return newLog;
  } catch (err) {
    console.error("Audit log failed:", err);
  }
};

const getAllUserLogs = async (req, res) => {
  try {
    const logs = await UserLog.find().sort({ dateTime: -1 });

    const data = logs.map((log, index) => ({
      index: index + 1,
      dateTime: log.dateTime.toLocaleString(),
      actionMade: log.action,
      username: log.username || "null", // use stored username
    }));

    res.status(200).json({ status: "Ok", data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch logs" });
  }
};

module.exports = {
  auditLog,
  getAllUserLogs,
};
