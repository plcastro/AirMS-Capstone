const MINUTES_PER_HOUR = 60;
const MINIMUM_TASK_MINUTES = 60;
const BASE_TASK_MINUTES = 10;
const CONTEXT_SWITCH_MINUTES_PER_ITEM = 2;
const DEFAULT_ITEM_MINUTES = 12;

const normalizeText = (value = "") =>
  String(value)
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const buildExactDurationMap = (groups) => {
  const entries = groups.flatMap(({ minutes, names }) =>
    names.map((name) => [normalizeText(name), minutes]),
  );

  return new Map(entries);
};

const EXACT_TASK_MINUTES = buildExactDurationMap([
  {
    minutes: 8,
    names: [
      "APPAREO camera",
      "AIRS-400 Camera",
      "Calibration battery GI 275",
      "External light",
      "Emergency locator transmitter",
      "Cabin fire extinguisher",
      "Battery",
      "Battery pack",
      "Digital flowmeter - Battery",
      "Stand-by battery",
      "Twist grip - Switches",
      "Twist grip - Load spring",
      "Low fuel level warning",
      "Navigation system",
      "Yaw channel trim system",
      "Electrical power",
      "Fuel gaging system",
      "Hermetic fire detector",
      "Pilot's and copilot's gyroscopic and directional horizon",
      "Windshield, glazed panel, door window",
    ],
  },
  {
    minutes: 10,
    names: [
      "Belt and harness - Strap",
      "Cargo door",
      "Crew door",
      "Lateral cargo door",
      "Rear cargo compartment door",
      "Drop restraint ring",
      "Cabin ventilation airscoop",
      "Power plant air intake (ALF)",
      "Daily check in cold weather",
      "Pitot System",
      "Fueling system",
      "Searchlight - Aluminum gimbal arm",
      "Searchlight - Steel gimbal arm",
      "Pilot and copilot seats",
      "Pilot and copilot seats - Seat buckets and attachments",
      "Oxygen mask",
      "Cabin fire extinguisher",
      "FDRS - flight data recording",
    ],
  },
  {
    minutes: 12.5,
    names: [
      "Accumulator",
      "Blanking cap",
      "Chips detector",
      "Cylinder",
      "Fuel pump",
      "Hydraulic pump - Belt",
      "Hydraulic pump - Poly \"V\" belt",
      "Hydraulic pump - Belt drive",
      "Hydraulic pump - Drive seal",
      "Hydraulic pump - Drive bearing",
      "Hydraulic pump - Bearing",
      "Hydraulic pump - Drive-belt and bearing",
      "Hydraulic pump - Flexible coupling",
      "Mineral oil",
      "Synthetic oil",
      "Oil filter - Filter cartridge",
      "Fuel distribution - Fuel filter",
      "Fuel shut-off valve",
      "Emergency shut down - Fuel shut-off ball type control",
      "Fuel system",
      "Fuel tank",
      "Power plant",
      "Power plant installation",
      "Heating pipe",
      "Skid landing gear",
      "Skid type landing gear",
      "Suspension bar",
      "Horizontal stabilizer",
      "Upper and lower fin",
      "Longitudinal bulkheads",
      "Fuselage",
      "Structure",
      "Lightning and ancillaries control unit (LACU)",
      "Rotor brake",
      "Rotor brake - Ball-type control",
      "Rotor brake micro switch",
      "Scissor link",
      "Scissors bushings and attachment bolts",
      "Scissors drive coupling - Sealing bead",
      "Rubber sleeve",
      "Fueling system",
    ],
  },
  {
    minutes: 15,
    names: [
      "Main rotor blade",
      "Tail rotor blade",
      "Tail rotor blade horn",
      "Tail rotor control rod",
      "Tail rotor drive shaft",
      "Tail rotor drive shaft bearing bracket mounts",
      "Tail rotor flight controls",
      "Tail rotor shaft",
      "TGB - Pitch rod",
      "TRH pitch change unit",
      "TRH pitch change unit - Bearing",
      "TRH pitch change unit - Greasable bearing",
      "TRH pitch change unit - Labyrinth seal - Lock washer",
      "Pitch change rod",
      "Pitch change unit - Swivel bearing",
      "Pitch control lever - Yoke lugs",
      "Swashplate",
      "Swashplates",
      "Swashplate - 4 contacts bearing",
      "Rotating swashplate - 4 contacts bearing",
      "Main rotor flight controls",
      "Rotor mast - Upper visible section",
      "Main servocontrol",
      "Main servocontrol - Dual hydraulic system",
      "Main servocontrol - Single hydraulic system",
      "Servocontrol - Single hydraulic system",
      "Single hydraulic generation system - Servocontrol",
      "MGB Hydraulic pump",
      "MGB suspension cross bar",
      "Transmission deck",
      "MRH",
      "MRH - Upper casing attachment bolts/Flared housing",
      "Starflex star",
      "Starflex star - Swivel bearing",
      "Skin",
    ],
  },
  {
    minutes: 20,
    names: [
      "Engine-to-MGB coupling",
      "Engine-to-MGB coupling - Hydraulic",
      "Engine-to-MGB coupling - MGB",
      "Flexible coupling",
      "Tail rotor blade - Laminated pitch half-bearing",
      "Tail rotor drive shaft assembly",
      "Tail rotor drive shaft - Greasable bearing",
      "Main rotor mast",
      "MRH assy",
      "Tail rotor assy",
      "TRH",
      "TRH laminated hinge",
      "Flange - Flange screws",
      "MGB assembly - TGB assembly",
      "MRH - Main Rotor Mast - TRH - Tail rotor drive shaft - Engine/MGB coupling",
      "Bevel reduction gear",
      "Epicyclic reduction gear",
      "Free wheel",
      "Free wheel - Bearing",
      "Free wheel assembly",
      "Free wheel unit",
      "Front ball bearing of free wheel",
      "Rear ball bearing of free wheel",
      "Rear ball bearing of the assembly free wheel",
      "Vibration damper, spring type",
    ],
  },
  {
    minutes: 30,
    names: [
      "P-Check",
      "Spectrometric Oil Analysis Program (SOAP)",
      "Electric hoist 136 kg",
      "Electric hoist 136 kg - Cable",
      "Electric hoist 136 kg - Pyrotechnic cartridge",
      "Electric hoist 450 lbs",
      "Electric hoist 450 lbs - Cable",
      "Electric hoist 450 lbs - Pyrotechnic cartridge",
      "1400 kg cargo swing - Onboard load release unit",
      "Load release unit hook",
      "Starter generator",
      "Tail servocontrol",
      "TGB",
      "Oil pump",
      "MGB - Oil pump",
      "Oxygen cylinder",
      "Oxygen cylinder shell",
      "Freon air conditioning system - Compressor",
      "Freon air conditioning system - Belt",
      "FADEC unit",
      "Flir",
    ],
  },
]);

