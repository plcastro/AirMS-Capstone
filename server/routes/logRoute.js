const express = require("express");
const router = express.Router();

const { auditLog, getAllUserLogs } = require("../controllers/logsController");

router.post("/auditLog", auditLog);
router.get("/getAllUserLogs", getAllUserLogs);

module.exports = router;
