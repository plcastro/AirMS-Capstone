import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert } from "react-native";
import { API_BASE } from "./API_BASE";

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
) => {
  try {
    if (!inspectionId) {
      throw new Error("Inspection ID is required");
    }

    const token = await AsyncStorage.getItem("currentUserToken");

    const apiUrl = `${API_BASE}/api/inspections/${documentType}/${inspectionId}/export-pdf`;

    const safeFileName = sanitizeFileName(fileName);

    const fileUri = FileSystem.documentDirectory + safeFileName;

    Alert.alert(
      "Exporting",
      "Generating PDF...",
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
      mimeType: "application/pdf",
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

export const exportPreInspectionTemplatePdf = (inspection) => {
  if (!inspection?._id) {
    Alert.alert("Error", "Invalid inspection data");
    return;
  }

  const fileName = sanitizeFileName(
    `Pre-Inspection-${inspection.rpc || "N-A"}-${inspection.date || formatToday()}.pdf`,
  );

  return downloadInspectionDocument(inspection._id, "pre", fileName);
};

export const exportPostInspectionTemplatePdf = (inspection) => {
  if (!inspection?._id) {
    Alert.alert("Error", "Invalid inspection data");
    return;
  }

  const fileName = sanitizeFileName(
    `Post-Inspection-${inspection.rpc || "N-A"}-${inspection.date || formatToday()}.pdf`,
  );

  return downloadInspectionDocument(inspection._id, "post", fileName);
};

export default {
  exportPreInspectionTemplatePdf,
  exportPostInspectionTemplatePdf,
  downloadInspectionDocument,
};
