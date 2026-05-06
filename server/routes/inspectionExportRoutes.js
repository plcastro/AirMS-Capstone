const express = require("express");
const router = express.Router();
const {
  exportPreInspectionDocument,
  exportPostInspectionDocument,
  exportPreInspectionPdf,
  exportPostInspectionPdf,
} = require("../controllers/inspectionExportController");
const { verifyToken } = require("../middleware/authMiddleware");

/**
 * Export inspection documents
 * POST /api/inspections/export
 */

// Pre-inspection export
router.get(
  "/pre/:id/export-document",
  verifyToken,
  exportPreInspectionDocument
);

router.get(
  "/pre/:id/export-pdf",
  verifyToken,
  exportPreInspectionPdf
);

// Post-inspection export
router.get(
  "/post/:id/export-document",
  verifyToken,
  exportPostInspectionDocument
);

router.get(
  "/post/:id/export-pdf",
  verifyToken,
  exportPostInspectionPdf
);

module.exports = router;
