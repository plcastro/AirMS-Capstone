const { RISK_RANK } = require("./factBuilder");
const {
  buildProcedureSummary,
  getProcedureForManualReference,
} = require("./procedureCatalog");

const evaluateCondition = (condition = {}, facts = {}) => {
  const actual = facts[condition.fact];

  switch (condition.operator) {
    case "==":
      return actual === condition.value;
    case "!=":
      return actual !== condition.value;
    case ">":
      return Number(actual) > Number(condition.value);
    case ">=":
      return Number(actual) >= Number(condition.value);
    case "<":
      return Number(actual) < Number(condition.value);
    case "<=":
      return Number(actual) <= Number(condition.value);
    case "includes":
      return Array.isArray(actual) && actual.includes(condition.value);
    default:
      return false;
  }
};

const deriveHighestRisk = (matchedRules = []) =>
  matchedRules.reduce(
    (highest, rule) =>
      RISK_RANK[rule.riskLevel] > RISK_RANK[highest] ? rule.riskLevel : highest,
    "Low",
  );

const FACT_EVIDENCE_BUILDERS = {
  "parts.overdueCount": (value) => `${value} overdue component item(s)`,
  "parts.dueSoonCount": (value) => `${value} due-soon component item(s)`,
  "maintenance.openDiscrepancyCount": (value) =>
    `${value} open maintenance discrepancy record(s)`,
  "maintenance.hydraulicOpenCount": (value) =>
    `${value} open hydraulic discrepancy record(s)`,
  "maintenance.hydraulicLeakCount": (value) =>
    `${value} hydraulic leak-related discrepancy record(s)`,
  "maintenance.hydraulicPressureCount": (value) =>
    `${value} hydraulic pressure-related discrepancy record(s)`,
  "maintenance.hydraulicFilterCount": (value) =>
    `${value} hydraulic filter/strainer-related discrepancy record(s)`,
  "tasks.overdueOpenCount": (value) => `${value} overdue open task(s)`,
  "tasks.hydraulicOverdueCount": (value) => `${value} overdue hydraulic task(s)`,
  "tasks.hydraulicOpenCount": (value) => `${value} open hydraulic task(s)`,
  "tasks.ata.chapter63.section11Count": () => "structured ATA 63-11 checklist item(s) detected",
  "tasks.ata.chapter63.section31Count": () => "structured ATA 63-31 checklist item(s) detected",
  "tasks.ata.chapter63.section32Count": () => "structured ATA 63-32 checklist item(s) detected",
  "tasks.ata.chapter63.section41Count": () => "structured ATA 63-41 checklist item(s) detected",
  "tasks.ata.chapter63.section51Count": () => "structured ATA 63-51 checklist item(s) detected",
  "tasks.ata.chapter64.section10Count": () => "structured ATA 64-10 checklist item(s) detected",
  "tasks.ata.chapter65.section11Count": () => "structured ATA 65-11 checklist item(s) detected",
  "tasks.ata.chapter65.section21Count": () => "structured ATA 65-21 checklist item(s) detected",
  "tasks.ata.chapter67.section31Count": () => "structured ATA 67-31 checklist item(s) detected",
  "tasks.ata.chapter67.section34Count": () => "structured ATA 67-34 checklist item(s) detected",
  "tasks.ata.chapter71.section11Count": () => "structured ATA 71-11 checklist item(s) detected",
  "tasks.ata.chapter76.section0Count": () => "structured ATA 76-00 checklist item(s) detected",
  "tasks.ata.chapter79.section30Count": () => "structured ATA 79-30 checklist item(s) detected",
  "tasks.mod.preCount": () => "pre-mod checklist applicability detected",
  "tasks.mod.postCount": () => "post-mod checklist applicability detected",
  "flight.pendingWorkflowCount": (value) => `${value} recent flight log(s) still in workflow`,
  "flight.hydraulicRemarkCount": (value) =>
    `${value} recent flight log(s) with hydraulic remarks`,
  "signals.nrnfIndicatorCount": () => "NR/NF indicator-related record(s) detected",
  "signals.rotorBrakeCount": () => "rotor-brake-related record(s) detected",
  "signals.loadCompensatorCount": () => "load-compensator-related record(s) detected",
  "signals.engineOilIndicationCount": () => "engine oil indication-related record(s) detected",
  "signals.twistGripFuelControlCount": () => "twist-grip fuel-control-related record(s) detected",
  "signals.arrielFadecCodeCount": (value) => `${value} ARRIEL / FADEC code signal(s) detected`,
  "signals.tailDriveLineCount": () => "tail-drive-line-related record(s) detected",
  "signals.tailGearBoxCount": () => "tail-gear-box-related record(s) detected",
  "signals.tailRotorBladesCount": () => "tail-rotor-blade-related record(s) detected",
  "signals.tailDriveLineSlidingFlangeCount": () =>
    "sliding-flange-related record(s) detected",
  "signals.tailDriveLineFlexibleCouplingCount": () =>
    "flexible-coupling-related record(s) detected",
  "signals.tailDriveLineRearSectionCount": () => "rear-section-related record(s) detected",
  "signals.tailDriveLineFrontSectionCount": () =>
    "equipped-front-section-related record(s) detected",
  "signals.tailDriveLineBearingHangersCount": () =>
    "bearing-hanger-related record(s) detected",
  "signals.tailGearBoxHousingCount": () => "TGB-housing-related record(s) detected",
  "signals.tailGearBoxRotorShaftCount": () => "TGB-rotor-shaft-related record(s) detected",
  "signals.tailGearBoxControlLeverCount": () => "TGB-control-lever-related record(s) detected",
  "signals.tailGearBoxPitchChangeRodsCount": () =>
    "pitch-change-rod-related record(s) detected",
  "signals.tailGearBoxControlPlateBearingCount": () =>
    "control-plate-bearing-related record(s) detected",
  "signals.tailRotorBladesPitchHornAssemblyCount": () =>
    "pitch-horn-related record(s) detected",
  "signals.tailRotorBladesEdgeTabCount": () => "edge-tab-related record(s) detected",
  "signals.tailRotorBladesChinWeightsCount": () =>
    "chin-weight-blanking-hardware-related record(s) detected",
  "signals.condition.hardLandingCount": () => "hard-landing condition record(s) detected",
  "signals.condition.overtorqueCount": () => "overtorque condition record(s) detected",
  "signals.condition.rotorOverspeedCount": () => "rotor-overspeed condition record(s) detected",
  "signals.condition.bladeImpactCount": () => "rotor blade impact or unbalance record(s) detected",
  "signals.condition.lightningStrikeCount": () => "lightning-strike condition record(s) detected",
  "signals.condition.immersionCount": () => "immersion or water-ingress condition record(s) detected",
  "signals.condition.strongTurbulenceCount": () => "strong-turbulence condition record(s) detected",
  "signals.condition.abnormalGroundRotorCount": () =>
    "abnormal ground rotor-behavior condition record(s) detected",
  "signals.condition.fuelContaminationCount": () => "fuel-contamination condition record(s) detected",
  "signals.condition.oilContaminationCount": () => "oil-contamination condition record(s) detected",
  "signals.condition.gearboxOilLeakCount": () => "gearbox oil-leak condition record(s) detected",
  "signals.condition.chipDetectionCount": () => "chip-detection condition record(s) detected",
  "signals.condition.freewheelJerkCount": () => "freewheel-jerk condition record(s) detected",
  "signals.condition.negativeTorqueCount": () => "negative-torque condition record(s) detected",
  "signals.condition.engineHealthCheckCount": () => "engine-health or power-check record(s) detected",
  "signals.condition.hydraulicPreCloggingCount": () =>
    "hydraulic filter pre-clogging condition record(s) detected",
  "signals.hydraulicContextCount": (value) =>
    `${value} record(s) with hydraulic terminology detected`,
  "signals.hydraulicLeakCount": (value) =>
    `${value} record(s) with hydraulic leak terminology detected`,
  "signals.hydraulicPressureCount": (value) =>
    `${value} record(s) with hydraulic pressure terminology detected`,
  "signals.hydraulicFilterCount": (value) =>
    `${value} record(s) with hydraulic filter/strainer terminology detected`,
  "signals.condition.vibrationAnomalyCount": () => "vibration anomaly record(s) detected",
  "signals.condition.fuelControlFaultCount": () => "fuel-control fault record(s) detected",
  "signals.condition.engineOilIndicationFaultCount": () =>
    "engine oil indication fault record(s) detected",
  "signals.condition.loadCompensatorFaultCount": () => "load-compensator fault record(s) detected",
  "tasks.component.rotorActuatorsDualHydraulicCount": () =>
    "dual-hydraulic rotor-actuator task context detected",
  "tasks.component.engineMgbDriveLineGimbalCount": () =>
    "gimbal-hardware task context detected",
  "tasks.component.engineMgbDriveLineDriveShaftCount": () =>
    "drive-shaft task context detected",
  "tasks.component.engineMgbDriveLineDriveFlangeCount": () =>
    "drive-flange task context detected",
  "tasks.component.engineMgbDriveLineEngineFlangeCount": () =>
    "engine-flange task context detected",
  "tasks.component.engineMgbDriveLineCouplingHousingCount": () =>
    "coupling-housing task context detected",
  "tasks.component.engineMgbDriveLineDrivenPulleyCount": () =>
    "driven-pulley task context detected",
  "tasks.component.rotorBrakeCount": () =>
    "rotor-brake task context detected",
  "tasks.component.nrnfIndicatorCount": () =>
    "NR/NF-indicator task context detected",
  "tasks.component.engineOilIndicationCount": () =>
    "engine-oil-indication task context detected",
  "tasks.component.engineControlsCount": () =>
    "engine-controls task context detected",
  "tasks.component.loadCompensatorCount": () =>
    "load-compensator task context detected",
  "tasks.component.engineMgbDriveLineCount": () =>
    "engine-or-MGB-drive-line task context detected",
  "tasks.component.engineMgbDriveLineBeltCount": () =>
    "hydraulic-pump-drive-belt task context detected",
  "tasks.component.engineMgbDriveLineBearingCount": () =>
    "belt-driven-pump-drive-bearing task context detected",
  "tasks.component.engineMgbDriveLineFlexibleCouplingCount": () =>
    "engine-or-MGB-drive-line flexible-coupling task context detected",
  "tasks.component.engineMgbDriveLineSealingSleeveCount": () =>
    "sealing-sleeve task context detected",
  "tasks.component.engineMgbDriveLineSplinesCount": () =>
    "drive-splines task context detected",
  "tasks.component.tailDriveLineSlidingFlangeCount": () =>
    "sliding-flange task context detected",
  "tasks.component.tailDriveLineFlexibleCouplingCount": () =>
    "flexible-coupling task context detected",
  "tasks.component.tailDriveLineRearSectionCount": () =>
    "rear-section task context detected",
  "tasks.component.tailDriveLineFrontSectionCount": () =>
    "equipped-front-section task context detected",
  "tasks.component.tailDriveLineBearingHangersCount": () =>
    "bearing-hanger task context detected",
  "tasks.component.tailDriveLineCount": () =>
    "tail-drive-line task context detected",
  "tasks.component.tailGearBoxCount": () =>
    "tail-gear-box task context detected",
  "tasks.component.tailGearBoxHousingCount": () =>
    "TGB-housing task context detected",
  "tasks.component.tailGearBoxRotorShaftCount": () =>
    "TGB-rotor-shaft task context detected",
  "tasks.component.tailGearBoxControlLeverCount": () =>
    "TGB-control-lever task context detected",
  "tasks.component.tailGearBoxPitchChangeRodsCount": () =>
    "pitch-change-rod task context detected",
  "tasks.component.tailGearBoxControlPlateBearingCount": () =>
    "control-plate-bearing task context detected",
  "tasks.component.tailRotorBladesCount": () =>
    "tail-rotor-blade task context detected",
  "tasks.component.tailRotorBladesInsertedTabCount": () =>
    "inserted-tab-blade task context detected",
  "tasks.component.tailRotorBladesPitchHornAssemblyCount": () =>
    "pitch-horn task context detected",
  "tasks.component.tailRotorBladesEdgeTabCount": () =>
    "edge-tab task context detected",
  "tasks.component.tailRotorBladesChinWeightsCount": () =>
    "chin-weight-blanking-hardware task context detected",
  "tasks.component.biDirectionalSuspensionCount": () =>
    "bi-directional-suspension task context detected",
  "tasks.component.biDirectionalSuspensionCrossbeamCount": () =>
    "suspension-crossbeam task context detected",
  "tasks.component.biDirectionalSuspensionLaminatedStopsCount": () =>
    "laminated-stops task context detected",
  "tasks.component.biDirectionalSuspensionBlockPinsCount": () =>
    "laminated-block-pins task context detected",
  "tasks.component.biDirectionalSuspensionBlockSupportsCount": () =>
    "laminated-block-supports task context detected",
  "tasks.component.mgbSuspensionBarCount": () =>
    "MGB-suspension-bar task context detected",
  "tasks.component.mgbSuspensionBarBoltCount": () =>
    "MGB-suspension-bar-bolt task context detected",
};

