import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert } from "react-native";
import { API_BASE } from "./API_BASE";

/**
 * Download and share inspection document from template
 * @param {string} inspectionId - ID of the inspection
 * @param {string} documentType - "pre" or "post"
 * @param {string} fileName - Name for the downloaded file
 * @param {string} format - "document" or "pdf"
 */
const downloadInspectionDocument = async (
  inspectionId,
  documentType,
  fileName,
  format = "document"
) => {
  try {
    if (!inspectionId) {
      throw new Error("Inspection ID is required");
    }

    const token = await AsyncStorage.getItem("currentUserToken");
    const exportPath = format === "pdf" ? "export-pdf" : "export-document";
    const apiUrl = `${API_BASE}/api/inspections/${documentType}/${inspectionId}/${exportPath}`;

    // Create a file path for storage
    const fileUri = `${FileSystem.documentDirectory}${fileName}`;

    // Show loading indicator
    Alert.alert("Exporting", `Generating ${format === "pdf" ? "PDF" : "document"}...`);

    // Download the file
    const downloadResult = await FileSystem.downloadAsync(apiUrl, fileUri, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (downloadResult.status !== 200) {
      throw new Error("Failed to download document from server");
    }

    // Check if sharing is available
    const canShare = await Sharing.isAvailableAsync();

    if (!canShare) {
      Alert.alert("Export Ready", `Document saved to:\n${fileUri}`);
      return fileUri;
    }

    // Share the document
    await Sharing.shareAsync(fileUri, getSharingOptions(fileName, format));

    return fileUri;
  } catch (error) {
    console.error("Error downloading inspection document:", error);
    Alert.alert(
      "Export Failed",
      error.message || "Unable to generate and download document"
    );
    throw error;
  }
};

const getSharingOptions = (fileName, format) =>
  format === "pdf"
    ? {
        mimeType: "application/pdf",
        dialogTitle: fileName,
        UTI: "com.adobe.pdf",
      }
    : {
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        dialogTitle: fileName,
        UTI: "com.microsoft.word.doc",
      };

const sanitizeFileName = (value) =>
  String(value || "N-A")
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-");

/**
 * Export pre-inspection to Word document using template
 * @param {Object} inspection - Pre-inspection object with _id property
 */
export const exportPreInspectionToWord = (inspection) => {
  if (!inspection || !inspection._id) {
    Alert.alert("Error", "Invalid inspection data");
    return;
  }

  const fileName = sanitizeFileName(
    `Pre-Inspection-${inspection.rpc || "N/A"}-${inspection.date || new Date().toLocaleDateString()}.docx`
  );

  return downloadInspectionDocument(inspection._id, "pre", fileName);
};

export const exportPreInspectionTemplatePdf = (inspection) => {
  if (!inspection || !inspection._id) {
    Alert.alert("Error", "Invalid inspection data");
    return;
  }

  const fileName = sanitizeFileName(
    `Pre-Inspection-${inspection.rpc || "N/A"}-${inspection.date || new Date().toLocaleDateString()}.pdf`
  );

  return downloadInspectionDocument(inspection._id, "pre", fileName, "pdf");
};

/**
 * Export post-inspection to Word document using template
 * @param {Object} inspection - Post-inspection object with _id property
 */
export const exportPostInspectionToWord = (inspection) => {
  if (!inspection || !inspection._id) {
    Alert.alert("Error", "Invalid inspection data");
    return;
  }

  const fileName = sanitizeFileName(
    `Post-Inspection-${inspection.rpc || "N/A"}-${inspection.date || new Date().toLocaleDateString()}.docx`
  );

  return downloadInspectionDocument(inspection._id, "post", fileName);
};

export const exportPostInspectionTemplatePdf = (inspection) => {
  if (!inspection || !inspection._id) {
    Alert.alert("Error", "Invalid inspection data");
    return;
  }

  const fileName = sanitizeFileName(
    `Post-Inspection-${inspection.rpc || "N/A"}-${inspection.date || new Date().toLocaleDateString()}.pdf`
  );

  return downloadInspectionDocument(inspection._id, "post", fileName, "pdf");
};

export default {
  exportPreInspectionToWord,
  exportPostInspectionToWord,
  exportPreInspectionTemplatePdf,
  exportPostInspectionTemplatePdf,
  downloadInspectionDocument,
};
