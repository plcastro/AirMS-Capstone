const MS_PER_DAY = 24 * 60 * 60 * 1000;

const colMap = {
  A: "componentName",
  B: "hourLimit1",
  C: "hourLimit2",
  D: "hourLimit3",
  E: "dayLimit",
  F: "dayType",
  G: "dateCW",
  H: "hoursCW",
  I: "daysRemaining",
  J: "timeRemaining",
  K: "dateDue",
  L: "ttCycleDue",
  M: "due",
  N: "hd",
  O: "timeSinceInstall",
  P: "totalTimeSinceNew",
};

const formulaFieldOrder = [
  "dateDue",
  "ttCycleDue",
  "daysRemaining",
  "timeRemaining",
  "due",
  "hd",
];

const parseDate = (dateStr) => {
  if (!dateStr || dateStr === "N/A" || dateStr === "") return null;
  if (dateStr instanceof Date) return Number.isNaN(dateStr.getTime()) ? null : dateStr;

  const str = String(dateStr).trim();
  let parts = str.split(" ")[0].split("-");
  if (parts.length === 3) {
    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  }

  parts = str.split(" ")[0].split("/");
  if (parts.length === 3) {
    let year = parts[2];
    if (year.length === 2) year = `20${year}`;
    return new Date(Number(year), Number(parts[0]) - 1, Number(parts[1]));
  }

  return null;
};

