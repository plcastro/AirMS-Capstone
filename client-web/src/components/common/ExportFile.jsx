import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable"; // registers autoTable globally
import html2canvas from "html2canvas";
import ExcelJS from "exceljs";
import JSZip from "jszip";
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

const FLIGHT_LEG_LABELS = ["1ST", "2ND", "3RD", "4TH", "5TH", "6TH"];
const PASSENGER_LEG_LABELS = [
  "1ST LEG",
  "2ND LEG",
  "3RD LEG",
  "4TH LEG",
  "5TH LEG",
  "6TH LEG",
  "7TH LEG",
  "8TH LEG",
];
const COMPONENT_TIME_FIELDS = [
  ["A/FRAME", "airframe"],
  ["GEAR BOX MAIN", "gearBoxMain"],
  ["GEAR BOX TAIL", "gearBoxTail"],
  ["ROTOR MAIN", "rotorMain"],
  ["ROTOR TAIL", "rotorTail"],
  ["ENGINE", "engine"],
  ["CYCLE N1", "cycleN1"],
  ["CYCLE N2", "cycleN2"],
  ["USAGE", "usage"],
  ["L'DING CYCLE", "landingCycle"],
];
const FLIGHT_LOG_WORD_TEMPLATE_PATH = "/templates/AIRCRAFT-FLIGHT-LOG.docx";
const NGCP_LOGO_PATH = "/images/ngcp-logo.png";

const flightValue = (value, fallback = "") =>
  value === null || value === undefined || value === "" ? fallback : String(value);

const formatFlightLogDate = (value) => {
  if (!value) return "";

  const raw = String(value).trim();
  if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(raw)) return raw;

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;

  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
};

const getStationText = (leg = {}) => {
  if (!Array.isArray(leg.stations) || leg.stations.length === 0) {
    return "";
  }

  return leg.stations
    .map((station) =>
      [station?.from, station?.to].filter(Boolean).join(" - "),
    )
    .filter(Boolean)
    .join(" / ");
};

const getComponentSection = (record = {}, sectionKey) =>
  record?.componentData?.[sectionKey] || {};

const fitRows = (items = [], count, emptyFactory) =>
  Array.from({ length: count }, (_, index) => items[index] || emptyFactory(index));

const escapeWordXml = (value) =>
  flightValue(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const buildWordParagraph = (value) => {
  const text = escapeWordXml(value);
  return `<w:p><w:pPr><w:jc w:val="center"/><w:rPr><w:sz w:val="18"/><w:szCs w:val="18"/><w:lang w:val="en-US"/></w:rPr></w:pPr><w:r><w:rPr><w:sz w:val="18"/><w:szCs w:val="18"/><w:lang w:val="en-US"/></w:rPr><w:t xml:space="preserve">${text}</w:t></w:r></w:p>`;
};

const replaceWordCellText = (cellXml, value) => {
  const openingTag = cellXml.match(/^<w:tc\b[^>]*>/)?.[0] || "<w:tc>";
  const properties = cellXml.match(/<w:tcPr>[\s\S]*?<\/w:tcPr>/)?.[0] || "";
  return `${openingTag}${properties}${buildWordParagraph(value)}</w:tc>`;
};

const replaceWordTableRowCells = (rowXml, values = [], startCell = 0) => {
  const cells = Array.from(rowXml.matchAll(/<w:tc\b[\s\S]*?<\/w:tc>/g)).map(
    (match) => match[0],
  );

  values.forEach((value, index) => {
    const cellIndex = startCell + index;
    if (cells[cellIndex]) {
      cells[cellIndex] = replaceWordCellText(cells[cellIndex], value);
    }
  });

  const openingTag = rowXml.match(/^<w:tr\b[^>]*>/)?.[0] || "<w:tr>";
  return `${openingTag}${cells.join("")}</w:tr>`;
};

const replaceWordTableCells = (documentXml, tableIndex, rowIndex, values, startCell = 0) => {
  const tables = Array.from(documentXml.matchAll(/<w:tbl>[\s\S]*?<\/w:tbl>/g));
  const tableMatch = tables[tableIndex];
  if (!tableMatch) return documentXml;

  const tableXml = tableMatch[0];
  const rows = Array.from(tableXml.matchAll(/<w:tr\b[\s\S]*?<\/w:tr>/g));
  const rowMatch = rows[rowIndex];
  if (!rowMatch) return documentXml;

  const updatedRow = replaceWordTableRowCells(rowMatch[0], values, startCell);
  const updatedTable = tableXml.replace(rowMatch[0], updatedRow);
  return documentXml.replace(tableXml, updatedTable);
};

const replaceWordText = (documentXml, pattern, value) =>
  documentXml.replace(pattern, (match) =>
    match.replace(/_+/, escapeWordXml(value)),
  );

const loadImageDataUrl = (src) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext("2d");
      context.drawImage(image, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    image.onerror = () => reject(new Error(`Unable to load image: ${src}`));
    image.src = src;
  });

