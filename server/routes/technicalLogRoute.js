const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");
const { touchSessionActivity } = require("../middleware/sessionActivity");
const { requireActionConfirmation } = require("../middleware/actionConfirmation");
const {
  createTechnicalLog,
  getAllTechnicalLogs,
  getTechnicalLogById,
  updateTechnicalLog,
  deleteTechnicalLog,
} = require("../controllers/technicalLogController");

router.post(
  "/createTechnicalLog",
  verifyToken,
  touchSessionActivity,
  requireActionConfirmation,
  createTechnicalLog,
);
router.get("/getAllTechnicalLogs", getAllTechnicalLogs);
router.get("/getTechnicalLogById/:id", getTechnicalLogById);
router.put(
  "/updateTechnicalLogById/:id",
  verifyToken,
  touchSessionActivity,
  requireActionConfirmation,
  updateTechnicalLog,
);
router.delete(
  "/deleteTechnicalLogById/:id",
  verifyToken,
  touchSessionActivity,
  requireActionConfirmation,
  deleteTechnicalLog,
);

module.exports = router;
