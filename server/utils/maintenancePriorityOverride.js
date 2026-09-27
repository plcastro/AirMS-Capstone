const { createHash } = require("node:crypto");
const { parseDate } = require("./partsMonitoringFormulas");

const PRIORITY_RANKS = Object.freeze({ Critical: 1, High: 2, Medium: 3, Low: 4 });
const numberKey = (value) => {
  if (value === null || value === undefined || String(value).trim() === "") return "";
  const numeric = Number(String(value).replace(/,/g, ""));
  return Number.isFinite(numeric) ? numeric : String(value).trim();
};
const dateKey = (value) => {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(String(value))) return String(value).slice(0, 10);
  const date = parseDate(value);
  if (!date || Number.isNaN(date.getTime())) return String(value).trim();
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
};

// Templates are shared across aircraft and cycles. Bind to the aircraft row and
// fixed completion/due targets, never to the changing remaining hours or today.
function inspectionIdentity(record, inspection) {
  if (!inspection?.part?._id) return null;
  const part = inspection.part;
  const identity = [String(record._id || record.aircraft), String(part._id),
    inspection.inspectionKey, dateKey(part.dateCW), numberKey(part.hoursCW),
    dateKey(part.dateDue), numberKey(part.ttCycleDue)];
  return createHash("sha256").update(JSON.stringify(identity)).digest("hex");
}

function effectivePriority(record, inspection, automatic) {
  const inspectionId = inspectionIdentity(record, inspection);
  const saved = record.manualPriorityOverride;
  const override = saved?.toObject ? saved.toObject() : saved;
  const active = Boolean(inspectionId && override &&
    Object.hasOwn(PRIORITY_RANKS, override.level) && override.appliesToInspectionId === inspectionId);
  return {
    inspectionId,
    priorityLevel: active ? override.level : automatic.priorityLevel,
    priorityRank: active ? PRIORITY_RANKS[override.level] : automatic.priorityRank,
    autoPriorityLevel: automatic.priorityLevel,
    autoPriorityRank: automatic.priorityRank,
    manualPriorityOverride: active ? override : null,
    stale: Boolean(override && !active),
  };
}

function staleOverrideUpdate(record) {
  const saved = record.manualPriorityOverride;
  return {
    updateOne: {
      filter: {
        _id: record._id,
        "manualPriorityOverride.appliesToInspectionId": saved.appliesToInspectionId,
        "manualPriorityOverride.setAt": saved.setAt,
      },
      update: { $unset: { manualPriorityOverride: "" } },
    },
  };
}

module.exports = { PRIORITY_RANKS, inspectionIdentity, effectivePriority, staleOverrideUpdate };
