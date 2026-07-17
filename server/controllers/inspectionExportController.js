const {
  getPreInspectionPdf,
  getPostInspectionPdf,
} = require("../services/documentTemplateService");
const PreInspection = require("../models/preInspectionModel");
const PostInspection = require("../models/postInspectionModel");

const exportPreInspectionPdf = async (req, res) => {
  try {
    const { id } = req.params;
    const inspection = await PreInspection.findById(id).lean();

    if (!inspection) {
      return res.status(404).json({ error: "Pre-inspection not found" });
    }

    const pdfBuffer = await getPreInspectionPdf(inspection);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="Pre-Inspection-${inspection.rpc}-${inspection.date}.pdf"`
    );
    res.send(pdfBuffer);
  } catch (error) {
    console.error("Error exporting pre-inspection PDF:", error);
    res.status(500).json({
      error: "Failed to generate pre-inspection PDF",
      message: error.message,
    });
  }
};

const exportPostInspectionPdf = async (req, res) => {
  try {
    const { id } = req.params;
    const inspection = await PostInspection.findById(id).lean();

    if (!inspection) {
      return res.status(404).json({ error: "Post-inspection not found" });
    }

    const pdfBuffer = await getPostInspectionPdf(inspection);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="Post-Inspection-${inspection.rpc}-${inspection.date}.pdf"`
    );
    res.send(pdfBuffer);
  } catch (error) {
    console.error("Error exporting post-inspection PDF:", error);
    res.status(500).json({
      error: "Failed to generate post-inspection PDF",
      message: error.message,
    });
  }
};

module.exports = {
  exportPreInspectionPdf,
  exportPostInspectionPdf,
};
