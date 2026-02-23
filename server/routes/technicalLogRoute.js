const express = require("express");
const router = express.Router();
const {
  createTechnicalLog,
  getAllTechnicalLogs,
  getTechnicalLogById,
  updateTechnicalLog,
  deleteTechnicalLog,
} = require("../controllers/technicalLogController");

router.post("/createTechnicalLog", createTechnicalLog);
router.get("/getAllTechnicalLogs", getAllTechnicalLogs);
router.get("/getTechnicalLogById/:id", getTechnicalLogById);
router.put("/updateTechnicalLogById/:id", updateTechnicalLog);
router.delete("/deleteTechnicalLogById/:id", deleteTechnicalLog);

module.exports = router;
