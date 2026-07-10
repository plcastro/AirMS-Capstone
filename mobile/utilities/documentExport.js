import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert } from "react-native";
import { API_BASE } from "./API_BASE";

const sanitizeFileName = (value) =>
  String(value || "N-A")
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-");

const arrayBufferToBase64 = (buffer) => {
  let binary = "";
  const bytes = new Uint8Array(buffer);

  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }

  return global.btoa(binary);
};

const downloadInspectionDocument = async (
  inspectionId,
  documentType,
  fileName,
  format = "document",
) => {
  try {
    if (!inspectionId) {
      throw new Error("Inspection ID is required");
    }

    const token = await AsyncStorage.getItem("currentUserToken");

    const exportPath = format === "pdf" ? "export-pdf" : "export-document";

    const apiUrl = `${API_BASE}/api/inspections/${documentType}/${inspectionId}/${exportPath}`;

    const safeFileName = sanitizeFileName(fileName);

    const fileUri = FileSystem.documentDirectory + safeFileName;

    Alert.alert(
      "Exporting",
      `Generating ${format === "pdf" ? "PDF" : "document"}...`,
    );

    // Fetch file
    const response = await fetch(apiUrl, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (!response.ok) {
      throw new Error("Failed to download document from server");
    }

    // Convert to base64
    const arrayBuffer = await response.arrayBuffer();
    const base64Data = arrayBufferToBase64(arrayBuffer);

    // Write file
    await FileSystem.writeAsStringAsync(fileUri, base64Data, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Share if available
    const canShare = await Sharing.isAvailableAsync();

    if (!canShare) {
      Alert.alert("Export Ready", `Saved to:\n${fileUri}`);
      return fileUri;
    }

    await Sharing.shareAsync(fileUri, {
      mimeType:
        format === "pdf"
          ? "application/pdf"
          : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      dialogTitle: fileName,
    });

    return fileUri;
  } catch (error) {
    console.error("Download error:", error);

    Alert.alert(
      "Export Failed",
      error.message || "Unable to generate document",
    );

    throw error;
  }
};

export const exportPreInspectionToWord = (inspection) => {
  if (!inspection?._id) {
    Alert.alert("Error", "Invalid inspection data");
    return;
  }

  const fileName = sanitizeFileName(
    `Pre-Inspection-${inspection.rpc || "N-A"}-${inspection.date || new Date().toLocaleDateString()}.docx`,
  );

  return downloadInspectionDocument(inspection._id, "pre", fileName);
};

export const exportPreInspectionTemplatePdf = (inspection) => {
  if (!inspection?._id) {
    Alert.alert("Error", "Invalid inspection data");
    return;
  }

  const fileName = sanitizeFileName(
    `Pre-Inspection-${inspection.rpc || "N-A"}-${inspection.date || new Date().toLocaleDateString()}.pdf`,
  );

  return downloadInspectionDocument(inspection._id, "pre", fileName, "pdf");
};

export const exportPostInspectionToWord = (inspection) => {
  if (!inspection?._id) {
    Alert.alert("Error", "Invalid inspection data");
    return;
  }

  const fileName = sanitizeFileName(
    `Post-Inspection-${inspection.rpc || "N-A"}-${inspection.date || new Date().toLocaleDateString()}.docx`,
  );

  return downloadInspectionDocument(inspection._id, "post", fileName);
};

export const exportPostInspectionTemplatePdf = (inspection) => {
  if (!inspection?._id) {
    Alert.alert("Error", "Invalid inspection data");
    return;
  }

  const fileName = sanitizeFileName(
    `Post-Inspection-${inspection.rpc || "N-A"}-${inspection.date || new Date().toLocaleDateString()}.pdf`,
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
