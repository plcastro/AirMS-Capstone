const PartsMonitoring = require("../../models/partsMonitoringModel");
const MaintenanceLog = require("../../models/maintenanceLogModel");
const Task = require("../../models/taskModel");
const FlightLog = require("../../models/flightLogModel");

const RISK_RANK = {
  Low: 1,
  Medium: 2,
  High: 3,
  Critical: 4,
};

const HYDRAULIC_KEYWORDS = [
  "hyd",
  "hydraulic",
  "servo",
  "servocontrol",
  "accumulator",
  "load compensator",
  "pump",
  "reservoir",
  "filter",
  "strainer",
  "hyd tst",
  "accu",
  "regulating unit",
  "pressure drop indicator",
  "cyclic stick",
  "dissymmetric load",
];

const HYDRAULIC_LEAK_KEYWORDS = ["leak", "leaking", "rupture", "burst"];
const HYDRAULIC_PRESSURE_KEYWORDS = [
  "pressure",
  "press",
  "hyd pressure",
  "pressure drop",
  "accumulator reserve",
  "pressure gauge",
  "charging pressure",
  "discharge accumulator",
  "hyd pressure drop indicator",
  "dissymmetric load",
];
const HYDRAULIC_FILTER_KEYWORDS = [
  "filter",
  "filtering element",
  "strainer",
  "clog",
  "clogged",
  "contamination",
  "pollution",
  "reservoir",
  "cm 208",
];

const MANUAL_SIGNAL_KEYWORDS = {
  rotorBrake: ["rotor brake", "main rotor brake"],
  nrnfIndicator: [
    "nr nf",
    "nr/nf",
    "nr indicator",
    "nf indicator",
    "n rotor alarm",
    "n rotor",
  ],
  loadCompensator: ["load compensator"],
  engineOilIndication: [
    "engine oil pressure",
    "engine oil temperature",
    "oil pressure",
    "oil temperature",
    "oil temp",
  ],
  twistGripFuelControl: [
    "twist grip",
    "fuel flow control",
  ],
  tailDriveLine: [
    "tail drive line",
    "rear shaft section",
    "equipped front section",
    "sliding flange",
    "bearing hangers",
    "flexible coupling attachment",
    "tail drive",
  ],
  tailGearBox: [
    "tail gear box",
    "tgb housing",
    "pitch change spider",
    "pitch change rods",
    "control plate bearing",
    "control lever",
    "rotor shaft",
    "flange input",
  ],
  tailRotorBlades: [
    "tail rotor blades",
    "pitch horn assembly",
    "chin weights",
    "chinese weights",
    "blanking cap",
    "blanking cover",
    "edge tab",
  ],
  rotorActuatorsDualHydraulic: [
    "servocontrol",
    "servocontrols",
    "rotor actuators",
    "dual hydraulic",
  ],
  tailDriveLineSlidingFlange: ["sliding flange"],
  tailDriveLineFlexibleCoupling: [
    "flexible coupling attachment",
    "flexible coupling",
  ],
  tailDriveLineRearSection: [
    "rear shaft section",
    "inside of the rear section",
    "rear section",
  ],
  tailDriveLineFrontSection: ["equipped front section", "front section"],
  tailDriveLineBearingHangers: ["bearing hangers", "bearings hangers", "hanger bearing"],
  tailGearBoxHousing: ["tgb housing"],
  tailGearBoxRotorShaft: ["rotor shaft"],
  tailGearBoxControlLever: ["control lever"],
  tailGearBoxPitchChangeRods: ["pitch change rods", "elastomer pitch change rods"],
  tailGearBoxControlPlateBearing: ["control plate bearing"],
  tailRotorBladesPitchHornAssembly: ["pitch horn assembly", "pitch horn"],
  tailRotorBladesEdgeTab: ["edge tab"],
  tailRotorBladesChinWeights: [
    "chin weights",
    "chinese weights",
    "blanking cap",
    "blanking cover",
  ],
};

const ARRIEL_FADEC_CODES = ["44", "47", "48", "49", "71", "121", "122", "123", "125", "135", "143"];
const normalizeText = (value = "") =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const includesAnyKeyword = (text = "", keywords = []) =>
  keywords.some((keyword) => text.includes(keyword));

const collectTaskNarrativeTexts = (task = {}) => [
  task.title,
  task.findings,
  task.defects,
  task.correctiveActionDone,
  task.completionNotes,
  task.maintenanceHistory?.historyNotes,
  task.performance?.delayReason,
  task.summary?.category,
  task.summary?.severity,
  task.summary?.result,
  task.summary?.remarks,
  ...(task.checklistItems || []).flatMap((item) => [
    item.taskName,
    item.component,
    item.description,
    item.correctiveAction,
    item.documentation,
    item.inspectionName,
    item.inspectionTypeFull,
    item.environmentalCondition,
  ]),
].filter(Boolean);

const collectMaintenanceLogNarrativeTexts = (log = {}) => [
  log.defects,
  log.correctiveActionDone,
  log.status,
].filter(Boolean);