const getPrimaryMatchedRule = (matchedRules = []) => {
  if (!matchedRules.length) {
    return null;
  }

  const getSignalPriority = (rule = {}) => {
    const conditions = Array.isArray(rule.conditions) ? rule.conditions : [];
    if (
      conditions.some((condition) =>
        String(condition.fact || "").startsWith("signals.hydraulic"),
      )
    ) {
      return 3;
    }
    if (String(rule.category || "").toLowerCase().includes("hydraulic")) {
      return 2;
    }
    if (
      conditions.some((condition) =>
        String(condition.fact || "").startsWith("signals.condition"),
      )
    ) {
      return 1;
    }
    return 0;
  };

  const highestRisk = deriveHighestRisk(matchedRules);
  return matchedRules
    .filter((rule) => rule.riskLevel === highestRisk)
    .sort((left, right) => {
      const leftSpecificity = Array.isArray(left.conditions) ? left.conditions.length : 0;
      const rightSpecificity = Array.isArray(right.conditions) ? right.conditions.length : 0;
      if (rightSpecificity !== leftSpecificity) {
        return rightSpecificity - leftSpecificity;
      }
      return getSignalPriority(right) - getSignalPriority(left);
    })[0];
};

const summarizeEvidenceForRule = (rule = {}, aircraftFacts = {}) => {
  if (!rule) {
    return [];
  }

  const { facts = {} } = aircraftFacts;
  const seen = new Set();

  return (rule.conditions || [])
    .map((condition) => {
      const builder = FACT_EVIDENCE_BUILDERS[condition.fact];
      if (!builder || seen.has(condition.fact)) {
        return null;
      }

      seen.add(condition.fact);
      return builder(facts[condition.fact], condition, facts);
    })
    .filter(Boolean);
};

