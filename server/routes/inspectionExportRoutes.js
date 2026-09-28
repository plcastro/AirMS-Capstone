const express = require("express");
const router = express.Router();
const {
  exportPreInspectionPdf,
  exportPostInspectionPdf,
} = require("../controllers/inspectionExportController");
const { verifyToken } = require("../middleware/authMiddleware");

/**
 * Export inspection documents
 * POST /api/inspections/export
 */

router.get(
  "/pre/:id/export-pdf",
  verifyToken,
  exportPreInspectionPdf
);

router.get(
  "/post/:id/export-pdf",
  verifyToken,
  exportPostInspectionPdf
);

module.exports = router;