const collectFlightNarrativeTexts = (log = {}) => [
  log.remarks,
  ...(log.workItems || []).flatMap((item) => [
    item.description,
    item.performedBy,
  ]),
  ...(log.oilServicing || []).flatMap((item) => [item.remarks]),
].filter(Boolean);

const getStructuredTaskComponentFacts = (text = "") => ({
  "tasks.component.engineMgbDriveLineCount": includesAnyKeyword(text, [
    "engine mgb drive line",
    "engine or mgb drive line",
    "hydraulic pump drive belt",
    "drive bearing",
    "mgb drive shaft",
    "gimbal ring",
    "sealing sleeve",
    "engine flange",
    "drive flange",
    "driven pulley",
    "poly v",
    "flexible coupling",
    "drive splines",
  ]),
  "tasks.component.engineMgbDriveLineBeltCount": includesAnyKeyword(text, [
    "hydraulic pump drive belt",
    "belt tension",
    "tension of the hydraulic pump drive belt",
  ]),
  "tasks.component.engineMgbDriveLineBearingCount": includesAnyKeyword(text, [
    "drive bearing",
    "belt driven hydraulic pump drive bearing",
  ]),
  "tasks.component.engineMgbDriveLineFlexibleCouplingCount": includesAnyKeyword(text, [
    "belt driven hydraulic pump flexible coupling",
    "flexible couplings",
    "flexible coupling",
  ]),
  "tasks.component.engineMgbDriveLineSealingSleeveCount": includesAnyKeyword(text, [
    "sealing sleeve",
  ]),
  "tasks.component.engineMgbDriveLineSplinesCount": includesAnyKeyword(text, [
    "drive splines",
    "pump drive splines",
    "belt driven hydraulic pump drive splines",
  ]),
  "tasks.component.engineMgbDriveLineDriveShaftCount": includesAnyKeyword(text, [
    "mgb drive shaft",
    "drive shaft",
  ]),
  "tasks.component.engineMgbDriveLineGimbalCount": includesAnyKeyword(text, [
    "gimbal ring",
    "gimbal ring pin",
  ]),
  "tasks.component.engineMgbDriveLineDriveFlangeCount": includesAnyKeyword(text, [
    "drive flange",
    "pump drive flange",
  ]),
  "tasks.component.engineMgbDriveLineEngineFlangeCount": includesAnyKeyword(text, [
    "engine flange",
  ]),
  "tasks.component.engineMgbDriveLineCouplingHousingCount": includesAnyKeyword(text, [
    "engine coupling housing",
    "mgb coupling housing",
    "coupling housing",
  ]),
  "tasks.component.engineMgbDriveLineDrivenPulleyCount": includesAnyKeyword(text, [
    "driven pulley",
    "poly v",
  ]),
  "tasks.component.biDirectionalSuspensionCount": includesAnyKeyword(text, [
    "bi directional suspension",
    "bi directional",
    "laminated suspension",
    "suspension crossbeam",
    "laminated stops",
  ]),
  "tasks.component.biDirectionalSuspensionCrossbeamCount": includesAnyKeyword(text, [
    "suspension crossbeam",
    "350a38 1018",
    "350a38 1040",
  ]),
  "tasks.component.biDirectionalSuspensionLaminatedStopsCount": includesAnyKeyword(text, [
    "laminated stops",
  ]),
  "tasks.component.biDirectionalSuspensionBlockPinsCount": includesAnyKeyword(text, [
    "laminated suspension block pins",
    "block pins",
  ]),
  "tasks.component.biDirectionalSuspensionBlockSupportsCount": includesAnyKeyword(text, [
    "laminated suspension block supports",
    "block supports",
  ]),
  "tasks.component.mgbSuspensionBarCount": includesAnyKeyword(text, [
    "mgb suspension bar",
    "mgb bar",
  ]),
  "tasks.component.mgbSuspensionBarBoltCount": includesAnyKeyword(text, [
    "mgb suspension bar bolt",
    "suspension bar bolt",
  ]),
  "tasks.component.tailRotorBladesCount": includesAnyKeyword(text, [
    "tail rotor blades",
    "inserted tab",
    "pitch horn assembly",
    "edge tab",
    "chin weights",
    "chinese weights",
  ]),
  "tasks.component.tailRotorBladesInsertedTabCount": includesAnyKeyword(text, [
    "tail rotor blades with inserted tab",
    "inserted tab",
  ]),
  "tasks.component.tailRotorBladesPitchHornAssemblyCount": includesAnyKeyword(text, [
    "pitch horn assembly",
    "pitch horn",
  ]),
  "tasks.component.tailRotorBladesEdgeTabCount": includesAnyKeyword(text, [
    "edge tab",
  ]),
  "tasks.component.tailRotorBladesChinWeightsCount": includesAnyKeyword(text, [
    "chin weights",
    "chinese weights",
    "blanking cap",
    "blanking cover",
  ]),
  "tasks.component.tailDriveLineCount": includesAnyKeyword(text, [
    "tail drive line",
    "rear shaft section",
    "equipped front section",
    "sliding flange",
    "bearing hangers",
    "flexible coupling",
  ]),
  "tasks.component.tailDriveLineSlidingFlangeCount": includesAnyKeyword(text, [
    "sliding flange",
  ]),
  "tasks.component.tailDriveLineFlexibleCouplingCount": includesAnyKeyword(text, [
    "flexible coupling",
    "flexible coupling attachment",
  ]),
  "tasks.component.tailDriveLineRearSectionCount": includesAnyKeyword(text, [
    "rear shaft section",
    "inside of the rear section",
    "rear section",
  ]),
  "tasks.component.tailDriveLineFrontSectionCount": includesAnyKeyword(text, [
    "equipped front section",
    "front section",
  ]),
  "tasks.component.tailDriveLineBearingHangersCount": includesAnyKeyword(text, [
    "bearing hangers",
    "bearings hangers",
    "hanger bearing",
  ]),
  "tasks.component.tailGearBoxCount": includesAnyKeyword(text, [
    "tail gear box",
    "tgb",
    "rotor shaft",
    "control plate bearing",
    "pitch change rods",
    "control lever",
  ]),
  "tasks.component.tailGearBoxControlLeverCount": includesAnyKeyword(text, [
    "control lever",
    "control lever bushes",
    "yoke lug",
  ]),
  "tasks.component.tailGearBoxHousingCount": includesAnyKeyword(text, [
    "tgb housing",
    "tail gear box housing",
  ]),
  "tasks.component.tailGearBoxRotorShaftCount": includesAnyKeyword(text, [
    "rotor shaft",
  ]),
  "tasks.component.tailGearBoxPitchChangeRodsCount": includesAnyKeyword(text, [
    "pitch change rods",
    "elastomer pitch change rods",
    "pitch change links",
  ]),
  "tasks.component.tailGearBoxControlPlateBearingCount": includesAnyKeyword(text, [
    "control plate bearing",
  ]),
  "tasks.component.rotorActuatorsDualHydraulicCount": includesAnyKeyword(text, [
    "servocontrol",
    "servocontrols",
    "rotor actuators",
    "dual hydraulic",
  ]),
  "tasks.component.loadCompensatorCount": includesAnyKeyword(text, ["load compensator"]),
  "tasks.component.engineControlsCount": includesAnyKeyword(text, [
    "twist grip",
    "fuel flow control",
    "engine controls",
  ]),
  "tasks.component.engineOilIndicationCount": includesAnyKeyword(text, [
    "engine oil pressure",
    "engine oil temperature",
    "oil pressure",
    "oil temperature",
  ]),
  "tasks.component.nrnfIndicatorCount": includesAnyKeyword(text, [
    "nr nf",
    "nr/nf",
    "nr indicator",
    "nf indicator",
    "n rotor alarm",
  ]),
  "tasks.component.rotorBrakeCount": includesAnyKeyword(text, [
    "rotor brake",
    "main rotor brake",
  ]),
});

