import { message } from "antd";

const showExportPopup = (
  setPopup,
  { status, title, subTitle, fallbackMessage },
) => {
  if (typeof setPopup === "function") {
    setPopup({
      open: true,
      status,
      title,
      subTitle,
    });
    return;
  }

  if (status === "success") {
    message.success(fallbackMessage || subTitle);
  } else {
    message.error(fallbackMessage || subTitle);
  }
};

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
    return value.toLocaleString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
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
      flattenRecord(
        item,
        prefix ? `${prefix} ${index + 1}` : `Item ${index + 1}`,
      ),
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

const buildSafeFileToken = (value, fallback = "Unknown") =>
  String(value || fallback)
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/[^A-Za-z0-9.-]+/g, "") || fallback;

const formatFileDate = (value = new Date()) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return formatFileDate();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const buildFlightLogFileName = (record = {}) => {
  const aircraft = record.rpc || record.aircraft || record.aircraftNo || "Aircraft";
  const date = record.date || record.dateAdded || record.createdAt || record.updatedAt;
  return `FlightLog_${buildSafeFileToken(aircraft, "Aircraft")}_${formatFileDate(date)}`;
};

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
export const NGCP_LOGO_PATH = "/images/ngcp-logo.png";
const FLIGHT_LOG_TABLE_MARGIN = { left: 18, right: 18 };
const FLIGHT_LOG_TABLE_WIDTH = 559;

const flightValue = (value, fallback = "") =>
  value === null || value === undefined || value === ""
    ? fallback
    : String(value);

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
    .map((station) => [station?.from, station?.to].filter(Boolean).join(" - "))
    .filter(Boolean)
    .join(" / ");
};

const getComponentSection = (record = {}, sectionKey) =>
  record?.componentData?.[sectionKey] || {};

const fitRows = (items = [], count, emptyFactory) =>
  Array.from(
    { length: count },
    (_, index) => items[index] || emptyFactory(index),
  );

export const loadImageDataUrl = (src) =>
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

export const loadNgcpLogoDataUrl = () => loadImageDataUrl(NGCP_LOGO_PATH);

export const drawPdfReportHeader = (
  doc,
  {
    title = "Export",
    subtitle = "",
    logoDataUrl = null,
    x = 40,
    y = 34,
    logoWidth = 78,
    logoHeight = 30,
  } = {},
) => {
  const titleX = logoDataUrl ? x + logoWidth + 16 : x;

  if (logoDataUrl) {
    doc.addImage(logoDataUrl, "PNG", x, y - 18, logoWidth, logoHeight);
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(30);
  doc.text(title || "Export", titleX, y);

  if (subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(90);
    doc.text(subtitle, titleX, y + 16);
  }

  doc.setTextColor(0);
  return y + (subtitle ? 36 : 24);
};

const getImageFormatFromDataUrl = (dataUrl = "") => {
  const match = String(dataUrl).match(/^data:image\/(png|jpe?g|webp);/i);
  if (!match) return "PNG";
  return match[1].toLowerCase().startsWith("jp") ? "JPEG" : "PNG";
};

const isDrawableSignature = (value) =>
  typeof value === "string" &&
  /^data:image\/(png|jpe?g|webp);base64,/i.test(value);

const drawSignatureInCell = (doc, cell, signature, options = {}) => {
  if (!isDrawableSignature(signature)) return;

  const {
    topOffset = 3,
    horizontalPadding = 6,
    height = 14,
    maxWidth = cell.width - horizontalPadding * 2,
  } = options;

  const imageWidth = Math.max(
    16,
    Math.min(maxWidth, cell.width - horizontalPadding * 2),
  );
  const imageX = cell.x + (cell.width - imageWidth) / 2;
  const imageY = cell.y + topOffset;

  try {
    doc.addImage(
      signature,
      getImageFormatFromDataUrl(signature),
      imageX,
      imageY,
      imageWidth,
      height,
    );
  } catch (error) {
    console.warn("Unable to draw signature in flight log export", error);
  }
};

const drawFlightHeader = (doc, record, logoDataUrl = null) => {
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(30);
  doc.text("AIRCRAFT FLIGHT LOG - RW", pageWidth / 2, 34, {
    align: "center",
  });
  doc.setFontSize(12);
  doc.text("ROTARY WINGED AIRCRAFT", pageWidth / 2, 50, { align: "center" });
  doc.text("SINGLE ENGINE", pageWidth / 2, 66, { align: "center" });

  if (logoDataUrl) {
    doc.addImage(logoDataUrl, "PNG", 22, 46, 78, 34);
  } else {
    doc.setFontSize(18);
    doc.setTextColor(4, 100, 64);
    doc.text("NGCP", 24, 72);
  }
  doc.setTextColor(0);

  doc.setLineWidth(0.6);
  doc.setFontSize(8.5);
  doc.text("AIRCRAFT TYPE:", 20, 90);
  doc.setFont("helvetica", "normal");
  doc.text(flightValue(record.aircraftType), 104, 90);
  doc.line(102, 94, 205, 94);

  doc.setFont("helvetica", "bold");
  doc.text("RP-C:", 20, 106);
  doc.setFont("helvetica", "normal");
  doc.text(flightValue(record.rpc), 104, 106);
  doc.line(62, 110, 205, 110);

  doc.setFont("helvetica", "bold");
  doc.text("DATE:", 394, 90);
  doc.setFont("helvetica", "normal");
  doc.text(formatFlightLogDate(record.date), 446, 90);
  doc.line(442, 94, 570, 94);

  doc.setFont("helvetica", "bold");
  doc.text("CONTROL NO.:", 394, 106);
  doc.setFont("helvetica", "normal");
  doc.text(flightValue(record.controlNo), 478, 106);
  doc.line(476, 110, 570, 110);
};

const flightTableTheme = {
  theme: "grid",
  tableWidth: FLIGHT_LOG_TABLE_WIDTH,
  styles: {
    fontSize: 5.5,
    cellPadding: 1.2,
    lineColor: [25, 25, 25],
    lineWidth: 0.45,
    textColor: [20, 20, 20],
    minCellHeight: 8.4,
    valign: "middle",
    overflow: "linebreak",
  },
  headStyles: {
    fillColor: [226, 226, 226],
    textColor: [20, 20, 20],
    fontStyle: "bold",
    halign: "center",
    minCellHeight: 8.4,
  },
  bodyStyles: {
    fillColor: [255, 255, 255],
  },
  margin: FLIGHT_LOG_TABLE_MARGIN,
  pageBreak: "avoid",
};

const normalizeFlightAircraftType = (value = "") =>
  String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

const isB412FlightLogRecord = (record = {}) => {
  const aircraftType = normalizeFlightAircraftType(
    record.aircraftType ||
      record.aircraft?.aircraftType ||
      record.aircraft?.type,
  );

  return (
    aircraftType.includes("B412EP") || aircraftType.includes("BELL412EP")
  );
};

const firstFlightValue = (...values) =>
  values.find(
    (value) => value !== null && value !== undefined && value !== "",
  );

const getB412GroupValue = (section, groupKey, valueKey, ...aliases) =>
  firstFlightValue(
    section?.[groupKey]?.[valueKey],
    ...aliases.map((alias) => section?.[alias]),
  );

const getB412ComponentSection = (b412Data, sectionKey) =>
  b412Data?.componentData?.[sectionKey] ||
  b412Data?.componentTimes?.[sectionKey] ||
  {};

const getB412PassengerValue = (
  b412Data,
  record,
  rowIndex,
  legIndex,
) => {
  const passengerRow = b412Data?.passengerRows?.[rowIndex];
  const rowLegs = Array.isArray(passengerRow)
    ? passengerRow
    : passengerRow?.legs;
  const legPassengers = record.legs?.[legIndex]?.passengers;

  return flightValue(
    firstFlightValue(
      rowLegs?.[legIndex],
      Array.isArray(legPassengers) ? legPassengers[rowIndex] : undefined,
      rowIndex === 0 && !Array.isArray(legPassengers)
        ? legPassengers
        : undefined,
    ),
  );
};

const getB412OilValue = (row, groupKey, valueKey, ...aliases) =>
  flightValue(
    firstFlightValue(
      row?.[groupKey]?.[valueKey],
      ...aliases.map((alias) => row?.[alias]),
    ),
  );

const normalizeB412Category = (value = "") =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const drawB412FlightHeader = (doc, record, b412Data, logoDataUrl = null) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const serialNumber = flightValue(
    firstFlightValue(
      b412Data.serialNumber,
      b412Data.serialNo,
      record.serialNumber,
      record.serialNo,
    ),
  );
  const tailAndSerial = [
    flightValue(record.rpc || record.aircraftNo),
    serialNumber,
  ]
    .filter(Boolean)
    .join(" / ");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(30);
  doc.text("AIRCRAFT FLIGHT LOG", pageWidth / 2, 28, { align: "center" });
  doc.setFontSize(11);
  doc.text("ROTARY WINGED AIRCRAFT", pageWidth / 2, 43, {
    align: "center",
  });
  doc.text("TWIN ENGINE", pageWidth / 2, 57, { align: "center" });

  if (logoDataUrl) {
    doc.addImage(logoDataUrl, "PNG", 22, 38, 78, 34);
  } else {
    doc.setFontSize(18);
    doc.setTextColor(4, 100, 64);
    doc.text("NGCP", 24, 64);
  }
  doc.setTextColor(0);
  doc.setLineWidth(0.6);
  doc.setFontSize(8);

  doc.setFont("helvetica", "bold");
  doc.text("AIRCRAFT TYPE:", 20, 82);
  doc.setFont("helvetica", "normal");
  doc.text(flightValue(record.aircraftType, "BELL 412 EP"), 104, 82);
  doc.line(102, 86, 222, 86);

  doc.setFont("helvetica", "bold");
  doc.text("TAIL & SERIAL NO.:", 20, 98);
  doc.setFont("helvetica", "normal");
  doc.text(tailAndSerial, 116, 98);
  doc.line(114, 102, 242, 102);

  doc.setFont("helvetica", "bold");
  doc.text("CONTROL NO.:", 394, 82);
  doc.setFont("helvetica", "normal");
  doc.text(flightValue(record.controlNo || record.control), 478, 82);
  doc.line(476, 86, 570, 86);

  doc.setFont("helvetica", "bold");
  doc.text("DATE:", 394, 98);
  doc.setFont("helvetica", "normal");
  doc.text(formatFlightLogDate(record.date), 446, 98);
  doc.line(442, 102, 570, 102);
};

