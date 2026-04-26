import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Alert } from "react-native";

const EXCLUDED_EXPORT_KEYS = new Set([
  "_id",
  "__v",
  "id",
  "createdAt",
  "updatedAt",
]);

const formatLabel = (key) =>
  String(key)
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const formatValue = (value) => {
  if (value === null || value === undefined || value === "") {
    return "N/A";
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (value instanceof Date) {
    return value.toLocaleString();
  }

  return String(value);
};

const flattenRecord = (value, prefix = "") => {
  if (value === null || value === undefined) {
    return prefix ? [{ label: prefix, value: "N/A" }] : [];
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return prefix ? [{ label: prefix, value: "N/A" }] : [];
    }

    return value.flatMap((item, index) =>
      flattenRecord(item, prefix ? `${prefix} ${index + 1}` : `Item ${index + 1}`),
    );
  }

  if (typeof value === "object" && !(value instanceof Date)) {
    const entries = Object.entries(value).filter(
      ([key]) => !EXCLUDED_EXPORT_KEYS.has(key),
    );

    if (entries.length === 0) {
      return prefix ? [{ label: prefix, value: "N/A" }] : [];
    }

    return entries.flatMap(([key, nestedValue]) => {
      const nextPrefix = prefix
        ? `${prefix} - ${formatLabel(key)}`
        : formatLabel(key);
      return flattenRecord(nestedValue, nextPrefix);
    });
  }

  return prefix ? [{ label: prefix, value: formatValue(value) }] : [];
};

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const buildHtml = ({ title, subtitle, rows }) => `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8" />
      <style>
        body {
          font-family: Arial, sans-serif;
          padding: 24px;
          color: #1f1f1f;
        }
        h1 {
          margin: 0 0 8px;
          color: #048a25;
          font-size: 24px;
        }
        p {
          margin: 0 0 18px;
          color: #666;
          font-size: 12px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
        }
        th, td {
          border: 1px solid #d9d9d9;
          padding: 8px;
          text-align: left;
          vertical-align: top;
          word-wrap: break-word;
          font-size: 11px;
        }
        th {
          background: #048a25;
          color: #fff;
        }
        th:first-child, td:first-child {
          width: 36%;
        }
      </style>
    </head>
    <body>
      <h1>${escapeHtml(title)}</h1>
      ${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ""}
      <table>
        <thead>
          <tr>
            <th>Field</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          ${rows
            .map(
              ({ label, value }) => `
                <tr>
                  <td>${escapeHtml(label)}</td>
                  <td>${escapeHtml(value)}</td>
                </tr>
              `,
            )
            .join("")}
        </tbody>
      </table>
    </body>
  </html>
`;

const exportRecordToPdf = async ({ title, subtitle, record }) => {
  try {
    const rows = flattenRecord(record);

    if (rows.length === 0) {
      throw new Error("No exportable data found");
    }

    const { uri } = await Print.printToFileAsync({
      html: buildHtml({ title, subtitle, rows }),
      base64: false,
    });

    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) {
      Alert.alert("Export ready", `PDF saved to:\n${uri}`);
      return;
    }

    await Sharing.shareAsync(uri, {
      mimeType: "application/pdf",
      dialogTitle: title,
      UTI: "com.adobe.pdf",
    });
  } catch (error) {
    console.error(`Failed to export ${title}:`, error);
    Alert.alert("Export failed", error.message || "Unable to generate PDF");
  }
};

export const exportPreInspectionPdf = (inspection) =>
  exportRecordToPdf({
    title: "Pre-Inspection",
    subtitle: `RP/C: ${inspection?.rpc || "N/A"} | Date: ${inspection?.date || "N/A"}`,
    record: inspection,
  });

export const exportPostInspectionPdf = (inspection) =>
  exportRecordToPdf({
    title: "Post-Inspection",
    subtitle: `RP/C: ${inspection?.rpc || "N/A"} | Date: ${inspection?.date || "N/A"}`,
    record: inspection,
  });

export const exportFlightLogPdf = (log) =>
  exportRecordToPdf({
    title: "Flight Log",
    subtitle: `RP/C: ${log?.rpc || "N/A"} | Date: ${log?.date || "N/A"}`,
    record: log,
  });
