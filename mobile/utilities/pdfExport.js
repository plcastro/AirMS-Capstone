import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import { Alert } from "react-native";

const EXCLUDED_EXPORT_KEYS = new Set([
  "_id",
  "__v",
  "id",
  "createdAt",
  "updatedAt",
]);

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
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-");

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
        prefix ? `${prefix} ${index + 1}` : `Item ${index + 1}`
      )
    );
  }

  if (typeof value === "object" && !(value instanceof Date)) {
    const entries = Object.entries(value).filter(
      ([key]) => !EXCLUDED_EXPORT_KEYS.has(key)
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

const buildGenericHtml = ({ title, subtitle, rows }) => `
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
      <h1>${escapeHtml(title)}</h1>
      ${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ""}

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
              `
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

const buildMaintenanceLogHtml = (log = {}) => {
  const workItems = (
    Array.isArray(log?.workDetails) && log.workDetails.length
      ? log.workDetails
      : [log?.correctiveActionDone, log?.defects]
  )
    .map((item) => String(item?.description || item || "").trim())
    .filter(Boolean);
  const serialNumber =
    log?.sn || String(log?.aircraft || "").replace(/[^\d]/g, "") || "";
  const workOrder = log?.sourceTaskId || log?.id || log?._id || "";

  const detailRows = (workItems.length ? workItems : [""])
    .map(
      (description, index) => `
        <tr class="work-row">
          <td class="signoff"></td>
          <td class="description">${index + 1}. ${escapeHtml(description)}</td>
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
          .blank-top { height: 9mm; border-bottom: 1.5px solid #111; }
          .metadata {
            display: grid;
            grid-template-columns: 27% 46% 27%;
            min-height: 30mm;
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
          .ngcp {
            font-size: 36pt;
            line-height: .85;
            font-weight: 900;
            letter-spacing: -4px;
            color: #222;
          }
          .ngcp .accent { color: #087d4b; }
          .tagline {
            margin-top: 4px;
            font-size: 8pt;
            font-weight: 700;
            letter-spacing: .4px;
          }
          .title {
            padding: 5mm 2mm 4mm;
            text-align: center;
            font-size: 11pt;
            line-height: 1.35;
            font-weight: 700;
            border-bottom: 1.5px solid #111;
          }
          .section-title {
            height: 8mm;
            padding: 2px 3px;
            font-size: 10pt;
            font-weight: 700;
            border-bottom: 1.5px solid #111;
          }
          .work-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
          .work-table td {
            border-bottom: 1px solid #111;
            vertical-align: middle;
            page-break-inside: avoid;
          }
          .work-table tr:last-child td { border-bottom: 0; }
          .signoff { width: 10%; border-right: 1px solid #111; }
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
          <div class="blank-top"></div>
          <div class="metadata">
            <div class="meta-side">
              ${labeledCell("ACFT TYPE:", log?.aircraftType || "AS350 B3")}
              ${labeledCell("ACFT REG:", log?.aircraft)}
              ${labeledCell("ACFT S/N:", serialNumber)}
              ${labeledCell("W.O. #:", workOrder)}
            </div>
            <div class="brand">
              <div class="ngcp"><span class="accent">N</span>GC<span class="accent">P</span></div>
              <div class="tagline">BRIDGING POWER &amp; PROGRESS</div>
            </div>
            <div class="meta-side">
              ${labeledCell("AIRCRAFT TT:", log?.aircraftTT || log?.acftTT)}
              ${labeledCell("LANDING CYC:", log?.landingCycles || log?.landings)}
              ${labeledCell("ENGINE: TT:", log?.engineTT || log?.engTT)}
              ${labeledCell("ENGINE CYC:", log?.engineCycles || log?.n2Cycles)}
            </div>
          </div>
          <div class="title">WORK DONE REPORT /<br />CERTIFICATE OF RETURN TO SERVICE</div>
          <div class="section-title">DESCRIPTION OF WORK:</div>
          <table class="work-table"><tbody>${detailRows}</tbody></table>
        </div>
      </body>
    </html>`;
};

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
  Array.from({ length: count }, (_, index) => items[index] || emptyFactory(index));

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

const buildFlightLogHtml = (log = {}) => {
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
          @page { size: A4 portrait; margin: 14px; }
          * { box-sizing: border-box; }
          body {
            font-family: Arial, Helvetica, sans-serif;
            color: #111;
            margin: 0;
            font-size: 7px;
          }
          .sheet { width: 100%; }
          .header {
            position: relative;
            min-height: 100px;
            padding-top: 18px;
          }
          .logo {
            position: absolute;
            left: 4px;
            top: 48px;
            font-size: 26px;
            line-height: 1;
            font-weight: 900;
            letter-spacing: -2px;
          }
          .logo span:first-child,
          .logo span:last-child { color: #068345; }
          .title {
            text-align: center;
            font-weight: 800;
            font-size: 12px;
            line-height: 1.45;
            letter-spacing: .2px;
          }
          .field {
            position: absolute;
            display: flex;
            align-items: flex-end;
            gap: 4px;
            font-size: 8px;
            font-weight: 800;
          }
          .field .line {
            display: inline-block;
            min-width: 112px;
            border-bottom: 1px solid #111;
            padding: 0 4px 2px;
            font-weight: 400;
          }
          .aircraft-type { left: 4px; top: 86px; }
          .rpc { left: 4px; top: 102px; }
          .date { right: 28px; top: 78px; }
          .control { right: 28px; top: 94px; }
          table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
            margin: 0;
            page-break-inside: avoid;
          }
          .flight-table col:nth-child(1) { width: 7%; }
          .flight-table col:nth-child(2) { width: 41%; }
          .flight-table col:nth-child(3),
          .flight-table col:nth-child(4),
          .flight-table col:nth-child(5),
          .flight-table col:nth-child(6) { width: 8%; }
          .flight-table col:nth-child(7),
          .flight-table col:nth-child(8) { width: 10%; }
          .passenger-table col:first-child { width: 13%; }
          .passenger-table col:not(:first-child) { width: 10.875%; }
          .component-table col:first-child { width: 8.5%; }
          .component-table col:not(:first-child) { width: 9.15%; }
          .fuel-table col:nth-child(1) { width: 6.5%; }
          .fuel-table col:nth-child(2) { width: 9.5%; }
          .fuel-table col:nth-child(3) { width: 12%; }
          .fuel-table col:nth-child(4),
          .fuel-table col:nth-child(6) { width: 12%; }
          .fuel-table col:nth-child(5) { width: 11%; }
          .fuel-table col:nth-child(7),
          .fuel-table col:nth-child(8) { width: 10%; }
          .fuel-table col:nth-child(9) { width: 17%; }
          .oil-table col:nth-child(1) { width: 6%; }
          .oil-table col:nth-child(2) { width: 8.5%; }
          .oil-table col:nth-child(n+3):nth-child(-n+11) { width: 6.5%; }
          .oil-table col:nth-child(12) { width: 16%; }
          .oil-table col:nth-child(13) { width: 11%; }
          .remarks-table col:first-child { width: 80%; }
          .remarks-table col:last-child { width: 20%; }
          .work-table col:nth-child(1) { width: 12.5%; }
          .work-table col:nth-child(2) { width: 14.5%; }
          .work-table col:nth-child(3) { width: 45.5%; }
          .work-table col:nth-child(4) { width: 17%; }
          .work-table col:nth-child(5) { width: 10.5%; }
          th, td {
            border: .8px solid #111;
            padding: 2px 3px;
            min-height: 10px;
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
            font-size: 8px;
            letter-spacing: .2px;
            padding: 3px;
          }
          .empty { color: transparent; }
          .due-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            border-left: .8px solid #111;
            border-right: .8px solid #111;
            font-weight: 800;
          }
          .due-row div {
            min-height: 13px;
            padding: 2px 4px;
          }
          .signature {
            display: grid;
            grid-template-columns: 1fr 1fr;
            border-left: .8px solid #111;
            border-right: .8px solid #111;
            border-bottom: .8px solid #111;
          }
          .signature > div {
            min-height: 34px;
            padding: 4px;
            text-align: center;
            font-weight: 800;
          }
          .signature .name {
            margin: 8px 42px 2px;
            border-bottom: .8px solid #111;
            min-height: 9px;
            font-weight: 400;
          }
          .checks {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            border-left: .8px solid #111;
            border-right: .8px solid #111;
            border-bottom: .8px solid #111;
            padding: 4px 2px;
            font-weight: 800;
          }
          .box {
            display: inline-block;
            width: 8px;
            height: 8px;
            border: .8px solid #111;
            margin-right: 4px;
            vertical-align: -1px;
          }
        </style>
      </head>
      <body>
        <div class="sheet">
          <div class="header">
            <div class="logo"><span>N</span>GC<span>P</span></div>
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
                      <td class="center">${escapeHtml(flightValue(fuel.refuelerName))}</td>
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
                      <td></td>
                    </tr>
                  `,
                )
                .join("")}
          </tbody>
        </table>

          <div class="signature">
            <div>
              RELEASED BY:
              <div class="name">${escapeHtml(flightValue(log.releasedBy?.name))}</div>
              ENGINEER / CERTIFICATE
            </div>
            <div>
              ACCEPTED BY:
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
                      <td>${escapeHtml(flightValue(item.name || item.performedBy))}</td>
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
      { key: "station2_leftCargoDoorOpen", title: "Left cargo door", label: "Open" },
      { key: "station2_loadsObjects", title: "Loads and objects carried", label: "Secured" },
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
      { key: "station1_mgbCowl", title: "MGB cowl", label: "MGB oil level - Cowl locked" },
      { key: "station1_lowerFairings", title: "All lower fairings panels", label: "Locked" },
      {
        key: "station1_landingGear",
        title: "Landing gear and footstep",
        label: "Secure - Visual Check",
      },
      { key: "station1_staticPorts", title: "Static ports", label: "Clear, covers removed" },
      { key: "station1_oatSensor", title: "OAT sensor, antennas", label: "Condition" },
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
      { key: "station1_exhaustCover", title: "Exhaust cover", label: "Removed" },
      { key: "station1_rearCargoDoorOpen", title: "Rear cargo door", label: "Opened" },
      { key: "station1_loadsObjects", title: "Loads and object carried", label: "Secured" },
      { key: "station1_elt", title: "ELT", label: "Check ARMED" },
      {
        key: "station1_rearCargoDoorClosed",
        title: "Rear cargo door",
        label: "Closed, locked",
      },
      { key: "station1_oilDrain", title: "Oil drain", label: "No oil under scupper" },
    ],
  },
  {
    title: "Station 3",
    items: [
      { key: "station3_heatShield", title: "Heat shield on tail drive", label: "Condition, attachment" },
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
      { key: "station3_tgbFairing", title: "TGB fairing", label: "Secured, fasteners locked" },
      { key: "station3_tgbOilLevel", title: "TGB oil level", label: "Checked" },
      { key: "station3_tailSkid", title: "Tail skid", label: "Condition, attachment" },
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
      { key: "sling_sling", title: "Sling", label: "Security - General condition" },
      { key: "sling_cablePins", title: "Cable and Pins", label: "Condition, attachment points" },
    ],
  },
  {
    title: "Floats",
    items: [
      { key: "floats_lhRh", title: "LH & RH Floats", label: "Security - General Condition" },
      { key: "floats_cylinder", title: "Cylinder", label: "Pressure & Condition, attachment points" },
      { key: "floats_hoses", title: "Hoses", label: "Condition, attachment points" },
    ],
  },
  {
    title: "Mandatory Onboard",
    items: [
      { key: "onboard_firstAid", title: "First Aid Kit", label: "Condition, no expired" },
      { key: "onboard_lifeVest", title: "Life Vest", label: "Condition, cleanliness & no damage" },
      { key: "onboard_lifeRaft", title: "Life-raft", label: "Condition, cleanliness & no damage" },
      { key: "onboard_axl", title: "AXL", label: "Security - General Condition" },
      { key: "onboard_fireExt", title: "Fire Extinguisher", label: "Security - General Condition" },
      { key: "onboard_certAirworthiness", title: "Certificate of Airworthiness", label: "Onboard" },
      { key: "onboard_certRegistration", title: "Certificate of Registration", label: "Onboard" },
      { key: "onboard_radioLicense", title: "Radio License", label: "Onboard" },
      { key: "onboard_flightLogbook", title: "Flight Logbook", label: "Onboard" },
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
      { key: "station1_transparentPanels_clean", title: "Transparent Panels", label: "Clean if necessary" },
      { key: "station1_doorsPillars_condition", title: "Doors pillars", label: "Condition, no crack" },
      {
        key: "station1_sideSlipIndicator_condition",
        title: "Side slip indicator",
        label: "Condition, blanking cap removed or fitted as necessary",
      },
      { key: "station1_sideSlipIndicator2_condition", title: "Side slip indicator", label: "Condition" },
      {
        key: "station1_mgbEngineOilCooler_condition",
        title: "MGB - Engine oil cooler inlet",
        label: "Condition, no obstruction or debris, blanking removed or fitted as necessary",
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
        label: "Condition of crosstubes, skids, wear resistant plates, footstep attachment",
      },
      {
        key: "station2_staticPressure_condition",
        title: "Static pressure points",
        label: "Condition, blanking removed or fitted as necessary",
      },
      { key: "station2_oatProbe_condition", title: "OAT probe", label: "Condition, attachment" },
      { key: "station2_antennas_condition", title: "Antennas under belly", label: "Condition" },
      { key: "station2_lights_condition", title: "Landing and taxiing lights", label: "Condition" },
      { key: "station2_lowerCowlings_condition", title: "Lower cowlings", label: "Condition, security" },
      {
        key: "station2_leftCargoDoorOpen_opening",
        title: "Left cargo door",
        label: "Opening, condition, attachment points, no abnormal freeplay",
      },
      { key: "station2_leftCargoDoorClosed_closed", title: "Left cargo door", label: "Closed and secured" },
      {
        key: "station2_fuelTank_condition",
        title: "Fuel tank",
        label: "Filler plug closed - Tank sump drained (before first flight of the day and any aircraft displacement)",
      },
      {
        key: "station2_rearCargoDoorOpen_opening",
        title: "Rear cargo door",
        label: "Opening, condition, attachment points, no abnormal freeplay",
      },
      { key: "station2_rearCargoBay_harness", title: "Rear cargo bay", label: "Harness condition" },
      { key: "station2_elt_condition", title: "ELT", label: 'Condition, security, "ARM" or "OFF" as necessary' },
      { key: "station2_rearCargoDoorClosed_closed", title: "Rear cargo door", label: "Closed and secured" },
      {
        key: "station2_mgbCowlings_opening",
        title: "LH side MGB and engine cowlings",
        label: "Opening, condition of locking devices, no abnormal freeplay",
      },
      { key: "station2_upperCowling_security", title: "Upper cowling", label: "Security" },
      { key: "station2_mgb_condition", title: "MGB", label: "Condition, oil levels, no leaks" },
      { key: "station2_transmissionDeck_cleanliness", title: "Transmission deck", label: "Cleanliness" },
      { key: "station2_mgbSupportBars_condition", title: "MGB support bars", label: "Condition, security" },
      {
        key: "station2_hydraulicSystem_condition",
        title: "Hydraulic system",
        label: "Condition, attachment points, pipes, no leaks",
      },
      { key: "station2_servos_security", title: "Servos", label: "Security, no leaks or cracks" },
      { key: "station2_coolingFan_condition", title: "Cooling fan", label: "Motor security, blade condition" },
      { key: "station2_gimbalRing_fitting", title: "Gimbal ring assembly", label: "Fitting, safety pin set and locked" },
      { key: "station2_electricalHarnesses_condition", title: "Electrical harnesses", label: "Condition, security" },
      { key: "station2_fuelShutoff_condition", title: "Fuel shut-off valve", label: "Condition, security" },
      { key: "station2_mgbCowlingLH_safety", title: "MGB cowling (LH side)", label: "Closed and secured" },
    ],
  },
  {
    title: "Engine and Engine Bay",
    items: [
      { key: "engine_airInlet_condition", title: "Engine air inlet", label: "Security, condition, seal condition" },
      { key: "engine_firewall_condition", title: "Firewall", label: "Condition, check for cracks" },
      {
        key: "engine_accessories_condition",
        title: "Engine and accessories",
        label: "General condition, cleanliness sealing, attachment pipes, electrical harness",
      },
      { key: "engine_transmissionDeck_condition", title: "Engine transmission deck", label: "Condition, cleanliness, no leak" },
      { key: "engine_case_condition", title: "Engine case", label: "Mounting pads condition" },
      { key: "engine_oilFilter_condition", title: "Oil filter", label: "Clogging indicator retracted" },
      { key: "engine_fuelFilter_condition", title: "Fuel filter", label: "Clogging indicator retracted" },
      { key: "engine_oilSystem_condition", title: "Oil system", label: "Check for leaks" },
      { key: "engine_mounts_condition", title: "Engine mounts", label: "Condition, security" },
      { key: "engine_deckDrainHoles_condition", title: "Engine deck drain holes", label: "Free from obstructions and debris" },
      { key: "engine_exhaustPipe_condition", title: "Exhaust pipe", label: "Condition, blanking fitted or removed, as necessary" },
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
        label: "Condition, no radial free play at end fittings, paint marks visible and aligned",
      },
      {
        key: "station3_rotorShaft_condition",
        title: "Rotor shaft, all visible parts, particularly under the hub",
        label: "Paint condition, no cracks, crazing, blistering, corrosion nor tools marks",
      },
    ],
  },
  {
    title: "Main Rotor Head",
    items: [
      { key: "mainRotor_head_condition", title: "Main Rotor Head", label: "Security, general condition" },
      { key: "mainRotor_starflex_condition", title: "STARFLEX star", label: "No delamination, (splinters)" },
      { key: "mainRotor_starRecesses_condition", title: "Star recesses", label: "No cracks" },
      {
        key: "mainRotor_sphericalBearings_condition",
        title: "Spherical thrust bearings frequency adapters",
        label: "No elastomeric defects, separation, scratches, blisters, extrusion or cracks (other than minor and non evolving surface defects)",
      },
      { key: "mainRotor_ballJoints_condition", title: "Self-lubricating ball joints", label: "No debris nor free-play" },
      { key: "mainRotor_starArms_condition", title: "Star arms end bushes", label: "No space between adhesive bead and bush" },
      { key: "mainRotor_vibrationAbsorber_condition", title: "Vibration absorber", label: "Security" },
      {
        key: "mainRotor_blades_condition",
        title: "Blades",
        label: "Security, general coating, tabs, and polyurethane protection condition (visual check for debonding, scratches, cracks, impacts and distortions). No erosion holes on leading edge steel strip, no gaps nor impacts",
      },
      {
        key: "mainRotor_rightCargoDoor_opening",
        title: "Right cargo door",
        label: "Opening, condition, attachment points, no abnormal freeplay",
      },
      { key: "mainRotor_rightCargoDoor_closed", title: "Right cargo door", label: "Closed and secured" },
      { key: "mainRotor_gpuPlug_condition", title: "GPU plug planet", label: "Closed or plugged-in, as applicable" },
      {
        key: "mainRotor_rhMgbCowling_opening",
        title: "RH MGB cowling",
        label: "Opening, condition of locking systems, no abnormal freeplay",
      },
      { key: "mainRotor_transmissionDeck_cleanliness", title: "Transmission deck", label: "Cleanliness" },
      { key: "mainRotor_mgbSupportBars_condition", title: "MGB support bars", label: "Condition, security" },
      { key: "mainRotor_oilCooler_condition", title: "Oil cooler, fan and pipes", label: "Condition, no leak, fan security, fan blades condition" },
      { key: "mainRotor_servos_security", title: "Servos", label: "Security check for leaks or cracks" },
      {
        key: "mainRotor_hydraulicSystem_condition",
        title: "Hydraulic System",
        label: "Security, pipes condition, check for leaks, filter clogging indicator retracted",
      },
      { key: "mainRotor_hydraulicTank_condition", title: "Hydraulic system tank", label: "Level, no leak" },
      { key: "mainRotor_engineOilTank_condition", title: "Engine oil tank", label: "Oil level, pipes condition, no leak" },
      { key: "mainRotor_electricalHarnesses_condition", title: "Electrical harnesses", label: "Condition, security" },
      { key: "mainRotor_gimbalRing_fitting", title: "Gimbal ring assembly", label: "Fitting, safety pins set and locked" },
      { key: "mainRotor_rhSideMgbCowling_closed", title: "RH side MGB cowling", label: "Closed and secured" },
      {
        key: "mainRotor_landingGear_condition",
        title: "Landing gear",
        label: "Condition of cross-tubes, skids, wear resistant plates, footstep security",
      },
      { key: "mainRotor_lowerFairings_closed", title: "All lower central fairings", label: "Closed and secured" },
      {
        key: "mainRotor_rhCabinAccess_condition",
        title: "RH cabin access doors",
        label: "Condition, security, locking, no abnormal freeplay",
      },
      { key: "mainRotor_frontDoorJettison_condition", title: "Front door jettison system", label: "Condition, no crack" },
    ],
  },
  {
    title: "Cabin Interior",
    items: [
      { key: "cabin_general_cleanliness", title: "Cabin", label: "General cleanliness" },
      { key: "cabin_seats_condition", title: "Seats", label: "Condition, attachment points" },
      { key: "cabin_doorJettison_checked", title: "Door jettison system", label: "Checked - Plastic guard condition" },
      { key: "cabin_fireExtinguisher_condition", title: "Fire Extinguisher", label: "Secured - Checked" },
      { key: "cabin_circuitBreakers_set", title: "Circuit Breakers", label: "All set" },
      { key: "cabin_scu_position", title: "SCU", label: "Check all pushbuttons in OFF position" },
      { key: "cabin_batterySwitchOn_on", title: "Battery Switch", label: "ON, check battery voltage" },
      {
        key: "cabin_vemd_flightReport",
        title: "VEMD",
        label: "Check flights of the day report pages data (MAIN mode, FLIGHT REPORT page)",
      },
      { key: "cabin_vemd_flightTimes", title: "VEMD", label: "VEMD flight times" },
      { key: "cabin_vemd_cycles", title: "VEMD", label: "Ng and Nf cycles: check written in white characters and above 0" },
      {
        key: "cabin_vemd_advisoryMessages",
        title: "VEMD",
        label: "Check advisory messages of FAILURE or OVERLIMIT DETECTED",
      },
      { key: "cabin_vemd_recordData", title: "VEMD", label: "Record flights of the day data in aircraft and engine logbooks" },
      { key: "cabin_batterySwitchOff_off", title: "Battery Switch", label: "OFF" },
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
      `
    )
    .join("");

const getRpc = (record) =>
  record?.rpc || record?.RP_C || record?.aircraft || record?.aircraftNo || "__________";

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
const getSignatureLicense = (signature, ...keys) => {
  if (!signature || typeof signature !== "object") return "";
  return keys.map((key) => signature?.[key]).find(Boolean) || "";
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

const exportRecordToPdf = async ({ title, subtitle, record, html }) => {
  try {
    let finalHtml = html;

    if (!finalHtml) {
      const rows = flattenRecord(record);

      if (rows.length === 0) {
        throw new Error("No exportable data found");
      }

      finalHtml = buildGenericHtml({ title, subtitle, rows });
    }

    const { uri } = await Print.printToFileAsync({
      html: finalHtml,
      base64: false,
    });
    const finalUri = `${FileSystem.cacheDirectory}${buildSafeFileName(title)}.pdf`;
    await FileSystem.copyAsync({ from: uri, to: finalUri });

    const canShare = await Sharing.isAvailableAsync();

    if (!canShare) {
      Alert.alert("Export ready", `PDF saved to:\n${finalUri}`);
      return finalUri;
    }

    await Sharing.shareAsync(finalUri, {
      mimeType: "application/pdf",
      dialogTitle: title,
      UTI: "com.adobe.pdf",
    });

    return finalUri;
  } catch (error) {
    console.error(`Failed to export ${title}:`, error);
    Alert.alert("Export failed", error.message || "Unable to generate PDF");
  }
};

export const exportPreInspectionPdf = (inspection) =>
  exportRecordToPdf({
    title: "Pre-Inspection",
    html: buildPreInspectionHtml(inspection),
  });

export const exportPostInspectionPdf = (inspection) =>
  exportRecordToPdf({
    title: "Post-Inspection",
    html: buildPostInspectionHtml(inspection),
  });

export const exportFlightLogPdf = (log) =>
  exportRecordToPdf({
    title: "Flight Log",
    html: buildFlightLogHtml(log),
  });

export const exportMaintenanceLogPdf = (log) =>
  exportRecordToPdf({
    title: "Work Done Report",
    html: buildMaintenanceLogHtml(log),
  });
