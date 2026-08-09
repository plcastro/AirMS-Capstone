const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const zlib = require("zlib");
const PizZip = require("pizzip");
const Docxtemplater = require("docxtemplater");
const sharp = require("sharp");
const PDFDocument = require("pdfkit");
const UserModel = require("../models/userModel");

const TEMPLATES_DIR = path.join(__dirname, "../templates");
const EXPORT_TMP_DIR = path.join(__dirname, "../tmp/inspection-exports");
const DOCX_TO_PDF_SCRIPT = path.join(
  __dirname,
  "../scripts/convertDocxToPdf.vbs",
);
const NGCP_LOGO_PATH = path.resolve(
  __dirname,
  "../../client-web/public/images/ngcp-logo.png",
);
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47]).toString("binary");

const crcTable = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  return value >>> 0;
});

const crc32 = (buffer) => {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
};

const pngChunk = (type, data) => {
  const typeBuffer = Buffer.from(type);
  const lengthBuffer = Buffer.alloc(4);
  const crcBuffer = Buffer.alloc(4);
  lengthBuffer.writeUInt32BE(data.length, 0);
  crcBuffer.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([lengthBuffer, typeBuffer, data, crcBuffer]);
};

const drawLine = (pixels, width, x1, y1, x2, y2, thickness = 2) => {
  const setPixel = (x, y) => {
    for (let dy = -thickness; dy <= thickness; dy += 1) {
      for (let dx = -thickness; dx <= thickness; dx += 1) {
        const px = x + dx;
        const py = y + dy;
        if (px < 0 || py < 0 || px >= width || py >= width) continue;
        const offset = (py * width + px) * 4;
        pixels[offset] = 22;
        pixels[offset + 1] = 101;
        pixels[offset + 2] = 52;
        pixels[offset + 3] = 255;
      }
    }
  };

  let x = x1;
  let y = y1;
  const dx = Math.abs(x2 - x1);
  const sx = x1 < x2 ? 1 : -1;
  const dy = -Math.abs(y2 - y1);
  const sy = y1 < y2 ? 1 : -1;
  let err = dx + dy;

  while (true) {
    setPixel(x, y);
    if (x === x2 && y === y2) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
  }
};

