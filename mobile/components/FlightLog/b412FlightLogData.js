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
  const componentData = value?.componentData || {};

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
