const createEmptyComponentTotals = () => ({
  airframe: "",
  mrGearbox: { tsn: "", tso: "" },
  tr90Gearbox: { tsn: "", tso: "" },
  tr42Gearbox: { tsn: "", tso: "" },
  landingCycle: "",
  engine1: { tsn: "", tso: "", cycle: "" },
  engine2: { tsn: "", tso: "", cycle: "" },
  sling: "",
  others: "",
});

export const createEmptyB412Leg = () => ({
  stations: [{ from: "", to: "" }],
  blockTimeOn: "",
  blockTimeOff: "",
  flightTimeOn: "",
  flightTimeOff: "",
  totalTimeOn: "",
  totalTimeOff: "",
  date: "",
  passengers: "",
});

const createEmptyFuelRow = () => ({
  contCheck: "",
  mainTankRemaining: "",
  mainTankAdded: "",
  mainTankTotal: "",
  supplySystem1: "",
  supplySystem2: "",
  remarks: "",
  refuellerName: "",
  signature: "",
});

const createEmptyOilValues = () => ({
  remaining: "",
  added: "",
  total: "",
});

const createEmptyOilRow = () => ({
  mechanicSignature: "",
  engine1: createEmptyOilValues(),
  engine2: createEmptyOilValues(),
  mrGearbox: createEmptyOilValues(),
  reductionGearbox: createEmptyOilValues(),
  tr42Gearbox: createEmptyOilValues(),
  tr90Gearbox: createEmptyOilValues(),
});

const createEmptyCorrectionItem = () => ({
  category: "",
  date: "",
  aircraftTotalTime: "",
  workDone: "",
  nameSign: "",
  certificateNo: "",
});

const mergeComponentTotals = (value = {}) => ({
  ...createEmptyComponentTotals(),
  ...(value || {}),
  mrGearbox: {
    ...createEmptyComponentTotals().mrGearbox,
    ...(value?.mrGearbox || {}),
  },
  tr90Gearbox: {
    ...createEmptyComponentTotals().tr90Gearbox,
    ...(value?.tr90Gearbox || {}),
  },
  tr42Gearbox: {
    ...createEmptyComponentTotals().tr42Gearbox,
    ...(value?.tr42Gearbox || {}),
  },
  engine1: {
    ...createEmptyComponentTotals().engine1,
    ...(value?.engine1 || {}),
  },
  engine2: {
    ...createEmptyComponentTotals().engine2,
    ...(value?.engine2 || {}),
  },
});

const normalizeFixedRows = (rows, count, createEmpty, mergeRow) =>
  Array.from({ length: count }, (_, index) => {
    const value = Array.isArray(rows) ? rows[index] : undefined;
    return mergeRow
      ? mergeRow(value || {})
      : { ...createEmpty(), ...(value || {}) };
  });

const mergeOilRow = (value = {}) => ({
  ...createEmptyOilRow(),
  ...(value || {}),
  engine1: { ...createEmptyOilValues(), ...(value?.engine1 || {}) },
  engine2: { ...createEmptyOilValues(), ...(value?.engine2 || {}) },
  mrGearbox: { ...createEmptyOilValues(), ...(value?.mrGearbox || {}) },
  reductionGearbox: {
    ...createEmptyOilValues(),
    ...(value?.reductionGearbox || {}),
  },
  tr42Gearbox: { ...createEmptyOilValues(), ...(value?.tr42Gearbox || {}) },
  tr90Gearbox: { ...createEmptyOilValues(), ...(value?.tr90Gearbox || {}) },
});

