const ExcelJS = require("exceljs");

const MAX_SECTIONS = 30;
const MAX_COLUMNS = 50;
const MAX_ROWS_PER_SECTION = 5000;

const normalizeCell = (value) => {
  if (value === null || value === undefined) return "";
  if (["string", "number", "boolean"].includes(typeof value)) {
    return typeof value === "string" ? value.slice(0, 32767) : value;
  }
  return JSON.stringify(value).slice(0, 32767);
};

const normalizeSections = (sections) => {
  if (!Array.isArray(sections) || !sections.length) {
    throw new Error("At least one report section is required.");
  }
  if (sections.length > MAX_SECTIONS) {
    throw new Error(`A report can contain at most ${MAX_SECTIONS} sections.`);
  }
  return sections.map((section, index) => {
    const columns = Array.isArray(section?.columns)
      ? section.columns.slice(0, MAX_COLUMNS).map(normalizeCell)
      : [];
    if (!columns.length) throw new Error(`Section ${index + 1} must include columns.`);
    const rows = Array.isArray(section?.rows) ? section.rows : [];
    if (rows.length > MAX_ROWS_PER_SECTION) {
      throw new Error(`Section ${index + 1} can contain at most ${MAX_ROWS_PER_SECTION} rows.`);
    }
    return {
      title: String(section?.title || `Section ${index + 1}`),
      columns,
      rows: rows.map((row) =>
        columns.map((_, cellIndex) => normalizeCell(Array.isArray(row) ? row[cellIndex] : "")),
      ),
    };
  });
};

const uniqueSheetName = (title, used) => {
  const base = String(title || "Report").replace(/[\\/*?:[\]]+/g, " ").trim().slice(0, 31) || "Report";
  let name = base;
  let index = 2;
  while (used.has(name.toLowerCase())) {
    const suffix = ` (${index})`;
    name = `${base.slice(0, 31 - suffix.length)}${suffix}`;
    index += 1;
  }
  used.add(name.toLowerCase());
  return name;
};

const createReportExcelBuffer = async ({ title, sections }) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "AirMS";
  workbook.title = String(title || "Reports and Analytics");
  workbook.created = new Date();
  const usedNames = new Set();

  normalizeSections(sections).forEach((section) => {
    const sheet = workbook.addWorksheet(uniqueSheetName(section.title, usedNames), {
      views: [{ state: "frozen", ySplit: 1 }],
    });
    sheet.addRow(section.columns);
    sheet.addRows(section.rows);
    sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: section.columns.length } };
    section.columns.forEach((column, index) => {
      sheet.getColumn(index + 1).width = Math.min(45, Math.max(14, String(column).length + 4));
    });
    sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF26866F" } };
    sheet.eachRow((row) => row.eachCell({ includeEmpty: true }, (cell) => {
      cell.alignment = { vertical: "top", wrapText: true };
      cell.border = {
        top: { style: "thin" }, left: { style: "thin" },
        bottom: { style: "thin" }, right: { style: "thin" },
      };
    }));
  });
  return workbook.xlsx.writeBuffer();
};

module.exports = { createReportExcelBuffer, normalizeSections };
