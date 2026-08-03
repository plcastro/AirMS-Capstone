const DATE_FORMAT_OPTIONS = [
  { month: "2-digit", day: "2-digit", year: "numeric" },
  { month: "numeric", day: "numeric", year: "numeric" },
  { month: "short", day: "numeric", year: "numeric" },
  { month: "long", day: "numeric", year: "numeric" },
];

const SEARCH_INDEX_CACHE =
  typeof WeakMap === "undefined" ? null : new WeakMap();

const isPotentialDateValue = (value) => {
  if (value instanceof Date) return true;
  if (typeof value !== "string") return false;

  const raw = value.trim();
  return (
    /^\d{1,2}\/\d{1,2}\/\d{2,4}/.test(raw) ||
    /^\d{4}-\d{1,2}-\d{1,2}/.test(raw) ||
    /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)/i.test(raw)
  );
};

const tryParseDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (!isPotentialDateValue(value)) return null;

  const raw = String(value).trim();
  const slashDate = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slashDate) {
    const [, month, day, yearValue] = slashDate;
    const year =
      yearValue.length === 2 ? Number(`20${yearValue}`) : Number(yearValue);
    const date = new Date(year, Number(month) - 1, Number(day));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const normalizeSearchText = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase();

export const compactSearchText = (value) =>
  normalizeSearchText(value).replace(/[^a-z0-9]/g, "");

export const getSearchableDateValues = (value) => {
  if (!value) return [];

  const raw = String(value).trim();
  const date = tryParseDate(value);
  if (!date) return [raw];

  const month = date.getMonth() + 1;
  const day = date.getDate();
  const year = date.getFullYear();
  const paddedMonth = String(month).padStart(2, "0");
  const paddedDay = String(day).padStart(2, "0");

  return [
    raw,
    `${month}/${day}/${year}`,
    `${paddedMonth}/${paddedDay}/${year}`,
    `${year}-${paddedMonth}-${paddedDay}`,
    ...DATE_FORMAT_OPTIONS.map((options) =>
      date.toLocaleDateString("en-US", options),
    ),
  ];
};

const collectSearchValuesInto = (value, depth, acc) => {
  if (value == null || depth > 5) return acc;
  if (value instanceof Date) {
    acc.push(...getSearchableDateValues(value));
    return acc;
  }

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    acc.push(String(value));
    if (isPotentialDateValue(value)) {
      acc.push(...getSearchableDateValues(value));
    }
    return acc;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectSearchValuesInto(item, depth + 1, acc));
    return acc;
  }

  if (typeof value === "object") {
    Object.values(value).forEach((item) =>
      collectSearchValuesInto(item, depth + 1, acc),
    );
    return acc;
  }

  return acc;
};

export const collectSearchValues = (value, depth = 0) =>
  collectSearchValuesInto(value, depth, []);

const buildSearchIndex = (value) => {
  const normalized = collectSearchValues(value)
    .map(normalizeSearchText)
    .filter(Boolean)
    .join(" ");

  return {
    normalized,
    compact: normalized.replace(/[^a-z0-9]/g, ""),
  };
};

const getSearchIndex = (value) => {
  if (
    !SEARCH_INDEX_CACHE ||
    value == null ||
    typeof value !== "object" ||
    value instanceof Date
  ) {
    return buildSearchIndex(value);
  }

  const cached = SEARCH_INDEX_CACHE.get(value);
  if (cached) return cached;

  const next = buildSearchIndex(value);
  SEARCH_INDEX_CACHE.set(value, next);
  return next;
};

export const matchesSearch = (query, value) => {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return true;

  const compactQuery = compactSearchText(query);
  const searchIndex = getSearchIndex(value);

  return (
    searchIndex.normalized.includes(normalizedQuery) ||
    (compactQuery && searchIndex.compact.includes(compactQuery))
  );
};

export const isDateLikeSearchQuery = (query) => {
  const value = String(query || "").trim();
  if (!value) return false;
  return (
    /\d{1,4}[/-]\d{1,2}([/-]\d{1,4})?/.test(value) ||
    /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)/i.test(value)
  );
};