const drawB412FlightLog = (
  doc,
  autoTable,
  record = {},
  logoDataUrl = null,
) => {
  const b412Data = record.b412Data || {};
  const legs = fitRows(record.legs || [], 6, () => ({}));
  const passengerRows = Array.from({ length: 4 }, (_, rowIndex) =>
    Array.from({ length: 6 }, (_, legIndex) =>
      getB412PassengerValue(b412Data, record, rowIndex, legIndex),
    ),
  );
  const componentData = b412Data.componentData || {};
  const componentSections = [
    ["BRT FORWARD", getB412ComponentSection(b412Data, "broughtForwardData")],
    ["THIS FLIGHT", getB412ComponentSection(b412Data, "thisFlightData")],
    ["TO DATE", getB412ComponentSection(b412Data, "toDateData")],
  ];
  const fuelRows = fitRows(b412Data.fuelServicing || [], 6, () => ({}));
  const oilRows = fitRows(b412Data.oilServicing || [], 2, () => ({}));
  const correctionItems = fitRows(
    b412Data.correctionItems || [],
    3,
    () => ({}),
  );
  const correctionCategories = new Set(
    correctionItems
      .map((item) => normalizeB412Category(item.category))
      .filter(Boolean),
  );
  const categoryChecked = (...aliases) =>
    aliases.some((alias) => correctionCategories.has(alias));

  drawB412FlightHeader(doc, record, b412Data, logoDataUrl);

  autoTable(doc, {
    ...flightTableTheme,
    startY: 110,
    head: [
      [
        { content: "LEG", rowSpan: 2 },
        { content: "STATIONS", rowSpan: 2 },
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
      flightValue(firstFlightValue(leg.totalBlockTime, leg.totalTimeOn)),
      flightValue(firstFlightValue(leg.totalFlightTime, leg.totalTimeOff)),
    ]),
    columnStyles: {
      0: { cellWidth: 38, halign: "center", fontStyle: "bold" },
      1: { cellWidth: 227 },
      2: { cellWidth: 44, halign: "center" },
      3: { cellWidth: 44, halign: "center" },
      4: { cellWidth: 44, halign: "center" },
      5: { cellWidth: 44, halign: "center" },
      6: { cellWidth: 59, halign: "center" },
      7: { cellWidth: 59, halign: "center" },
    },
  });

  autoTable(doc, {
    ...flightTableTheme,
    startY: doc.lastAutoTable.finalY + 3,
    head: [
      [{ content: "PASSENGERS", colSpan: 6 }],
      FLIGHT_LEG_LABELS.map((label) => `${label} LEG`),
    ],
    body: passengerRows,
    columnStyles: Object.fromEntries(
      Array.from({ length: 6 }, (_, index) => [
        index,
        { cellWidth: index === 5 ? 94 : 93, halign: "center" },
      ]),
    ),
  });

  autoTable(doc, {
    ...flightTableTheme,
    startY: doc.lastAutoTable.finalY + 3,
    head: [
      [
        { content: "", rowSpan: 2 },
        { content: "AIRFRAME", rowSpan: 2 },
        { content: "M/R GEARBOX", colSpan: 2 },
        { content: "90 T/R GEARBOX", colSpan: 2 },
        { content: "42 T/R GEARBOX", colSpan: 2 },
        { content: "LANDING CYCLE", rowSpan: 2 },
      ],
      ["TSN", "TSO", "TSN", "TSO", "TSN", "TSO"],
    ],
    body: componentSections.map(([label, section]) => [
      label,
      flightValue(section.airframe),
      flightValue(
        getB412GroupValue(
          section,
          "mrGearbox",
          "tsn",
          "mrGearboxTsn",
          "mrGearboxTSN",
        ),
      ),
      flightValue(
        getB412GroupValue(
          section,
          "mrGearbox",
          "tso",
          "mrGearboxTso",
          "mrGearboxTSO",
        ),
      ),
      flightValue(
        getB412GroupValue(
          section,
          "tr90Gearbox",
          "tsn",
          "tr90GearboxTsn",
          "tr90GearboxTSN",
        ),
      ),
      flightValue(
        getB412GroupValue(
          section,
          "tr90Gearbox",
          "tso",
          "tr90GearboxTso",
          "tr90GearboxTSO",
        ),
      ),
      flightValue(
        getB412GroupValue(
          section,
          "tr42Gearbox",
          "tsn",
          "tr42GearboxTsn",
          "tr42GearboxTSN",
        ),
      ),
      flightValue(
        getB412GroupValue(
          section,
          "tr42Gearbox",
          "tso",
          "tr42GearboxTso",
          "tr42GearboxTSO",
        ),
      ),
      flightValue(section.landingCycle),
    ]),
    columnStyles: {
      0: { cellWidth: 57, fontStyle: "bold" },
      1: { cellWidth: 66, halign: "center" },
      2: { cellWidth: 58, halign: "center" },
      3: { cellWidth: 58, halign: "center" },
      4: { cellWidth: 58, halign: "center" },
      5: { cellWidth: 58, halign: "center" },
      6: { cellWidth: 58, halign: "center" },
      7: { cellWidth: 58, halign: "center" },
      8: { cellWidth: 88, halign: "center" },
    },
  });

  const airframeDue = firstFlightValue(
    componentData.airframeNextInspectionDueAt,
    b412Data.airframeNextInspectionDueAt,
    componentData.airframeNextInsp,
  );
  const engineDue = firstFlightValue(
    componentData.engineNextInspectionDueAt,
    b412Data.engineNextInspectionDueAt,
    componentData.engineNextInsp,
  );
  autoTable(doc, {
    ...flightTableTheme,
    startY: doc.lastAutoTable.finalY + 2,
    body: [
      [
        `AIRFRAME NEXT INSPECTION DUE AT: ${flightValue(airframeDue)}`,
        `ENGINE NEXT INSPECTION DUE AT: ${flightValue(engineDue)}`,
      ],
    ],
    styles: {
      ...flightTableTheme.styles,
      fontSize: 6,
      fontStyle: "bold",
    },
    columnStyles: {
      0: { cellWidth: 279.5 },
      1: { cellWidth: 279.5 },
    },
  });

  autoTable(doc, {
    ...flightTableTheme,
    startY: doc.lastAutoTable.finalY + 2,
    head: [
      [
        { content: "", rowSpan: 2 },
        { content: "ENGINE NO. 1", colSpan: 3 },
        { content: "ENGINE NO. 2", colSpan: 3 },
        { content: "SLING", rowSpan: 2 },
        { content: "OTHERS", rowSpan: 2 },
      ],
      ["TSN", "TSO", "CYCLE", "TSN", "TSO", "CYCLE"],
    ],
    body: componentSections.map(([label, section]) => [
      label,
      flightValue(
        getB412GroupValue(section, "engine1", "tsn", "engine1Tsn"),
      ),
      flightValue(
        getB412GroupValue(section, "engine1", "tso", "engine1Tso"),
      ),
      flightValue(
        getB412GroupValue(section, "engine1", "cycle", "engine1Cycle"),
      ),
      flightValue(
        getB412GroupValue(section, "engine2", "tsn", "engine2Tsn"),
      ),
      flightValue(
        getB412GroupValue(section, "engine2", "tso", "engine2Tso"),
      ),
      flightValue(
        getB412GroupValue(section, "engine2", "cycle", "engine2Cycle"),
      ),
      flightValue(section.sling),
      flightValue(section.others),
    ]),
    columnStyles: {
      0: { cellWidth: 57, fontStyle: "bold" },
      1: { cellWidth: 55, halign: "center" },
      2: { cellWidth: 55, halign: "center" },
      3: { cellWidth: 55, halign: "center" },
      4: { cellWidth: 55, halign: "center" },
      5: { cellWidth: 55, halign: "center" },
      6: { cellWidth: 55, halign: "center" },
      7: { cellWidth: 86, halign: "center" },
      8: { cellWidth: 86, halign: "center" },
    },
  });

  autoTable(doc, {
    ...flightTableTheme,
    startY: doc.lastAutoTable.finalY + 3,
    head: [
      [{ content: "FUEL SERVICING", colSpan: 9 }],
      [
        { content: "LEG", rowSpan: 2 },
        { content: "CONT. CHECK", rowSpan: 2 },
        { content: "MAIN TANK", colSpan: 3 },
        { content: "SUPPLY", colSpan: 2 },
        { content: "REMARKS", rowSpan: 2 },
        { content: "REFUELLER NAME & SIGNATURE", rowSpan: 2 },
      ],
      ["REM'G", "ADDED", "TOTAL", "SYS 1", "SYS 2"],
    ],
    body: fuelRows.map((fuel, index) => [
      FLIGHT_LEG_LABELS[index],
      flightValue(fuel.contCheck),
      flightValue(firstFlightValue(fuel.mainTankRemaining, fuel.mainRemG)),
      flightValue(firstFlightValue(fuel.mainTankAdded, fuel.mainAdd)),
      flightValue(firstFlightValue(fuel.mainTankTotal, fuel.mainTotal)),
      flightValue(firstFlightValue(fuel.supplySystem1, fuel.sys1)),
      flightValue(firstFlightValue(fuel.supplySystem2, fuel.sys2)),
      flightValue(fuel.remarks),
      {
        content: isDrawableSignature(fuel.signature)
          ? `\n${flightValue(fuel.refuellerName || fuel.refuelerName)}`
          : [fuel.signature, fuel.refuellerName || fuel.refuelerName]
              .filter(Boolean)
              .join(" / "),
      },
    ]),
    columnStyles: {
      0: { cellWidth: 35, halign: "center", fontStyle: "bold" },
      1: { cellWidth: 50, halign: "center" },
      2: { cellWidth: 55, halign: "center" },
      3: { cellWidth: 55, halign: "center" },
      4: { cellWidth: 55, halign: "center" },
      5: { cellWidth: 55, halign: "center" },
      6: { cellWidth: 55, halign: "center" },
      7: { cellWidth: 85 },
      8: { cellWidth: 114, halign: "center" },
    },
    didDrawCell: ({ cell, column, row, section }) => {
      if (section === "body" && column.index === 8) {
        drawSignatureInCell(doc, cell, fuelRows[row.index]?.signature, {
          height: 11,
          topOffset: 1,
          horizontalPadding: 8,
        });
      }
    },
  });

  const oilGroups = [
    ["engine1", "engine1"],
    ["engine2", "engine2"],
    ["mrGearbox", "mrGearbox"],
    ["reductionGearbox", "reductionGearbox"],
    ["tr42Gearbox", "gearbox42"],
    ["tr90Gearbox", "gearbox90"],
  ];
  autoTable(doc, {
    ...flightTableTheme,
    startY: doc.lastAutoTable.finalY + 3,
    head: [
      [{ content: "OIL SERVICING", colSpan: 19 }],
      [
        { content: "MECHANIC SIGNATURE", rowSpan: 2 },
        { content: "ENGINE NO. 1", colSpan: 3 },
        { content: "ENGINE NO. 2", colSpan: 3 },
        { content: "M/R GEARBOX", colSpan: 3 },
        { content: "REDUCTION G/B", colSpan: 3 },
        { content: "42 T/R GEARBOX", colSpan: 3 },
        { content: "90 T/R GEARBOX", colSpan: 3 },
      ],
      Array.from({ length: 6 }, () => ["REM", "ADD", "TOT"]).flat(),
    ],
    body: oilRows.map((oil) => [
      {
        content: isDrawableSignature(oil.mechanicSignature)
          ? ""
          : flightValue(oil.mechanicSignature),
      },
      ...oilGroups.flatMap(([groupKey, aliasPrefix]) => [
        getB412OilValue(
          oil,
          groupKey,
          "remaining",
          `${aliasPrefix}Rem`,
        ),
        getB412OilValue(oil, groupKey, "added", `${aliasPrefix}Add`),
        getB412OilValue(oil, groupKey, "total", `${aliasPrefix}Tot`),
      ]),
    ]),
    styles: {
      ...flightTableTheme.styles,
      fontSize: 4.2,
      cellPadding: 0.8,
    },
    headStyles: {
      ...flightTableTheme.headStyles,
      fontSize: 4.2,
      cellPadding: 0.7,
    },
    columnStyles: {
      0: { cellWidth: 64, halign: "center" },
      ...Object.fromEntries(
        Array.from({ length: 18 }, (_, index) => [
          index + 1,
          { cellWidth: 27.5, halign: "center" },
        ]),
      ),
    },
    didDrawCell: ({ cell, column, row, section }) => {
      if (section === "body" && column.index === 0) {
        drawSignatureInCell(
          doc,
          cell,
          oilRows[row.index]?.mechanicSignature,
          {
            height: 10,
            topOffset: 1,
            horizontalPadding: 4,
          },
        );
      }
    },
  });

  autoTable(doc, {
    ...flightTableTheme,
    startY: doc.lastAutoTable.finalY + 3,
    body: [
      [
        {
          content: `RELEASED BY:\n\n${flightValue(record.releasedBy?.name)}${
            record.releasedBy?.licenseNo || record.releasedBy?.id
              ? ` / ${record.releasedBy?.licenseNo || record.releasedBy?.id}`
              : ""
          }\nENGINEER / CERTIFICATE`,
        },
        {
          content: `ACCEPTED BY:\n\n${flightValue(record.acceptedBy?.name)}${
            record.acceptedBy?.licenseNo || record.acceptedBy?.id
              ? ` / ${record.acceptedBy?.licenseNo || record.acceptedBy?.id}`
              : ""
          }\nPILOT-IN-COMMAND / CERTIFICATE`,
        },
      ],
    ],
    styles: {
      ...flightTableTheme.styles,
      minCellHeight: 28,
      halign: "center",
    },
    columnStyles: {
      0: { cellWidth: 279.5 },
      1: { cellWidth: 279.5 },
    },
    didDrawCell: ({ cell, column, section }) => {
      if (section !== "body") return;
      const signature =
        column.index === 0
          ? record.releasedBy?.signature
          : record.acceptedBy?.signature;
      drawSignatureInCell(doc, cell, signature, {
        height: 16,
        topOffset: 11,
        horizontalPadding: 28,
      });
    },
  });

  autoTable(doc, {
    ...flightTableTheme,
    startY: doc.lastAutoTable.finalY + 3,
    head: [["DISCREPANCY / REMARKS"]],
    body: [
      [
        flightValue(
          firstFlightValue(
            b412Data.discrepancyRemarks,
            b412Data.remarks,
            record.remarks,
          ),
        ),
      ],
    ],
    styles: {
      ...flightTableTheme.styles,
      minCellHeight: 24,
      valign: "top",
    },
    columnStyles: { 0: { cellWidth: 559 } },
  });

  autoTable(doc, {
    ...flightTableTheme,
    startY: doc.lastAutoTable.finalY + 3,
    body: [
      [
        `${categoryChecked("discrepancycorrection", "discrepancy") ? "[X]" : "[ ]"} DISCREPANCY CORRECTION`,
        `${categoryChecked("sbadcompliance", "sbad") ? "[X]" : "[ ]"} SB/AD COMPLIANCE`,
        `${categoryChecked("inspection") ? "[X]" : "[ ]"} INSPECTION`,
        `${categoryChecked("others", "other") ? "[X]" : "[ ]"} OTHERS`,
      ],
    ],
    styles: {
      ...flightTableTheme.styles,
      fontSize: 5.2,
      fontStyle: "bold",
      halign: "center",
    },
    columnStyles: {
      0: { cellWidth: 150 },
      1: { cellWidth: 145 },
      2: { cellWidth: 120 },
      3: { cellWidth: 144 },
    },
  });

  autoTable(doc, {
    ...flightTableTheme,
    startY: doc.lastAutoTable.finalY + 2,
    head: [["DATE", "ACFT T/T", "WORK DONE", "NAME / SIGN", "CERT. NO."]],
    body: correctionItems.map((item) => [
      formatFlightLogDate(item.date),
      flightValue(item.aircraftTotalTime || item.aircraftTT),
      flightValue(item.workDone || item.description),
      {
        content: isDrawableSignature(item.nameSign || item.signature)
          ? ""
          : flightValue(item.nameSign || item.signature || item.name),
      },
      flightValue(item.certificateNo || item.certificateNumber),
    ]),
    columnStyles: {
      0: { cellWidth: 65, halign: "center" },
      1: { cellWidth: 75, halign: "center" },
      2: { cellWidth: 260 },
      3: { cellWidth: 100, halign: "center" },
      4: { cellWidth: 59, halign: "center" },
    },
    didDrawCell: ({ cell, column, row, section }) => {
      if (section === "body" && column.index === 3) {
        drawSignatureInCell(
          doc,
          cell,
          correctionItems[row.index]?.nameSign ||
            correctionItems[row.index]?.signature,
          {
            height: 10,
            topOffset: 1,
            horizontalPadding: 8,
          },
        );
      }
    },
  });
};

