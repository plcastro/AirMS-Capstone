// routes/flightlogRoute.js
const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");
const { touchSessionActivity } = require("../middleware/sessionActivity");
const { requireActionConfirmation } = require("../middleware/actionConfirmation");
const workflow = require('../controllers/flightWorkflowController');
const inspectionWorkflow = require('../controllers/flightInspectionWorkflowController');
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
  .post(verifyToken, touchSessionActivity, requireActionConfirmation, createFlightLog);

// Statistics and search routes
router.get("/stats", getFlightLogStats);
router.get("/search", searchFlightLogs);
router.get("/crew-options", verifyToken, getFlightLogCrewOptions);
router.post('/preflight-confirmations', touchSessionActivity, requireActionConfirmation, require('../controllers/flightEntryConfirmationController'));
router.get('/crew-authorizations', verifyToken, workflow.authorizations);
router.put('/crew-authorizations', verifyToken, touchSessionActivity, requireActionConfirmation, workflow.authorizations);
router.get('/:id/workspace', verifyToken, workflow.workspace);
router.post('/:id/inspections', verifyToken, touchSessionActivity, requireActionConfirmation, inspectionWorkflow.create);
router.put('/:flightId/inspections/pre/:id', verifyToken, touchSessionActivity, requireActionConfirmation, inspectionWorkflow.edit('pre'));
router.put('/:flightId/inspections/post/:id', verifyToken, touchSessionActivity, requireActionConfirmation, inspectionWorkflow.edit('post'));
router.post('/:id/review', verifyToken, workflow.review);
router.post('/:id/defects', verifyToken, touchSessionActivity, requireActionConfirmation, workflow.defects);
router.put('/:id/defects/:defectId', verifyToken, touchSessionActivity, requireActionConfirmation, workflow.defects);
router.put('/:id/submit', verifyToken, touchSessionActivity, requireActionConfirmation, workflow.action('submit'));
router.put('/:id/return', verifyToken, touchSessionActivity, requireActionConfirmation, workflow.action('return'));
router.put('/:id/amend', verifyToken, touchSessionActivity, requireActionConfirmation, workflow.amend);
router.put('/:id/reconcile', verifyToken, touchSessionActivity, requireActionConfirmation, workflow.reconcile);

// Aircraft-specific routes
router.get("/aircraft/:rpc", getFlightLogsByAircraft);

// Status workflow routes
router.put(
  "/:id/release",
  verifyToken,
  touchSessionActivity,
  requireActionConfirmation,
  workflow.action('release'),
);
router.put(
  "/:id/accept",
  verifyToken,
  touchSessionActivity,
  requireActionConfirmation,
  workflow.action('accept'),
);
router.put(
  "/:id/complete",
  verifyToken,
  touchSessionActivity,
  requireActionConfirmation,
  workflow.action('complete'),
);

// Routes that require ID parameter
router
  .route("/:id")
  .get(getFlightLogById)
  .put(verifyToken, touchSessionActivity, requireActionConfirmation, workflow.save);

module.exports = router;