const incrementStructuredTaskFacts = (facts = {}, item = {}) => {
  const chapter = Number(item.ata?.chapter);
  if (Number.isFinite(chapter) && chapter > 0) {
    const chapterFact = `tasks.ata.chapter${chapter}Count`;
    if (typeof facts[chapterFact] === "number") {
      facts[chapterFact] += 1;
    }
  }

  const section = Number(item.ata?.section);
  if (
    Number.isFinite(chapter) &&
    chapter > 0 &&
    Number.isFinite(section) &&
    section >= 0
  ) {
    const sectionFact = `tasks.ata.chapter${chapter}.section${section}Count`;
    if (typeof facts[sectionFact] === "number") {
      facts[sectionFact] += 1;
    }
  }

  const structuredText = normalizeText(
    [
      item.component,
      item.componentModel,
      item.inspectionName,
      item.inspectionTypeFull,
      item.documentation,
      item.description,
      item.taskName,
      item.ata?.chapterName,
      item.ata?.sectionName,
    ]
      .filter(Boolean)
      .join(" "),
  );

  const componentFacts = getStructuredTaskComponentFacts(structuredText);
  Object.entries(componentFacts).forEach(([factKey, matched]) => {
    if (matched && typeof facts[factKey] === "number") {
      facts[factKey] += 1;
    }
  });

  const modificationStatus = normalizeText(item.conditions?.modificationStatus);
  if (modificationStatus.includes("pre mod")) {
    facts["tasks.mod.preCount"] += 1;
  }
  if (modificationStatus.includes("post mod")) {
    facts["tasks.mod.postCount"] += 1;
  }

  const modificationNumbers = Array.isArray(item.conditions?.modificationNumbers)
    ? item.conditions.modificationNumbers
    : [];
  modificationNumbers.forEach((rawNumber) => {
    const normalizedNumber = String(rawNumber || "").replace(/\D/g, "");
    const factKey = `tasks.mod.number.${normalizedNumber}Count`;
    if (typeof facts[factKey] === "number") {
      facts[factKey] += 1;
    }
  });
};