export const exportFlightLogToPDF = async (record = {}, options = {}) => {
  const { setPopup } = options;
  try {
    const [{ jsPDF }, { default: autoTable }] = await Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
    ]);
    const doc = new jsPDF("p", "pt", "a4");
    const fileName = buildFlightLogFileName(record);

    let logoDataUrl = null;
    try {
      logoDataUrl = await loadNgcpLogoDataUrl();
    } catch (imageError) {
      console.warn(imageError);
    }

    if (isB412FlightLogRecord(record)) {
      drawB412FlightLog(doc, autoTable, record, logoDataUrl);
      doc.save(`${fileName}.pdf`);
      showExportPopup(setPopup, {
        status: "success",
        title: "Flight Log Exported!",
        subTitle: "The flight log PDF has been exported successfully.",
        fallbackMessage: "Flight log PDF exported successfully!",
      });
      return;
    }

    drawFlightHeader(doc, record, logoDataUrl);

    const legs = fitRows(record.legs || [], 6, () => ({}));

    autoTable(doc, {
      ...flightTableTheme,
      startY: 118,
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
        0: { cellWidth: 38, halign: "center", fontStyle: "bold" },
        1: { cellWidth: 227 },
        2: { cellWidth: 44, halign: "center" },
        3: { cellWidth: 44, halign: "center" },
        4: { cellWidth: 44, halign: "center" },
        5: { cellWidth: 44, halign: "center" },
        6: { cellWidth: 59, halign: "center" },
        7: { cellWidth: 59, halign: "center" },
      },
    });

    autoTable(doc, {
      ...flightTableTheme,
      startY: doc.lastAutoTable.finalY + 3,
      head: [
        [{ content: "PASSENGERS", colSpan: 9 }],
        ["DATE", ...PASSENGER_LEG_LABELS],
      ],
      body: Array.from({ length: 4 }, (_, rowIndex) => [
        rowIndex === 0 ? formatFlightLogDate(record.date) : "",
        ...PASSENGER_LEG_LABELS.map((_, legIndex) =>
          flightValue(record.legs?.[legIndex]?.passengers),
        ),
      ]),
      columnStyles: {
        0: { cellWidth: 71, halign: "center" },
        1: { cellWidth: 61, halign: "center" },
        2: { cellWidth: 61, halign: "center" },
        3: { cellWidth: 61, halign: "center" },
        4: { cellWidth: 61, halign: "center" },
        5: { cellWidth: 61, halign: "center" },
        6: { cellWidth: 61, halign: "center" },
        7: { cellWidth: 61, halign: "center" },
        8: { cellWidth: 61, halign: "center" },
      },
    });

    const componentSections = [
      ["BRT FRW", getComponentSection(record, "broughtForwardData")],
      ["THIS FLT", getComponentSection(record, "thisFlightData")],
      ["TO DATE", getComponentSection(record, "toDateData")],
    ];

    autoTable(doc, {
      ...flightTableTheme,
      startY: doc.lastAutoTable.finalY + 3,
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
        0: { cellWidth: 48, fontStyle: "bold" },
        1: { cellWidth: 51, halign: "center" },
        2: { cellWidth: 51, halign: "center" },
        3: { cellWidth: 51, halign: "center" },
        4: { cellWidth: 51, halign: "center" },
        5: { cellWidth: 51, halign: "center" },
        6: { cellWidth: 51, halign: "center" },
        7: { cellWidth: 51, halign: "center" },
        8: { cellWidth: 51, halign: "center" },
        9: { cellWidth: 51, halign: "center" },
        10: { cellWidth: 52, halign: "center" },
      },
    });

    const bf = getComponentSection(record, "broughtForwardData");
    const tf = getComponentSection(record, "thisFlightData");
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text(
      `AIRFRAME NEXT INSP. DUE AT: ${flightValue(tf.airframeNextInsp || bf.airframeNextInsp)}`,
      18,
      doc.lastAutoTable.finalY + 9,
    );
    doc.text(
      `ENGINE NEXT INSP. DUE AT: ${flightValue(tf.engineNextInsp || bf.engineNextInsp)}`,
      302,
      doc.lastAutoTable.finalY + 9,
    );

    const fuelRows = fitRows(record.fuelServicing || [], 4, () => ({}));
    autoTable(doc, {
      ...flightTableTheme,
      startY: doc.lastAutoTable.finalY + 13,
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
        {
          content: `${fuel.signature ? "\n" : ""}${flightValue(fuel.refuelerName)}`,
          signatureData: fuel.signature,
        },
      ]),
      columnStyles: {
        0: { cellWidth: 36, halign: "center", fontStyle: "bold" },
        1: { cellWidth: 54, halign: "center" },
        2: { cellWidth: 68, halign: "center" },
        3: { cellWidth: 68, halign: "center" },
        4: { cellWidth: 62, halign: "center" },
        5: { cellWidth: 68, halign: "center" },
        6: { cellWidth: 57, halign: "center" },
        7: { cellWidth: 57, halign: "center" },
        8: { cellWidth: 89 },
      },
      didDrawCell: ({ cell, column, row, section }) => {
        if (section === "body" && column.index === 8) {
          drawSignatureInCell(doc, cell, fuelRows[row.index]?.signature, {
            height: 12,
            topOffset: 2,
          });
        }
      },
    });

    const oilRows = fitRows(record.oilServicing || [], 4, () => ({}));
    autoTable(doc, {
      ...flightTableTheme,
      startY: doc.lastAutoTable.finalY + 3,
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
        { content: "", signatureData: oil.signature },
      ]),
      columnStyles: {
        0: { cellWidth: 32, halign: "center", fontStyle: "bold" },
        1: { cellWidth: 48, halign: "center" },
        2: { cellWidth: 35, halign: "center" },
        3: { cellWidth: 35, halign: "center" },
        4: { cellWidth: 35, halign: "center" },
        5: { cellWidth: 35, halign: "center" },
        6: { cellWidth: 35, halign: "center" },
        7: { cellWidth: 35, halign: "center" },
        8: { cellWidth: 35, halign: "center" },
        9: { cellWidth: 35, halign: "center" },
        10: { cellWidth: 35, halign: "center" },
        11: { cellWidth: 90 },
        12: { cellWidth: 74, halign: "center" },
      },
      didDrawCell: ({ cell, column, row, section }) => {
        if (section === "body" && column.index === 12) {
          drawSignatureInCell(doc, cell, oilRows[row.index]?.signature, {
            height: 12,
            topOffset: 2,
            horizontalPadding: 3,
          });
        }
      },
    });

    autoTable(doc, {
      ...flightTableTheme,
      startY: doc.lastAutoTable.finalY + 3,
      body: [
        [
          {
            content: `RELEASED BY:\n\n${flightValue(record.releasedBy?.name)}\nENGINEER / CERTIFICATE`,
            signatureData: record.releasedBy?.signature,
          },
          {
            content: `ACCEPTED BY:\n\n${flightValue(record.acceptedBy?.name)}\nPILOT-IN-COMMAND / CERTIFICATE`,
            signatureData: record.acceptedBy?.signature,
          },
        ],
      ],
      styles: {
        ...flightTableTheme.styles,
        minCellHeight: 28,
        halign: "center",
      },
      columnStyles: {
        0: { cellWidth: 279.5 },
        1: { cellWidth: 279.5 },
      },
      didDrawCell: ({ cell, column, section }) => {
        if (section !== "body") return;
        const signature =
          column.index === 0
            ? record.releasedBy?.signature
            : record.acceptedBy?.signature;
        drawSignatureInCell(doc, cell, signature, {
          height: 16,
          topOffset: 11,
          horizontalPadding: 28,
        });
      },
    });

    autoTable(doc, {
      ...flightTableTheme,
      startY: doc.lastAutoTable.finalY + 3,
      head: [["DISCREPANCY / REMARKS", "SLING"]],
      body: [
        [flightValue(record.remarks), flightValue(record.sling)],
        ["", ""],
        ["", ""],
        ["", ""],
      ],
      columnStyles: {
        0: { cellWidth: 445 },
        1: { cellWidth: 114 },
      },
    });

    const workRows = fitRows(record.workItems || [], 5, () => ({}));
    autoTable(doc, {
      ...flightTableTheme,
      startY: doc.lastAutoTable.finalY + 3,
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
        0: { cellWidth: 70, halign: "center" },
        1: { cellWidth: 80, halign: "center" },
        2: { cellWidth: 255 },
        3: { cellWidth: 96 },
        4: { cellWidth: 58, halign: "center" },
      },
    });

    doc.save(`${fileName}.pdf`);
    showExportPopup(setPopup, {
      status: "success",
      title: "Flight Log Exported!",
      subTitle: "The flight log PDF has been exported successfully.",
      fallbackMessage: "Flight log PDF exported successfully!",
    });
  } catch (err) {
    console.error(err);
    showExportPopup(setPopup, {
      status: "error",
      title: "Operation failed!",
      subTitle: err.message || "Flight log PDF export failed.",
      fallbackMessage: "Flight log PDF export failed: " + err.message,
    });
  }
};

