const express = require("express");
const router = express.Router();

const {
  getInspectionSchedules,
  getInspectionScheduleById,
  getTasksByInspection
} = require("../controllers/inspectionController");


router.get("/schedules", getInspectionSchedules);

router.get("/schedules/:id", getInspectionScheduleById);

router.get("/tasks", getTasksByInspection);


module.exports = router;