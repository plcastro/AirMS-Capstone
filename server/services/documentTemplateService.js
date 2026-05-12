const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const PizZip = require("pizzip");
const Docxtemplater = require("docxtemplater");

const TEMPLATES_DIR = path.join(__dirname, "../templates");
const EXPORT_TMP_DIR = path.join(__dirname, "../tmp/inspection-exports");
const DOCX_TO_PDF_SCRIPT = path.join(__dirname, "../scripts/convertDocxToPdf.vbs");

/**
 * Load a document template
 * @param {string} templateName - Name of the template file (e.g., 'pre-inspection.docx')
 * @returns {Object} - PizZip object containing the template
 */
const loadTemplate = (templateName) => {
  const templatePath = path.join(TEMPLATES_DIR, templateName);

  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template not found: ${templateName}`);
  }

  const content = fs.readFileSync(templatePath, "binary");
  return new PizZip(content);
};

/**
 * Format inspection data for template population
 * @param {Object} inspection - Inspection object from database
 * @returns {Object} - Formatted data object
 */
const formatInspectionData = (inspection) => ({
  rpc: inspection.rpc || inspection.RP_C || inspection.aircraftNo || "N/A",
  date: inspection.date || inspection.inspectionDate || new Date().toLocaleDateString(),
  aircraftType: inspection.aircraftType || "N/A",
  fob: inspection.fob !== undefined ? `${inspection.fob}%` : "N/A",
  engineer: inspection.engineer || inspection.createdBy || "N/A",
  remarks: inspection.remarks || inspection.notes || "",
  status: inspection.status || "Pending",
  inspectionItems: formatInspectionItems(inspection),
  createdAt: new Date(inspection.createdAt).toLocaleDateString(),
  createdBy: inspection.createdBy || "N/A",
});

const isMetadataField = (key) =>
  [
    "_id",
    "__v",
    "createdAt",
    "updatedAt",
    "preInspectionId",
    "linkedFromPreFlight",
    "aircraftType",
    "rpc",
    "date",
    "dateAdded",
    "createdBy",
    "status",
    "notes",
    "fob",
    "releasedBy",
    "acceptedBy",
  ].includes(key);

const formatFieldLabel = (key) =>
  String(key)
    .replace(/_/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Za-z])(\d)/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

/**
 * Format inspection items for iteration in template
 * @param {Object} inspection - Inspection object
 * @returns {Array} - Array of formatted items
 */
const formatInspectionItems = (inspection) => {
  const items = [];

  if (inspection.preInspectionItems) {
    Object.entries(inspection.preInspectionItems).forEach(([key, value]) => {
      items.push({
        item: key,
        status: value?.status || "N/A",
        notes: value?.notes || "",
        initial: value?.initial || "",
      });
    });
  }

  // Handle post-inspection items
  if (inspection.postInspectionItems) {
    Object.entries(inspection.postInspectionItems).forEach(([key, value]) => {
      items.push({
        item: key,
        status: value?.status || "N/A",
        notes: value?.notes || "",
        initial: value?.initial || "",
      });
    });
  }

  Object.entries(inspection).forEach(([key, value]) => {
    if (typeof value !== "boolean" || isMetadataField(key)) {
      return;
    }

    items.push({
      item: formatFieldLabel(key),
      status: value ? "Checked" : "",
      notes: "",
      initial: "",
    });
  });

  return items.length > 0 ? items : [{ item: "No items recorded", status: "", notes: "", initial: "" }];
};

/**
 * Generate document from template with inspection data
 * @param {string} templateName - Name of the template file
 * @param {Object} inspection - Inspection data to populate
 * @returns {Buffer} - Generated document as buffer
 */
const generateDocument = (templateName, inspection) => {
  try {
    const zip = loadTemplate(templateName);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });

    const data = formatInspectionData(inspection);
    doc.render(data);

    return doc.getZip().generate({ type: "nodebuffer" });
  } catch (error) {
    console.error(`Error generating document from template ${templateName}:`, error);
    throw new Error(`Failed to generate document: ${error.message}`);
  }
};

/**
 * Get pre-inspection document
 * @param {Object} inspection - Pre-inspection data
 * @returns {Buffer} - Generated document buffer
 */
const getPreInspectionDocument = (inspection) => {
  return generateDocument("pre-inspection.docx", inspection);
};

/**
 * Get post-inspection document
 * @param {Object} inspection - Post-inspection data
 * @returns {Buffer} - Generated document buffer
 */
const getPostInspectionDocument = (inspection) => {
  return generateDocument("post-inspection.docx", inspection);
};

const convertDocxBufferToPdf = (documentBuffer, filePrefix) => {
  fs.mkdirSync(EXPORT_TMP_DIR, { recursive: true });

  const workDir = fs.mkdtempSync(path.join(EXPORT_TMP_DIR, `${filePrefix}-`));
  const docxPath = path.join(workDir, `${filePrefix}.docx`);
  const pdfPath = path.join(workDir, `${filePrefix}.pdf`);

  try {
    fs.writeFileSync(docxPath, documentBuffer);
    execFileSync("cscript.exe", ["//NoLogo", DOCX_TO_PDF_SCRIPT, docxPath, pdfPath], {
      windowsHide: true,
      stdio: "pipe",
    });

    return fs.readFileSync(pdfPath);
  } finally {
    fs.rmSync(workDir, { recursive: true, force: true });
  }
};

const getPreInspectionPdf = (inspection) =>
  convertDocxBufferToPdf(getPreInspectionDocument(inspection), "pre-inspection");

const getPostInspectionPdf = (inspection) =>
  convertDocxBufferToPdf(getPostInspectionDocument(inspection), "post-inspection");

module.exports = {
  loadTemplate,
  generateDocument,
  formatInspectionData,
  formatInspectionItems,
  getPreInspectionDocument,
  getPostInspectionDocument,
  getPreInspectionPdf,
  getPostInspectionPdf,
};
