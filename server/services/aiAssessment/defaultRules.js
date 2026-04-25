const buildTitleRule = ({
  ruleCode,
  title,
  category,
  riskLevel,
  possibleIssue,
  component,
  description,
  recommendedActions,
  manualReference,
  analysisNote,
}) => ({
  ruleCode,
  title,
  description,
  category,
  conditions: [],
  riskLevel,
  possibleIssue,
  component,
  recommendedActions,
  explanationTemplate: analysisNote,
  manualReference,
  isStarterRule: true,
  active: true,
});

const buildExecutableRule = ({
  ruleCode,
  title,
  category,
  riskLevel,
  possibleIssue,
  component,
  description,
  recommendedActions,
  manualReference,
  explanationTemplate,
  conditions,
}) => ({
  ruleCode,
  title,
  description,
  category,
  conditions,
  riskLevel,
  possibleIssue,
  component,
  recommendedActions,
  explanationTemplate,
  manualReference,
  isStarterRule: false,
  active: true,
});

const DEFAULT_MANUAL_RULES = [
  buildTitleRule({
    ruleCode: "AIRMS_RULE_001",
    title: "Daily and turnaround inspections should be tracked as routine release gates",
    category: "inspection",
    riskLevel: "Medium",
    possibleIssue: "Routine inspection gate may be missing or incomplete.",
    component: "Routine Maintenance Checks",
    description:
      "Seeded from analyzed Daily Checks manuals covering BFF, ALF, turnaround, and optional equipment checks in the AMM 05-40 family.",
    recommendedActions: [
      "Track daily checks, turnaround checks, and before-flight / after-flight inspections explicitly.",
      "Separate base airframe inspections from optional equipment inspections in the rule set.",
      "Map these checks to release workflow status before enabling automated triggers.",
    ],
    manualReference:
      "AMM 05-40-00,3-1 General Instructions - Daily Checks | AMM 05-40-00,6-4 Inspection Before the First Flight of the Day | AMM 05-40-00,6-5 Turnaround Checks - Optional Equipment | AMM 05-40-00,6-6 Check After the Last Flight of the Day | AMM 05-40-00,6-9 Check Before the First Flight of the Day - Optional Equipment | AMM 05-40-00,6-10 Check After the Last Flight of the Day - Optional Equipment",
    analysisNote:
      "The analyzed PDFs identify these as Daily Checks documents in the AMM 05-40 family rather than generic inspection notes. They should become release-gate workflow rules after we map them to specific AirMS records.",
  }),
  buildTitleRule({
    ruleCode: "AIRMS_RULE_002",
    title: "P inspection family should be treated as a scheduled inspection group",
    category: "inspection",
    riskLevel: "Medium",
    possibleIssue: "P inspection requirement may not be consistently tracked across variants.",
    component: "Scheduled Inspections",
    description:
      "Seeded from analyzed Daily Checks manuals for P inspection, including optional equipment and PRE/POST MOD 074302 variants in the AMM 05-40 family.",
    recommendedActions: [
      "Create separate tracking for base P inspection, optional equipment variants, and pre/post modification variants.",
      "Normalize naming so the same inspection family is not split by file-title formatting differences.",
      "Link inspection completion to the applicable aircraft configuration.",
    ],
    manualReference:
      "AMM 05-40-00,6-7 P inspection - Daily Checks | AMM 05-40-00,6-7A P inspection PRE MOD 074302 - Daily Checks | AMM 05-40-00,6-7B P inspection POST MOD 074302 - Daily Checks | AMM 05-40-00,6-8 P inspection - Optional Equipment - Daily Checks",
    analysisNote:
      "The analyzed PDFs show that P inspection is documented as a Daily Checks family with configuration-dependent variants. This should be modeled as a scheduled inspection group with aircraft-configuration branching.",
  }),
  buildTitleRule({
    ruleCode: "AIRMS_RULE_003",
    title: "Type F inspection should remain a distinct scheduled check",
    category: "inspection",
    riskLevel: "Medium",
    possibleIssue: "Type F inspection may be missed if merged into generic inspection handling.",
    component: "Scheduled Inspections",
    description:
      "Seeded from analyzed FAA complementary inspection material identifying Type F inspection as its own maintenance document.",
    recommendedActions: [
      "Track Type F inspection as its own maintenance check type.",
      "Keep its due logic separate from daily, turnaround, and P inspection logic.",
    ],
    manualReference: "AMM 05-32-00,6-1 Type F Inspection - FAA Complementary Inspection",
    analysisNote:
      "The analyzed PDF places Type F outside the daily-check family and under FAA complementary inspection documentation, so it should stay separate in the rule model.",
  }),
  buildTitleRule({
    ruleCode: "AIRMS_RULE_004",
    title: "Hard landing events require dedicated follow-up inspection logic",
    category: "event-response",
    riskLevel: "Critical",
    possibleIssue: "Hard landing follow-up inspection may be required.",
    component: "Airframe and Landing Event Response",
    description:
      "Seeded from analyzed Unscheduled Inspection manuals for hard landing response and hard landing component / optional equipment inspection.",
    recommendedActions: [
      "Create an event trigger for hard landing reports in flight or maintenance records.",
      "Track PRE MOD and POST MOD 074302 procedures separately if configuration matters.",
      "Require inspection completion before normal return-to-service flow resumes.",
    ],
    manualReference:
      "AMM 05-50-00,6-25 Inspection of the components and optional equipment involved in a hard landing - Unscheduled Inspections | AMM 05-50-00,6-5A Procedure after a hard landing PRE MOD 074302 - Unscheduled Inspections | AMM 05-50-00,6-5B Procedure after a hard landing POST MOD 074302 - Unscheduled Inspections",
    analysisNote:
      "The analyzed PDFs classify these as Unscheduled Inspections and split the maintenance response by modification state, which should be preserved in later executable rules.",
  }),
  buildTitleRule({
    ruleCode: "AIRMS_RULE_005",
    title: "Overtorque events require dedicated maintenance response",
    category: "event-response",
    riskLevel: "Critical",
    possibleIssue: "Overtorque event may require immediate inspection and follow-up action.",
    component: "Power Train Event Response",
    description:
      "Seeded from analyzed Unscheduled Inspection manuals for overtorque response, including generic, PRE MOD, and POST MOD procedures.",
    recommendedActions: [
      "Create an event trigger for overtorque findings from flight or maintenance records.",
      "Keep generic, PRE MOD 074302, and POST MOD 074302 procedures distinguishable.",
      "Prevent rule execution from assuming one modification state when multiple procedures exist.",
    ],
    manualReference:
      "AMM 05-50-00,6-4 Procedure After Overtorque - Unscheduled Inspections | AMM 05-50-00,6-4A Actions to take if there is overtorque PRE MOD 074302 - Unscheduled Inspections | AMM 05-50-00,6-4B Procedure if there is overtorque POST MOD 074302 - Unscheduled Inspections",
    analysisNote:
      "The analyzed PDFs show overtorque as an Unscheduled Inspection set with both generic and modification-specific procedures. The rule set should preserve that branching instead of collapsing it.",
  }),
  buildTitleRule({
    ruleCode: "AIRMS_RULE_006",
    title: "Rotor overspeed and rotor brake events require follow-up inspection",
    category: "event-response",
    riskLevel: "Critical",
    possibleIssue: "Rotor system event may require post-event maintenance action.",
    component: "Rotor System Event Response",
    description:
      "Seeded from analyzed Unscheduled Inspection manuals for rotor overspeed and sudden main rotor brake application.",
    recommendedActions: [
      "Track rotor overspeed and sudden main rotor brake application as explicit event-driven maintenance triggers.",
      "Route both events into dedicated inspection workflow rather than generic discrepancy handling.",
    ],
    manualReference:
      "AMM 05-50-00,6-3 Steps to be taken after rotor overspeed - Unscheduled Inspections | AMM 05-50-00,6-11 Procedure After Sudden Application of the Main Rotor Brake - Unscheduled Inspections",
    analysisNote:
      "The analyzed manuals classify both as Unscheduled Inspections rather than routine discrepancies, which supports dedicated event-response logic.",
  }),
  buildTitleRule({
    ruleCode: "AIRMS_RULE_007",
    title: "Blade impact or unbalance events should trigger rotor-specific inspections",
    category: "event-response",
    riskLevel: "Critical",
    possibleIssue: "Main or tail rotor damage assessment may be required after impact or unbalance.",
    component: "Main Rotor / Tail Rotor",
    description:
      "Seeded from analyzed Unscheduled Inspection manuals for main rotor blade impact and tail rotor blade impact / unbalance.",
    recommendedActions: [
      "Distinguish main rotor blade impact logic from tail rotor blade impact or unbalance logic.",
      "Require component-specific inspection workflow before release after a reported blade strike or imbalance event.",
    ],
    manualReference:
      "AMM 05-50-00,6-6 Procedure if there is an impact on the main rotor blades - Unscheduled Inspections | AMM 05-50-00,6-7 Measures to be Taken After Impact / Unbalance on the Tail Rotor Blade - Unscheduled Inspections",
    analysisNote:
      "The analyzed PDFs place both manuals in the Unscheduled Inspection family but keep main-rotor and tail-rotor cases separate, which should remain distinct in the rule set.",
  }),
  buildTitleRule({
    ruleCode: "AIRMS_RULE_008",
    title: "Lightning, immersion, and turbulence events need special maintenance pathways",
    category: "event-response",
    riskLevel: "Critical",
    possibleIssue: "Environmental event may require abnormal-condition maintenance action.",
    component: "Environmental Event Response",
    description:
      "Seeded from analyzed Unscheduled Inspection manuals for lightning strike, immersion, and strong turbulence events.",
    recommendedActions: [
      "Create dedicated event categories for lightning strike, immersion, and strong turbulence.",
      "Do not merge these with ordinary discrepancies because they imply broader post-event inspections.",
      "Capture whether optional equipment is also affected when present.",
    ],
    manualReference:
      "AMM 05-50-00,6-10 Steps to be Taken on Aircraft Struck by Lightning - Unscheduled Inspections | AMM 05-50-00,6-24 Operation to be carried out after immersion - Unscheduled Inspections | AMM 05-50-00,6-9 Procedure After Flight in Strong Turbulence - Unscheduled Inspections",
    analysisNote:
      "The analyzed manuals clearly identify these as Unscheduled Inspections with dedicated event-specific follow-up, which supports separate abnormal-condition pathways.",
  }),
  buildTitleRule({
    ruleCode: "AIRMS_RULE_009",
    title: "Abnormal on-ground rotor behavior and gust exposure require safety-driven follow-up",
    category: "event-response",
    riskLevel: "High",
    possibleIssue: "Ground handling or rotor condition event may require inspection before next operation.",
    component: "Rotor / Ground Operations",
    description:
      "Seeded from analyzed Unscheduled Inspection manuals for abnormal ground behaviour with rotor spinning and non-rotating blades in gusts.",
    recommendedActions: [
      "Track abnormal ground behavior with rotor spinning as a distinct event type.",
      "Track non-rotating blade exposure in gusts separately from in-flight rotor events.",
    ],
    manualReference:
      "AMM 05-50-00,6-20 Actions to be taken in the events of abnormal behaviour of helicopter on the ground, with rotor spinning - Unscheduled Inspections | AMM 05-50-00,6-8 Steps to be Taken for Non-Rotating Blades in Gusts - Unscheduled Inspections",
    analysisNote:
      "The analyzed documents group both scenarios under Unscheduled Inspections but distinguish rotor-spinning and non-rotating-blade cases, which should remain separate event types.",
  }),
  buildTitleRule({
    ruleCode: "AIRMS_RULE_010",
    title: "Fuel contamination and engine oil contamination require dedicated contamination response",
    category: "contamination",
    riskLevel: "Critical",
    possibleIssue: "Fuel or oil circuit contamination may require immediate maintenance action.",
    component: "Fuel / Oil Systems",
    description:
      "Seeded from analyzed Unscheduled Inspection manuals for fuel contamination and contaminated engine oil circuit response.",
    recommendedActions: [
      "Create separate contamination workflows for fuel contamination and contaminated engine oil circuit findings.",
      "Do not treat contamination as a generic log remark; route it into a dedicated maintenance response path.",
    ],
    manualReference:
      "AMM 05-50-00,6-16 Procedure After Fuel Contamination - Unscheduled Inspections | AMM 05-50-00,6-19 Measures Required in Case of a Contaminated Engine Oil Circuit - Unscheduled Inspections",
    analysisNote:
      "The analyzed PDFs classify contamination response as Unscheduled Inspections with maintenance impact, so contamination should be modeled as a dedicated response family rather than a generic remark.",
  }),
  buildTitleRule({
    ruleCode: "AIRMS_RULE_011",
    title: "Gearbox oil leaks and chip indications require drivetrain troubleshooting",
    category: "drivetrain",
    riskLevel: "Critical",
    possibleIssue: "Gearbox leak or chip / warning-light event may require immediate drivetrain inspection.",
    component: "MGB / TGB / Gearboxes",
    description:
      "Seeded from analyzed Unscheduled Inspection manuals for gearbox oil leaks and chip or MGB warning events.",
    recommendedActions: [
      "Track gearbox oil leaks as a specific drivetrain maintenance event.",
      "Track chip detection and MGB pressure / temperature warning events separately from general warnings.",
      "Escalate these findings ahead of routine maintenance items.",
    ],
    manualReference:
      "AMM 05-50-00,6-14 Procedure After Oil Leaks from the Gearboxes - Unscheduled Inspections | AMM 05-50-00,6-1 Procedure if Chips are Detected and / or if the MGB P and / or MGB TEMP Warning Lights Come on - TGB / MGB - Unscheduled Inspections",
    analysisNote:
      "The analyzed manuals show these are explicit Unscheduled Inspection procedures for drivetrain faults, not just generic discrepancy examples.",
  }),
  buildTitleRule({
    ruleCode: "AIRMS_RULE_012",
    title: "Freewheel jerk events require dedicated follow-up action",
    category: "drivetrain",
    riskLevel: "High",
    possibleIssue: "Freewheel abnormality may require focused drivetrain maintenance response.",
    component: "Freewheel / Transmission",
    description:
      "Seeded from analyzed Unscheduled Inspection material for freewheel jerks.",
    recommendedActions: [
      "Create a distinct event type for freewheel jerks.",
      "Keep freewheel anomaly handling separate from general vibration or gearbox leak logic.",
    ],
    manualReference: "AMM 05-50-00,6-12 Procedure After Jerks on the Freewheel - Unscheduled Inspections",
    analysisNote:
      "The analyzed PDF identifies this as its own Unscheduled Inspection procedure, so it deserves a dedicated event-response path.",
  }),
  buildTitleRule({
    ruleCode: "AIRMS_RULE_013",
    title: "Negative torque or engine-health check results require engine follow-up",
    category: "engine",
    riskLevel: "High",
    possibleIssue: "Engine performance check result may require dedicated maintenance action.",
    component: "Engine Health / Power Check",
    description:
      "Seeded from analyzed Unscheduled Inspection manuals for engine-health checks and negative torque outcomes.",
    recommendedActions: [
      "Track negative torque findings as explicit engine-check outcomes.",
      "Keep no-torque-margin engine-health procedures distinct from standard engine health check follow-up.",
      "Route engine-performance anomalies into dedicated maintenance review before closure.",
    ],
    manualReference:
      "AMM 05-50-00,6-17 Procedure After an Engine-health Check - (No Torque Margin Engine) - Unscheduled Inspections | AMM 05-50-00,6-17 Procedure applicable when an engine power check shows a negative torque - Unscheduled Inspections",
    analysisNote:
      "The analyzed PDFs tie both engine-check cases to the same Unscheduled Inspection document family, which suggests a shared engine follow-up workflow with different entry conditions.",
  }),
  buildTitleRule({
    ruleCode: "AIRMS_RULE_014",
    title: "Hydraulic filter pre-clogging indication should trigger hydraulic follow-up",
    category: "hydraulic",
    riskLevel: "High",
    possibleIssue: "Hydraulic system filter pre-clogging indication may require maintenance action.",
    component: "Hydraulic Filter",
    description:
      "Seeded from analyzed Unscheduled Inspection material for extended hydraulic system filter pre-clogging indication.",
    recommendedActions: [
      "Create a dedicated maintenance response path for extended hydraulic pre-clogging indicators.",
      "Keep this separate from generic hydraulic discrepancy handling because it is a named condition in the manuals.",
    ],
    manualReference:
      "AMM 05-50-00,6-15 Procedure if the pre-clogging indicator of the hydraulic system filter is extended - Unscheduled Inspections",
    analysisNote:
      "The analyzed PDF shows this is its own Unscheduled Inspection entry with maintenance impact, which justifies a dedicated hydraulic event rule.",
  }),
  buildTitleRule({
    ruleCode: "AIRMS_RULE_015",
    title: "Vibration analysis manuals should map to anomaly-diagnosis workflows",
    category: "diagnostics",
    riskLevel: "High",
    possibleIssue: "Abnormal vibration may require diagnostic workflow and adjustment analysis.",
    component: "Vibration Analysis",
    description:
      "Seeded from analyzed Unscheduled Inspection manuals for vibration-based anomaly diagnosis, including a STEADY Control variant.",
    recommendedActions: [
      "Create a diagnostic workflow category for vibration-analysis findings.",
      "Track whether STEADY Control adjustment equipment is involved as a separate analysis path.",
    ],
    manualReference:
      "AMM 05-50-00,6-21A Diagnosis of anomalies through vibration analysis - Unscheduled Inspections | AMM 05-50-00,6-21B Diagnosis of anomalies through vibration analysis using STEADY Control adjustment equipment - Unscheduled Inspections",
    analysisNote:
      "The analyzed PDFs separate general vibration diagnosis from the STEADY Control equipment path, which should be reflected in future diagnostic rules.",
  }),
  buildTitleRule({
    ruleCode: "AIRMS_RULE_016",
    title: "Main rotor drive and tail rotor drive assemblies should be treated as critical mechanical systems",
    category: "drivetrain",
    riskLevel: "High",
    possibleIssue: "Rotor drive mechanical assembly maintenance may require dedicated tracking.",
    component: "Main Rotor Drive / Tail Rotor Drive",
    description:
      "Seeded from analyzed Calendar Inspection material for main rotor drive and tail rotor drive mechanical assemblies.",
    recommendedActions: [
      "Separate rotor drive assembly issues from generic mechanical discrepancies.",
      "Use this manual family as the basis for future drivetrain-specific rules.",
    ],
    manualReference:
      "AMM 05-60-00,6-1 Mechanical assemblies - Main Rotor Drive / Tail Rotor Drive - Calendar Inspections",
    analysisNote:
      "The analyzed PDF classifies this as a Calendar Inspection document, so it belongs in the time-limit / scheduled-maintenance side of the rule model rather than only as an unscheduled event.",
  }),
  buildTitleRule({
    ruleCode: "AIRMS_RULE_017",
    title: "MMEL maintenance-procedure tasks should be explicitly traceable",
    category: "mmel",
    riskLevel: "Medium",
    possibleIssue: "MMEL-related maintenance tasks may not be clearly traceable in task workflows.",
    component: "MMEL Task Tracking",
    description:
      "Seeded from analyzed MMEL task-identification material for unscheduled maintenance checks.",
    recommendedActions: [
      "Tag MMEL-derived maintenance tasks explicitly.",
      "Preserve traceability from MMEL procedure to assigned task and closure evidence.",
    ],
    manualReference:
      "AMM 05-50-01,6-1 Tasks Identified in the Maintenance Procedures of the MMEL - Unscheduled Maintenance Checks - MMEL",
    analysisNote:
      "The analyzed PDF explicitly connects MMEL procedure content to unscheduled maintenance tasks, which supports a dedicated MMEL traceability category.",
  }),
  buildTitleRule({
    ruleCode: "AIRMS_RULE_018",
    title: "Critical parts should be identifiable in maintenance prioritization",
    category: "safety",
    riskLevel: "High",
    possibleIssue: "Critical parts may need higher visibility in maintenance review and prioritization.",
    component: "Critical Parts",
    description:
      "Seeded from analyzed Critical / Important Parts documentation.",
    recommendedActions: [
      "Create a flag or taxonomy for critical parts in the maintenance system.",
      "Use critical-part status to influence risk ranking and review urgency later.",
    ],
    manualReference: "AMM 01-10-00,2-1 List of critical / important parts - Critical / Important Parts",
    analysisNote:
      "The analyzed PDF identifies this as a formal Critical / Important Parts document, which supports using it as a prioritization and governance input rather than as a normal task manual.",
  }),
  buildTitleRule({
    ruleCode: "AIRMS_RULE_019",
    title: "Task numbering changes should be normalized before rule automation expands",
    category: "data-governance",
    riskLevel: "Low",
    possibleIssue: "Task renumbering may fragment maintenance rule matching and traceability.",
    component: "Task Identification",
    description:
      "Seeded from analyzed task-renumbering reference material.",
    recommendedActions: [
      "Normalize old and new task numbering before building deeper task-based automation.",
      "Keep aliases so historical tasks remain mappable after renumbering.",
    ],
    manualReference: "AMM 01-20-00,2-1 New numbering of Tasks - New numbering of Tasks",
    analysisNote:
      "The analyzed PDF is a numbering / identification reference rather than an operational maintenance task, so it belongs in data-governance support for future automation.",
  }),
  buildTitleRule({
    ruleCode: "AIRMS_RULE_020",
    title: "Fault isolation manuals for mission and optional equipment should be tracked by installation and modification state",
    category: "fault-isolation",
    riskLevel: "High",
    possibleIssue: "Optional equipment fault isolation may require installation-specific troubleshooting.",
    component: "Optional / Mission Equipment",
    description:
      "Seeded from analyzed fault-isolation manuals covering mission equipment and optional installations such as cargo sling, cargo swing, BAMBI bucket, ISOLAIR, emergency floatation gear, electrical rear-view mirror, and imaging / flight-data monitoring devices.",
    recommendedActions: [
      "Create equipment-specific fault-isolation categories instead of merging all optional equipment into one generic rule.",
      "Preserve PRE MOD and POST MOD branching where the manuals split troubleshooting by modification state.",
      "Map installed optional equipment on each aircraft before enabling executable troubleshooting rules.",
    ],
    manualReference:
      "AMM 25-96-00,1-1 Electrical rear-view mirror PRE / POST MOD 074282 | AMM 25-92-00,1-1 Cargo sling installation PRE / POST MOD 074281 | AMM 25-91-00,1-1 Cargo swing installation PRE / POST MOD 074281 | AMM 25-87-12,1-1 BAMBI BUCKET installation failures and corrective actions | AMM 25-87-11,1-1 ISOLAIR Water Bomber System | AMM 25-67-00,1-1 Emergency Floatation Gear PRE / POST MOD 074240 | AMM 25-10-40,1-1 Imaging and Flight Data Monitoring Device",
    analysisNote:
      "OCR analysis recovered a clear chapter 25 optional-equipment family with repeated PRE / POST MOD branching. The supplied manuals do not support one shared troubleshooting path across sling, swing, float, mirror, bomber, and monitoring installations, so later executable rules should branch by installed equipment and modification state.",
  }),
  buildTitleRule({
    ruleCode: "AIRMS_RULE_021",
    title: "Fault isolation manuals for fire detection, avionics, electrical, communication, and utility systems should be separated by equipment family",
    category: "fault-isolation",
    riskLevel: "High",
    possibleIssue: "Installed electrical, avionics, communication, safety, or utility systems may require model-specific fault isolation.",
    component: "Electrical / Avionics / Communication / Utility Systems",
    description:
      "Seeded from analyzed fault-isolation manuals covering fire detection, emergency locator transmitters, DC power, AC generation, ICS, VHF, HF, automatic pilot, and environmental-control systems.",
    recommendedActions: [
      "Separate fire detection, power supply, communication, locator transmitter, and autopilot troubleshooting into distinct equipment families.",
      "Keep environmental-control fault isolation separate from avionics even when the manuals live in the same imported batch.",
      "Do not collapse different radio, ICS, ELT, or autopilot models into one rule unless the analyzed manuals prove the logic is shared.",
      "Capture exact installed equipment model on each aircraft before enabling trigger logic.",
    ],
    manualReference:
      "AMM 26-11-00,1-1 Fire Detection | AMM 25-66-20,1-1 KANNAD INTEGRA AP-H ELT | AMM 25-66-08 ELT 96-406 SOCATA | AMM 25-66-04,1-1 JOLLIET JE2 / JE2NG ELT | AMM 25-66-02,1-1 KANNAD 121 AF-H / 406 AF-H ELT | AMM 24-30-00,1-1 DC power supply system including POST MOD 074836 | AMM 24-22-00,1-1 AC Generation 250VA | AMM 23-41-25,1-1 GARMIN GMA 350H ICS | AMM 23-41-18,1-1 GARMIN GMA 340 ICS | AMM 23-41-17,1-1 TEAM SIB 120 ICS | AMM 23-41-15,1-1 NAT AMS 43 TSO ICS | AMM 23-41-14,1-1 KMA 24H-71 ICS | AMM 23-41-03,1-1 TEAM TB 31 ICS | AMM 23-41-01,1-1 TEAM TB 27 ICS | AMM 23-13-21,1-1 COLLINS 422 VHF AM | AMM 23-12-51,1-1 GTN 650 VHF family | AMM 23-12-50,1-1 GNC 255 VHF | AMM 23-12-49,1-1 GNS 430 VHF AM | AMM 23-12-46,1-1 NAT NPX 138 VHF FM | AMM 23-12-21,1-1 KING KX 165 A VHF AM | AMM 23-12-20,1-1 COLLINS 20 B VHF | AMM 23-12-19,1-1 MARCONI ART 132 VHF FM | AMM 23-12-03,1-1 BECKER AR 2009 / 25 VHF | AMM 23-12-02,1-1 COLLINS 251 E VHF | AMM 23-12-01,1-1 KING KY 196 A VHF | AMM 23-11-12,1-1 COLLINS HF 9100 HF SSB | AMM 23-11-05,1-1 KING KHF-950 HF SSB | AMM 22-00-02,1-1 / 22-10-02,6-1 SFIM 85T31 Automatic pilot family | AMM 21-51-10,1-1 Air conditioning with refrigerant | AMM 21-21-00,1-1 Demist / heating / ventilation",
    analysisNote:
      "OCR analysis confirms this batch spans many distinct model families across chapters 26, 25, 24, 23, 22, and 21. Fire detection, ELTs, power generation and distribution, ICS models, VHF/HF radios, automatic pilot, and environmental-control manuals are all written as equipment-specific fault-isolation documents, so executable logic should stay model-aware and avoid generic cross-system troubleshooting.",
  }),
  buildTitleRule({
    ruleCode: "AIRMS_RULE_022",
    title: "Levelling, weighing, and balance-correction documents should support aircraft configuration governance",
    category: "mass-balance",
    riskLevel: "Medium",
    possibleIssue: "Aircraft levelling, weighing, or balance-correction procedures may need dedicated configuration tracking.",
    component: "Weight and Balance",
    description:
      "Starter rule reserved for analyzed manuals covering levelling, weighing, and balance correction.",
    recommendedActions: [
      "Treat levelling, weighing, and balance correction as configuration-control procedures rather than generic maintenance tasks.",
      "Track when a weighing or balance-correction event should force data refresh in aircraft records.",
    ],
    manualReference:
      "AMM 08-20-00,3-1 Levelling | AMM 08-10-00,3-1 Weighing | AMM 08-10-00,3-2 Balance correction",
    analysisNote:
      "OCR analysis places levelling, weighing, and balance correction in the AMM 08 family, which fits aircraft configuration and weight-and-balance governance better than ordinary line-maintenance troubleshooting. Later executable rules should use these as record-control and recalculation triggers rather than discrepancy-response logic.",
  }),
  buildTitleRule({
    ruleCode: "AIRMS_RULE_023",
    title: "Main rotor hub inspection criteria should be tracked as component-specific detailed inspections",
    category: "inspection-criteria",
    riskLevel: "High",
    possibleIssue: "Main rotor hub component may require part-specific inspection criteria.",
    component: "Main Rotor Hub",
    description:
      "Seeded from analyzed inspection-criteria manuals for the main rotor hub, including lower stop brackets, taper shim bonding, frequency adapters, droop restrainer ring, pitch change lever, lower stop caliper, electrical bonding braid, mast hub coupling screw, blade attachment pin, spherical thrust bearing, cheek plates, and STARFLEX components.",
    recommendedActions: [
      "Model main rotor hub inspection criteria at the part-number or modification-state level where the manuals split by PN or PRE / POST MOD condition.",
      "Do not collapse all hub inspections into one generic rotor-head rule because the supplied files distinguish several specific components and part numbers.",
      "Link these criteria to part configuration data before enabling executable rule triggers.",
    ],
    manualReference:
      "AMM 62-21-00,6-1 through 6-22 Main rotor hub inspection criteria family, including 6-22 lower stop bracket, 6-18 taper shim bonding, 6-14 frequency adapter / sleeves pin, 6-13 droop restrainer ring, 6-12 pitch change lever, 6-10 lower stop caliper, 6-9 electrical bonding braid, 6-8 mast / hub coupling screw, 6-7 frequency adapters PRE/POST MOD 076232, 6-6 blade attachment pin PRE/POST MOD OP6305, 6-5 spherical thrust bearing PRE/POST MOD 076160, 6-4 spherical thrust bearing PN variants, 6-3 cheek plates, 6-2 STARFLEX spherical bearing, and 6-1 STARFLEX star assembly",
    analysisNote:
      "OCR analysis recovered a dense AMM 62-21-00 inspection-criteria family for main rotor hub parts. The manuals split repeatedly by exact part number and modification state, so future executable rules should branch by installed configuration instead of using one shared hub-inspection trigger.",
  }),
  buildTitleRule({
    ruleCode: "AIRMS_RULE_024",
    title: "Rotor control, swashplate, and rotor mast inspection criteria should remain separate inspection families",
    category: "inspection-criteria",
    riskLevel: "High",
    possibleIssue: "Rotor control or mast inspection may require dedicated detailed criteria by assembly.",
    component: "Rotor Control / Swashplates / Rotor Mast",
    description:
      "Seeded from analyzed inspection-criteria manuals covering rotor control links, swashplates, and rotor mast sections.",
    recommendedActions: [
      "Keep rotor control, swashplate, and rotor mast inspection criteria separate instead of treating them as one broad rotor-system rule.",
      "Preserve distinctions such as with-removal versus without-removal criteria and PRE / POST MOD or part-number splits where the manuals define them.",
      "Map these manuals to the exact installed assembly before creating executable inspection rules.",
    ],
    manualReference:
      "AMM 62-33-00,6-1 through 6-3 Rotor Control inspection criteria | AMM 62-32-00,6-3 through 6-9 Swashplates inspection criteria | AMM 62-31-00,6-1, 6-5, and 6-7 Rotor mast inspection criteria",
    analysisNote:
      "OCR analysis recovered three distinct inspection-criteria families: rotor control in AMM 62-33-00, swashplates in AMM 62-32-00, and rotor mast in AMM 62-31-00. One swashplate-guide PDF had noisy OCR, so exact sub-reference for the without-removal variant should be spot-checked before using it as executable logic.",
  }),
  buildTitleRule({
    ruleCode: "AIRMS_RULE_025",
    title: "Vehicle, engine display, and recording-system fault isolation should be grouped as onboard monitoring and recording systems",
    category: "fault-isolation",
    riskLevel: "High",
    possibleIssue: "Monitoring, display, or recording equipment may require model-specific fault isolation.",
    component: "Monitoring / Display / Recording Systems",
    description:
      "Seeded from analyzed fault-isolation manuals covering VEMD variants, warning caution panel, ASU, control unit, AIRS-400 camera, wACS, and FDRS.",
    recommendedActions: [
      "Separate VEMD troubleshooting by engine / display variant rather than assuming a single common path.",
      "Keep warning, display, control, camera, and flight-data-recording systems in distinct troubleshooting families where equipment differs.",
      "Record installed monitoring / recording equipment on each aircraft before enabling executable rules.",
    ],
    manualReference:
      "AMM 31-71-00,1-1 wACS System | AMM 31-61-00,1-1 VEMD family including ARRIEL 2B, 2B1, and 2D variants | AMM 31-51-00,1-1 Warning Caution Panel | AMM 31-42-00,1-1 Control unit | AMM 31-41-00,1-1 ASU | AMM 31-33-01,1-1 AIRS-400 Camera | AMM 31-32-01,1-1 Flight Data Recording System",
    analysisNote:
      "OCR analysis shows this family spans several different chapter 31 systems with their own fault-isolation documents. The VEMD manuals are explicitly variant-specific, while warning panel, control unit, ASU, camera, and FDRS each sit in separate subsystem references, so executable rules should remain model-aware.",
  }),
  buildTitleRule({
    ruleCode: "AIRMS_RULE_026",
    title: "Fuel, hydraulic, chip-detection, and indicating-system fault isolation should be separated by system family",
    category: "fault-isolation",
    riskLevel: "High",
    possibleIssue: "Fuel or mechanical fault isolation may require system-family-specific troubleshooting.",
    component: "Fuel / Hydraulic / Mechanical Indication Systems",
    description:
      "Seeded from analyzed fault-isolation manuals covering electric chip detectors, hydraulic power system, flowmeter indicating, crashworthy fuel tank and fuel-system variants.",
    recommendedActions: [
      "Keep chip detection, hydraulic power, indicating flowmeter, and fuel system troubleshooting in separate system families.",
      "Preserve PRE MOD and POST MOD branches for fuel-system manuals where the documentation splits by modification state.",
      "Do not apply one fuel-system troubleshooting path across crashworthy tank and standard fuel-system variants without analyzed confirmation.",
    ],
    manualReference:
      "AMM 60-00-00,1-1A Electric chip detectors - General instructions - Mechanical assemblies | AMM 29-00-00,1-1 Hydraulic Power System - General | AMM 28-41-00,1-1 Flowmeter - Indicating | AMM 28-00-01,1-1 Fuel System / Crashworthy Fuel Tank | AMM 28-00-00,1-1 Fuel System family including PRE MOD 073264, POST MOD 073264, and generic variants",
    analysisNote:
      "OCR analysis confirms that these manuals belong to separate system families across chapters 60, 29, and 28. Fuel-system troubleshooting is further split into crashworthy-tank and PRE/POST MOD 073264 variants, so later executable logic should branch by installed system architecture and modification state.",
  }),
  buildTitleRule({
    ruleCode: "AIRMS_RULE_027",
    title: "Rotor brake inspection criteria should remain a dedicated rotor-system inspection family",
    category: "inspection-criteria",
    riskLevel: "High",
    possibleIssue: "Rotor brake condition may require dedicated inspection criteria and interval tracking.",
    component: "Rotor Brake",
    description:
      "Seeded from analyzed inspection-criteria manuals for the rotor brake assembly.",
    recommendedActions: [
      "Model rotor brake inspection criteria separately from generic rotor-system checks.",
      "Preserve the exact rotor-brake AMM reference when mapping work-card or inspection-task logic.",
      "Link rotor-brake criteria to the applicable maintenance interval before enabling automated triggers.",
    ],
    manualReference:
      "AMM 63-51-00,6-1 Rotor brake inspection criteria",
    analysisNote:
      "OCR analysis recovered a clean AMM 63-51-00 rotor-brake inspection-criteria family from the supplied PDFs. This content is specific enough to deserve its own rotor-brake inspection family rather than being folded into generic rotor checks.",
  }),
  buildTitleRule({
    ruleCode: "AIRMS_RULE_028",
    title: "NR or NF indicator and N rotor alarm troubleshooting should stay in rotor-speed indication fault isolation",
    category: "fault-isolation",
    riskLevel: "High",
    possibleIssue: "Rotor-speed indication fault may require dedicated fault isolation before release.",
    component: "NR / NF Indication",
    description:
      "Seeded from analyzed fault-isolation manuals for NR or NF indicator faults and N rotor alarm troubleshooting.",
    recommendedActions: [
      "Keep NR / NF indicator troubleshooting separate from broader avionics or warning-system fault isolation.",
      "Treat indicator faults and N rotor alarm faults as related but distinct rotor-speed troubleshooting entries.",
      "Preserve the recovered AMM sub-reference when mapping future executable troubleshooting steps.",
    ],
    manualReference:
      "AMM 63-41-00,1-1 NR / NF indicator fault isolation | AMM 63-41-00,1-2 N rotor alarm fault isolation",
    analysisNote:
      "OCR analysis places both supplied PDFs in AMM 63-41-00, which indicates a rotor-speed indication fault-isolation family rather than a generic electrical or caution-panel troubleshooting path.",
  }),
  buildTitleRule({
    ruleCode: "AIRMS_RULE_029",
    title: "Bi-directional suspension inspection criteria should branch by support, pin, stop, and crossbeam variant",
    category: "inspection-criteria",
    riskLevel: "High",
    possibleIssue: "Bi-directional suspension components may require part-specific inspection criteria.",
    component: "Bi-directional Suspension",
    description:
      "Seeded from analyzed inspection-criteria manuals for laminated stops, laminated suspension block pins and supports, and suspension crossbeam variants.",
    recommendedActions: [
      "Keep suspension supports, pins, laminated stops, and crossbeam criteria in the same family but as distinct component entries.",
      "Preserve crossbeam part-number distinctions such as 350A38-1018-XX and 350A38-1040-00 / -20.",
      "Map these inspections to installed suspension configuration before creating executable rules.",
    ],
    manualReference:
      "AMM 63-31-00,6-5 Laminated stops | AMM 63-31-00,6-4 Suspension crossbeam family | AMM 63-31-00,6-3 Laminated suspension block pins | AMM 63-31-00,6-2 Laminated suspension block supports",
    analysisNote:
      "OCR analysis recovered a coherent AMM 63-31-00 bi-directional-suspension family. The supplied manuals split by component type and crossbeam variant, so future rule automation should branch by installed suspension hardware rather than using one shared suspension rule.",
  }),
  buildTitleRule({
    ruleCode: "AIRMS_RULE_030",
    title: "MGB suspension bar and bolt inspection criteria should be treated as an airworthiness-sensitive family",
    category: "inspection-criteria",
    riskLevel: "High",
    possibleIssue: "MGB suspension bar or bolt condition may require detailed and visual inspection handling.",
    component: "MGB Suspension Bar",
    description:
      "Seeded from analyzed inspection-criteria manuals for the MGB bar and MGB suspension bar bolt, including visual and detailed criteria.",
    recommendedActions: [
      "Keep the base MGB bar criteria separate from bolt-specific visual and detailed inspection criteria.",
      "Track whether the criteria are airworthiness-inspection driven when linking them to task generation.",
      "Preserve the visual-versus-detailed distinction instead of collapsing all MGB bar checks into one rule.",
    ],
    manualReference:
      "AMM 63-32-00,6-1 MGB bar | AMM 63-32-00,6-2 Detailed inspection criteria for MGB suspension bar bolt | AMM 63-32-00,6-4 Visual inspection criteria for MGB suspension bar bolt",
    analysisNote:
      "OCR analysis recovered an AMM 63-32-00 family centered on the MGB suspension bar. One manual explicitly references airworthiness inspections, which supports keeping this family visible and distinct in rule prioritization.",
  }),
  buildTitleRule({
    ruleCode: "AIRMS_RULE_031",
    title: "Engine or MGB drive-line inspection criteria should be modeled as a broad but component-specific drivetrain family",
    category: "inspection-criteria",
    riskLevel: "High",
    possibleIssue: "Drive-line component condition may require configuration-specific inspection criteria across belts, bearings, couplings, splines, housings, and shafts.",
    component: "Engine / MGB Drive Line",
    description:
      "Seeded from analyzed inspection-criteria manuals for the AMM 63-11-00 engine or MGB drive-line family, including hydraulic pump drive belts and tension, drive bearings, splines, pulleys, couplings, flanges, housings, gimbal hardware, sealing sleeve, and drive shaft.",
    recommendedActions: [
      "Keep the AMM 63-11-00 drive-line family grouped for governance, but branch executable rules by exact component and modification state.",
      "Preserve PRE MOD and POST MOD splits such as 0770000, 079555, 079561, 079566, and 079568 where the manuals differentiate criteria.",
      "Treat visual, detailed, and generic inspection criteria as separate entries even when they target the same drive-line subsystem.",
      "Spot-check the one mislabeled flexible-coupling PDF before using it in executable automation because its OCR content maps to AMM 62-33-00 rather than AMM 63-11-00.",
    ],
    manualReference:
      "AMM 63-11-00,6-2 through 6-20 drive-line inspection-criteria family, including hydraulic pump drive belt, belt tension, drive bearing, splines, flexible couplings, drive flange, driven pulley, engine flange, gimbal ring and pin, coupling housings, sealing sleeve, and MGB drive shaft",
    analysisNote:
      "OCR analysis recovered a large AMM 63-11-00 inspection-criteria family spanning 31 supplied PDFs. The documentation repeatedly branches by component type and modification state, so future executable rules should remain component-specific instead of collapsing the whole drive line into one trigger.",
  }),
  buildTitleRule({
    ruleCode: "AIRMS_RULE_032",
    title: "Tail rotor blade inspection criteria should stay split by blade tab, edge tab, pitch horn, and chin-weight hardware",
    category: "inspection-criteria",
    riskLevel: "High",
    possibleIssue: "Tail rotor blade assembly may require part-specific inspection criteria by blade and hardware configuration.",
    component: "Tail Rotor Blades",
    description:
      "Seeded from analyzed inspection-criteria manuals for tail rotor blades with inserted-tab PRE / POST MOD variants, edge tab, pitch horn assembly, and chin-weight blanking hardware.",
    recommendedActions: [
      "Keep blade-body, edge-tab, pitch-horn, and chin-weight hardware criteria as separate entries within the same tail-rotor-blade family.",
      "Preserve PRE MOD and POST MOD 075595 / 075606 / 076602 / 076603 distinctions where the manuals branch by modification state.",
      "Use installed blade configuration before turning these manuals into executable inspection rules.",
    ],
    manualReference:
      "AMM 64-10-00,6-1 Tail rotor blades with inserted tab PRE / POST MOD 075595 | AMM 64-10-00,6-6 Edge tab | AMM 64-10-00,6-9 and 6-10 Pitch horn assembly variants | AMM 64-10-00,6-11 and 6-12 Chin-weight blanking hardware",
    analysisNote:
      "OCR analysis recovered a clear AMM 64-10-00 tail-rotor-blade inspection family. The manuals repeatedly separate blade, pitch-horn, and chin-weight hardware criteria, so future executable rules should remain component-specific and configuration-aware.",
  }),
  buildTitleRule({
    ruleCode: "AIRMS_RULE_033",
    title: "Tail drive-line inspection criteria should branch by shaft section, flexible coupling, sliding flange, and bearing-hanger configuration",
    category: "inspection-criteria",
    riskLevel: "High",
    possibleIssue: "Tail drive-line components may require detailed or visual inspection criteria by section and modification state.",
    component: "Tail Drive Line",
    description:
      "Seeded from analyzed inspection-criteria manuals for the AMM 65-11-00 tail drive-line family, including equipped front section, rear shaft section, flexible coupling, sliding flange, bearing hangers, coupling attachment, and inside-rear-section criteria.",
    recommendedActions: [
      "Separate visual and detailed criteria for shaft sections, couplings, flanges, and bearings instead of collapsing them into one tail-drive-line rule.",
      "Preserve PRE MOD and POST MOD branches for bearing-hanger variants where the manuals split by modification state.",
      "Map criteria to the exact installed tail-drive-line section before enabling executable automation.",
    ],
    manualReference:
      "AMM 65-11-00,6-1 through 6-16 and 6-29 Tail drive line inspection-criteria family",
    analysisNote:
      "OCR analysis recovered a broad AMM 65-11-00 tail-drive-line family spanning detailed and visual inspections. Because the manuals distinguish front section, rear section, flexible coupling, sliding flange, and bearing-hanger cases, later rules should branch by component rather than treat the tail drive line as one shared trigger.",
  }),
  buildTitleRule({
    ruleCode: "AIRMS_RULE_034",
    title: "Tail gear box inspection criteria should remain a dense component-by-component family",
    category: "inspection-criteria",
    riskLevel: "High",
    possibleIssue: "Tail gear box assembly may require detailed criteria by lever, bearing, housing, shaft, rod, and flange configuration.",
    component: "Tail Gear Box",
    description:
      "Seeded from analyzed inspection-criteria manuals for the AMM 65-21-00 tail gear box family, including control levers, bushes, control-plate bearings, elastomer pitch change rods, pitch change links, spherical bearing, rotor shaft, TGB housing, flange input, and related hardware.",
    recommendedActions: [
      "Keep control-lever, control-plate-bearing, rotor-shaft, housing, flange, and pitch-change hardware criteria as separate TGB entries.",
      "Preserve PRE MOD and POST MOD branching such as 075606, 076544, 076550, 076551, and 076602 where the manuals split criteria by configuration.",
      "Highlight TGB housing and other airworthiness-linked items in later prioritization because some manuals reference airworthiness-inspection usage.",
    ],
    manualReference:
      "AMM 65-21-00,6-4 through 6-27 Tail gear box inspection-criteria family",
    analysisNote:
      "OCR analysis recovered a large AMM 65-21-00 family with many tightly scoped TGB component documents. The manuals are too specific to flatten into one generic tail-gear-box rule, so future executable logic should branch by exact part or subassembly.",
  }),
  buildTitleRule({
    ruleCode: "AIRMS_RULE_035",
    title: "Dual-hydraulic rotor actuator criteria should stay separate from general hydraulic-system checks",
    category: "inspection-criteria",
    riskLevel: "High",
    possibleIssue: "Dual-hydraulic rotor actuator condition may require dedicated servocontrol inspection criteria.",
    component: "Servocontrols / Rotor Actuators",
    description:
      "Seeded from analyzed inspection-criteria material for servocontrols and rotor actuators in the dual-hydraulic configuration.",
    recommendedActions: [
      "Keep dual-hydraulic rotor actuator criteria separate from generic hydraulic maintenance rules.",
      "Branch later automation by hydraulic architecture so dual-hydraulic criteria are not applied to other configurations by mistake.",
    ],
    manualReference:
      "AMM 67-31-00,6-1 Inspection Criteria - Servocontrols - Rotor actuators (Dual Hydraulic)",
    analysisNote:
      "OCR analysis places this manual in AMM 67-31-00 as a specific servocontrol / rotor-actuator inspection reference. That supports a dedicated rotor-actuator family rather than rolling it into broad hydraulic-system logic.",
  }),
  buildTitleRule({
    ruleCode: "AIRMS_RULE_036",
    title: "Load compensator leak acceptance and fault isolation should be paired as a hydraulic control family",
    category: "hydraulic",
    riskLevel: "High",
    possibleIssue: "Load compensator leakage or malfunction may require both acceptance-criteria review and dedicated fault isolation.",
    component: "Load Compensator",
    description:
      "Seeded from analyzed load-compensator manuals covering hydraulic-fluid leak acceptance criteria and load-compensator fault isolation.",
    recommendedActions: [
      "Treat leak acceptance and fault isolation as linked but distinct load-compensator workflows.",
      "Do not merge these manuals into generic hydraulic leak handling because they target the load compensator specifically.",
      "Use the acceptance-criteria document to guide threshold review before closing related discrepancies.",
    ],
    manualReference:
      "AMM 67-34-00,6-3 Acceptance criteria concerning hydraulic fluid leaks | AMM 67-34-00,1-1 Fault isolation - Load compensator",
    analysisNote:
      "OCR analysis recovered both acceptance-criteria and fault-isolation material under AMM 67-34-00. That pairing supports a dedicated load-compensator family that can later combine leak evaluation and troubleshooting logic.",
  }),
  buildTitleRule({
    ruleCode: "AIRMS_RULE_037",
    title: "ARRIEL 2B1 VEMD fail-code troubleshooting should remain code-specific within the engine fault-isolation family",
    category: "fault-isolation",
    riskLevel: "High",
    possibleIssue: "ARRIEL engine fault codes may require code-specific troubleshooting rather than generic engine diagnosis.",
    component: "ARRIEL Engine / VEMD Fault Codes",
    description:
      "Seeded from analyzed fault-isolation manuals for ARRIEL 2B1 VEMD fail and malfunction codes, including SURV FADEC, SURV REC, and related engine-code cases.",
    recommendedActions: [
      "Keep fail-code troubleshooting entries distinct by exact VEMD code instead of collapsing them into one engine-fault rule.",
      "Preserve references to associated subsystems such as FADEC, fuel flow, or NF / NGM indications when building future executable logic.",
      "Link any code-based automation to the installed engine and display variant before enabling triggers.",
    ],
    manualReference:
      "AMM 71-11-00,1-1 through 1-9 ARRIEL 2B1 VEMD fail-code and malfunction-code fault isolation family",
    analysisNote:
      "OCR analysis recovered nine AMM 71-11-00 engine fault-isolation documents tied to specific ARRIEL 2B1 VEMD codes. The manuals are explicitly code-specific, so later rules should branch by exact reported code rather than using a single generic ARRIEL troubleshooting path.",
  }),
  buildTitleRule({
    ruleCode: "AIRMS_RULE_038",
    title: "Twist-grip fuel-flow-control diagnosis should remain a dedicated engine-controls troubleshooting path",
    category: "fault-isolation",
    riskLevel: "High",
    possibleIssue: "Twist-grip fuel-flow-control fault may require dedicated engine-controls diagnosis.",
    component: "Engine Controls",
    description:
      "Seeded from analyzed fault-diagnosis manuals for twist-grip fuel flow control in the engine-controls family.",
    recommendedActions: [
      "Keep twist-grip fuel-flow-control diagnosis separate from generic fuel-system or engine-performance troubleshooting.",
      "Preserve its AMM 76 engine-controls context when mapping future automated troubleshooting prompts.",
    ],
    manualReference:
      "AMM 76-00-00,1-1 Fault diagnosis - Twist grip Fuel Flow Control - Engine Controls",
    analysisNote:
      "OCR analysis recovered the supplied manuals as AMM 76-00-00 engine-controls fault-diagnosis references. That supports a dedicated engine-controls troubleshooting family rather than merging twist-grip issues into broad engine fault handling.",
  }),
  buildTitleRule({
    ruleCode: "AIRMS_RULE_039",
    title: "Engine oil pressure or temperature indication should stay in a dedicated engine-oil fault-isolation path",
    category: "fault-isolation",
    riskLevel: "High",
    possibleIssue: "Engine oil pressure or temperature indication fault may require dedicated oil-system troubleshooting.",
    component: "Engine Oil Indication",
    description:
      "Seeded from analyzed fault-isolation material for engine oil pressure and temperature indications.",
    recommendedActions: [
      "Keep engine oil pressure / temperature indication troubleshooting separate from generic caution-panel or display-system rules.",
      "Route these cases into an oil-system-aware fault-isolation path before routine closure or release.",
    ],
    manualReference:
      "AMM 79-30-00,1-1 Fault Isolation - Engine Oil Pressure / Temperature - Indicating System",
    analysisNote:
      "OCR analysis places this manual in AMM 79-30-00 as a dedicated engine-oil-indication fault-isolation reference. That supports a specific oil-indication troubleshooting family rather than folding it into broader display-system handling.",
  }),
  buildExecutableRule({
    ruleCode: "AIRMS_RULE_040",
    title: "Load compensator findings should trigger load-compensator hydraulic review",
    category: "hydraulic",
    riskLevel: "High",
    possibleIssue: "Load compensator issue may require hydraulic leak review or focused fault isolation.",
    component: "Load Compensator",
    description:
      "Executable rule that fires when current records mention the load compensator in active maintenance context.",
    conditions: [
      { fact: "signals.loadCompensatorCount", operator: ">", value: 0 },
      { fact: "maintenance.hydraulicOpenCount", operator: ">", value: 0 },
    ],
    recommendedActions: [
      "Review the open discrepancy or task for load-compensator leak or malfunction details.",
      "Apply AMM 67-34-00 acceptance-criteria and fault-isolation guidance before closure.",
      "Confirm whether the case is a leak-acceptance decision, a troubleshooting case, or both.",
    ],
    manualReference:
      "AMM 67-34-00,6-3 Acceptance criteria concerning hydraulic fluid leaks | AMM 67-34-00,1-1 Fault isolation - Load compensator",
    explanationTemplate:
      "The current aircraft facts include active hydraulic maintenance records with load-compensator-specific language, so the system is routing the case into the dedicated AMM 67-34-00 load-compensator family.",
  }),
  buildExecutableRule({
    ruleCode: "AIRMS_RULE_041",
    title: "NR or NF indication findings should route to rotor-speed indication fault isolation",
    category: "fault-isolation",
    riskLevel: "High",
    possibleIssue: "NR / NF indication fault may require dedicated rotor-speed fault isolation.",
    component: "NR / NF Indication",
    description:
      "Executable rule that fires when current records mention NR / NF indicator or N rotor alarm signals.",
    conditions: [
      { fact: "signals.nrnfIndicatorCount", operator: ">", value: 0 },
    ],
    recommendedActions: [
      "Review the matching discrepancy, task, or flight remark for NR / NF or N rotor alarm details.",
      "Route troubleshooting to the AMM 63-41-00 rotor-speed indication procedures.",
      "Verify whether the reported symptom is indicator-related, alarm-related, or both before release.",
    ],
    manualReference:
      "AMM 63-41-00,1-1 NR / NF indicator fault isolation | AMM 63-41-00,1-2 N rotor alarm fault isolation",
    explanationTemplate:
      "A current record mentions NR / NF indication or N rotor alarm terminology, so the inference engine is triggering the dedicated AMM 63-41-00 rotor-speed indication troubleshooting path.",
  }),
  buildExecutableRule({
    ruleCode: "AIRMS_RULE_042",
    title: "Rotor brake findings should route to rotor-brake inspection handling",
    category: "inspection-criteria",
    riskLevel: "High",
    possibleIssue: "Rotor brake issue may require dedicated rotor-brake inspection criteria review.",
    component: "Rotor Brake",
    description:
      "Executable rule that fires when current records mention rotor brake or main rotor brake terminology.",
    conditions: [
      { fact: "signals.rotorBrakeCount", operator: ">", value: 0 },
    ],
    recommendedActions: [
      "Review the underlying discrepancy or task for the rotor-brake symptom or work scope.",
      "Use the AMM 63-51-00 rotor-brake inspection criteria before clearing the item.",
      "Confirm whether the record refers to sudden brake application, wear, or condition-based inspection.",
    ],
    manualReference:
      "AMM 63-51-00,6-1 Rotor brake inspection criteria | AMM 05-50-00,6-11 Procedure After Sudden Application of the Main Rotor Brake - Unscheduled Inspections",
    explanationTemplate:
      "Rotor-brake-specific language was detected in current aircraft records, so the system is routing the case to the rotor-brake inspection family instead of leaving it as a generic rotor discrepancy.",
  }),
  buildExecutableRule({
    ruleCode: "AIRMS_RULE_043",
    title: "ARRIEL 2B1 VEMD fail-code findings should trigger code-specific engine troubleshooting",
    category: "fault-isolation",
    riskLevel: "Critical",
    possibleIssue: "ARRIEL engine fail or malfunction code may require code-specific troubleshooting.",
    component: "ARRIEL Engine / VEMD Fault Codes",
    description:
      "Executable rule that fires when current records mention ARRIEL / FADEC / VEMD fail-code patterns recovered from the manuals.",
    conditions: [
      { fact: "signals.arrielFadecCodeCount", operator: ">", value: 0 },
    ],
    recommendedActions: [
      "Identify the specific ARRIEL / FADEC / VEMD code mentioned in the record.",
      "Route troubleshooting to the matching AMM 71-11-00 fail-code or malfunction-code procedure.",
      "Treat the case as code-specific engine troubleshooting rather than generic engine diagnosis.",
    ],
    manualReference:
      "AMM 71-11-00,1-1 through 1-9 ARRIEL 2B1 VEMD fail-code and malfunction-code fault isolation family",
    explanationTemplate:
      "The current records include ARRIEL / FADEC / VEMD fail-code signals, so the engine is triggering the AMM 71-11-00 code-specific troubleshooting family.",
  }),
  buildExecutableRule({
    ruleCode: "AIRMS_RULE_044",
    title: "Twist-grip fuel-flow-control findings should trigger engine-controls diagnosis",
    category: "fault-isolation",
    riskLevel: "High",
    possibleIssue: "Twist-grip fuel-flow-control issue may require dedicated engine-controls diagnosis.",
    component: "Engine Controls",
    description:
      "Executable rule that fires when current records mention twist grip or fuel flow control terminology.",
    conditions: [
      { fact: "signals.twistGripFuelControlCount", operator: ">", value: 0 },
    ],
    recommendedActions: [
      "Review the source record for twist-grip or fuel-flow-control symptoms.",
      "Use the AMM 76-00-00 engine-controls fault-diagnosis path instead of generic fuel-system handling.",
      "Check whether the finding is a control-input issue, a fuel-flow-control issue, or both.",
    ],
    manualReference:
      "AMM 76-00-00,1-1 Fault diagnosis - Twist grip Fuel Flow Control - Engine Controls",
    explanationTemplate:
      "Twist-grip or fuel-flow-control language was found in the current aircraft records, so the case is being routed into the AMM 76 engine-controls diagnostic family.",
  }),
  buildExecutableRule({
    ruleCode: "AIRMS_RULE_045",
    title: "Engine oil pressure or temperature findings should trigger oil-indication troubleshooting",
    category: "fault-isolation",
    riskLevel: "High",
    possibleIssue: "Engine oil pressure or temperature indication fault may require dedicated oil-system troubleshooting.",
    component: "Engine Oil Indication",
    description:
      "Executable rule that fires when current records mention engine oil pressure or temperature indications.",
    conditions: [
      { fact: "signals.engineOilIndicationCount", operator: ">", value: 0 },
    ],
    recommendedActions: [
      "Review the record for engine oil pressure or temperature symptoms.",
      "Use the AMM 79-30-00 oil-indicating-system fault-isolation path.",
      "Confirm whether the problem is a sensing, indication, or actual oil-system issue before closure.",
    ],
    manualReference:
      "AMM 79-30-00,1-1 Fault Isolation - Engine Oil Pressure / Temperature - Indicating System",
    explanationTemplate:
      "Engine-oil-indication terminology is present in the current aircraft records, so the inference engine is routing the case into the dedicated AMM 79-30-00 oil-indication troubleshooting family.",
  }),
  buildExecutableRule({
    ruleCode: "AIRMS_RULE_046",
    title: "Tail drive-line findings should trigger tail drive-line inspection review",
    category: "inspection-criteria",
    riskLevel: "High",
    possibleIssue: "Tail drive-line issue may require section-specific inspection review.",
    component: "Tail Drive Line",
    description:
      "Executable rule that fires when current records mention tail-drive-line sections, flanges, couplings, or bearing hangers.",
    conditions: [
      { fact: "signals.tailDriveLineCount", operator: ">", value: 0 },
    ],
    recommendedActions: [
      "Review whether the finding concerns the equipped front section, rear shaft section, sliding flange, flexible coupling, or bearing hangers.",
      "Use the AMM 65-11-00 component-specific tail-drive-line criteria instead of a generic transmission response.",
      "Preserve any PRE MOD or POST MOD bearing-hanger applicability when routing follow-up work.",
    ],
    manualReference:
      "AMM 65-11-00 Tail drive line inspection-criteria family",
    explanationTemplate:
      "Tail-drive-line-specific terminology was detected in the current records, so the system is routing the case into the AMM 65-11-00 tail-drive-line inspection family.",
  }),
  buildExecutableRule({
    ruleCode: "AIRMS_RULE_047",
    title: "Tail gear box findings should trigger tail gear box component review",
    category: "inspection-criteria",
    riskLevel: "High",
    possibleIssue: "Tail gear box issue may require component-specific TGB inspection review.",
    component: "Tail Gear Box",
    description:
      "Executable rule that fires when current records mention TGB-specific components such as control levers, rotor shaft, housing, or pitch-change hardware.",
    conditions: [
      { fact: "signals.tailGearBoxCount", operator: ">", value: 0 },
    ],
    recommendedActions: [
      "Review the exact TGB component named in the discrepancy or task before choosing the inspection path.",
      "Use the AMM 65-21-00 tail-gear-box family to route the item to the correct lever, bearing, rod, shaft, housing, or flange criteria.",
      "Preserve PRE MOD and POST MOD applicability where the TGB manuals split by configuration.",
    ],
    manualReference:
      "AMM 65-21-00 Tail gear box inspection-criteria family",
    explanationTemplate:
      "Tail-gear-box-specific terminology was detected in the current aircraft records, so the inference engine is routing the case to the AMM 65-21-00 TGB inspection family.",
  }),
  buildExecutableRule({
    ruleCode: "AIRMS_RULE_048",
    title: "ARRIEL VEMD FAIL CODE 122 should route to the exact AMM fail-code procedure",
    category: "fault-isolation",
    riskLevel: "Critical",
    possibleIssue: "ARRIEL VEMD FAIL CODE 122 may require exact FADEC 4 troubleshooting.",
    component: "ARRIEL Engine / VEMD FAIL CODE 122",
    description:
      "Executable rule for explicit detection of ARRIEL 2B1 VEMD FAIL CODE 122 / SURV FADEC 4.",
    conditions: [
      { fact: "signals.arrielFadecCodeCount", operator: ">", value: 0 },
      { fact: "signals.arrielFadecCode122Count", operator: ">", value: 0 },
    ],
    recommendedActions: [
      "Confirm the reported engine indication is FAIL CODE 122 / SURV FADEC 4.",
      "Use the exact AMM 71-11-00,1-5 fail-code procedure instead of the generic ARRIEL fault family.",
      "Check related VEMD, FADEC, and engine-control references called out by that code-specific manual.",
    ],
    manualReference:
      "AMM 71-11-00,1-5 Fault Isolation - ARRIEL 2B1 VEMD FAIL CODE 122 SURV FADEC 4 - ARRIEL Engine",
    explanationTemplate:
      "The current record set includes ARRIEL FAIL CODE 122 / SURV FADEC 4 language, so the inference engine is selecting the exact AMM 71-11-00,1-5 troubleshooting path.",
  }),
  buildExecutableRule({
    ruleCode: "AIRMS_RULE_049",
    title: "ARRIEL VEMD FAIL CODE 123 should route to the exact AMM fail-code procedure",
    category: "fault-isolation",
    riskLevel: "Critical",
    possibleIssue: "ARRIEL VEMD FAIL CODE 123 may require exact FADEC 5 troubleshooting.",
    component: "ARRIEL Engine / VEMD FAIL CODE 123",
    description:
      "Executable rule for explicit detection of ARRIEL 2B1 VEMD FAIL CODE 123 / SURV FADEC 5.",
    conditions: [
      { fact: "signals.arrielFadecCodeCount", operator: ">", value: 0 },
      { fact: "signals.arrielFadecCode123Count", operator: ">", value: 0 },
    ],
    recommendedActions: [
      "Confirm the reported engine indication is FAIL CODE 123 / SURV FADEC 5.",
      "Use the exact AMM 71-11-00,1-6 code-specific procedure.",
      "Keep this troubleshooting path separate from generic engine diagnosis.",
    ],
    manualReference:
      "AMM 71-11-00,1-6 Fault Isolation - ARRIEL 2B1 VEMD FAIL CODE 123 SURV FADEC 5 - ARRIEL Engine",
    explanationTemplate:
      "The current record set includes ARRIEL FAIL CODE 123 / SURV FADEC 5 language, so the inference engine is selecting the exact AMM 71-11-00,1-6 troubleshooting path.",
  }),
  buildExecutableRule({
    ruleCode: "AIRMS_RULE_050",
    title: "ARRIEL VEMD FAIL CODE 125 should route to the exact AMM fail-code procedure",
    category: "fault-isolation",
    riskLevel: "Critical",
    possibleIssue: "ARRIEL VEMD FAIL CODE 125 may require exact FADEC 7 troubleshooting.",
    component: "ARRIEL Engine / VEMD FAIL CODE 125",
    description:
      "Executable rule for explicit detection of ARRIEL 2B1 VEMD FAIL CODE 125 / SURV FADEC 7.",
    conditions: [
      { fact: "signals.arrielFadecCodeCount", operator: ">", value: 0 },
      { fact: "signals.arrielFadecCode125Count", operator: ">", value: 0 },
    ],
    recommendedActions: [
      "Confirm the reported engine indication is FAIL CODE 125 / SURV FADEC 7.",
      "Use the exact AMM 71-11-00,1-7 code-specific procedure.",
      "Check related engine-control references called out for this specific fail code.",
    ],
    manualReference:
      "AMM 71-11-00,1-7 Fault Isolation - ARRIEL 2B1 VEMD FAIL CODE 125 SURV FADEC 7 - ARRIEL Engine",
    explanationTemplate:
      "The current record set includes ARRIEL FAIL CODE 125 / SURV FADEC 7 language, so the inference engine is selecting the exact AMM 71-11-00,1-7 troubleshooting path.",
  }),
  buildExecutableRule({
    ruleCode: "AIRMS_RULE_051",
    title: "ARRIEL VEMD FAIL CODE 135 should route to the exact AMM fail-code procedure",
    category: "fault-isolation",
    riskLevel: "Critical",
    possibleIssue: "ARRIEL VEMD FAIL CODE 135 may require exact FADEC 17 troubleshooting.",
    component: "ARRIEL Engine / VEMD FAIL CODE 135",
    description:
      "Executable rule for explicit detection of ARRIEL 2B1 VEMD FAIL CODE 135 / SURV FADEC 17.",
    conditions: [
      { fact: "signals.arrielFadecCodeCount", operator: ">", value: 0 },
      { fact: "signals.arrielFadecCode135Count", operator: ">", value: 0 },
    ],
    recommendedActions: [
      "Confirm the reported engine indication is FAIL CODE 135 / SURV FADEC 17.",
      "Use the exact AMM 71-11-00,1-8 code-specific procedure.",
      "Escalate as engine-code troubleshooting rather than routine discrepancy handling.",
    ],
    manualReference:
      "AMM 71-11-00,1-8 Fault Isolation - ARRIEL 2B1 VEMD FAIL CODE 135 SURV FADEC 17 - ARRIEL Engine",
    explanationTemplate:
      "The current record set includes ARRIEL FAIL CODE 135 / SURV FADEC 17 language, so the inference engine is selecting the exact AMM 71-11-00,1-8 troubleshooting path.",
  }),
  buildExecutableRule({
    ruleCode: "AIRMS_RULE_052",
    title: "ARRIEL VEMD FAIL CODE 143 should route to the exact AMM fail-code procedure",
    category: "fault-isolation",
    riskLevel: "Critical",
    possibleIssue: "ARRIEL VEMD FAIL CODE 143 may require exact FADEC 25 troubleshooting.",
    component: "ARRIEL Engine / VEMD FAIL CODE 143",
    description:
      "Executable rule for explicit detection of ARRIEL 2B1 VEMD FAIL CODE 143 / SURV FADEC 25.",
    conditions: [
      { fact: "signals.arrielFadecCodeCount", operator: ">", value: 0 },
      { fact: "signals.arrielFadecCode143Count", operator: ">", value: 0 },
    ],
    recommendedActions: [
      "Confirm the reported engine indication is FAIL CODE 143 / SURV FADEC 25.",
      "Use the exact AMM 71-11-00,1-9 code-specific procedure.",
      "Treat this as a code-driven engine troubleshooting event before release.",
    ],
    manualReference:
      "AMM 71-11-00,1-9 Fault Isolation - ARRIEL 2B1 VEMD FAIL CODE 143 SURV FADEC 25 - ARRIEL Engine",
    explanationTemplate:
      "The current record set includes ARRIEL FAIL CODE 143 / SURV FADEC 25 language, so the inference engine is selecting the exact AMM 71-11-00,1-9 troubleshooting path.",
  }),
  buildExecutableRule({
    ruleCode: "AIRMS_RULE_053",
    title: "Tail drive-line sliding flange findings should route to the exact sliding-flange criteria",
    category: "inspection-criteria",
    riskLevel: "High",
    possibleIssue: "Sliding flange issue may require exact tail-drive-line sliding-flange inspection criteria.",
    component: "Tail Drive Line / Sliding Flange",
    description:
      "Executable rule for explicit sliding-flange findings within the tail drive line family.",
    conditions: [
      { fact: "signals.tailDriveLineCount", operator: ">", value: 0 },
      { fact: "signals.tailDriveLineSlidingFlangeCount", operator: ">", value: 0 },
    ],
    recommendedActions: [
      "Review the source record to confirm the finding is on the sliding flange.",
      "Route the item to the AMM 65-11-00 sliding-flange criteria instead of the generic tail-drive-line family.",
      "Use the visual or detailed path as applicable to the record context.",
    ],
    manualReference:
      "AMM 65-11-00,6-6 Inspection Criteria - Sliding Flange | AMM 65-11-00,6-16 Visual Inspection Criteria - Sliding Flange",
    explanationTemplate:
      "Sliding-flange-specific terminology was detected in current records, so the inference engine is selecting the AMM 65-11-00 sliding-flange inspection path rather than a broad tail-drive-line review.",
  }),
  buildExecutableRule({
    ruleCode: "AIRMS_RULE_054",
    title: "Tail drive-line flexible-coupling findings should route to the exact coupling criteria",
    category: "inspection-criteria",
    riskLevel: "High",
    possibleIssue: "Tail drive-line flexible coupling issue may require exact coupling inspection criteria.",
    component: "Tail Drive Line / Flexible Coupling",
    description:
      "Executable rule for explicit flexible-coupling findings within the tail drive line family.",
    conditions: [
      { fact: "signals.tailDriveLineCount", operator: ">", value: 0 },
      { fact: "signals.tailDriveLineFlexibleCouplingCount", operator: ">", value: 0 },
    ],
    recommendedActions: [
      "Confirm the finding concerns the tail-drive-line flexible coupling or its attachment.",
      "Route the item to the AMM 65-11-00 flexible-coupling inspection criteria.",
      "Separate coupling findings from shaft-section or bearing-hanger findings during follow-up.",
    ],
    manualReference:
      "AMM 65-11-00,6-4 Detailed Inspection Criteria - Flexible Coupling | AMM 65-11-00,6-7 Flexible Coupling Attachment | AMM 65-11-00,6-14 Visual Inspection Criteria - Flexible Coupling",
    explanationTemplate:
      "Flexible-coupling-specific terminology was detected in current records, so the inference engine is selecting the AMM 65-11-00 flexible-coupling inspection path instead of a generic tail-drive-line review.",
  }),
  buildExecutableRule({
    ruleCode: "AIRMS_RULE_055",
    title: "Tail gear box housing findings should route to the exact TGB housing criteria",
    category: "inspection-criteria",
    riskLevel: "High",
    possibleIssue: "TGB housing issue may require exact tail gear box housing inspection criteria.",
    component: "Tail Gear Box / Housing",
    description:
      "Executable rule for explicit TGB housing findings within the tail gear box family.",
    conditions: [
      { fact: "signals.tailGearBoxCount", operator: ">", value: 0 },
      { fact: "signals.tailGearBoxHousingCount", operator: ">", value: 0 },
    ],
    recommendedActions: [
      "Confirm the finding concerns the TGB housing specifically.",
      "Use the AMM 65-21-00,6-13 TGB housing inspection criteria rather than the general TGB family.",
      "Review any airworthiness-linked context referenced by the underlying task or discrepancy.",
    ],
    manualReference:
      "AMM 65-21-00,6-13 Inspection Criteria - TGB housing - Tail Gear Box",
    explanationTemplate:
      "TGB-housing-specific terminology was detected in current records, so the inference engine is selecting the exact AMM 65-21-00,6-13 housing inspection path.",
  }),
  buildExecutableRule({
    ruleCode: "AIRMS_RULE_056",
    title: "Tail gear box rotor-shaft findings should route to the exact rotor-shaft criteria",
    category: "inspection-criteria",
    riskLevel: "High",
    possibleIssue: "TGB rotor shaft issue may require exact tail gear box rotor-shaft inspection criteria.",
    component: "Tail Gear Box / Rotor Shaft",
    description:
      "Executable rule for explicit rotor-shaft findings within the tail gear box family.",
    conditions: [
      { fact: "signals.tailGearBoxCount", operator: ">", value: 0 },
      { fact: "signals.tailGearBoxRotorShaftCount", operator: ">", value: 0 },
    ],
    recommendedActions: [
      "Confirm the finding concerns the TGB rotor shaft.",
      "Route the item to AMM 65-21-00,6-19 Rotor Shaft.",
      "Keep rotor-shaft findings separate from housing, lever, or bearing findings during follow-up.",
    ],
    manualReference:
      "AMM 65-21-00,6-19 Inspection Criteria - Rotor Shaft - Tail Gear Box",
    explanationTemplate:
      "Rotor-shaft-specific terminology was detected in current records, so the inference engine is selecting the exact AMM 65-21-00,6-19 rotor-shaft inspection path.",
  }),
  buildExecutableRule({
    ruleCode: "AIRMS_RULE_057",
    title: "ARRIEL VEMD FAIL CODE 44 should route to the exact AMM fail-code procedure",
    category: "fault-isolation",
    riskLevel: "Critical",
    possibleIssue: "ARRIEL VEMD FAIL CODE 44 may require exact NF recording troubleshooting.",
    component: "ARRIEL Engine / VEMD FAIL CODE 44",
    description:
      "Executable rule for explicit detection of ARRIEL 2B1 VEMD FAIL CODE 44 / SURV REC NF A.",
    conditions: [
      { fact: "signals.arrielFadecCodeCount", operator: ">", value: 0 },
      { fact: "signals.arrielFadecCode44Count", operator: ">", value: 0 },
    ],
    recommendedActions: [
      "Confirm the reported engine indication is FAIL CODE 44 / SURV REC NF A.",
      "Use the exact AMM 71-11-00,1-1 fail-code procedure.",
      "Keep this case on the code-specific ARRIEL troubleshooting path instead of a generic engine review.",
    ],
    manualReference:
      "AMM 71-11-00,1-1 Fault Isolation - ARRIEL 2B1 VEMD FAIL CODE 44 SURV REC NF A - ARRIEL Engine",
    explanationTemplate:
      "The current record set includes ARRIEL FAIL CODE 44 / SURV REC NF A language, so the inference engine is selecting the exact AMM 71-11-00,1-1 troubleshooting path.",
  }),
  buildExecutableRule({
    ruleCode: "AIRMS_RULE_058",
    title: "ARRIEL VEMD FAIL CODE 47 or 71 should route to the exact fuel-flow-related AMM procedure",
    category: "fault-isolation",
    riskLevel: "Critical",
    possibleIssue: "ARRIEL VEMD FAIL CODE 47 or 71 may require exact fuel-flow recording troubleshooting.",
    component: "ARRIEL Engine / VEMD FAIL CODE 47 or 71",
    description:
      "Executable rule for explicit detection of ARRIEL 2B1 VEMD FAIL CODE 47 / SURV REC FF A or FAIL CODE 71 / SURV DOM FF R.",
    conditions: [
      { fact: "signals.arrielFadecCodeCount", operator: ">", value: 0 },
      { fact: "signals.arrielFadecCode47Count", operator: ">", value: 0 },
    ],
    recommendedActions: [
      "Confirm the reported indication is FAIL CODE 47 / SURV REC FF A or the paired FAIL CODE 71 / SURV DOM FF R case.",
      "Use the exact AMM 71-11-00,1-2 code-specific procedure.",
      "Review associated fuel-flow and engine-monitoring references for this paired-code family.",
    ],
    manualReference:
      "AMM 71-11-00,1-2 Fault Isolation - ARRIEL 2B1 VEMD FAIL CODE 47 SURV REC FF A and FAIL CODE 71 SURV DOM FF R - ARRIEL Engine",
    explanationTemplate:
      "The current record set includes ARRIEL FAIL CODE 47 or paired fuel-flow code language, so the inference engine is selecting the exact AMM 71-11-00,1-2 troubleshooting path.",
  }),
  buildExecutableRule({
    ruleCode: "AIRMS_RULE_059",
    title: "ARRIEL VEMD FAIL CODE 48 or 49 should route to the exact NGM-related AMM procedure",
    category: "fault-isolation",
    riskLevel: "Critical",
    possibleIssue: "ARRIEL VEMD FAIL CODE 48 or 49 may require exact NGM recording troubleshooting.",
    component: "ARRIEL Engine / VEMD FAIL CODE 48 or 49",
    description:
      "Executable rule for explicit detection of ARRIEL 2B1 VEMD FAIL CODE 48 / SURV REC NGMD A and FAIL CODE 49 / SURV REC NGMC A.",
    conditions: [
      { fact: "signals.arrielFadecCodeCount", operator: ">", value: 0 },
      { fact: "signals.arrielFadecCode48Count", operator: ">", value: 0 },
    ],
    recommendedActions: [
      "Confirm the reported indication is FAIL CODE 48 / SURV REC NGMD A or its paired FAIL CODE 49 case.",
      "Use the exact AMM 71-11-00,1-3 code-specific procedure.",
      "Keep NGM-related code handling separate from broader ARRIEL engine troubleshooting.",
    ],
    manualReference:
      "AMM 71-11-00,1-3 Fault Isolation - ARRIEL 2B1 VEMD FAIL CODE 48 SURV REC NGMD A and FAIL CODE 49 SURV REC NGMC A - ARRIEL Engine",
    explanationTemplate:
      "The current record set includes ARRIEL FAIL CODE 48 or paired NGM-code language, so the inference engine is selecting the exact AMM 71-11-00,1-3 troubleshooting path.",
  }),
  buildExecutableRule({
    ruleCode: "AIRMS_RULE_060",
    title: "ARRIEL VEMD MALFUNCTION CODE 121 should route to the exact AMM malfunction-code procedure",
    category: "fault-isolation",
    riskLevel: "Critical",
    possibleIssue: "ARRIEL VEMD MALFUNCTION CODE 121 may require exact FADEC 2 troubleshooting.",
    component: "ARRIEL Engine / VEMD MALFUNCTION CODE 121",
    description:
      "Executable rule for explicit detection of ARRIEL 2B1 VEMD MALFUNCTION CODE 121 / SURV FADEC 2.",
    conditions: [
      { fact: "signals.arrielFadecCodeCount", operator: ">", value: 0 },
      { fact: "signals.arrielFadecCode121Count", operator: ">", value: 0 },
    ],
    recommendedActions: [
      "Confirm the reported engine indication is MALFUNCTION CODE 121 / SURV FADEC 2.",
      "Use the exact AMM 71-11-00,1-4 malfunction-code procedure.",
      "Treat this as a code-specific ARRIEL troubleshooting case rather than a generic engine discrepancy.",
    ],
    manualReference:
      "AMM 71-11-00,1-4 Fault isolation - ARRIEL 2B1 VEMD MALFUNCTION CODE 121 SURV FADEC 2 - ARRIEL Engine",
    explanationTemplate:
      "The current record set includes ARRIEL MALFUNCTION CODE 121 / SURV FADEC 2 language, so the inference engine is selecting the exact AMM 71-11-00,1-4 troubleshooting path.",
  }),
  buildExecutableRule({
    ruleCode: "AIRMS_RULE_061",
    title: "Tail gear box control-lever findings should route to the exact control-lever criteria",
    category: "inspection-criteria",
    riskLevel: "High",
    possibleIssue: "TGB control lever issue may require exact control-lever inspection criteria.",
    component: "Tail Gear Box / Control Lever",
    description:
      "Executable rule for explicit control-lever findings within the tail gear box family.",
    conditions: [
      { fact: "signals.tailGearBoxCount", operator: ">", value: 0 },
      { fact: "signals.tailGearBoxControlLeverCount", operator: ">", value: 0 },
    ],
    recommendedActions: [
      "Confirm the finding concerns the TGB control lever, with-removal, without-removal, or associated bushes / yoke-lug context.",
      "Route the item to the exact AMM 65-21-00 control-lever family rather than the general TGB family.",
      "Separate lever findings from housing, shaft, or bearing findings before follow-up.",
    ],
    manualReference:
      "AMM 65-21-00,6-27 Control lever with removal | AMM 65-21-00,6-12 Control Lever without removal | AMM 65-21-00,6-24 Control lever bushes and yoke lug",
    explanationTemplate:
      "Control-lever-specific terminology was detected in current records, so the inference engine is selecting the exact AMM 65-21-00 control-lever inspection path.",
  }),
  buildExecutableRule({
    ruleCode: "AIRMS_RULE_062",
    title: "Tail gear box pitch-change-rod findings should route to the exact rod criteria",
    category: "inspection-criteria",
    riskLevel: "High",
    possibleIssue: "TGB pitch change rod issue may require exact elastomer rod inspection criteria.",
    component: "Tail Gear Box / Pitch Change Rods",
    description:
      "Executable rule for explicit pitch-change-rod findings within the tail gear box family.",
    conditions: [
      { fact: "signals.tailGearBoxCount", operator: ">", value: 0 },
      { fact: "signals.tailGearBoxPitchChangeRodsCount", operator: ">", value: 0 },
    ],
    recommendedActions: [
      "Confirm the finding concerns elastomer pitch change rods or related pitch change link criteria.",
      "Route the item to the exact AMM 65-21-00 pitch-change-rod / link criteria.",
      "Preserve PRE MOD and POST MOD applicability when selecting the exact inspection path.",
    ],
    manualReference:
      "AMM 65-21-00,6-21 Detailed inspection check of elastomer pitch change rods | AMM 65-21-00,6-11 Elastomer pitch change rods POST MOD variants | AMM 65-21-00,6-11 Pitch change links PRE MOD variants",
    explanationTemplate:
      "Pitch-change-rod-specific terminology was detected in current records, so the inference engine is selecting the exact AMM 65-21-00 rod / link inspection path.",
  }),
  buildExecutableRule({
    ruleCode: "AIRMS_RULE_063",
    title: "Tail gear box control-plate-bearing findings should route to the exact bearing criteria",
    category: "inspection-criteria",
    riskLevel: "High",
    possibleIssue: "TGB control plate bearing issue may require exact bearing inspection criteria.",
    component: "Tail Gear Box / Control Plate Bearing",
    description:
      "Executable rule for explicit control-plate-bearing findings within the tail gear box family.",
    conditions: [
      { fact: "signals.tailGearBoxCount", operator: ">", value: 0 },
      { fact: "signals.tailGearBoxControlPlateBearingCount", operator: ">", value: 0 },
    ],
    recommendedActions: [
      "Confirm the finding concerns the TGB control plate bearing.",
      "Use the exact AMM 65-21-00,6-8 control-plate-bearing criteria and preserve the applicable PRE MOD or POST MOD split.",
      "Keep control-plate-bearing findings separate from other TGB bearing or lever cases during follow-up.",
    ],
    manualReference:
      "AMM 65-21-00,6-8 Control plate bearing family with PRE / POST MOD variants",
    explanationTemplate:
      "Control-plate-bearing-specific terminology was detected in current records, so the inference engine is selecting the exact AMM 65-21-00,6-8 bearing inspection path.",
  }),
  buildExecutableRule({
    ruleCode: "AIRMS_RULE_064",
    title: "Tail drive-line rear-section findings should route to the exact rear-section criteria",
    category: "inspection-criteria",
    riskLevel: "High",
    possibleIssue: "Rear shaft section issue may require exact tail-drive-line rear-section inspection criteria.",
    component: "Tail Drive Line / Rear Section",
    description:
      "Executable rule for explicit rear-section findings within the tail drive line family.",
    conditions: [
      { fact: "signals.tailDriveLineCount", operator: ">", value: 0 },
      { fact: "signals.tailDriveLineRearSectionCount", operator: ">", value: 0 },
    ],
    recommendedActions: [
      "Confirm the finding concerns the rear shaft section or the inside of the rear section.",
      "Route the item to the exact AMM 65-11-00 rear-section criteria instead of the generic tail-drive-line family.",
      "Use the detailed or visual rear-section path that matches the maintenance context.",
    ],
    manualReference:
      "AMM 65-11-00,6-3 Detailed Inspection Criteria - Rear Shaft Section | AMM 65-11-00,6-13 Visual Inspection Criteria - Rear Shaft Section | AMM 65-11-00,6-29 Inspection criteria for the inside of the rear section",
    explanationTemplate:
      "Rear-section-specific terminology was detected in current records, so the inference engine is selecting the exact AMM 65-11-00 rear-section inspection path rather than a broad tail-drive-line review.",
  }),
  buildExecutableRule({
    ruleCode: "AIRMS_RULE_065",
    title: "Tail drive-line equipped-front-section findings should route to the exact front-section criteria",
    category: "inspection-criteria",
    riskLevel: "High",
    possibleIssue: "Equipped front section issue may require exact tail-drive-line front-section inspection criteria.",
    component: "Tail Drive Line / Equipped Front Section",
    description:
      "Executable rule for explicit equipped-front-section findings within the tail drive line family.",
    conditions: [
      { fact: "signals.tailDriveLineCount", operator: ">", value: 0 },
      { fact: "signals.tailDriveLineFrontSectionCount", operator: ">", value: 0 },
    ],
    recommendedActions: [
      "Confirm the finding concerns the equipped front section of the tail drive line.",
      "Route the item to the exact AMM 65-11-00 equipped-front-section criteria.",
      "Keep front-section findings separate from rear-section, flange, coupling, and bearing-hanger cases during follow-up.",
    ],
    manualReference:
      "AMM 65-11-00,6-1 Detailed Inspection Criteria - Equipped front section | AMM 65-11-00,6-11 Visual Inspection Criteria - Equipped front section",
    explanationTemplate:
      "Equipped-front-section-specific terminology was detected in current records, so the inference engine is selecting the exact AMM 65-11-00 front-section inspection path.",
  }),
  buildExecutableRule({
    ruleCode: "AIRMS_RULE_066",
    title: "Tail drive-line bearing-hanger findings should route to the exact bearing-hanger criteria",
    category: "inspection-criteria",
    riskLevel: "High",
    possibleIssue: "Bearing hanger issue may require exact tail-drive-line bearing-hanger inspection criteria.",
    component: "Tail Drive Line / Bearing Hangers",
    description:
      "Executable rule for explicit bearing-hanger findings within the tail drive line family.",
    conditions: [
      { fact: "signals.tailDriveLineCount", operator: ">", value: 0 },
      { fact: "signals.tailDriveLineBearingHangersCount", operator: ">", value: 0 },
    ],
    recommendedActions: [
      "Confirm the finding concerns tail-drive-line bearing hangers.",
      "Route the item to the exact AMM 65-11-00,6-15 bearing-hanger visual inspection criteria.",
      "Preserve PRE MOD and POST MOD applicability for the bearing-hanger configuration before follow-up.",
    ],
    manualReference:
      "AMM 65-11-00,6-15 Visual Inspection - Bearings Hangers PRE / POST MOD variants",
    explanationTemplate:
      "Bearing-hanger-specific terminology was detected in current records, so the inference engine is selecting the exact AMM 65-11-00,6-15 bearing-hanger inspection path.",
  }),
  buildExecutableRule({
    ruleCode: "AIRMS_RULE_067",
    title: "Tail rotor blade pitch-horn findings should route to the exact pitch-horn criteria",
    category: "inspection-criteria",
    riskLevel: "High",
    possibleIssue: "Pitch horn assembly issue may require exact tail-rotor-blade pitch-horn inspection criteria.",
    component: "Tail Rotor Blades / Pitch Horn Assembly",
    description:
      "Executable rule for explicit pitch-horn-assembly findings within the tail rotor blade family.",
    conditions: [
      { fact: "signals.tailRotorBladesCount", operator: ">", value: 0 },
      { fact: "signals.tailRotorBladesPitchHornAssemblyCount", operator: ">", value: 0 },
    ],
    recommendedActions: [
      "Confirm the finding concerns the tail rotor blade pitch horn assembly.",
      "Route the item to the exact AMM 64-10-00 pitch-horn inspection criteria instead of the generic tail-rotor-blade family.",
      "Preserve applicable POST MOD branching when selecting the exact inspection path.",
    ],
    manualReference:
      "AMM 64-10-00,6-9 Visual Inspection Criteria - Pitch Horn Assembly POST MOD variants | AMM 64-10-00,6-10 Detailed Inspection Criteria - Pitch horn assembly POST MOD variants",
    explanationTemplate:
      "Pitch-horn-specific terminology was detected in current records, so the inference engine is selecting the exact AMM 64-10-00 pitch-horn inspection path.",
  }),
  buildExecutableRule({
    ruleCode: "AIRMS_RULE_068",
    title: "Tail rotor blade edge-tab findings should route to the exact edge-tab criteria",
    category: "inspection-criteria",
    riskLevel: "High",
    possibleIssue: "Edge tab issue may require exact tail-rotor-blade edge-tab inspection criteria.",
    component: "Tail Rotor Blades / Edge Tab",
    description:
      "Executable rule for explicit edge-tab findings within the tail rotor blade family.",
    conditions: [
      { fact: "signals.tailRotorBladesCount", operator: ">", value: 0 },
      { fact: "signals.tailRotorBladesEdgeTabCount", operator: ">", value: 0 },
    ],
    recommendedActions: [
      "Confirm the finding concerns the tail rotor blade edge tab.",
      "Route the item to the exact AMM 64-10-00,6-6 edge-tab criteria.",
      "Keep edge-tab findings separate from pitch-horn or chin-weight hardware findings during follow-up.",
    ],
    manualReference:
      "AMM 64-10-00,6-6 Inspection Criteria - Edge tab - Tail rotor blades",
    explanationTemplate:
      "Edge-tab-specific terminology was detected in current records, so the inference engine is selecting the exact AMM 64-10-00,6-6 edge-tab inspection path.",
  }),
  buildExecutableRule({
    ruleCode: "AIRMS_RULE_069",
    title: "Tail rotor blade chin-weight blanking-hardware findings should route to the exact blanking-hardware criteria",
    category: "inspection-criteria",
    riskLevel: "High",
    possibleIssue: "Chin-weight blanking hardware issue may require exact tail-rotor-blade blanking-hardware inspection criteria.",
    component: "Tail Rotor Blades / Chin-Weight Blanking Hardware",
    description:
      "Executable rule for explicit chin-weight blanking-cap or blanking-cover findings within the tail rotor blade family.",
    conditions: [
      { fact: "signals.tailRotorBladesCount", operator: ">", value: 0 },
      { fact: "signals.tailRotorBladesChinWeightsCount", operator: ">", value: 0 },
    ],
    recommendedActions: [
      "Confirm the finding concerns chin weights, blanking cap, or blanking cover hardware.",
      "Route the item to the exact AMM 64-10-00 blanking-hardware criteria.",
      "Use the visual or detailed path that matches the maintenance context before closure.",
    ],
    manualReference:
      "AMM 64-10-00,6-11 Visual Inspection Criteria - Blanking Cover on the Chinese Weights | AMM 64-10-00,6-12 Detailed Inspection Criteria - Blanking Cap on Chin Weights",
    explanationTemplate:
      "Chin-weight blanking-hardware terminology was detected in current records, so the inference engine is selecting the exact AMM 64-10-00 blanking-hardware inspection path.",
  }),
  buildExecutableRule({
    ruleCode: "AIRMS_RULE_070",
    title: "Structured ATA 64-10 tail-rotor-blade tasks should trigger tail-rotor-blade inspection routing",
    category: "inspection-criteria",
    riskLevel: "High",
    possibleIssue: "Tail rotor blade task context may require configuration-aware tail-rotor-blade inspection review.",
    component: "Tail Rotor Blades",
    description:
      "Executable rule that uses structured checklist ATA/component metadata to route tail-rotor-blade work even when free-text signals are sparse.",
    conditions: [
      { fact: "tasks.ata.chapter64.section10Count", operator: ">", value: 0 },
      { fact: "tasks.component.tailRotorBladesCount", operator: ">", value: 0 },
    ],
    recommendedActions: [
      "Use the checklist ATA 64 context to keep the task in the tail-rotor-blade family.",
      "Review whether the task concerns the blade, pitch horn assembly, edge tab, or chin-weight blanking hardware.",
      "Preserve any PRE MOD or POST MOD applicability before selecting the exact AMM path.",
    ],
    manualReference:
      "AMM 64-10-00 Tail rotor blades inspection-criteria family",
    explanationTemplate:
      "Structured checklist metadata places the current task in ATA 64-10 with tail-rotor-blade component context, so the inference engine is routing it into the AMM 64-10-00 family even without depending only on keyword matches.",
  }),
  buildExecutableRule({
    ruleCode: "AIRMS_RULE_071",
    title: "Structured ATA 65-11 tail-drive-line tasks should trigger tail-drive-line inspection routing",
    category: "inspection-criteria",
    riskLevel: "High",
    possibleIssue: "Tail drive line task context may require section-specific inspection review.",
    component: "Tail Drive Line",
    description:
      "Executable rule that uses structured checklist ATA/component metadata to route tail-drive-line work.",
    conditions: [
      { fact: "tasks.ata.chapter65.section11Count", operator: ">", value: 0 },
      { fact: "tasks.component.tailDriveLineCount", operator: ">", value: 0 },
    ],
    recommendedActions: [
      "Keep the task in the AMM 65-11-00 tail-drive-line family based on structured checklist metadata.",
      "Review whether the checklist item points to the front section, rear section, sliding flange, flexible coupling, or bearing hangers.",
      "Preserve applicable PRE MOD and POST MOD branches before follow-up.",
    ],
    manualReference:
      "AMM 65-11-00 Tail drive line inspection-criteria family",
    explanationTemplate:
      "Structured checklist metadata places the current task in ATA 65-11 with tail-drive-line component context, so the inference engine is routing it into the AMM 65-11-00 family instead of relying on text-only tail-drive-line keywords.",
  }),
  buildExecutableRule({
    ruleCode: "AIRMS_RULE_072",
    title: "Structured ATA 65-21 tail-gear-box tasks should trigger tail-gear-box inspection routing",
    category: "inspection-criteria",
    riskLevel: "High",
    possibleIssue: "Tail gear box task context may require component-specific TGB inspection review.",
    component: "Tail Gear Box",
    description:
      "Executable rule that uses structured checklist ATA/component metadata to route TGB work.",
    conditions: [
      { fact: "tasks.ata.chapter65.section21Count", operator: ">", value: 0 },
      { fact: "tasks.component.tailGearBoxCount", operator: ">", value: 0 },
    ],
    recommendedActions: [
      "Keep the task in the AMM 65-21-00 tail-gear-box family based on structured checklist metadata.",
      "Review whether the checklist item points to the housing, rotor shaft, control lever, pitch change rods / links, or control plate bearing.",
      "Preserve configuration-specific applicability before selecting the exact TGB inspection path.",
    ],
    manualReference:
      "AMM 65-21-00 Tail gear box inspection-criteria family",
    explanationTemplate:
      "Structured checklist metadata places the current task in ATA 65-21 with tail-gear-box component context, so the inference engine is routing it into the AMM 65-21-00 family even when the free-text record is short.",
  }),
  buildExecutableRule({
    ruleCode: "AIRMS_RULE_073",
    title: "Structured ATA 67 load-compensator tasks should trigger hydraulic load-compensator review",
    category: "hydraulic",
    riskLevel: "High",
    possibleIssue: "Load compensator task context may require hydraulic leak review or fault isolation.",
    component: "Load Compensator",
    description:
      "Executable rule that combines structured ATA/component metadata with hydraulic task context for load compensator work.",
    conditions: [
      { fact: "tasks.ata.chapter67.section34Count", operator: ">", value: 0 },
      { fact: "tasks.component.loadCompensatorCount", operator: ">", value: 0 },
      { fact: "tasks.hydraulicOpenCount", operator: ">", value: 0 },
    ],
    recommendedActions: [
      "Use the checklist ATA 67 context to keep the task in the load-compensator family.",
      "Review whether the task is a leak-acceptance case, a fault-isolation case, or both.",
      "Apply the AMM 67-34-00 guidance before closure.",
    ],
    manualReference:
      "AMM 67-34-00,6-3 Acceptance criteria concerning hydraulic fluid leaks | AMM 67-34-00,1-1 Fault isolation - Load compensator",
    explanationTemplate:
      "Structured checklist metadata places the current task in ATA 67-34 with load-compensator component context, and the aircraft also has active hydraulic task context, so the inference engine is routing it into the AMM 67-34-00 load-compensator path.",
  }),
  buildExecutableRule({
    ruleCode: "AIRMS_RULE_074",
    title: "Structured ATA 71 ARRIEL code tasks should trigger engine code troubleshooting",
    category: "fault-isolation",
    riskLevel: "Critical",
    possibleIssue: "ARRIEL engine task context may require code-specific troubleshooting.",
    component: "ARRIEL Engine / VEMD Fault Codes",
    description:
      "Executable rule that combines structured ATA 71 checklist context with detected ARRIEL fail-code signals.",
    conditions: [
      { fact: "tasks.ata.chapter71.section11Count", operator: ">", value: 0 },
      { fact: "signals.arrielFadecCodeCount", operator: ">", value: 0 },
    ],
    recommendedActions: [
      "Use the checklist ATA 71 context to keep the case in the ARRIEL engine troubleshooting family.",
      "Identify the exact fail or malfunction code mentioned in the record and route to the matching AMM 71-11-00 procedure.",
      "Keep code-driven engine troubleshooting separate from generic engine discrepancy handling.",
    ],
    manualReference:
      "AMM 71-11-00 ARRIEL 2B1 VEMD fail-code and malfunction-code fault-isolation family",
    explanationTemplate:
      "Structured checklist metadata places the current task in ATA 71-11 and the aircraft facts include ARRIEL fail-code signals, so the inference engine is routing the case into the code-specific AMM 71-11-00 engine troubleshooting family.",
  }),
  buildExecutableRule({
    ruleCode: "AIRMS_RULE_075",
    title: "Post-MOD 076602 pitch-horn tasks should trigger the post-mod pitch-horn path",
    category: "inspection-criteria",
    riskLevel: "High",
    possibleIssue: "Tail rotor blade pitch horn task may require the exact POST MOD inspection branch.",
    component: "Tail Rotor Blades / Pitch Horn Assembly",
    description:
      "Executable rule that uses structured modification numbers from checklist metadata to choose the post-mod tail-rotor-blade pitch-horn family.",
    conditions: [
      { fact: "tasks.ata.chapter64.section10Count", operator: ">", value: 0 },
      { fact: "signals.tailRotorBladesPitchHornAssemblyCount", operator: ">", value: 0 },
      { fact: "tasks.mod.postCount", operator: ">", value: 0 },
      { fact: "tasks.mod.number.076602Count", operator: ">", value: 0 },
    ],
    recommendedActions: [
      "Use the POST MOD 076602 pitch-horn branch before selecting the final AMM task path.",
      "Check whether related POST MOD 076603 applicability is also present in the source checklist item.",
      "Keep this task on the exact pitch-horn inspection path rather than the generic tail-rotor-blade family.",
    ],
    manualReference:
      "AMM 64-10-00,6-9 Visual Inspection Criteria - Pitch Horn Assembly POST MOD 075606 or POST MOD 076602 | AMM 64-10-00,6-10 Detailed Inspection Criteria - Pitch horn assembly POST MOD 075606 or POST MOD 076602 or POST MOD 076603",
    explanationTemplate:
      "Structured checklist metadata identifies an ATA 64-10 post-mod pitch-horn task with MOD 076602 applicability, so the inference engine is preferring the post-mod AMM 64-10-00 pitch-horn path over a generic tail-rotor-blade rule.",
  }),
  buildExecutableRule({
    ruleCode: "AIRMS_RULE_076",
    title: "Structured ATA 63-41 indicator tasks should trigger NR/NF fault-isolation routing",
    category: "fault-isolation",
    riskLevel: "High",
    possibleIssue: "Rotor-speed indication task context may require dedicated NR/NF fault isolation.",
    component: "NR / NF Indication",
    description:
      "Executable rule that uses structured ATA 63-41 checklist metadata to route NR / NF indicator and N rotor alarm tasks.",
    conditions: [
      { fact: "tasks.ata.chapter63.section41Count", operator: ">", value: 0 },
      { fact: "tasks.component.nrnfIndicatorCount", operator: ">", value: 0 },
    ],
    recommendedActions: [
      "Keep the task in the AMM 63-41-00 rotor-speed indication family based on structured checklist metadata.",
      "Review whether the checklist item refers to NR / NF indication, NR indicator, NF indicator, or N rotor alarm behavior.",
      "Use the dedicated fault-isolation path instead of general instrument troubleshooting.",
    ],
    manualReference:
      "AMM 63-41-00,1-1 NR / NF indicator fault isolation | AMM 63-41-00,1-2 N rotor alarm fault isolation",
    explanationTemplate:
      "Structured checklist metadata places the current task in ATA 63-41 with rotor-speed indication component context, so the inference engine is routing it into the dedicated AMM 63-41-00 NR / NF fault-isolation family.",
  }),
  buildExecutableRule({
    ruleCode: "AIRMS_RULE_077",
    title: "Structured ATA 63-51 tasks should trigger rotor-brake inspection routing",
    category: "inspection-criteria",
    riskLevel: "High",
    possibleIssue: "Rotor brake task context may require dedicated rotor-brake inspection criteria review.",
    component: "Rotor Brake",
    description:
      "Executable rule that uses structured ATA 63-51 checklist metadata to route rotor-brake tasks.",
    conditions: [
      { fact: "tasks.ata.chapter63.section51Count", operator: ">", value: 0 },
      { fact: "tasks.component.rotorBrakeCount", operator: ">", value: 0 },
    ],
    recommendedActions: [
      "Keep the task in the AMM 63-51-00 rotor-brake family based on structured checklist metadata.",
      "Review whether the checklist item is inspection-driven or tied to a reported brake event.",
      "Use the rotor-brake criteria path instead of a generic rotor-system route.",
    ],
    manualReference:
      "AMM 63-51-00,6-1 Rotor brake inspection criteria",
    explanationTemplate:
      "Structured checklist metadata places the current task in ATA 63-51 with rotor-brake component context, so the inference engine is routing it into the AMM 63-51-00 rotor-brake inspection family.",
  }),
  buildExecutableRule({
    ruleCode: "AIRMS_RULE_078",
    title: "Structured ATA 76-00 tasks should trigger engine-controls diagnostic routing",
    category: "fault-isolation",
    riskLevel: "High",
    possibleIssue: "Engine-controls task context may require dedicated twist-grip fuel-flow-control diagnosis.",
    component: "Engine Controls",
    description:
      "Executable rule that uses structured ATA 76-00 checklist metadata to route engine-controls tasks.",
    conditions: [
      { fact: "tasks.ata.chapter76.section0Count", operator: ">", value: 0 },
      { fact: "tasks.component.engineControlsCount", operator: ">", value: 0 },
    ],
    recommendedActions: [
      "Keep the task in the AMM 76-00-00 engine-controls diagnostic family based on structured checklist metadata.",
      "Review whether the checklist item concerns twist grip, fuel flow control, or both.",
      "Use the engine-controls diagnosis path instead of broad engine or fuel-system troubleshooting.",
    ],
    manualReference:
      "AMM 76-00-00,1-1 Fault diagnosis - Twist grip Fuel Flow Control - Engine Controls",
    explanationTemplate:
      "Structured checklist metadata places the current task in ATA 76-00 with engine-controls component context, so the inference engine is routing it into the AMM 76-00-00 diagnostic family.",
  }),
  buildExecutableRule({
    ruleCode: "AIRMS_RULE_079",
    title: "Structured ATA 79-30 tasks should trigger engine-oil-indication fault isolation",
    category: "fault-isolation",
    riskLevel: "High",
    possibleIssue: "Engine oil indication task context may require dedicated oil-indication troubleshooting.",
    component: "Engine Oil Indication",
    description:
      "Executable rule that uses structured ATA 79-30 checklist metadata to route oil-indicating-system tasks.",
    conditions: [
      { fact: "tasks.ata.chapter79.section30Count", operator: ">", value: 0 },
      { fact: "tasks.component.engineOilIndicationCount", operator: ">", value: 0 },
    ],
    recommendedActions: [
      "Keep the task in the AMM 79-30-00 oil-indicating-system family based on structured checklist metadata.",
      "Review whether the checklist item concerns oil pressure indication, oil temperature indication, or both.",
      "Use the dedicated oil-indication troubleshooting path instead of generic instrument handling.",
    ],
    manualReference:
      "AMM 79-30-00,1-1 Fault Isolation - Engine Oil Pressure / Temperature - Indicating System",
    explanationTemplate:
      "Structured checklist metadata places the current task in ATA 79-30 with engine-oil-indication component context, so the inference engine is routing it into the AMM 79-30-00 fault-isolation family.",
  }),
  buildExecutableRule({
    ruleCode: "AIRMS_RULE_080",
    title: "Structured ATA 63-11 drive-line tasks should trigger engine/MGB drive-line inspection routing",
    category: "inspection-criteria",
    riskLevel: "High",
    possibleIssue: "Engine or MGB drive-line task context may require component-specific drive-line inspection review.",
    component: "Engine / MGB Drive Line",
    description:
      "Executable rule that uses structured ATA 63-11 checklist metadata to route engine or MGB drive-line tasks.",
    conditions: [
      { fact: "tasks.ata.chapter63.section11Count", operator: ">", value: 0 },
      { fact: "tasks.component.engineMgbDriveLineCount", operator: ">", value: 0 },
    ],
    recommendedActions: [
      "Keep the task in the AMM 63-11-00 engine / MGB drive-line family based on structured checklist metadata.",
      "Review whether the checklist item concerns belts, bearings, flexible couplings, splines, flanges, housings, gimbal hardware, sealing sleeve, or the MGB drive shaft.",
      "Preserve PRE MOD and POST MOD applicability before selecting the exact drive-line path.",
    ],
    manualReference:
      "AMM 63-11-00 drive-line inspection-criteria family",
    explanationTemplate:
      "Structured checklist metadata places the current task in ATA 63-11 with engine / MGB drive-line component context, so the inference engine is routing it into the AMM 63-11-00 family instead of leaving it as a generic drivetrain item.",
  }),
  buildExecutableRule({
    ruleCode: "AIRMS_RULE_081",
    title: "Structured ATA 63-11 belt tasks should trigger the hydraulic-pump-drive-belt path",
    category: "inspection-criteria",
    riskLevel: "High",
    possibleIssue: "Hydraulic pump drive belt task may require exact belt or belt-tension inspection criteria.",
    component: "Engine / MGB Drive Line / Hydraulic Pump Drive Belt",
    description:
      "Executable rule that uses structured ATA 63-11 checklist metadata to route belt and belt-tension cases inside the drive-line family.",
    conditions: [
      { fact: "tasks.ata.chapter63.section11Count", operator: ">", value: 0 },
      { fact: "tasks.component.engineMgbDriveLineBeltCount", operator: ">", value: 0 },
    ],
    recommendedActions: [
      "Route the task to the AMM 63-11-00 hydraulic-pump-drive-belt or belt-tension criteria.",
      "Preserve PRE MOD 079555, POST MOD 079555, and PRE MOD 0770000 applicability before follow-up.",
      "Keep belt/tension routing separate from bearing, coupling, spline, and flange cases.",
    ],
    manualReference:
      "AMM 63-11-00 hydraulic pump drive belt and belt tension inspection-criteria family",
    explanationTemplate:
      "Structured checklist metadata identifies an ATA 63-11 belt-related task, so the inference engine is selecting the hydraulic-pump-drive-belt branch inside the AMM 63-11-00 drive-line family.",
  }),
  buildExecutableRule({
    ruleCode: "AIRMS_RULE_082",
    title: "Structured ATA 63-11 drive-bearing tasks should trigger the exact drive-bearing path",
    category: "inspection-criteria",
    riskLevel: "High",
    possibleIssue: "Drive-bearing task may require exact belt-driven hydraulic pump drive-bearing criteria.",
    component: "Engine / MGB Drive Line / Drive Bearing",
    description:
      "Executable rule that uses structured ATA 63-11 checklist metadata to route drive-bearing cases.",
    conditions: [
      { fact: "tasks.ata.chapter63.section11Count", operator: ">", value: 0 },
      { fact: "tasks.component.engineMgbDriveLineBearingCount", operator: ">", value: 0 },
    ],
    recommendedActions: [
      "Route the task to the exact AMM 63-11-00 drive-bearing criteria.",
      "Preserve PRE MOD 079566, POST MOD 079566, POST MOD 079568, and PRE MOD 0770000 applicability before selecting the exact path.",
      "Keep drive-bearing routing separate from belt, coupling, spline, and flange cases.",
    ],
    manualReference:
      "AMM 63-11-00 belt-driven hydraulic pump drive bearing inspection-criteria family",
    explanationTemplate:
      "Structured checklist metadata identifies an ATA 63-11 drive-bearing task, so the inference engine is selecting the exact drive-bearing branch inside the AMM 63-11-00 family.",
  }),
  buildExecutableRule({
    ruleCode: "AIRMS_RULE_083",
    title: "Structured ATA 63-31 suspension tasks should trigger bi-directional-suspension inspection routing",
    category: "inspection-criteria",
    riskLevel: "High",
    possibleIssue: "Bi-directional suspension task context may require hardware-specific suspension inspection review.",
    component: "Bi-directional Suspension",
    description:
      "Executable rule that uses structured ATA 63-31 checklist metadata to route bi-directional-suspension tasks.",
    conditions: [
      { fact: "tasks.ata.chapter63.section31Count", operator: ">", value: 0 },
      { fact: "tasks.component.biDirectionalSuspensionCount", operator: ">", value: 0 },
    ],
    recommendedActions: [
      "Keep the task in the AMM 63-31-00 bi-directional-suspension family based on structured checklist metadata.",
      "Review whether the checklist item concerns crossbeams, laminated stops, block pins, or block supports.",
      "Preserve installed hardware distinctions before follow-up.",
    ],
    manualReference:
      "AMM 63-31-00 bi-directional suspension inspection-criteria family",
    explanationTemplate:
      "Structured checklist metadata places the current task in ATA 63-31 with bi-directional-suspension component context, so the inference engine is routing it into the AMM 63-31-00 family.",
  }),
  buildExecutableRule({
    ruleCode: "AIRMS_RULE_084",
    title: "Structured ATA 63-31 crossbeam tasks should trigger the exact suspension-crossbeam path",
    category: "inspection-criteria",
    riskLevel: "High",
    possibleIssue: "Suspension crossbeam task may require exact crossbeam-variant inspection criteria.",
    component: "Bi-directional Suspension / Crossbeam",
    description:
      "Executable rule that uses structured ATA 63-31 checklist metadata to route suspension crossbeam cases.",
    conditions: [
      { fact: "tasks.ata.chapter63.section31Count", operator: ">", value: 0 },
      { fact: "tasks.component.biDirectionalSuspensionCrossbeamCount", operator: ">", value: 0 },
    ],
    recommendedActions: [
      "Route the task to the AMM 63-31-00 suspension-crossbeam criteria.",
      "Preserve crossbeam variant distinctions such as 350A38-1018-XX and 350A38-1040-00 / -20 before follow-up.",
      "Keep crossbeam routing separate from laminated-stop, pin, and support cases.",
    ],
    manualReference:
      "AMM 63-31-00,6-4 Suspension crossbeam family",
    explanationTemplate:
      "Structured checklist metadata identifies an ATA 63-31 suspension-crossbeam task, so the inference engine is selecting the exact crossbeam branch inside the AMM 63-31-00 suspension family.",
  }),
  buildExecutableRule({
    ruleCode: "AIRMS_RULE_085",
    title: "Structured ATA 63-32 MGB suspension-bar tasks should trigger the MGB-bar inspection path",
    category: "inspection-criteria",
    riskLevel: "High",
    possibleIssue: "MGB suspension bar task context may require exact bar or bolt inspection criteria.",
    component: "MGB Suspension Bar",
    description:
      "Executable rule that uses structured ATA 63-32 checklist metadata to route MGB suspension bar tasks.",
    conditions: [
      { fact: "tasks.ata.chapter63.section32Count", operator: ">", value: 0 },
      { fact: "tasks.component.mgbSuspensionBarCount", operator: ">", value: 0 },
    ],
    recommendedActions: [
      "Keep the task in the AMM 63-32-00 MGB suspension bar family based on structured checklist metadata.",
      "Review whether the checklist item concerns the base MGB bar or the bar-bolt visual/detailed criteria.",
      "Preserve any airworthiness-inspection context before follow-up.",
    ],
    manualReference:
      "AMM 63-32-00 MGB suspension bar inspection-criteria family",
    explanationTemplate:
      "Structured checklist metadata places the current task in ATA 63-32 with MGB suspension bar context, so the inference engine is routing it into the AMM 63-32-00 family.",
  }),
  buildExecutableRule({
    ruleCode: "AIRMS_RULE_086",
    title: "PRE MOD 079555 hydraulic-pump-drive-belt tasks should trigger the pre-mod belt path",
    category: "inspection-criteria",
    riskLevel: "High",
    possibleIssue: "Hydraulic pump drive belt task may require the exact PRE MOD 079555 belt criteria.",
    component: "Engine / MGB Drive Line / Hydraulic Pump Drive Belt PRE MOD 079555",
    description:
      "Executable rule that uses structured ATA 63-11 metadata and modification applicability to choose the pre-mod hydraulic-pump-drive-belt branch.",
    conditions: [
      { fact: "tasks.ata.chapter63.section11Count", operator: ">", value: 0 },
      { fact: "tasks.component.engineMgbDriveLineBeltCount", operator: ">", value: 0 },
      { fact: "tasks.mod.preCount", operator: ">", value: 0 },
      { fact: "tasks.mod.number.079555Count", operator: ">", value: 0 },
    ],
    recommendedActions: [
      "Use the PRE MOD 079555 hydraulic-pump-drive-belt or belt-tension branch before selecting the exact AMM task path.",
      "Check whether PRE MOD 0770000 applicability is also present in the source checklist item.",
      "Keep this task on the pre-mod belt path instead of the broad 63-11 family.",
    ],
    manualReference:
      "AMM 63-11-00,6-20 Hydraulic pump drive belt tension PRE MOD 079555 | AMM 63-11-00,6-2 Hydraulic pump drive belt PRE MOD 079555",
    explanationTemplate:
      "Structured checklist metadata identifies an ATA 63-11 belt task with PRE MOD 079555 applicability, so the inference engine is preferring the pre-mod hydraulic-pump-drive-belt branch inside the AMM 63-11-00 family.",
  }),
  buildExecutableRule({
    ruleCode: "AIRMS_RULE_087",
    title: "POST MOD 079555 hydraulic-pump-drive-belt tasks should trigger the post-mod belt path",
    category: "inspection-criteria",
    riskLevel: "High",
    possibleIssue: "Hydraulic pump drive belt task may require the exact POST MOD 079555 belt criteria.",
    component: "Engine / MGB Drive Line / Hydraulic Pump Drive Belt POST MOD 079555",
    description:
      "Executable rule that uses structured ATA 63-11 metadata and modification applicability to choose the post-mod hydraulic-pump-drive-belt branch.",
    conditions: [
      { fact: "tasks.ata.chapter63.section11Count", operator: ">", value: 0 },
      { fact: "tasks.component.engineMgbDriveLineBeltCount", operator: ">", value: 0 },
      { fact: "tasks.mod.postCount", operator: ">", value: 0 },
      { fact: "tasks.mod.number.079555Count", operator: ">", value: 0 },
    ],
    recommendedActions: [
      "Use the POST MOD 079555 hydraulic-pump-drive-belt or belt-tension branch before selecting the exact AMM task path.",
      "Check whether PRE MOD 0770000 applicability is also present if the source checklist item combines branches.",
      "Keep this task on the post-mod belt path instead of the broad 63-11 family.",
    ],
    manualReference:
      "AMM 63-11-00,6-20 Hydraulic pump drive belt tension POST MOD 079555 | AMM 63-11-00,6-2 Hydraulic pump drive belt POST MOD 079555",
    explanationTemplate:
      "Structured checklist metadata identifies an ATA 63-11 belt task with POST MOD 079555 applicability, so the inference engine is preferring the post-mod hydraulic-pump-drive-belt branch inside the AMM 63-11-00 family.",
  }),
  buildExecutableRule({
    ruleCode: "AIRMS_RULE_088",
    title: "PRE MOD 079566 drive-bearing tasks should trigger the pre-mod drive-bearing path",
    category: "inspection-criteria",
    riskLevel: "High",
    possibleIssue: "Drive-bearing task may require the exact PRE MOD 079566 bearing criteria.",
    component: "Engine / MGB Drive Line / Drive Bearing PRE MOD 079566",
    description:
      "Executable rule that uses structured ATA 63-11 metadata and modification applicability to choose the pre-mod drive-bearing branch.",
    conditions: [
      { fact: "tasks.ata.chapter63.section11Count", operator: ">", value: 0 },
      { fact: "tasks.component.engineMgbDriveLineBearingCount", operator: ">", value: 0 },
      { fact: "tasks.mod.preCount", operator: ">", value: 0 },
      { fact: "tasks.mod.number.079566Count", operator: ">", value: 0 },
    ],
    recommendedActions: [
      "Use the PRE MOD 079566 belt-driven hydraulic-pump-drive-bearing branch before selecting the exact AMM task path.",
      "Check whether PRE MOD 0770000 applicability is also present in the source checklist item.",
      "Keep this task on the pre-mod drive-bearing path instead of the broad 63-11 family.",
    ],
    manualReference:
      "AMM 63-11-00,6-19 Detailed inspection criteria - Belt-driven hydraulic pump drive bearing PRE MOD 079566 | AMM 63-11-00,6-15 Visual inspection criteria - Belt-driven hydraulic pump drive bearing PRE MOD 079566",
    explanationTemplate:
      "Structured checklist metadata identifies an ATA 63-11 drive-bearing task with PRE MOD 079566 applicability, so the inference engine is preferring the pre-mod drive-bearing branch inside the AMM 63-11-00 family.",
  }),
  buildExecutableRule({
    ruleCode: "AIRMS_RULE_089",
    title: "POST MOD 079566 or 079568 drive-bearing tasks should trigger the post-mod drive-bearing path",
    category: "inspection-criteria",
    riskLevel: "High",
    possibleIssue: "Drive-bearing task may require the exact POST MOD 079566 or 079568 bearing criteria.",
    component: "Engine / MGB Drive Line / Drive Bearing POST MOD 079566 or 079568",
    description:
      "Executable rule that uses structured ATA 63-11 metadata and modification applicability to choose the post-mod drive-bearing branch.",
    conditions: [
      { fact: "tasks.ata.chapter63.section11Count", operator: ">", value: 0 },
      { fact: "tasks.component.engineMgbDriveLineBearingCount", operator: ">", value: 0 },
      { fact: "tasks.mod.postCount", operator: ">", value: 0 },
      { fact: "tasks.mod.number.079566Count", operator: ">", value: 0 },
    ],
    recommendedActions: [
      "Use the POST MOD 079566 / 079568 belt-driven hydraulic-pump-drive-bearing branch before selecting the exact AMM task path.",
      "Check whether the source checklist item also references MOD 079568 explicitly.",
      "Keep this task on the post-mod drive-bearing path instead of the broad 63-11 family.",
    ],
    manualReference:
      "AMM 63-11-00,6-19 Detailed inspection criteria - Belt-driven hydraulic pump drive bearing POST MOD 079566 and POST MOD 079568 | AMM 63-11-00,6-15 Visual inspection criteria - Belt-driven hydraulic pump drive bearing POST MOD 079566 and POST MOD 079568",
    explanationTemplate:
      "Structured checklist metadata identifies an ATA 63-11 drive-bearing task with post-mod 079566 applicability, so the inference engine is preferring the post-mod drive-bearing branch inside the AMM 63-11-00 family.",
  }),
  buildExecutableRule({
    ruleCode: "AIRMS_RULE_090",
    title: "PRE MOD 0770000 flexible-coupling tasks should trigger the pre-mod coupling path",
    category: "inspection-criteria",
    riskLevel: "High",
    possibleIssue: "Flexible-coupling task may require the exact PRE MOD 0770000 coupling criteria.",
    component: "Engine / MGB Drive Line / Flexible Coupling PRE MOD 0770000",
    description:
      "Executable rule that uses structured ATA 63-11 metadata and modification applicability to choose the pre-mod flexible-coupling branch.",
    conditions: [
      { fact: "tasks.ata.chapter63.section11Count", operator: ">", value: 0 },
      { fact: "tasks.component.engineMgbDriveLineFlexibleCouplingCount", operator: ">", value: 0 },
      { fact: "tasks.mod.preCount", operator: ">", value: 0 },
      { fact: "tasks.mod.number.0770000Count", operator: ">", value: 0 },
    ],
    recommendedActions: [
      "Use the PRE MOD 0770000 flexible-coupling branch before selecting the exact AMM task path.",
      "Keep this task separate from the broader flexible-coupling family when legacy applicability is present.",
      "Review whether the source checklist item refers to belt-driven hydraulic pump flexible coupling specifically.",
    ],
    manualReference:
      "AMM 63-11-00,6-12 Belt-driven hydraulic pump flexible coupling PRE MOD 0770000",
    explanationTemplate:
      "Structured checklist metadata identifies an ATA 63-11 flexible-coupling task with PRE MOD 0770000 applicability, so the inference engine is preferring the legacy pre-mod flexible-coupling branch inside the AMM 63-11-00 family.",
  }),
  buildExecutableRule({
    ruleCode: "AIRMS_RULE_091",
    title: "POST MOD 079561 sealing-sleeve tasks should trigger the sealing-sleeve path",
    category: "inspection-criteria",
    riskLevel: "High",
    possibleIssue: "Sealing sleeve task may require the exact POST MOD 079561 criteria.",
    component: "Engine / MGB Drive Line / Sealing Sleeve POST MOD 079561",
    description:
      "Executable rule that uses structured ATA 63-11 metadata and modification applicability to choose the post-mod sealing-sleeve branch.",
    conditions: [
      { fact: "tasks.ata.chapter63.section11Count", operator: ">", value: 0 },
      { fact: "tasks.component.engineMgbDriveLineSealingSleeveCount", operator: ">", value: 0 },
      { fact: "tasks.mod.postCount", operator: ">", value: 0 },
      { fact: "tasks.mod.number.079561Count", operator: ">", value: 0 },
    ],
    recommendedActions: [
      "Use the POST MOD 079561 sealing-sleeve branch before selecting the exact AMM task path.",
      "Review whether the source checklist item also references the PRE MOD 079566 split.",
      "Keep this task on the sealing-sleeve path instead of the broader 63-11 family.",
    ],
    manualReference:
      "AMM 63-11-00,6-17 Sealing Sleeve POST MOD 079561 and PRE MOD 079566",
    explanationTemplate:
      "Structured checklist metadata identifies an ATA 63-11 sealing-sleeve task with POST MOD 079561 applicability, so the inference engine is preferring the exact sealing-sleeve branch inside the AMM 63-11-00 family.",
  }),
  buildExecutableRule({
    ruleCode: "AIRMS_RULE_092",
    title: "POST MOD 079568 drive-bearing tasks should trigger the post-mod drive-bearing path",
    category: "inspection-criteria",
    riskLevel: "High",
    possibleIssue: "Drive-bearing task may require the exact POST MOD 079568 bearing criteria.",
    component: "Engine / MGB Drive Line / Drive Bearing POST MOD 079568",
    description:
      "Executable rule that uses structured ATA 63-11 metadata and modification applicability to choose the post-mod 079568 drive-bearing branch.",
    conditions: [
      { fact: "tasks.ata.chapter63.section11Count", operator: ">", value: 0 },
      { fact: "tasks.component.engineMgbDriveLineBearingCount", operator: ">", value: 0 },
      { fact: "tasks.mod.postCount", operator: ">", value: 0 },
      { fact: "tasks.mod.number.079568Count", operator: ">", value: 0 },
    ],
    recommendedActions: [
      "Use the POST MOD 079568 belt-driven hydraulic-pump-drive-bearing branch before selecting the exact AMM task path.",
      "Keep this task on the exact post-mod 079568 bearing path instead of the broad 63-11 family.",
      "Review whether the source checklist item also references the paired POST MOD 079566 family language.",
    ],
    manualReference:
      "AMM 63-11-00,6-19 Detailed inspection criteria - Belt-driven hydraulic pump drive bearing POST MOD 079566 and POST MOD 079568 | AMM 63-11-00,6-15 Visual inspection criteria - Belt-driven hydraulic pump drive bearing POST MOD 079566 and POST MOD 079568",
    explanationTemplate:
      "Structured checklist metadata identifies an ATA 63-11 drive-bearing task with POST MOD 079568 applicability, so the inference engine is preferring the exact post-mod 079568 drive-bearing branch inside the AMM 63-11-00 family.",
  }),
  buildExecutableRule({
    ruleCode: "AIRMS_RULE_093",
    title: "PRE MOD 079566 sealing-sleeve tasks should trigger the pre-mod sealing-sleeve path",
    category: "inspection-criteria",
    riskLevel: "High",
    possibleIssue: "Sealing sleeve task may require the exact PRE MOD 079566 criteria.",
    component: "Engine / MGB Drive Line / Sealing Sleeve PRE MOD 079566",
    description:
      "Executable rule that uses structured ATA 63-11 metadata and modification applicability to choose the pre-mod sealing-sleeve branch.",
    conditions: [
      { fact: "tasks.ata.chapter63.section11Count", operator: ">", value: 0 },
      { fact: "tasks.component.engineMgbDriveLineSealingSleeveCount", operator: ">", value: 0 },
      { fact: "tasks.mod.preCount", operator: ">", value: 0 },
      { fact: "tasks.mod.number.079566Count", operator: ">", value: 0 },
    ],
    recommendedActions: [
      "Use the PRE MOD 079566 sealing-sleeve branch before selecting the exact AMM task path.",
      "Keep this task on the sealing-sleeve route instead of the broader 63-11 family.",
      "Review whether the source checklist item also references the paired POST MOD 079561 split.",
    ],
    manualReference:
      "AMM 63-11-00,6-17 Sealing Sleeve POST MOD 079561 and PRE MOD 079566",
    explanationTemplate:
      "Structured checklist metadata identifies an ATA 63-11 sealing-sleeve task with PRE MOD 079566 applicability, so the inference engine is preferring the exact pre-mod sealing-sleeve branch inside the AMM 63-11-00 family.",
  }),
  buildExecutableRule({
    ruleCode: "AIRMS_RULE_094",
    title: "PRE MOD 079566 drive-splines tasks should trigger the pre-mod splines path",
    category: "inspection-criteria",
    riskLevel: "High",
    possibleIssue: "Drive-splines task may require the exact PRE MOD 079566 spline criteria.",
    component: "Engine / MGB Drive Line / Drive Splines PRE MOD 079566",
    description:
      "Executable rule that uses structured ATA 63-11 metadata and modification applicability to choose the pre-mod drive-splines branch.",
    conditions: [
      { fact: "tasks.ata.chapter63.section11Count", operator: ">", value: 0 },
      { fact: "tasks.component.engineMgbDriveLineSplinesCount", operator: ">", value: 0 },
      { fact: "tasks.mod.preCount", operator: ">", value: 0 },
      { fact: "tasks.mod.number.079566Count", operator: ">", value: 0 },
    ],
    recommendedActions: [
      "Use the PRE MOD 079566 drive-splines branch before selecting the exact AMM task path.",
      "Keep spline routing separate from belt, bearing, coupling, and flange cases.",
      "Check whether the source checklist item also carries the PRE MOD 0770000 variant.",
    ],
    manualReference:
      "AMM 63-11-00,6-3 Belt-driven hydraulic pump drive splines PRE MOD 079566",
    explanationTemplate:
      "Structured checklist metadata identifies an ATA 63-11 drive-splines task with PRE MOD 079566 applicability, so the inference engine is preferring the exact pre-mod splines branch inside the AMM 63-11-00 family.",
  }),
  buildExecutableRule({
    ruleCode: "AIRMS_RULE_095",
    title: "PRE MOD 0770000 drive-splines tasks should trigger the legacy splines path",
    category: "inspection-criteria",
    riskLevel: "High",
    possibleIssue: "Drive-splines task may require the exact PRE MOD 0770000 spline criteria.",
    component: "Engine / MGB Drive Line / Drive Splines PRE MOD 0770000",
    description:
      "Executable rule that uses structured ATA 63-11 metadata and modification applicability to choose the legacy pre-mod drive-splines branch.",
    conditions: [
      { fact: "tasks.ata.chapter63.section11Count", operator: ">", value: 0 },
      { fact: "tasks.component.engineMgbDriveLineSplinesCount", operator: ">", value: 0 },
      { fact: "tasks.mod.preCount", operator: ">", value: 0 },
      { fact: "tasks.mod.number.0770000Count", operator: ">", value: 0 },
    ],
    recommendedActions: [
      "Use the PRE MOD 0770000 drive-splines branch before selecting the exact AMM task path.",
      "Keep this task on the legacy spline route instead of the broad 63-11 family.",
      "Review whether the source checklist item also references the PRE MOD 079566 split.",
    ],
    manualReference:
      "AMM 63-11-00,6-3 Belt-driven hydraulic pump drive splines PRE MOD 079566 and PRE MOD 0770000",
    explanationTemplate:
      "Structured checklist metadata identifies an ATA 63-11 drive-splines task with PRE MOD 0770000 applicability, so the inference engine is preferring the legacy pre-mod splines branch inside the AMM 63-11-00 family.",
  }),
  buildExecutableRule({
    ruleCode: "AIRMS_RULE_096",
    title: "PRE MOD 075595 inserted-tab blade tasks should trigger the pre-mod inserted-tab path",
    category: "inspection-criteria",
    riskLevel: "High",
    possibleIssue: "Tail rotor blade task may require the exact PRE MOD 075595 inserted-tab criteria.",
    component: "Tail Rotor Blades / Inserted Tab PRE MOD 075595",
    description:
      "Executable rule that uses structured ATA 64-10 metadata and modification applicability to choose the pre-mod inserted-tab blade branch.",
    conditions: [
      { fact: "tasks.ata.chapter64.section10Count", operator: ">", value: 0 },
      { fact: "tasks.component.tailRotorBladesInsertedTabCount", operator: ">", value: 0 },
      { fact: "tasks.mod.preCount", operator: ">", value: 0 },
      { fact: "tasks.mod.number.075595Count", operator: ">", value: 0 },
    ],
    recommendedActions: [
      "Use the PRE MOD 075595 inserted-tab blade branch before selecting the exact AMM task path.",
      "Keep this task on the pre-mod inserted-tab route instead of the broad tail-rotor-blade family.",
      "Review whether the source checklist item also includes edge-tab, pitch-horn, or chin-weight hardware context.",
    ],
    manualReference:
      "AMM 64-10-00,6-1 Tail rotor blades with inserted tab PRE MOD 075595",
    explanationTemplate:
      "Structured checklist metadata identifies an ATA 64-10 inserted-tab blade task with PRE MOD 075595 applicability, so the inference engine is preferring the pre-mod inserted-tab branch inside the AMM 64-10-00 family.",
  }),
  buildExecutableRule({
    ruleCode: "AIRMS_RULE_097",
    title: "POST MOD 075595 inserted-tab blade tasks should trigger the post-mod inserted-tab path",
    category: "inspection-criteria",
    riskLevel: "High",
    possibleIssue: "Tail rotor blade task may require the exact POST MOD 075595 inserted-tab criteria.",
    component: "Tail Rotor Blades / Inserted Tab POST MOD 075595",
    description:
      "Executable rule that uses structured ATA 64-10 metadata and modification applicability to choose the post-mod inserted-tab blade branch.",
    conditions: [
      { fact: "tasks.ata.chapter64.section10Count", operator: ">", value: 0 },
      { fact: "tasks.component.tailRotorBladesInsertedTabCount", operator: ">", value: 0 },
      { fact: "tasks.mod.postCount", operator: ">", value: 0 },
      { fact: "tasks.mod.number.075595Count", operator: ">", value: 0 },
    ],
    recommendedActions: [
      "Use the POST MOD 075595 inserted-tab blade branch before selecting the exact AMM task path.",
      "Keep this task on the post-mod inserted-tab route instead of the broad tail-rotor-blade family.",
      "Review whether the source checklist item also includes pitch-horn or blanking-hardware context.",
    ],
    manualReference:
      "AMM 64-10-00,6-1 Tail rotor blades with inserted tab POST MOD 075595",
    explanationTemplate:
      "Structured checklist metadata identifies an ATA 64-10 inserted-tab blade task with POST MOD 075595 applicability, so the inference engine is preferring the post-mod inserted-tab branch inside the AMM 64-10-00 family.",
  }),
  buildExecutableRule({
    ruleCode: "AIRMS_RULE_098",
    title: "POST MOD 076603 pitch-horn tasks should trigger the 076603 pitch-horn path",
    category: "inspection-criteria",
    riskLevel: "High",
    possibleIssue: "Tail rotor blade pitch-horn task may require the exact POST MOD 076603 inspection branch.",
    component: "Tail Rotor Blades / Pitch Horn Assembly POST MOD 076603",
    description:
      "Executable rule that uses structured ATA 64-10 metadata and modification applicability to choose the 076603 pitch-horn branch.",
    conditions: [
      { fact: "tasks.ata.chapter64.section10Count", operator: ">", value: 0 },
      { fact: "tasks.component.tailRotorBladesPitchHornAssemblyCount", operator: ">", value: 0 },
      { fact: "tasks.mod.postCount", operator: ">", value: 0 },
      { fact: "tasks.mod.number.076603Count", operator: ">", value: 0 },
    ],
    recommendedActions: [
      "Use the POST MOD 076603 pitch-horn branch before selecting the exact AMM task path.",
      "Keep this task on the exact 076603 pitch-horn route instead of the broader pitch-horn family.",
      "Review whether the source checklist item also references related POST MOD 075606 or 076602 applicability.",
    ],
    manualReference:
      "AMM 64-10-00,6-10 Detailed Inspection Criteria - Pitch horn assembly POST MOD 075606 or POST MOD 076602 or POST MOD 076603",
    explanationTemplate:
      "Structured checklist metadata identifies an ATA 64-10 pitch-horn task with POST MOD 076603 applicability, so the inference engine is preferring the exact 076603 pitch-horn branch inside the AMM 64-10-00 family.",
  }),
  buildExecutableRule({
    ruleCode: "AIRMS_RULE_099",
    title: "PRE MOD 079017 bearing-hanger tasks should trigger the pre-mod bearing-hanger path",
    category: "inspection-criteria",
    riskLevel: "High",
    possibleIssue: "Bearing-hanger task may require the exact PRE MOD 079017 criteria.",
    component: "Tail Drive Line / Bearing Hangers PRE MOD 079017",
    description:
      "Executable rule that uses structured ATA 65-11 metadata and modification applicability to choose the pre-mod bearing-hanger branch.",
    conditions: [
      { fact: "tasks.ata.chapter65.section11Count", operator: ">", value: 0 },
      { fact: "tasks.component.tailDriveLineBearingHangersCount", operator: ">", value: 0 },
      { fact: "tasks.mod.preCount", operator: ">", value: 0 },
      { fact: "tasks.mod.number.079017Count", operator: ">", value: 0 },
    ],
    recommendedActions: [
      "Use the PRE MOD 079017 bearing-hanger branch before selecting the exact AMM task path.",
      "Keep this task on the pre-mod bearing-hanger route instead of the broad tail-drive-line family.",
      "Review whether the source checklist item also references later POST MOD branches.",
    ],
    manualReference:
      "AMM 65-11-00,6-15 Visual Inspection - Bearings Hangers PRE MOD 079017",
    explanationTemplate:
      "Structured checklist metadata identifies an ATA 65-11 bearing-hanger task with PRE MOD 079017 applicability, so the inference engine is preferring the pre-mod bearing-hanger branch inside the AMM 65-11-00 family.",
  }),
  buildExecutableRule({
    ruleCode: "AIRMS_RULE_100",
    title: "POST MOD 079017 or 079032 or 078542 bearing-hanger tasks should trigger the post-mod bearing-hanger path",
    category: "inspection-criteria",
    riskLevel: "High",
    possibleIssue: "Bearing-hanger task may require the exact POST MOD bearing-hanger criteria.",
    component: "Tail Drive Line / Bearing Hangers POST MOD 079017 or 079032 or 078542",
    description:
      "Executable rule that uses structured ATA 65-11 metadata and modification applicability to choose the post-mod bearing-hanger branch.",
    conditions: [
      { fact: "tasks.ata.chapter65.section11Count", operator: ">", value: 0 },
      { fact: "tasks.component.tailDriveLineBearingHangersCount", operator: ">", value: 0 },
      { fact: "tasks.mod.postCount", operator: ">", value: 0 },
      { fact: "tasks.mod.number.079017Count", operator: ">", value: 0 },
    ],
    recommendedActions: [
      "Use the POST MOD bearing-hanger branch before selecting the exact AMM task path.",
      "Check whether the source checklist item references POST MOD 079032 or POST MOD 078542 explicitly.",
      "Keep this task on the post-mod bearing-hanger route instead of the broad tail-drive-line family.",
    ],
    manualReference:
      "AMM 65-11-00,6-15 Visual Inspection - Bearings Hangers POST MOD 079017 or POST MOD 079032 or POST MOD 078542",
    explanationTemplate:
      "Structured checklist metadata identifies an ATA 65-11 bearing-hanger task with post-mod applicability tied to the later bearing-hanger family, so the inference engine is preferring the post-mod bearing-hanger branch inside the AMM 65-11-00 family.",
  }),
  buildExecutableRule({
    ruleCode: "AIRMS_RULE_101",
    title: "POST MOD 079032 bearing-hanger tasks should trigger the 079032 bearing-hanger path",
    category: "inspection-criteria",
    riskLevel: "High",
    possibleIssue: "Bearing-hanger task may require the exact POST MOD 079032 criteria.",
    component: "Tail Drive Line / Bearing Hangers POST MOD 079032",
    description:
      "Executable rule that uses structured ATA 65-11 metadata and explicit 079032 applicability to choose the exact post-mod bearing-hanger branch.",
    conditions: [
      { fact: "tasks.ata.chapter65.section11Count", operator: ">", value: 0 },
      { fact: "tasks.component.tailDriveLineBearingHangersCount", operator: ">", value: 0 },
      { fact: "tasks.mod.postCount", operator: ">", value: 0 },
      { fact: "tasks.mod.number.079032Count", operator: ">", value: 0 },
    ],
    recommendedActions: [
      "Use the explicit POST MOD 079032 bearing-hanger branch before selecting the exact AMM task path.",
      "Keep this task on the 079032-specific route instead of the broader post-mod bearing-hanger family.",
      "Review whether the source checklist item also references the related 079017 or 078542 family language.",
    ],
    manualReference:
      "AMM 65-11-00,6-15 Visual Inspection - Bearings Hangers POST MOD 079017 or POST MOD 079032 or POST MOD 078542",
    explanationTemplate:
      "Structured checklist metadata identifies an ATA 65-11 bearing-hanger task with explicit POST MOD 079032 applicability, so the inference engine is preferring the 079032-specific bearing-hanger branch inside the AMM 65-11-00 family.",
  }),
  buildExecutableRule({
    ruleCode: "AIRMS_RULE_102",
    title: "POST MOD 078542 bearing-hanger tasks should trigger the 078542 bearing-hanger path",
    category: "inspection-criteria",
    riskLevel: "High",
    possibleIssue: "Bearing-hanger task may require the exact POST MOD 078542 criteria.",
    component: "Tail Drive Line / Bearing Hangers POST MOD 078542",
    description:
      "Executable rule that uses structured ATA 65-11 metadata and explicit 078542 applicability to choose the exact post-mod bearing-hanger branch.",
    conditions: [
      { fact: "tasks.ata.chapter65.section11Count", operator: ">", value: 0 },
      { fact: "tasks.component.tailDriveLineBearingHangersCount", operator: ">", value: 0 },
      { fact: "tasks.mod.postCount", operator: ">", value: 0 },
      { fact: "tasks.mod.number.078542Count", operator: ">", value: 0 },
    ],
    recommendedActions: [
      "Use the explicit POST MOD 078542 bearing-hanger branch before selecting the exact AMM task path.",
      "Keep this task on the 078542-specific route instead of the broader post-mod bearing-hanger family.",
      "Review whether the source checklist item also references the related 079017 or 079032 family language.",
    ],
    manualReference:
      "AMM 65-11-00,6-15 Visual Inspection - Bearings Hangers POST MOD 079017 or POST MOD 079032 or POST MOD 078542",
    explanationTemplate:
      "Structured checklist metadata identifies an ATA 65-11 bearing-hanger task with explicit POST MOD 078542 applicability, so the inference engine is preferring the 078542-specific bearing-hanger branch inside the AMM 65-11-00 family.",
  }),
  buildExecutableRule({
    ruleCode: "AIRMS_RULE_103",
    title: "PRE MOD 076544 control-plate-bearing tasks should trigger the pre-mod bearing path",
    category: "inspection-criteria",
    riskLevel: "High",
    possibleIssue: "Control-plate-bearing task may require the exact PRE MOD 076544 criteria.",
    component: "Tail Gear Box / Control Plate Bearing PRE MOD 076544",
    description:
      "Executable rule that uses structured ATA 65-21 metadata and modification applicability to choose the pre-mod control-plate-bearing branch.",
    conditions: [
      { fact: "tasks.ata.chapter65.section21Count", operator: ">", value: 0 },
      { fact: "tasks.component.tailGearBoxControlPlateBearingCount", operator: ">", value: 0 },
      { fact: "tasks.mod.preCount", operator: ">", value: 0 },
      { fact: "tasks.mod.number.076544Count", operator: ">", value: 0 },
    ],
    recommendedActions: [
      "Use the PRE MOD 076544 control-plate-bearing branch before selecting the exact AMM task path.",
      "Keep this task on the pre-mod control-plate-bearing route instead of the broad TGB family.",
      "Review whether the source checklist item also references later 076550 or 076551 applicability.",
    ],
    manualReference:
      "AMM 65-21-00,6-8 Inspection criteria - Control plate bearing PRE MOD 076544 or POST MOD 076544 and PRE MOD 076551",
    explanationTemplate:
      "Structured checklist metadata identifies an ATA 65-21 control-plate-bearing task with PRE MOD 076544 applicability, so the inference engine is preferring the pre-mod control-plate-bearing branch inside the AMM 65-21-00 family.",
  }),
  buildExecutableRule({
    ruleCode: "AIRMS_RULE_104",
    title: "POST MOD 076550 control-plate-bearing tasks should trigger the 076550 bearing path",
    category: "inspection-criteria",
    riskLevel: "High",
    possibleIssue: "Control-plate-bearing task may require the exact POST MOD 076550 criteria.",
    component: "Tail Gear Box / Control Plate Bearing POST MOD 076550",
    description:
      "Executable rule that uses structured ATA 65-21 metadata and modification applicability to choose the 076550 control-plate-bearing branch.",
    conditions: [
      { fact: "tasks.ata.chapter65.section21Count", operator: ">", value: 0 },
      { fact: "tasks.component.tailGearBoxControlPlateBearingCount", operator: ">", value: 0 },
      { fact: "tasks.mod.postCount", operator: ">", value: 0 },
      { fact: "tasks.mod.number.076550Count", operator: ">", value: 0 },
    ],
    recommendedActions: [
      "Use the POST MOD 076550 control-plate-bearing branch before selecting the exact AMM task path.",
      "Keep this task on the 076550-specific control-plate-bearing route instead of the broader bearing family.",
      "Review whether the source checklist item also references the surrounding 076544 / 076551 family splits.",
    ],
    manualReference:
      "AMM 65-21-00,6-8 Inspection criteria - Control plate bearing POST MOD 076550 or POST MOD 075606",
    explanationTemplate:
      "Structured checklist metadata identifies an ATA 65-21 control-plate-bearing task with POST MOD 076550 applicability, so the inference engine is preferring the 076550 control-plate-bearing branch inside the AMM 65-21-00 family.",
  }),
  buildExecutableRule({
    ruleCode: "AIRMS_RULE_105",
    title: "PRE MOD 076551 control-plate-bearing tasks should trigger the pre-076551 bearing path",
    category: "inspection-criteria",
    riskLevel: "High",
    possibleIssue: "Control-plate-bearing task may require the exact PRE MOD 076551 criteria.",
    component: "Tail Gear Box / Control Plate Bearing PRE MOD 076551",
    description:
      "Executable rule that uses structured ATA 65-21 metadata and modification applicability to choose the pre-076551 control-plate-bearing branch.",
    conditions: [
      { fact: "tasks.ata.chapter65.section21Count", operator: ">", value: 0 },
      { fact: "tasks.component.tailGearBoxControlPlateBearingCount", operator: ">", value: 0 },
      { fact: "tasks.mod.preCount", operator: ">", value: 0 },
      { fact: "tasks.mod.number.076551Count", operator: ">", value: 0 },
    ],
    recommendedActions: [
      "Use the PRE MOD 076551 control-plate-bearing branch before selecting the exact AMM task path.",
      "Keep this task on the pre-076551 control-plate-bearing route instead of the broader bearing family.",
      "Review whether the source checklist item also references the paired 076544 applicability wording.",
    ],
    manualReference:
      "AMM 65-21-00,6-8 Inspection criteria - Control plate bearing POST MOD 076551 and PRE MOD 076550 | AMM 65-21-00,6-8 Inspection criteria - Control plate bearing PRE MOD 076544 or POST MOD 076544 and PRE MOD 076551",
    explanationTemplate:
      "Structured checklist metadata identifies an ATA 65-21 control-plate-bearing task with PRE MOD 076551 applicability, so the inference engine is preferring the pre-076551 control-plate-bearing branch inside the AMM 65-21-00 family.",
  }),
  buildExecutableRule({
    ruleCode: "AIRMS_RULE_106",
    title: "POST MOD 075606 or 076602 pitch-change-rod tasks should trigger the post-mod rod path",
    category: "inspection-criteria",
    riskLevel: "High",
    possibleIssue: "Pitch-change-rod task may require the exact POST MOD elastomer-rod criteria.",
    component: "Tail Gear Box / Pitch Change Rods POST MOD 075606 or 076602",
    description:
      "Executable rule that uses structured ATA 65-21 metadata and modification applicability to choose the post-mod pitch-change-rod branch.",
    conditions: [
      { fact: "tasks.ata.chapter65.section21Count", operator: ">", value: 0 },
      { fact: "tasks.component.tailGearBoxPitchChangeRodsCount", operator: ">", value: 0 },
      { fact: "tasks.mod.postCount", operator: ">", value: 0 },
      { fact: "tasks.mod.number.075606Count", operator: ">", value: 0 },
    ],
    recommendedActions: [
      "Use the POST MOD elastomer pitch-change-rod branch before selecting the exact AMM task path.",
      "Check whether the source checklist item also references POST MOD 076602 explicitly.",
      "Keep this task on the post-mod rod route instead of the broad TGB family.",
    ],
    manualReference:
      "AMM 65-21-00,6-11 Detailed Inspection Criteria - Elastomer Pitch Change Rods POST MOD 075606 or POST MOD 076602 | AMM 65-21-00,6-21 Detailed Inspection Criteria - Check of Elastomer Pitch Change Rods POST MOD 075606 or POST MOD 076602",
    explanationTemplate:
      "Structured checklist metadata identifies an ATA 65-21 pitch-change-rod task with post-mod 075606 applicability, so the inference engine is preferring the post-mod elastomer-rod branch inside the AMM 65-21-00 family.",
  }),
  buildExecutableRule({
    ruleCode: "AIRMS_RULE_107",
    title: "POST MOD 076602 pitch-change-rod tasks should trigger the 076602 rod path",
    category: "inspection-criteria",
    riskLevel: "High",
    possibleIssue: "Pitch-change-rod task may require the exact POST MOD 076602 elastomer-rod criteria.",
    component: "Tail Gear Box / Pitch Change Rods POST MOD 076602",
    description:
      "Executable rule that uses structured ATA 65-21 metadata and explicit 076602 applicability to choose the exact post-mod pitch-change-rod branch.",
    conditions: [
      { fact: "tasks.ata.chapter65.section21Count", operator: ">", value: 0 },
      { fact: "tasks.component.tailGearBoxPitchChangeRodsCount", operator: ">", value: 0 },
      { fact: "tasks.mod.postCount", operator: ">", value: 0 },
      { fact: "tasks.mod.number.076602Count", operator: ">", value: 0 },
    ],
    recommendedActions: [
      "Use the explicit POST MOD 076602 elastomer pitch-change-rod branch before selecting the exact AMM task path.",
      "Keep this task on the 076602-specific rod route instead of the broader post-mod rod family.",
      "Review whether the source checklist item also references the related POST MOD 075606 wording.",
    ],
    manualReference:
      "AMM 65-21-00,6-11 Detailed Inspection Criteria - Elastomer Pitch Change Rods POST MOD 075606 or POST MOD 076602 | AMM 65-21-00,6-21 Detailed Inspection Criteria - Check of Elastomer Pitch Change Rods POST MOD 075606 or POST MOD 076602",
    explanationTemplate:
      "Structured checklist metadata identifies an ATA 65-21 pitch-change-rod task with explicit POST MOD 076602 applicability, so the inference engine is preferring the 076602-specific elastomer-rod branch inside the AMM 65-21-00 family.",
  }),
  buildExecutableRule({
    ruleCode: "AIRMS_RULE_108",
    title: "Structured ATA 63-31 laminated-stop tasks should trigger the exact laminated-stop path",
    category: "inspection-criteria",
    riskLevel: "High",
    possibleIssue: "Bi-directional suspension laminated-stop task may require exact laminated-stop criteria.",
    component: "Bi-directional Suspension / Laminated Stops",
    description:
      "Executable rule that uses structured ATA 63-31 checklist metadata to route laminated-stop cases.",
    conditions: [
      { fact: "tasks.ata.chapter63.section31Count", operator: ">", value: 0 },
      { fact: "tasks.component.biDirectionalSuspensionLaminatedStopsCount", operator: ">", value: 0 },
    ],
    recommendedActions: [
      "Route the task to the AMM 63-31-00 laminated-stop criteria.",
      "Keep laminated-stop routing separate from crossbeam, block-pin, and block-support cases.",
      "Review installed suspension configuration before follow-up.",
    ],
    manualReference:
      "AMM 63-31-00,6-5 Laminated stops",
    explanationTemplate:
      "Structured checklist metadata identifies an ATA 63-31 laminated-stop task, so the inference engine is selecting the exact laminated-stop branch inside the AMM 63-31-00 suspension family.",
  }),
  buildExecutableRule({
    ruleCode: "AIRMS_RULE_109",
    title: "Structured ATA 63-31 block-pin tasks should trigger the exact block-pin path",
    category: "inspection-criteria",
    riskLevel: "High",
    possibleIssue: "Bi-directional suspension block-pin task may require exact block-pin criteria.",
    component: "Bi-directional Suspension / Block Pins",
    description:
      "Executable rule that uses structured ATA 63-31 checklist metadata to route laminated suspension block-pin cases.",
    conditions: [
      { fact: "tasks.ata.chapter63.section31Count", operator: ">", value: 0 },
      { fact: "tasks.component.biDirectionalSuspensionBlockPinsCount", operator: ">", value: 0 },
    ],
    recommendedActions: [
      "Route the task to the AMM 63-31-00 laminated suspension block-pin criteria.",
      "Keep block-pin routing separate from crossbeam, laminated-stop, and block-support cases.",
      "Review installed suspension hardware before follow-up.",
    ],
    manualReference:
      "AMM 63-31-00,6-3 Laminated suspension block pins",
    explanationTemplate:
      "Structured checklist metadata identifies an ATA 63-31 block-pin task, so the inference engine is selecting the exact block-pin branch inside the AMM 63-31-00 suspension family.",
  }),
  buildExecutableRule({
    ruleCode: "AIRMS_RULE_110",
    title: "Structured ATA 63-31 block-support tasks should trigger the exact block-support path",
    category: "inspection-criteria",
    riskLevel: "High",
    possibleIssue: "Bi-directional suspension block-support task may require exact block-support criteria.",
    component: "Bi-directional Suspension / Block Supports",
    description:
      "Executable rule that uses structured ATA 63-31 checklist metadata to route laminated suspension block-support cases.",
    conditions: [
      { fact: "tasks.ata.chapter63.section31Count", operator: ">", value: 0 },
      { fact: "tasks.component.biDirectionalSuspensionBlockSupportsCount", operator: ">", value: 0 },
    ],
    recommendedActions: [
      "Route the task to the AMM 63-31-00 laminated suspension block-support criteria.",
      "Keep block-support routing separate from crossbeam, laminated-stop, and block-pin cases.",
      "Review installed suspension hardware before follow-up.",
    ],
    manualReference:
      "AMM 63-31-00,6-2 Laminated suspension block supports",
    explanationTemplate:
      "Structured checklist metadata identifies an ATA 63-31 block-support task, so the inference engine is selecting the exact block-support branch inside the AMM 63-31-00 suspension family.",
  }),
  buildExecutableRule({
    ruleCode: "AIRMS_RULE_111",
    title: "Structured ATA 63-32 suspension-bar-bolt tasks should trigger the exact bolt-inspection path",
    category: "inspection-criteria",
    riskLevel: "High",
    possibleIssue: "MGB suspension bar bolt task may require exact visual or detailed bolt criteria.",
    component: "MGB Suspension Bar / Bolt",
    description:
      "Executable rule that uses structured ATA 63-32 checklist metadata to route MGB suspension bar bolt cases.",
    conditions: [
      { fact: "tasks.ata.chapter63.section32Count", operator: ">", value: 0 },
      { fact: "tasks.component.mgbSuspensionBarBoltCount", operator: ">", value: 0 },
    ],
    recommendedActions: [
      "Route the task to the AMM 63-32-00 MGB suspension-bar-bolt criteria.",
      "Review whether the checklist item is the visual or detailed bolt inspection path.",
      "Keep bolt-specific routing separate from the base MGB bar family.",
    ],
    manualReference:
      "AMM 63-32-00,6-2 Detailed inspection criteria for MGB suspension bar bolt | AMM 63-32-00,6-4 Visual inspection criteria for MGB suspension bar bolt",
    explanationTemplate:
      "Structured checklist metadata identifies an ATA 63-32 suspension-bar-bolt task, so the inference engine is selecting the exact bolt-inspection branch inside the AMM 63-32-00 MGB suspension bar family.",
  }),
  buildExecutableRule({
    ruleCode: "AIRMS_RULE_112",
    title: "POST MOD 075606 control-plate-bearing tasks should trigger the 075606 bearing path",
    category: "inspection-criteria",
    riskLevel: "High",
    possibleIssue: "Control-plate-bearing task may require the exact POST MOD 075606 criteria.",
    component: "Tail Gear Box / Control Plate Bearing POST MOD 075606",
    description:
      "Executable rule that uses structured ATA 65-21 metadata and modification applicability to choose the 075606 control-plate-bearing branch.",
    conditions: [
      { fact: "tasks.ata.chapter65.section21Count", operator: ">", value: 0 },
      { fact: "tasks.component.tailGearBoxControlPlateBearingCount", operator: ">", value: 0 },
      { fact: "tasks.mod.postCount", operator: ">", value: 0 },
      { fact: "tasks.mod.number.075606Count", operator: ">", value: 0 },
    ],
    recommendedActions: [
      "Use the POST MOD 075606 control-plate-bearing branch before selecting the exact AMM task path.",
      "Keep this task on the 075606-specific control-plate-bearing route instead of the broader bearing family.",
      "Review whether the source checklist item also references the related POST MOD 076550 wording.",
    ],
    manualReference:
      "AMM 65-21-00,6-8 Inspection criteria - Control plate bearing POST MOD 076550 or POST MOD 075606",
    explanationTemplate:
      "Structured checklist metadata identifies an ATA 65-21 control-plate-bearing task with POST MOD 075606 applicability, so the inference engine is preferring the 075606 control-plate-bearing branch inside the AMM 65-21-00 family.",
  }),
  buildExecutableRule({
    ruleCode: "AIRMS_RULE_113",
    title: "Structured ATA 67-31 servocontrol tasks should trigger rotor-actuator inspection routing",
    category: "inspection-criteria",
    riskLevel: "High",
    possibleIssue: "Dual-hydraulic servocontrol task may require exact rotor-actuator inspection criteria.",
    component: "Servocontrols / Rotor Actuators",
    description:
      "Executable rule that uses structured ATA 67-31 checklist metadata to route dual-hydraulic servocontrol and rotor-actuator tasks.",
    conditions: [
      { fact: "tasks.ata.chapter67.section31Count", operator: ">", value: 0 },
      { fact: "tasks.component.rotorActuatorsDualHydraulicCount", operator: ">", value: 0 },
    ],
    recommendedActions: [
      "Keep the task in the AMM 67-31-00 servocontrol / rotor-actuator family based on structured checklist metadata.",
      "Review the source checklist item for dual-hydraulic actuator-specific inspection context before closure.",
      "Use the dedicated rotor-actuator criteria instead of generic hydraulic discrepancy handling.",
    ],
    manualReference:
      "AMM 67-31-00,6-1 Inspection Criteria - Servocontrols - Rotor actuators (Dual Hydraulic)",
    explanationTemplate:
      "Structured checklist metadata places the current task in ATA 67-31 with dual-hydraulic rotor-actuator context, so the inference engine is routing it into the AMM 67-31-00 servocontrol inspection family.",
  }),
  buildExecutableRule({
    ruleCode: "AIRMS_RULE_114",
    title: "Structured ATA 63-11 gimbal-hardware tasks should trigger the gimbal path",
    category: "inspection-criteria",
    riskLevel: "High",
    possibleIssue: "Gimbal hardware task may require exact gimbal-ring or gimbal-pin criteria.",
    component: "Engine / MGB Drive Line / Gimbal Hardware",
    description:
      "Executable rule that uses structured ATA 63-11 checklist metadata to route gimbal ring and gimbal ring pin cases.",
    conditions: [
      { fact: "tasks.ata.chapter63.section11Count", operator: ">", value: 0 },
      { fact: "tasks.component.engineMgbDriveLineGimbalCount", operator: ">", value: 0 },
    ],
    recommendedActions: [
      "Route the task to the AMM 63-11-00 gimbal ring or gimbal ring pin criteria.",
      "Keep gimbal-hardware routing separate from belt, bearing, coupling, and shaft cases.",
      "Review whether the source checklist item points to the ring or the pin specifically.",
    ],
    manualReference:
      "AMM 63-11-00,6-6 Gimbal ring | AMM 63-11-00,6-7 Gimbal ring pin",
    explanationTemplate:
      "Structured checklist metadata identifies an ATA 63-11 gimbal-hardware task, so the inference engine is selecting the exact gimbal-hardware branch inside the AMM 63-11-00 family.",
  }),
  buildExecutableRule({
    ruleCode: "AIRMS_RULE_115",
    title: "Structured ATA 63-11 drive-shaft tasks should trigger the MGB-drive-shaft path",
    category: "inspection-criteria",
    riskLevel: "High",
    possibleIssue: "MGB drive shaft task may require exact drive-shaft inspection criteria.",
    component: "Engine / MGB Drive Line / MGB Drive Shaft",
    description:
      "Executable rule that uses structured ATA 63-11 checklist metadata to route MGB drive-shaft cases.",
    conditions: [
      { fact: "tasks.ata.chapter63.section11Count", operator: ">", value: 0 },
      { fact: "tasks.component.engineMgbDriveLineDriveShaftCount", operator: ">", value: 0 },
    ],
    recommendedActions: [
      "Route the task to the AMM 63-11-00 MGB drive-shaft criteria.",
      "Keep drive-shaft routing separate from gimbal, flange, coupling-housing, and pulley cases.",
      "Review whether the source checklist item is specifically tied to the MGB drive shaft.",
    ],
    manualReference:
      "AMM 63-11-00,6-8 MGB drive shaft",
    explanationTemplate:
      "Structured checklist metadata identifies an ATA 63-11 drive-shaft task, so the inference engine is selecting the exact MGB-drive-shaft branch inside the AMM 63-11-00 family.",
  }),
  buildExecutableRule({
    ruleCode: "AIRMS_RULE_116",
    title: "Structured ATA 63-11 drive-flange tasks should trigger the drive-flange path",
    category: "inspection-criteria",
    riskLevel: "High",
    possibleIssue: "Drive flange task may require exact drive-flange criteria.",
    component: "Engine / MGB Drive Line / Drive Flange",
    description:
      "Executable rule that uses structured ATA 63-11 checklist metadata to route belt-driven hydraulic pump drive-flange cases.",
    conditions: [
      { fact: "tasks.ata.chapter63.section11Count", operator: ">", value: 0 },
      { fact: "tasks.component.engineMgbDriveLineDriveFlangeCount", operator: ">", value: 0 },
    ],
    recommendedActions: [
      "Route the task to the AMM 63-11-00 drive-flange criteria.",
      "Keep drive-flange routing separate from engine-flange, pulley, housing, and coupling cases.",
      "Review whether the source checklist item specifically references the belt-driven hydraulic pump drive flange.",
    ],
    manualReference:
      "AMM 63-11-00,6-11 Belt-driven hydraulic pump drive flange",
    explanationTemplate:
      "Structured checklist metadata identifies an ATA 63-11 drive-flange task, so the inference engine is selecting the exact drive-flange branch inside the AMM 63-11-00 family.",
  }),
  buildExecutableRule({
    ruleCode: "AIRMS_RULE_117",
    title: "Structured ATA 63-11 engine-flange tasks should trigger the engine-flange path",
    category: "inspection-criteria",
    riskLevel: "High",
    possibleIssue: "Engine flange task may require exact engine-flange criteria.",
    component: "Engine / MGB Drive Line / Engine Flange",
    description:
      "Executable rule that uses structured ATA 63-11 checklist metadata to route engine-flange cases.",
    conditions: [
      { fact: "tasks.ata.chapter63.section11Count", operator: ">", value: 0 },
      { fact: "tasks.component.engineMgbDriveLineEngineFlangeCount", operator: ">", value: 0 },
    ],
    recommendedActions: [
      "Route the task to the AMM 63-11-00 engine-flange criteria.",
      "Keep engine-flange routing separate from drive-flange, housing, and pulley cases.",
      "Review whether the source checklist item is specifically tied to the engine flange.",
    ],
    manualReference:
      "AMM 63-11-00,6-9 Engine flange",
    explanationTemplate:
      "Structured checklist metadata identifies an ATA 63-11 engine-flange task, so the inference engine is selecting the exact engine-flange branch inside the AMM 63-11-00 family.",
  }),
  buildExecutableRule({
    ruleCode: "AIRMS_RULE_118",
    title: "Structured ATA 63-11 coupling-housing tasks should trigger the coupling-housing path",
    category: "inspection-criteria",
    riskLevel: "High",
    possibleIssue: "Coupling-housing task may require exact engine or MGB coupling-housing criteria.",
    component: "Engine / MGB Drive Line / Coupling Housing",
    description:
      "Executable rule that uses structured ATA 63-11 checklist metadata to route engine and MGB coupling-housing cases.",
    conditions: [
      { fact: "tasks.ata.chapter63.section11Count", operator: ">", value: 0 },
      { fact: "tasks.component.engineMgbDriveLineCouplingHousingCount", operator: ">", value: 0 },
    ],
    recommendedActions: [
      "Route the task to the AMM 63-11-00 engine or MGB coupling-housing criteria.",
      "Review whether the source checklist item concerns the engine coupling housing or the MGB coupling housing.",
      "Keep coupling-housing routing separate from flange, shaft, pulley, and coupling cases.",
    ],
    manualReference:
      "AMM 63-11-00,6-4 MGB coupling housing | AMM 63-11-00,6-5 Engine coupling housing",
    explanationTemplate:
      "Structured checklist metadata identifies an ATA 63-11 coupling-housing task, so the inference engine is selecting the exact coupling-housing branch inside the AMM 63-11-00 family.",
  }),
  buildExecutableRule({
    ruleCode: "AIRMS_RULE_119",
    title: "Structured ATA 63-11 driven-pulley tasks should trigger the driven-pulley path",
    category: "inspection-criteria",
    riskLevel: "High",
    possibleIssue: "Driven pulley task may require exact driven-pulley inspection criteria.",
    component: "Engine / MGB Drive Line / Driven Pulley",
    description:
      "Executable rule that uses structured ATA 63-11 checklist metadata to route belt-driven hydraulic pump driven-pulley cases.",
    conditions: [
      { fact: "tasks.ata.chapter63.section11Count", operator: ">", value: 0 },
      { fact: "tasks.component.engineMgbDriveLineDrivenPulleyCount", operator: ">", value: 0 },
    ],
    recommendedActions: [
      "Route the task to the AMM 63-11-00 driven-pulley criteria.",
      "Keep driven-pulley routing separate from belt, bearing, flange, and housing cases.",
      "Review whether the source checklist item specifically references the Poly V driven pulley.",
    ],
    manualReference:
      "AMM 63-11-00,6-14 Belt-driven hydraulic pump driven pulley (Poly V)",
    explanationTemplate:
      "Structured checklist metadata identifies an ATA 63-11 driven-pulley task, so the inference engine is selecting the exact driven-pulley branch inside the AMM 63-11-00 family.",
  }),
  buildExecutableRule({
    ruleCode: "AIRMS_RULE_120",
    title: "Structured ATA 65-11 sliding-flange tasks should trigger the exact sliding-flange path",
    category: "inspection-criteria",
    riskLevel: "High",
    possibleIssue: "Sliding flange task may require exact tail-drive-line sliding-flange criteria.",
    component: "Tail Drive Line / Sliding Flange",
    description:
      "Executable rule that uses structured ATA 65-11 checklist metadata to route sliding-flange cases.",
    conditions: [
      { fact: "tasks.ata.chapter65.section11Count", operator: ">", value: 0 },
      { fact: "tasks.component.tailDriveLineSlidingFlangeCount", operator: ">", value: 0 },
    ],
    recommendedActions: [
      "Route the task to the AMM 65-11-00 sliding-flange criteria.",
      "Keep sliding-flange routing separate from rear-section, front-section, flexible-coupling, and bearing-hanger cases.",
      "Use the visual or detailed path that matches the maintenance context.",
    ],
    manualReference:
      "AMM 65-11-00,6-6 Inspection Criteria - Sliding Flange | AMM 65-11-00,6-16 Visual Inspection Criteria - Sliding Flange",
    explanationTemplate:
      "Structured checklist metadata identifies an ATA 65-11 sliding-flange task, so the inference engine is selecting the exact sliding-flange branch inside the AMM 65-11-00 family.",
  }),
  buildExecutableRule({
    ruleCode: "AIRMS_RULE_121",
    title: "Structured ATA 65-11 flexible-coupling tasks should trigger the exact coupling path",
    category: "inspection-criteria",
    riskLevel: "High",
    possibleIssue: "Flexible coupling task may require exact tail-drive-line coupling criteria.",
    component: "Tail Drive Line / Flexible Coupling",
    description:
      "Executable rule that uses structured ATA 65-11 checklist metadata to route flexible-coupling cases.",
    conditions: [
      { fact: "tasks.ata.chapter65.section11Count", operator: ">", value: 0 },
      { fact: "tasks.component.tailDriveLineFlexibleCouplingCount", operator: ">", value: 0 },
    ],
    recommendedActions: [
      "Route the task to the AMM 65-11-00 flexible-coupling criteria.",
      "Keep flexible-coupling routing separate from flange, shaft-section, and bearing-hanger cases.",
      "Use the detailed, visual, or attachment path that matches the source checklist item.",
    ],
    manualReference:
      "AMM 65-11-00,6-4 Detailed Inspection Criteria - Flexible Coupling | AMM 65-11-00,6-7 Flexible Coupling Attachment | AMM 65-11-00,6-14 Visual Inspection Criteria - Flexible Coupling",
    explanationTemplate:
      "Structured checklist metadata identifies an ATA 65-11 flexible-coupling task, so the inference engine is selecting the exact flexible-coupling branch inside the AMM 65-11-00 family.",
  }),
  buildExecutableRule({
    ruleCode: "AIRMS_RULE_122",
    title: "Structured ATA 65-11 rear-section tasks should trigger the exact rear-section path",
    category: "inspection-criteria",
    riskLevel: "High",
    possibleIssue: "Rear section task may require exact tail-drive-line rear-section criteria.",
    component: "Tail Drive Line / Rear Section",
    description:
      "Executable rule that uses structured ATA 65-11 checklist metadata to route rear-section cases.",
    conditions: [
      { fact: "tasks.ata.chapter65.section11Count", operator: ">", value: 0 },
      { fact: "tasks.component.tailDriveLineRearSectionCount", operator: ">", value: 0 },
    ],
    recommendedActions: [
      "Route the task to the AMM 65-11-00 rear-section criteria.",
      "Keep rear-section routing separate from front-section, flange, coupling, and bearing-hanger cases.",
      "Use the detailed, visual, or inside-rear-section path that matches the source checklist item.",
    ],
    manualReference:
      "AMM 65-11-00,6-3 Detailed Inspection Criteria - Rear Shaft Section | AMM 65-11-00,6-13 Visual Inspection Criteria - Rear Shaft Section | AMM 65-11-00,6-29 Inspection criteria for the inside of the rear section",
    explanationTemplate:
      "Structured checklist metadata identifies an ATA 65-11 rear-section task, so the inference engine is selecting the exact rear-section branch inside the AMM 65-11-00 family.",
  }),
  buildExecutableRule({
    ruleCode: "AIRMS_RULE_123",
    title: "Structured ATA 65-11 front-section tasks should trigger the exact front-section path",
    category: "inspection-criteria",
    riskLevel: "High",
    possibleIssue: "Equipped front section task may require exact tail-drive-line front-section criteria.",
    component: "Tail Drive Line / Equipped Front Section",
    description:
      "Executable rule that uses structured ATA 65-11 checklist metadata to route equipped-front-section cases.",
    conditions: [
      { fact: "tasks.ata.chapter65.section11Count", operator: ">", value: 0 },
      { fact: "tasks.component.tailDriveLineFrontSectionCount", operator: ">", value: 0 },
    ],
    recommendedActions: [
      "Route the task to the AMM 65-11-00 equipped-front-section criteria.",
      "Keep front-section routing separate from rear-section, flange, coupling, and bearing-hanger cases.",
      "Use the visual or detailed path that matches the source checklist item.",
    ],
    manualReference:
      "AMM 65-11-00,6-1 Detailed Inspection Criteria - Equipped front section | AMM 65-11-00,6-11 Visual Inspection Criteria - Equipped front section",
    explanationTemplate:
      "Structured checklist metadata identifies an ATA 65-11 equipped-front-section task, so the inference engine is selecting the exact front-section branch inside the AMM 65-11-00 family.",
  }),
  buildExecutableRule({
    ruleCode: "AIRMS_RULE_124",
    title: "Structured ATA 65-21 housing tasks should trigger the exact TGB-housing path",
    category: "inspection-criteria",
    riskLevel: "High",
    possibleIssue: "TGB housing task may require exact housing criteria.",
    component: "Tail Gear Box / Housing",
    description:
      "Executable rule that uses structured ATA 65-21 checklist metadata to route TGB-housing cases.",
    conditions: [
      { fact: "tasks.ata.chapter65.section21Count", operator: ">", value: 0 },
      { fact: "tasks.component.tailGearBoxHousingCount", operator: ">", value: 0 },
    ],
    recommendedActions: [
      "Route the task to the AMM 65-21-00 TGB-housing criteria.",
      "Keep housing routing separate from rotor-shaft, lever, rod, and bearing cases.",
      "Review any airworthiness-linked housing context before follow-up.",
    ],
    manualReference:
      "AMM 65-21-00,6-13 Inspection Criteria - TGB housing - Tail Gear Box",
    explanationTemplate:
      "Structured checklist metadata identifies an ATA 65-21 TGB-housing task, so the inference engine is selecting the exact housing branch inside the AMM 65-21-00 family.",
  }),
  buildExecutableRule({
    ruleCode: "AIRMS_RULE_125",
    title: "Structured ATA 65-21 rotor-shaft tasks should trigger the exact rotor-shaft path",
    category: "inspection-criteria",
    riskLevel: "High",
    possibleIssue: "TGB rotor shaft task may require exact rotor-shaft criteria.",
    component: "Tail Gear Box / Rotor Shaft",
    description:
      "Executable rule that uses structured ATA 65-21 checklist metadata to route rotor-shaft cases.",
    conditions: [
      { fact: "tasks.ata.chapter65.section21Count", operator: ">", value: 0 },
      { fact: "tasks.component.tailGearBoxRotorShaftCount", operator: ">", value: 0 },
    ],
    recommendedActions: [
      "Route the task to the AMM 65-21-00 rotor-shaft criteria.",
      "Keep rotor-shaft routing separate from housing, lever, rod, and bearing cases.",
      "Review whether the source checklist item is specifically tied to the TGB rotor shaft.",
    ],
    manualReference:
      "AMM 65-21-00,6-19 Inspection Criteria - Rotor Shaft - Tail Gear Box",
    explanationTemplate:
      "Structured checklist metadata identifies an ATA 65-21 rotor-shaft task, so the inference engine is selecting the exact rotor-shaft branch inside the AMM 65-21-00 family.",
  }),
  buildExecutableRule({
    ruleCode: "AIRMS_RULE_126",
    title: "Structured ATA 65-21 control-lever tasks should trigger the exact control-lever path",
    category: "inspection-criteria",
    riskLevel: "High",
    possibleIssue: "TGB control lever task may require exact control-lever criteria.",
    component: "Tail Gear Box / Control Lever",
    description:
      "Executable rule that uses structured ATA 65-21 checklist metadata to route control-lever cases.",
    conditions: [
      { fact: "tasks.ata.chapter65.section21Count", operator: ">", value: 0 },
      { fact: "tasks.component.tailGearBoxControlLeverCount", operator: ">", value: 0 },
    ],
    recommendedActions: [
      "Route the task to the AMM 65-21-00 control-lever criteria.",
      "Review whether the checklist item concerns with-removal, without-removal, or bushes / yoke-lug control-lever work.",
      "Keep control-lever routing separate from housing, shaft, rod, and bearing cases.",
    ],
    manualReference:
      "AMM 65-21-00,6-27 Control lever with removal | AMM 65-21-00,6-12 Control Lever without removal | AMM 65-21-00,6-24 Control lever bushes and yoke lug",
    explanationTemplate:
      "Structured checklist metadata identifies an ATA 65-21 control-lever task, so the inference engine is selecting the exact control-lever branch inside the AMM 65-21-00 family.",
  }),
  buildExecutableRule({
    ruleCode: "AIRMS_RULE_127",
    title: "Structured ATA 64-10 edge-tab tasks should trigger the exact edge-tab path",
    category: "inspection-criteria",
    riskLevel: "High",
    possibleIssue: "Edge-tab task may require exact tail-rotor-blade edge-tab criteria.",
    component: "Tail Rotor Blades / Edge Tab",
    description:
      "Executable rule that uses structured ATA 64-10 checklist metadata to route edge-tab cases.",
    conditions: [
      { fact: "tasks.ata.chapter64.section10Count", operator: ">", value: 0 },
      { fact: "tasks.component.tailRotorBladesEdgeTabCount", operator: ">", value: 0 },
    ],
    recommendedActions: [
      "Route the task to the AMM 64-10-00 edge-tab criteria.",
      "Keep edge-tab routing separate from inserted-tab blade, pitch-horn, and chin-weight blanking-hardware cases.",
      "Review whether the source checklist item is specifically tied to the edge tab.",
    ],
    manualReference:
      "AMM 64-10-00,6-6 Inspection Criteria - Edge tab - Tail rotor blades",
    explanationTemplate:
      "Structured checklist metadata identifies an ATA 64-10 edge-tab task, so the inference engine is selecting the exact edge-tab branch inside the AMM 64-10-00 family.",
  }),
  buildExecutableRule({
    ruleCode: "AIRMS_RULE_128",
    title: "Structured ATA 64-10 chin-weight blanking-hardware tasks should trigger the exact blanking-hardware path",
    category: "inspection-criteria",
    riskLevel: "High",
    possibleIssue: "Chin-weight blanking-hardware task may require exact blanking-hardware criteria.",
    component: "Tail Rotor Blades / Chin-Weight Blanking Hardware",
    description:
      "Executable rule that uses structured ATA 64-10 checklist metadata to route chin-weight blanking-cap and blanking-cover cases.",
    conditions: [
      { fact: "tasks.ata.chapter64.section10Count", operator: ">", value: 0 },
      { fact: "tasks.component.tailRotorBladesChinWeightsCount", operator: ">", value: 0 },
    ],
    recommendedActions: [
      "Route the task to the AMM 64-10-00 chin-weight blanking-hardware criteria.",
      "Keep blanking-hardware routing separate from inserted-tab blade, pitch-horn, and edge-tab cases.",
      "Use the visual or detailed path that matches the source checklist item.",
    ],
    manualReference:
      "AMM 64-10-00,6-11 Visual Inspection Criteria - Blanking Cover on the Chinese Weights | AMM 64-10-00,6-12 Detailed Inspection Criteria - Blanking Cap on Chin Weights",
    explanationTemplate:
      "Structured checklist metadata identifies an ATA 64-10 chin-weight blanking-hardware task, so the inference engine is selecting the exact blanking-hardware branch inside the AMM 64-10-00 family.",
  }),
];

module.exports = DEFAULT_MANUAL_RULES;