export const exportFlightLogToWordTemplate = async (record = {}) => {
  try {
    const response = await fetch(FLIGHT_LOG_WORD_TEMPLATE_PATH);
    if (!response.ok) {
      throw new Error("Flight log Word template could not be loaded");
    }

    const templateBuffer = await response.arrayBuffer();
    const zip = await JSZip.loadAsync(templateBuffer);
    const documentFile = zip.file("word/document.xml");
    if (!documentFile) {
      throw new Error("Word template is missing word/document.xml");
    }

    let documentXml = await documentFile.async("string");

    documentXml = replaceWordText(
      documentXml,
      /Aircraft Type:\s*_+/,
      record.aircraftType || "",
    );
    documentXml = replaceWordText(
      documentXml,
      /Date:\s*_+/,
      formatFlightLogDate(record.date),
    );
    documentXml = replaceWordText(documentXml, /RP-C:\s*_+/, record.rpc || "");
    documentXml = replaceWordText(
      documentXml,
      /Control No\.:\s*_+/,
      record.controlNo || "",
    );
    documentXml = documentXml.replace(
      /Released By:/,
      `Released By: ${escapeWordXml(record.releasedBy?.name || "")}`,
    );
    documentXml = documentXml.replace(
      /Accepted By:/,
      `Accepted By: ${escapeWordXml(record.acceptedBy?.name || "")}`,
    );

    fitRows(record.legs || [], 6, () => ({})).forEach((leg, index) => {
      documentXml = replaceWordTableCells(
        documentXml,
        0,
        index + 2,
        [
          getStationText(leg),
          flightValue(leg.blockTimeOn),
          flightValue(leg.blockTimeOff),
          flightValue(leg.flightTimeOn),
          flightValue(leg.flightTimeOff),
          flightValue(leg.totalTimeOn),
          flightValue(leg.totalTimeOff),
        ],
        1,
      );
    });

    documentXml = replaceWordTableCells(
      documentXml,
      1,
      1,
      [
        formatFlightLogDate(record.date),
        ...PASSENGER_LEG_LABELS.map((_, index) =>
          flightValue(record.legs?.[index]?.passengers),
        ),
      ],
      0,
    );

    [
      getComponentSection(record, "broughtForwardData"),
      getComponentSection(record, "thisFlightData"),
      getComponentSection(record, "toDateData"),
    ].forEach((section, index) => {
      documentXml = replaceWordTableCells(
        documentXml,
        2,
        index + 2,
        COMPONENT_TIME_FIELDS.map(([, key]) => flightValue(section[key])),
        1,
      );
    });

    const broughtForward = getComponentSection(record, "broughtForwardData");
    const thisFlight = getComponentSection(record, "thisFlightData");
    documentXml = replaceWordTableCells(
      documentXml,
      2,
      5,
      [
        `AIRFRAME NEXT INSP. DUE AT: ${flightValue(thisFlight.airframeNextInsp || broughtForward.airframeNextInsp)}`,
        `ENGINE NEXT INSP. DUE AT: ${flightValue(thisFlight.engineNextInsp || broughtForward.engineNextInsp)}`,
      ],
      0,
    );

    fitRows(record.fuelServicing || [], 4, () => ({})).forEach((fuel, index) => {
      documentXml = replaceWordTableCells(
        documentXml,
        3,
        index + 2,
        [
          FLIGHT_LEG_LABELS[index],
          formatFlightLogDate(fuel.date),
          flightValue(fuel.contCheck),
          flightValue(fuel.mainRemG),
          flightValue(fuel.mainAdd),
          flightValue(fuel.mainTotal),
          fuel.fuelType === "drum" ? "/" : "",
          fuel.fuelType === "truck" || fuel.fuelType === "bowser" ? "/" : "",
          flightValue(fuel.refuelerName),
        ],
        0,
      );
    });

    fitRows(record.oilServicing || [], 4, () => ({})).forEach((oil, index) => {
      documentXml = replaceWordTableCells(
        documentXml,
        4,
        index + 2,
        [
          FLIGHT_LEG_LABELS[index],
          formatFlightLogDate(oil.date),
          flightValue(oil.engineRem),
          flightValue(oil.engineAdd),
          flightValue(oil.engineTot),
          flightValue(oil.mrGboxRem),
          flightValue(oil.mrGboxAdd),
          flightValue(oil.mrGboxTot),
          flightValue(oil.trGboxRem),
          flightValue(oil.trGboxAdd),
          flightValue(oil.trGboxTot),
          flightValue(oil.remarks),
          oil.signature ? "Signed" : "",
        ],
        0,
      );
    });

    documentXml = replaceWordTableCells(
      documentXml,
      5,
      1,
      [flightValue(record.remarks), flightValue(record.sling)],
      0,
    );

    zip.file("word/document.xml", documentXml);

    const outputBlob = await zip.generateAsync({
      type: "blob",
      mimeType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });

    saveAs(
      outputBlob,
      `${buildSafeFileName(`FlightLog-${record?.rpc || record?._id || "record"}`, "FlightLog")}.docx`,
    );
    message.success("Flight log Word export generated successfully!");
  } catch (err) {
    console.error(err);
    message.error("Flight log Word export failed: " + err.message);
  }
};

