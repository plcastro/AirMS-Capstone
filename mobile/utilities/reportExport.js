import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";

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
const buildSafeFileName = (value) =>
  String(value || "reports-analytics")
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-");

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

const buildHtml = (title, sections) => `
<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
body { font-family: Arial, sans-serif; padding: 22px; color: #1f1f1f; }
h1 { margin: 0 0 8px; color: #26866F; }
p { margin: 0 0 14px; color: #666; font-size: 12px; }
h2 { margin: 18px 0 6px; color: #244D3B; font-size: 15px; }
table { width: 100%; border-collapse: collapse; }
th, td { border: 1px solid #d9d9d9; padding: 6px; font-size: 11px; text-align: left; vertical-align: top; }
th { background: #26866F; color: #fff; }
</style>
</head>
<body>
<h1>${safe(title)}</h1>
<p>Generated: ${safe(asDate())}</p>
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

export const exportReportPdf = async ({ title = "Analytics Report", sections = [] }) => {
  const normalizedSections = normalizeSections(sections);
  const html = buildHtml(title, normalizedSections);
  const { uri } = await Print.printToFileAsync({ html, base64: false });
  const finalUri = `${FileSystem.cacheDirectory}${buildSafeFileName(title)} Numbers.pdf`;
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

export const exportReportCsv = async ({ title = "analytics-report", sections = [] }) => {
  const normalizedSections = normalizeSections(sections);
  const csv = buildCsv(normalizedSections);
  const fileName = `${buildSafeFileName(title)} Numbers.csv`;
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