const buildIssueTitle = (matchedRules = []) => {
  if (!matchedRules.length) {
    return "No maintenance issue detected";
  }

  const highestRule = getPrimaryMatchedRule(matchedRules);
  return highestRule?.possibleIssue || highestRule?.title || "Maintenance attention required";
};

const uniqueItems = (items = []) =>
  Array.from(new Set(items.filter(Boolean)));

const getPrimaryManualReference = (manualReference = "") =>
  String(manualReference || "")
    .split("|")
    .map((reference) => reference.trim())
    .find(Boolean) || "";

const getMaintenanceDirective = (rule = {}) => {
  const category = String(rule.category || "").toLowerCase();

  if (category.includes("fault")) {
    return {
      findingType: "fault",
      actionVerb: "perform fault isolation",
    };
  }

  if (category.includes("event")) {
    return {
      findingType: "event",
      actionVerb: "perform the required follow-up inspection",
    };
  }

  if (category.includes("hydraulic")) {
    return {
      findingType: "hydraulic condition",
      actionVerb: "inspect and troubleshoot",
    };
  }

  if (category.includes("contamination")) {
    return {
      findingType: "contamination condition",
      actionVerb: "perform the contamination response",
    };
  }

  if (category.includes("inspection")) {
    return {
      findingType: "condition",
      actionVerb: "inspect",
    };
  }

  return {
    findingType: "maintenance finding",
    actionVerb: "review and action",
  };
};

