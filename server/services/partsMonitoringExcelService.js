const ExcelJS = require("exceljs");

const PART_COLUMNS = [
  { header: "Component", key: "componentName", width: 34 },
  { header: "Hour Limit", key: "hourLimit1", width: 14 },
  { header: "H/C/OC", key: "hourLimit2", width: 14 },
  { header: "Day Limit", key: "dayLimit", width: 14 },
  { header: "D/OC", key: "dayType", width: 12 },
  { header: "Date C/W", key: "dateCW", width: 15 },
  { header: "HRS C/W", key: "hoursCW", width: 14 },
  { header: "Days Remaining", key: "daysRemaining", width: 17 },
  { header: "Time/Cyc Remaining", key: "timeRemaining", width: 20 },
  { header: "Date Due", key: "dateDue", width: 15 },
  { header: "TT/Cyc Due", key: "ttCycleDue", width: 16 },
  { header: "Due", key: "due", width: 12 },
  { header: "H/D", key: "hd", width: 12 },
  { header: "Time Since Install", key: "timeSinceInstall", width: 19 },
  { header: "Total Time Since New", key: "totalTimeSinceNew", width: 22 },
];

const cleanValue = (value) =>
  value === null || value === undefined ? "" : value;

const formatDate = (value) => {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return `${String(date.getMonth() + 1).padStart(2, "0")}/${String(
    date.getDate(),
  ).padStart(2, "0")}/${date.getFullYear()}`;
};

const applyBorder = (cell) => {
  cell.border = {
    top: { style: "thin", color: { argb: "FF9AA3AD" } },
    left: { style: "thin", color: { argb: "FF9AA3AD" } },
    bottom: { style: "thin", color: { argb: "FF9AA3AD" } },
    right: { style: "thin", color: { argb: "FF9AA3AD" } },
  };
};

const buildPartsMonitoringWorkbook = (record = {}) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "AirMS";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("Parts Lifespan", {
    views: [{ state: "frozen", ySplit: 11 }],
    pageSetup: {
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      paperSize: 9,
    },
  });
  worksheet.columns = PART_COLUMNS.map(({ key, width }) => ({ key, width }));

  const lastColumn = PART_COLUMNS.length;
  worksheet.mergeCells(1, 1, 1, lastColumn);
  const titleCell = worksheet.getCell(1, 1);
  titleCell.value = `${record.aircraft || "Aircraft"} Parts Lifespan Monitoring`;
  titleCell.font = { bold: true, size: 16, color: { argb: "FFFFFFFF" } };
  titleCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1B5E20" },
  };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  worksheet.getRow(1).height = 28;

  const aircraftDetails = [
    ["Aircraft", record.aircraft],
    ["Aircraft Type", record.aircraftType],
    ["Serial Number", record.serialNumber],
    ["Date Manufactured", formatDate(record.dateManufactured)],
    [
      "Creep Damage",
      record.creepDamage === null ||
      record.creepDamage === undefined ||
      record.creepDamage === ""
        ? ""
        : `${record.creepDamage}%`,
    ],
  ];
  aircraftDetails.forEach(([label, value], index) => {
    const row = 3 + index;
    worksheet.getCell(row, 1).value = label;
    worksheet.getCell(row, 1).font = { bold: true };
    worksheet.getCell(row, 2).value = cleanValue(value);
  });

  const referenceData = record.referenceData || {};
  const references = [
    ["Engine Cycle", referenceData.engTT],
    ["Date", formatDate(referenceData.today)],
    ["N1", referenceData.n1Cycles],
    ["N2", referenceData.n2Cycles],
    ["Acft. TT", referenceData.acftTT],
    ["Landings", referenceData.landings],
  ];
  worksheet.getCell(3, 5).value = "Reference Values";
  worksheet.getCell(3, 5).font = {
    bold: true,
    color: { argb: "FF1B5E20" },
  };
  references.forEach(([label, value], index) => {
    const row = 4 + index;
    worksheet.getCell(row, 5).value = label;
    worksheet.getCell(row, 5).font = { bold: true };
    worksheet.getCell(row, 6).value = cleanValue(value);
  });

  const headerRowNumber = 11;
  const headerRow = worksheet.getRow(headerRowNumber);
  PART_COLUMNS.forEach(({ header }, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.value = header;
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF2E7D32" },
    };
    cell.alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true,
    };
    applyBorder(cell);
  });
  headerRow.height = 34;

  const parts = Array.isArray(record.parts) ? record.parts : [];
  parts.forEach((part, index) => {
    const row = worksheet.getRow(headerRowNumber + index + 1);
    PART_COLUMNS.forEach(({ key }, columnIndex) => {
      const cell = row.getCell(columnIndex + 1);
      cell.value = cleanValue(part?.[key]);
      cell.alignment = { vertical: "middle", wrapText: true };
      applyBorder(cell);
      if (part?.rowType === "header") {
        cell.font = { bold: true };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFD9EAD3" },
        };
      } else if (index % 2 === 1) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF5F7F8" },
        };
      }
    });
  });

  worksheet.autoFilter = {
    from: { row: headerRowNumber, column: 1 },
    to: { row: headerRowNumber, column: lastColumn },
  };
  worksheet.headerFooter.oddFooter = "AirMS Parts Lifespan Monitoring";

  return workbook;
};

module.exports = { buildPartsMonitoringWorkbook };
