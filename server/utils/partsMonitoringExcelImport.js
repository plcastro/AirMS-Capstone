const path = require("path");

const getExcelJS = () => {
  try {
    return require("exceljs");
  } catch (error) {
    try {
      return require(path.join(
        __dirname,
        "..",
        "..",
        "client-web",
        "node_modules",
        "exceljs",
      ));
    } catch (fallbackError) {
      throw new Error(
        "ExcelJS is required for aircraft workbook imports. Install exceljs in the server package.",
      );
    }
  }
};

const legacyFieldMap = [
  "componentName",
  "hourLimit1",
  "hourLimit2",
  "hourLimit3",
  "dayLimit",
  "dayType",
  "dateCW",
  "hoursCW",
  "daysRemaining",
  "timeRemaining",
  "dateDue",
  "ttCycleDue",
  "due",
  "hd",
  "timeSinceInstall",
  "totalTimeSinceNew",
];

const exportedFieldMap = legacyFieldMap.filter((field) => field !== "hourLimit3");

const headerPattern =
  /^(AIRFRAME COMPONENT|POWERPLANT COMPONENT|ENGINE COMPONENT|EQUIPMENTS\/ACCESSORIES|EQUIPMENT\/ACCESSORIES|MAIN ROTOR|TAIL ROTOR|FIRE PROTECTION|ELECTRICAL|FLOATS|HYDRAULIC|FUEL SYSTEM|TRANSMISSION|CARGO SLING|FENESTRON|FLIGHT CONTROL|LANDING GEAR|INTERIOR|EXTERIOR|OPTIONAL EQUIPMENT)/i;

const formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const normalizeValue = (value) => {
  if (value === null || value === undefined) {
    return "";
  }

  if (value instanceof Date) {
    return formatDate(value);
  }

  if (typeof value === "object") {
    if (value.result !== undefined && value.result !== null) {
      return normalizeValue(value.result);
    }
    if (value.text !== undefined && value.text !== null) {
      return normalizeValue(value.text);
    }
    if (Array.isArray(value.richText)) {
      return value.richText.map((item) => item.text || "").join("").trim();
    }
    return "";
  }

  const text = String(value).trim();
  const isoDateMatch = text.match(/^"?(?<date>\d{4}-\d{2}-\d{2})T/);
  if (isoDateMatch?.groups?.date) {
    return isoDateMatch.groups.date;
  }

  return text.replace(/^"|"$/g, "");
};

const readCell = (worksheet, rowNumber, columnNumber) =>
  normalizeValue(worksheet.getCell(rowNumber, columnNumber).value);

const readFormula = (worksheet, rowNumber, columnNumber) => {
  const cell = worksheet.getCell(rowNumber, columnNumber);
  return cell.formula || "";
};

const toNumber = (value) => {
  if (value === "" || value === null || value === undefined) {
    return 0;
  }
  const parsed = Number(String(value).replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeCreepDamage = (value) => {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  const parsed = Number(String(value).replace("%", "").trim());
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
    return "";
  }

  return Number.isInteger(parsed) ? String(parsed) : String(Math.round(parsed * 100) / 100);
};

const parseAircraftType = (value) => {
  const text = normalizeValue(value);
  const typeMatch = text.match(/ACFT\.\s*TYPE:\s*([^S]+?)(?:\s+SN:|$)/i);
  return typeMatch
    ? typeMatch[1].trim()
    : text.replace(/^ACFT\.\s*TYPE:\s*/i, "").trim();
};

const parseSerialNumber = (value) => {
  const text = normalizeValue(value);
  const serialMatch = text.match(/\bSN:\s*([A-Z0-9-]+)/i);
  return serialMatch ? serialMatch[1].trim() : "";
};

const parseDateManufactured = (worksheet) => {
  const explicitValue = readCell(worksheet, 1, 8);
  if (explicitValue) {
    return explicitValue;
  }

  const labelValue = readCell(worksheet, 1, 7);
  const embeddedDate = labelValue.match(/Date Manufactured:\s*(.+)$/i)?.[1]?.trim();
  if (!embeddedDate) {
    return "";
  }

  const parsed = new Date(embeddedDate);
  return Number.isNaN(parsed.getTime()) ? embeddedDate : formatDate(parsed);
};

const parseCreepDamage = (worksheet) => {
  for (let rowNumber = 1; rowNumber <= 4; rowNumber += 1) {
    for (let columnNumber = 1; columnNumber <= 16; columnNumber += 1) {
      const candidate = readCell(worksheet, rowNumber, columnNumber);
      if (!candidate) {
        continue;
      }

      const embedded = String(candidate).match(/CREEP DAMAGE:?\s*([0-9.]+%?)/i)?.[1];
      if (embedded) {
        return normalizeCreepDamage(embedded);
      }
    }
  }

  const labeledCells = [
    { label: readCell(worksheet, 3, 13), value: readCell(worksheet, 3, 14) },
    { label: readCell(worksheet, 2, 13), value: readCell(worksheet, 2, 14) },
    { label: readCell(worksheet, 2, 14), value: readCell(worksheet, 2, 15) },
    { label: readCell(worksheet, 2, 15), value: readCell(worksheet, 2, 16) },
  ];

  for (const { label, value } of labeledCells) {
    if (/CREEP DAMAGE/i.test(String(label || ""))) {
      return normalizeCreepDamage(value);
    }
  }

  return "";
};

const extractReferenceCells = (worksheet) => {
  const cells = {};
  for (let rowNumber = 1; rowNumber <= 3; rowNumber += 1) {
    for (let columnNumber = 1; columnNumber <= 16; columnNumber += 1) {
      const value = readCell(worksheet, rowNumber, columnNumber);
      if (value !== "") {
        const columnLetter = worksheet.getColumn(columnNumber).letter;
        cells[`${columnLetter}${rowNumber}`] = value;
      }
    }
  }
  return cells;
};

const isHeaderRow = (cells) => {
  const componentName = cells[0] || "";
  const hasBodyValues = cells.slice(1).some(Boolean);
  return !hasBodyValues || headerPattern.test(componentName);
};

const resolveFieldMap = (worksheet) => {
  const fourthColumnHeader = [
    readCell(worksheet, 4, 4),
    readCell(worksheet, 5, 4),
  ]
    .join(" ")
    .toUpperCase();

  return fourthColumnHeader.includes("DAY LIMIT")
    ? exportedFieldMap
    : legacyFieldMap;
};

const extractRows = (worksheet) => {
  const rows = [];
  const fieldMap = resolveFieldMap(worksheet);
  const columnOffset = fieldMap.includes("hourLimit3") ? 0 : -1;
  const formulaColumns = {
    daysRemaining: 9 + columnOffset,
    timeRemaining: 10 + columnOffset,
    dateDue: 11 + columnOffset,
    ttCycleDue: 12 + columnOffset,
    due: 13 + columnOffset,
    hd: 14 + columnOffset,
  };

  for (let rowNumber = 6; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const cells = fieldMap.map((_, columnIndex) =>
      readCell(worksheet, rowNumber, columnIndex + 1),
    );

    if (!cells.some(Boolean) || !cells[0]) {
      continue;
    }

    const formulas = Object.entries(formulaColumns).reduce(
      (accumulator, [field, columnNumber]) => {
        const formula = readFormula(worksheet, rowNumber, columnNumber);
        if (formula) {
          accumulator[field] = formula;
        }
        return accumulator;
      },
      {},
    );

    const row = fieldMap.reduce(
      (accumulator, field, index) => ({
        ...accumulator,
        [field]: cells[index],
      }),
      {
        _id: String(rowNumber),
        rowType: isHeaderRow(cells) ? "header" : "part",
      },
    );

    if (Object.keys(formulas).length > 0) {
      row.formulas = formulas;
    }

    rows.push(row);
  }

  return rows;
};

const readWorkbookData = async ({ buffer, filePath, aircraft, sheetName }) => {
  const ExcelJS = getExcelJS();
  const workbook = new ExcelJS.Workbook();
  if (buffer) {
    await workbook.xlsx.load(buffer);
  } else {
    await workbook.xlsx.readFile(filePath);
  }

  const worksheet =
    (sheetName && workbook.getWorksheet(sheetName)) ||
    workbook.getWorksheet("STATUS") ||
    workbook.worksheets.find((sheet) => sheet.rowCount > 0);

  if (!worksheet) {
    throw new Error("No usable worksheet found in uploaded workbook");
  }

  const aircraftName = normalizeValue(aircraft || readCell(worksheet, 1, 3));
  if (!aircraftName) {
    throw new Error("Aircraft name is required in cell C1");
  }

  const aircraftTypeCell = readCell(worksheet, 3, 3);
  const referenceData = {
    today: readCell(worksheet, 1, 12) || formatDate(new Date()),
    acftTT: toNumber(readCell(worksheet, 3, 12)),
    engTT: toNumber(readCell(worksheet, 2, 12)),
    n1Cycles: toNumber(readCell(worksheet, 3, 8)),
    n2Cycles: toNumber(readCell(worksheet, 3, 10)),
    landings: toNumber(readCell(worksheet, 1, 10)),
    referenceCells: extractReferenceCells(worksheet),
  };

  const parts = extractRows(worksheet);
  if (!parts.length) {
    throw new Error("No parts rows found. The importer expects rows to start at row 6.");
  }

  return {
    aircraft: aircraftName,
    dateManufactured: parseDateManufactured(worksheet) || null,
    aircraftType: parseAircraftType(aircraftTypeCell) || "AS350B3",
    serialNumber: parseSerialNumber(aircraftTypeCell),
    creepDamage: parseCreepDamage(worksheet),
    referenceData,
    parts,
    sourceWorksheet: worksheet.name,
  };
};

module.exports = {
  readWorkbookData,
};