const buildMaintenanceIssueTitle = (rule = {}) => {
  if (!rule) {
    return "No maintenance issue detected";
  }

  const component = rule.component || rule.title || "Maintenance item";
  const { findingType } = getMaintenanceDirective(rule);

  return `${component} ${findingType} detected`;
};

const buildMaintenanceRecommendedAction = (rule = {}, procedures = []) => {
  if (!rule) {
    return "Continue monitoring current maintenance data.";
  }

  const component = rule.component || rule.title || "the maintenance item";
  const reference = getPrimaryManualReference(rule.manualReference);
  const procedure = getProcedureForManualReference(reference, procedures);
  const { actionVerb } = getMaintenanceDirective(rule);
  const capitalizedAction =
    actionVerb.charAt(0).toUpperCase() + actionVerb.slice(1);

  if (procedure) {
    if (actionVerb.startsWith("inspect")) {
      return `${capitalizedAction} ${component} using ${procedure.reference}: ${procedure.title}.`;
    }
    return `${capitalizedAction} for ${component} using ${procedure.reference}: ${procedure.title}.`;
  }

  if (!reference) {
    if (actionVerb.startsWith("inspect")) {
      return `${capitalizedAction} ${component} using the applicable maintenance data.`;
    }
    return `${capitalizedAction} for ${component} using the applicable maintenance data.`;
  }

  if (actionVerb.startsWith("inspect")) {
    return `${capitalizedAction} ${component} using ${reference}.`;
  }

  return `${capitalizedAction} for ${component} using ${reference}.`;
};

