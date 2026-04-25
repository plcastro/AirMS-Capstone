import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable"; // registers autoTable globally
import html2canvas from "html2canvas";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import {
  mhistorydata,
  summarydata,
  componentData,
  PACChartMock,
} from "./MockData";
import { message } from "antd";

const EXCLUDED_EXPORT_KEYS = new Set([
  "_id",
  "__v",
  "id",
  "createdAt",
  "updatedAt",
]);

const formatExportLabel = (key) =>
  String(key)
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const formatExportValue = (value) => {
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
        ? `${prefix} - ${formatExportLabel(key)}`
        : formatExportLabel(key);
      return flattenRecord(nestedValue, nextPrefix);
    });
  }

  return prefix ? [{ label: prefix, value: formatExportValue(value) }] : [];
};

const buildSafeFileName = (value, fallback) =>
  String(value || fallback)
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-");

export const exportToPDF = async () => {
  try {
    const doc = new jsPDF("p", "pt", "a4");

    doc.setFontSize(18);
    doc.text("Maintenance Dashboard", 40, 40);

    const summaryColumns = [
      { header: "Aircraft", dataKey: "aircraft" },
      { header: "Date", dataKey: "date" },
      { header: "Task", dataKey: "task" },
      { header: "Assigned Mechanic", dataKey: "assignedMechanic" },
      { header: "Status", dataKey: "status" },
    ];

    autoTable(doc, {
      head: [summaryColumns.map((c) => c.header)],
      body: summarydata.map((r) => summaryColumns.map((c) => r[c.dataKey])),
      startY: 60,
      theme: "grid",
    });

    const chartElement = document.querySelector("#performanceChart");
    if (chartElement) {
      const canvas = await html2canvas(chartElement, { scale: 2 });
      const imgData = canvas.toDataURL("image/png");

      const yPosition = doc.lastAutoTable.finalY + 20;
      const pageWidth = doc.internal.pageSize.getWidth();
      const chartWidth = pageWidth - 80;
      const chartHeight = (canvas.height / canvas.width) * chartWidth;

      doc.addImage(imgData, "PNG", 40, yPosition, chartWidth, chartHeight);
    }

    const historyColumns = summaryColumns;
    autoTable(doc, {
      head: [historyColumns.map((c) => c.header)],
      body: mhistorydata.map((r) => historyColumns.map((c) => r[c.dataKey])),
      startY: doc.lastAutoTable.finalY + 20,
      theme: "grid",
    });

    const componentColumns = [
      { header: "Component", dataKey: "component" },
      { header: "Usage Count", dataKey: "count" },
    ];

    autoTable(doc, {
      head: [componentColumns.map((c) => c.header)],
      body: componentData.map((r) => componentColumns.map((c) => r[c.dataKey])),
      startY: doc.lastAutoTable.finalY + 20,
      theme: "grid",
    });

    doc.save("MaintenanceDashboard.pdf");
    message.success("PDF exported successfully!");
  } catch (err) {
    console.error(err);
    message.error("PDF export failed: " + err.message);
  }
};

export const exportRecordToPDF = async ({
  title,
  fileName,
  record,
  subtitle,
}) => {
  try {
    const rows = flattenRecord(record);

    if (rows.length === 0) {
      throw new Error("No exportable data found");
    }

    const doc = new jsPDF("p", "pt", "a4");
    doc.setFontSize(18);
    doc.text(title || "Export", 40, 40);

    if (subtitle) {
      doc.setFontSize(11);
      doc.setTextColor(90);
      doc.text(subtitle, 40, 60);
      doc.setTextColor(0);
    }

    autoTable(doc, {
      head: [["Field", "Value"]],
      body: rows.map(({ label, value }) => [label, value]),
      startY: subtitle ? 78 : 60,
      theme: "grid",
      styles: {
        fontSize: 9,
        cellPadding: 6,
        overflow: "linebreak",
        valign: "top",
      },
      columnStyles: {
        0: { cellWidth: 190, fontStyle: "bold" },
        1: { cellWidth: 325 },
      },
      headStyles: {
        fillColor: [4, 138, 37],
      },
    });

    doc.save(buildSafeFileName(fileName, title || "export") + ".pdf");
    message.success("PDF exported successfully!");
  } catch (err) {
    console.error(err);
    message.error("PDF export failed: " + err.message);
  }
};

export const exportToExcel = async () => {
  try {
    const workbook = new ExcelJS.Workbook();

    // Helper function to add a sheet and data quickly
    const addSheet = (name, data) => {
      const sheet = workbook.addWorksheet(name);
      if (data && data.length > 0) {
        // Define columns based on keys of the first object
        sheet.columns = Object.keys(data[0]).map((key) => ({
          header: key.charAt(0).toUpperCase() + key.slice(1),
          key: key,
          width: 20,
        }));
        // Add the rows
        sheet.addRows(data);

        // Optional: Make header row bold
        sheet.getRow(1).font = { bold: true };
      }
    };

    // Add your 4 sheets
    addSheet("Performance", PACChartMock);
    addSheet("Summary", summarydata);
    addSheet("History", mhistorydata);
    addSheet("Components", componentData);

    // Generate the buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // Save the file
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    saveAs(blob, "MaintenanceDashboard.xlsx");

    message.success("Excel exported successfully!");
  } catch (err) {
    console.error("Excel export failed:", err);
    message.error("Excel export failed: " + err.message);
  }
};
