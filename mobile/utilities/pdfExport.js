import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import { Alert, Image, Platform } from "react-native";
import { showToast } from "./toast";
import {
  exportPostInspectionTemplatePdf,
  exportPreInspectionTemplatePdf,
} from "./documentExport";

const EXCLUDED_EXPORT_KEYS = new Set([
  "_id",
  "__v",
  "id",
  "createdAt",
  "updatedAt",
]);

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

const ngcpLogoMarkup = (logoDataUri, className = "ngcp-logo") =>
  logoDataUri
    ? `<img class="${className}" src="${logoDataUri}" alt="NGCP" />`
    : `<div class="ngcp"><span class="accent">N</span>GC<span class="accent">P</span></div><div class="tagline">BRIDGING POWER &amp; PROGRESS</div>`;

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const formatLabel = (key) =>
  String(key)
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const formatValue = (value) => {
  if (value === null || value === undefined || value === "") return "N/A";
  if (typeof value === "boolean") return value ? "Yes" : "No";
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

const buildSafeFileName = (value, fallback = "export") =>
  String(value || fallback)
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-");

const PDF_MIME_TYPE = "application/pdf";

const printHtmlOnWeb = (html, title) =>
  new Promise((resolve, reject) => {
    if (typeof document === "undefined") {
      reject(new Error("Browser printing is unavailable."));
      return;
    }

    const printFrame = document.createElement("iframe");
    printFrame.setAttribute("title", title);
    printFrame.style.position = "fixed";
    printFrame.style.width = "1px";
    printFrame.style.height = "1px";
    printFrame.style.right = "0";
    printFrame.style.bottom = "0";
    printFrame.style.border = "0";
    printFrame.style.opacity = "0";

    const removeFrame = () => {
      setTimeout(() => printFrame.remove(), 1000);
    };

    printFrame.onload = () => {
      try {
        const printWindow = printFrame.contentWindow;
        if (!printWindow) {
          throw new Error("Browser printing is unavailable.");
        }
        printWindow.document.title = title;
        printWindow.focus();
        printWindow.print();
        removeFrame();
        resolve("web-print-dialog");
      } catch (error) {
        printFrame.remove();
        reject(error);
      }
    };

    printFrame.srcdoc = html;
    document.body.appendChild(printFrame);
  });

const createShareablePdfUri = async (sourceUri, fileName) => {
  const outputDirectory =
    FileSystem.cacheDirectory || FileSystem.documentDirectory;
  if (!outputDirectory) return sourceUri;

  const finalUri = `${outputDirectory}${buildSafeFileName(fileName)}.pdf`;

  try {
    await FileSystem.copyAsync({ from: sourceUri, to: finalUri });
    return finalUri;
  } catch (error) {
    console.warn("Unable to rename generated PDF; using temporary file", error);
    return sourceUri;
  }
};

const savePdfWithAndroidPicker = async (sourceUri, fileName) => {
  if (Platform.OS !== "android") return null;

  const storage = FileSystem.StorageAccessFramework;
  if (!storage) return null;

  let initialDirectoryUri;
  try {
    initialDirectoryUri = storage.getUriForDirectoryInRoot("Download");
  } catch {
    initialDirectoryUri = null;
  }

  const permission = await storage.requestDirectoryPermissionsAsync(
    initialDirectoryUri,
  );
  if (!permission.granted) return null;

  const safeFileName = buildSafeFileName(fileName).replace(/\.pdf$/i, "");
  const destinationUri = await storage.createFileAsync(
    permission.directoryUri,
    safeFileName,
    PDF_MIME_TYPE,
  );
  const pdfBase64 = await FileSystem.readAsStringAsync(sourceUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  await FileSystem.writeAsStringAsync(destinationUri, pdfBase64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  return destinationUri;
};

const buildSafeFileToken = (value, fallback = "Unknown") =>
  String(value || fallback)
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/[^A-Za-z0-9.-]+/g, "") || fallback;

const formatFileDate = (value = new Date()) => {
  let date = value instanceof Date ? value : null;

  if (!date) {
    const raw = String(value || "").trim();
    const slashDate = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);

    if (slashDate) {
      const [, month, day, yearValue] = slashDate;
      const year =
        yearValue.length === 2 ? Number(`20${yearValue}`) : Number(yearValue);
      date = new Date(year, Number(month) - 1, Number(day));
    } else {
      date = new Date(value);
    }
  }

  if (Number.isNaN(date.getTime())) return formatFileDate();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatReportDate = (value = new Date()) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return formatReportDate();
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
};

const getFlightLogFileName = (log = {}) => {
  const aircraft = log.rpc || log.aircraft || log.aircraftNo || "Aircraft";
  const date = log.date || log.dateAdded || log.createdAt || log.updatedAt;
  return `FlightLog_${buildSafeFileToken(aircraft, "Aircraft")}_${formatFileDate(date)}`;
};

const getMaintenanceLogFileName = (log = {}) => {
  const aircraft = log.aircraft || log.rpc || log.aircraftNo || "Aircraft";
  const date =
    log.dateDefectRectified ||
    log.dateRectified ||
    log.completedAt ||
    log.updatedAt ||
    log.createdAt;
  return `WorkDoneReport_${buildSafeFileToken(aircraft, "Aircraft")}_${formatFileDate(date)}`;
};

const getMaintenanceLogMechanicInCharge = (log = {}) =>
  log.mechanicInCharge || log.reportedBy || "";

const getMaintenanceLogInspector = (log = {}) =>
  log.inspector || log.approvedBy || "";

const getMaintenanceLogMechanicLicenseNo = (log = {}) =>
  log.mechanicLicenseNo || log.licenseNo || "";

const getMaintenanceLogInspectorLicenseNo = (log = {}) =>
  log.inspectorLicenseNo || "";

const getMaintenanceLogReportDate = (log = {}) =>
  formatReportDate(
    log.dateDefectRectified ||
      log.dateRectified ||
      log.completedAt ||
      log.updatedAt ||
      log.createdAt,
  );

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
        ? `${prefix} - ${formatLabel(key)}`
        : formatLabel(key);

      return flattenRecord(nestedValue, nextPrefix);
    });
  }

  return prefix ? [{ label: prefix, value: formatValue(value) }] : [];
};

const buildGenericHtml = ({ title, subtitle, rows, logoDataUri = "" }) => `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8" />
      <style>
        body {
          font-family: Arial, sans-serif;
          padding: 24px;
          color: #1f1f1f;
        }

        .report-header {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 18px;
        }

        .report-header img {
          width: 78px;
          height: auto;
          object-fit: contain;
        }

        h1 {
          margin: 0 0 8px;
          color: #048a25;
          font-size: 24px;
        }

        p {
          margin: 0 0 18px;
          color: #666;
          font-size: 12px;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
        }

        th, td {
          border: 1px solid #d9d9d9;
          padding: 8px;
          text-align: left;
          vertical-align: top;
          word-wrap: break-word;
          font-size: 11px;
        }

        th {
          background: #048a25;
          color: #fff;
        }

        th:first-child, td:first-child {
          width: 36%;
        }
      </style>
    </head>

    <body>
      <div class="report-header">
        ${logoDataUri ? `<img src="${logoDataUri}" alt="NGCP" />` : ""}
        <div>
          <h1>${escapeHtml(title)}</h1>
          ${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ""}
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Field</th>
            <th>Value</th>
          </tr>
        </thead>

        <tbody>
          ${rows
            .map(
              ({ label, value }) => `
                <tr>
                  <td>${escapeHtml(label)}</td>
                  <td>${escapeHtml(value)}</td>
                </tr>
              `,
            )
            .join("")}
        </tbody>
      </table>
    </body>
  </html>
`;

const simpleTable = (rows = []) => `
  <table>
    <tbody>
      ${rows
        .map(
          ([label, value]) => `
            <tr>
              <td>${escapeHtml(label)}</td>
              <td>${escapeHtml(formatValue(value))}</td>
            </tr>
          `,
        )
        .join("")}
    </tbody>
  </table>
`;