const createCheckPng = () => {
  const size = 32;
  const pixels = Buffer.alloc(size * size * 4, 0);
  drawLine(pixels, size, 7, 17, 13, 24, 2);
  drawLine(pixels, size, 13, 24, 26, 8, 2);

  const rows = [];
  for (let y = 0; y < size; y += 1) {
    rows.push(
      Buffer.concat([
        Buffer.from([0]),
        pixels.subarray(y * size * 4, (y + 1) * size * 4),
      ]),
    );
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 6;

  return Buffer.concat([
    Buffer.from(PNG_SIGNATURE, "binary"),
    pngChunk("IHDR", header),
    pngChunk("IDAT", zlib.deflateSync(Buffer.concat(rows))),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
};

const CHECK_IMAGE_BUFFER = createCheckPng();
const EMU_PER_POINT = 12700;
const pointsToEmu = (points) => Math.round(points * EMU_PER_POINT);
const PRE_INSPECTION_TEMPLATE_KEYS = [
  "station1_transparentPanels",
  "station1_engineOilCooler",
  "station1_sideSlipIndicator",
  "station1_pitotTube",
  "station1_landingLights",
  "station2_frontDoor",
  "station2_rearDoor",
  "station2_leftCargoDoorOpen",
  "station2_loadsObjects",
  "station2_leftCargoDoorClosed",
  "station2_fuelTank",
  "station1_mgbCowl",
  "station1_lowerFairings",
  "station1_landingGear",
  "station1_staticPorts",
  "station1_oatSensor",
  "station1_mainRotor",
  "station1_engineAirIntake",
  "station1_engineCowl",
  "station1_exhaustCover",
  "station1_rearCargoDoorOpen",
  "station1_loadsObjects",
  "station1_elt",
  "station1_rearCargoDoorClosed",
  "station1_oilDrain",
  "station3_heatShield",
  "station3_tailBoom",
  "station3_stabilizer",
  "station3_tailRotorGuard",
  "station3_tgbFairing",
  "station3_tgbOilLevel",
  "station3_tailSkid",
  "station3_flexibleCoupling",
  "sling_sling",
  "sling_cablePins",
  "floats_lhRh",
  "floats_cylinder",
  "floats_hoses",
  "onboard_firstAid",
  "onboard_lifeVest",
  "onboard_lifeRaft",
  "onboard_axl",
  "onboard_fireExt",
  "onboard_certAirworthiness",
  "onboard_certRegistration",
  "onboard_radioLicense",
  "onboard_flightLogbook",
];

const PRE_INSPECTION_PDF_GROUPS = [
  {
    title: "STATION 1",
    items: [
      [
        "station1_transparentPanels",
        "Transparent Panels",
        "Condition - Cleanliness",
      ],
      [
        "station1_engineOilCooler",
        "MGB - Engine oil cooler air inlet",
        "Check no obstruction nor debris",
      ],
      ["station1_sideSlipIndicator", "Side slip indicator", "Condition"],
      ["station1_pitotTube", "Pitot tube", "Cover removed - Condition"],
      ["station1_landingLights", "Landing lights", "Condition"],
    ],
  },
  {
    title: "STATION 2",
    items: [
      ["station2_frontDoor", "Front door", "Condition jettison system check"],
      [
        "station2_rearDoor",
        "Rear door",
        "Condition, closed or open locked (sliding door)",
      ],
      ["station2_leftCargoDoorOpen", "Left cargo door", "Open"],
      ["station2_loadsObjects", "Loads and objects carried", "Secured"],
      ["station2_leftCargoDoorClosed", "Left cargo door", "Closed, locked"],
      [
        "station2_fuelTank",
        "Fuel tank and system",
        "Filler plug closed - Tank sump drained",
      ],
      ["station1_mgbCowl", "MGB cowl", "MGB oil level - Cowl locked"],
      ["station1_lowerFairings", "All lower fairings panels", "Locked"],
      [
        "station1_landingGear",
        "Landing gear and footstep",
        "Secure - Visual Check",
      ],
      ["station1_staticPorts", "Static ports", "Clear, covers removed"],
      ["station1_oatSensor", "OAT sensor, antennas", "Condition"],
      [
        "station1_mainRotor",
        "Main rotor head blades",
        "Visual inspection, no impact",
      ],
      [
        "station1_engineAirIntake",
        "Engine air intake",
        "Clear (water, snow foreign object)",
      ],
      ["station1_engineCowl", "Engine cowl", "Locked"],
      ["station1_exhaustCover", "Exhaust cover", "Removed"],
      ["station1_rearCargoDoorOpen", "Rear cargo door", "Open"],
      ["station1_loadsObjects", "Loads and object carried", "Secured"],
      ["station1_elt", "ELT", "Check ARMED"],
      ["station1_rearCargoDoorClosed", "Rear cargo door", "Closed, locked"],
      ["station1_oilDrain", "Oil drain", "No oil under scupper"],
    ],
  },
  {
    title: "STATION 3",
    items: [
      [
        "station3_heatShield",
        "Heat shield on tail drive",
        "Condition, attachment",
      ],
      [
        "station3_tailBoom",
        "Tail boom, antennas",
        "Condition - Fairings fasteners locked",
      ],
      [
        "station3_stabilizer",
        "Stabilizer, fin, external lights",
        "General condition",
      ],
      [
        "station3_tailRotorGuard",
        "Tail rotor guard (if fitted)",
        "Condition, attachment",
      ],
      ["station3_tgbFairing", "TGB fairing", "Secured, fasteners locked"],
      ["station3_tgbOilLevel", "TGB oil level", "Checked"],
      ["station3_tailSkid", "Tail skid", "Condition, attachment"],
      [
        "station3_flexibleCoupling",
        "Flexible Coupling",
        "Visual Check No Crack",
      ],
    ],
  },
  {
    title: "SLING / FLOATS / ONBOARD",
    items: [
      ["sling_sling", "Sling", "Condition"],
      ["sling_cablePins", "Cable pins", "Condition"],
      ["floats_lhRh", "LH/RH floats", "Condition"],
      ["floats_cylinder", "Cylinder", "Condition"],
      ["floats_hoses", "Hoses", "Condition"],
      ["onboard_firstAid", "First Aid", "Onboard"],
      ["onboard_lifeVest", "Life Vest", "Onboard"],
      ["onboard_lifeRaft", "Life Raft", "Onboard"],
      ["onboard_axl", "AXL", "Onboard"],
      ["onboard_fireExt", "Fire Extinguisher", "Security - General condition"],
      ["onboard_certAirworthiness", "Certificate of Airworthiness", "Onboard"],
      ["onboard_certRegistration", "Certificate of Registration", "Onboard"],
      ["onboard_radioLicense", "Radio License", "Onboard"],
      ["onboard_flightLogbook", "Flight Logbook", "Onboard"],
    ],
  },
];

/**
 * Load a document template
 * @param {string} templateName - Name of the template file (e.g., 'pre-flight inspection.docx')
 * @returns {Object} - PizZip object containing the template
 */
const loadTemplate = (templateName) => {
  const templatePath = path.join(TEMPLATES_DIR, templateName);

  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template not found: ${templateName}`);
  }

  const content = fs.readFileSync(templatePath, "binary");
  return new PizZip(content);
};

/**
 * Format inspection data for template population
 * @param {Object} inspection - Inspection object from database
 * @returns {Object} - Formatted data object
 */
const formatInspectionDate = (value) => {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).split("T")[0];
  return date.toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });
};

const formatInspectionData = (inspection) => ({
  rpc: inspection.rpc || inspection.RP_C || inspection.aircraftNo || "N/A",
  date: formatInspectionDate(
    inspection.date ||
      inspection.inspectionDate ||
      inspection.createdAt ||
      new Date(),
  ),
  aircraftType: inspection.aircraftType || "N/A",
  fob: inspection.fob !== undefined ? `${inspection.fob}%` : "N/A",
  engineer: inspection.engineer || inspection.createdBy || "N/A",
  remarks: inspection.remarks || inspection.notes || "",
  status: inspection.status || "Pending",
  inspectionItems: formatInspectionItems(inspection),
  createdAt: new Date(inspection.createdAt).toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  }),
  createdBy: inspection.createdBy || "N/A",
});

const isMetadataField = (key) =>
  [
    "_id",
    "__v",
    "createdAt",
    "updatedAt",
    "preInspectionId",
    "linkedFromPreFlight",
    "aircraftType",
    "rpc",
    "date",
    "dateAdded",
    "createdBy",
    "status",
    "notes",
    "fob",
    "releasedBy",
    "acceptedBy",
  ].includes(key);

const formatFieldLabel = (key) =>
  String(key)
    .replace(/_/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Za-z])(\d)/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const escapeXml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const normalizeFob = (value) => {
  if (value === undefined || value === null || value === "") return "N/A";
  return String(value).includes("%") ? String(value) : `${value}%`;
};

const isObjectIdLike = (value) => /^[a-f\d]{24}$/i.test(String(value || ""));

const resolveSignatureLicenseNo = async (signature = {}) => {
  const explicitLicense =
    signature.licenseNo ||
    signature.licenseNumber ||
    signature.apLicenseNumber ||
    signature.chplNumber ||
    signature.chplNo ||
    "";

  if (explicitLicense && !isObjectIdLike(explicitLicense)) {
    return explicitLicense;
  }

  const userIdCandidate = signature.userId || signature.id || "";
  if (!isObjectIdLike(userIdCandidate)) {
    return "";
  }

  try {
    const user = await UserModel.findById(userIdCandidate)
      .select("licenseNo")
      .lean();
    return user?.licenseNo || "";
  } catch (error) {
    console.error("Signature license lookup failed:", error.message);
    return "";
  }
};

const withResolvedSignatureLicenses = async (inspection = {}) => {
  const [releasedLicenseNo, acceptedLicenseNo] = await Promise.all([
    resolveSignatureLicenseNo(inspection.releasedBy),
    resolveSignatureLicenseNo(inspection.acceptedBy),
  ]);

  return {
    ...inspection,
    releasedBy: {
      ...(inspection.releasedBy || {}),
      licenseNo: releasedLicenseNo,
      id: releasedLicenseNo,
    },
    acceptedBy: {
      ...(inspection.acceptedBy || {}),
      licenseNo: acceptedLicenseNo,
      id: acceptedLicenseNo,
    },
  };
};

const formatSignatureSummary = (signature = {}) => {
  if (!signature?.name) return "N/A";

  const parts = [
    signature.name,
    signature.title ? `Title: ${signature.title}` : "",
    signature.licenseNo ? `License: ${signature.licenseNo}` : "",
    signature.timestamp ? `Signed: ${signature.timestamp}` : "",
  ].filter(Boolean);

  return parts.join(" | ");
};

const getSignatureTitle = (signature = {}, fallback = "") =>
  signature?.title || fallback;

const getSignatureBuffer = (signature = {}) => {
  const value = signature?.signature || "";
  const match = /^data:image\/(png|jpeg|jpg);base64,(.+)$/i.exec(value);
  if (!match) return null;

  return {
    extension:
      match[1].toLowerCase() === "jpg" ? "jpeg" : match[1].toLowerCase(),
    buffer: Buffer.from(match[2], "base64"),
  };
};

const ensurePngContentType = (zip) => {
  const contentTypesFile = zip.file("[Content_Types].xml");
  if (!contentTypesFile) return;

  const xml = contentTypesFile.asText();
  if (xml.includes('Extension="png"')) return;

  zip.file(
    "[Content_Types].xml",
    xml.replace(
      "</Types>",
      '<Default Extension="png" ContentType="image/png"/></Types>',
    ),
  );
};

const ensureJpegContentType = (zip) => {
  const contentTypesFile = zip.file("[Content_Types].xml");
  if (!contentTypesFile) return;

  let xml = contentTypesFile.asText();
  if (!xml.includes('Extension="jpeg"')) {
    xml = xml.replace(
      "</Types>",
      '<Default Extension="jpeg" ContentType="image/jpeg"/></Types>',
    );
  }
  if (!xml.includes('Extension="jpg"')) {
    xml = xml.replace(
      "</Types>",
      '<Default Extension="jpg" ContentType="image/jpeg"/></Types>',
    );
  }
  zip.file("[Content_Types].xml", xml);
};

const createImageManager = (zip) => {
  const relsPath = "word/_rels/document.xml.rels";
  const relsFile = zip.file(relsPath);
  let relsXml =
    relsFile?.asText() ||
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>';
  let nextRelNumber =
    Math.max(
      0,
      ...Array.from(relsXml.matchAll(/Id="rId(\d+)"/g)).map((match) =>
        Number(match[1]),
      ),
    ) + 1;
  let nextImageNumber =
    zip.file(/^word\/media\/inspection-image-\d+\.(png|jpeg|jpg)$/).length + 1;
  let nextDocPrId = 9000;

  const addImage = (buffer, extension = "png") => {
    const normalizedExtension = extension === "jpg" ? "jpeg" : extension;
    if (normalizedExtension === "png") {
      ensurePngContentType(zip);
    } else if (normalizedExtension === "jpeg") {
      ensureJpegContentType(zip);
    }

    const imageName = `inspection-image-${nextImageNumber}.${normalizedExtension}`;
    nextImageNumber += 1;
    const relId = `rId${nextRelNumber}`;
    nextRelNumber += 1;
    zip.file(`word/media/${imageName}`, buffer);
    relsXml = relsXml.replace(
      "</Relationships>",
      `<Relationship Id="${relId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${imageName}"/></Relationships>`,
    );
    zip.file(relsPath, relsXml);
    return relId;
  };

  const imageXml = (relId, widthEmu, heightEmu) => {
    nextDocPrId += 1;
    return `
      <w:r>
        <w:drawing>
          <wp:inline distT="0" distB="0" distL="0" distR="0" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing">
            <wp:extent cx="${widthEmu}" cy="${heightEmu}"/>
            <wp:docPr id="${nextDocPrId}" name="Inspection image ${nextDocPrId}"/>
            <a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
              <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
                <pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
                  <pic:nvPicPr>
                    <pic:cNvPr id="${nextDocPrId}" name="Inspection image ${nextDocPrId}"/>
                    <pic:cNvPicPr/>
                  </pic:nvPicPr>
                  <pic:blipFill>
                    <a:blip r:embed="${relId}"/>
                    <a:stretch><a:fillRect/></a:stretch>
                  </pic:blipFill>
                  <pic:spPr>
                    <a:xfrm>
                      <a:off x="0" y="0"/>
                      <a:ext cx="${widthEmu}" cy="${heightEmu}"/>
                    </a:xfrm>
                    <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
                  </pic:spPr>
                </pic:pic>
              </a:graphicData>
            </a:graphic>
          </wp:inline>
        </w:drawing>
      </w:r>`;
  };

  const floatingImageXml = (relId, widthEmu, heightEmu, xEmu, yEmu) => {
    nextDocPrId += 1;
    return `
      <w:r>
        <w:drawing>
          <wp:anchor distT="0" distB="0" distL="0" distR="0" simplePos="0" relativeHeight="${251659264 + nextDocPrId}" behindDoc="0" locked="0" layoutInCell="1" allowOverlap="1" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing">
            <wp:simplePos x="0" y="0"/>
            <wp:positionH relativeFrom="paragraph"><wp:posOffset>${xEmu}</wp:posOffset></wp:positionH>
            <wp:positionV relativeFrom="paragraph"><wp:posOffset>${yEmu}</wp:posOffset></wp:positionV>
            <wp:extent cx="${widthEmu}" cy="${heightEmu}"/>
            <wp:effectExtent l="0" t="0" r="0" b="0"/>
            <wp:wrapNone/>
            <wp:docPr id="${nextDocPrId}" name="Inspection overlay ${nextDocPrId}"/>
            <wp:cNvGraphicFramePr/>
            <a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
              <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
                <pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
                  <pic:nvPicPr>
                    <pic:cNvPr id="${nextDocPrId}" name="Inspection overlay ${nextDocPrId}"/>
                    <pic:cNvPicPr/>
                  </pic:nvPicPr>
                  <pic:blipFill>
                    <a:blip r:embed="${relId}"/>
                    <a:stretch><a:fillRect/></a:stretch>
                  </pic:blipFill>
                  <pic:spPr>
                    <a:xfrm>
                      <a:off x="0" y="0"/>
                      <a:ext cx="${widthEmu}" cy="${heightEmu}"/>
                    </a:xfrm>
                    <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
                  </pic:spPr>
                </pic:pic>
              </a:graphicData>
            </a:graphic>
          </wp:anchor>
        </w:drawing>
      </w:r>`;
  };

  return { addImage, imageXml, floatingImageXml };
};

const buildWordParagraph = (
  text,
  { bold = false, breakBefore = false } = {},
) => `
  <w:p>
    <w:r>
      ${breakBefore ? '<w:br w:type="page"/>' : ""}
      ${bold ? "<w:rPr><w:b/></w:rPr>" : ""}
      <w:t xml:space="preserve">${escapeXml(text)}</w:t>
    </w:r>
  </w:p>`;

const buildWordImageParagraph = (imageXml) => `
  <w:p>
    ${imageXml}
  </w:p>`;

const buildWordTextRun = (text, { bold = false } = {}) => `
  <w:r>
    ${bold ? "<w:rPr><w:b/></w:rPr>" : ""}
    <w:t xml:space="preserve">${escapeXml(text)}</w:t>
  </w:r>`;

const fitValueToUnderline = (value, underline) => {
  const text = String(value || "");
  const width = String(underline || "").length;
  const remaining = Math.max(0, width - text.length);
  return `${text}${"_".repeat(remaining)}`;
};

const buildStatusCheckRun = (underline = "__________") =>
  buildWordTextRun(fitValueToUnderline("✓", underline));

const buildSignatureLineRun = (signatureXml) => `
  ${signatureXml}`;

const buildSignedNameLineRun = (signatureXml, name) => `
  ${signatureXml}
  ${buildWordTextRun(name || "")}`;

let floatingTextBoxId = 10000;

const buildFloatingTextBoxXml = ({
  text,
  xPt = 0,
  yPt = 0,
  widthPt = 100,
  heightPt = 18,
  fontSize = 18,
  bold = false,
}) => {
  floatingTextBoxId += 1;
  return `
    <w:r>
      <w:pict>
        <v:shape id="inspection-text-${floatingTextBoxId}" type="#_x0000_t202"
          style="position:absolute;margin-left:${xPt}pt;margin-top:${yPt}pt;width:${widthPt}pt;height:${heightPt}pt;z-index:${251659264 + floatingTextBoxId};mso-position-horizontal-relative:text;mso-position-vertical-relative:text"
          filled="f" stroked="f">
          <v:textbox inset="0,0,0,0">
            <w:txbxContent>
              <w:p>
                <w:pPr><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/></w:pPr>
                <w:r>
                  <w:rPr>
                    <w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/>
                    ${bold ? "<w:b/>" : ""}
                    <w:sz w:val="${Math.round(fontSize * 2)}"/>
                    <w:szCs w:val="${Math.round(fontSize * 2)}"/>
                  </w:rPr>
                  <w:t xml:space="preserve">${escapeXml(text)}</w:t>
                </w:r>
              </w:p>
            </w:txbxContent>
          </v:textbox>
        </v:shape>
      </w:pict>
    </w:r>`;
};

const renderTextPng = (
  text,
  { width = 220, height = 44, fontSize = 24, fontWeight = 400 } = {},
) => {
  const svg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <rect width="100%" height="100%" fill="none"/>
      <text x="0" y="${Math.round(fontSize * 1.2)}"
        font-family="Arial, Helvetica, sans-serif"
        font-size="${fontSize}"
        font-weight="${fontWeight}"
        fill="#000000">${escapeXml(text)}</text>
    </svg>`,
  );

  return sharp(svg).png().toBuffer();
};

const splitUnderlineTextRun = (text, replacements, replacementIndex) => {
  const parts = String(text).split(/(_{5,})/g);
  const runs = [];
  let nextReplacementIndex = replacementIndex;

  parts.forEach((part) => {
    if (!part) return;

    if (/^_{5,}$/.test(part)) {
      if (nextReplacementIndex < replacements.length) {
        const replacement = replacements[nextReplacementIndex];
        runs.push(
          typeof replacement === "function" ? replacement(part) : replacement,
        );
        nextReplacementIndex += 1;
      }
      return;
    }

    runs.push(buildWordTextRun(part));
  });

  return {
    xml: runs.join(""),
    replacementIndex: nextReplacementIndex,
  };
};

const buildTableCell = (content, width = 2400) => `
  <w:tc>
    <w:tcPr><w:tcW w:w="${width}" w:type="dxa"/></w:tcPr>
    ${content}
  </w:tc>`;

const buildTableRow = (cells) => `<w:tr>${cells.join("")}</w:tr>`;

const buildInspectionItemsTable = (
  items,
  imageManager,
  mechanicSignatureRelId,
) => {
  const checkRelId = imageManager.addImage(CHECK_IMAGE_BUFFER, "png");

  const rows = [
    buildTableRow([
      buildTableCell(buildWordParagraph("Item", { bold: true }), 5200),
      buildTableCell(buildWordParagraph("Checked", { bold: true }), 1200),
      buildTableCell(buildWordParagraph("Initials", { bold: true }), 2200),
    ]),
    ...items.map((item) => {
      const isChecked = item.status === "Checked";
      return buildTableRow([
        buildTableCell(buildWordParagraph(item.item), 5200),
        buildTableCell(
          isChecked
            ? buildWordImageParagraph(
                imageManager.imageXml(checkRelId, 190500, 190500),
              )
            : buildWordParagraph(""),
          1200,
        ),
        buildTableCell(
          isChecked && mechanicSignatureRelId
            ? buildWordImageParagraph(
                imageManager.imageXml(mechanicSignatureRelId, 1371600, 381000),
              )
            : buildWordParagraph(item.initial || ""),
          2200,
        ),
      ]);
    }),
  ];

  return `
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="0" w:type="auto"/>
        <w:tblBorders>
          <w:top w:val="single" w:sz="4" w:space="0" w:color="999999"/>
          <w:left w:val="single" w:sz="4" w:space="0" w:color="999999"/>
          <w:bottom w:val="single" w:sz="4" w:space="0" w:color="999999"/>
          <w:right w:val="single" w:sz="4" w:space="0" w:color="999999"/>
          <w:insideH w:val="single" w:sz="4" w:space="0" w:color="999999"/>
          <w:insideV w:val="single" w:sz="4" w:space="0" w:color="999999"/>
        </w:tblBorders>
      </w:tblPr>
      ${rows.join("")}
    </w:tbl>`;
};

const buildInspectionLogXml = (inspection, title, imageManager) => {
  const data = formatInspectionData(inspection);
  const items = formatInspectionItems(inspection);
  const mechanic = inspection.releasedBy || {};
  const mechanicSignature = getSignatureBuffer(mechanic);
  const mechanicSignatureRelId = mechanicSignature
    ? imageManager.addImage(
        mechanicSignature.buffer,
        mechanicSignature.extension,
      )
    : null;
  const lines = [
    buildWordParagraph(title, { bold: true, breakBefore: true }),
    buildWordParagraph(`RP/C: ${data.rpc}`),
    buildWordParagraph(`Date: ${data.date}`),
    buildWordParagraph(`FOB: ${normalizeFob(inspection.fob)}`),
    buildWordParagraph(`Released By Name: ${mechanic.name || "N/A"}`),
    buildWordParagraph(`Released By Title: ${mechanic.title || "N/A"}`),
    mechanicSignatureRelId
      ? buildWordImageParagraph(
          imageManager.imageXml(mechanicSignatureRelId, 1828800, 508000),
        )
      : buildWordParagraph("Released By Signature: N/A"),
    buildWordParagraph(`Aircraft Type: ${data.aircraftType}`),
    buildWordParagraph(`Status: ${data.status}`),
    buildWordParagraph(`Created By: ${data.createdBy}`),
    buildWordParagraph(
      `Released By: ${formatSignatureSummary(inspection.releasedBy)}`,
    ),
    buildWordParagraph(
      `Accepted By: ${formatSignatureSummary(inspection.acceptedBy)}`,
    ),
    buildWordParagraph("Checklist", { bold: true }),
    buildInspectionItemsTable(items, imageManager, mechanicSignatureRelId),
  ];

  if (data.remarks) {
    lines.push(buildWordParagraph("Remarks", { bold: true }));
    lines.push(buildWordParagraph(data.remarks));
  }

  return lines.join("");
};

const appendInspectionLogDetails = (zip, inspection, title) => {
  const documentFile = zip.file("word/document.xml");
  if (!documentFile) return;

  const imageManager = createImageManager(zip);
  const documentXml = documentFile.asText();
  const appendedXml = buildInspectionLogXml(inspection, title, imageManager);
  const nextDocumentXml = documentXml.includes("<w:sectPr")
    ? documentXml.replace(/(<w:sectPr[\s\S]*?<\/w:sectPr>)/, `${appendedXml}$1`)
    : documentXml.replace("</w:body>", `${appendedXml}</w:body>`);

  zip.file("word/document.xml", nextDocumentXml);
};

const replaceFirstUnderlineRun = (paragraphXml, replacementXml) =>
  paragraphXml.replace(
    /<w:r\b(?:(?!<\/w:r>)[\s\S])*?<w:t(?:\s+xml:space="preserve")?>[^<]*_{5,}[^<]*<\/w:t><\/w:r>/,
    replacementXml,
  );

const replaceUnderlineRuns = (paragraphXml, replacements) => {
  let replacementIndex = 0;

  return paragraphXml.replace(
    /<w:r\b(?:(?!<\/w:r>)[\s\S])*?<w:t(?:\s+xml:space="preserve")?>([^<]*_{5,}[^<]*)<\/w:t><\/w:r>/g,
    (runXml, text) => {
      const result = splitUnderlineTextRun(
        text,
        replacements,
        replacementIndex,
      );
      replacementIndex = result.replacementIndex;
      return result.xml || runXml;
    },
  );
};

const replaceTextAfterLabel = (documentXml, label, value) => {
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const escapedValue = escapeXml(value);
  const sameRunPattern = new RegExp(
    `(<w:t[^>]*>${escapedLabel}\\s*)(_+)(<\\/w:t>)`,
  );

  if (sameRunPattern.test(documentXml)) {
    return documentXml.replace(
      sameRunPattern,
      (_match, prefix, underline, suffix) => {
        return `${prefix}${escapeXml(fitValueToUnderline(value, underline))}${suffix}`;
      },
    );
  }

  return documentXml.replace(
    new RegExp(
      `(<w:t[^>]*>${escapedLabel}\\s*<\\/w:t>[\\s\\S]{0,500}?<w:t[^>]*>)(_+)(<\\/w:t>)`,
    ),
    (_match, prefix, underline, suffix) => {
      return `${prefix}${escapeXml(fitValueToUnderline(value, underline))}${suffix}`;
    },
  );
};

const fillPreInspectionTemplate = async (zip, inspection) => {
  const documentFile = zip.file("word/document.xml");
  if (!documentFile) return;

  const imageManager = createImageManager(zip);
  const releasedSignature = getSignatureBuffer(inspection.releasedBy);
  const acceptedSignature = getSignatureBuffer(inspection.acceptedBy);
  const releasedSignatureRelId = releasedSignature
    ? imageManager.addImage(
        releasedSignature.buffer,
        releasedSignature.extension,
      )
    : null;
  const acceptedSignatureRelId = acceptedSignature
    ? imageManager.addImage(
        acceptedSignature.buffer,
        acceptedSignature.extension,
      )
    : null;
  const checkRelId = imageManager.addImage(CHECK_IMAGE_BUFFER, "png");
  const addTextOverlay = async (text, options = {}) => {
    const relId = imageManager.addImage(
      await renderTextPng(text, {
        width: options.width || 220,
        height: options.height || 44,
        fontSize: options.fontSize || 24,
        fontWeight: options.fontWeight || 400,
      }),
      "png",
    );
    return imageManager.floatingImageXml(
      relId,
      pointsToEmu(options.widthPt || 110),
      pointsToEmu(options.heightPt || 18),
      pointsToEmu(options.xPt || 0),
      pointsToEmu(options.yPt || 0),
    );
  };
  const addImageOverlay = (relId, options = {}) =>
    imageManager.floatingImageXml(
      relId,
      pointsToEmu(options.widthPt || 72),
      pointsToEmu(options.heightPt || 24),
      pointsToEmu(options.xPt || 0),
      pointsToEmu(options.yPt || 0),
    );
  const insertOverlays = (paragraphXml, overlays) => {
    const filteredOverlays = overlays.filter(Boolean);
    if (!filteredOverlays.length) return paragraphXml;
    const overlayXml = filteredOverlays.join("");
    const pPrEndIndex = paragraphXml.indexOf("</w:pPr>");
    if (pPrEndIndex !== -1) {
      const insertAt = pPrEndIndex + "</w:pPr>".length;
      return `${paragraphXml.slice(0, insertAt)}${overlayXml}${paragraphXml.slice(insertAt)}`;
    }
    return paragraphXml.replace(
      /<w:p\b[^>]*>/,
      (match) => `${match}${overlayXml}`,
    );
  };

  let documentXml = documentFile.asText();

  let itemIndex = 0;
  let signatureLineMode = null;
  const paragraphReplacements = new Map();
  const paragraphs = documentXml.match(/<w:p\b[\s\S]*?<\/w:p>/g) || [];

  for (const paragraphXml of paragraphs) {
    if (
      paragraphXml.includes("Released") &&
      paragraphXml.includes("Accepted")
    ) {
      signatureLineMode = "signature";
      continue;
    }

    if (paragraphXml.includes("RP-C") && paragraphXml.includes("Date")) {
      paragraphReplacements.set(
        paragraphXml,
        insertOverlays(paragraphXml, [
          inspection.rpc
            ? await addTextOverlay(inspection.rpc, {
                xPt: 52,
                yPt: -1,
                width: 170,
                widthPt: 100,
                fontSize: 24,
              })
            : "",
          inspection.date
            ? await addTextOverlay(inspection.date, {
                xPt: 520,
                yPt: -1,
                width: 190,
                widthPt: 110,
                fontSize: 24,
              })
            : "",
        ]),
      );
      continue;
    }

    if (paragraphXml.includes("F.O.B")) {
      paragraphReplacements.set(
        paragraphXml,
        insertOverlays(paragraphXml, [
          await addTextOverlay(normalizeFob(inspection.fob), {
            xPt: 76,
            yPt: -1,
            width: 120,
            widthPt: 80,
            fontSize: 24,
          }),
        ]),
      );
      continue;
    }

    const itemKey = PRE_INSPECTION_TEMPLATE_KEYS[itemIndex];
    const isTemplateInfoLine =
      paragraphXml.includes("RP-C") ||
      paragraphXml.includes("Date") ||
      paragraphXml.includes("F.O.B") ||
      paragraphXml.includes("Released") ||
      paragraphXml.includes("Accepted");
    if (itemKey && !isTemplateInfoLine && paragraphXml.includes("__________")) {
      itemIndex += 1;
      if (inspection[itemKey] !== true) {
        continue;
      }

      paragraphReplacements.set(
        paragraphXml,
        insertOverlays(paragraphXml, [
          addImageOverlay(checkRelId, {
            xPt: 408,
            yPt: -2,
            widthPt: 14,
            heightPt: 14,
          }),
          releasedSignatureRelId
            ? addImageOverlay(releasedSignatureRelId, {
                xPt: 476,
                yPt: -10,
                widthPt: 58,
                heightPt: 24,
              })
            : await addTextOverlay(inspection.releasedBy?.name || "", {
                xPt: 472,
                yPt: -2,
                width: 120,
                widthPt: 70,
                fontSize: 16,
              }),
        ]),
      );
      continue;
    }

    if (
      signatureLineMode === "signature" &&
      paragraphXml.includes("_______________________________")
    ) {
      signatureLineMode = "license";
      paragraphReplacements.set(
        paragraphXml,
        insertOverlays(paragraphXml, [
          releasedSignatureRelId
            ? addImageOverlay(releasedSignatureRelId, {
                xPt: 42,
                yPt: -32,
                widthPt: 98,
                heightPt: 38,
              })
            : "",
          inspection.releasedBy?.name
            ? await addTextOverlay(inspection.releasedBy.name, {
                xPt: 55,
                yPt: -3,
                width: 180,
                widthPt: 112,
                fontSize: 22,
              })
            : "",
          acceptedSignatureRelId
            ? addImageOverlay(acceptedSignatureRelId, {
                xPt: 510,
                yPt: -32,
                widthPt: 98,
                heightPt: 38,
              })
            : "",
        ]),
      );
      continue;
    }

    if (
      signatureLineMode === "license" &&
      paragraphXml.includes("_______________________________")
    ) {
      signatureLineMode = null;
      const license =
        inspection.releasedBy?.licenseNo || inspection.releasedBy?.id || "";
      paragraphReplacements.set(
        paragraphXml,
        insertOverlays(paragraphXml, [
          license
            ? await addTextOverlay(license, {
                xPt: 55,
                yPt: -3,
                width: 190,
                widthPt: 120,
                fontSize: 22,
              })
            : "",
        ]),
      );
      continue;
    }
  }

  const nextDocumentXml = documentXml.replace(
    /<w:p\b[\s\S]*?<\/w:p>/g,
    (paragraphXml) => paragraphReplacements.get(paragraphXml) || paragraphXml,
  );

  zip.file("word/document.xml", nextDocumentXml);
};

/**
 * Format inspection items for iteration in template
 * @param {Object} inspection - Inspection object
 * @returns {Array} - Array of formatted items
 */
const formatInspectionItems = (inspection) => {
  const items = [];

  if (inspection.preInspectionItems) {
    Object.entries(inspection.preInspectionItems).forEach(([key, value]) => {
      items.push({
        item: key,
        status: value?.status || "N/A",
        notes: value?.notes || "",
        initial: value?.initial || "",
      });
    });
  }

  // Handle post-flight inspection items
  if (inspection.postInspectionItems) {
    Object.entries(inspection.postInspectionItems).forEach(([key, value]) => {
      items.push({
        item: key,
        status: value?.status || "N/A",
        notes: value?.notes || "",
        initial: value?.initial || "",
      });
    });
  }

  Object.entries(inspection).forEach(([key, value]) => {
    if (typeof value !== "boolean" || isMetadataField(key)) {
      return;
    }

    items.push({
      item: formatFieldLabel(key),
      status: value ? "Checked" : "",
      notes: "",
      initial: "",
    });
  });

  return items.length > 0
    ? items
    : [{ item: "No items recorded", status: "", notes: "", initial: "" }];
};

/**
 * Generate document from template with inspection data
 * @param {string} templateName - Name of the template file
 * @param {Object} inspection - Inspection data to populate
 * @returns {Buffer} - Generated document as buffer
 */
const generateDocument = async (templateName, inspection) => {
  try {
    const normalizedInspection =
      await withResolvedSignatureLicenses(inspection);
    const zip = loadTemplate(templateName);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });

    const data = formatInspectionData(normalizedInspection);
    doc.render(data);
    if (templateName === "pre-flight inspection.docx") {
      await fillPreInspectionTemplate(doc.getZip(), normalizedInspection);
    }

    return doc.getZip().generate({ type: "nodebuffer" });
  } catch (error) {
    console.error(
      `Error generating document from template ${templateName}:`,
      error,
    );
    throw new Error(`Failed to generate document: ${error.message}`);
  }
};