const KEYWORD_DURATION_RULES = [
  { minutes: 30, keywords: ["soap", "hoist", "overhaul", "cargo swing"] },
  {
    minutes: 20,
    keywords: [
      "coupling",
      "mast",
      "reduction gear",
      "free wheel",
      "damper",
      "laminated hinge",
      "bearing bracket mounts",
    ],
  },
  {
    minutes: 15,
    keywords: [
      "rotor",
      "swash",
      "pitch change",
      "servocontrol",
      "drive shaft",
      "trh",
      "mrh",
      "starflex",
      "transmission deck",
    ],
  },
  {
    minutes: 12.5,
    keywords: [
      "fuel",
      "oil",
      "hydraulic",
      "brake",
      "gear",
      "structure",
      "fuselage",
      "stabilizer",
      "fin",
      "electrical",
    ],
  },
  {
    minutes: 10,
    keywords: [
      "door",
      "window",
      "seat",
      "harness",
      "pitot",
      "camera",
      "light",
      "extinguisher",
      "battery",
      "detector",
      "navigation",
      "warning",
    ],
  },
];

const estimateChecklistItemMinutes = (item = {}) => {
  const taskName = normalizeText(item.taskName);

  if (EXACT_TASK_MINUTES.has(taskName)) {
    return EXACT_TASK_MINUTES.get(taskName);
  }

  const searchableText = normalizeText(
    [
      item.taskName,
      item.component,
      item.description,
      item.documentation,
      item.correctiveAction,
    ]
      .filter(Boolean)
      .join(" "),
  );

  const matchingRule = KEYWORD_DURATION_RULES.find((rule) =>
    rule.keywords.some((keyword) => searchableText.includes(keyword)),
  );

  return matchingRule ? matchingRule.minutes : DEFAULT_ITEM_MINUTES;
};

const estimateInspectionSchedule = (checklistItems = []) => {
  const validItems = checklistItems.filter(
    (item) => String(item && item.taskName ? item.taskName : "").trim().length > 0,
  );

  const checklistMinutes = validItems.reduce(
    (total, item) => total + estimateChecklistItemMinutes(item),
    0,
  );

  const totalMinutes = Math.max(
    MINIMUM_TASK_MINUTES,
    BASE_TASK_MINUTES +
      checklistMinutes +
      validItems.length * CONTEXT_SWITCH_MINUTES_PER_ITEM,
  );

  return {
    itemCount: validItems.length,
    minutes: totalMinutes,
    hours: Math.round((totalMinutes / MINUTES_PER_HOUR) * 100) / 100,
  };
};

module.exports = {
  estimateInspectionSchedule,
};
