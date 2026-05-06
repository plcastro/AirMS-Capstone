const buildFaultConditionRule = ({
  ruleCode,
  title,
  category = "fault-condition",
  riskLevel,
  possibleIssue,
  component,
  conditionFact,
  description,
  recommendedActions,
  manualReference,
  explanationTemplate,
}) => ({
  ruleCode,
  title,
  description,
  category,
  conditions: [{ fact: conditionFact, operator: ">", value: 0 }],
  riskLevel,
  possibleIssue,
  component,
  recommendedActions,
  explanationTemplate,
  manualReference,
  isStarterRule: false,
  active: true,
});

const FAULT_CONDITION_RULES = [
  buildFaultConditionRule({
    ruleCode: "AIRMS_FAULT_001",
    title: "Hard landing reports should trigger abnormal-event follow-up",
    category: "event-response",
    riskLevel: "Critical",
    possibleIssue: "Hard landing event may require immediate structural and component inspection.",
    component: "Airframe / Landing Gear / Dynamic Components",
    conditionFact: "signals.condition.hardLandingCount",
    description:
      "Detects hard-landing language in maintenance logs, tasks, checklist items, or flight remarks.",
    recommendedActions: [
      "Quarantine the event from routine discrepancy closure until the hard-landing inspection is dispositioned.",
      "Review landing gear, airframe attachment points, rotor system, and affected optional equipment using the applicable AMM procedure.",
      "Require a certifying review before release if the event remains open or undocumented.",
    ],
    manualReference:
      "AMM 05-50-00,6-25 Inspection of the components and optional equipment involved in a hard landing",
    explanationTemplate:
      "A hard-landing condition was found in current aircraft records, so AirMS is elevating it as an abnormal event rather than a routine discrepancy.",
  }),
  buildFaultConditionRule({
    ruleCode: "AIRMS_FAULT_002",
    title: "Overtorque reports should trigger power-train event response",
    category: "event-response",
    riskLevel: "Critical",
    possibleIssue: "Overtorque event may require immediate drivetrain inspection.",
    component: "Engine / MGB / Power Train",
    conditionFact: "signals.condition.overtorqueCount",
    description:
      "Detects overtorque and torque-exceedance language in operational and maintenance records.",
    recommendedActions: [
      "Treat the finding as an event-driven inspection before normal release.",
      "Verify the exceedance details against engine and transmission limits.",
      "Route the aircraft to the applicable pre-mod, post-mod, or generic overtorque procedure.",
    ],
    manualReference: "AMM 05-50-00,6-4 Procedure After Overtorque",
    explanationTemplate:
      "The records contain an overtorque signal, which requires event-specific follow-up before closure.",
  }),
  buildFaultConditionRule({
    ruleCode: "AIRMS_FAULT_003",
    title: "Rotor overspeed reports should trigger rotor-system response",
    category: "event-response",
    riskLevel: "Critical",
    possibleIssue: "Rotor overspeed event may require immediate rotor-system inspection.",
    component: "Main Rotor / Rotor Drive",
    conditionFact: "signals.condition.rotorOverspeedCount",
    description:
      "Detects rotor overspeed, NR overspeed, and N-rotor overspeed wording.",
    recommendedActions: [
      "Confirm the overspeed magnitude and duration from flight and technical records.",
      "Inspect the rotor and drive-system areas required by the applicable post-overspeed procedure.",
      "Hold closure until the event record and inspection disposition agree.",
    ],
    manualReference: "AMM 05-50-00,6-3 Steps to be taken after rotor overspeed",
    explanationTemplate:
      "Rotor overspeed language was detected in aircraft records, so the inference engine is selecting the rotor-system abnormal-event path.",
  }),
  buildFaultConditionRule({
    ruleCode: "AIRMS_FAULT_004",
    title: "Rotor blade impact or unbalance reports should trigger blade inspection",
    category: "event-response",
    riskLevel: "Critical",
    possibleIssue: "Rotor blade impact or unbalance may require focused damage assessment.",
    component: "Main Rotor / Tail Rotor Blades",
    conditionFact: "signals.condition.bladeImpactCount",
    description:
      "Detects blade strike, blade impact, main rotor impact, tail rotor impact, and rotor unbalance wording.",
    recommendedActions: [
      "Identify whether the event concerns the main rotor, tail rotor, or both.",
      "Inspect affected blades, attachments, pitch hardware, and nearby structure using the applicable AMM procedure.",
      "Do not merge this finding into generic vibration handling until impact damage is dispositioned.",
    ],
    manualReference:
      "AMM 05-50-00,6-6 Main rotor blade impact | AMM 05-50-00,6-7 Tail rotor blade impact / unbalance",
    explanationTemplate:
      "A rotor blade impact or unbalance signal was found, so AirMS is prioritizing a blade-specific abnormal-event inspection path.",
  }),
  buildFaultConditionRule({
    ruleCode: "AIRMS_FAULT_005",
    title: "Lightning strike reports should trigger environmental event response",
    category: "event-response",
    riskLevel: "Critical",
    possibleIssue: "Lightning strike may require broad aircraft inspection.",
    component: "Airframe / Electrical Bonding / Avionics",
    conditionFact: "signals.condition.lightningStrikeCount",
    description:
      "Detects lightning-strike language in maintenance and flight records.",
    recommendedActions: [
      "Inspect the aircraft for lightning entry and exit points, bonding damage, and affected electrical systems.",
      "Review avionics, antennas, and optional equipment for post-strike effects.",
      "Require event documentation before release.",
    ],
    manualReference:
      "AMM 05-50-00,6-10 Steps to be Taken on Aircraft Struck by Lightning",
    explanationTemplate:
      "Lightning-strike wording was detected, which points to the environmental abnormal-event inspection path.",
  }),
  buildFaultConditionRule({
    ruleCode: "AIRMS_FAULT_006",
    title: "Immersion or water-ingress reports should trigger contamination response",
    category: "event-response",
    riskLevel: "Critical",
    possibleIssue: "Immersion or water ingress may require abnormal-condition maintenance action.",
    component: "Airframe / Fuel / Oil / Electrical Systems",
    conditionFact: "signals.condition.immersionCount",
    description:
      "Detects immersion, submersion, flooding, and water-ingress wording.",
    recommendedActions: [
      "Assess affected zones and systems before routine troubleshooting resumes.",
      "Inspect fluid systems, electrical connectors, avionics, and structure for water exposure.",
      "Keep follow-up actions tied to the immersion event record until dispositioned.",
    ],
    manualReference:
      "AMM 05-50-00,6-24 Operation to be carried out after immersion",
    explanationTemplate:
      "Water-ingress or immersion language was found, so AirMS is treating the record as an abnormal environmental condition.",
  }),
  buildFaultConditionRule({
    ruleCode: "AIRMS_FAULT_007",
    title: "Strong turbulence reports should trigger post-event inspection",
    category: "event-response",
    riskLevel: "High",
    possibleIssue: "Strong turbulence event may require airframe and rotor follow-up inspection.",
    component: "Airframe / Rotor System",
    conditionFact: "signals.condition.strongTurbulenceCount",
    description:
      "Detects strong or severe turbulence wording in flight and maintenance narratives.",
    recommendedActions: [
      "Verify the turbulence event severity from the flight record.",
      "Inspect the affected airframe and rotor-system areas using the applicable post-turbulence procedure.",
      "Confirm that no related vibration, control, or structural discrepancy remains open.",
    ],
    manualReference:
      "AMM 05-50-00,6-9 Procedure After Flight in Strong Turbulence",
    explanationTemplate:
      "Strong-turbulence language was detected, so the rule engine is selecting an event-response path.",
  }),
  buildFaultConditionRule({
    ruleCode: "AIRMS_FAULT_008",
    title: "Abnormal ground rotor behavior should trigger ground-event follow-up",
    category: "event-response",
    riskLevel: "High",
    possibleIssue: "Abnormal rotor behavior on the ground may require inspection before further operation.",
    component: "Rotor / Ground Operations",
    conditionFact: "signals.condition.abnormalGroundRotorCount",
    description:
      "Detects abnormal ground behavior, rotor-spinning ground events, and non-rotating blades in gusts.",
    recommendedActions: [
      "Classify the event as rotor spinning on ground or non-rotating blades in gusts.",
      "Inspect affected rotor and control-system areas before release.",
      "Document wind, ground handling, and event conditions for maintenance review.",
    ],
    manualReference:
      "AMM 05-50-00,6-20 Abnormal behaviour on ground with rotor spinning | AMM 05-50-00,6-8 Non-rotating blades in gusts",
    explanationTemplate:
      "Ground rotor event language was found, so AirMS is elevating the record out of generic discrepancy handling.",
  }),
  buildFaultConditionRule({
    ruleCode: "AIRMS_FAULT_009",
    title: "Fuel contamination reports should trigger fuel-system response",
    category: "contamination",
    riskLevel: "Critical",
    possibleIssue: "Fuel contamination may require immediate fuel-system maintenance action.",
    component: "Fuel System",
    conditionFact: "signals.condition.fuelContaminationCount",
    description:
      "Detects fuel contamination, contaminated fuel, and water-in-fuel wording.",
    recommendedActions: [
      "Segregate the aircraft fuel-contamination finding from routine servicing notes.",
      "Drain, sample, inspect, and restore the fuel system using the applicable maintenance procedure.",
      "Verify that no related engine performance or filter findings remain open.",
    ],
    manualReference: "AMM 05-50-00,6-16 Procedure After Fuel Contamination",
    explanationTemplate:
      "Fuel-contamination language was detected, so AirMS is selecting the fuel contamination response.",
  }),
  buildFaultConditionRule({
    ruleCode: "AIRMS_FAULT_010",
    title: "Engine oil contamination reports should trigger oil-circuit response",
    category: "contamination",
    riskLevel: "Critical",
    possibleIssue: "Engine oil contamination may require immediate oil-circuit maintenance action.",
    component: "Engine Oil System",
    conditionFact: "signals.condition.oilContaminationCount",
    description:
      "Detects contaminated oil, oil contamination, and metal-particle wording.",
    recommendedActions: [
      "Inspect the oil circuit and affected engine areas using the applicable contamination procedure.",
      "Review chip, filter, and oil-pressure evidence together before closure.",
      "Require a maintenance disposition for any metal-particle or contamination finding.",
    ],
    manualReference:
      "AMM 05-50-00,6-19 Measures Required in Case of a Contaminated Engine Oil Circuit",
    explanationTemplate:
      "Oil-contamination language was found, which points to the engine oil-circuit contamination response.",
  }),
  buildFaultConditionRule({
    ruleCode: "AIRMS_FAULT_011",
    title: "Gearbox oil leak reports should trigger drivetrain follow-up",
    category: "drivetrain-fault",
    riskLevel: "Critical",
    possibleIssue: "Gearbox oil leak may require immediate drivetrain inspection.",
    component: "MGB / TGB / Gearboxes",
    conditionFact: "signals.condition.gearboxOilLeakCount",
    description:
      "Detects MGB, TGB, and general gearbox oil-leak wording.",
    recommendedActions: [
      "Identify the leaking gearbox and inspect using the applicable AMM procedure.",
      "Check related chip indications, warning lights, oil quantity, and temperature/pressure evidence.",
      "Do not close as a simple leak note until gearbox-specific follow-up is documented.",
    ],
    manualReference:
      "AMM 05-50-00,6-14 Procedure After Oil Leaks from the Gearboxes",
    explanationTemplate:
      "Gearbox oil-leak wording was detected, so AirMS is selecting the drivetrain leak-response path.",
  }),
  buildFaultConditionRule({
    ruleCode: "AIRMS_FAULT_012",
    title: "Chip detector reports should trigger gearbox chip response",
    category: "drivetrain-fault",
    riskLevel: "Critical",
    possibleIssue: "Chip detection may indicate MGB or TGB drivetrain distress.",
    component: "MGB / TGB Chip Detection",
    conditionFact: "signals.condition.chipDetectionCount",
    description:
      "Detects chip detector, chips detected, and metal-chip wording.",
    recommendedActions: [
      "Identify the affected chip detector and gearbox context.",
      "Perform the applicable chip-detection troubleshooting and inspection before release.",
      "Review oil leak, oil contamination, pressure, and temperature signals together.",
    ],
    manualReference:
      "AMM 05-50-00,6-1 Chips detected and/or MGB P / MGB TEMP warning lights",
    explanationTemplate:
      "Chip-detection language was found, which requires drivetrain-specific follow-up instead of generic discrepancy closure.",
  }),
  buildFaultConditionRule({
    ruleCode: "AIRMS_FAULT_013",
    title: "Freewheel jerk reports should trigger transmission follow-up",
    category: "drivetrain-fault",
    riskLevel: "High",
    possibleIssue: "Freewheel abnormality may require focused transmission inspection.",
    component: "Freewheel / Transmission",
    conditionFact: "signals.condition.freewheelJerkCount",
    description:
      "Detects freewheel jerk, freewheel slipping, and related abnormality wording.",
    recommendedActions: [
      "Treat the freewheel finding as a drivetrain condition until inspected.",
      "Review recent power changes, vibration reports, and gearbox findings for supporting evidence.",
      "Use the applicable freewheel procedure before closing the record.",
    ],
    manualReference:
      "AMM 05-50-00,6-12 Procedure After Jerks on the Freewheel",
    explanationTemplate:
      "A freewheel abnormality signal was detected, so the inference engine is selecting the transmission follow-up path.",
  }),
  buildFaultConditionRule({
    ruleCode: "AIRMS_FAULT_014",
    title: "Negative torque or no-torque-margin reports should trigger engine follow-up",
    category: "engine-fault",
    riskLevel: "High",
    possibleIssue: "Negative torque or no torque margin may require engine performance follow-up.",
    component: "Engine Health / Power Check",
    conditionFact: "signals.condition.negativeTorqueCount",
    description:
      "Detects negative torque and no-torque-margin wording in maintenance records.",
    recommendedActions: [
      "Review the engine power-check result and aircraft operating context.",
      "Route the finding to the applicable engine-health follow-up procedure.",
      "Keep the finding open until the engine performance disposition is documented.",
    ],
    manualReference:
      "AMM 05-50-00,6-17 Engine-health check / negative torque",
    explanationTemplate:
      "Negative-torque or no-torque-margin wording was found, so AirMS is prioritizing engine performance follow-up.",
  }),
  buildFaultConditionRule({
    ruleCode: "AIRMS_FAULT_015",
    title: "Engine health check anomalies should trigger performance review",
    category: "engine-fault",
    riskLevel: "Medium",
    possibleIssue: "Engine health or power check may need maintenance review.",
    component: "Engine Health / Power Check",
    conditionFact: "signals.condition.engineHealthCheckCount",
    description:
      "Detects engine-health check and engine power-check wording.",
    recommendedActions: [
      "Review engine health-check results against the applicable limits.",
      "Escalate if paired with negative torque, FADEC codes, oil indications, or performance complaints.",
      "Document the performance disposition before closing the task.",
    ],
    manualReference: "AMM 05-50-00,6-17 Engine-health check",
    explanationTemplate:
      "Engine health-check language was detected, so AirMS is flagging the record for performance review.",
  }),
  buildFaultConditionRule({
    ruleCode: "AIRMS_FAULT_016",
    title: "Hydraulic filter pre-clogging reports should trigger hydraulic response",
    category: "hydraulic-fault",
    riskLevel: "High",
    possibleIssue: "Hydraulic filter pre-clogging indication may require maintenance action.",
    component: "Hydraulic Filter",
    conditionFact: "signals.condition.hydraulicPreCloggingCount",
    description:
      "Detects hydraulic pre-clogging indicator wording.",
    recommendedActions: [
      "Inspect the hydraulic filter and related contamination indicators.",
      "Review reservoir, strainer, pressure, and servo-control evidence before closure.",
      "Use the applicable hydraulic pre-clogging procedure for disposition.",
    ],
    manualReference:
      "AMM 05-50-00,6-15 Procedure if the pre-clogging indicator of the hydraulic system filter is extended",
    explanationTemplate:
      "Hydraulic filter pre-clogging language was detected, so AirMS is selecting the hydraulic fault response.",
  }),
  buildFaultConditionRule({
    ruleCode: "AIRMS_FAULT_017",
    title: "Vibration anomalies should trigger diagnostic workflow",
    category: "diagnostics-fault",
    riskLevel: "High",
    possibleIssue: "Abnormal vibration may require diagnostic analysis.",
    component: "Vibration Analysis",
    conditionFact: "signals.condition.vibrationAnomalyCount",
    description:
      "Detects abnormal vibration, high vibration, and vibration-analysis wording.",
    recommendedActions: [
      "Route the finding to a vibration diagnostic workflow instead of a generic remark.",
      "Correlate vibration evidence with rotor, drivetrain, blade, and recent event records.",
      "Use the applicable vibration-analysis procedure or STEADY Control path where relevant.",
    ],
    manualReference:
      "AMM 05-50-00,6-21A Vibration analysis | AMM 05-50-00,6-21B STEADY Control vibration analysis",
    explanationTemplate:
      "A vibration anomaly signal was found, so the rule engine is selecting the diagnostic workflow.",
  }),
  buildFaultConditionRule({
    ruleCode: "AIRMS_FAULT_018",
    title: "Fuel-control faults should trigger engine-controls review",
    category: "engine-fault",
    riskLevel: "High",
    possibleIssue: "Fuel-control or twist-grip fault may require engine-controls inspection.",
    component: "Engine Controls / Twist Grip",
    conditionFact: "signals.condition.fuelControlFaultCount",
    description:
      "Detects twist-grip, fuel-flow control, binding, and stiffness fault wording.",
    recommendedActions: [
      "Inspect engine-control linkage and fuel-flow control areas using applicable maintenance data.",
      "Review pilot reports for binding, stiffness, or abnormal power response.",
      "Keep this separate from generic engine performance handling until controls are dispositioned.",
    ],
    manualReference: "Applicable AMM engine controls and fuel-flow control procedures",
    explanationTemplate:
      "Fuel-control fault language was detected, so AirMS is prioritizing engine-controls review.",
  }),
  buildFaultConditionRule({
    ruleCode: "AIRMS_FAULT_019",
    title: "Engine oil indication faults should trigger oil-system review",
    category: "engine-fault",
    riskLevel: "High",
    possibleIssue: "Engine oil pressure or temperature warning may require oil-system follow-up.",
    component: "Engine Oil Indication",
    conditionFact: "signals.condition.engineOilIndicationFaultCount",
    description:
      "Detects engine oil pressure or oil temperature warning language.",
    recommendedActions: [
      "Review oil pressure, oil temperature, servicing, and contamination evidence together.",
      "Inspect the oil indication and engine oil system using applicable maintenance data.",
      "Escalate if paired with chip detection, contamination, or abnormal engine performance.",
    ],
    manualReference: "Applicable AMM engine oil indication and oil-system procedures",
    explanationTemplate:
      "Engine oil indication fault wording was found, so AirMS is selecting an oil-system follow-up path.",
  }),
  buildFaultConditionRule({
    ruleCode: "AIRMS_FAULT_020",
    title: "Load-compensator faults should trigger hydraulic/control review",
    category: "hydraulic-fault",
    riskLevel: "High",
    possibleIssue: "Load-compensator or dissymmetric-load fault may require hydraulic/control inspection.",
    component: "Hydraulic Load Compensator",
    conditionFact: "signals.condition.loadCompensatorFaultCount",
    description:
      "Detects load-compensator fault, binding, and dissymmetric-load wording.",
    recommendedActions: [
      "Inspect the load compensator and related hydraulic/control components using applicable maintenance data.",
      "Correlate with hydraulic pressure, servo-control, and control-feel records.",
      "Require follow-up before closing any related handling-quality discrepancy.",
    ],
    manualReference: "Applicable AMM hydraulic load-compensator procedures",
    explanationTemplate:
      "Load-compensator fault language was detected, so AirMS is selecting a hydraulic/control follow-up path.",
  }),
  buildFaultConditionRule({
    ruleCode: "AIRMS_FAULT_021",
    title: "Hydraulic leak wording should trigger hydraulic-system review",
    category: "hydraulic-fault",
    riskLevel: "High",
    possibleIssue: "Hydraulic leak or rupture wording may require immediate hydraulic inspection.",
    component: "Hydraulic System",
    conditionFact: "signals.hydraulicLeakCount",
    description:
      "Detects hydraulic context paired with leak, leaking, rupture, or burst wording.",
    recommendedActions: [
      "Review the matching maintenance, task, flight, or checklist record for leak location and severity.",
      "Inspect hydraulic lines, reservoirs, pumps, servocontrols, accumulators, and fittings as applicable.",
      "Do not close the finding until leakage limits and rectification status are documented.",
    ],
    manualReference: "Applicable AMM hydraulic leak inspection and fault-isolation procedures",
    explanationTemplate:
      "Hydraulic leak terminology was detected in current aircraft records, so AirMS is selecting a hydraulic-system review.",
  }),
  buildFaultConditionRule({
    ruleCode: "AIRMS_FAULT_022",
    title: "Hydraulic pressure wording should trigger pressure-system review",
    category: "hydraulic-fault",
    riskLevel: "High",
    possibleIssue: "Hydraulic pressure anomaly may require pressure-system troubleshooting.",
    component: "Hydraulic Pressure System",
    conditionFact: "signals.hydraulicPressureCount",
    description:
      "Detects hydraulic context paired with pressure, pressure-drop, accumulator, charging, or gauge wording.",
    recommendedActions: [
      "Review the pressure indication, accumulator, gauge, and charging-pressure context in the source record.",
      "Correlate the finding with servo-control, pump, reservoir, and flight remark evidence.",
      "Confirm pressure-system disposition before the aircraft is released.",
    ],
    manualReference: "Applicable AMM hydraulic pressure and accumulator procedures",
    explanationTemplate:
      "Hydraulic pressure terminology was detected in current aircraft records, so AirMS is selecting a pressure-system follow-up path.",
  }),
  buildFaultConditionRule({
    ruleCode: "AIRMS_FAULT_023",
    title: "Hydraulic filter or contamination wording should trigger filter review",
    category: "hydraulic-fault",
    riskLevel: "High",
    possibleIssue: "Hydraulic filter, strainer, clogging, or contamination issue may require maintenance action.",
    component: "Hydraulic Filter / Reservoir",
    conditionFact: "signals.hydraulicFilterCount",
    description:
      "Detects hydraulic context paired with filter, strainer, clogging, contamination, pollution, reservoir, or CM 208 wording.",
    recommendedActions: [
      "Inspect the hydraulic filter, strainer, reservoir, and contamination indicators.",
      "Review whether the record indicates pre-clogging, clogging, pollution, or servicing contamination.",
      "Document filter/strainer disposition before closing the finding.",
    ],
    manualReference: "Applicable AMM hydraulic filter, strainer, and contamination procedures",
    explanationTemplate:
      "Hydraulic filter or contamination terminology was detected, so AirMS is selecting a hydraulic-filter review.",
  }),
  buildFaultConditionRule({
    ruleCode: "AIRMS_FAULT_024",
    title: "Generic hydraulic wording should still be visible to maintenance tracking",
    category: "hydraulic-fault",
    riskLevel: "High",
    possibleIssue: "Hydraulic-related record may require maintenance review.",
    component: "Hydraulic System",
    conditionFact: "signals.hydraulicContextCount",
    description:
      "Detects general hydraulic terminology even when no leak, pressure, or filter subtype is present.",
    recommendedActions: [
      "Review the source record to determine whether the hydraulic mention is a task, discrepancy, flight remark, or part context.",
      "Classify the issue into leak, pressure, filter, servocontrol, accumulator, pump, reservoir, or load-compensator handling where possible.",
      "Keep the item visible in Maintenance Tracking until the hydraulic context is dispositioned.",
    ],
    manualReference: "Applicable AMM hydraulic-system maintenance procedures",
    explanationTemplate:
      "Hydraulic terminology was detected in current aircraft records, so AirMS is keeping the item visible for maintenance tracking.",
  }),
];

module.exports = FAULT_CONDITION_RULES;