/**
 * Get pre-flight inspection document
 * @param {Object} inspection - Pre-inspection data
 * @returns {Buffer} - Generated document buffer
 */
const getPreInspectionDocument = async (inspection) => {
  return generateDocument("pre-flight inspection.docx", inspection);
};

/**
 * Get post-flight inspection document
 * @param {Object} inspection - Post-inspection data
 * @returns {Buffer} - Generated document buffer
 */
const getPostInspectionDocument = async (inspection) => {
  return generateDocument("post-flight inspection.docx", inspection);
};

const convertDocxBufferToPdf = (documentBuffer, filePrefix) => {
  fs.mkdirSync(EXPORT_TMP_DIR, { recursive: true });

  const workDir = fs.mkdtempSync(path.join(EXPORT_TMP_DIR, `${filePrefix}-`));
  const docxPath = path.join(workDir, `${filePrefix}.docx`);
  const pdfPath = path.join(workDir, `${filePrefix}.pdf`);

  try {
    fs.writeFileSync(docxPath, documentBuffer);
    const output = execFileSync(
      "cscript.exe",
      ["//NoLogo", DOCX_TO_PDF_SCRIPT, docxPath, pdfPath],
      {
        windowsHide: true,
        stdio: "pipe",
        encoding: "utf8",
      },
    );

    if (!fs.existsSync(pdfPath)) {
      throw new Error(
        `PDF conversion did not create an output file. ${output || ""}`.trim(),
      );
    }

    return fs.readFileSync(pdfPath);
  } finally {
    fs.rmSync(workDir, { recursive: true, force: true });
  }
};

