// routes/flightlogRoute.js
const express = require("express");
const router = express.Router();
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
// REMOVE AUTH MIDDLEWARE - No authentication required
// router.use(verifyToken); // COMMENT THIS OUT OR DELETE

// Routes that don't require ID parameters
router.route("/").get(getFlightLogs).post(createFlightLog);

// Statistics and search routes
router.get("/stats", getFlightLogStats);
router.get("/search", searchFlightLogs);

// Aircraft-specific routes
router.get("/aircraft/:rpc", getFlightLogsByAircraft);

// Status workflow routes
router.put("/:id/release", releaseFlightLog);
router.put("/:id/accept", acceptFlightLog);
router.put("/:id/complete", completeFlightLog);

// Routes that require ID parameter
router.route("/:id").get(getFlightLogById).put(updateFlightLog);

module.exports = router;
