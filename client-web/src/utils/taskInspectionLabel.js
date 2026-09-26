export const formatTaskInspectionLabel = (inspection = {}) => {
  const name = inspection.name || "";
  const aircraftModel = String(inspection.aircraftModel || "").trim();

  return aircraftModel && !/^AS350\s*B3$/i.test(aircraftModel)
    ? `${name} (${aircraftModel})`
    : name;
};