const formatDate = (date) => {
  if (!date || Number.isNaN(date.getTime())) return "";
  const yyyy = String(date.getFullYear());
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const getToday = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

const daysBetween = (date1, date2) => {
  if (!date1 || !date2) return null;
  return Math.round((date2 - date1) / MS_PER_DAY);
};

const toNumber = (value) => {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = Number(String(value).replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
};

const toPlainRow = (row) => {
  if (!row) return {};
  return typeof row.toObject === "function" ? row.toObject() : { ...row };
};

const normalizeFormulaResult = (value) => {
  if (value instanceof Date) return formatDate(value);
  if (typeof value === "number") {
    return Number.isInteger(value) ? String(value) : String(Math.round(value * 10) / 10);
  }
  return value === undefined || value === null ? "" : String(value);
};

const buildRowLookup = (rows) =>
  rows.reduce((lookup, row, index) => {
    lookup.set(String(row._id || index + 1), row);
    return lookup;
  }, new Map());

const getReferenceCellValue = (cell, refs = {}) => {
  const key = cell.replace(/\$/g, "").toUpperCase();
  const referenceCells = refs.referenceCells || {};

  if (key === "J1") return refs.landings;
  if (key === "L1") return refs.today;
  if (key === "L2") return refs.engTT ?? refs.acftTT;
  if (key === "H3") return refs.n1Cycles;
  if (key === "J3") return refs.n2Cycles;
  if (key === "L3") return refs.acftTT;
  if (referenceCells[key] !== undefined) return referenceCells[key];
  return "";
};

const compareValues = (left, operator, right) => {
  const leftNumber = toNumber(left);
  const rightNumber = toNumber(right);
  if (leftNumber === null || rightNumber === null) return false;

  if (operator === "<=") return leftNumber <= rightNumber;
  if (operator === ">=") return leftNumber >= rightNumber;
  if (operator === "<") return leftNumber < rightNumber;
  if (operator === ">") return leftNumber > rightNumber;
  if (operator === "=" || operator === "==") return leftNumber === rightNumber;
  return false;
};

const splitArithmetic = (expression) => {
  const parts = [];
  let token = "";
  for (let index = 0; index < expression.length; index += 1) {
    const char = expression[index];
    if ((char === "+" || char === "-") && token !== "") {
      parts.push(token.trim(), char);
      token = "";
    } else {
      token += char;
    }
  }
  if (token) parts.push(token.trim());
  return parts;
};

const applyArithmetic = (left, operator, right) => {
  const leftDate = parseDate(left);
  const rightDate = parseDate(right);
  const leftNumber = left === "" ? 0 : toNumber(left);
  const rightNumber = right === "" ? 0 : toNumber(right);

  if (leftDate && rightDate && operator === "-") {
    return (leftDate - rightDate) / MS_PER_DAY;
  }

  if (leftDate && rightNumber !== null) {
    return new Date(leftDate.getTime() + (operator === "+" ? rightNumber : -rightNumber) * MS_PER_DAY);
  }

  if (rightDate && leftNumber !== null && operator === "+") {
    return new Date(rightDate.getTime() + leftNumber * MS_PER_DAY);
  }

  if (leftNumber !== null && rightNumber !== null) {
    return operator === "+" ? leftNumber + rightNumber : leftNumber - rightNumber;
  }

  return "";
};

const evaluateOperand = (operand, context) => {
  const clean = String(operand || "").trim();
  if (/^".*"$/.test(clean)) return clean.slice(1, -1);
  if (/^-?\d+(\.\d+)?$/.test(clean)) return Number(clean);

  const cellMatch = clean.match(/^\$?([A-Z]+)\$?(\d+)$/i);
  if (cellMatch) {
    const [, col, rowNum] = cellMatch;
    if (Number(rowNum) < 6) {
      return getReferenceCellValue(clean, context.refs);
    }

    const targetRow = context.rowLookup.get(String(rowNum));
    const field = colMap[col.toUpperCase()];
    if (!targetRow || !field) return "";

    return evaluateField(targetRow, field, context);
  }

  return clean;
};

const evaluateExpression = (expression, context) => {
  const ifMatch = expression.match(/^IF\((.+?)(<=|>=|=|<|>)(.+?),("[^"]*"|[^,]*),("[^"]*"|[^)]*)\)$/i);
  if (ifMatch) {
    const [, leftExpr, operator, rightExpr, trueValue, falseValue] = ifMatch;
    return compareValues(
      evaluateExpression(leftExpr, context),
      operator,
      evaluateExpression(rightExpr, context),
    )
      ? evaluateOperand(trueValue, context)
      : evaluateOperand(falseValue, context);
  }

  const parts = splitArithmetic(expression);
  if (parts.length === 1) return evaluateOperand(parts[0], context);

  let result = evaluateOperand(parts[0], context);
  for (let index = 1; index < parts.length; index += 2) {
    result = applyArithmetic(result, parts[index], evaluateOperand(parts[index + 1], context));
  }
  return result;
};

function evaluateField(row, field, context) {
  const key = `${row._id}:${field}`;
  if (context.visiting.has(key)) return row[field] || "";
  if (context.cache.has(key)) return context.cache.get(key);

  const formula = row.formulas?.[field];
  if (!formula) return row[field] || "";

  context.visiting.add(key);
  const result = evaluateExpression(String(formula).replace(/^=/, ""), context);
  context.visiting.delete(key);
  context.cache.set(key, result);
  return result;
}

const fallbackTTCycleDue = (row) => {
  if (row.ttCycleDue !== "") return row.ttCycleDue || "";
  const limit = toNumber(row.hourLimit1);
  const hrs = toNumber(row.hoursCW);
  if (limit === null && hrs === null) return "";
  return normalizeFormulaResult((limit || 0) + (hrs || 0));
};

const fallbackTimeRemaining = (row, refs) => {
  const due = toNumber(row.ttCycleDue);
  if (due === null) return row.timeRemaining || "";

  const name = String(row.componentName || "").toUpperCase();
  const hourCycleType = String(row.hourLimit1 || row.hourLimit2 || row.hd || "").toUpperCase();
  let current = refs.acftTT;

  if (name.includes("N1") || hourCycleType.includes("N1")) current = refs.n1Cycles;
  else if (name.includes("N2") || hourCycleType.includes("N2")) current = refs.n2Cycles;
  else if (name.includes("ENGINE") || name.includes("POWERPLANT")) current = refs.engTT ?? refs.acftTT;

  const currentNumber = toNumber(current);
  return currentNumber === null ? "" : normalizeFormulaResult(due - currentNumber);
};

const fallbackDaysRemaining = (row, refs) => {
  const dueDate = parseDate(row.dateDue);
  const today = parseDate(refs.today);
  if (!dueDate || !today) return row.daysRemaining || "";
  return normalizeFormulaResult(daysBetween(today, dueDate));
};

const fallbackDue = (timeRemaining, daysRemaining) => {
  const time = toNumber(timeRemaining);
  const days = toNumber(daysRemaining);
  if (time !== null && time <= 30) return "DUE";
  if (days !== null && days <= 30) return "DUE";
  return "";
};

const normalizeDueColumns = (row) => {
  const time = toNumber(row.timeRemaining);
  const days = toNumber(row.daysRemaining);
  const dueByTime =
    (Boolean(row.formulas?.due) &&
      String(row.due || "").toUpperCase() === "DUE") ||
    (time !== null && time <= 30);
  const dueByDays =
    (Boolean(row.formulas?.hd) &&
      String(row.hd || "").toUpperCase() === "DUE") ||
    (days !== null && days <= 30);

  return {
    ...row,
    due: dueByTime || dueByDays ? "DUE" : "",
    hd:
      dueByTime && dueByDays
        ? "H/D"
        : dueByTime
          ? "H"
          : dueByDays
            ? "D"
            : "",
  };
};

const applyFormulas = (row, allData, rowIndex, refs, sharedContext) => {
  const nextRow = toPlainRow(row);
  const context =
    sharedContext ||
    {
      refs,
      rowLookup: buildRowLookup(allData),
      cache: new Map(),
      visiting: new Set(),
    };

  formulaFieldOrder.forEach((field) => {
    if (nextRow.formulas?.[field]) {
      nextRow[field] = normalizeFormulaResult(evaluateField(nextRow, field, context));
    }
  });

  if (!nextRow.formulas?.ttCycleDue) {
    nextRow.ttCycleDue = fallbackTTCycleDue(nextRow);
  }

  if (!nextRow.formulas?.dateDue && nextRow.dateCW && nextRow.dayLimit) {
    const dateCW = parseDate(nextRow.dateCW);
    const dayLimit = toNumber(nextRow.dayLimit);
    if (dateCW && dayLimit !== null) {
      nextRow.dateDue = normalizeFormulaResult(
        new Date(dateCW.getTime() + dayLimit * MS_PER_DAY),
      );
    }
  }

  if (!nextRow.formulas?.daysRemaining || nextRow.daysRemaining === "") {
    nextRow.daysRemaining = fallbackDaysRemaining(nextRow, refs);
  }

  if (!nextRow.formulas?.timeRemaining || nextRow.timeRemaining === "") {
    nextRow.timeRemaining = fallbackTimeRemaining(nextRow, refs);
  }

  return normalizeDueColumns(nextRow);
};

const processDataWithFormulas = (data, refs) => {
  const rows = data.map(toPlainRow);
  const context = {
    refs,
    rowLookup: buildRowLookup(rows),
    cache: new Map(),
    visiting: new Set(),
  };

  const processedData = rows.map((row, index) =>
    applyFormulas(row, rows, index, refs, context),
  );

  context.rowLookup = buildRowLookup(processedData);
  context.cache = new Map();

  return processedData.map((row, index) =>
    applyFormulas(row, processedData, index, refs, context),
  );
};

module.exports = {
  formatDate,
  getToday,
  parseDate,
  processDataWithFormulas,
};