export const exportToPDF = async (options = {}) => {
  const {
    setPopup,
    summarydata = [],
    mhistorydata = [],
    componentData = [],
  } = options;
  try {
    const [{ jsPDF }, { default: autoTable }, { default: html2canvas }] =
      await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
        import("html2canvas"),
      ]);
    const doc = new jsPDF("p", "pt", "a4");

    const logoDataUrl = await loadNgcpLogoDataUrl().catch((imageError) => {
      console.warn(imageError);
      return null;
    });
    const startY = drawPdfReportHeader(doc, {
      title: "Maintenance Dashboard",
      logoDataUrl,
    });

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
      startY,
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
    showExportPopup(setPopup, {
      status: "success",
      title: "PDF Exported!",
      subTitle: "The PDF has been exported successfully.",
      fallbackMessage: "PDF exported successfully!",
    });
  } catch (err) {
    console.error(err);
    showExportPopup(setPopup, {
      status: "error",
      title: "Operation failed!",
      subTitle: err.message || "PDF export failed.",
      fallbackMessage: "PDF export failed: " + err.message,
    });
  }
};

const parseReportDate = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) return parsed;

  const [month, day, year] = String(value || "")
    .split("/")
    .map(Number);
  const fallbackDate = new Date(year, month - 1, day);
  return Number.isNaN(fallbackDate.getTime()) ? null : fallbackDate;
};