const signatureImageBuffer = (signature = {}) => {
  const parsed = getSignatureBuffer(signature);
  return parsed?.buffer || null;
};

const normalizePngForPdf = async (buffer) => {
  if (!buffer) return null;
  try {
    return await sharp(buffer).png().toBuffer();
  } catch {
    return null;
  }
};

const getNgcpLogoBuffer = async () => {
  try {
    return await normalizePngForPdf(await fs.promises.readFile(NGCP_LOGO_PATH));
  } catch {
    return null;
  }
};

const drawNgcpLogo = (doc, logoBuffer, x, y, width, height) => {
  if (logoBuffer) {
    doc.image(logoBuffer, x, y, { fit: [width, height] });
    return;
  }

  doc
    .font("Helvetica-Bold")
    .fontSize(28)
    .fillColor("#0a8f63")
    .text("N", x, y + 4, { continued: true });
  doc.fillColor("#000").text("GCP", { continued: false });
  doc
    .font("Helvetica")
    .fontSize(7)
    .fillColor("#000")
    .text("BRIDGING POWER & PROGRESS", x, y + 36);
};

const drawPdfLine = (doc, x1, y1, x2, y2) => {
  doc.moveTo(x1, y1).lineTo(x2, y2).stroke();
};

const drawSignature = (doc, signatureBuffer, x, y, width = 78, height = 28) => {
  if (!signatureBuffer) return;
  try {
    doc.image(signatureBuffer, x, y, { fit: [width, height] });
  } catch {
    // Ignore invalid stored signatures so the export can still complete.
  }
};