const drawFlightHeader = (doc, record, logoDataUrl = null) => {
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.setTextColor(30);
  doc.text("AIRCRAFT FLIGHT LOG - RW", pageWidth / 2, 42, {
    align: "center",
  });
  doc.setFontSize(14);
  doc.text("ROTARY WINGED AIRCRAFT", pageWidth / 2, 62, { align: "center" });
  doc.text("SINGLE ENGINE", pageWidth / 2, 82, { align: "center" });

  if (logoDataUrl) {
    doc.addImage(logoDataUrl, "PNG", 30, 38, 96, 41);
  } else {
    doc.setFontSize(22);
    doc.setTextColor(4, 100, 64);
    doc.text("NGCP", 32, 72);
  }
  doc.setTextColor(0);

  doc.setFontSize(10);
  doc.text("AIRCRAFT TYPE:", 32, 102);
  doc.setFont("helvetica", "normal");
  doc.text(flightValue(record.aircraftType), 122, 102);
  doc.line(120, 106, 225, 106);

  doc.setFont("helvetica", "bold");
  doc.text("RP-C:", 32, 120);
  doc.setFont("helvetica", "normal");
  doc.text(flightValue(record.rpc), 122, 120);
  doc.line(70, 124, 225, 124);

  doc.setFont("helvetica", "bold");
  doc.text("DATE:", 410, 102);
  doc.setFont("helvetica", "normal");
  doc.text(formatFlightLogDate(record.date), 460, 102);
  doc.line(455, 106, 565, 106);

  doc.setFont("helvetica", "bold");
  doc.text("CONTROL NO.:", 410, 120);
  doc.setFont("helvetica", "normal");
  doc.text(flightValue(record.controlNo), 492, 120);
  doc.line(490, 124, 565, 124);
};

const flightTableTheme = {
  theme: "grid",
  styles: {
    fontSize: 6.5,
    cellPadding: 2,
    lineColor: [45, 45, 45],
    lineWidth: 0.4,
    textColor: [20, 20, 20],
    minCellHeight: 12,
    valign: "middle",
    overflow: "linebreak",
  },
  headStyles: {
    fillColor: [235, 235, 235],
    textColor: [20, 20, 20],
    fontStyle: "bold",
    halign: "center",
  },
  bodyStyles: {
    fillColor: [255, 255, 255],
  },
  margin: { left: 24, right: 24 },
};

