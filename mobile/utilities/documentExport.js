import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE } from "./API_BASE";
import { saveExportFile } from "./saveExportFile";
import { showToast } from "./toast";
const sanitizeFileName = (value) =>
  String(value || "N-A")
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-");

const formatToday = () =>
  new Date().toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });

const downloadInspectionDocument = async (
  inspectionId,
  documentType,
  fileName,
) => {
  try {
    if (!inspectionId) {
      throw new Error("Inspection ID is required");
    }

    const token = await AsyncStorage.getItem("currentUserToken");

    const apiUrl = `${API_BASE}/api/inspections/${documentType}/${inspectionId}/export-pdf`;

    const safeFileName = sanitizeFileName(fileName);

    showToast("Generating PDF...");

    // Fetch file
    const response = await fetch(apiUrl, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (!response.ok) {
      throw new Error("Failed to download document from server");
    }

    return await saveExportFile({
      fileName: safeFileName,
      mimeType: "application/pdf",
      bytes: await response.arrayBuffer(),
    });
  } catch (error) {
    console.error("Download error:", error);

    showToast(
      error.message || "Unable to generate document. Please try again later.",
    );

    throw error;
  }
};

const downloadPartsLifespanExcel = async (aircraft) => {
  try {
    if (!aircraft) {
      throw new Error("Select an aircraft before exporting.");
    }

    const token = await AsyncStorage.getItem("currentUserToken");
    const safeAircraft = sanitizeFileName(aircraft);
    const safeFileName = `${safeAircraft}-Parts-Lifespan-Monitoring.xlsx`;

    showToast("Generating Excel file...");

    const response = await fetch(
      `${API_BASE}/api/parts-monitoring/${encodeURIComponent(aircraft)}/export-excel`,
      {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      },
    );

    if (!response.ok) {
      let message = "Failed to download parts lifespan workbook";
      try {
        const errorBody = await response.json();
        message = errorBody?.message || message;
      } catch {
        // The endpoint may return a non-JSON proxy or server error.
      }
      throw new Error(message);
    }

    return await saveExportFile({
      fileName: safeFileName,
      mimeType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      bytes: await response.arrayBuffer(),
    });
  } catch (error) {
    console.error("Parts lifespan Excel export error:", error);
    showToast(error.message || "Unable to export parts lifespan workbook.");
    throw error;
  }
};

export const exportPreInspectionTemplatePdf = (inspection) => {
  if (!inspection?._id) {
    showToast("Invalid inspection data.");
    return;
  }

  const fileName = sanitizeFileName(
    `Pre-Inspection-${inspection.rpc || "N-A"}-${inspection.date || formatToday()}.pdf`,
  );

  return downloadInspectionDocument(inspection._id, "pre", fileName);
};

export const exportPostInspectionTemplatePdf = (inspection) => {
  if (!inspection?._id) {
    showToast("Invalid inspection data.");
    return;
  }

  const fileName = sanitizeFileName(
    `Post-Inspection-${inspection.rpc || "N-A"}-${inspection.date || formatToday()}.pdf`,
  );

  return downloadInspectionDocument(inspection._id, "post", fileName);
};

export const exportPartsLifespanMonitoringExcel = (aircraft) =>
  downloadPartsLifespanExcel(aircraft);

export default {
  exportPreInspectionTemplatePdf,
  exportPostInspectionTemplatePdf,
  exportPartsLifespanMonitoringExcel,
  downloadInspectionDocument,
  downloadPartsLifespanExcel,
};
