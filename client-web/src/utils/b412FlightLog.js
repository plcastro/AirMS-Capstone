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
  const componentData = source.componentData || {};

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

export const hasNestedB412Value = (value) => {
  if (Array.isArray(value)) return value.some(hasNestedB412Value);
  if (value && typeof value === "object") {
    return Object.values(value).some(hasNestedB412Value);
  }
  return String(value ?? "").trim() !== "";
};

export const mapAircraftReferenceToB412 = (aircraftData = {}) => {
  const referenceData = aircraftData?.referenceData || {};
  const broughtForwardData = createEmptyComponentTotals();

  return {
    broughtForwardData: {
      ...broughtForwardData,
      airframe: referenceData.acftTT || "",
      mrGearbox: {
        tsn: referenceData.gbmTT || referenceData.acftTT || "",
        tso: referenceData.gbmTSO || "",
      },
      tr90Gearbox: {
        tsn: referenceData.gbtTT || referenceData.acftTT || "",
        tso: referenceData.gbtTSO || "",
      },
      tr42Gearbox: {
        tsn: referenceData.gbt42TT || referenceData.gbtTT || "",
        tso: referenceData.gbt42TSO || referenceData.gbtTSO || "",
      },
      landingCycle: referenceData.landings || "",
      engine1: {
        tsn:
          referenceData.eng1TT ||
          referenceData.engTT ||
          referenceData.acftTT ||
          "",
        tso: referenceData.eng1TSO || "",
        cycle: referenceData.n1Cycles || "",
      },
      engine2: {
        tsn:
          referenceData.eng2TT ||
          referenceData.engTT ||
          referenceData.acftTT ||
          "",
        tso: referenceData.eng2TSO || "",
        cycle: referenceData.n2Cycles || "",
      },
      sling: referenceData.usage || "",
      others: "",
    },
    airframeNextInspectionDueAt: referenceData.acrfNextInsp || "",
    engineNextInspectionDueAt: referenceData.engNextInsp || "",
  };
};

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
