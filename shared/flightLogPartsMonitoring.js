const hasMonitoringValue = (value) =>
  value !== undefined &&
  value !== null &&
  (typeof value !== "string" || value.trim() !== "");

const firstMonitoringValue = (...values) => {
  const value = values.find(hasMonitoringValue);
  return value === undefined ? "" : value;
};

const getReferenceCell = (referenceCells = {}, address) => {
  const normalizedAddress = String(address || "").toUpperCase();
  const matchingKey = Object.keys(referenceCells || {}).find(
    (key) => String(key).toUpperCase() === normalizedAddress,
  );

  return matchingKey ? referenceCells[matchingKey] : undefined;
};

const toMonitoringNumber = (value) => {
  if (!hasMonitoringValue(value)) return undefined;
  const parsed = Number(String(value).replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : undefined;
};

const addOptionalNumber = (target, field, value) => {
  const parsed = toMonitoringNumber(value);
  if (parsed !== undefined) target[field] = parsed;
};

const addOptionalText = (target, field, value) => {
  if (hasMonitoringValue(value)) target[field] = String(value).trim();
};

/**
 * Maps the selected aircraft's Parts Lifespan Monitoring reference totals to
 * the single-engine Flight Log Brought Forward section.
 */
export const mapAircraftReferenceToBroughtForward = (aircraftData = {}) => {
  const referenceData = aircraftData?.referenceData || {};

  return {
    airframe: firstMonitoringValue(referenceData.acftTT),
    gearBoxMain: firstMonitoringValue(
      referenceData.gbmTT,
      referenceData.acftTT,
    ),
    gearBoxTail: firstMonitoringValue(
      referenceData.gbtTT,
      referenceData.acftTT,
    ),
    rotorMain: firstMonitoringValue(
      referenceData.mrbTT,
      referenceData.acftTT,
    ),
    rotorTail: firstMonitoringValue(
      referenceData.trbTT,
      referenceData.acftTT,
    ),
    airframeNextInsp: firstMonitoringValue(referenceData.acrfNextInsp),
    engine: firstMonitoringValue(referenceData.engTT, referenceData.acftTT),
    cycleN1: firstMonitoringValue(referenceData.n1Cycles),
    cycleN2: firstMonitoringValue(referenceData.n2Cycles),
    usage: firstMonitoringValue(referenceData.usage),
    landingCycle: firstMonitoringValue(referenceData.landings),
    engineNextInsp: firstMonitoringValue(referenceData.engNextInsp),
  };
};

/**
 * Maps Bell 412EP-specific monitoring totals. Older imported monitoring
 * records only retained the workbook header cells, so those cells are used as
 * migration fallbacks after canonical reference fields.
 */
export const mapAircraftReferenceToB412 = (aircraftData = {}) => {
  const referenceData = aircraftData?.referenceData || {};
  const referenceCells = referenceData.referenceCells || {};
  const acftTT = firstMonitoringValue(
    referenceData.acftTT,
    getReferenceCell(referenceCells, "L3"),
  );

  return {
    broughtForwardData: {
      airframe: acftTT,
      mrGearbox: {
        tsn: firstMonitoringValue(referenceData.gbmTT, acftTT),
        tso: firstMonitoringValue(referenceData.gbmTSO),
      },
      tr90Gearbox: {
        tsn: firstMonitoringValue(referenceData.gbtTT, acftTT),
        tso: firstMonitoringValue(referenceData.gbtTSO),
      },
      tr42Gearbox: {
        tsn: firstMonitoringValue(
          referenceData.gbt42TT,
          referenceData.gbtTT,
          acftTT,
        ),
        tso: firstMonitoringValue(
          referenceData.gbt42TSO,
          referenceData.gbtTSO,
        ),
      },
      landingCycle: firstMonitoringValue(
        referenceData.landings,
        getReferenceCell(referenceCells, "J1"),
      ),
      engine1: {
        tsn: firstMonitoringValue(
          referenceData.eng1TT,
          referenceData.engTT,
          getReferenceCell(referenceCells, "L2"),
          acftTT,
        ),
        tso: firstMonitoringValue(
          referenceData.eng1TSO,
          getReferenceCell(referenceCells, "J2"),
        ),
        cycle: firstMonitoringValue(
          referenceData.eng1Cycles,
          getReferenceCell(referenceCells, "H2"),
          referenceData.n1Cycles,
        ),
      },
      engine2: {
        tsn: firstMonitoringValue(
          referenceData.eng2TT,
          getReferenceCell(referenceCells, "N2"),
          referenceData.engTT,
          acftTT,
        ),
        tso: firstMonitoringValue(
          referenceData.eng2TSO,
          getReferenceCell(referenceCells, "J3"),
        ),
        cycle: firstMonitoringValue(
          referenceData.eng2Cycles,
          getReferenceCell(referenceCells, "H3"),
          referenceData.n2Cycles,
        ),
      },
      sling: firstMonitoringValue(
        referenceData.usage,
        referenceData.sling,
        getReferenceCell(referenceCells, "N3"),
      ),
      others: firstMonitoringValue(referenceData.others),
    },
    airframeNextInspectionDueAt: firstMonitoringValue(
      referenceData.acrfNextInsp,
    ),
    engineNextInspectionDueAt: firstMonitoringValue(
      referenceData.engNextInsp,
    ),
  };
};

/**
 * Builds the Parts Lifespan Monitoring totals written when a single-engine
 * Flight Log is completed.
 */
export const mapStandardFlightLogToMonitoringTotals = (componentData = {}) => {
  const broughtForward = componentData.broughtForwardData || {};
  const thisFlight = componentData.thisFlightData || {};
  const toDate = componentData.toDateData || {};
  const acftTT = toMonitoringNumber(toDate.airframe) ?? 0;
  const totals = {
    acftTT,
    engTT: toMonitoringNumber(toDate.engine) ?? acftTT,
    n1Cycles: toMonitoringNumber(toDate.cycleN1) ?? 0,
    n2Cycles: toMonitoringNumber(toDate.cycleN2) ?? 0,
    landings: toMonitoringNumber(toDate.landingCycle) ?? 0,
  };
  const hasSourceValue = (field) =>
    hasMonitoringValue(broughtForward[field]) ||
    hasMonitoringValue(thisFlight[field]);

  [
    ["gbmTT", "gearBoxMain"],
    ["gbtTT", "gearBoxTail"],
    ["mrbTT", "rotorMain"],
    ["trbTT", "rotorTail"],
    ["usage", "usage"],
  ].forEach(([monitoringField, flightLogField]) => {
    if (hasSourceValue(flightLogField)) {
      addOptionalNumber(totals, monitoringField, toDate[flightLogField]);
    }
  });
  addOptionalText(totals, "acrfNextInsp", toDate.airframeNextInsp);
  addOptionalText(totals, "engNextInsp", toDate.engineNextInsp);

  return totals;
};

/**
 * Builds the full Bell 412EP monitoring snapshot written on completion.
 */
export const mapB412FlightLogToMonitoringTotals = (componentData = {}) => {
  const toDate = componentData.toDateData || {};
  const acftTT = toMonitoringNumber(toDate.airframe) ?? 0;
  const eng1TT = toMonitoringNumber(toDate.engine1?.tsn) ?? acftTT;
  const eng1Cycles = toMonitoringNumber(toDate.engine1?.cycle) ?? 0;
  const eng2Cycles = toMonitoringNumber(toDate.engine2?.cycle) ?? 0;
  const totals = {
    acftTT,
    engTT: eng1TT,
    n1Cycles: eng1Cycles,
    n2Cycles: eng2Cycles,
    landings: toMonitoringNumber(toDate.landingCycle) ?? 0,
    eng1TT,
    eng1Cycles,
    eng2Cycles,
  };

  [
    ["gbmTT", toDate.mrGearbox?.tsn],
    ["gbmTSO", toDate.mrGearbox?.tso],
    ["gbtTT", toDate.tr90Gearbox?.tsn],
    ["gbtTSO", toDate.tr90Gearbox?.tso],
    ["gbt42TT", toDate.tr42Gearbox?.tsn],
    ["gbt42TSO", toDate.tr42Gearbox?.tso],
    ["eng1TSO", toDate.engine1?.tso],
    ["eng2TT", toDate.engine2?.tsn],
    ["eng2TSO", toDate.engine2?.tso],
    ["usage", toDate.sling],
    ["others", toDate.others],
  ].forEach(([field, value]) => addOptionalNumber(totals, field, value));
  addOptionalText(
    totals,
    "acrfNextInsp",
    componentData.airframeNextInspectionDueAt,
  );
  addOptionalText(
    totals,
    "engNextInsp",
    componentData.engineNextInspectionDueAt,
  );

  return totals;
};