const getPreInspectionPdfDirect = async (inspection = {}) => {
  inspection = await withResolvedSignatureLicenses(inspection);
  const releasedSignature = await normalizePngForPdf(
    signatureImageBuffer(inspection.releasedBy),
  );
  const acceptedSignature = await normalizePngForPdf(
    signatureImageBuffer(inspection.acceptedBy),
  );
  const checkImage = await normalizePngForPdf(CHECK_IMAGE_BUFFER);
  const ngcpLogo = await getNgcpLogoBuffer();

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "LETTER", margin: 36 });
    const chunks = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageWidth = doc.page.width;
    const contentRight = pageWidth - 42;
    const statusX = contentRight - 126;
    const initialX = contentRight - 58;
    const descX = 245;
    const itemX = 42;

    const ensureSpace = (needed = 70) => {
      if (doc.y + needed <= doc.page.height - 90) return;
      doc.addPage();
      doc.y = 54;
    };

    const drawHeader = () => {
      drawNgcpLogo(doc, ngcpLogo, 42, 34, 96, 42);
      doc
        .font("Helvetica-Bold")
        .fontSize(18)
        .text("AS 350 B3e 360° PRE-FLIGHT INSPECTION", 182, 54);
      drawPdfLine(doc, 182, 76, 525, 76);

      doc.fontSize(12).text("RP-C", 42, 118);
      doc
        .font("Helvetica")
        .fontSize(9)
        .text(inspection.rpc || "", 82, 119);
      drawPdfLine(doc, 82, 132, 186, 132);
      doc.font("Helvetica-Bold").fontSize(12).text("Date", 470, 118);
      doc
        .font("Helvetica")
        .fontSize(9)
        .text(
          formatInspectionDate(
            inspection.date ||
              inspection.inspectionDate ||
              inspection.createdAt,
          ),
          505,
          119,
          { width: 66, align: "center", lineBreak: false },
        );
      drawPdfLine(doc, 505, 132, 571, 132);

      doc.font("Helvetica").fontSize(9).text("Status", statusX, 150);
      drawPdfLine(doc, statusX, 164, statusX + 40, 164);
      doc.text("Initial", initialX, 150);
      drawPdfLine(doc, initialX, 164, initialX + 38, 164);
      doc.y = 150;
    };

    const drawChecklistItem = (key, title, description, number) => {
      ensureSpace(18);
      const y = doc.y;
      doc.font("Helvetica").fontSize(8.7).fillColor("#000");
      doc.text(`${number}. ${title}`, itemX, y, {
        width: 200,
        lineBreak: false,
      });
      doc.text("-", descX - 22, y);
      doc.text(description, descX, y, {
        width: statusX - descX - 4,
        lineBreak: false,
      });
      drawPdfLine(doc, statusX, y + 10, statusX + 48, y + 10);
      drawPdfLine(doc, initialX, y + 10, initialX + 52, y + 10);

      if (inspection[key] === true) {
        if (checkImage) {
          doc.image(checkImage, statusX + 18, y - 2, { fit: [12, 12] });
        }
        drawSignature(doc, releasedSignature, initialX + 2, y - 8, 48, 18);
      }

      doc.y = y + 11;
    };

    const drawGroup = (group) => {
      ensureSpace(42);
      doc.moveDown(1.15);
      const y = doc.y;
      doc.font("Helvetica-Bold").fontSize(12).text(group.title, itemX, y);
      drawPdfLine(
        doc,
        itemX,
        y + 14,
        itemX + doc.widthOfString(group.title),
        y + 14,
      );
      doc.y = y + 19;
      group.items.forEach(([key, title, description], index) =>
        drawChecklistItem(key, title, description, index + 1),
      );
    };

    drawHeader();
    PRE_INSPECTION_PDF_GROUPS.forEach(drawGroup);

    ensureSpace(170);
    doc.moveDown(2);
    const bottomY = doc.y;
    doc.font("Helvetica-Bold").fontSize(12).text("F.O.B", 42, bottomY);
    doc
      .font("Helvetica")
      .fontSize(9)
      .text(normalizeFob(inspection.fob), 118, bottomY + 1);
    drawPdfLine(doc, 78, bottomY + 14, 210, bottomY + 14);

    const signY = bottomY + 54;
    doc.font("Helvetica").fontSize(11).text("Released by:", 42, signY);
    doc.text("Accepted by:", 362, signY);
    drawSignature(doc, releasedSignature, 72, signY + 16, 105, 42);
    drawSignature(doc, acceptedSignature, 394, signY + 16, 105, 42);
    doc.fontSize(9).text(inspection.releasedBy?.name || "", 88, signY + 60, {
      width: 170,
      align: "center",
    });
    doc.text(inspection.acceptedBy?.name || "", 381, signY + 60, {
      width: 170,
      align: "center",
      lineBreak: false,
    });
    drawPdfLine(doc, 42, signY + 76, 250, signY + 76);
    drawPdfLine(doc, 362, signY + 76, 570, signY + 76);
    doc
      .font("Helvetica-Bold")
      .fontSize(12)
      .text(
        getSignatureTitle(inspection.releasedBy, "Mechanic"),
        122,
        signY + 82,
      );
    doc.text(
      getSignatureTitle(inspection.acceptedBy, "Pilot"),
      442,
      signY + 82,
      {
        width: 50,
        align: "center",
        lineBreak: false,
      },
    );

    const licenseY = signY + 118;
    doc
      .font("Helvetica")
      .fontSize(9)
      .text(
        inspection.releasedBy?.licenseNo || inspection.releasedBy?.id || "",
        92,
        licenseY - 1,
        { width: 150, align: "center" },
      );
    doc.text(
      inspection.acceptedBy?.licenseNo || inspection.acceptedBy?.id || "",
      381,
      licenseY - 1,
      { width: 170, align: "center", lineBreak: false },
    );
    drawPdfLine(doc, 42, licenseY + 14, 250, licenseY + 14);
    drawPdfLine(doc, 362, licenseY + 14, 570, licenseY + 14);
    doc
      .font("Helvetica-Bold")
      .fontSize(12)
      .text("A & P License Nr.", 92, licenseY + 20);
    doc.text("CHPL Nr.", 430, licenseY + 20, {
      width: 72,
      align: "center",
      lineBreak: false,
    });

    doc.end();
  });
};

