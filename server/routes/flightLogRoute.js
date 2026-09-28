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
const confirmFlightEntry = require("../controllers/flightEntryConfirmationController");
router.use(verifyToken);
const {
  createFlightLog,
  getFlightLogs,
  getFlightLogById,
  getFlightLogsByAircraft,
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
router.get("/crew-options", getFlightLogCrewOptions);
router.post(
  "/preflight-confirmations",
  touchSessionActivity,
  requireActionConfirmation,
  confirmFlightEntry,
);
router.get(
  "/pilot-options",
  verifyToken,
  require("../utils/flightLogPilot").getAssignedPilotOptions,
);

// Aircraft-specific routes
router.get("/aircraft/:rpc", getFlightLogsByAircraft);

// Register the workspace endpoints used by both web and mobile. Named routes
// above must precede /:id so crew lookups are not treated as flight-log IDs.
router.get("/:id/workspace", workflow.workspace);
router.post("/:id/review", touchSessionActivity, requireActionConfirmation, workflow.review);
router.put("/:id/reconcile", touchSessionActivity, requireActionConfirmation, workflow.reconcile);
router.put("/:id/amend", touchSessionActivity, requireActionConfirmation, workflow.amend);
router.post("/:id/defects", touchSessionActivity, requireActionConfirmation, workflow.defects);
router.put("/:id/defects/:defectId", touchSessionActivity, requireActionConfirmation, workflow.defects);
router.post("/:id/inspections", touchSessionActivity, requireActionConfirmation, inspectionWorkflow.create);
router.put("/:flightId/inspections/pre/:id", touchSessionActivity, requireActionConfirmation, inspectionWorkflow.edit("pre"));
router.put("/:flightId/inspections/post/:id", touchSessionActivity, requireActionConfirmation, inspectionWorkflow.edit("post"));

// Status workflow routes
router.put("/:id/submit", touchSessionActivity, requireActionConfirmation, workflow.action("submit"));
router.put("/:id/return", touchSessionActivity, requireActionConfirmation, workflow.action("return"));
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
