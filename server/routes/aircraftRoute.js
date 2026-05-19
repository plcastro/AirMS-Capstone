const express = require("express");
const router = express.Router();
const {
  getAircraftTailNumbers,
  getAircraftWithBases,
  getTechnicalLogs,
} = require("../controllers/aircraftController");

router.get("/aircraft-tail-numbers", getAircraftTailNumbers);
router.get("/aircraft-with-bases", getAircraftWithBases);
router.get("/technical-logs", getTechnicalLogs);

module.exports = router;
