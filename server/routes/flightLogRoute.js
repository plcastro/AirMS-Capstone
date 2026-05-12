// routes/flightlogRoute.js
const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");
const { touchSessionActivity } = require("../middleware/sessionActivity");
const { requireActionConfirmation } = require("../middleware/actionConfirmation");
const {
  createFlightLog,
  getFlightLogs,
  getFlightLogById,
  getFlightLogsByAircraft,
  updateFlightLog,
  releaseFlightLog,
  acceptFlightLog,
  completeFlightLog,
  getFlightLogStats,
  searchFlightLogs,
} = require("../controllers/flightLogController");
// Routes that don't require ID parameters
router
  .route("/")
  .get(getFlightLogs)
  .post(verifyToken, touchSessionActivity, requireActionConfirmation, createFlightLog);

// Statistics and search routes
router.get("/stats", getFlightLogStats);
router.get("/search", searchFlightLogs);

// Aircraft-specific routes
router.get("/aircraft/:rpc", getFlightLogsByAircraft);

// Status workflow routes
router.put(
  "/:id/release",
  verifyToken,
  touchSessionActivity,
  requireActionConfirmation,
  releaseFlightLog,
);
router.put(
  "/:id/accept",
  verifyToken,
  touchSessionActivity,
  requireActionConfirmation,
  acceptFlightLog,
);
router.put(
  "/:id/complete",
  verifyToken,
  touchSessionActivity,
  requireActionConfirmation,
  completeFlightLog,
);

// Routes that require ID parameter
router
  .route("/:id")
  .get(getFlightLogById)
  .put(verifyToken, touchSessionActivity, requireActionConfirmation, updateFlightLog);

module.exports = router;