const buildMaintenanceLogHtml = (log = {}, aircraftData = null, logoDataUri = "") => {
  const workItems = (
    Array.isArray(log?.workDetails) && log.workDetails.length
      ? log.workDetails
      : [log?.correctiveActionDone, log?.defects]
  )
    .map((item) => String(item?.description || item || "").trim())
    .filter(Boolean);
  const serialNumber =
    aircraftData?.serialNumber ||
    log?.sn ||
    String(log?.aircraft || "").replace(/[^\d]/g, "") ||
    "";
  const workOrder = log?.sourceTaskId || log?.id || log?._id || "";
  const ref = aircraftData?.referenceData || {};
  const mechanicInCharge = getMaintenanceLogMechanicInCharge(log);
  const inspector = getMaintenanceLogInspector(log);
  const mechanicLicenseNo = getMaintenanceLogMechanicLicenseNo(log);
  const inspectorLicenseNo = getMaintenanceLogInspectorLicenseNo(log);
  const reportDate = getMaintenanceLogReportDate(log);
  const mechanicLicenseText = mechanicLicenseNo
    ? `${mechanicLicenseNo} - AMT`
    : "";
  const inspectorLicenseText = inspectorLicenseNo
    ? `${inspectorLicenseNo} - AMT`
    : "";

  const detailRows = (workItems.length ? workItems : [""])
    .map(
      (description, index) => `
        <tr class="work-row">
          <td class="signoff">${index + 1}</td>
          <td class="description">${escapeHtml(description)}</td>
        </tr>`,
    )
    .join("");

  const labeledCell = (label, value) => `
    <div class="meta-row">
      <span class="meta-label">${escapeHtml(label)}</span>
      <span class="meta-value">${escapeHtml(value || "")}</span>
    </div>`;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          @page { size: A4 portrait; margin: 9mm; }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            color: #111;
            font-family: Arial, Helvetica, sans-serif;
            font-size: 9pt;
          }
          .report { width: 100%; border: 1.5px solid #111; }
          .top-strip {
            height: 16pt;
            border-bottom: 1.5px solid #111;
          }
          .certification {
            padding: 12pt 12pt 0;
            line-height: 1.3;
            font-size: 9pt;
          }
          .certification-date {
            margin-top: 8pt;
            font-weight: 700;
            text-align: center;
            font-size: 10pt;
          }
          .metadata {
            display: grid;
            grid-template-columns: 27% 46% 27%;
            min-height: 60pt;
            border-bottom: 1.5px solid #111;
          }
          .meta-side { display: grid; grid-template-rows: repeat(4, 1fr); }
          .meta-row { display: flex; border-bottom: 1px solid #111; }
          .meta-row:last-child { border-bottom: 0; }
          .meta-label {
            width: 46%;
            padding: 2px 3px;
            border-right: 1px solid #111;
            font-weight: 700;
            white-space: nowrap;
          }
          .meta-value { flex: 1; padding: 2px 4px; }
          .brand {
            border-left: 1.5px solid #111;
            border-right: 1.5px solid #111;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            overflow: hidden;
          }
          .brand-logo {
            width: 118pt;
            max-width: 86%;
            height: auto;
            object-fit: contain;
          }
          .ngcp {
            font-size: 32pt;
            line-height: .9;
            font-weight: 900;
            letter-spacing: -2pt;
            color: #222;
          }
          .ngcp .accent { color: #087d4b; }
          .tagline {
            margin-top: 2pt;
            font-size: 7pt;
            font-weight: 700;
            letter-spacing: .2pt;
          }
          .title {
            min-height: 32pt;
            padding: 7pt 2mm 4pt;
            text-align: center;
            font-size: 10pt;
            line-height: 1.35;
            font-weight: 700;
            border-bottom: 1.5px solid #111;
          }
          .section-title {
            height: 16pt;
            padding: 2pt 3pt;
            font-size: 9pt;
            font-weight: 700;
            border-bottom: 1.5px solid #111;
          }
          .footer {
            border-top: 1.5px solid #111;
          }
          .signoff-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            column-gap: 8mm;
            min-height: 66pt;
            padding: 18pt 2mm 0;
          }
          .signoff-cell {
            min-height: 38pt;
            text-align: center;
          }
          .signoff-label {
            font-size: 11pt;
            font-weight: 400;
            text-align: center;
          }
          .license-line {
            margin-top: 12pt;
            font-size: 10pt;
          }
          .work-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
          .work-table td {
            border-bottom: 1px solid #111;
            vertical-align: middle;
            page-break-inside: avoid;
          }
          .work-table tr:last-child td { border-bottom: 0; }
          .signoff { width: 10%; border-right: 1px solid #111; text-align: center; }
          .description {
            padding: 3px 4px;
            line-height: 1.25;
            overflow-wrap: anywhere;
          }
          .work-row { min-height: 8mm; }
        </style>
      </head>
      <body>
        <div class="report">
          <div class="top-strip"></div>
          <div class="metadata">
            <div class="meta-side">
              ${labeledCell("ACFT TYPE:", aircraftData?.aircraftType || log?.aircraftType || "AS350 B3")}
              ${labeledCell("ACFT REG:", log?.aircraft)}
              ${labeledCell("ACFT S/N:", serialNumber)}
              ${labeledCell("W.O. #:", workOrder)}
            </div>
            <div class="brand">
              ${ngcpLogoMarkup(logoDataUri, "brand-logo")}
            </div>
            <div class="meta-side">
              ${labeledCell("AIRCRAFT TT:", ref.acftTT ?? log?.aircraftTT ?? log?.acftTT)}
              ${labeledCell("LANDING CYC:", ref.landings ?? log?.landingCycles ?? log?.landings)}
              ${labeledCell("ENGINE: TT:", ref.engTT ?? ref.acftTT ?? log?.engineTT ?? log?.engTT)}
              ${labeledCell("ENGINE CYC:", ref.n2Cycles ? `N2: ${ref.n2Cycles}` : log?.engineCycles || log?.n2Cycles)}
            </div>
          </div>
          <div class="title">WORK DONE REPORT /<br />CERTIFICATE OF RETURN TO SERVICE</div>
          <div class="section-title">DESCRIPTION OF WORK:</div>
          <table class="work-table"><tbody>${detailRows}</tbody></table>
          <div class="footer">
          <div class="certification">
            I hereby certify that unless otherwise specified, the work has been carried out in accordance with the current rules of CAAP and in respect to that work the aircraft or aircraft component is considered fit for return to service
            <div class="certification-date">Date: ${escapeHtml(reportDate)}</div>
          </div>
          <div class="signoff-grid">
            <div class="signoff-cell">
              <div class="signoff-label">Mechanic in-charge: ${escapeHtml(mechanicInCharge)}</div>
              <div class="license-line">${escapeHtml(mechanicLicenseText)}</div>
            </div>
            <div class="signoff-cell">
              <div class="signoff-label">Inspector: ${escapeHtml(inspector)}</div>
              <div class="license-line">${escapeHtml(inspectorLicenseText)}</div>
            </div>
          </div>
          </div>
        </div>
      </body>
    </html>`;
};

const flightValue = (value, fallback = "") =>
  value === null || value === undefined || value === ""
    ? fallback
    : String(value);

const isDrawableImageDataUrl = (value) =>
  typeof value === "string" &&
  /^data:image\/(png|jpe?g|webp);base64,/i.test(value);

const signatureImage = (signature, className = "signature-image") =>
  isDrawableImageDataUrl(signature)
    ? `<img class="${className}" src="${signature}" alt="" />`
    : "";

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
  ["MAIN", "gearBoxMain"],
  ["TAIL", "gearBoxTail"],
  ["MAIN", "rotorMain"],
  ["TAIL", "rotorTail"],
  ["ENGINE", "engine"],
  ["N1", "cycleN1"],
  ["N2", "cycleN2"],
  ["USAGE", "usage"],
  ["L'DING CYCLE", "landingCycle"],
];

const normalizeAircraftType = (value = "") =>
  String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

const getB412FlightLogData = (log = {}) =>
  log.b412Data || log.b412 || log.bell412Data || {};

const isB412FlightLog = (log = {}) => {
  const aircraftType = normalizeAircraftType(
    log.aircraftType ||
      log.aircraft?.aircraftType ||
      log.aircraft?.type ||
      getB412FlightLogData(log).aircraftType,
  );

  if (aircraftType) {
    return (
      aircraftType.includes("B412EP") ||
      aircraftType.includes("BELL412EP")
    );
  }

  const b412Data = getB412FlightLogData(log);
  return Boolean(
    b412Data &&
      typeof b412Data === "object" &&
      Object.keys(b412Data).length > 0,
  );
};

const firstFlightValue = (...values) =>
  values.find(
    (value) => value !== null && value !== undefined && value !== "",
  );

const getB412PassengerValue = (b412Data, log, rowIndex, legIndex) => {
  const passengerRow = b412Data.passengerRows?.[rowIndex];
  const rowLegs = Array.isArray(passengerRow)
    ? passengerRow
    : passengerRow?.legs;
  const legPassengers = log.legs?.[legIndex]?.passengers;

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

const getB412ComponentSection = (b412Data, sectionKey) =>
  b412Data.componentData?.[sectionKey] ||
  b412Data.componentTimes?.[sectionKey] ||
  {};

const getB412GroupValue = (section, groupKey, valueKey, ...aliases) =>
  firstFlightValue(
    section?.[groupKey]?.[valueKey],
    ...aliases.map((alias) => section?.[alias]),
  );

const renderB412Signature = (value) =>
  signatureImage(value) || escapeHtml(flightValue(value));

const normalizeB412Category = (value = "") =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const buildB412FlightLogHtml = (log = {}, logoDataUri = "") => {
  const b412Data = getB412FlightLogData(log);
  const legs = fitRows(log.legs || [], 6, () => ({}));
  const passengerRows = Array.from({ length: 4 }, (_, rowIndex) =>
    Array.from({ length: 6 }, (_, legIndex) =>
      getB412PassengerValue(b412Data, log, rowIndex, legIndex),
    ),
  );
  const componentSections = [
    ["BRT FORWARD", getB412ComponentSection(b412Data, "broughtForwardData")],
    ["THIS FLIGHT", getB412ComponentSection(b412Data, "thisFlightData")],
    ["TO DATE", getB412ComponentSection(b412Data, "toDateData")],
  ];
  const componentData = b412Data.componentData || {};
  const fuelRows = fitRows(
    b412Data.fuelServicing || log.b412FuelServicing || [],
    6,
    () => ({}),
  );
  const oilRows = fitRows(
    b412Data.oilServicing || log.b412OilServicing || [],
    2,
    () => ({}),
  );
  const correctionItems = fitRows(
    b412Data.correctionItems || log.b412CorrectionItems || log.workItems || [],
    3,
    () => ({}),
  );
  const populatedCategories = new Set(
    correctionItems
      .map((item) => normalizeB412Category(item.category))
      .filter(Boolean),
  );
  const serialNumber = flightValue(
    firstFlightValue(
      b412Data.serialNumber,
      b412Data.serialNo,
      log.serialNumber,
      log.serialNo,
    ),
  );
  const tailAndSerial = [flightValue(log.rpc || log.aircraft), serialNumber]
    .filter(Boolean)
    .join(" / ");
  const dueAirframe = firstFlightValue(
    componentData.airframeNextInspectionDueAt,
    b412Data.airframeNextInspectionDueAt,
    componentData.airframeNextInsp,
  );
  const dueEngine = firstFlightValue(
    componentData.engineNextInspectionDueAt,
    b412Data.engineNextInspectionDueAt,
    componentData.engineNextInsp,
  );
  const discrepancyRemarks = firstFlightValue(
    b412Data.discrepancyRemarks,
    b412Data.remarks,
    log.remarks,
  );
  const releasedName = flightValue(log.releasedBy?.name);
  const releasedLicense = flightValue(
    log.releasedBy?.licenseNo || log.releasedBy?.id,
  );
  const acceptedName = flightValue(log.acceptedBy?.name);
  const acceptedLicense = flightValue(
    log.acceptedBy?.licenseNo || log.acceptedBy?.id,
  );
  const categoryChecked = (...aliases) =>
    aliases.some((alias) => populatedCategories.has(alias));

  const componentCells = (section) => `
    <td class="center">${escapeHtml(flightValue(section.airframe))}</td>
    <td class="center">${escapeHtml(flightValue(getB412GroupValue(section, "mrGearbox", "tsn", "mrGearboxTsn", "mrGearboxTSN")))}</td>
    <td class="center">${escapeHtml(flightValue(getB412GroupValue(section, "mrGearbox", "tso", "mrGearboxTso", "mrGearboxTSO")))}</td>
    <td class="center">${escapeHtml(flightValue(getB412GroupValue(section, "tr90Gearbox", "tsn", "tr90GearboxTsn", "tr90GearboxTSN")))}</td>
    <td class="center">${escapeHtml(flightValue(getB412GroupValue(section, "tr90Gearbox", "tso", "tr90GearboxTso", "tr90GearboxTSO")))}</td>
    <td class="center">${escapeHtml(flightValue(getB412GroupValue(section, "tr42Gearbox", "tsn", "tr42GearboxTsn", "tr42GearboxTSN")))}</td>
    <td class="center">${escapeHtml(flightValue(getB412GroupValue(section, "tr42Gearbox", "tso", "tr42GearboxTso", "tr42GearboxTSO")))}</td>
    <td class="center">${escapeHtml(flightValue(section.landingCycle))}</td>
  `;

  const engineCells = (section) => `
    <td class="center">${escapeHtml(flightValue(getB412GroupValue(section, "engine1", "tsn", "engine1Tsn", "engine1TSN")))}</td>
    <td class="center">${escapeHtml(flightValue(getB412GroupValue(section, "engine1", "tso", "engine1Tso", "engine1TSO")))}</td>
    <td class="center">${escapeHtml(flightValue(getB412GroupValue(section, "engine1", "cycle", "engine1Cycle")))}</td>
    <td class="center">${escapeHtml(flightValue(getB412GroupValue(section, "engine2", "tsn", "engine2Tsn", "engine2TSN")))}</td>
    <td class="center">${escapeHtml(flightValue(getB412GroupValue(section, "engine2", "tso", "engine2Tso", "engine2TSO")))}</td>
    <td class="center">${escapeHtml(flightValue(getB412GroupValue(section, "engine2", "cycle", "engine2Cycle")))}</td>
    <td class="center">${escapeHtml(flightValue(section.sling))}</td>
    <td class="center">${escapeHtml(flightValue(section.others))}</td>
  `;

  const oilValue = (row, groupKey, valueKey, ...aliases) =>
    flightValue(
      firstFlightValue(
        row?.[groupKey]?.[valueKey],
        ...aliases.map((alias) => row?.[alias]),
      ),
    );

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          @page { size: A4 portrait; margin: 12pt 18pt; }
          * { box-sizing: border-box; }
          body {
            font-family: Arial, Helvetica, sans-serif;
            color: #111;
            margin: 0;
            font-size: 5.2pt;
            line-height: 1.04;
          }
          .sheet { width: 559pt; max-width: 100%; margin: 0 auto; }
          .header { position: relative; height: 100pt; }
          .logo {
            position: absolute; left: 4pt; top: 22pt; font-size: 18pt;
            line-height: 1; font-weight: 900; letter-spacing: -1.5pt;
          }
          .logo-image {
            position: absolute; left: 4pt; top: 21pt; width: 78pt;
            height: auto; object-fit: contain;
          }
          .logo span:first-child, .logo span:last-child { color: #068345; }
          .title {
            padding-top: 11pt; text-align: center; font-weight: 800;
            font-size: 10.5pt; line-height: 1.3; letter-spacing: .2pt;
          }
          .field {
            position: absolute; display: flex; align-items: flex-end;
            gap: 4pt; font-size: 7.4pt; font-weight: 800;
          }
          .field .line {
            display: inline-block; min-width: 106pt; border-bottom: .6pt solid #111;
            padding: 0 3pt 1pt; font-weight: 400;
          }
          .aircraft-type { left: 25pt; top: 67pt; }
          .tail-serial { left: 25pt; top: 83pt; }
          .control { right: 25pt; top: 67pt; }
          .date { right: 25pt; top: 83pt; }
          table {
            width: 559pt; border-collapse: collapse; table-layout: fixed;
            margin: 0; page-break-inside: avoid;
          }
          table + table, .due-row + table, .signature + table,
          .checks + table { margin-top: 2.2pt; }
          th, td {
            border: .45pt solid #111; padding: 1.05pt; height: 8pt;
            vertical-align: middle; overflow-wrap: anywhere;
          }
          th { background: #e5e5e5; text-align: center; font-weight: 800; }
          .center { text-align: center; }
          .bold { font-weight: 800; }
          .empty { color: transparent; }
          .section th { font-size: 5.4pt; letter-spacing: 0; }
          .flight-table col:nth-child(1) { width: 30pt; }
          .flight-table col:nth-child(2) { width: 191pt; }
          .flight-table col:nth-child(n+3) { width: 56.3pt; }
          .passenger-table col { width: 93.16pt; }
          .component-table col:nth-child(1) { width: 61pt; }
          .component-table col:nth-child(2) { width: 76pt; }
          .component-table col:nth-child(n+3):nth-child(-n+8) { width: 60pt; }
          .component-table col:nth-child(9) { width: 62pt; }
          .engine-table col:nth-child(1) { width: 61pt; }
          .engine-table col:nth-child(n+2):nth-child(-n+7) { width: 62pt; }
          .engine-table col:nth-child(8), .engine-table col:nth-child(9) { width: 63pt; }
          .fuel-table col:nth-child(1) { width: 29pt; }
          .fuel-table col:nth-child(2) { width: 50pt; }
          .fuel-table col:nth-child(n+3):nth-child(-n+7) { width: 48pt; }
          .fuel-table col:nth-child(8) { width: 82pt; }
          .fuel-table col:nth-child(9) { width: 158pt; }
          .oil-table { font-size: 4.5pt; }
          .oil-table col:first-child { width: 73pt; }
          .oil-table col:nth-child(n+2) { width: 27pt; }
          .remarks-table col:first-child { width: 559pt; }
          .work-table col:nth-child(1) { width: 65pt; }
          .work-table col:nth-child(2) { width: 75pt; }
          .work-table col:nth-child(3) { width: 260pt; }
          .work-table col:nth-child(4) { width: 100pt; }
          .work-table col:nth-child(5) { width: 59pt; }
          .due-row {
            display: grid; grid-template-columns: 1fr 1fr;
            border-left: .45pt solid #111; border-right: .45pt solid #111;
            margin-top: 2.2pt; font-weight: 800;
          }
          .due-row div { min-height: 12pt; padding: 2pt 4pt; }
          .signature {
            display: grid; grid-template-columns: 1fr 1fr;
            border: .45pt solid #111; margin-top: 2.2pt;
          }
          .signature > div {
            min-height: 26pt; padding: 2pt; text-align: center; font-weight: 800;
          }
          .signature .name {
            margin: 4pt 34pt 1pt; border-bottom: .45pt solid #111;
            min-height: 9pt; font-weight: 400;
          }
          .signature-image {
            display: block; max-width: 68pt; max-height: 12pt;
            margin: 0 auto 1pt; object-fit: contain;
          }
          .signature .signature-image { max-width: 138pt; max-height: 14pt; margin-top: 1pt; }
          .name-sign { text-align: center; }
          .checks {
            display: grid; grid-template-columns: repeat(4, 1fr);
            border: .45pt solid #111; padding: 2pt; margin-top: 2.2pt;
            font-weight: 800;
          }
          .box {
            display: inline-flex; width: 8pt; height: 8pt;
            border: .45pt solid #111; margin-right: 3pt;
            vertical-align: -1pt; align-items: center; justify-content: center;
            font-size: 5.5pt;
          }
          .remarks-body td { height: 26pt; vertical-align: top; padding: 3pt; }
        </style>
      </head>
      <body>
        <div class="sheet">
          <div class="header">
            ${
              logoDataUri
                ? `<img class="logo-image" src="${logoDataUri}" alt="NGCP" />`
                : `<div class="logo"><span>N</span>GC<span>P</span></div>`
            }
            <div class="title">
              AIRCRAFT FLIGHT LOG<br />
              ROTARY WINGED AIRCRAFT<br />
              TWIN ENGINE
            </div>
            <div class="field aircraft-type">AIRCRAFT TYPE:<span class="line">BELL 412 EP</span></div>
            <div class="field tail-serial">TAIL &amp; SERIAL NO.:<span class="line">${escapeHtml(tailAndSerial)}</span></div>
            <div class="field control">CONTROL NO.:<span class="line">${escapeHtml(flightValue(log.controlNo || log.control))}</span></div>
            <div class="field date">DATE:<span class="line">${escapeHtml(formatFlightLogDate(log.date))}</span></div>
          </div>

          <table class="flight-table">
            <colgroup>${Array.from({ length: 8 }, () => "<col />").join("")}</colgroup>
            <thead>
              <tr>
                <th rowspan="2">LEG</th><th rowspan="2">STATIONS</th>
                <th colspan="2">BLOCK TIME</th><th colspan="2">FLIGHT TIME</th>
                <th colspan="2">TOTAL TIME</th>
              </tr>
              <tr><th>ON</th><th>OFF</th><th>ON</th><th>OFF</th><th>BLOCK</th><th>FLIGHT</th></tr>
            </thead>
            <tbody>
              ${legs
                .map(
                  (leg, index) => `
                    <tr>
                      <td class="center bold">${FLIGHT_LEG_LABELS[index]}</td>
                      <td>${escapeHtml(getStationText(leg))}</td>
                      <td class="center">${escapeHtml(flightValue(leg.blockTimeOn))}</td>
                      <td class="center">${escapeHtml(flightValue(leg.blockTimeOff))}</td>
                      <td class="center">${escapeHtml(flightValue(leg.flightTimeOn))}</td>
                      <td class="center">${escapeHtml(flightValue(leg.flightTimeOff))}</td>
                      <td class="center">${escapeHtml(flightValue(firstFlightValue(leg.totalBlockTime, leg.totalTimeOn)))}</td>
                      <td class="center">${escapeHtml(flightValue(firstFlightValue(leg.totalFlightTime, leg.totalTimeOff)))}</td>
                    </tr>
                  `,
                )
                .join("")}
            </tbody>
          </table>

          <table class="section passenger-table">
            <colgroup>${Array.from({ length: 6 }, () => "<col />").join("")}</colgroup>
            <thead>
              <tr><th colspan="6">PASSENGERS</th></tr>
              <tr>${FLIGHT_LEG_LABELS.map((label) => `<th>${label} LEG</th>`).join("")}</tr>
            </thead>
            <tbody>
              ${passengerRows
                .map(
                  (row) => `<tr>${row.map((cell) => `<td class="center">${escapeHtml(cell)}</td>`).join("")}</tr>`,
                )
                .join("")}
            </tbody>
          </table>

          <table class="component-table">
            <colgroup>${Array.from({ length: 9 }, () => "<col />").join("")}</colgroup>
            <thead>
              <tr>
                <th rowspan="2"></th><th rowspan="2">AIRFRAME</th>
                <th colspan="2">M/R GEARBOX</th><th colspan="2">90 T/R GEARBOX</th>
                <th colspan="2">42 T/R GEARBOX</th><th rowspan="2">LANDING<br />CYCLE</th>
              </tr>
              <tr><th>TSN</th><th>TSO</th><th>TSN</th><th>TSO</th><th>TSN</th><th>TSO</th></tr>
            </thead>
            <tbody>
              ${componentSections
                .map(
                  ([label, section]) => `<tr><td class="bold">${label}</td>${componentCells(section)}</tr>`,
                )
                .join("")}
            </tbody>
          </table>

          <div class="due-row">
            <div>AIRFRAME NEXT INSPECTION DUE AT: ${escapeHtml(flightValue(dueAirframe))}</div>
            <div>ENGINE NEXT INSPECTION DUE AT: ${escapeHtml(flightValue(dueEngine))}</div>
          </div>

          <table class="engine-table">
            <colgroup>${Array.from({ length: 9 }, () => "<col />").join("")}</colgroup>
            <thead>
              <tr><th rowspan="2"></th><th colspan="3">ENGINE NO. 1</th><th colspan="3">ENGINE NO. 2</th><th rowspan="2">SLING</th><th rowspan="2">OTHERS</th></tr>
              <tr><th>TSN</th><th>TSO</th><th>CYCLE</th><th>TSN</th><th>TSO</th><th>CYCLE</th></tr>
            </thead>
            <tbody>
              ${componentSections
                .map(
                  ([label, section]) => `<tr><td class="bold">${label}</td>${engineCells(section)}</tr>`,
                )
                .join("")}
            </tbody>
          </table>

          <table class="section fuel-table">
            <colgroup>${Array.from({ length: 9 }, () => "<col />").join("")}</colgroup>
            <thead>
              <tr><th colspan="9">FUEL SERVICING</th></tr>
              <tr><th rowspan="2">LEG</th><th rowspan="2">CONT.<br />CHECK</th><th colspan="3">MAIN TANK</th><th colspan="2">SUPPLY</th><th rowspan="2">REMARKS</th><th rowspan="2">REFUELLER NAME &amp;<br />SIGNATURE</th></tr>
              <tr><th>REM'G</th><th>ADDED</th><th>TOTAL</th><th>SYS 1</th><th>SYS 2</th></tr>
            </thead>
            <tbody>
              ${fuelRows
                .map(
                  (fuel, index) => `
                    <tr>
                      <td class="center bold">${FLIGHT_LEG_LABELS[index]}</td>
                      <td class="center">${escapeHtml(flightValue(fuel.contCheck))}</td>
                      <td class="center">${escapeHtml(flightValue(firstFlightValue(fuel.mainTankRemaining, fuel.mainRemG)))}</td>
                      <td class="center">${escapeHtml(flightValue(firstFlightValue(fuel.mainTankAdded, fuel.mainAdd)))}</td>
                      <td class="center">${escapeHtml(flightValue(firstFlightValue(fuel.mainTankTotal, fuel.mainTotal)))}</td>
                      <td class="center">${escapeHtml(flightValue(firstFlightValue(fuel.supplySystem1, fuel.sys1)))}</td>
                      <td class="center">${escapeHtml(flightValue(firstFlightValue(fuel.supplySystem2, fuel.sys2)))}</td>
                      <td>${escapeHtml(flightValue(fuel.remarks))}</td>
                      <td class="name-sign">${renderB412Signature(fuel.signature)}${fuel.signature && (fuel.refuellerName || fuel.refuelerName) ? " / " : ""}${escapeHtml(flightValue(fuel.refuellerName || fuel.refuelerName))}</td>
                    </tr>
                  `,
                )
                .join("")}
            </tbody>
          </table>

          <table class="section oil-table">
            <colgroup>${Array.from({ length: 19 }, () => "<col />").join("")}</colgroup>
            <thead>
              <tr><th colspan="19">OIL SERVICING</th></tr>
              <tr>
                <th rowspan="2">MECHANIC<br />SIGNATURE</th>
                <th colspan="3">ENGINE NO. 1</th><th colspan="3">ENGINE NO. 2</th>
                <th colspan="3">M/R GEARBOX</th><th colspan="3">REDUCTION G/B</th>
                <th colspan="3">42 T/R GEARBOX</th><th colspan="3">90 T/R GEARBOX</th>
              </tr>
              <tr>${Array.from({ length: 6 }, () => "<th>REM</th><th>ADD</th><th>TOT</th>").join("")}</tr>
            </thead>
            <tbody>
              ${oilRows
                .map(
                  (oil) => `
                    <tr>
                      <td class="name-sign">${renderB412Signature(oil.mechanicSignature)}</td>
                      <td class="center">${escapeHtml(oilValue(oil, "engine1", "remaining", "engine1Rem"))}</td>
                      <td class="center">${escapeHtml(oilValue(oil, "engine1", "added", "engine1Add"))}</td>
                      <td class="center">${escapeHtml(oilValue(oil, "engine1", "total", "engine1Tot"))}</td>
                      <td class="center">${escapeHtml(oilValue(oil, "engine2", "remaining", "engine2Rem"))}</td>
                      <td class="center">${escapeHtml(oilValue(oil, "engine2", "added", "engine2Add"))}</td>
                      <td class="center">${escapeHtml(oilValue(oil, "engine2", "total", "engine2Tot"))}</td>
                      <td class="center">${escapeHtml(oilValue(oil, "mrGearbox", "remaining", "mrGearboxRem"))}</td>
                      <td class="center">${escapeHtml(oilValue(oil, "mrGearbox", "added", "mrGearboxAdd"))}</td>
                      <td class="center">${escapeHtml(oilValue(oil, "mrGearbox", "total", "mrGearboxTot"))}</td>
                      <td class="center">${escapeHtml(oilValue(oil, "reductionGearbox", "remaining", "reductionGearboxRem"))}</td>
                      <td class="center">${escapeHtml(oilValue(oil, "reductionGearbox", "added", "reductionGearboxAdd"))}</td>
                      <td class="center">${escapeHtml(oilValue(oil, "reductionGearbox", "total", "reductionGearboxTot"))}</td>
                      <td class="center">${escapeHtml(oilValue(oil, "tr42Gearbox", "remaining", "gearbox42Rem"))}</td>
                      <td class="center">${escapeHtml(oilValue(oil, "tr42Gearbox", "added", "gearbox42Add"))}</td>
                      <td class="center">${escapeHtml(oilValue(oil, "tr42Gearbox", "total", "gearbox42Tot"))}</td>
                      <td class="center">${escapeHtml(oilValue(oil, "tr90Gearbox", "remaining", "gearbox90Rem"))}</td>
                      <td class="center">${escapeHtml(oilValue(oil, "tr90Gearbox", "added", "gearbox90Add"))}</td>
                      <td class="center">${escapeHtml(oilValue(oil, "tr90Gearbox", "total", "gearbox90Tot"))}</td>
                    </tr>
                  `,
                )
                .join("")}
            </tbody>
          </table>

          <div class="signature">
            <div>
              RELEASED BY:
              ${signatureImage(log.releasedBy?.signature)}
              <div class="name">${escapeHtml([releasedName, releasedLicense].filter(Boolean).join(" / "))}</div>
              ENGINEER / CERTIFICATE
            </div>
            <div>
              ACCEPTED BY:
              ${signatureImage(log.acceptedBy?.signature)}
              <div class="name">${escapeHtml([acceptedName, acceptedLicense].filter(Boolean).join(" / "))}</div>
              PILOT-IN-COMMAND / CERTIFICATE
            </div>
          </div>

          <table class="section remarks-table">
            <colgroup><col /></colgroup>
            <thead><tr><th>DISCREPANCY / REMARKS</th></tr></thead>
            <tbody class="remarks-body"><tr><td>${escapeHtml(flightValue(discrepancyRemarks))}</td></tr></tbody>
          </table>

          <div class="checks">
            <div><span class="box">${categoryChecked("discrepancycorrection", "discrepancy") ? "X" : ""}</span>DISCREPANCY CORRECTION</div>
            <div><span class="box">${categoryChecked("sbadcompliance", "sbad") ? "X" : ""}</span>SB/AD COMPLIANCE</div>
            <div><span class="box">${categoryChecked("inspection") ? "X" : ""}</span>INSPECTION</div>
            <div><span class="box">${categoryChecked("others", "other") ? "X" : ""}</span>OTHERS</div>
          </div>

          <table class="work-table">
            <colgroup>${Array.from({ length: 5 }, () => "<col />").join("")}</colgroup>
            <thead><tr><th>DATE</th><th>ACFT T/T</th><th>WORK DONE</th><th>NAME/SIGN</th><th>CERT. NO.</th></tr></thead>
            <tbody>
              ${correctionItems
                .map(
                  (item) => `
                    <tr>
                      <td class="center">${escapeHtml(formatFlightLogDate(item.date))}</td>
                      <td class="center">${escapeHtml(flightValue(item.aircraftTotalTime || item.aircraftTT))}</td>
                      <td>${escapeHtml(flightValue(item.workDone || item.description))}</td>
                      <td class="name-sign">${renderB412Signature(item.nameSign || item.signature || item.name)}</td>
                      <td class="center">${escapeHtml(flightValue(item.certificateNo || item.certificateNumber))}</td>
                    </tr>
                  `,
                )
                .join("")}
            </tbody>
          </table>
        </div>
      </body>
    </html>
  `;
};

const buildFlightLogHtml = (log = {}, logoDataUri = "") => {
  const legs = fitRows(log.legs || [], 6, () => ({}));
  const passengerRows = Array.from({ length: 4 }, (_, rowIndex) => [
    rowIndex === 0 ? formatFlightLogDate(log.date) : "",
    ...PASSENGER_LEG_LABELS.map((_, legIndex) =>
      flightValue(log.legs?.[legIndex]?.passengers),
    ),
  ]);
  const componentSections = [
    ["BRT FRW", getComponentSection(log, "broughtForwardData")],
    ["THIS FLT", getComponentSection(log, "thisFlightData")],
    ["TO DATE", getComponentSection(log, "toDateData")],
  ];
  const bf = getComponentSection(log, "broughtForwardData");
  const tf = getComponentSection(log, "thisFlightData");
  const fuelRows = fitRows(log.fuelServicing || [], 4, () => ({}));
  const oilRows = fitRows(log.oilServicing || [], 4, () => ({}));
  const workItems = fitRows(log.workItems || [], 5, () => ({}));

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          @page { size: A4 portrait; margin: 14pt 18pt; }
          * { box-sizing: border-box; }
          body {
            font-family: Arial, Helvetica, sans-serif;
            color: #111;
            margin: 0;
            font-size: 5.5pt;
            line-height: 1.05;
          }
          .sheet {
            width: 559pt;
            max-width: 100%;
            margin: 0 auto;
          }
          .header {
            position: relative;
            height: 118pt;
          }
          .logo {
            position: absolute;
            left: 4pt;
            top: 42pt;
            font-size: 18pt;
            line-height: 1;
            font-weight: 900;
            letter-spacing: -1.5pt;
          }
          .logo-image {
            position: absolute;
            left: 4pt;
            top: 42pt;
            width: 78pt;
            height: auto;
            object-fit: contain;
          }
          .logo span:first-child,
          .logo span:last-child { color: #068345; }
          .title {
            padding-top: 24pt;
            text-align: center;
            font-weight: 800;
            font-size: 12pt;
            line-height: 1.35;
            letter-spacing: .2pt;
          }
          .field {
            position: absolute;
            display: flex;
            align-items: flex-end;
            gap: 4pt;
            font-size: 8.5pt;
            font-weight: 800;
          }
          .field .line {
            display: inline-block;
            min-width: 104pt;
            border-bottom: .6pt solid #111;
            padding: 0 4pt 1pt;
            font-weight: 400;
          }
          .aircraft-type { left: 4pt; top: 86pt; }
          .rpc { left: 4pt; top: 102pt; }
          .date { right: 25pt; top: 78pt; }
          .control { right: 25pt; top: 94pt; }
          table {
            width: 559pt;
            border-collapse: collapse;
            table-layout: fixed;
            margin: 0;
            page-break-inside: avoid;
          }
          table + table,
          .due-row + table,
          .signature + table,
          .checks + table {
            margin-top: 3pt;
          }
          .flight-table col:nth-child(1) { width: 38pt; }
          .flight-table col:nth-child(2) { width: 227pt; }
          .flight-table col:nth-child(3),
          .flight-table col:nth-child(4),
          .flight-table col:nth-child(5),
          .flight-table col:nth-child(6) { width: 44pt; }
          .flight-table col:nth-child(7),
          .flight-table col:nth-child(8) { width: 59pt; }
          .passenger-table col:first-child { width: 71pt; }
          .passenger-table col:not(:first-child) { width: 61pt; }
          .component-table col:first-child { width: 48pt; }
          .component-table col:nth-child(n+2):nth-child(-n+10) { width: 51pt; }
          .component-table col:nth-child(11) { width: 52pt; }
          .fuel-table col:nth-child(1) { width: 36pt; }
          .fuel-table col:nth-child(2) { width: 54pt; }
          .fuel-table col:nth-child(3),
          .fuel-table col:nth-child(4),
          .fuel-table col:nth-child(6) { width: 68pt; }
          .fuel-table col:nth-child(5) { width: 62pt; }
          .fuel-table col:nth-child(7),
          .fuel-table col:nth-child(8) { width: 57pt; }
          .fuel-table col:nth-child(9) { width: 89pt; }
          .oil-table col:nth-child(1) { width: 32pt; }
          .oil-table col:nth-child(2) { width: 48pt; }
          .oil-table col:nth-child(n+3):nth-child(-n+11) { width: 35pt; }
          .oil-table col:nth-child(12) { width: 90pt; }
          .oil-table col:nth-child(13) { width: 74pt; }
          .remarks-table col:first-child { width: 445pt; }
          .remarks-table col:last-child { width: 114pt; }
          .work-table col:nth-child(1) { width: 70pt; }
          .work-table col:nth-child(2) { width: 80pt; }
          .work-table col:nth-child(3) { width: 255pt; }
          .work-table col:nth-child(4) { width: 96pt; }
          .work-table col:nth-child(5) { width: 58pt; }
          th, td {
            border: .45pt solid #111;
            padding: 1.2pt;
            height: 8.4pt;
            vertical-align: middle;
            overflow-wrap: anywhere;
          }
          th {
            background: #e5e5e5;
            text-align: center;
            font-weight: 800;
          }
          .center { text-align: center; }
          .bold { font-weight: 800; }
          .section th {
            font-size: 5.5pt;
            letter-spacing: 0;
            padding: 1.2pt;
          }
          .empty { color: transparent; }
          .due-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            border-left: .45pt solid #111;
            border-right: .45pt solid #111;
            margin-top: 3pt;
            font-weight: 800;
          }
          .due-row div {
            min-height: 13pt;
            padding: 2pt 4pt;
          }
          .signature {
            display: grid;
            grid-template-columns: 1fr 1fr;
            border-left: .45pt solid #111;
            border-right: .45pt solid #111;
            border-bottom: .45pt solid #111;
            margin-top: 3pt;
          }
          .signature > div {
            min-height: 28pt;
            padding: 3pt;
            text-align: center;
            font-weight: 800;
          }
          .signature .name {
            margin: 8pt 42pt 2pt;
            border-bottom: .45pt solid #111;
            min-height: 9pt;
            font-weight: 400;
          }
          .signature-image {
            display: block;
            max-width: 68pt;
            max-height: 14pt;
            margin: 0 auto 1pt;
            object-fit: contain;
          }
          .signature .signature-image {
            max-width: 138pt;
            max-height: 16pt;
            margin-top: 2pt;
          }
          .name-sign {
            text-align: center;
          }
          .checks {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            border-left: .45pt solid #111;
            border-right: .45pt solid #111;
            border-bottom: .45pt solid #111;
            padding: 3pt 2pt;
            margin-top: 3pt;
            font-weight: 800;
          }
          .box {
            display: inline-block;
            width: 8pt;
            height: 8pt;
            border: .45pt solid #111;
            margin-right: 4pt;
            vertical-align: -1pt;
          }
        </style>
      </head>
      <body>
        <div class="sheet">
          <div class="header">
            ${
              logoDataUri
                ? `<img class="logo-image" src="${logoDataUri}" alt="NGCP" />`
                : `<div class="logo"><span>N</span>GC<span>P</span></div>`
            }
            <div class="title">
              AIRCRAFT FLIGHT LOG - RW<br />
              ROTARY WINGED AIRCRAFT<br />
              SINGLE ENGINE
            </div>
            <div class="field aircraft-type">AIRCRAFT TYPE:<span class="line">${escapeHtml(flightValue(log.aircraftType))}</span></div>
            <div class="field rpc">RP-C:<span class="line">${escapeHtml(flightValue(log.rpc))}</span></div>
            <div class="field date">DATE:<span class="line">${escapeHtml(formatFlightLogDate(log.date))}</span></div>
            <div class="field control">CONTROL NO.:<span class="line">${escapeHtml(flightValue(log.controlNo || log.control))}</span></div>
          </div>

          <table class="flight-table">
            <colgroup>
              ${Array.from({ length: 8 }, () => "<col />").join("")}
            </colgroup>
          <thead>
            <tr>
                <th rowspan="2">LEG</th>
                <th rowspan="2">STATION</th>
                <th colspan="2">BLOCK TIME</th>
                <th colspan="2">FLIGHT TIME</th>
                <th colspan="2">TOTAL TIME</th>
              </tr>
              <tr>
                <th>ON</th>
                <th>OFF</th>
                <th>ON</th>
                <th>OFF</th>
                <th>BLOCK</th>
                <th>FLIGHT</th>
            </tr>
          </thead>
          <tbody>
              ${legs
                .map(
                  (leg, index) => `
                    <tr>
                      <td class="center bold">${FLIGHT_LEG_LABELS[index]}</td>
                      <td>${escapeHtml(getStationText(leg))}</td>
                      <td class="center">${escapeHtml(flightValue(leg.blockTimeOn))}</td>
                      <td class="center">${escapeHtml(flightValue(leg.blockTimeOff))}</td>
                      <td class="center">${escapeHtml(flightValue(leg.flightTimeOn))}</td>
                      <td class="center">${escapeHtml(flightValue(leg.flightTimeOff))}</td>
                      <td class="center">${escapeHtml(flightValue(leg.totalTimeOn))}</td>
                      <td class="center">${escapeHtml(flightValue(leg.totalTimeOff))}</td>
                    </tr>
                  `,
                )
                .join("")}
          </tbody>
        </table>

          <table class="section passenger-table">
          <colgroup>${Array.from({ length: 9 }, () => "<col />").join("")}</colgroup>
          <thead>
              <tr><th colspan="9">PASSENGERS</th></tr>
              <tr>
                <th>DATE</th>
                ${PASSENGER_LEG_LABELS.map((label) => `<th>${label}</th>`).join("")}
              </tr>
          </thead>
          <tbody>
              ${passengerRows
                .map(
                  (row) => `
                    <tr>
                      ${row.map((cell) => `<td class="center">${escapeHtml(cell)}</td>`).join("")}
                    </tr>
                  `,
                )
                .join("")}
          </tbody>
        </table>

          <table class="component-table">
            <colgroup>${Array.from({ length: 11 }, () => "<col />").join("")}</colgroup>
            <thead>
              <tr>
                <th rowspan="2"></th>
                <th rowspan="2">A/FRAME</th>
                <th colspan="2">GEAR BOX</th>
                <th colspan="2">ROTOR</th>
                <th rowspan="2">ENGINE</th>
                <th colspan="2">CYCLE</th>
                <th rowspan="2">USAGE</th>
                <th rowspan="2">L'DING<br />CYCLE</th>
              </tr>
              <tr>
                <th>MAIN</th><th>TAIL</th><th>MAIN</th><th>TAIL</th><th>N1</th><th>N2</th>
              </tr>
            </thead>
            <tbody>
              ${componentSections
                .map(
                  ([label, section]) => `
                    <tr>
                      <td class="bold">${label}</td>
                      ${COMPONENT_TIME_FIELDS.map(([, key]) => `<td class="center">${escapeHtml(flightValue(section[key]))}</td>`).join("")}
                    </tr>
                  `,
                )
                .join("")}
            </tbody>
          </table>

          <div class="due-row">
            <div>AIRFRAME NEXT INSP. DUE AT: ${escapeHtml(flightValue(tf.airframeNextInsp || bf.airframeNextInsp))}</div>
            <div>ENGINE NEXT INSP. DUE AT: ${escapeHtml(flightValue(tf.engineNextInsp || bf.engineNextInsp))}</div>
          </div>

          <table class="section fuel-table">
            <colgroup>${Array.from({ length: 9 }, () => "<col />").join("")}</colgroup>
            <thead>
              <tr><th colspan="9">FUEL SERVICING</th></tr>
              <tr>
                <th rowspan="2">LEG</th><th rowspan="2">DATE</th><th rowspan="2">CONT<br />CHECK</th>
                <th colspan="3">MAIN</th><th colspan="2">FUEL</th><th rowspan="2">REFUELLER<br />NAME/SIGN</th>
              </tr>
              <tr><th>REM/G</th><th>ADD</th><th>TOTAL</th><th>DRUM</th><th>TRUCK</th></tr>
            </thead>
            <tbody>
              ${fuelRows
                .map(
                  (fuel, index) => `
                    <tr>
                      <td class="center bold">${FLIGHT_LEG_LABELS[index]}</td>
                      <td class="center">${escapeHtml(formatFlightLogDate(fuel.date))}</td>
                      <td class="center">${escapeHtml(flightValue(fuel.contCheck))}</td>
                      <td class="center">${escapeHtml(flightValue(fuel.mainRemG))}</td>
                      <td class="center">${escapeHtml(flightValue(fuel.mainAdd))}</td>
                      <td class="center">${escapeHtml(flightValue(fuel.mainTotal))}</td>
                      <td class="center">${fuel.fuelType === "drum" ? "/" : ""}</td>
                      <td class="center">${fuel.fuelType === "truck" || fuel.fuelType === "bowser" ? "/" : ""}</td>
                      <td class="center name-sign">${signatureImage(fuel.signature)}${escapeHtml(flightValue(fuel.refuelerName))}</td>
                    </tr>
                  `,
                )
                .join("")}
            </tbody>
          </table>

          <table class="section oil-table">
            <colgroup>${Array.from({ length: 13 }, () => "<col />").join("")}</colgroup>
            <thead>
              <tr><th colspan="13">OIL SERVICING</th></tr>
              <tr>
                <th rowspan="2">LEG</th><th rowspan="2">DATE</th><th colspan="3">ENGINE</th>
                <th colspan="3">M/R<br />G/BOX</th><th colspan="3">T/R<br />G/BOX</th>
                <th rowspan="2">REMARKS</th><th rowspan="2">SIGN</th>
              </tr>
              <tr><th>REM</th><th>ADD</th><th>TOT</th><th>REM</th><th>ADD</th><th>TOT</th><th>REM</th><th>ADD</th><th>TOT</th></tr>
            </thead>
            <tbody>
              ${oilRows
                .map(
                  (oil, index) => `
                    <tr>
                      <td class="center bold">${FLIGHT_LEG_LABELS[index]}</td>
                      <td class="center">${escapeHtml(formatFlightLogDate(oil.date))}</td>
                      <td class="center">${escapeHtml(flightValue(oil.engineRem))}</td>
                      <td class="center">${escapeHtml(flightValue(oil.engineAdd))}</td>
                      <td class="center">${escapeHtml(flightValue(oil.engineTot))}</td>
                      <td class="center">${escapeHtml(flightValue(oil.mrGboxRem))}</td>
                      <td class="center">${escapeHtml(flightValue(oil.mrGboxAdd))}</td>
                      <td class="center">${escapeHtml(flightValue(oil.mrGboxTot))}</td>
                      <td class="center">${escapeHtml(flightValue(oil.trGboxRem))}</td>
                      <td class="center">${escapeHtml(flightValue(oil.trGboxAdd))}</td>
                      <td class="center">${escapeHtml(flightValue(oil.trGboxTot))}</td>
                      <td>${escapeHtml(flightValue(oil.remarks))}</td>
                      <td class="center name-sign">${signatureImage(oil.signature)}</td>
                    </tr>
                  `,
                )
                .join("")}
          </tbody>
        </table>

          <div class="signature">
            <div>
              RELEASED BY:
              ${signatureImage(log.releasedBy?.signature)}
              <div class="name">${escapeHtml(flightValue(log.releasedBy?.name))}</div>
              ENGINEER / CERTIFICATE
            </div>
            <div>
              ACCEPTED BY:
              ${signatureImage(log.acceptedBy?.signature)}
              <div class="name">${escapeHtml(flightValue(log.acceptedBy?.name))}</div>
              PILOT-IN-COMMAND / CERTIFICATE
            </div>
          </div>

          <table class="section remarks-table">
            <colgroup><col /><col /></colgroup>
            <thead><tr><th>DISCREPANCY / REMARKS</th><th>SLING</th></tr></thead>
            <tbody>
              <tr><td>${escapeHtml(flightValue(log.remarks))}</td><td>${escapeHtml(flightValue(log.sling))}</td></tr>
              <tr><td class="empty">.</td><td class="empty">.</td></tr>
              <tr><td class="empty">.</td><td class="empty">.</td></tr>
              <tr><td class="empty">.</td><td class="empty">.</td></tr>
            </tbody>
          </table>

          <div class="checks">
            <div><span class="box"></span>DISCREPANCY CORRECTION</div>
            <div><span class="box"></span>SB/AD COMPLIANCE</div>
            <div><span class="box"></span>INSPECTION</div>
            <div><span class="box"></span>OTHERS</div>
          </div>

          <table class="work-table">
            <colgroup>${Array.from({ length: 5 }, () => "<col />").join("")}</colgroup>
            <thead>
              <tr><th>DATE</th><th>ACFT / T /</th><th>WORK DONE</th><th>NAME / SIGN</th><th>CERT. NO.</th></tr>
            </thead>
            <tbody>
              ${workItems
                .map(
                  (item) => `
                    <tr>
                      <td class="center">${escapeHtml(formatFlightLogDate(item.date))}</td>
                      <td class="center">${escapeHtml(flightValue(item.aircraft || log.rpc))}</td>
                      <td>${escapeHtml(flightValue(item.workDone || item.description))}</td>
                      <td class="name-sign">${signatureImage(item.signature)}${escapeHtml(flightValue(item.name || item.performedBy))}</td>
                      <td class="center">${escapeHtml(flightValue(item.certificateNumber))}</td>
                    </tr>
                  `,
                )
                .join("")}
            </tbody>
          </table>
        </div>
      </body>
    </html>
  `;
};

const getChecklistValue = (inspection, item) =>
  inspection?.[item.key] === true ? "Checked" : "";

const sectionTitle = (title) => `
  <tr>
    <td colspan="4" class="section-title">${escapeHtml(title)}</td>
  </tr>
`;

const inspectionRow = (number, item, inspection) => {
  const status = getChecklistValue(inspection, item);
  const itemText = item.label ? `${item.title} - ${item.label}` : item.title;

  return `
    <tr>
      <td class="number-cell">${escapeHtml(number)}</td>
      <td>${escapeHtml(itemText)}</td>
      <td class="blank-cell">${escapeHtml(status || "__________")}</td>
      <td class="blank-cell">__________</td>
    </tr>
  `;
};

const baseInspectionStyles = `
  body {
    font-family: Arial, sans-serif;
    padding: 20px;
    font-size: 10.5px;
    color: #000;
  }

  h1 {
    text-align: center;
    font-size: 17px;
    margin: 0 0 18px;
    text-transform: uppercase;
  }

  .top-info {
    display: flex;
    justify-content: space-between;
    margin-bottom: 14px;
    font-size: 12px;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
  }

  th, td {
    border: 1px solid #000;
    padding: 5px;
    vertical-align: top;
    word-wrap: break-word;
  }

  th {
    text-align: center;
    background: #efefef;
    font-weight: bold;
  }

  .number-cell {
    width: 7%;
    text-align: center;
  }

  .blank-cell {
    width: 16%;
    text-align: center;
    white-space: nowrap;
  }

  .section-title {
    background: #d9ead3;
    font-weight: bold;
    text-transform: uppercase;
    font-size: 11px;
  }

  .signature-section {
    margin-top: 34px;
    display: flex;
    justify-content: space-between;
    gap: 45px;
  }

  .signature-box {
    width: 48%;
    text-align: center;
  }

  .signature-box.single {
    width: 55%;
  }

  .signature-name {
    border-bottom: 1px solid #000;
    min-height: 27px;
    margin: 8px 0 7px;
    padding: 8px 4px 2px;
    text-align: center;
  }

  .form-field {
    display: flex;
    align-items: flex-end;
    justify-content: center;
    gap: 5px;
    margin-top: 9px;
    text-align: left;
    white-space: nowrap;
  }

  .field-line {
    display: inline-block;
    flex: 0 0 105px;
    width: 105px;
    max-width: 105px;
    min-height: 16px;
    padding: 0 3px 2px;
    border-bottom: 1px solid #000;
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
  }

  .date-value {
    display: inline-block;
    width: 82px;
    min-width: 82px;
    max-width: 82px;
    padding: 0 3px 2px;
    border-bottom: 1px solid #000;
    text-align: center;
    white-space: nowrap;
    line-height: 14px;
  }

  .footer {
    margin-top: 26px;
    font-size: 9px;
    display: flex;
    justify-content: space-between;
  }
`;

const PRE_INSPECTION_SECTIONS = [
  {
    title: "Station 1",
    items: [
      {
        key: "station1_transparentPanels",
        title: "Transparent Panels",
        label: "Condition - Cleanliness",
      },
      {
        key: "station1_engineOilCooler",
        title: "Engine oil cooler air inlet",
        label: "Check no obstruction nor debris",
      },
      {
        key: "station1_sideSlipIndicator",
        title: "Side slip indicator",
        label: "Condition",
      },
      {
        key: "station1_pitotTube",
        title: "Pitot tube",
        label: "Cover removed - Condition",
      },
      {
        key: "station1_landingLights",
        title: "Landing lights",
        label: "Condition",
      },
    ],
  },
  {
    title: "Station 2",
    items: [
      {
        key: "station2_frontDoor",
        title: "Front door",
        label: "Condition jettison system check",
      },
      {
        key: "station2_rearDoor",
        title: "Rear door",
        label: "Condition, closed, or opened lock (sliding door)",
      },
      {
        key: "station2_leftCargoDoorOpen",
        title: "Left cargo door",
        label: "Open",
      },
      {
        key: "station2_loadsObjects",
        title: "Loads and objects carried",
        label: "Secured",
      },
      {
        key: "station2_leftCargoDoorClosed",
        title: "Left cargo door",
        label: "Closed, locked",
      },
      {
        key: "station2_fuelTank",
        title: "Fuel tank and system",
        label: "Filler plug closed, Tank sump drained",
      },
      {
        key: "station1_mgbCowl",
        title: "MGB cowl",
        label: "MGB oil level - Cowl locked",
      },
      {
        key: "station1_lowerFairings",
        title: "All lower fairings panels",
        label: "Locked",
      },
      {
        key: "station1_landingGear",
        title: "Landing gear and footstep",
        label: "Secure - Visual Check",
      },
      {
        key: "station1_staticPorts",
        title: "Static ports",
        label: "Clear, covers removed",
      },
      {
        key: "station1_oatSensor",
        title: "OAT sensor, antennas",
        label: "Condition",
      },
      {
        key: "station1_mainRotor",
        title: "Main rotor head blades",
        label: "Visual inspection, no impact",
      },
      {
        key: "station1_engineAirIntake",
        title: "Engine air intake",
        label: "Clear (water, snow foreign object)",
      },
      { key: "station1_engineCowl", title: "Engine cowl", label: "Locked" },
      {
        key: "station1_exhaustCover",
        title: "Exhaust cover",
        label: "Removed",
      },
      {
        key: "station1_rearCargoDoorOpen",
        title: "Rear cargo door",
        label: "Opened",
      },
      {
        key: "station1_loadsObjects",
        title: "Loads and object carried",
        label: "Secured",
      },
      { key: "station1_elt", title: "ELT", label: "Check ARMED" },
      {
        key: "station1_rearCargoDoorClosed",
        title: "Rear cargo door",
        label: "Closed, locked",
      },
      {
        key: "station1_oilDrain",
        title: "Oil drain",
        label: "No oil under scupper",
      },
    ],
  },
  {
    title: "Station 3",
    items: [
      {
        key: "station3_heatShield",
        title: "Heat shield on tail drive",
        label: "Condition, attachment",
      },
      {
        key: "station3_tailBoom",
        title: "Tail boom, antennas",
        label: "Condition - Fairings fasteners locked",
      },
      {
        key: "station3_stabilizer",
        title: "Stabilizer, fin, external lights",
        label: "General condition",
      },
      {
        key: "station3_tailRotorGuard",
        title: "Tail rotor guard (if fitted)",
        label: "Condition, attachment",
      },
      {
        key: "station3_tgbFairing",
        title: "TGB fairing",
        label: "Secured, fasteners locked",
      },
      { key: "station3_tgbOilLevel", title: "TGB oil level", label: "Checked" },
      {
        key: "station3_tailSkid",
        title: "Tail skid",
        label: "Condition, attachment",
      },
      {
        key: "station3_flexibleCoupling",
        title: "Flexible Coupling",
        label: "Visual Check No Crack",
      },
    ],
  },
  {
    title: "Sling",
    items: [
      {
        key: "sling_sling",
        title: "Sling",
        label: "Security - General condition",
      },
      {
        key: "sling_cablePins",
        title: "Cable and Pins",
        label: "Condition, attachment points",
      },
    ],
  },
  {
    title: "Floats",
    items: [
      {
        key: "floats_lhRh",
        title: "LH & RH Floats",
        label: "Security - General Condition",
      },
      {
        key: "floats_cylinder",
        title: "Cylinder",
        label: "Pressure & Condition, attachment points",
      },
      {
        key: "floats_hoses",
        title: "Hoses",
        label: "Condition, attachment points",
      },
    ],
  },
  {
    title: "Mandatory Onboard",
    items: [
      {
        key: "onboard_firstAid",
        title: "First Aid Kit",
        label: "Condition, no expired",
      },
      {
        key: "onboard_lifeVest",
        title: "Life Vest",
        label: "Condition, cleanliness & no damage",
      },
      {
        key: "onboard_lifeRaft",
        title: "Life-raft",
        label: "Condition, cleanliness & no damage",
      },
      {
        key: "onboard_axl",
        title: "AXL",
        label: "Security - General Condition",
      },
      {
        key: "onboard_fireExt",
        title: "Fire Extinguisher",
        label: "Security - General Condition",
      },
      {
        key: "onboard_certAirworthiness",
        title: "Certificate of Airworthiness",
        label: "Onboard",
      },
      {
        key: "onboard_certRegistration",
        title: "Certificate of Registration",
        label: "Onboard",
      },
      { key: "onboard_radioLicense", title: "Radio License", label: "Onboard" },
      {
        key: "onboard_flightLogbook",
        title: "Flight Logbook",
        label: "Onboard",
      },
    ],
  },
];

const POST_INSPECTION_SECTIONS = [
  {
    title: "Station 1",
    items: [
      {
        key: "station1_transparentPanels_condition",
        title: "Transparent Panels",
        label: "Condition, no cracks, cleanliness",
      },
      {
        key: "station1_transparentPanels_clean",
        title: "Transparent Panels",
        label: "Clean if necessary",
      },
      {
        key: "station1_doorsPillars_condition",
        title: "Doors pillars",
        label: "Condition, no crack",
      },
      {
        key: "station1_sideSlipIndicator_condition",
        title: "Side slip indicator",
        label: "Condition, blanking cap removed or fitted as necessary",
      },
      {
        key: "station1_sideSlipIndicator2_condition",
        title: "Side slip indicator",
        label: "Condition",
      },
      {
        key: "station1_mgbEngineOilCooler_condition",
        title: "MGB - Engine oil cooler inlet",
        label:
          "Condition, no obstruction or debris, blanking removed or fitted as necessary",
      },
    ],
  },
  {
    title: "Station 2",
    items: [
      {
        key: "station2_frontDoorJettison_condition",
        title: "Front door jettison system",
        label: "Condition, no crack on external jettison lever",
      },
      {
        key: "station2_leftCabinAccess_condition",
        title: "Left cabin access doors",
        label: "Condition, security, locking, no abnormal freeplay",
      },
      {
        key: "station2_landingGear_condition",
        title: "Landing gear",
        label:
          "Condition of crosstubes, skids, wear resistant plates, footstep attachment",
      },
      {
        key: "station2_staticPressure_condition",
        title: "Static pressure points",
        label: "Condition, blanking removed or fitted as necessary",
      },
      {
        key: "station2_oatProbe_condition",
        title: "OAT probe",
        label: "Condition, attachment",
      },
      {
        key: "station2_antennas_condition",
        title: "Antennas under belly",
        label: "Condition",
      },
      {
        key: "station2_lights_condition",
        title: "Landing and taxiing lights",
        label: "Condition",
      },
      {
        key: "station2_lowerCowlings_condition",
        title: "Lower cowlings",
        label: "Condition, security",
      },
      {
        key: "station2_leftCargoDoorOpen_opening",
        title: "Left cargo door",
        label: "Opening, condition, attachment points, no abnormal freeplay",
      },
      {
        key: "station2_leftCargoDoorClosed_closed",
        title: "Left cargo door",
        label: "Closed and secured",
      },
      {
        key: "station2_fuelTank_condition",
        title: "Fuel tank",
        label:
          "Filler plug closed - Tank sump drained (before first flight of the day and any aircraft displacement)",
      },
      {
        key: "station2_rearCargoDoorOpen_opening",
        title: "Rear cargo door",
        label: "Opening, condition, attachment points, no abnormal freeplay",
      },
      {
        key: "station2_rearCargoBay_harness",
        title: "Rear cargo bay",
        label: "Harness condition",
      },
      {
        key: "station2_elt_condition",
        title: "ELT",
        label: 'Condition, security, "ARM" or "OFF" as necessary',
      },
      {
        key: "station2_rearCargoDoorClosed_closed",
        title: "Rear cargo door",
        label: "Closed and secured",
      },
      {
        key: "station2_mgbCowlings_opening",
        title: "LH side MGB and engine cowlings",
        label: "Opening, condition of locking devices, no abnormal freeplay",
      },
      {
        key: "station2_upperCowling_security",
        title: "Upper cowling",
        label: "Security",
      },
      {
        key: "station2_mgb_condition",
        title: "MGB",
        label: "Condition, oil levels, no leaks",
      },
      {
        key: "station2_transmissionDeck_cleanliness",
        title: "Transmission deck",
        label: "Cleanliness",
      },
      {
        key: "station2_mgbSupportBars_condition",
        title: "MGB support bars",
        label: "Condition, security",
      },
      {
        key: "station2_hydraulicSystem_condition",
        title: "Hydraulic system",
        label: "Condition, attachment points, pipes, no leaks",
      },
      {
        key: "station2_servos_security",
        title: "Servos",
        label: "Security, no leaks or cracks",
      },
      {
        key: "station2_coolingFan_condition",
        title: "Cooling fan",
        label: "Motor security, blade condition",
      },
      {
        key: "station2_gimbalRing_fitting",
        title: "Gimbal ring assembly",
        label: "Fitting, safety pin set and locked",
      },
      {
        key: "station2_electricalHarnesses_condition",
        title: "Electrical harnesses",
        label: "Condition, security",
      },
      {
        key: "station2_fuelShutoff_condition",
        title: "Fuel shut-off valve",
        label: "Condition, security",
      },
      {
        key: "station2_mgbCowlingLH_safety",
        title: "MGB cowling (LH side)",
        label: "Closed and secured",
      },
    ],
  },
  {
    title: "Engine and Engine Bay",
    items: [
      {
        key: "engine_airInlet_condition",
        title: "Engine air inlet",
        label: "Security, condition, seal condition",
      },
      {
        key: "engine_firewall_condition",
        title: "Firewall",
        label: "Condition, check for cracks",
      },
      {
        key: "engine_accessories_condition",
        title: "Engine and accessories",
        label:
          "General condition, cleanliness sealing, attachment pipes, electrical harness",
      },
      {
        key: "engine_transmissionDeck_condition",
        title: "Engine transmission deck",
        label: "Condition, cleanliness, no leak",
      },
      {
        key: "engine_case_condition",
        title: "Engine case",
        label: "Mounting pads condition",
      },
      {
        key: "engine_oilFilter_condition",
        title: "Oil filter",
        label: "Clogging indicator retracted",
      },
      {
        key: "engine_fuelFilter_condition",
        title: "Fuel filter",
        label: "Clogging indicator retracted",
      },
      {
        key: "engine_oilSystem_condition",
        title: "Oil system",
        label: "Check for leaks",
      },
      {
        key: "engine_mounts_condition",
        title: "Engine mounts",
        label: "Condition, security",
      },
      {
        key: "engine_deckDrainHoles_condition",
        title: "Engine deck drain holes",
        label: "Free from obstructions and debris",
      },
      {
        key: "engine_exhaustPipe_condition",
        title: "Exhaust pipe",
        label: "Condition, blanking fitted or removed, as necessary",
      },
    ],
  },
  {
    title: "Station 3",
    items: [
      {
        key: "station3_scissors_condition",
        title: "Scissors, swashplates, rods swivel bearings",
        label: "Condition, security, freeplay evolution (manual check)",
      },
      {
        key: "station3_swashPlate_condition",
        title: "Swash plate/pitch change rods and end-fittings interface",
        label: "No contact traces or paint scaling on swashplate driving yokes",
      },
      {
        key: "station3_pitchChangeRods_condition",
        title: "Pitch change rods",
        label:
          "Condition, no radial free play at end fittings, paint marks visible and aligned",
      },
      {
        key: "station3_rotorShaft_condition",
        title: "Rotor shaft, all visible parts, particularly under the hub",
        label:
          "Paint condition, no cracks, crazing, blistering, corrosion nor tools marks",
      },
    ],
  },
  {
    title: "Main Rotor Head",
    items: [
      {
        key: "mainRotor_head_condition",
        title: "Main Rotor Head",
        label: "Security, general condition",
      },
      {
        key: "mainRotor_starflex_condition",
        title: "STARFLEX star",
        label: "No delamination, (splinters)",
      },
      {
        key: "mainRotor_starRecesses_condition",
        title: "Star recesses",
        label: "No cracks",
      },
      {
        key: "mainRotor_sphericalBearings_condition",
        title: "Spherical thrust bearings frequency adapters",
        label:
          "No elastomeric defects, separation, scratches, blisters, extrusion or cracks (other than minor and non evolving surface defects)",
      },
      {
        key: "mainRotor_ballJoints_condition",
        title: "Self-lubricating ball joints",
        label: "No debris nor free-play",
      },
      {
        key: "mainRotor_starArms_condition",
        title: "Star arms end bushes",
        label: "No space between adhesive bead and bush",
      },
      {
        key: "mainRotor_vibrationAbsorber_condition",
        title: "Vibration absorber",
        label: "Security",
      },
      {
        key: "mainRotor_blades_condition",
        title: "Blades",
        label:
          "Security, general coating, tabs, and polyurethane protection condition (visual check for debonding, scratches, cracks, impacts and distortions). No erosion holes on leading edge steel strip, no gaps nor impacts",
      },
      {
        key: "mainRotor_rightCargoDoor_opening",
        title: "Right cargo door",
        label: "Opening, condition, attachment points, no abnormal freeplay",
      },
      {
        key: "mainRotor_rightCargoDoor_closed",
        title: "Right cargo door",
        label: "Closed and secured",
      },
      {
        key: "mainRotor_gpuPlug_condition",
        title: "GPU plug planet",
        label: "Closed or plugged-in, as applicable",
      },
      {
        key: "mainRotor_rhMgbCowling_opening",
        title: "RH MGB cowling",
        label: "Opening, condition of locking systems, no abnormal freeplay",
      },
      {
        key: "mainRotor_transmissionDeck_cleanliness",
        title: "Transmission deck",
        label: "Cleanliness",
      },
      {
        key: "mainRotor_mgbSupportBars_condition",
        title: "MGB support bars",
        label: "Condition, security",
      },
      {
        key: "mainRotor_oilCooler_condition",
        title: "Oil cooler, fan and pipes",
        label: "Condition, no leak, fan security, fan blades condition",
      },
      {
        key: "mainRotor_servos_security",
        title: "Servos",
        label: "Security check for leaks or cracks",
      },
      {
        key: "mainRotor_hydraulicSystem_condition",
        title: "Hydraulic System",
        label:
          "Security, pipes condition, check for leaks, filter clogging indicator retracted",
      },
      {
        key: "mainRotor_hydraulicTank_condition",
        title: "Hydraulic system tank",
        label: "Level, no leak",
      },
      {
        key: "mainRotor_engineOilTank_condition",
        title: "Engine oil tank",
        label: "Oil level, pipes condition, no leak",
      },
      {
        key: "mainRotor_electricalHarnesses_condition",
        title: "Electrical harnesses",
        label: "Condition, security",
      },
      {
        key: "mainRotor_gimbalRing_fitting",
        title: "Gimbal ring assembly",
        label: "Fitting, safety pins set and locked",
      },
      {
        key: "mainRotor_rhSideMgbCowling_closed",
        title: "RH side MGB cowling",
        label: "Closed and secured",
      },
      {
        key: "mainRotor_landingGear_condition",
        title: "Landing gear",
        label:
          "Condition of cross-tubes, skids, wear resistant plates, footstep security",
      },
      {
        key: "mainRotor_lowerFairings_closed",
        title: "All lower central fairings",
        label: "Closed and secured",
      },
      {
        key: "mainRotor_rhCabinAccess_condition",
        title: "RH cabin access doors",
        label: "Condition, security, locking, no abnormal freeplay",
      },
      {
        key: "mainRotor_frontDoorJettison_condition",
        title: "Front door jettison system",
        label: "Condition, no crack",
      },
    ],
  },
  {
    title: "Cabin Interior",
    items: [
      {
        key: "cabin_general_cleanliness",
        title: "Cabin",
        label: "General cleanliness",
      },
      {
        key: "cabin_seats_condition",
        title: "Seats",
        label: "Condition, attachment points",
      },
      {
        key: "cabin_doorJettison_checked",
        title: "Door jettison system",
        label: "Checked - Plastic guard condition",
      },
      {
        key: "cabin_fireExtinguisher_condition",
        title: "Fire Extinguisher",
        label: "Secured - Checked",
      },
      {
        key: "cabin_circuitBreakers_set",
        title: "Circuit Breakers",
        label: "All set",
      },
      {
        key: "cabin_scu_position",
        title: "SCU",
        label: "Check all pushbuttons in OFF position",
      },
      {
        key: "cabin_batterySwitchOn_on",
        title: "Battery Switch",
        label: "ON, check battery voltage",
      },
      {
        key: "cabin_vemd_flightReport",
        title: "VEMD",
        label:
          "Check flights of the day report pages data (MAIN mode, FLIGHT REPORT page)",
      },
      {
        key: "cabin_vemd_flightTimes",
        title: "VEMD",
        label: "VEMD flight times",
      },
      {
        key: "cabin_vemd_cycles",
        title: "VEMD",
        label:
          "Ng and Nf cycles: check written in white characters and above 0",
      },
      {
        key: "cabin_vemd_advisoryMessages",
        title: "VEMD",
        label: "Check advisory messages of FAILURE or OVERLIMIT DETECTED",
      },
      {
        key: "cabin_vemd_recordData",
        title: "VEMD",
        label: "Record flights of the day data in aircraft and engine logbooks",
      },
      {
        key: "cabin_batterySwitchOff_off",
        title: "Battery Switch",
        label: "OFF",
      },
    ],
  },
];

const buildInspectionRows = (sections, inspection) =>
  sections
    .map(
      (section) => `
        ${sectionTitle(section.title)}
        ${section.items
          .map((item, index) => inspectionRow(index + 1, item, inspection))
          .join("")}
      `,
    )
    .join("");

const getRpc = (record) =>
  record?.rpc ||
  record?.RP_C ||
  record?.aircraft ||
  record?.aircraftNo ||
  "__________";

const formatInspectionDate = (value) => {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).split("T")[0];
  return new Intl.DateTimeFormat("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  }).format(date);
};

const getDate = (record) =>
  formatInspectionDate(
    record?.date ||
      record?.inspectionDate ||
      record?.createdDate ||
      record?.createdAt,
  );

const getSignatureName = (signature) =>
  typeof signature === "string" ? signature : signature?.name || "";
const getSignatureTitle = (signature, fallback = "__________________") =>
  (typeof signature === "object" && signature?.title) || fallback;
const isObjectIdLike = (value) => /^[a-f\d]{24}$/i.test(String(value || ""));
const getSignatureLicense = (signature, ...keys) => {
  if (!signature || typeof signature !== "object") return "";
  return (
    keys
      .map((key) => signature?.[key])
      .find((value) => value && !isObjectIdLike(value)) || ""
  );
};

const buildPreInspectionHtml = (inspection = {}) => `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8" />
      <style>${baseInspectionStyles}</style>
    </head>

    <body>
      <h1>AS 350 B3e 360 Degree Pre-Flight Inspection</h1>

      <div class="top-info">
        <div><strong>RP-C:</strong> ${escapeHtml(getRpc(inspection))}</div>
        <div><strong>Date:</strong> <span class="date-value">${escapeHtml(getDate(inspection))}</span></div>
      </div>

      <table>
        <thead>
          <tr>
            <th class="number-cell">No.</th>
            <th>Inspection Item</th>
            <th class="blank-cell">Status</th>
            <th class="blank-cell">Initial</th>
          </tr>
        </thead>

        <tbody>
          ${buildInspectionRows(PRE_INSPECTION_SECTIONS, inspection)}
        </tbody>
      </table>

      <p><strong>F.O.B:</strong> ${escapeHtml(inspection?.fob || "__________________")}</p>

      <div class="signature-section">
        <div class="signature-box">
          <strong>Released by:</strong>
          <div class="signature-name">${escapeHtml(getSignatureName(inspection?.releasedBy))}</div>
          <div class="form-field"><span>${escapeHtml(getSignatureTitle(inspection?.releasedBy, "Mechanic"))}:</span><span class="field-line"></span></div>
          <div class="form-field"><span>A &amp; P License Nr.:</span><span class="field-line">${escapeHtml(getSignatureLicense(inspection?.releasedBy, "licenseNumber", "licenseNo", "apLicenseNumber"))}</span></div>
        </div>

        <div class="signature-box">
          <strong>Accepted by:</strong>
          <div class="signature-name">${escapeHtml(getSignatureName(inspection?.acceptedBy))}</div>
          <div class="form-field"><span>${escapeHtml(getSignatureTitle(inspection?.acceptedBy, "Pilot"))}:</span><span class="field-line"></span></div>
          <div class="form-field"><span>CHPL Nr.:</span><span class="field-line">${escapeHtml(getSignatureLicense(inspection?.acceptedBy, "licenseNumber", "licenseNo", "chplNumber", "chplNo"))}</span></div>
        </div>
      </div>

      <div class="footer">
        <span>FLIGHT MANUAL</span>
        <span>AS 350 B3 Arriel 2D</span>
        <span>REVISION 6</span>
      </div>
    </body>
  </html>
`;

const buildPostInspectionHtml = (inspection = {}) => `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8" />
      <style>${baseInspectionStyles}</style>
    </head>

    <body>
      <h1>AS 350 B3e Post Flight Inspection</h1>

      <div class="top-info">
        <div><strong>RP-C:</strong> ${escapeHtml(getRpc(inspection))}</div>
        <div><strong>Date:</strong> <span class="date-value">${escapeHtml(getDate(inspection))}</span></div>
      </div>

      <table>
        <thead>
          <tr>
            <th class="number-cell">No.</th>
            <th>Inspection Item</th>
            <th class="blank-cell">Status</th>
            <th class="blank-cell">Initial</th>
          </tr>
        </thead>

        <tbody>
          ${buildInspectionRows(POST_INSPECTION_SECTIONS, inspection)}
        </tbody>
      </table>

      <div class="signature-section">
        <div class="signature-box single">
          <strong>Released by:</strong>
          <div class="signature-name">${escapeHtml(getSignatureName(inspection?.releasedBy))}</div>
          <div class="form-field"><span>${escapeHtml(getSignatureTitle(inspection?.releasedBy, "Mechanic"))}:</span><span class="field-line"></span></div>
          <div class="form-field"><span>Dated:</span><span class="field-line">${escapeHtml(getDate(inspection))}</span></div>
          <div class="form-field"><span>A &amp; P License Nr.:</span><span class="field-line">${escapeHtml(getSignatureLicense(inspection?.releasedBy, "licenseNumber", "licenseNo", "apLicenseNumber"))}</span></div>
        </div>
      </div>

      <div class="footer">
        <span>FLIGHT MANUAL</span>
        <span>AS 350 B3 Arriel 2D</span>
        <span>REVISION 6</span>
      </div>
    </body>
  </html>
`;

const exportRecordToPdf = async ({
  title,
  subtitle,
  record,
  html,
  buildHtml,
  fileName,
  successMessage,
  saveToDownloads = false,
}) => {
  try {
    showToast(`Generating ${title} PDF...`);
    let finalHtml =
      typeof buildHtml === "function" ? await buildHtml() : html;

    if (!finalHtml) {
      const rows = flattenRecord(record);

      if (rows.length === 0) {
        throw new Error("No exportable data found");
      }

      const logoDataUri = await getNgcpLogoDataUri();
      finalHtml = buildGenericHtml({ title, subtitle, rows, logoDataUri });
    }

    if (Platform.OS === "web") {
      const result = await printHtmlOnWeb(finalHtml, title);
      showToast("Print dialog opened. Choose Save as PDF to download it.");
      return result;
    }

    const printResult = await Print.printToFileAsync({
      html: finalHtml,
      base64: false,
    });
    const sourceUri = printResult?.uri;
    if (!sourceUri) {
      throw new Error("The PDF file could not be generated.");
    }

    const finalUri = await createShareablePdfUri(
      sourceUri,
      fileName || title,
    );

    if (saveToDownloads && Platform.OS === "android") {
      try {
        const savedUri = await savePdfWithAndroidPicker(
          finalUri,
          fileName || title,
        );
        if (savedUri) {
          if (successMessage) showToast(successMessage);
          return savedUri;
        }
        showToast("No folder selected. Opening share options instead.");
      } catch (error) {
        console.warn("Unable to save PDF to the selected folder", error);
        showToast("Unable to save there. Opening share options instead.");
      }
    }

    const canShare = await Sharing.isAvailableAsync();

    if (!canShare) {
      Alert.alert("Export ready", `PDF saved to:\n${finalUri}`);
      if (successMessage) showToast(successMessage);
      return finalUri;
    }

    await Sharing.shareAsync(finalUri, {
      mimeType: PDF_MIME_TYPE,
      dialogTitle: title,
      UTI: "com.adobe.pdf",
    });

    if (successMessage) showToast(successMessage);

    return finalUri;
  } catch (error) {
    console.error(`Failed to export ${title}:`, error);
    Alert.alert("Export failed", error.message || "Unable to generate PDF");
    return null;
  }
};

export const exportPreInspectionPdf = (inspection) =>
  exportPreInspectionTemplatePdf(inspection);

export const exportPostInspectionPdf = (inspection) =>
  exportPostInspectionTemplatePdf(inspection);

export const exportFlightLogPdf = async (log) => {
  return exportRecordToPdf({
    title: "Flight Log",
    fileName: getFlightLogFileName(log),
    buildHtml: async () => {
      const logoDataUri = await getNgcpLogoDataUri();
      return isB412FlightLog(log)
        ? buildB412FlightLogHtml(log, logoDataUri)
        : buildFlightLogHtml(log, logoDataUri);
    },
    saveToDownloads: true,
    successMessage: "Flight Log Exported!",
  });
};

export const exportMaintenanceLogPdf = async (log, options = {}) => {
  return exportRecordToPdf({
    title: "Work Done Report",
    fileName: getMaintenanceLogFileName(log),
    buildHtml: async () => {
      const logoDataUri = await getNgcpLogoDataUri();
      return buildMaintenanceLogHtml(log, options.aircraftData, logoDataUri);
    },
    successMessage: "Maintenance log exported successfully.",
  });
};