const collectSignalHits = (text = "") => {
  const hits = {
    rotorBrake: false,
    nrnfIndicator: false,
    loadCompensator: false,
    engineOilIndication: false,
    twistGripFuelControl: false,
    tailDriveLine: false,
    tailGearBox: false,
    tailRotorBlades: false,
    rotorActuatorsDualHydraulic: false,
    tailDriveLineSlidingFlange: false,
    tailDriveLineFlexibleCoupling: false,
    tailDriveLineRearSection: false,
    tailDriveLineFrontSection: false,
    tailDriveLineBearingHangers: false,
    tailGearBoxHousing: false,
    tailGearBoxRotorShaft: false,
    tailGearBoxControlLever: false,
    tailGearBoxPitchChangeRods: false,
    tailGearBoxControlPlateBearing: false,
    tailRotorBladesPitchHornAssembly: false,
    tailRotorBladesEdgeTab: false,
    tailRotorBladesChinWeights: false,
    arrielFadecCodes: [],
  };

  Object.entries(MANUAL_SIGNAL_KEYWORDS).forEach(([key, keywords]) => {
    hits[key] = includesAnyKeyword(text, keywords);
  });

  if (text.includes("arriel 2b1") || text.includes("fadec") || text.includes("vemd")) {
    hits.arrielFadecCodes = ARRIEL_FADEC_CODES.filter(
      (code) =>
        text.includes(`fail code ${code}`) ||
        text.includes(`malfunction code ${code}`) ||
        text.includes(`surv fadec ${code}`) ||
        text.includes(`surv rec ${code}`) ||
        text.includes(`dom ff ${code}`),
    );
  }

  return hits;
};

const incrementSignalFacts = (facts = {}, hits = {}) => {
  if (hits.rotorBrake) {
    facts["signals.rotorBrakeCount"] += 1;
  }
  if (hits.nrnfIndicator) {
    facts["signals.nrnfIndicatorCount"] += 1;
  }
  if (hits.loadCompensator) {
    facts["signals.loadCompensatorCount"] += 1;
  }
  if (hits.engineOilIndication) {
    facts["signals.engineOilIndicationCount"] += 1;
  }
  if (hits.twistGripFuelControl) {
    facts["signals.twistGripFuelControlCount"] += 1;
  }
  if (hits.tailDriveLine) {
    facts["signals.tailDriveLineCount"] += 1;
  }
  if (hits.tailGearBox) {
    facts["signals.tailGearBoxCount"] += 1;
  }
  if (hits.tailRotorBlades) {
    facts["signals.tailRotorBladesCount"] += 1;
  }
  if (hits.rotorActuatorsDualHydraulic) {
    facts["signals.rotorActuatorsDualHydraulicCount"] += 1;
  }
  if (hits.tailDriveLineSlidingFlange) {
    facts["signals.tailDriveLineSlidingFlangeCount"] += 1;
  }
  if (hits.tailDriveLineFlexibleCoupling) {
    facts["signals.tailDriveLineFlexibleCouplingCount"] += 1;
  }
  if (hits.tailDriveLineRearSection) {
    facts["signals.tailDriveLineRearSectionCount"] += 1;
  }
  if (hits.tailDriveLineFrontSection) {
    facts["signals.tailDriveLineFrontSectionCount"] += 1;
  }
  if (hits.tailDriveLineBearingHangers) {
    facts["signals.tailDriveLineBearingHangersCount"] += 1;
  }
  if (hits.tailGearBoxHousing) {
    facts["signals.tailGearBoxHousingCount"] += 1;
  }
  if (hits.tailGearBoxRotorShaft) {
    facts["signals.tailGearBoxRotorShaftCount"] += 1;
  }
  if (hits.tailGearBoxControlLever) {
    facts["signals.tailGearBoxControlLeverCount"] += 1;
  }
  if (hits.tailGearBoxPitchChangeRods) {
    facts["signals.tailGearBoxPitchChangeRodsCount"] += 1;
  }
  if (hits.tailGearBoxControlPlateBearing) {
    facts["signals.tailGearBoxControlPlateBearingCount"] += 1;
  }
  if (hits.tailRotorBladesPitchHornAssembly) {
    facts["signals.tailRotorBladesPitchHornAssemblyCount"] += 1;
  }
  if (hits.tailRotorBladesEdgeTab) {
    facts["signals.tailRotorBladesEdgeTabCount"] += 1;
  }
  if (hits.tailRotorBladesChinWeights) {
    facts["signals.tailRotorBladesChinWeightsCount"] += 1;
  }

  if (Array.isArray(hits.arrielFadecCodes) && hits.arrielFadecCodes.length > 0) {
    facts["signals.arrielFadecCodeCount"] += hits.arrielFadecCodes.length;
    facts["signals.arrielFadecCodes"] = Array.from(
      new Set([...(facts["signals.arrielFadecCodes"] || []), ...hits.arrielFadecCodes]),
    );
    hits.arrielFadecCodes.forEach((code) => {
      const codeCountFact = `signals.arrielFadecCode${code}Count`;
      if (typeof facts[codeCountFact] === "number") {
        facts[codeCountFact] += 1;
      }
    });
  }
};

