require("dotenv").config({
  path: require("path").join(__dirname, "..", ".env"),
  quiet: true,
});

const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const PartsMonitoring = require("../models/partsMonitoringModel");
const connectToDatabase = require("../config/db");

let ExcelJS;
try {
  ExcelJS = require("exceljs");
} catch (error) {
  ExcelJS = require(path.join(__dirname, "..", "..", "client-web", "node_modules", "exceljs"));
}

const workbookConfig = [
  {
    aircraft: "RP-C7226",
    filePath: "C:/Users/Kiko/Downloads/Tracking AS350 B3 (RP-C7226).xlsx",
    sheetName: "STATUS",
    rawDataFile: "7226RawData.js",
  },
  {
    aircraft: "RP-C7247",
    filePath: "C:/Users/Kiko/Downloads/Tracking AS350 B3(RP-C7247).xlsx",
    sheetName: "STATUS",
    rawDataFile: "7247RawData.js",
  },
  {
    aircraft: "RP-C9511",
    filePath: "C:/Users/Kiko/Downloads/RP-C9511.xlsx",
    rawDataFile: "9511RawData.js",
  },
  {
    aircraft: "RP-C7057",
    filePath: "C:/Users/Kiko/Downloads/Tracking AS 350 B3 (RP-C7057 ).xlsx",
    sheetName: "STATUS",
    rawDataFile: "7057RawData.js",
  },
  {
    aircraft: "RP-C8912",
    filePath: "C:/Users/Kiko/Downloads/RP-C8912.xlsx",
    rawDataFile: "8912RawData.js",
  },
];

const clientUtilsDir = path.join(__dirname, "..", "..", "client-web", "src", "utils");

const fieldMap = [
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

const headerPattern =
  /^(AIRFRAME COMPONENT|POWERPLANT COMPONENT|ENGINE COMPONENT|EQUIPMENTS\/ACCESSORIES|EQUIPMENT\/ACCESSORIES|MAIN ROTOR|TAIL ROTOR|FIRE PROTECTION|ELECTRICAL|FLOATS|HYDRAULIC|FUEL SYSTEM|TRANSMISSION|CARGO SLING|FENESTRON|FLIGHT CONTROL|LANDING GEAR|INTERIOR|EXTERIOR|OPTIONAL EQUIPMENT)/i;

const readCell = (worksheet, rowNumber, columnNumber) =>
  normalizeValue(worksheet.getCell(rowNumber, columnNumber).value);

const readFormula = (worksheet, rowNumber, columnNumber) => {
  const cell = worksheet.getCell(rowNumber, columnNumber);
  return cell.formula || "";
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

const formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const toNumber = (value) => {
  if (value === "" || value === null || value === undefined) {
    return 0;
  }
  const parsed = Number(String(value).replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

const parseAircraftType = (value) => {
  const text = normalizeValue(value);
  const typeMatch = text.match(/ACFT\.\s*TYPE:\s*([^S]+?)(?:\s+SN:|$)/i);
  return typeMatch ? typeMatch[1].trim() : text.replace(/^ACFT\.\s*TYPE:\s*/i, "").trim();
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
  const candidates = [
    readCell(worksheet, 2, 14),
    readCell(worksheet, 2, 15),
    readCell(worksheet, 2, 16),
  ];

  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }

    const embedded = String(candidate).match(/CREEP DAMAGE:?\s*([0-9.]+%?)/i)?.[1];
    if (embedded) {
      return embedded.replace("%", "");
    }

    if (/^[0-9.]+$/.test(String(candidate))) {
      return String(candidate);
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

const extractRows = (worksheet) => {
  const rows = [];
  const formulaColumns = {
    daysRemaining: 9,
    timeRemaining: 10,
    dateDue: 11,
    ttCycleDue: 12,
    due: 13,
    hd: 14,
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

const readWorkbookData = async (config) => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(config.filePath);

  const worksheet =
    (config.sheetName && workbook.getWorksheet(config.sheetName)) ||
    workbook.worksheets.find((sheet) => sheet.rowCount > 0);

  if (!worksheet) {
    throw new Error(`No usable worksheet found in ${config.filePath}`);
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

  return {
    aircraft: config.aircraft,
    dateManufactured: parseDateManufactured(worksheet) || null,
    aircraftType: parseAircraftType(aircraftTypeCell) || "AS350B3",
    serialNumber: parseSerialNumber(aircraftTypeCell),
    creepDamage: parseCreepDamage(worksheet),
    referenceData,
    parts: extractRows(worksheet),
    sourceWorkbook: path.basename(config.filePath),
    sourceWorksheet: worksheet.name,
  };
};

const writeClientRawDataFile = (config, parts) => {
  const outputPath = path.join(clientUtilsDir, config.rawDataFile);
  const fileBody = `export const rawData = ${JSON.stringify(parts, null, 2)};\n`;
  fs.writeFileSync(outputPath, fileBody);
};

const upsertDatabaseRecord = async (record) => {
  await PartsMonitoring.findOneAndUpdate(
    { aircraft: record.aircraft },
    {
      ...record,
      lastUpdated: new Date(),
      updatedBy: "excel_import",
    },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  );
};

const main = async () => {
  const shouldWriteClient = process.argv.includes("--write-client");
  const shouldUpdateDb = process.argv.includes("--db");
  const records = [];

  for (const config of workbookConfig) {
    const record = await readWorkbookData(config);
    records.push(record);

    if (shouldWriteClient) {
      writeClientRawDataFile(config, record.parts);
    }

    console.log(
      `${record.aircraft}: ${record.parts.length} rows from ${record.sourceWorkbook} / ${record.sourceWorksheet}`,
    );
  }

  console.log(
    JSON.stringify(
      records.reduce((accumulator, record) => {
        accumulator[record.aircraft] = record.referenceData;
        return accumulator;
      }, {}),
      null,
      2,
    ),
  );

  if (shouldUpdateDb) {
    if (
      !process.env.ATLAS_URL &&
      !process.env.MONGODB_URI &&
      !process.env.MONGO_URI
    ) {
      throw new Error("Missing ATLAS_URL, MONGODB_URI, or MONGO_URI in server/.env");
    }

    if (!process.env.ATLAS_URL) {
      process.env.ATLAS_URL = process.env.MONGODB_URI || process.env.MONGO_URI;
    }

    await connectToDatabase();
    for (const record of records) {
      await upsertDatabaseRecord(record);
      console.log(`${record.aircraft}: database record updated`);
    }
  }
};

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });
