// Turns flight workflow history events into readable "field: old -> new" rows.
// Events store either { field: { before, after } } diffs or plain detail objects
// (amendments, confirmations, defect status), so both shapes are handled here.

export const EMPTY_VALUE = "—";
const MAX_ROWS_PER_EVENT = 40;
const HIDDEN_KEYS = new Set(["_id", "__v", "id", "userId", "actorId", "inspectionVersion", "digest", "digestScope", "snapshot"]);
const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date);

const isDiff = (value) =>
  isPlainObject(value) && ("before" in value || "after" in value) &&
  Object.keys(value).every((key) => key === "before" || key === "after");

const isHiddenKey = (key) => HIDDEN_KEYS.has(key) || /[a-z]Id$/.test(key);

export const humanizeKey = (key = "") =>
  String(key)
    .replace(/_/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (c) => c.toUpperCase());

export const formatHistoryDate = (value) => {
  if (!value) return EMPTY_VALUE;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
};

export const formatHistoryValue = (value) => {
  if (value === null || value === undefined) return EMPTY_VALUE;
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : EMPTY_VALUE;
  if (value instanceof Date) return formatHistoryDate(value);
  if (typeof value === "string") {
    const text = value.trim();
    if (!text) return EMPTY_VALUE;
    if (text.startsWith("data:image")) return "Signature captured";
    if (ISO_DATE.test(text)) return formatHistoryDate(text);
    return text;
  }
  if (Array.isArray(value)) {
    if (!value.length) return EMPTY_VALUE;
    if (value.every((item) => !isPlainObject(item) && !Array.isArray(item)))
      return value.map(formatHistoryValue).join(", ");
    return `${value.length} item${value.length === 1 ? "" : "s"}`;
  }
  if (isPlainObject(value)) {
    if (typeof value.name === "string" && value.name.trim()) return value.name.trim();
    return Object.keys(value).length ? "Details recorded" : EMPTY_VALUE;
  }
  return String(value);
};

// Person-like objects (crew, signers) read best as just the name.
const isLeaf = (value) =>
  !isPlainObject(value) && !Array.isArray(value) ||
  (isPlainObject(value) && typeof value.name === "string") ||
  (Array.isArray(value) && value.every((item) => !isPlainObject(item) && !Array.isArray(item)));

const flatten = (value, path = [], out = new Map()) => {
  if (isLeaf(value)) {
    out.set(path.join("\u0000"), { path, value });
    return out;
  }
  const entries = Array.isArray(value)
    ? value.map((item, index) => [`#${index + 1}`, item])
    : Object.entries(value);
  if (!entries.length) out.set(path.join("\u0000"), { path, value: null });
  for (const [key, child] of entries) {
    if (isHiddenKey(key)) continue;
    flatten(child, [...path, key], out);
  }
  return out;
};

const label = (path) => path.map((part) => (part.startsWith("#") ? part : humanizeKey(part))).join(" › ");

const diffRows = (field, before, after) => {
  const left = flatten(before, [field]);
  const right = flatten(after, [field]);
  const rows = [];
  for (const key of new Set([...left.keys(), ...right.keys()])) {
    const oldValue = formatHistoryValue(left.get(key)?.value);
    const newValue = formatHistoryValue(right.get(key)?.value);
    if (oldValue === newValue) continue;
    rows.push({ field: label((left.get(key) || right.get(key)).path), before: oldValue, after: newValue });
  }
  return rows;
};

export const describeHistoryChanges = (changes) => {
  if (!isPlainObject(changes)) return { rows: [], hiddenCount: 0 };
  const rows = [];
  for (const [field, value] of Object.entries(changes)) {
    if (isHiddenKey(field)) continue;
    if (isDiff(value)) {
      rows.push(...diffRows(field, value.before, value.after));
      continue;
    }
    for (const { path, value: leaf } of flatten(value, [field]).values()) {
      const text = formatHistoryValue(leaf);
      if (text === EMPTY_VALUE) continue;
      rows.push({ field: label(path), before: EMPTY_VALUE, after: text });
    }
  }
  return {
    rows: rows.slice(0, MAX_ROWS_PER_EVENT),
    hiddenCount: Math.max(0, rows.length - MAX_ROWS_PER_EVENT),
  };
};

export const describeHistoryEvent = (event = {}) => ({
  title: humanizeKey(event.action || "update"),
  changedBy: event.signer?.name || event.actorName || event.actorId || "Unknown user",
  at: formatHistoryDate(event.at),
  version: event.version ?? null,
  comment: String(event.comment || "").trim(),
  signed: Boolean(event.signer),
  ...describeHistoryChanges(event.changes),
});

export const describeAmendment = (amendment = {}) => ({
  title: `Amendment: ${humanizeKey(amendment.section || "correction")}`,
  changedBy: amendment.signer?.name || "Unknown user",
  at: formatHistoryDate(amendment.at),
  version: amendment.originalVersion ?? null,
  comment: String(amendment.reason || "").trim(),
  signed: Boolean(amendment.signer),
  rows: [{
    field: humanizeKey(amendment.section || "correction"),
    before: "Original record kept",
    after: formatHistoryValue(amendment.correction),
  }],
  hiddenCount: 0,
});
