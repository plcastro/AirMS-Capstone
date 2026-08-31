import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import { Image } from "react-native";
import { requestStoragePermissionForDownload } from "./storagePermission";
import { API_BASE } from "./API_BASE";
import { getAuthHeaders } from "./mobileApi";

const NGCP_LOGO_ASSET = require("../assets/ngcp-logo.png");
let cachedNgcpLogoDataUri = "";

const arrayBufferToBase64 = (buffer) => {
  let binary = "";
  const bytes = new Uint8Array(buffer);

  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }

  return global.btoa(binary);
};

const getNgcpLogoDataUri = async () => {
  if (cachedNgcpLogoDataUri) return cachedNgcpLogoDataUri;

  try {
    const uri = Image.resolveAssetSource(NGCP_LOGO_ASSET)?.uri;
    if (!uri) return "";

    if (/^data:image\//i.test(uri)) {
      cachedNgcpLogoDataUri = uri;
      return cachedNgcpLogoDataUri;
    }

    if (/^https?:\/\//i.test(uri)) {
      const response = await fetch(uri);
      const base64 = arrayBufferToBase64(await response.arrayBuffer());
      cachedNgcpLogoDataUri = `data:image/png;base64,${base64}`;
      return cachedNgcpLogoDataUri;
    }

    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    cachedNgcpLogoDataUri = `data:image/png;base64,${base64}`;
    return cachedNgcpLogoDataUri;
  } catch {
    return "";
  }
};

const safe = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;");

const asDate = () =>
  new Date().toLocaleString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
