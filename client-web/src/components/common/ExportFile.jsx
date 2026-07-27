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
const NGCP_LOGO_PATH = "/images/ngcp-logo.png";
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
      logoDataUrl = await loadImageDataUrl(NGCP_LOGO_PATH);
    } catch (imageError) {
      console.warn(imageError);
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