export const createEmptyB412Data = (value = {}) => {
  const source = value || {};
  const componentData = source.componentData || source.componentTimes || {};

  return {
    serialNumber: source.serialNumber || "",
    passengerRows: Array.from({ length: 4 }, (_, rowIndex) => ({
      ...(source.passengerRows?.[rowIndex] || {}),
      legs: Array.from(
        { length: 6 },
        (_, legIndex) =>
          source.passengerRows?.[rowIndex]?.legs?.[legIndex] || "",
      ),
    })),
    componentData: {
      broughtForwardData: mergeComponentTotals(
        componentData.broughtForwardData,
      ),
      thisFlightData: mergeComponentTotals(componentData.thisFlightData),
      toDateData: mergeComponentTotals(componentData.toDateData),
      airframeNextInspectionDueAt:
        componentData.airframeNextInspectionDueAt || "",
      engineNextInspectionDueAt:
        componentData.engineNextInspectionDueAt || "",
    },
    fuelServicing: normalizeFixedRows(
      source.fuelServicing,
      6,
      createEmptyFuelRow,
    ),
    oilServicing: normalizeFixedRows(
      source.oilServicing,
      2,
      createEmptyOilRow,
      mergeOilRow,
    ),
    discrepancyRemarks: source.discrepancyRemarks || "",
    correctionItems: normalizeFixedRows(
      source.correctionItems,
      3,
      createEmptyCorrectionItem,
    ),
  };
};

export const ensureSixB412Legs = (legs = []) =>
  Array.from({ length: 6 }, (_, index) => ({
    ...createEmptyB412Leg(),
    ...(legs[index] || {}),
    stations:
      Array.isArray(legs[index]?.stations) && legs[index].stations.length > 0
        ? [
            {
              from: legs[index].stations[0]?.from || "",
              to: legs[index].stations[0]?.to || "",
            },
          ]
        : [{ from: "", to: "" }],
  }));