const buildModuleName = (value) =>
  String(value || "Reports and Analytics")
    .trim()
    .replace(/\bReport\b/gi, "")
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/[^A-Za-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join("");

const formatFileDate = (value = new Date()) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return formatFileDate();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const buildReportFileName = (title, extension) =>
  `${buildModuleName(title)}_${formatFileDate()}.${extension}`;

const resolveExportFileName = (fileName, title, extension) => {
  const fallback = buildReportFileName(title, extension);
  const sanitized = String(fileName || fallback)
    .replace(/[\x00-\x1f\\/:*?"<>|]+/g, "-")
    .replace(/\.{2,}/g, ".")
    .trim();
  const resolved = sanitized || fallback;
  return resolved.toLowerCase().endsWith(`.${extension}`)
    ? resolved
    : `${resolved}.${extension}`;
};

const normalizeSection = (section = {}) => {
  const rows = Array.isArray(section.rows) ? section.rows : [];
  const columns =
    Array.isArray(section.columns) && section.columns.length
      ? section.columns
      : ["Metric", "Value"];

  return {
    title: section.title || "Report",
    columns,
    rows: rows.map((row) => {
      if (Array.isArray(row)) return row;
      if (row && typeof row === "object") {
        if ("label" in row || "value" in row) {
          return [row.label ?? "", row.value ?? ""];
        }

        return columns.map((column) => row[column] ?? row[String(column).toLowerCase()] ?? "");
      }

      return [row ?? ""];
    }),
  };
};

const normalizeSections = (sections = []) => sections.map(normalizeSection);

const normalizeChartColor = (value) =>
  /^#[0-9a-f]{6}$/i.test(String(value || "")) ? value : "#26866F";

const buildHtml = (
  title,
  sections,
  logoDataUri = "",
  summaryCards = [],
  barCharts = [],
) => `
<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
body { font-family: Arial, sans-serif; padding: 22px; color: #1f1f1f; }
.report-header { display: flex; align-items: center; gap: 14px; margin-bottom: 14px; }
.report-header img { width: 78px; height: auto; object-fit: contain; }
h1 { margin: 0 0 8px; color: #26866F; }
p { margin: 0 0 14px; color: #666; font-size: 12px; }
h2 { margin: 18px 0 6px; color: #244D3B; font-size: 15px; }
.summary-grid, .charts-grid { display: flex; flex-wrap: wrap; gap: 9px; margin: 10px 0 16px; }
.summary-card { width: 29%; min-height: 58px; border: 1px solid #dfe7e4; border-left-width: 6px; border-radius: 7px; padding: 9px; page-break-inside: avoid; }
.summary-label { color: #666; font-size: 10px; margin-bottom: 7px; }
.summary-value { font-size: 17px; font-weight: 700; }
.bar-chart { width: 46%; border: 1px solid #dfe7e4; border-radius: 7px; padding: 9px; page-break-inside: avoid; }
.bar-chart h3 { color: #244D3B; font-size: 12px; margin: 0 0 8px; }
.bar-row { display: flex; align-items: center; gap: 6px; margin: 5px 0; font-size: 9px; }
.bar-label { width: 34%; overflow-wrap: anywhere; }
.bar-track { flex: 1; height: 9px; background: #edf1f0; border-radius: 5px; overflow: hidden; }
.bar-fill { height: 9px; border-radius: 5px; }
.bar-value { width: 24px; text-align: right; font-weight: 700; }
.statistics { page-break-before: always; }
table { width: 100%; border-collapse: collapse; }
th, td { border: 1px solid #d9d9d9; padding: 6px; font-size: 11px; text-align: left; vertical-align: top; }
th { background: #26866F; color: #fff; }
</style>
</head>
<body>
<div class="report-header">
${logoDataUri ? `<img src="${logoDataUri}" alt="NGCP" />` : ""}
<div>
<h1>${safe(title)}</h1>
<p>Generated: ${safe(asDate())}</p>
</div>
</div>
${
  summaryCards.length
    ? `<h2>KPI Summary</h2><div class="summary-grid">${summaryCards
        .map(
          (card) => `<div class="summary-card" style="border-left-color:${normalizeChartColor(card.color)}"><div class="summary-label">${safe(card.label)}</div><div class="summary-value">${safe(card.value)}</div></div>`,
        )
        .join("")}</div>`
    : ""
}
${
  barCharts.length
    ? `<h2>Charts</h2><div class="charts-grid">${barCharts
        .map((chart) => {
          const rows = Array.isArray(chart.rows) ? chart.rows.slice(0, 8) : [];
          const maximum = Math.max(
            ...rows.map((row) => Number(row?.value) || 0),
            1,
          );
          const color = normalizeChartColor(chart.color);
          return `<div class="bar-chart"><h3>${safe(chart.title)}</h3>${
            rows.length
              ? rows
                  .map((row) => {
                    const value = Number(row?.value) || 0;
                    const width = Math.max(0, Math.min(100, (value / maximum) * 100));
                    return `<div class="bar-row"><div class="bar-label">${safe(row?.label)}</div><div class="bar-track"><div class="bar-fill" style="width:${width}%;background:${color}"></div></div><div class="bar-value">${safe(value)}</div></div>`;
                  })
                  .join("")
              : "<div class=\"bar-row\">No data</div>"
          }</div>`;
        })
        .join("")}</div>`
    : ""
}
<div class="${summaryCards.length || barCharts.length ? "statistics" : ""}">
${sections
  .map(
    (section) => `
      <h2>${safe(section.title)}</h2>
      <table>
        <thead><tr>${section.columns.map((column) => `<th>${safe(column)}</th>`).join("")}</tr></thead>
        <tbody>
          ${section.rows.length
            ? section.rows
                .map(
                  (row) => `<tr>${row.map((cell) => `<td>${safe(cell)}</td>`).join("")}</tr>`,
                )
                .join("")
            : `<tr><td colspan="${section.columns.length}">No data</td></tr>`}
        </tbody>
      </table>
    `,
  )
  .join("")}
</div>
</body>
</html>
`;

const buildCsv = (sections) =>
  sections
    .map((section) => {
      const header = [`# ${section.title}`];
      const columns = [section.columns.join(",")];
      const rows = section.rows.map((row) =>
        row
          .map((cell) => {
            const value = String(cell ?? "").replace(/"/g, '""');
            return `"${value}"`;
          })
          .join(","),
      );
      return [...header, ...columns, ...rows, ""].join("\n");
    })
    .join("\n");

export const exportReportPdf = async ({
  title = "Analytics Report",
  sections = [],
  summaryCards = [],
  barCharts = [],
  fileName,
}) => {
  const canUseStorage = await requestStoragePermissionForDownload();
  if (!canUseStorage) {
    throw new Error("Storage permission is required to download files.");
  }

  const normalizedSections = normalizeSections(sections);
  const logoDataUri = await getNgcpLogoDataUri();
  const html = buildHtml(
    title,
    normalizedSections,
    logoDataUri,
    summaryCards,
    barCharts,
  );
  const { uri } = await Print.printToFileAsync({ html, base64: false });
  const finalUri = `${FileSystem.documentDirectory || FileSystem.cacheDirectory}${resolveExportFileName(fileName, title, "pdf")}`;
  await FileSystem.copyAsync({ from: uri, to: finalUri });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(finalUri, {
      mimeType: "application/pdf",
      dialogTitle: title,
      UTI: "com.adobe.pdf",
    });
  }

  return finalUri;
};

export const exportReportExcel = async ({
  title = "Analytics Report",
  sections = [],
  fileName,
}) => {
  const canUseStorage = await requestStoragePermissionForDownload();
  if (!canUseStorage) {
    throw new Error("Storage permission is required to download files.");
  }

  const normalizedSections = normalizeSections(sections);
  const response = await fetch(`${API_BASE}/api/reports/export-excel`, {
    method: "POST",
    headers: await getAuthHeaders(),
    body: JSON.stringify({ title, sections: normalizedSections }),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload?.message || "Failed to generate Excel report.");
  }

  const finalUri = `${FileSystem.documentDirectory || FileSystem.cacheDirectory}${resolveExportFileName(fileName, title, "xlsx")}`;
  const base64 = arrayBufferToBase64(await response.arrayBuffer());
  await FileSystem.writeAsStringAsync(finalUri, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(finalUri, {
      mimeType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      dialogTitle: title,
      UTI: "org.openxmlformats.spreadsheetml.sheet",
    });
  }
  return finalUri;
};

export const exportReportCsv = async ({ title = "analytics-report", sections = [] }) => {
  const canUseStorage = await requestStoragePermissionForDownload();
  if (!canUseStorage) {
    throw new Error("Storage permission is required to download files.");
  }

  const normalizedSections = normalizeSections(sections);
  const csv = buildCsv(normalizedSections);
  const fileName = buildReportFileName(title, "csv");
  const uri = `${FileSystem.cacheDirectory}${fileName}`;

  await FileSystem.writeAsStringAsync(uri, csv, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: "text/csv",
      dialogTitle: title,
      UTI: "public.comma-separated-values-text",
    });
  }

  return uri;
};
