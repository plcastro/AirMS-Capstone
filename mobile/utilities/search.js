const DATE_FORMAT_OPTIONS = [
  { month: "2-digit", day: "2-digit", year: "numeric" },
  { month: "numeric", day: "numeric", year: "numeric" },
  { month: "short", day: "numeric", year: "numeric" },
  { month: "long", day: "numeric", year: "numeric" },
];

const tryParseDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

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

export const collectSearchValues = (value, depth = 0) => {
  if (value == null || depth > 5) return [];
  if (value instanceof Date) return getSearchableDateValues(value);

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return [String(value), ...getSearchableDateValues(value)];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => collectSearchValues(item, depth + 1));
  }

  if (typeof value === "object") {
    return Object.values(value).flatMap((item) =>
      collectSearchValues(item, depth + 1),
    );
  }

  return [];
};

export const matchesSearch = (query, value) => {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return true;

  const compactQuery = compactSearchText(query);
  return collectSearchValues(value).some((entry) => {
    const normalizedEntry = normalizeSearchText(entry);
    const compactEntry = compactSearchText(entry);
    return (
      normalizedEntry.includes(normalizedQuery) ||
      (compactQuery && compactEntry.includes(compactQuery))
    );
  });
};

export const isDateLikeSearchQuery = (query) => {
  const value = String(query || "").trim();
  if (!value) return false;
  return (
    /\d{1,4}[/-]\d{1,2}([/-]\d{1,4})?/.test(value) ||
    /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)/i.test(value)
  );
};