const getPreInspectionPdf = (inspection) =>
  getPreInspectionPdfDirect(inspection);

const POST_INSPECTION_PDF_SECTIONS = [
  ["station1_", "STATION 1"],
  ["station2_", "STATION 2"],
  ["engine_", "ENGINE AND ENGINE BAY"],
  ["station3_", "STATION 3"],
  ["mainRotor_", "MAIN ROTOR HEAD"],
  ["cabin_", "CABIN INTERIOR"],
];

const getPostInspectionPdfDirect = async (inspection = {}) => {
  inspection = await withResolvedSignatureLicenses(inspection);
  const releasedSignature = await normalizePngForPdf(
    signatureImageBuffer(inspection.releasedBy),
  );
  const checkImage = await normalizePngForPdf(CHECK_IMAGE_BUFFER);
  const ngcpLogo = await getNgcpLogoBuffer();

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "LETTER", margin: 36 });
    const chunks = [];
    const left = 42;
    const right = doc.page.width - 42;
    const statusX = right - 126;
    const initialX = right - 58;
    const itemWidth = statusX - left - 12;

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const drawHeader = () => {
      drawNgcpLogo(doc, ngcpLogo, left, 32, 96, 42);
      doc
        .font("Helvetica-Bold")
        .fontSize(17)
        .text("AS 350 B3e POST-FLIGHT INSPECTION", 182, 51, {
          width: 388,
          align: "center",
          lineBreak: false,
        });
      drawPdfLine(doc, 182, 74, right, 74);

      doc.fontSize(11).text("RP-C", left, 100);
      doc
        .font("Helvetica")
        .fontSize(9)
        .text(inspection.rpc || "", 82, 101, {
          width: 104,
          lineBreak: false,
        });
      drawPdfLine(doc, 82, 114, 186, 114);
      doc.font("Helvetica-Bold").fontSize(11).text("Date", 470, 100);
      doc
        .font("Helvetica")
        .fontSize(9)
        .text(
          formatInspectionDate(
            inspection.date ||
              inspection.inspectionDate ||
              inspection.createdAt,
          ),
          505,
          101,
          { width: 66, align: "center", lineBreak: false },
        );
      drawPdfLine(doc, 505, 114, 571, 114);

      doc.font("Helvetica-Bold").fontSize(8).text("INSPECTION ITEM", left, 130);
      doc.text("STATUS", statusX, 130, { width: 48, align: "center" });
      doc.text("INITIAL", initialX, 130, { width: 52, align: "center" });
      drawPdfLine(doc, left, 143, right, 143);
      doc.y = 149;
    };

    const ensureSpace = (height) => {
      if (doc.y + height <= doc.page.height - 52) return;
      doc.addPage();
      drawHeader();
    };

    drawHeader();

    POST_INSPECTION_PDF_SECTIONS.forEach(([prefix, title]) => {
      const items = Object.entries(inspection).filter(
        ([key, value]) => key.startsWith(prefix) && typeof value === "boolean",
      );
      if (!items.length) return;

      ensureSpace(30);
      doc
        .font("Helvetica-Bold")
        .fontSize(10)
        .text(title, left, doc.y + 4);
      doc.y += 19;

      items.forEach(([key, checked], index) => {
        const label = formatFieldLabel(key.slice(prefix.length));
        doc.font("Helvetica").fontSize(8);
        const textHeight = Math.max(
          11,
          doc.heightOfString(`${index + 1}. ${label}`, {
            width: itemWidth,
          }),
        );
        const rowHeight = textHeight + 5;
        ensureSpace(rowHeight);
        const y = doc.y;

        doc.text(`${index + 1}. ${label}`, left, y, { width: itemWidth });
        drawPdfLine(
          doc,
          statusX,
          y + rowHeight - 3,
          statusX + 48,
          y + rowHeight - 3,
        );
        drawPdfLine(
          doc,
          initialX,
          y + rowHeight - 3,
          initialX + 52,
          y + rowHeight - 3,
        );
        if (checked && checkImage) {
          doc.image(checkImage, statusX + 18, y - 1, { fit: [12, 12] });
          drawSignature(doc, releasedSignature, initialX + 2, y - 5, 48, 16);
        }
        doc.y = y + rowHeight;
      });
    });

    ensureSpace(145);
    const signY = doc.y + 24;
    doc.font("Helvetica").fontSize(10).text("Released by:", left, signY);
    drawSignature(doc, releasedSignature, 72, signY + 12, 105, 38);
    doc.fontSize(9).text(inspection.releasedBy?.name || "", 62, signY + 52, {
      width: 170,
      align: "center",
      lineBreak: false,
    });
    drawPdfLine(doc, left, signY + 68, 250, signY + 68);
    doc
      .font("Helvetica-Bold")
      .fontSize(11)
      .text(
        getSignatureTitle(inspection.releasedBy, "Mechanic"),
        92,
        signY + 74,
        { width: 110, align: "center", lineBreak: false },
      );
    doc
      .font("Helvetica")
      .fontSize(9)
      .text(
        inspection.releasedBy?.licenseNo || inspection.releasedBy?.id || "",
        62,
        signY + 101,
        { width: 170, align: "center", lineBreak: false },
      );
    drawPdfLine(doc, left, signY + 115, 250, signY + 115);
    doc
      .font("Helvetica-Bold")
      .fontSize(11)
      .text("A & P License Nr.", 87, signY + 121);

    doc.end();
  });
};

const getPostInspectionPdf = (inspection) =>
  getPostInspectionPdfDirect(inspection);

module.exports = {
  loadTemplate,
  generateDocument,
  formatInspectionData,
  formatInspectionItems,
  getPreInspectionPdf,
  getPostInspectionPdf,
};