const formatReportDate = (value) => {
  const date = parseReportDate(value);
  if (!date) return "N/A";

  return date.toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });
};

const getReportPartName = (item = {}) =>
  item.particular ||
  item.codeParticular?.[0]?.particular ||
  item.itemName ||
  "Unspecified Part";

const getReportPartId = (item = {}) =>
  item.matCodeNo ||
  item.codeParticular?.[0]?.matCodeNo ||
  item.partNo ||
  item.partId ||
  "";

const getMonthKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

const getQuarterKey = (date) =>
  `${date.getFullYear()} Q${Math.floor(date.getMonth() / 3) + 1}`;

const monthDiffInclusive = (startDate, endDate) => {
  if (!startDate || !endDate) return 1;
  return Math.max(
    1,
    (endDate.getFullYear() - startDate.getFullYear()) * 12 +
      endDate.getMonth() -
      startDate.getMonth() +
      1,
  );
};

const formatDays = (days) =>
  Number.isFinite(days) ? `${Math.round(days * 10) / 10} days` : "N/A";

const getTrendLabel = (dates = []) => {
  if (dates.length < 3) return "Insufficient history";

  const sortedDates = [...dates].sort((a, b) => a - b);
  const midpoint =
    sortedDates[0].getTime() +
    (sortedDates[sortedDates.length - 1].getTime() - sortedDates[0].getTime()) /
      2;
  const firstHalf = sortedDates.filter(
    (date) => date.getTime() <= midpoint,
  ).length;
  const secondHalf = sortedDates.length - firstHalf;

  if (secondHalf > firstHalf * 1.15) return "Rising demand";
  if (secondHalf < firstHalf * 0.85) return "Falling demand";
  return "Stable demand";
};