const getHydraulicFlags = (...values) => {
  const text = normalizeText(values.filter(Boolean).join(" "));
  const hasHydraulicContext = includesAnyKeyword(text, HYDRAULIC_KEYWORDS);

  return {
    text,
    hasHydraulicContext,
    hasLeak: hasHydraulicContext && includesAnyKeyword(text, HYDRAULIC_LEAK_KEYWORDS),
    hasPressure:
      hasHydraulicContext && includesAnyKeyword(text, HYDRAULIC_PRESSURE_KEYWORDS),
    hasFilter:
      hasHydraulicContext && includesAnyKeyword(text, HYDRAULIC_FILTER_KEYWORDS),
  };
};

const parseNumber = (value) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number.parseFloat(String(value).replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
};

const toDate = (value) => {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getAircraftKey = (value = "") => String(value || "").trim();

const buildFactsMap = async () => {
  const [partsRecords, maintenanceLogs, tasks, flightLogs] = await Promise.all([
    PartsMonitoring.find({}).sort({ aircraft: 1 }).lean(),
    MaintenanceLog.find({}).sort({ dateDefectDiscovered: -1 }).lean(),
    Task.find({}).sort({ createdAt: -1 }).lean(),
    FlightLog.find({}).sort({ createdAt: -1 }).lean(),
  ]);

  const aircraftMap = new Map();

  const ensureAircraft = (aircraftId, defaults = {}) => {
    const key = getAircraftKey(aircraftId);
    if (!key) {
      return null;
    }

    if (!aircraftMap.has(key)) {
      aircraftMap.set(key, {
        aircraftId: key,
        aircraftLabel: key,
        aircraftModel: defaults.aircraftModel || "",
        facts: {
          "aircraft.model": defaults.aircraftModel || "",
          "parts.overdueCount": 0,
          "parts.dueSoonCount": 0,
          "parts.longTurnaroundLikely": false,
          "parts.nearestDueHours": null,
          "parts.nearestDueDays": null,
          "maintenance.openDiscrepancyCount": 0,
          "maintenance.unrectifiedCount": 0,
          "maintenance.hydraulicOpenCount": 0,
          "maintenance.hydraulicLeakCount": 0,
          "maintenance.hydraulicPressureCount": 0,
          "maintenance.hydraulicFilterCount": 0,
          "tasks.overdueOpenCount": 0,
          "tasks.completedPendingApprovalCount": 0,
          "tasks.hydraulicOpenCount": 0,
          "tasks.hydraulicOverdueCount": 0,
          "tasks.ata.chapter63Count": 0,
          "tasks.ata.chapter64Count": 0,
          "tasks.ata.chapter65Count": 0,
          "tasks.ata.chapter67Count": 0,
          "tasks.ata.chapter71Count": 0,
          "tasks.ata.chapter76Count": 0,
          "tasks.ata.chapter79Count": 0,
          "tasks.ata.chapter63.section11Count": 0,
          "tasks.ata.chapter63.section31Count": 0,
          "tasks.ata.chapter63.section32Count": 0,
          "tasks.ata.chapter63.section41Count": 0,
          "tasks.ata.chapter63.section51Count": 0,
          "tasks.ata.chapter64.section10Count": 0,
          "tasks.ata.chapter65.section11Count": 0,
          "tasks.ata.chapter65.section21Count": 0,
          "tasks.ata.chapter67.section31Count": 0,
          "tasks.ata.chapter67.section34Count": 0,
          "tasks.ata.chapter71.section11Count": 0,
          "tasks.ata.chapter76.section0Count": 0,
          "tasks.ata.chapter79.section30Count": 0,
          "tasks.mod.preCount": 0,
          "tasks.mod.postCount": 0,
          "tasks.component.tailRotorBladesCount": 0,
          "tasks.component.tailRotorBladesInsertedTabCount": 0,
          "tasks.component.tailRotorBladesPitchHornAssemblyCount": 0,
          "tasks.component.tailRotorBladesEdgeTabCount": 0,
          "tasks.component.tailRotorBladesChinWeightsCount": 0,
          "tasks.component.tailDriveLineCount": 0,
          "tasks.component.tailDriveLineSlidingFlangeCount": 0,
          "tasks.component.tailDriveLineFlexibleCouplingCount": 0,
          "tasks.component.tailDriveLineRearSectionCount": 0,
          "tasks.component.tailDriveLineFrontSectionCount": 0,
          "tasks.component.tailDriveLineBearingHangersCount": 0,
          "tasks.component.tailGearBoxCount": 0,
          "tasks.component.tailGearBoxControlLeverCount": 0,
          "tasks.component.tailGearBoxHousingCount": 0,
          "tasks.component.tailGearBoxRotorShaftCount": 0,
          "tasks.component.tailGearBoxPitchChangeRodsCount": 0,
          "tasks.component.tailGearBoxControlPlateBearingCount": 0,
          "tasks.component.engineMgbDriveLineCount": 0,
          "tasks.component.engineMgbDriveLineBeltCount": 0,
          "tasks.component.engineMgbDriveLineBearingCount": 0,
          "tasks.component.engineMgbDriveLineFlexibleCouplingCount": 0,
          "tasks.component.engineMgbDriveLineSealingSleeveCount": 0,
          "tasks.component.engineMgbDriveLineSplinesCount": 0,
          "tasks.component.engineMgbDriveLineDriveShaftCount": 0,
          "tasks.component.engineMgbDriveLineGimbalCount": 0,
          "tasks.component.engineMgbDriveLineDriveFlangeCount": 0,
          "tasks.component.engineMgbDriveLineEngineFlangeCount": 0,
          "tasks.component.engineMgbDriveLineCouplingHousingCount": 0,
          "tasks.component.engineMgbDriveLineDrivenPulleyCount": 0,
          "tasks.component.biDirectionalSuspensionCount": 0,
          "tasks.component.biDirectionalSuspensionCrossbeamCount": 0,
          "tasks.component.biDirectionalSuspensionLaminatedStopsCount": 0,
          "tasks.component.biDirectionalSuspensionBlockPinsCount": 0,
          "tasks.component.biDirectionalSuspensionBlockSupportsCount": 0,
          "tasks.component.mgbSuspensionBarCount": 0,
          "tasks.component.mgbSuspensionBarBoltCount": 0,
          "tasks.component.rotorActuatorsDualHydraulicCount": 0,
          "tasks.component.loadCompensatorCount": 0,
          "tasks.component.engineControlsCount": 0,
          "tasks.component.engineOilIndicationCount": 0,
          "tasks.component.nrnfIndicatorCount": 0,
          "tasks.component.rotorBrakeCount": 0,
          "flight.pendingWorkflowCount": 0,
          "flight.recentRemarkCount": 0,
          "flight.hydraulicRemarkCount": 0,
          "signals.rotorBrakeCount": 0,
          "signals.nrnfIndicatorCount": 0,
          "signals.loadCompensatorCount": 0,
          "signals.engineOilIndicationCount": 0,
          "signals.twistGripFuelControlCount": 0,
          "signals.tailDriveLineCount": 0,
          "signals.tailGearBoxCount": 0,
          "signals.tailRotorBladesCount": 0,
          "signals.rotorActuatorsDualHydraulicCount": 0,
          "signals.tailDriveLineSlidingFlangeCount": 0,
          "signals.tailDriveLineFlexibleCouplingCount": 0,
          "signals.tailDriveLineRearSectionCount": 0,
          "signals.tailDriveLineFrontSectionCount": 0,
          "signals.tailDriveLineBearingHangersCount": 0,
          "signals.tailGearBoxHousingCount": 0,
          "signals.tailGearBoxRotorShaftCount": 0,
          "signals.tailGearBoxControlLeverCount": 0,
          "signals.tailGearBoxPitchChangeRodsCount": 0,
          "signals.tailGearBoxControlPlateBearingCount": 0,
          "signals.tailRotorBladesPitchHornAssemblyCount": 0,
          "signals.tailRotorBladesEdgeTabCount": 0,
          "signals.tailRotorBladesChinWeightsCount": 0,
          "signals.arrielFadecCodeCount": 0,
          "signals.arrielFadecCode44Count": 0,
          "signals.arrielFadecCode47Count": 0,
          "signals.arrielFadecCode48Count": 0,
          "signals.arrielFadecCode49Count": 0,
          "signals.arrielFadecCode71Count": 0,
          "signals.arrielFadecCode121Count": 0,
          "signals.arrielFadecCode122Count": 0,
          "signals.arrielFadecCode123Count": 0,
          "signals.arrielFadecCode125Count": 0,
          "signals.arrielFadecCode135Count": 0,
          "signals.arrielFadecCode143Count": 0,
          "signals.arrielFadecCodes": [],
          "tasks.mod.number.075595Count": 0,
          "tasks.mod.number.075606Count": 0,
          "tasks.mod.number.076544Count": 0,
          "tasks.mod.number.076550Count": 0,
          "tasks.mod.number.076551Count": 0,
          "tasks.mod.number.076602Count": 0,
          "tasks.mod.number.076603Count": 0,
          "tasks.mod.number.078542Count": 0,
          "tasks.mod.number.079017Count": 0,
          "tasks.mod.number.079032Count": 0,
          "tasks.mod.number.0770000Count": 0,
          "tasks.mod.number.079555Count": 0,
          "tasks.mod.number.079561Count": 0,
          "tasks.mod.number.079566Count": 0,
          "tasks.mod.number.079568Count": 0,
        },
        evidence: {
          overdueParts: [],
          dueSoonParts: [],
          maintenanceLogs: [],
          hydraulicMaintenanceLogs: [],
          overdueTasks: [],
          pendingApprovalTasks: [],
          hydraulicTasks: [],
          pendingFlights: [],
          recentRemarkFlights: [],
          hydraulicFlights: [],
        },
        sourceCounts: {
          partsRecords: 0,
          maintenanceLogs: 0,
          tasks: 0,
          flightLogs: 0,
        },
      });
    }

    const current = aircraftMap.get(key);
    if (!current.aircraftModel && defaults.aircraftModel) {
      current.aircraftModel = defaults.aircraftModel;
    }
    current.facts["aircraft.model"] = current.aircraftModel || defaults.aircraftModel || "";

    return current;
  };

  partsRecords.forEach((record) => {
    const aircraftEntry = ensureAircraft(record.aircraft, {
      aircraftModel: record.aircraftType || "",
    });

    if (!aircraftEntry) {
      return;
    }

    aircraftEntry.sourceCounts.partsRecords += 1;

    const relevantParts = Array.isArray(record.parts)
      ? record.parts.filter((part) => part.rowType !== "header")
      : [];

    relevantParts.forEach((part) => {
      const remainingHours = parseNumber(part.timeRemaining);
      const remainingDays = parseNumber(part.daysRemaining);
      const dueSummary = {
        componentName: part.componentName || "Unnamed component",
        timeRemaining: remainingHours,
        daysRemaining: remainingDays,
        dateDue: part.dateDue || "",
      };

      const overdue =
        (remainingHours !== null && remainingHours <= 0) ||
        (remainingDays !== null && remainingDays <= 0);
      const dueSoon =
        !overdue &&
        ((remainingHours !== null && remainingHours <= 25) ||
          (remainingDays !== null && remainingDays <= 7));

      if (overdue) {
        aircraftEntry.facts["parts.overdueCount"] += 1;
        aircraftEntry.evidence.overdueParts.push(dueSummary);
      } else if (dueSoon) {
        aircraftEntry.facts["parts.dueSoonCount"] += 1;
        aircraftEntry.evidence.dueSoonParts.push(dueSummary);
      }

      const partSignalText = normalizeText(part.componentName);
      incrementSignalFacts(aircraftEntry.facts, collectSignalHits(partSignalText));

      if (
        remainingHours !== null &&
        (aircraftEntry.facts["parts.nearestDueHours"] === null ||
          remainingHours < aircraftEntry.facts["parts.nearestDueHours"])
      ) {
        aircraftEntry.facts["parts.nearestDueHours"] = remainingHours;
      }

      if (
        remainingDays !== null &&
        (aircraftEntry.facts["parts.nearestDueDays"] === null ||
          remainingDays < aircraftEntry.facts["parts.nearestDueDays"])
      ) {
        aircraftEntry.facts["parts.nearestDueDays"] = remainingDays;
      }
    });

    const overdueOrSoonCount =
      aircraftEntry.facts["parts.overdueCount"] +
      aircraftEntry.facts["parts.dueSoonCount"];
    aircraftEntry.facts["parts.longTurnaroundLikely"] = overdueOrSoonCount >= 2;
  });

  maintenanceLogs.forEach((log) => {
    const aircraftEntry = ensureAircraft(log.aircraft);
    if (!aircraftEntry) {
      return;
    }

    aircraftEntry.sourceCounts.maintenanceLogs += 1;

    const isVerified = String(log.status || "").toLowerCase() === "verified";
    const hasRectifiedDate = Boolean(log.dateDefectRectified);
    const isOpen = !isVerified || !hasRectifiedDate;
    const maintenanceNarrativeTexts = collectMaintenanceLogNarrativeTexts(log);
    const hydraulicFlags = getHydraulicFlags(...maintenanceNarrativeTexts);
    const signalHits = collectSignalHits(
      normalizeText(maintenanceNarrativeTexts.join(" ")),
    );
    incrementSignalFacts(aircraftEntry.facts, signalHits);

    if (isOpen) {
      aircraftEntry.facts["maintenance.openDiscrepancyCount"] += 1;
      aircraftEntry.evidence.maintenanceLogs.push({
        id: log._id?.toString?.() || "",
        defects: log.defects || "",
        status: log.status || "unverified",
        reportedBy: log.reportedBy || "",
      });
    }

    if (!hasRectifiedDate) {
      aircraftEntry.facts["maintenance.unrectifiedCount"] += 1;
    }

    if (isOpen && hydraulicFlags.hasHydraulicContext) {
      aircraftEntry.facts["maintenance.hydraulicOpenCount"] += 1;
      aircraftEntry.evidence.hydraulicMaintenanceLogs.push({
        id: log._id?.toString?.() || "",
        defects: log.defects || "",
        correctiveActionDone: log.correctiveActionDone || "",
        status: log.status || "unverified",
      });
    }

    if (isOpen && hydraulicFlags.hasLeak) {
      aircraftEntry.facts["maintenance.hydraulicLeakCount"] += 1;
    }

    if (isOpen && hydraulicFlags.hasPressure) {
      aircraftEntry.facts["maintenance.hydraulicPressureCount"] += 1;
    }

    if (isOpen && hydraulicFlags.hasFilter) {
      aircraftEntry.facts["maintenance.hydraulicFilterCount"] += 1;
    }
  });

  tasks.forEach((task) => {
    const aircraftEntry = ensureAircraft(task.aircraft);
    if (!aircraftEntry) {
      return;
    }

    aircraftEntry.sourceCounts.tasks += 1;

    const status = String(task.status || "").toLowerCase();
    const dueDate = toDate(task.dueDate);
    const isClosed = ["completed", "approved", "closed"].includes(status);
    const isOverdue = dueDate && dueDate < new Date() && !isClosed;
    const taskNarrativeTexts = collectTaskNarrativeTexts(task);
    const hydraulicFlags = getHydraulicFlags(...taskNarrativeTexts);
    const signalHits = collectSignalHits(normalizeText(taskNarrativeTexts.join(" ")));
    incrementSignalFacts(aircraftEntry.facts, signalHits);
    (task.checklistItems || []).forEach((item) => {
      incrementStructuredTaskFacts(aircraftEntry.facts, item);
    });

    if (isOverdue) {
      aircraftEntry.facts["tasks.overdueOpenCount"] += 1;
      aircraftEntry.evidence.overdueTasks.push({
        id: task.id || task._id?.toString?.() || "",
        title: task.title || "",
        dueDate: task.dueDate || "",
        status: task.status || "",
      });
    }

    if (!isClosed && hydraulicFlags.hasHydraulicContext) {
      aircraftEntry.facts["tasks.hydraulicOpenCount"] += 1;
      aircraftEntry.evidence.hydraulicTasks.push({
        id: task.id || task._id?.toString?.() || "",
        title: task.title || "",
        status: task.status || "",
        dueDate: task.dueDate || "",
      });
    }

    if (isOverdue && hydraulicFlags.hasHydraulicContext) {
      aircraftEntry.facts["tasks.hydraulicOverdueCount"] += 1;
    }

    if (["completed", "reviewed"].includes(status) && !task.isApproved) {
      aircraftEntry.facts["tasks.completedPendingApprovalCount"] += 1;
      aircraftEntry.evidence.pendingApprovalTasks.push({
        id: task.id || task._id?.toString?.() || "",
        title: task.title || "",
        status: task.status || "",
      });
    }
  });

  const flightLogsByAircraft = new Map();
  flightLogs.forEach((log) => {
    const aircraftKey = getAircraftKey(log.rpc);
    if (!aircraftKey) {
      return;
    }

    if (!flightLogsByAircraft.has(aircraftKey)) {
      flightLogsByAircraft.set(aircraftKey, []);
    }

    flightLogsByAircraft.get(aircraftKey).push(log);
  });

  flightLogsByAircraft.forEach((logs, aircraftId) => {
    const aircraftEntry = ensureAircraft(aircraftId, {
      aircraftModel: logs[0]?.aircraftType || "",
    });

    if (!aircraftEntry) {
      return;
    }

    aircraftEntry.sourceCounts.flightLogs = logs.length;

    const recentLogs = logs.slice(0, 5);
    recentLogs.forEach((log) => {
      const status = String(log.status || "");
      const remark = String(log.remarks || "").trim();
      const flightNarrativeTexts = collectFlightNarrativeTexts(log);
      const hydraulicFlags = getHydraulicFlags(...flightNarrativeTexts);
      const signalHits = collectSignalHits(normalizeText(flightNarrativeTexts.join(" ")));
      incrementSignalFacts(aircraftEntry.facts, signalHits);

      if (["pending_release", "pending_acceptance", "released"].includes(status)) {
        aircraftEntry.facts["flight.pendingWorkflowCount"] += 1;
        aircraftEntry.evidence.pendingFlights.push({
          id: log._id?.toString?.() || "",
          controlNo: log.controlNo || "",
          status,
          date: log.date || "",
        });
      }

      if (remark) {
        aircraftEntry.facts["flight.recentRemarkCount"] += 1;
        aircraftEntry.evidence.recentRemarkFlights.push({
          id: log._id?.toString?.() || "",
          controlNo: log.controlNo || "",
          remark,
          date: log.date || "",
        });
      }

      if (hydraulicFlags.hasHydraulicContext) {
        aircraftEntry.facts["flight.hydraulicRemarkCount"] += 1;
        aircraftEntry.evidence.hydraulicFlights.push({
          id: log._id?.toString?.() || "",
          controlNo: log.controlNo || "",
          remark: remark || hydraulicFlags.text,
          date: log.date || "",
        });
      }
    });
  });

  return {
    aircraftFacts: Array.from(aircraftMap.values()).sort((left, right) =>
      left.aircraftId.localeCompare(right.aircraftId),
    ),
    riskRank: RISK_RANK,
  };
};

module.exports = {
  buildFactsMap,
  RISK_RANK,
};