export const isB412Aircraft = (aircraftType = "") => {
  const normalized = String(aircraftType || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

  return normalized.includes("B412EP") || normalized.includes("BELL412EP");
};

const hasStandardInputValue = (value) => {
  if (value === undefined || value === null || value === "") return false;

  // Older B412 records were saved with a parallel, unused standard component
  // section whose calculated totals were numeric zeroes. Treat those generated
  // zeroes as empty so the populated legacy values can be migrated. A user
  // entered string value of "0" remains authoritative.
  if (typeof value === "number" && value === 0) return false;

  if (Array.isArray(value)) {
    return value.some(hasStandardInputValue);
  }

  if (typeof value === "object") {
    return Object.values(value).some(hasStandardInputValue);
  }

  return String(value).trim() !== "";
};

const firstStandardInputValue = (standardValue, ...legacyValues) => {
  if (hasStandardInputValue(standardValue)) return standardValue;
  return legacyValues.find(hasStandardInputValue) ?? "";
};

const getLegacyGroupValue = (row, groupKey, valueKey, ...aliases) =>
  firstStandardInputValue(
    undefined,
    row?.[groupKey]?.[valueKey],
    ...aliases.map((alias) => row?.[alias]),
  );

const mapLegacyComponentRowToStandard = (row = {}, dueFields = {}) => ({
  airframe: row.airframe || "",
  gearBoxMain: getLegacyGroupValue(
    row,
    "mrGearbox",
    "tsn",
    "mrGearboxTsn",
    "mrGearboxTSN",
  ),
  gearBoxTail: getLegacyGroupValue(
    row,
    "tr90Gearbox",
    "tsn",
    "tr90GearboxTsn",
    "tr90GearboxTSN",
  ),
  rotorMain: "",
  rotorTail: "",
  airframeNextInsp: dueFields.airframeNextInsp || "",
  engine: getLegacyGroupValue(row, "engine1", "tsn", "engine1Tsn"),
  cycleN1: getLegacyGroupValue(row, "engine1", "cycle", "engine1Cycle"),
  cycleN2: getLegacyGroupValue(row, "engine2", "cycle", "engine2Cycle"),
  usage: firstStandardInputValue(undefined, row.sling),
  landingCycle: row.landingCycle || "",
  engineNextInsp: dueFields.engineNextInsp || "",
});

const STANDARD_COMPONENT_KEYS = [
  "airframe",
  "gearBoxMain",
  "gearBoxTail",
  "rotorMain",
  "rotorTail",
  "airframeNextInsp",
  "engine",
  "cycleN1",
  "cycleN2",
  "usage",
  "landingCycle",
  "engineNextInsp",
];

const mergeStandardComponentRow = (standardRow = {}, legacyRow = {}) => {
  const nextRow = { ...legacyRow, ...standardRow };
  STANDARD_COMPONENT_KEYS.forEach((key) => {
    nextRow[key] = firstStandardInputValue(
      standardRow?.[key],
      legacyRow?.[key],
    );
  });
  return nextRow;
};

const mapLegacyFuelRowToStandard = (row = {}, leg = {}) => ({
  date: row.date || leg.date || "",
  contCheck: row.contCheck || "",
  mainRemG: firstStandardInputValue(
    undefined,
    row.mainTankRemaining,
    row.mainRemG,
  ),
  mainAdd: firstStandardInputValue(undefined, row.mainTankAdded, row.mainAdd),
  mainTotal: firstStandardInputValue(
    undefined,
    row.mainTankTotal,
    row.mainTotal,
  ),
  fuelType: row.fuelType || "drum",
  refuelerName: firstStandardInputValue(
    undefined,
    row.refuellerName,
    row.refuelerName,
  ),
  signature: row.signature || "",
});

const mergeStandardFuelRow = (standardRow = {}, legacyRow = {}) => ({
  ...legacyRow,
  ...standardRow,
  date: firstStandardInputValue(standardRow.date, legacyRow.date),
  contCheck: firstStandardInputValue(
    standardRow.contCheck,
    legacyRow.contCheck,
  ),
  mainRemG: firstStandardInputValue(
    standardRow.mainRemG,
    legacyRow.mainRemG,
  ),
  mainAdd: firstStandardInputValue(
    standardRow.mainAdd,
    legacyRow.mainAdd,
  ),
  mainTotal: firstStandardInputValue(
    standardRow.mainTotal,
    legacyRow.mainTotal,
  ),
  fuelType: firstStandardInputValue(
    standardRow.fuelType,
    legacyRow.fuelType,
    "drum",
  ),
  refuelerName: firstStandardInputValue(
    standardRow.refuelerName,
    legacyRow.refuelerName,
  ),
  signature: firstStandardInputValue(
    standardRow.signature,
    legacyRow.signature,
  ),
});

const mapLegacyOilRowToStandard = (row = {}, leg = {}) => ({
  date: row.date || leg.date || "",
  engineRem: getLegacyGroupValue(row, "engine1", "remaining", "engine1Rem"),
  engineAdd: getLegacyGroupValue(row, "engine1", "added", "engine1Add"),
  engineTot: getLegacyGroupValue(row, "engine1", "total", "engine1Tot"),
  mrGboxRem: getLegacyGroupValue(
    row,
    "mrGearbox",
    "remaining",
    "mrGearboxRem",
  ),
  mrGboxAdd: getLegacyGroupValue(
    row,
    "mrGearbox",
    "added",
    "mrGearboxAdd",
  ),
  mrGboxTot: getLegacyGroupValue(
    row,
    "mrGearbox",
    "total",
    "mrGearboxTot",
  ),
  trGboxRem: getLegacyGroupValue(
    row,
    "tr90Gearbox",
    "remaining",
    "gearbox90Rem",
  ),
  trGboxAdd: getLegacyGroupValue(
    row,
    "tr90Gearbox",
    "added",
    "gearbox90Add",
  ),
  trGboxTot: getLegacyGroupValue(
    row,
    "tr90Gearbox",
    "total",
    "gearbox90Tot",
  ),
  remarks: row.remarks || "",
  signature: firstStandardInputValue(
    undefined,
    row.mechanicSignature,
    row.signature,
  ),
});

const STANDARD_OIL_KEYS = [
  "date",
  "engineRem",
  "engineAdd",
  "engineTot",
  "mrGboxRem",
  "mrGboxAdd",
  "mrGboxTot",
  "trGboxRem",
  "trGboxAdd",
  "trGboxTot",
  "remarks",
  "signature",
];

const mergeStandardOilRow = (standardRow = {}, legacyRow = {}) => {
  const nextRow = { ...legacyRow, ...standardRow };
  STANDARD_OIL_KEYS.forEach((key) => {
    nextRow[key] = firstStandardInputValue(
      standardRow?.[key],
      legacyRow?.[key],
    );
  });
  return nextRow;
};

const normalizeLegacyWorkType = (category = "") => {
  const normalized = String(category || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  if (["discrepancy", "discrepancycorrection"].includes(normalized)) {
    return "Discrepancy Correction";
  }
  if (["sbad", "sbadcompliance"].includes(normalized)) {
    return "SB/AD Compliance";
  }
  if (normalized === "inspection") return "Inspection";
  if (["other", "others"].includes(normalized)) return "Others";
  return category || "";
};

const isSignatureValue = (value) =>
  /^(data:image\/|blob:|https?:\/\/)/i.test(String(value || "").trim());

const hasLegacyCorrectionInput = (item = {}) =>
  Object.entries(item || {}).some(
    ([key, value]) =>
      !["id", "_id"].includes(key) && hasStandardInputValue(value),
  );

const mapLegacyCorrectionToStandard = (item = {}, index) => {
  const nameOrSignature = firstStandardInputValue(
    undefined,
    item.nameSign,
    item.signature,
    item.name,
  );
  const workType = normalizeLegacyWorkType(item.category);

  return {
    id: item.id || item._id || `legacy-b412-work-${index + 1}`,
    selectedWorkTypes: workType ? [workType] : [],
    date: item.date || "",
    aircraft: firstStandardInputValue(
      undefined,
      item.aircraftTotalTime,
      item.aircraftTT,
      item.aircraft,
    ),
    workDone: firstStandardInputValue(
      undefined,
      item.workDone,
      item.description,
    ),
    name: isSignatureValue(nameOrSignature) ? "" : nameOrSignature,
    certificateNumber: firstStandardInputValue(
      undefined,
      item.certificateNo,
      item.certificateNumber,
    ),
    signature: isSignatureValue(nameOrSignature) ? nameOrSignature : "",
  };
};

/**
 * Hydrates the standard AS350-shaped flight-log fields from the retired B412
 * subdocument. Populated standard values always win, and the original
 * `b412Data` object is retained so older records can still use every value in
 * the B412-specific PDF layout.
 */
export const hydrateLegacyB412FlightLog = (record = {}) => {
  const legacy = record?.b412Data;
  if (!legacy || typeof legacy !== "object") return record;

  const legacyComponentData = legacy.componentData || legacy.componentTimes || {};
  const standardComponentData = record.componentData || {};
  const dueFields = {
    airframeNextInsp: firstStandardInputValue(
      undefined,
      legacyComponentData.airframeNextInspectionDueAt,
      legacy.airframeNextInspectionDueAt,
    ),
    engineNextInsp: firstStandardInputValue(
      undefined,
      legacyComponentData.engineNextInspectionDueAt,
      legacy.engineNextInspectionDueAt,
    ),
  };
  const sectionKeys = [
    "broughtForwardData",
    "thisFlightData",
    "toDateData",
  ];
  const componentData = { ...standardComponentData };
  sectionKeys.forEach((sectionKey) => {
    componentData[sectionKey] = mergeStandardComponentRow(
      standardComponentData?.[sectionKey],
      mapLegacyComponentRowToStandard(
        legacyComponentData?.[sectionKey],
        dueFields,
      ),
    );
  });

  const sourceLegs = Array.isArray(record.legs) ? record.legs : [];
  const passengerRows = Array.isArray(legacy.passengerRows)
    ? legacy.passengerRows
    : [];
  const legs = sourceLegs.map((leg = {}, legIndex) => {
    const firstPassengerRow = passengerRows[0];
    const legacyPassengers = Array.isArray(firstPassengerRow)
      ? firstPassengerRow[legIndex]
      : firstPassengerRow?.legs?.[legIndex];

    return {
      ...leg,
      passengers: firstStandardInputValue(leg.passengers, legacyPassengers),
    };
  });

  const legacyFuelRows = Array.isArray(legacy.fuelServicing)
    ? legacy.fuelServicing
    : [];
  const standardFuelRows = Array.isArray(record.fuelServicing)
    ? record.fuelServicing
    : [];
  const fuelRowCount = Math.max(
    legs.length,
    standardFuelRows.length,
    legacyFuelRows.length,
  );
  const fuelServicing = Array.from({ length: fuelRowCount }, (_, index) =>
    mergeStandardFuelRow(
      standardFuelRows[index],
      mapLegacyFuelRowToStandard(legacyFuelRows[index], legs[index]),
    ),
  );

  const legacyOilRows = Array.isArray(legacy.oilServicing)
    ? legacy.oilServicing
    : [];
  const standardOilRows = Array.isArray(record.oilServicing)
    ? record.oilServicing
    : [];
  const oilRowCount = Math.max(
    legs.length,
    standardOilRows.length,
    legacyOilRows.length,
  );
  const oilServicing = Array.from({ length: oilRowCount }, (_, index) =>
    mergeStandardOilRow(
      standardOilRows[index],
      mapLegacyOilRowToStandard(legacyOilRows[index], legs[index]),
    ),
  );

  const hasStandardWorkItems = (record.workItems || []).some(
    hasStandardInputValue,
  );
  const workItems = hasStandardWorkItems
    ? record.workItems
    : (legacy.correctionItems || [])
        .map((item, index) =>
          hasLegacyCorrectionInput(item)
            ? mapLegacyCorrectionToStandard(item, index)
            : null,
        )
        .filter(Boolean);

  return {
    ...record,
    serialNumber: firstStandardInputValue(
      record.serialNumber,
      legacy.serialNumber,
      legacy.serialNo,
    ),
    legs,
    remarks: firstStandardInputValue(
      record.remarks,
      legacy.discrepancyRemarks,
      legacy.remarks,
    ),
    componentData,
    fuelServicing,
    oilServicing,
    workItems,
  };
};

const sumField = (left, right) => {
  const leftValue = String(left ?? "").trim();
  const rightValue = String(right ?? "").trim();

  if (!leftValue && !rightValue) return "";

  const leftNumber = leftValue ? Number(leftValue) : 0;
  const rightNumber = rightValue ? Number(rightValue) : 0;
  if (!Number.isFinite(leftNumber) || !Number.isFinite(rightNumber)) {
    return "";
  }

  const total = leftNumber + rightNumber;
  return String(Number(total.toFixed(6)));
};

export const calculateB412ToDate = (broughtForward = {}, thisFlight = {}) => {
  const bf = mergeComponentTotals(broughtForward);
  const tf = mergeComponentTotals(thisFlight);

  return {
    airframe: sumField(bf.airframe, tf.airframe),
    mrGearbox: {
      tsn: sumField(bf.mrGearbox.tsn, tf.mrGearbox.tsn),
      tso: sumField(bf.mrGearbox.tso, tf.mrGearbox.tso),
    },
    tr90Gearbox: {
      tsn: sumField(bf.tr90Gearbox.tsn, tf.tr90Gearbox.tsn),
      tso: sumField(bf.tr90Gearbox.tso, tf.tr90Gearbox.tso),
    },
    tr42Gearbox: {
      tsn: sumField(bf.tr42Gearbox.tsn, tf.tr42Gearbox.tsn),
      tso: sumField(bf.tr42Gearbox.tso, tf.tr42Gearbox.tso),
    },
    landingCycle: sumField(bf.landingCycle, tf.landingCycle),
    engine1: {
      tsn: sumField(bf.engine1.tsn, tf.engine1.tsn),
      tso: sumField(bf.engine1.tso, tf.engine1.tso),
      cycle: sumField(bf.engine1.cycle, tf.engine1.cycle),
    },
    engine2: {
      tsn: sumField(bf.engine2.tsn, tf.engine2.tsn),
      tso: sumField(bf.engine2.tso, tf.engine2.tso),
      cycle: sumField(bf.engine2.cycle, tf.engine2.cycle),
    },
    sling: sumField(bf.sling, tf.sling),
    others: sumField(bf.others, tf.others),
  };
};

const getStandardField = (row = {}, key) =>
  Object.prototype.hasOwnProperty.call(row || {}, key) ? row[key] ?? "" : "";

const mergePopulatedB412Values = (calculatedValue, storedValue) => {
  if (
    calculatedValue &&
    typeof calculatedValue === "object" &&
    !Array.isArray(calculatedValue)
  ) {
    return Object.keys({
      ...(storedValue || {}),
      ...calculatedValue,
    }).reduce((result, key) => {
      result[key] = mergePopulatedB412Values(
        calculatedValue[key],
        storedValue?.[key],
      );
      return result;
    }, {});
  }

  return hasStandardInputValue(calculatedValue)
    ? calculatedValue
    : storedValue ?? "";
};

const mapStandardComponentRowToB412 = (
  standardRow = {},
  legacyRow = {},
) => ({
  ...legacyRow,
  airframe: getStandardField(standardRow, "airframe"),
  mrGearbox: {
    ...(legacyRow.mrGearbox || {}),
    tsn: getStandardField(standardRow, "gearBoxMain"),
  },
  tr90Gearbox: {
    ...(legacyRow.tr90Gearbox || {}),
    tsn: getStandardField(standardRow, "gearBoxTail"),
  },
  landingCycle: getStandardField(standardRow, "landingCycle"),
  engine1: {
    ...(legacyRow.engine1 || {}),
    tsn: getStandardField(standardRow, "engine"),
    cycle: getStandardField(standardRow, "cycleN1"),
  },
  engine2: {
    ...(legacyRow.engine2 || {}),
    cycle: getStandardField(standardRow, "cycleN2"),
  },
  sling: getStandardField(standardRow, "usage"),
});

const mapStandardFuelRowToB412 = (standardRow = {}, legacyRow = {}) => ({
  ...legacyRow,
  contCheck: getStandardField(standardRow, "contCheck"),
  mainTankRemaining: getStandardField(standardRow, "mainRemG"),
  mainTankAdded: getStandardField(standardRow, "mainAdd"),
  mainTankTotal: getStandardField(standardRow, "mainTotal"),
  refuellerName: getStandardField(standardRow, "refuelerName"),
  signature: getStandardField(standardRow, "signature"),
});

const mapStandardOilRowToB412 = (standardRow = {}, legacyRow = {}) => ({
  ...legacyRow,
  mechanicSignature: getStandardField(standardRow, "signature"),
  engine1: {
    ...(legacyRow.engine1 || {}),
    remaining: getStandardField(standardRow, "engineRem"),
    added: getStandardField(standardRow, "engineAdd"),
    total: getStandardField(standardRow, "engineTot"),
  },
  mrGearbox: {
    ...(legacyRow.mrGearbox || {}),
    remaining: getStandardField(standardRow, "mrGboxRem"),
    added: getStandardField(standardRow, "mrGboxAdd"),
    total: getStandardField(standardRow, "mrGboxTot"),
  },
  tr90Gearbox: {
    ...(legacyRow.tr90Gearbox || {}),
    remaining: getStandardField(standardRow, "trGboxRem"),
    added: getStandardField(standardRow, "trGboxAdd"),
    total: getStandardField(standardRow, "trGboxTot"),
  },
});

const mapStandardWorkItemToB412 = (item = {}, legacyItem = {}) => ({
  ...legacyItem,
  category: Array.isArray(item.selectedWorkTypes)
    ? item.selectedWorkTypes[0] || ""
    : "",
  date: getStandardField(item, "date"),
  aircraftTotalTime: getStandardField(item, "aircraft"),
  workDone: getStandardField(item, "workDone"),
  nameSign:
    getStandardField(item, "signature") || getStandardField(item, "name"),
  certificateNo: getStandardField(item, "certificateNumber"),
});

/**
 * Adapts the common AS350-shaped editor state back into the B412 subdocument.
 * Fields without a common-form equivalent (second-engine times, 42-degree
 * gearbox values, fuel supply systems, and similar legacy values) are carried
 * forward unchanged.
 */
export const adaptStandardFlightLogToB412 = (record = {}) => {
  const legacy = createEmptyB412Data(record.b412Data);
  const standardComponentData = record.componentData || {};
  const sectionKeys = [
    "broughtForwardData",
    "thisFlightData",
    "toDateData",
  ];
  const componentData = {
    ...legacy.componentData,
  };

  sectionKeys.forEach((sectionKey) => {
    componentData[sectionKey] = mapStandardComponentRowToB412(
      standardComponentData?.[sectionKey],
      legacy.componentData?.[sectionKey],
    );
  });
  componentData.toDateData = mergePopulatedB412Values(
    calculateB412ToDate(
      componentData.broughtForwardData,
      componentData.thisFlightData,
    ),
    legacy.componentData.toDateData,
  );
  componentData.airframeNextInspectionDueAt = firstStandardInputValue(
    standardComponentData?.thisFlightData?.airframeNextInsp,
    standardComponentData?.broughtForwardData?.airframeNextInsp,
    standardComponentData?.toDateData?.airframeNextInsp,
    legacy.componentData.airframeNextInspectionDueAt,
  );
  componentData.engineNextInspectionDueAt = firstStandardInputValue(
    standardComponentData?.thisFlightData?.engineNextInsp,
    standardComponentData?.broughtForwardData?.engineNextInsp,
    standardComponentData?.toDateData?.engineNextInsp,
    legacy.componentData.engineNextInspectionDueAt,
  );

  const standardLegs = Array.isArray(record.legs) ? record.legs : [];
  const passengerRows = legacy.passengerRows.map((row, rowIndex) => ({
    ...row,
    legs: Array.from({ length: 6 }, (_, legIndex) => {
      if (rowIndex !== 0) return row.legs?.[legIndex] || "";
      if (legIndex >= standardLegs.length) return "";
      return getStandardField(standardLegs[legIndex], "passengers");
    }),
  }));

  const standardFuelRows = Array.isArray(record.fuelServicing)
    ? record.fuelServicing
    : [];
  const fuelServicing = legacy.fuelServicing.map((legacyRow, index) =>
    index < standardFuelRows.length
      ? mapStandardFuelRowToB412(standardFuelRows[index], legacyRow)
      : legacyRow,
  );

  const standardOilRows = Array.isArray(record.oilServicing)
    ? record.oilServicing
    : [];
  const oilServicing = legacy.oilServicing.map((legacyRow, index) =>
    index < standardOilRows.length
      ? mapStandardOilRowToB412(standardOilRows[index], legacyRow)
      : legacyRow,
  );

  const standardWorkItems = Array.isArray(record.workItems)
    ? record.workItems
    : [];
  const correctionItems = legacy.correctionItems.map(() =>
    mapStandardWorkItemToB412({}, {}),
  );
  const usedCorrectionRows = new Set();
  standardWorkItems.slice(0, correctionItems.length).forEach((item, index) => {
    const legacyIndexMatch = String(item?.id || "").match(
      /^legacy-b412-work-(\d+)$/,
    );
    const requestedIndex = legacyIndexMatch
      ? Number(legacyIndexMatch[1]) - 1
      : index;
    const targetIndex =
      requestedIndex >= 0 &&
      requestedIndex < correctionItems.length &&
      !usedCorrectionRows.has(requestedIndex)
        ? requestedIndex
        : correctionItems.findIndex((_, rowIndex) =>
            !usedCorrectionRows.has(rowIndex),
          );
    if (targetIndex < 0) return;

    correctionItems[targetIndex] = mapStandardWorkItemToB412(
      item,
      legacy.correctionItems[targetIndex],
    );
    usedCorrectionRows.add(targetIndex);
  });

  return {
    ...legacy,
    serialNumber: firstStandardInputValue(
      record.serialNumber,
      legacy.serialNumber,
    ),
    passengerRows,
    componentData,
    fuelServicing,
    oilServicing,
    discrepancyRemarks: getStandardField(record, "remarks"),
    correctionItems,
  };
};

export {
  mapAircraftReferenceToB412,
  mapAircraftReferenceToBroughtForward,
  mapB412FlightLogToMonitoringTotals,
  mapStandardFlightLogToMonitoringTotals,
} from "../../../shared/flightLogPartsMonitoring";

export const B412_FLIGHT_LOG_SECTIONS = [
  "Basic Information",
  "Flight Legs",
  "Passengers",
  "BRT FORWARD",
  "This Flight",
  "To Date",
  "Fuel Servicing",
  "Oil Servicing",
  "Discrepancy / Correction",
];