const summarizePartsRequisitions = (requisitions = []) => {
  const partMap = new Map();
  const monthlyRequests = new Map();
  const quarterlyRequests = new Map();
  const datedRecords = [];
  let totalItems = 0;
  let totalQuantity = 0;

  requisitions.forEach((record) => {
    const requestDate =
      parseReportDate(record.dateRequested) ||
      parseReportDate(record.createdAt) ||
      parseReportDate(record.updatedAt);

    if (requestDate) {
      datedRecords.push({ record, requestDate });
      const monthKey = getMonthKey(requestDate);
      const quarterKey = getQuarterKey(requestDate);
      monthlyRequests.set(monthKey, (monthlyRequests.get(monthKey) || 0) + 1);
      quarterlyRequests.set(
        quarterKey,
        (quarterlyRequests.get(quarterKey) || 0) + 1,
      );
    }

    (record.items || []).forEach((item) => {
      const partName = getReportPartName(item);
      const partId = getReportPartId(item);
      const key = `${partId || partName}`.toLowerCase();
      const quantity = Number(item.quantity) || 0;
      const existing =
        partMap.get(key) ||
        {
          partName,
          partId,
          totalQuantity: 0,
          requisitionIds: new Set(),
          dates: [],
        };

      existing.totalQuantity += quantity;
      existing.requisitionIds.add(record._id || record.wrsNo || key);
      if (requestDate) existing.dates.push(requestDate);
      partMap.set(key, existing);
      totalItems += 1;
      totalQuantity += quantity;
    });
  });

  const sortedDates = datedRecords
    .map(({ requestDate }) => requestDate)
    .sort((a, b) => a - b);
  const startDate = sortedDates[0] || null;
  const endDate = sortedDates[sortedDates.length - 1] || null;
  const monthCount = monthDiffInclusive(startDate, endDate);

  const parts = [...partMap.values()]
    .map((part) => {
      const uniqueDates = [
        ...new Map(
          part.dates.map((date) => [date.toISOString().slice(0, 10), date]),
        ).values(),
      ].sort((a, b) => a - b);
      const gaps = uniqueDates
        .slice(1)
        .map(
          (date, index) =>
            (date.getTime() - uniqueDates[index].getTime()) /
            (1000 * 60 * 60 * 24),
        );
      const averageGapDays =
        gaps.length > 0
          ? gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length
          : null;

      return {
        ...part,
        requisitionCount: part.requisitionIds.size,
        requestsPerMonth: part.requisitionIds.size / monthCount,
        averageGapDays,
        trend: getTrendLabel(uniqueDates),
      };
    })
    .sort((first, second) => second.totalQuantity - first.totalQuantity);

  return {
    parts,
    topParts: parts.slice(0, 10),
    totalRequisitions: requisitions.length,
    totalItems,
    totalQuantity,
    startDate,
    endDate,
    monthlyRequests: [...monthlyRequests.entries()].sort(([a], [b]) =>
      a.localeCompare(b),
    ),
    quarterlyRequests: [...quarterlyRequests.entries()].sort(([a], [b]) =>
      a.localeCompare(b),
    ),
  };
};

