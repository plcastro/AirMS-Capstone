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

const formatLabel = (key) =>
  String(key)
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const formatValue = (value) => {
  if (value === null || value === undefined || value === "") return "N/A";
  if (typeof value === "boolean") return value ? "Checked" : "";
  if (Array.isArray(value)) return value.map(formatValue).join("; ");
  if (typeof value === "object") {
    return Object.entries(value)
      .filter(([key]) => !["_id", "__v", "id"].includes(key))
      .map(([key, nestedValue]) => `${formatLabel(key)}: ${formatValue(nestedValue)}`)
      .join("; ");
  }
  return String(value);
};

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const buildInspectionWorkbookHtml = (title, inspection = {}) => {
  const rows = [
    ["Field", "Value"],
    ["Export", title],
    ["RP/C", inspection.rpc || "N/A"],
    ["Aircraft Type", inspection.aircraftType || "N/A"],
    ["Date", inspection.date || "N/A"],
    ["Status", inspection.status || "N/A"],
    ["Released By", inspection.releasedBy?.name || "N/A"],
    ["Accepted By", inspection.acceptedBy?.name || "N/A"],
    ...Object.entries(inspection)
      .filter(
        ([key]) =>
          ![
            "_id",
            "__v",
            "id",
            "rpc",
            "aircraftType",
            "date",
            "status",
            "releasedBy",
            "acceptedBy",
            "createdAt",
            "updatedAt",
          ].includes(key),
      )
      .map(([key, value]) => [formatLabel(key), formatValue(value)]),
  ];

  return `
    <html>
      <head>
        <meta charset="utf-8" />
      </head>
      <body>
        <table>
          ${rows
            .map(
              (row, index) => `
                <tr>
                  <${index === 0 ? "th" : "td"}>${escapeHtml(row[0])}</${
                    index === 0 ? "th" : "td"
                  }>
                  <${index === 0 ? "th" : "td"}>${escapeHtml(row[1])}</${
                    index === 0 ? "th" : "td"
                  }>
                </tr>
              `,
            )
            .join("")}
        </table>
      </body>
    </html>
  `;
};

const exportInspectionCsv = async (inspection, title, filePrefix) => {
  if (!inspection?._id) {
    Alert.alert("Error", "Invalid inspection data");
    return;
  }

  try {
    const fileName = sanitizeFileName(
      `${filePrefix}-${inspection.rpc || "N-A"}-${
        inspection.date || new Date().toLocaleDateString()
      }.xls`,
    );
    const fileUri = FileSystem.documentDirectory + fileName;
    const workbookHtml = buildInspectionWorkbookHtml(title, inspection);

    await FileSystem.writeAsStringAsync(fileUri, workbookHtml, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) {
      Alert.alert("Export Ready", `Saved to:\n${fileUri}`);
      return fileUri;
    }

    await Sharing.shareAsync(fileUri, {
      mimeType: "application/vnd.ms-excel",
      dialogTitle: fileName,
      UTI: "com.microsoft.excel.xls",
    });

    return fileUri;
  } catch (error) {
    console.error("Excel export error:", error);
    Alert.alert("Export Failed", error.message || "Unable to generate Excel export");
    throw error;
  }
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

export const exportPreInspectionToExcel = (inspection) =>
  exportInspectionCsv(inspection, "Pre-Inspection", "Pre-Inspection");

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

export const exportPostInspectionToExcel = (inspection) =>
  exportInspectionCsv(inspection, "Post-Inspection", "Post-Inspection");

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
  exportPreInspectionToExcel,
  exportPostInspectionToExcel,
  exportPreInspectionTemplatePdf,
  exportPostInspectionTemplatePdf,
  downloadInspectionDocument,
};