export const exportFlightLogToPDF = async (record = {}) => {
  try {
    const doc = new jsPDF("p", "pt", "a4");
    const fileName = buildSafeFileName(
      `FlightLog-${record?.rpc || record?._id || "record"}`,
      "FlightLog",
    );

    let logoDataUrl = null;
    try {
      logoDataUrl = await loadImageDataUrl(NGCP_LOGO_PATH);
    } catch (imageError) {
      console.warn(imageError);
    }

    drawFlightHeader(doc, record, logoDataUrl);

    const legs = fitRows(record.legs || [], 6, () => ({}));

    autoTable(doc, {
      ...flightTableTheme,
      startY: 138,
      head: [
        [
          { content: "LEG", rowSpan: 2 },
          { content: "STATION", rowSpan: 2 },
          { content: "BLOCK TIME", colSpan: 2 },
          { content: "FLIGHT TIME", colSpan: 2 },
          { content: "TOTAL TIME", colSpan: 2 },
        ],
        ["ON", "OFF", "ON", "OFF", "BLOCK", "FLIGHT"],
      ],
      body: legs.map((leg, index) => [
        FLIGHT_LEG_LABELS[index],
        getStationText(leg),
        flightValue(leg.blockTimeOn),
        flightValue(leg.blockTimeOff),
        flightValue(leg.flightTimeOn),
        flightValue(leg.flightTimeOff),
        flightValue(leg.totalTimeOn),
        flightValue(leg.totalTimeOff),
      ]),
      columnStyles: {
        0: { cellWidth: 42, halign: "center", fontStyle: "bold" },
        1: { cellWidth: 242 },
        2: { cellWidth: 38, halign: "center" },
        3: { cellWidth: 38, halign: "center" },
        4: { cellWidth: 38, halign: "center" },
        5: { cellWidth: 38, halign: "center" },
        6: { cellWidth: 55, halign: "center" },
        7: { cellWidth: 55, halign: "center" },
      },
    });

    autoTable(doc, {
      ...flightTableTheme,
      startY: doc.lastAutoTable.finalY + 8,
      head: [[{ content: "PASSENGERS", colSpan: 9 }], ["DATE", ...PASSENGER_LEG_LABELS]],
      body: Array.from({ length: 4 }, (_, rowIndex) => [
        rowIndex === 0 ? formatFlightLogDate(record.date) : "",
        ...PASSENGER_LEG_LABELS.map((_, legIndex) =>
          flightValue(record.legs?.[legIndex]?.passengers),
        ),
      ]),
      columnStyles: {
        0: { cellWidth: 48, halign: "center" },
      },
    });

    const componentSections = [
      ["BRT FRW", getComponentSection(record, "broughtForwardData")],
      ["THIS FLT", getComponentSection(record, "thisFlightData")],
      ["TO DATE", getComponentSection(record, "toDateData")],
    ];

    autoTable(doc, {
      ...flightTableTheme,
      startY: doc.lastAutoTable.finalY + 8,
      head: [
        [
          "",
          "A/FRAME",
          { content: "GEAR BOX", colSpan: 2 },
          { content: "ROTOR", colSpan: 2 },
          "ENGINE",
          { content: "CYCLE", colSpan: 2 },
          "USAGE",
          "L'DING CYCLE",
        ],
        ["", "", "MAIN", "TAIL", "MAIN", "TAIL", "", "N1", "N2", "", ""],
      ],
      body: componentSections.map(([label, section]) => [
        label,
        ...COMPONENT_TIME_FIELDS.map(([, key]) => flightValue(section[key])),
      ]),
      columnStyles: {
        0: { cellWidth: 42, fontStyle: "bold" },
      },
    });

    const bf = getComponentSection(record, "broughtForwardData");
    const tf = getComponentSection(record, "thisFlightData");
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text(
      `AIRFRAME NEXT INSP. DUE AT: ${flightValue(tf.airframeNextInsp || bf.airframeNextInsp)}`,
      24,
      doc.lastAutoTable.finalY + 12,
    );
    doc.text(
      `ENGINE NEXT INSP. DUE AT: ${flightValue(tf.engineNextInsp || bf.engineNextInsp)}`,
      315,
      doc.lastAutoTable.finalY + 12,
    );

    const fuelRows = fitRows(record.fuelServicing || [], 4, () => ({}));
    autoTable(doc, {
      ...flightTableTheme,
      startY: doc.lastAutoTable.finalY + 18,
      head: [
        [{ content: "FUEL SERVICING", colSpan: 9 }],
        [
          "LEG",
          "DATE",
          "CONT CHECK",
          { content: "MAIN", colSpan: 3 },
          { content: "FUEL", colSpan: 2 },
          "REFUELLER NAME/SIGN",
        ],
        ["", "", "", "REM/G", "ADD", "TOTAL", "DRUM", "TRUCK", ""],
      ],
      body: fuelRows.map((fuel, index) => [
        FLIGHT_LEG_LABELS[index],
        formatFlightLogDate(fuel.date),
        flightValue(fuel.contCheck),
        flightValue(fuel.mainRemG),
        flightValue(fuel.mainAdd),
        flightValue(fuel.mainTotal),
        fuel.fuelType === "drum" ? "/" : "",
        fuel.fuelType === "truck" || fuel.fuelType === "bowser" ? "/" : "",
        flightValue(fuel.refuelerName),
      ]),
      columnStyles: {
        0: { cellWidth: 42, fontStyle: "bold" },
        8: { cellWidth: 92 },
      },
    });

    const oilRows = fitRows(record.oilServicing || [], 4, () => ({}));
    autoTable(doc, {
      ...flightTableTheme,
      startY: doc.lastAutoTable.finalY + 8,
      head: [
        [{ content: "OIL SERVICING", colSpan: 13 }],
        [
          "LEG",
          "DATE",
          { content: "ENGINE", colSpan: 3 },
          { content: "M/R G/BOX", colSpan: 3 },
          { content: "T/R G/BOX", colSpan: 3 },
          "REMARKS",
          "SIGN",
        ],
        [
          "",
          "",
          "REM",
          "ADD",
          "TOT",
          "REM",
          "ADD",
          "TOT",
          "REM",
          "ADD",
          "TOT",
          "",
          "",
        ],
      ],
      body: oilRows.map((oil, index) => [
        FLIGHT_LEG_LABELS[index],
        formatFlightLogDate(oil.date),
        flightValue(oil.engineRem),
        flightValue(oil.engineAdd),
        flightValue(oil.engineTot),
        flightValue(oil.mrGboxRem),
        flightValue(oil.mrGboxAdd),
        flightValue(oil.mrGboxTot),
        flightValue(oil.trGboxRem),
        flightValue(oil.trGboxAdd),
        flightValue(oil.trGboxTot),
        flightValue(oil.remarks),
        oil.signature ? "Signed" : "",
      ]),
      columnStyles: {
        0: { cellWidth: 34, fontStyle: "bold" },
        11: { cellWidth: 88 },
        12: { cellWidth: 44 },
      },
    });

    autoTable(doc, {
      ...flightTableTheme,
      startY: doc.lastAutoTable.finalY + 8,
      body: [
        [
          {
            content: `RELEASED BY:\n${flightValue(record.releasedBy?.name)}\nENGINEER / CERTIFICATE`,
          },
          {
            content: `ACCEPTED BY:\n${flightValue(record.acceptedBy?.name)}\nPILOT-IN-COMMAND / CERTIFICATE`,
          },
        ],
      ],
      styles: {
        ...flightTableTheme.styles,
        minCellHeight: 34,
        halign: "center",
      },
      columnStyles: {
        0: { cellWidth: 273 },
        1: { cellWidth: 273 },
      },
    });

    autoTable(doc, {
      ...flightTableTheme,
      startY: doc.lastAutoTable.finalY + 8,
      head: [["DISCREPANCY / REMARKS", "SLING"]],
      body: [
        [flightValue(record.remarks), flightValue(record.sling)],
        ["", ""],
        ["", ""],
      ],
      columnStyles: {
        0: { cellWidth: 430 },
        1: { cellWidth: 116 },
      },
    });

    const workRows = fitRows(record.workItems || [], 5, () => ({}));
    autoTable(doc, {
      ...flightTableTheme,
      startY: doc.lastAutoTable.finalY + 8,
      head: [
        [
          {
            content:
              "[ ] DISCREPANCY CORRECTION    [ ] SB/AD COMPLIANCE    [ ] INSPECTION    [ ] OTHERS",
            colSpan: 5,
          },
        ],
        ["DATE", "ACFT / T /", "WORK DONE", "NAME / SIGN", "CERT. NO."],
      ],
      body: workRows.map((item) => [
        formatFlightLogDate(item.date),
        flightValue(item.aircraft || record.rpc),
        flightValue(item.workDone || item.description),
        flightValue(item.name || item.performedBy),
        flightValue(item.certificateNumber),
      ]),
      columnStyles: {
        0: { cellWidth: 60 },
        1: { cellWidth: 80 },
        2: { cellWidth: 250 },
        3: { cellWidth: 88 },
        4: { cellWidth: 68 },
      },
    });

    doc.save(`${fileName}.pdf`);
    message.success("Flight log PDF exported successfully!");
  } catch (err) {
    console.error(err);
    message.error("Flight log PDF export failed: " + err.message);
  }
};

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
    addSheet("Maintenance History", mhistorydata);
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