const buildEvidenceFinding = (evidenceSummary = []) => {
  if (!evidenceSummary.length) {
    return "Rule matched from the current aircraft maintenance records.";
  }

  return `Evidence found: ${evidenceSummary.join(", ")}.`;
};

const buildRuleManagerSummary = ({
  primaryRule = null,
  riskLevel = "Low",
  manualReferences = [],
} = {}) => {
  if (!primaryRule) {
    return "No active maintenance action is recommended from the current records.";
  }

  const component = primaryRule.component || primaryRule.title || "Maintenance item";
  const reference = getPrimaryManualReference(manualReferences[0]);
  const { findingType, actionVerb } = getMaintenanceDirective(primaryRule);
  const referenceText = reference
    ? ` Use ${reference} as the primary AMM reference.`
    : " Use the applicable maintenance data as the primary reference.";

  return `${riskLevel} priority ${component} ${findingType}; ${actionVerb} before closure or release.${referenceText}`;
};

const runInference = (rules = [], aircraftFacts = {}, procedures = []) => {
  const matchedRules = rules
    .filter((rule) =>
      Array.isArray(rule.conditions) &&
      rule.conditions.length > 0 &&
      rule.conditions.every((condition) =>
        evaluateCondition(condition, aircraftFacts.facts || {}),
      ),
    )
    .map((rule) => ({
      ruleCode: rule.ruleCode,
      title: rule.title,
      category: rule.category,
      conditions: Array.isArray(rule.conditions) ? rule.conditions : [],
      component: rule.component || "",
      riskLevel: rule.riskLevel,
      possibleIssue: rule.possibleIssue || "",
      manualReference: rule.manualReference || "",
      recommendedActions: Array.isArray(rule.recommendedActions)
        ? rule.recommendedActions
        : [],
      explanation:
        rule.explanationTemplate ||
        `Rule ${rule.ruleCode} matched based on current aircraft facts.`,
    }));

  const riskLevel = deriveHighestRisk(matchedRules);
  const primaryRule = getPrimaryMatchedRule(matchedRules);
  const secondaryRules = matchedRules.filter(
    (rule) => rule.ruleCode !== primaryRule?.ruleCode,
  );
  const orderedRules = primaryRule
    ? [primaryRule, ...secondaryRules]
    : matchedRules;
  const primaryRecommendedAction = buildMaintenanceRecommendedAction(
    primaryRule,
    procedures,
  );
  const primaryProcedure = getProcedureForManualReference(
    primaryRule?.manualReference,
    procedures,
  );
  const procedureSummary = buildProcedureSummary(primaryProcedure);
  const recommendedActions = uniqueItems([
    primaryRecommendedAction,
    procedureSummary,
    ...orderedRules.flatMap((rule) => rule.recommendedActions || []),
  ]);
  const manualReferences = primaryRule?.manualReference
    ? [primaryRule.manualReference]
    : uniqueItems(orderedRules.map((rule) => rule.manualReference)).slice(0, 3);
  const evidenceSummary = summarizeEvidenceForRule(primaryRule, aircraftFacts);
  const issueTitle = primaryRule
    ? buildMaintenanceIssueTitle(primaryRule)
    : buildIssueTitle(matchedRules);
  const shortFinding = matchedRules.length
    ? buildEvidenceFinding(evidenceSummary)
    : "No active maintenance flags found from the current records.";
  const recommendedAction =
    recommendedActions[0] || "Continue monitoring current maintenance data.";
  const managerSummary = matchedRules.length
    ? buildRuleManagerSummary({
        primaryRule,
        riskLevel,
        manualReferences,
      })
    : "No active maintenance action is recommended from the current records.";

  return {
    riskLevel,
    issueTitle,
    shortFinding,
    managerSummary,
    recommendedAction,
    recommendedActions,
    manualReferences,
    procedureReference: primaryProcedure?.reference || "",
    procedureTitle: primaryProcedure?.title || "",
    procedureSummary,
    procedureSteps: [],
    primaryRule,
    matchedRules,
    explanation: matchedRules.map((rule) => rule.explanation),
  };
};

module.exports = {
  runInference,
};
