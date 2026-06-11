const express = require("express");
const router = express.Router();
const multer = require("multer");
const { verifyToken } = require("../middleware/authMiddleware");
const { touchSessionActivity } = require("../middleware/sessionActivity");
const { requireActionConfirmation } = require("../middleware/actionConfirmation");
const {
  getPartsMonitoring,
  getAllPartsMonitoring,
  getMaintenancePriority,
  getInspectionRemainingHours,
  getMaintenancePriorityRules,
  savePartsMonitoring,
  saveMaintenancePriorityRules,
  deletePartsMonitoring,
  deleteAircraftData,
  getAircraftList,
  importPartsMonitoringWorkbook,
  previewPartsMonitoringWorkbook,
  updateAircraftTotals,
} = require("../controllers/partsMonitoringController");

const workbookUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = new Set([
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/octet-stream",
    ]);
    const allowedName = /\.(xlsx|xlsm)$/i.test(file.originalname || "");

    if (allowedMimeTypes.has(file.mimetype) || allowedName) {
      return cb(null, true);
    }

    return cb(new Error("INVALID_WORKBOOK_TYPE"));
  },
});

const handleWorkbookUploadError = (err, req, res, next) => {
  if (!err) return next();

  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({
        success: false,
        message: "Workbook is too large. Maximum size is 10MB.",
      });
    }

    return res.status(400).json({
      success: false,
      message: err.message || "Workbook upload failed.",
    });
  }

  if (err.message === "INVALID_WORKBOOK_TYPE") {
    return res.status(415).json({
      success: false,
      message: "Please upload an Excel workbook file.",
    });
  }

  return next(err);
};

router.get("/", getAllPartsMonitoring);
router.get("/aircraft-list", getAircraftList);
router.get("/maintenance-priority/rules", getMaintenancePriorityRules);
router.get("/maintenance-priority", getMaintenancePriority);
router.get("/inspection-remaining-hours", getInspectionRemainingHours);
router.get("/:aircraft", getPartsMonitoring);

router.post(
  "/save",
  verifyToken,
  touchSessionActivity,
  requireActionConfirmation,
  savePartsMonitoring,
);
router.post(
  "/preview-workbook",
  verifyToken,
  touchSessionActivity,
  workbookUpload.single("workbook"),
  handleWorkbookUploadError,
  previewPartsMonitoringWorkbook,
);
router.post(
  "/import-workbook",
  verifyToken,
  touchSessionActivity,
  workbookUpload.single("workbook"),
  handleWorkbookUploadError,
  importPartsMonitoringWorkbook,
);
router.put(
  "/maintenance-priority/rules",
  verifyToken,
  touchSessionActivity,
  requireActionConfirmation,
  saveMaintenancePriorityRules,
);

router.delete(
  "/:id",
  verifyToken,
  touchSessionActivity,
  requireActionConfirmation,
  deletePartsMonitoring,
);
router.delete(
  "/aircraft/:aircraft",
  verifyToken,
  touchSessionActivity,
  requireActionConfirmation,
  deleteAircraftData,
);

router.put(
  "/:aircraft/update-totals",
  verifyToken,
  touchSessionActivity,
  requireActionConfirmation,
  updateAircraftTotals,
);

module.exports = router;