const addPdfPageIfNeeded = (doc, y, neededHeight = 80) => {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (y + neededHeight <= pageHeight - 42) return y;
  doc.addPage();
  return 42;
};

const drawSectionTitle = (doc, title, y) => {
  const nextY = addPdfPageIfNeeded(doc, y, 34);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(4, 100, 64);
  doc.text(title, 40, nextY);
  doc.setDrawColor(4, 100, 64);
  doc.setLineWidth(0.6);
  doc.line(40, nextY + 5, 555, nextY + 5);
  doc.setTextColor(0);
  return nextY + 20;
};

const drawWrappedText = (doc, text, x, y, width, lineHeight = 13) => {
  const lines = doc.splitTextToSize(text, width);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(55);
  doc.text(lines, x, y);
  doc.setTextColor(0);
  return y + lines.length * lineHeight;
};

const drawBarChart = (
  doc,
  { title, rows, x = 40, y, width = 515, height = 170 },
) => {
  const chartY = addPdfPageIfNeeded(doc, y, height + 48);
  const maxValue = Math.max(...rows.map((row) => row.value), 1);
  const barGap = 8;
  const leftLabelWidth = 128;
  const barAreaWidth = width - leftLabelWidth - 46;
  const barHeight = Math.max(
    10,
    Math.min(18, (height - 30) / rows.length - barGap),
  );

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(title, x, chartY);
  doc.setDrawColor(220);
  doc.roundedRect(x, chartY + 12, width, height, 4, 4);

  rows.forEach((row, index) => {
    const rowY = chartY + 30 + index * (barHeight + barGap);
    const label = doc.splitTextToSize(row.label, leftLabelWidth - 8)[0] || "";
    const barWidth = (row.value / maxValue) * barAreaWidth;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(65);
    doc.text(label, x + 10, rowY + barHeight - 3);
    doc.setFillColor(4, 138, 37);
    doc.rect(x + leftLabelWidth, rowY, Math.max(2, barWidth), barHeight, "F");
    doc.setTextColor(20);
    doc.text(
      String(row.value),
      x + leftLabelWidth + barWidth + 6,
      rowY + barHeight - 3,
    );
  });

  doc.setTextColor(0);
  return chartY + height + 28;
};

