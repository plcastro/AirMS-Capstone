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
  ...value,
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
    return mergeRow ? mergeRow(value || {}) : { ...createEmpty(), ...(value || {}) };
  });

const mergeOilRow = (value = {}) => ({
  ...createEmptyOilRow(),
  ...value,
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
  const componentData = value?.componentData || value?.componentTimes || {};

  return {
    serialNumber: value?.serialNumber || "",
    passengerRows: Array.from({ length: 4 }, (_, rowIndex) => ({
      ...(value?.passengerRows?.[rowIndex] || {}),
      legs: Array.from(
        { length: 6 },
        (_, legIndex) => value?.passengerRows?.[rowIndex]?.legs?.[legIndex] || "",
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
      value?.fuelServicing,
      6,
      createEmptyFuelRow,
    ),
    oilServicing: normalizeFixedRows(
      value?.oilServicing,
      2,
      createEmptyOilRow,
      mergeOilRow,
    ),
    discrepancyRemarks: value?.discrepancyRemarks || "",
    correctionItems: normalizeFixedRows(
      value?.correctionItems,
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
        ? legs[index].stations.map((station) => ({
            from: station?.from || "",
            to: station?.to || "",
          }))
        : [{ from: "", to: "" }],
  }));

// Project the B412-specific monitoring snapshot into the common AS350-style
// fields without falling back to the less-specific single-engine aliases.
export const mapB412CarriedToStandardBroughtForward = (carried = {}) => {
  const broughtForward = carried.broughtForwardData || {};

  return {
    airframe: broughtForward.airframe ?? "",
    gearBoxMain: broughtForward.mrGearbox?.tsn ?? "",
    gearBoxTail: broughtForward.tr90Gearbox?.tsn ?? "",
    rotorMain: "",
    rotorTail: "",
    airframeNextInsp: carried.airframeNextInspectionDueAt ?? "",
    engine: broughtForward.engine1?.tsn ?? "",
    cycleN1: broughtForward.engine1?.cycle ?? "",
    cycleN2: broughtForward.engine2?.cycle ?? "",
    usage: broughtForward.sling ?? "",
    landingCycle: broughtForward.landingCycle ?? "",
    engineNextInsp: carried.engineNextInspectionDueAt ?? "",
  };
};

const hasInputValue = (value) => {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim() !== "";
  if (typeof value === "number") return value !== 0;
  if (Array.isArray(value)) return value.some(hasInputValue);
  if (typeof value === "object") {
    return Object.values(value).some(hasInputValue);
  }
  return true;
};

const firstInputValue = (...values) => {
  const value = values.find(hasInputValue);
  return value === undefined ? "" : value;
};

const mergeLegacyInputValues = (primary, fallback) => {
  if (Array.isArray(primary) || Array.isArray(fallback)) {
    const primaryArray = Array.isArray(primary) ? primary : [];
    const fallbackArray = Array.isArray(fallback) ? fallback : [];

    return Array.from(
      { length: Math.max(primaryArray.length, fallbackArray.length) },
      (_, index) =>
        mergeLegacyInputValues(primaryArray[index], fallbackArray[index]),
    );
  }

  const primaryIsObject =
    primary && typeof primary === "object" && !Array.isArray(primary);
  const fallbackIsObject =
    fallback && typeof fallback === "object" && !Array.isArray(fallback);

  if (primaryIsObject || fallbackIsObject) {
    const primaryObject = primaryIsObject ? primary : {};
    const fallbackObject = fallbackIsObject ? fallback : {};

    return Object.keys({ ...fallbackObject, ...primaryObject }).reduce(
      (merged, key) => {
        merged[key] = mergeLegacyInputValues(
          primaryObject[key],
          fallbackObject[key],
        );
        return merged;
      },
      {},
    );
  }

  return firstInputValue(primary, fallback);
};

const mergeInputFields = (standard = {}, legacy = {}) =>
  Object.keys({ ...legacy, ...standard }).reduce((merged, key) => {
    merged[key] = firstInputValue(standard?.[key], legacy?.[key]);
    return merged;
  }, {});

const mapLegacyComponentSection = (section = {}, componentData = {}) => ({
  airframe: section.airframe,
  gearBoxMain: firstInputValue(
    section.gearBoxMain,
    section.mrGearbox?.tsn,
    section.mrGearboxTsn,
    section.mrGearboxTSN,
  ),
  gearBoxTail: firstInputValue(
    section.gearBoxTail,
    section.tr90Gearbox?.tsn,
    section.tr90GearboxTsn,
    section.tr90GearboxTSN,
  ),
  rotorMain: section.rotorMain,
  rotorTail: section.rotorTail,
  engine: firstInputValue(
    section.engine,
    section.engine1?.tsn,
    section.engine1Tsn,
    section.engine1TSN,
  ),
  cycleN1: firstInputValue(
    section.cycleN1,
    section.engine1?.cycle,
    section.engine1Cycle,
  ),
  cycleN2: firstInputValue(
    section.cycleN2,
    section.engine2?.cycle,
    section.engine2Cycle,
  ),
  usage: firstInputValue(section.usage, section.sling),
  landingCycle: section.landingCycle,
  airframeNextInsp: firstInputValue(
    section.airframeNextInsp,
    componentData.airframeNextInspectionDueAt,
  ),
  engineNextInsp: firstInputValue(
    section.engineNextInsp,
    componentData.engineNextInspectionDueAt,
  ),
});

const mapLegacyFuelRow = (row = {}) => ({
  date: row.date,
  contCheck: row.contCheck,
  mainRemG: firstInputValue(row.mainRemG, row.mainTankRemaining),
  mainAdd: firstInputValue(row.mainAdd, row.mainTankAdded),
  mainTotal: firstInputValue(row.mainTotal, row.mainTankTotal),
  fuelType: row.fuelType,
  refuelerName: firstInputValue(row.refuelerName, row.refuellerName),
  signature: row.signature,
});

const mapLegacyOilRow = (row = {}) => ({
  date: row.date,
  engineRem: firstInputValue(row.engineRem, row.engine1?.remaining),
  engineAdd: firstInputValue(row.engineAdd, row.engine1?.added),
  engineTot: firstInputValue(row.engineTot, row.engine1?.total),
  mrGboxRem: firstInputValue(row.mrGboxRem, row.mrGearbox?.remaining),
  mrGboxAdd: firstInputValue(row.mrGboxAdd, row.mrGearbox?.added),
  mrGboxTot: firstInputValue(row.mrGboxTot, row.mrGearbox?.total),
  trGboxRem: firstInputValue(
    row.trGboxRem,
    row.tr90Gearbox?.remaining,
  ),
  trGboxAdd: firstInputValue(
    row.trGboxAdd,
    row.tr90Gearbox?.added,
  ),
  trGboxTot: firstInputValue(
    row.trGboxTot,
    row.tr90Gearbox?.total,
  ),
  remarks: row.remarks,
  signature: firstInputValue(row.signature, row.mechanicSignature),
});

const normalizeWorkType = (value = "") => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

  if (normalized === "discrepancycorrection" || normalized === "discrepancy") {
    return "Discrepancy Correction";
  }
  if (normalized === "sbadcompliance" || normalized === "sbad") {
    return "SB/AD Compliance";
  }
  if (normalized === "inspection") return "Inspection";
  if (normalized === "other" || normalized === "others") return "Others";
  return String(value || "").trim();
};

const looksLikeSignature = (value) =>
  /^(data:image\/|blob:|https?:\/\/)/i.test(String(value || "").trim());

const mapLegacyWorkItem = (item = {}, index = 0) => {
  const nameSign = firstInputValue(item.nameSign, item.name);
  const category = normalizeWorkType(item.category);

  return {
    id: firstInputValue(item.id, `legacy-b412-work-${index + 1}`),
    selectedWorkTypes: category ? [category] : [],
    date: item.date,
    aircraft: firstInputValue(item.aircraft, item.aircraftTotalTime),
    workDone: firstInputValue(item.workDone, item.description),
    name: looksLikeSignature(nameSign) ? "" : nameSign,
    certificateNumber: firstInputValue(
      item.certificateNumber,
      item.certificateNo,
    ),
    signature: firstInputValue(
      item.signature,
      looksLikeSignature(nameSign) ? nameSign : "",
    ),
  };
};

const rowHasValues = (row = {}) =>
  Object.entries(row).some(([key, value]) => {
    if (key === "id" || key === "_id" || key === "fuelType") return false;
    if (Array.isArray(value)) return value.some(hasInputValue);
    if (value && typeof value === "object") return rowHasValues(value);
    return hasInputValue(value);
  });

const mergeLegacyRows = (standardRows, legacyRows, mapLegacyRow) => {
  const standard = Array.isArray(standardRows) ? standardRows : [];
  const legacy = (Array.isArray(legacyRows) ? legacyRows : []).map(mapLegacyRow);
  let legacyRowCount = legacy.length;

  while (legacyRowCount > 0 && !rowHasValues(legacy[legacyRowCount - 1])) {
    legacyRowCount -= 1;
  }

  const rowCount = Math.max(standard.length, legacyRowCount);

  return Array.from({ length: rowCount }, (_, index) =>
    mergeInputFields(standard[index] || {}, legacy[index] || {}),
  );
};

const hydrateLegacyWorkItems = (standardRows, legacyRows) => {
  const standard = Array.isArray(standardRows) ? standardRows : [];
  if (standard.some(rowHasValues)) return standard;

  return (Array.isArray(legacyRows) ? legacyRows : [])
    .map((item, index) =>
      rowHasValues(item) ? mapLegacyWorkItem(item, index) : null,
    )
    .filter(Boolean);
};

/**
 * Older Bell 412EP logs stored form values under b412Data. The current form
 * intentionally uses the same top-level fields as the AS350B3 form. Hydrate
 * only missing standard values so legacy records remain editable without
 * discarding the original B412 payload used by older exports.
 */
export const hydrateStandardFlightLogFromLegacyB412 = (log = {}) => {
  const legacy = mergeLegacyInputValues(
    log.b412Data,
    mergeLegacyInputValues(log.b412, log.bell412Data),
  );
  if (!legacy || typeof legacy !== "object") return log;

  const standardComponentData = log.componentData || {};
  const legacyComponentData = legacy.componentData || legacy.componentTimes || {};
  const mergeComponentSection = (sectionKey) =>
    mergeInputFields(
      standardComponentData[sectionKey] || {},
      mapLegacyComponentSection(
        legacyComponentData[sectionKey] || {},
        sectionKey === "broughtForwardData" ? legacyComponentData : {},
      ),
    );
  const fuelServicing = mergeLegacyRows(
    log.fuelServicing,
    legacy.fuelServicing || log.b412FuelServicing,
    mapLegacyFuelRow,
  );
  const oilServicing = mergeLegacyRows(
    log.oilServicing,
    legacy.oilServicing || log.b412OilServicing,
    mapLegacyOilRow,
  );
  const sourceLegs =
    Array.isArray(log.legs) && log.legs.length > 0
      ? log.legs
      : [createEmptyB412Leg()];
  const legsWithPassengers = sourceLegs.map((leg, index) => ({
    ...leg,
    passengers: firstInputValue(
      leg?.passengers,
      legacy.passengerRows?.[0]?.legs?.[index],
    ),
  }));
  const isLegIndexUsed = (index) =>
    rowHasValues(legsWithPassengers[index]) ||
    rowHasValues(fuelServicing[index]) ||
    rowHasValues(oilServicing[index]);
  let visibleLegCount = legsWithPassengers.length;

  while (visibleLegCount > 1 && !isLegIndexUsed(visibleLegCount - 1)) {
    visibleLegCount -= 1;
  }

  return {
    ...log,
    legs: legsWithPassengers.slice(0, visibleLegCount),
    serialNumber: firstInputValue(
      log.serialNumber,
      log.serialNo,
      legacy.serialNumber,
      legacy.serialNo,
    ),
    remarks: firstInputValue(
      log.remarks,
      legacy.discrepancyRemarks,
      legacy.remarks,
    ),
    componentData: {
      ...standardComponentData,
      broughtForwardData: mergeComponentSection("broughtForwardData"),
      thisFlightData: mergeComponentSection("thisFlightData"),
      toDateData: mergeComponentSection("toDateData"),
    },
    fuelServicing,
    oilServicing,
    workItems: hydrateLegacyWorkItems(
      log.workItems,
      legacy.correctionItems || log.b412CorrectionItems,
    ),
  };
};

const getStandardField = (standard = {}, field, legacyValue = "") =>
  Object.prototype.hasOwnProperty.call(standard, field)
    ? standard[field] ?? ""
    : legacyValue;

const mapStandardComponentSectionToB412 = (
  standard = {},
  legacy = {},
) => ({
  ...legacy,
  airframe: getStandardField(standard, "airframe", legacy.airframe),
  mrGearbox: {
    ...(legacy.mrGearbox || {}),
    tsn: getStandardField(
      standard,
      "gearBoxMain",
      legacy.mrGearbox?.tsn,
    ),
  },
  tr90Gearbox: {
    ...(legacy.tr90Gearbox || {}),
    tsn: getStandardField(
      standard,
      "gearBoxTail",
      legacy.tr90Gearbox?.tsn,
    ),
  },
  tr42Gearbox: { ...(legacy.tr42Gearbox || {}) },
  landingCycle: getStandardField(
    standard,
    "landingCycle",
    legacy.landingCycle,
  ),
  engine1: {
    ...(legacy.engine1 || {}),
    tsn: getStandardField(standard, "engine", legacy.engine1?.tsn),
    cycle: getStandardField(standard, "cycleN1", legacy.engine1?.cycle),
  },
  engine2: {
    ...(legacy.engine2 || {}),
    cycle: getStandardField(standard, "cycleN2", legacy.engine2?.cycle),
  },
  sling: getStandardField(standard, "usage", legacy.sling),
  others: legacy.others || "",
});

const syncB412FuelRow = (standard = {}, legacy = {}) => ({
  ...legacy,
  contCheck: getStandardField(standard, "contCheck", legacy.contCheck),
  mainTankRemaining: getStandardField(
    standard,
    "mainRemG",
    legacy.mainTankRemaining,
  ),
  mainTankAdded: getStandardField(
    standard,
    "mainAdd",
    legacy.mainTankAdded,
  ),
  mainTankTotal: getStandardField(
    standard,
    "mainTotal",
    legacy.mainTankTotal,
  ),
  refuellerName: getStandardField(
    standard,
    "refuelerName",
    legacy.refuellerName,
  ),
  signature: getStandardField(standard, "signature", legacy.signature),
});

const syncB412OilRow = (standard = {}, legacy = {}) => ({
  ...legacy,
  mechanicSignature: getStandardField(
    standard,
    "signature",
    legacy.mechanicSignature,
  ),
  engine1: {
    ...(legacy.engine1 || {}),
    remaining: getStandardField(
      standard,
      "engineRem",
      legacy.engine1?.remaining,
    ),
    added: getStandardField(standard, "engineAdd", legacy.engine1?.added),
    total: getStandardField(standard, "engineTot", legacy.engine1?.total),
  },
  engine2: { ...(legacy.engine2 || {}) },
  mrGearbox: {
    ...(legacy.mrGearbox || {}),
    remaining: getStandardField(
      standard,
      "mrGboxRem",
      legacy.mrGearbox?.remaining,
    ),
    added: getStandardField(
      standard,
      "mrGboxAdd",
      legacy.mrGearbox?.added,
    ),
    total: getStandardField(
      standard,
      "mrGboxTot",
      legacy.mrGearbox?.total,
    ),
  },
  tr90Gearbox: {
    ...(legacy.tr90Gearbox || {}),
    remaining: getStandardField(
      standard,
      "trGboxRem",
      legacy.tr90Gearbox?.remaining,
    ),
    added: getStandardField(
      standard,
      "trGboxAdd",
      legacy.tr90Gearbox?.added,
    ),
    total: getStandardField(
      standard,
      "trGboxTot",
      legacy.tr90Gearbox?.total,
    ),
  },
  reductionGearbox: { ...(legacy.reductionGearbox || {}) },
  tr42Gearbox: { ...(legacy.tr42Gearbox || {}) },
});

const syncB412CorrectionItem = (standard = {}, legacy = {}) => {
  const selectedWorkTypes = Array.isArray(standard.selectedWorkTypes)
    ? standard.selectedWorkTypes
    : [];
  const standardName = firstInputValue(standard.name, standard.performedBy);

  return {
    ...legacy,
    category: Object.prototype.hasOwnProperty.call(
      standard,
      "selectedWorkTypes",
    )
      ? selectedWorkTypes[0] || ""
      : legacy.category || "",
    date: getStandardField(standard, "date", legacy.date),
    aircraftTotalTime: getStandardField(
      standard,
      "aircraft",
      legacy.aircraftTotalTime,
    ),
    workDone: getStandardField(standard, "workDone", legacy.workDone),
    nameSign: Object.prototype.hasOwnProperty.call(standard, "signature")
      ? standard.signature || standardName || ""
      : firstInputValue(legacy.nameSign, standardName),
    certificateNo: getStandardField(
      standard,
      "certificateNumber",
      legacy.certificateNo,
    ),
  };
};

/**
 * Mirrors the common AS350-style input values back into the B412-specific
 * payload. B412-only fields that have no common-form equivalent are retained.
 */
export const syncB412DataFromStandardFlightLog = (
  log = {},
  existingB412Data,
) => {
  const legacy = createEmptyB412Data(
    mergeLegacyInputValues(
      existingB412Data || log.b412Data,
      mergeLegacyInputValues(log.b412, log.bell412Data),
    ),
  );
  const standardComponentData = log.componentData || {};
  const componentData = legacy.componentData || {};
  const standardFuelRows = Array.isArray(log.fuelServicing)
    ? log.fuelServicing
    : [];
  const standardOilRows = Array.isArray(log.oilServicing)
    ? log.oilServicing
    : [];
  const standardWorkItems = Array.isArray(log.workItems) ? log.workItems : [];
  const passengerRows = legacy.passengerRows.map((row, rowIndex) => ({
    ...row,
    legs: row.legs.map((value, legIndex) =>
      rowIndex === 0
        ? legIndex < (log.legs || []).length
          ? log.legs[legIndex]?.passengers ?? ""
          : ""
        : value,
    ),
  }));
  const syncedComponentData = {
    ...componentData,
    broughtForwardData: mapStandardComponentSectionToB412(
      standardComponentData.broughtForwardData || {},
      componentData.broughtForwardData || {},
    ),
    thisFlightData: mapStandardComponentSectionToB412(
      standardComponentData.thisFlightData || {},
      componentData.thisFlightData || {},
    ),
    toDateData: mapStandardComponentSectionToB412(
      standardComponentData.toDateData || {},
      componentData.toDateData || {},
    ),
    airframeNextInspectionDueAt: firstInputValue(
      standardComponentData.toDateData?.airframeNextInsp,
      standardComponentData.thisFlightData?.airframeNextInsp,
      standardComponentData.broughtForwardData?.airframeNextInsp,
      componentData.airframeNextInspectionDueAt,
    ),
    engineNextInspectionDueAt: firstInputValue(
      standardComponentData.toDateData?.engineNextInsp,
      standardComponentData.thisFlightData?.engineNextInsp,
      standardComponentData.broughtForwardData?.engineNextInsp,
      componentData.engineNextInspectionDueAt,
    ),
  };
  const correctionItems = legacy.correctionItems.map(() =>
    createEmptyCorrectionItem(),
  );
  const usedCorrectionRows = new Set();

  standardWorkItems
    .slice(0, correctionItems.length)
    .forEach((item, index) => {
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
          : correctionItems.findIndex(
              (_, rowIndex) => !usedCorrectionRows.has(rowIndex),
            );

      if (targetIndex < 0) return;
      correctionItems[targetIndex] = syncB412CorrectionItem(
        item,
        legacy.correctionItems[targetIndex],
      );
      usedCorrectionRows.add(targetIndex);
    });

  return {
    ...legacy,
    serialNumber: firstInputValue(
      log.serialNumber,
      log.serialNo,
      legacy.serialNumber,
    ),
    passengerRows,
    componentData: syncedComponentData,
    fuelServicing: legacy.fuelServicing.map((row, index) =>
      index < standardFuelRows.length
        ? syncB412FuelRow(standardFuelRows[index], row)
        : row,
    ),
    oilServicing: legacy.oilServicing.map((row, index) =>
      index < standardOilRows.length
        ? syncB412OilRow(standardOilRows[index], row)
        : row,
    ),
    discrepancyRemarks: Object.prototype.hasOwnProperty.call(log, "remarks")
      ? log.remarks || ""
      : legacy.discrepancyRemarks,
    correctionItems,
  };
};

export const isB412Aircraft = (aircraftType = "") => {
  const normalized = String(aircraftType || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

  return normalized.includes("B412EP") || normalized.includes("BELL412EP");
};

const sumField = (left, right) => {
  const leftValue = String(left ?? "").trim();
  const rightValue = String(right ?? "").trim();

  if (!leftValue && !rightValue) return "";

  const total =
    (Number.parseFloat(leftValue) || 0) +
    (Number.parseFloat(rightValue) || 0);
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

export const hasCompleteB412BroughtForward = (values = {}) => {
  const broughtForward = mergeComponentTotals(values);

  return [
    broughtForward.airframe,
    broughtForward.mrGearbox.tsn,
    broughtForward.mrGearbox.tso,
    broughtForward.tr90Gearbox.tsn,
    broughtForward.tr90Gearbox.tso,
    broughtForward.tr42Gearbox.tsn,
    broughtForward.tr42Gearbox.tso,
    broughtForward.landingCycle,
    broughtForward.engine1.tsn,
    broughtForward.engine1.tso,
    broughtForward.engine1.cycle,
    broughtForward.engine2.tsn,
    broughtForward.engine2.tso,
    broughtForward.engine2.cycle,
    broughtForward.sling,
    broughtForward.others,
  ].every((value) => String(value ?? "").trim() !== "");
};

export {
  mapAircraftReferenceToB412,
  mapAircraftReferenceToBroughtForward,
  mapB412FlightLogToMonitoringTotals,
  mapStandardFlightLogToMonitoringTotals,
} from "../../../shared/flightLogPartsMonitoring";

export const B412_FLIGHT_LOG_TABS = [
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
