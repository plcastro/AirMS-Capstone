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
  { minutes: 8, names: ["APPAREO camera", "AIRS-400 Camera", "Battery"] },
  { minutes: 10, names: ["Cargo door", "Crew door", "Pitot System"] },
  { minutes: 12.5, names: ["Fuel pump", "Hydraulic pump - Belt", "Fuel system"] },
  { minutes: 15, names: ["Main rotor blade", "Tail rotor blade", "Swashplate"] },
  { minutes: 20, names: ["Engine-to-MGB coupling", "Main rotor mast", "Free wheel"] },
  { minutes: 30, names: ["P-Check", "Spectrometric Oil Analysis Program (SOAP)"] },
]);

const KEYWORD_DURATION_RULES = [
  { minutes: 30, keywords: ["soap", "hoist", "overhaul", "cargo swing"] },
  { minutes: 20, keywords: ["coupling", "mast", "reduction gear", "free wheel"] },
  { minutes: 15, keywords: ["rotor", "swash", "pitch change", "servocontrol"] },
  { minutes: 12.5, keywords: ["fuel", "oil", "hydraulic", "gear", "structure"] },
  { minutes: 10, keywords: ["door", "window", "seat", "pitot", "camera", "light"] },
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

  return matchingRule?.minutes || DEFAULT_ITEM_MINUTES;
};

export const estimateInspectionSchedule = (checklistItems = []) => {
  const validItems = checklistItems.filter(
    (item) => String(item?.taskName || "").trim().length > 0,
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

export const addMinutesToDate = (date, minutes) => {
  const safeDate = date instanceof Date ? date : new Date(date);
  return new Date(safeDate.getTime() + minutes * 60 * 1000);
};

export const formatEstimatedDuration = (minutes) => {
  const wholeMinutes = Math.max(0, Math.round(minutes));
  const hours = Math.floor(wholeMinutes / MINUTES_PER_HOUR);
  const remainingMinutes = wholeMinutes % MINUTES_PER_HOUR;

  if (hours === 0) return `${remainingMinutes} min`;
  if (remainingMinutes === 0) return `${hours} hr`;
  return `${hours} hr ${remainingMinutes} min`;
};
