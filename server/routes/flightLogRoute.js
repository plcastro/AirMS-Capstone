// routes/flightlogRoute.js
const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");
const { touchSessionActivity } = require("../middleware/sessionActivity");
const {
  requireActionConfirmation,
} = require("../middleware/actionConfirmation");
const workflow = require("../controllers/flightWorkflowController");
const inspectionWorkflow = require("../controllers/flightInspectionWorkflowController");
router.use(verifyToken);
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
  getFlightLogCrewOptions,
} = require("../controllers/flightLogController");
// Routes that don't require ID parameters
router
  .route("/")
  .get(getFlightLogs)
  .post(
    verifyToken,
    touchSessionActivity,
    requireActionConfirmation,
    createFlightLog,
  );

// Statistics and search routes
router.get("/stats", getFlightLogStats);
router.get("/search", searchFlightLogs);
router.get(
  "/pilot-options",
  verifyToken,
  require("../utils/flightLogPilot").getAssignedPilotOptions,
);

// Aircraft-specific routes
router.get("/aircraft/:rpc", getFlightLogsByAircraft);

// Status workflow routes
router.put(
  "/:id/release",
  verifyToken,
  touchSessionActivity,
  requireActionConfirmation,
  workflow.action("release"),
);
router.put(
  "/:id/accept",
  verifyToken,
  touchSessionActivity,
  requireActionConfirmation,
  workflow.action("accept"),
);
router.put(
  "/:id/complete",
  verifyToken,
  touchSessionActivity,
  requireActionConfirmation,
  workflow.action("complete"),
);

// Routes that require ID parameter
router
  .route("/:id")
  .get(getFlightLogById)
  .put(
    verifyToken,
    touchSessionActivity,
    requireActionConfirmation,
    workflow.save,
  );

module.exports = router;
