const express = require("express");
const router = express.Router();
const {
  getAircraftTailNumbers,
  getTechnicalLogs,
} = require("../controllers/aircraftController");

router.get("/aircraft-tail-numbers", getAircraftTailNumbers);
router.get("/technical-logs", getTechnicalLogs);

module.exports = router;