const drawFrequencyChart = (
  doc,
  { title, rows, x = 40, y, width = 515, height = 170 },
) => {
  const chartY = addPdfPageIfNeeded(doc, y, height + 48);
  const maxValue = Math.max(...rows.map((row) => row.value), 1);
  const usableHeight = height - 48;
  const barWidth = Math.max(10, Math.min(34, (width - 40) / rows.length - 6));
  const baseY = chartY + height - 26;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(title, x, chartY);
  doc.setDrawColor(220);
  doc.roundedRect(x, chartY + 12, width, height, 4, 4);
  doc.line(x + 24, baseY, x + width - 14, baseY);

  rows.forEach((row, index) => {
    const barHeight = (row.value / maxValue) * usableHeight;
    const barX = x + 34 + index * (barWidth + 6);
    const barY = baseY - barHeight;

    doc.setFillColor(22, 119, 255);
    doc.rect(barX, barY, barWidth, barHeight, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text(String(row.value), barX + barWidth / 2, barY - 4, {
      align: "center",
    });
    doc.text(row.label.slice(5) || row.label, barX + barWidth / 2, baseY + 10, {
      align: "center",
    });
  });

  return chartY + height + 28;
};

export const exportPartsRequisitionMonitoringReport = async ({
  data = [],
  setPopup,
  selectedStatus = "all",
} = {}) => {
  try {
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error("No requisition data available for the report.");
    }

    const [{ jsPDF }, { default: autoTable }] = await Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
    ]);
    const doc = new jsPDF("p", "pt", "a4");
    const logoDataUrl = await loadNgcpLogoDataUrl().catch((imageError) => {
      console.warn(imageError);
      return null;
    });
    const report = summarizePartsRequisitions(data);
    const topPart = report.topParts[0];
    const periodText =
      report.startDate && report.endDate
        ? `${formatReportDate(report.startDate)} to ${formatReportDate(report.endDate)}`
        : "No dated requests";
    let y = drawPdfReportHeader(doc, {
      title: "Parts Requisition Monitoring Report",
      subtitle: `Period: ${periodText} | Filter: ${formatExportLabel(selectedStatus)}`,
      logoDataUrl,
    });

    y = drawSectionTitle(doc, "1. Summary", y + 6);
    autoTable(doc, {
      startY: y,
      theme: "grid",
      head: [["Metric", "Value"]],
      body: [
        ["Total requisitions", report.totalRequisitions],
        ["Total line items", report.totalItems],
        ["Total quantity requested", report.totalQuantity],
        ["Unique requested parts", report.parts.length],
        ["Date range", periodText],
      ],
      styles: { fontSize: 9, cellPadding: 6 },
      headStyles: { fillColor: [4, 100, 64] },
      columnStyles: { 0: { fontStyle: "bold", cellWidth: 220 } },
    });
    y = doc.lastAutoTable.finalY + 16;
    y = drawWrappedText(
      doc,
      topPart
        ? `Overall findings: ${topPart.partName} ${
            topPart.partId ? `(${topPart.partId}) ` : ""
          }is the highest-demand part in the selected data, with ${topPart.totalQuantity} total unit(s) requested across ${topPart.requisitionCount} requisition(s). The report covers ${report.totalRequisitions} requisition(s), ${report.totalItems} line item(s), and ${report.parts.length} unique part(s).`
        : "Overall findings: no part-level requisition data is available in the selected period.",
      40,
      y,
      515,
    );

    y = drawSectionTitle(doc, "2. Most Requested Parts", y + 10);
    autoTable(doc, {
      startY: y,
      theme: "striped",
      head: [["Rank", "Part Name / ID", "Total Qty", "Requisitions"]],
      body: report.topParts.map((part, index) => [
        index + 1,
        [part.partName, part.partId].filter(Boolean).join(" / "),
        part.totalQuantity,
        part.requisitionCount,
      ]),
      styles: { fontSize: 8.5, cellPadding: 5 },
      headStyles: { fillColor: [4, 100, 64] },
      columnStyles: {
        0: { cellWidth: 42, halign: "center" },
        2: { cellWidth: 78, halign: "right" },
        3: { cellWidth: 85, halign: "right" },
      },
    });
    y = doc.lastAutoTable.finalY + 16;

    y = drawSectionTitle(doc, "3. Request Frequency", y);
    autoTable(doc, {
      startY: y,
      theme: "grid",
      head: [["Part Name / ID", "Requests", "Requests / Month", "Requests / Quarter"]],
      body: report.topParts.map((part) => [
        [part.partName, part.partId].filter(Boolean).join(" / "),
        part.requisitionCount,
        Math.round(part.requestsPerMonth * 100) / 100,
        Math.round(part.requestsPerMonth * 300) / 100,
      ]),
      styles: { fontSize: 8.5, cellPadding: 5 },
      headStyles: { fillColor: [4, 100, 64] },
      columnStyles: {
        1: { halign: "right" },
        2: { halign: "right" },
        3: { halign: "right" },
      },
    });
    y = doc.lastAutoTable.finalY + 16;

    y = drawSectionTitle(doc, "4. Usage Patterns", y);
    autoTable(doc, {
      startY: y,
      theme: "striped",
      head: [["Part Name / ID", "Avg. Time Between Requests", "Trend"]],
      body: report.topParts.map((part) => [
        [part.partName, part.partId].filter(Boolean).join(" / "),
        formatDays(part.averageGapDays),
        part.trend,
      ]),
      styles: { fontSize: 8.5, cellPadding: 5 },
      headStyles: { fillColor: [4, 100, 64] },
      columnStyles: {
        1: { cellWidth: 150 },
        2: { cellWidth: 125 },
      },
    });
    y = doc.lastAutoTable.finalY + 16;
    y = drawWrappedText(
      doc,
      "Trend interpretation compares request activity in the first half of the selected period with the second half. Parts with limited history are marked as insufficient history.",
      40,
      y,
      515,
    );

    y = drawSectionTitle(doc, "5. Visualizations", y + 10);
    y = drawBarChart(doc, {
      title: "Top Requested Parts by Quantity",
      y,
      rows:
        report.topParts.length > 0
          ? report.topParts.slice(0, 8).map((part) => ({
              label: part.partId
                ? `${part.partName} (${part.partId})`
                : part.partName,
              value: part.totalQuantity,
            }))
          : [{ label: "No requested parts", value: 0 }],
    });
    y = drawFrequencyChart(doc, {
      title: "Request Frequency Over Time",
      y,
      rows:
        report.monthlyRequests.length > 0
          ? report.monthlyRequests.map(([label, value]) => ({ label, value }))
          : [{ label: "N/A", value: 0 }],
    });

    y = drawSectionTitle(doc, "Quarterly Frequency Detail", y);
    autoTable(doc, {
      startY: y,
      theme: "grid",
      head: [["Quarter", "Requisition Count"]],
      body: report.quarterlyRequests.map(([quarter, count]) => [
        quarter,
        count,
      ]),
      styles: { fontSize: 9, cellPadding: 6 },
      headStyles: { fillColor: [4, 100, 64] },
    });

    doc.save(
      buildSafeFileName(
        `Parts Requisition Monitoring Report ${formatFileDate()}`,
        "Parts-Requisition-Monitoring-Report",
      ) + ".pdf",
    );
    showExportPopup(setPopup, {
      status: "success",
      title: "PDF Exported!",
      subTitle: "Parts Requisition Monitoring Report exported successfully.",
      fallbackMessage: "PDF exported successfully!",
    });
  } catch (err) {
    console.error("Parts requisition monitoring PDF export failed:", err);
    showExportPopup(setPopup, {
      status: "error",
      title: "Operation failed!",
      subTitle: err.message || "Failed to export PDF report.",
      fallbackMessage: "PDF export failed: " + err.message,
    });
  }
};

export const exportRecordToPDF = async ({
  title,
  fileName,
  record,
  subtitle,
  setPopup,
}) => {
  try {
    const [{ jsPDF }, { default: autoTable }] = await Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
    ]);
    const rows = flattenRecord(record);

    if (rows.length === 0) {
      throw new Error("No exportable data found");
    }

    const doc = new jsPDF("p", "pt", "a4");
    const logoDataUrl = await loadNgcpLogoDataUrl().catch((imageError) => {
      console.warn(imageError);
      return null;
    });
    const startY = drawPdfReportHeader(doc, {
      title: title || "Export",
      subtitle,
      logoDataUrl,
    });

    autoTable(doc, {
      head: [["Field", "Value"]],
      body: rows.map(({ label, value }) => [label, value]),
      startY,
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
    showExportPopup(setPopup, {
      status: "success",
      title: "PDF Exported!",
      subTitle: "The PDF has been exported successfully.",
      fallbackMessage: "PDF exported successfully!",
    });
  } catch (err) {
    console.error(err);
    showExportPopup(setPopup, {
      status: "error",
      title: "Operation failed!",
      subTitle: err.message || "PDF export failed.",
      fallbackMessage: "PDF export failed: " + err.message,
    });
  }
};

export const exportToExcel = async (options = {}) => {
  const {
    setPopup,
    PACChartMock = [],
    summarydata = [],
    mhistorydata = [],
    componentData = [],
  } = options;
  try {
    const [{ default: ExcelJS }, { saveAs }] = await Promise.all([
      import("exceljs"),
      import("file-saver"),
    ]);

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

    showExportPopup(setPopup, {
      status: "success",
      title: "Excel Exported!",
      subTitle: "The Excel file has been exported successfully.",
      fallbackMessage: "Excel exported successfully!",
    });
  } catch (err) {
    console.error("Excel export failed:", err);
    showExportPopup(setPopup, {
      status: "error",
      title: "Operation failed!",
      subTitle: err.message || "Excel export failed.",
      fallbackMessage: "Excel export failed: " + err.message,
    });
  }
};
