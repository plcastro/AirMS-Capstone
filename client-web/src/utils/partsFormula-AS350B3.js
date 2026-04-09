export const parseDate = (dateStr) => {
  if (!dateStr || dateStr === "N/A" || dateStr === "") return null;

  if (typeof dateStr === "number") {
    const excelEpoch = new Date(1900, 0, 1);
    const daysOffset = dateStr - 2;
    return new Date(excelEpoch.getTime() + daysOffset * 86400000);
  }

  const str = String(dateStr);

  let parts = str.split(" ")[0].split("-");
  if (parts.length === 3) {
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }

  parts = str.split(" ")[0].split("/");
  if (parts.length === 3) {
    let year = parts[2];
    if (year.length === 2) year = "20" + year;
    return new Date(year, parts[0] - 1, parts[1]);
  }

  return null;
};

export const formatDate = (date) => {
  if (!date || isNaN(date.getTime())) return "";
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const yy = String(date.getFullYear()).slice(-2);
  return `${mm}/${dd}/${yy}`;
};

export const getToday = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

export const daysBetween = (date1, date2) => {
  if (!date1 || !date2) return null;
  const diffTime = date2 - date1;
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
};

const safeEvaluate = (expression) => {
  const expr = expression.replace(/\s/g, "");

  if (!/^[\d+\-*/().]+$/.test(expr)) {
    throw new Error("Invalid expression");
  }

  try {
    const fn = new Function(`return (${expr})`);
    const result = fn();
    if (typeof result !== "number" || isNaN(result)) {
      throw new Error("Result is not a number");
    }
    return result;
  } catch (err) {
    throw new Error("Evaluation error");
  }
};

const evaluateFormula = (formula, row, allData, rowIndex, refs) => {
  if (!formula || !formula.startsWith("=")) return formula;

  const expression = formula.substring(1);

  const cellRegex = /([A-Z]+)(\$?)(\d+)/g;
  let evaluatedExpression = expression;

  let match;
  while ((match = cellRegex.exec(expression)) !== null) {
    const colLetter = match[1];
    const isAbsolute = match[2] === "$";
    const rowNum = parseInt(match[3]);
    const cellRef = match[0];

    let value;

    if (isAbsolute && rowNum === 1) {
      if (colLetter === "L") value = refs.today;
      else if (colLetter === "K") value = "";
      else value = "";
    } else {
      const targetRowIndex = rowNum - 1;
      if (targetRowIndex >= 0 && targetRowIndex < allData.length) {
        const targetRow = allData[targetRowIndex];
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
        const dataIndex = colMap[colLetter];
        if (dataIndex && targetRow[dataIndex]) {
          value = targetRow[dataIndex];
        }
      }
    }

    evaluatedExpression = evaluatedExpression.replace(
      cellRef,
      value !== undefined ? value : "0",
    );
  }

  try {
    if (
      evaluatedExpression.includes("+") ||
      evaluatedExpression.includes("-")
    ) {
      const parts = evaluatedExpression.split(/([+-])/);
      if (parts.length >= 3) {
        const left = parts[0].trim();
        const operator = parts[1];
        const right = parts[2].trim();

        const leftDate = parseDate(left);
        if (leftDate && !isNaN(right)) {
          const resultDate = new Date(leftDate);
          if (operator === "+") {
            resultDate.setDate(resultDate.getDate() + parseFloat(right));
          } else if (operator === "-") {
            resultDate.setDate(resultDate.getDate() - parseFloat(right));
          }
          return formatDate(resultDate);
        }
      }
    }

    const result = safeEvaluate(evaluatedExpression);
    return result;
  } catch (error) {
    console.error("Error evaluating formula:", formula, error);
    return formula;
  }
};

export const calculateTTCycleDue = (
  hourLimit,
  hoursCW,
  row,
  allData,
  rowIndex,
  refs,
) => {
  if (hourLimit && hourLimit.startsWith("=")) {
    hourLimit = evaluateFormula(hourLimit, row, allData, rowIndex, refs);
  }
  if (hoursCW && hoursCW.startsWith("=")) {
    hoursCW = evaluateFormula(hoursCW, row, allData, rowIndex, refs);
  }

  if (!hourLimit && !hoursCW) return "";
  const limit = parseFloat(hourLimit) || 0;
  const hrs = parseFloat(hoursCW) || 0;
  if (limit === 0 && hrs === 0) return "";
  return (limit + hrs).toFixed(1);
};

export const calculateDaysRemaining = (
  dateCW,
  dayLimit,
  today,
  row,
  allData,
  rowIndex,
  refs,
) => {
  if (dateCW && dateCW.startsWith("=")) {
    dateCW = evaluateFormula(dateCW, row, allData, rowIndex, refs);
  }
  if (dayLimit && dayLimit.startsWith("=")) {
    dayLimit = evaluateFormula(dayLimit, row, allData, rowIndex, refs);
  }

  if (!dateCW || !dayLimit) return "";
  const cwDate = parseDate(dateCW);
  if (!cwDate) return "";
  const dueDate = new Date(cwDate);
  dueDate.setDate(dueDate.getDate() + parseInt(dayLimit));
  return daysBetween(today, dueDate);
};

export const calculateDateDue = (
  dateCW,
  dayLimit,
  row,
  allData,
  rowIndex,
  refs,
) => {
  if (dateCW && dateCW.startsWith("=")) {
    dateCW = evaluateFormula(dateCW, row, allData, rowIndex, refs);
  }
  if (dayLimit && dayLimit.startsWith("=")) {
    dayLimit = evaluateFormula(dayLimit, row, allData, rowIndex, refs);
  }

  if (!dateCW || !dayLimit) return "";
  const cwDate = parseDate(dateCW);
  if (!cwDate) return "";
  const dueDate = new Date(cwDate);
  dueDate.setDate(dueDate.getDate() + parseInt(dayLimit));
  return formatDate(dueDate);
};

export const calculateTimeRemaining = (
  ttCycleDue,
  acftTT,
  n1Cycles,
  n2Cycles,
  componentName,
  row,
  allData,
  rowIndex,
  refs,
) => {
  if (ttCycleDue && ttCycleDue.startsWith("=")) {
    ttCycleDue = evaluateFormula(ttCycleDue, row, allData, rowIndex, refs);
  }

  if (!ttCycleDue) return "";
  const due = parseFloat(ttCycleDue);
  if (isNaN(due)) return "";

  const name = componentName || "";
  if (name.includes("N1") || name.includes("N1 ")) {
    return (due - n1Cycles).toFixed(1);
  } else if (name.includes("N2")) {
    return (due - n2Cycles).toFixed(1);
  } else {
    return (due - acftTT).toFixed(1);
  }
};

export const applyFormulas = (row, allData, rowIndex, refs) => {
  const { today, acftTT, n1Cycles, n2Cycles } = refs;

  let newRow = { ...row };

  if (
    (row.dateCW && row.dateCW !== "N/A" && row.dateCW !== "") ||
    (row.dayLimit && row.dayLimit !== "")
  ) {
    const daysRemaining = calculateDaysRemaining(
      row.dateCW,
      row.dayLimit,
      today,
      row,
      allData,
      rowIndex,
      refs,
    );
    newRow.daysRemaining = daysRemaining !== null ? daysRemaining : "";
    newRow.dateDue = calculateDateDue(
      row.dateCW,
      row.dayLimit,
      row,
      allData,
      rowIndex,
      refs,
    );
  }

  if (
    (row.hourLimit1 && row.hourLimit1 !== "") ||
    (row.hoursCW && row.hoursCW !== "")
  ) {
    newRow.ttCycleDue = calculateTTCycleDue(
      row.hourLimit1,
      row.hoursCW,
      row,
      allData,
      rowIndex,
      refs,
    );
  }

  if (newRow.ttCycleDue) {
    newRow.timeRemaining = calculateTimeRemaining(
      newRow.ttCycleDue,
      acftTT,
      n1Cycles,
      n2Cycles,
      row.componentName,
      row,
      allData,
      rowIndex,
      refs,
    );
  }

  newRow.due = checkDue(newRow.timeRemaining, newRow.daysRemaining);

  return newRow;
};

export const checkDue = (timeRemaining, daysRemaining) => {
  if (timeRemaining && parseFloat(timeRemaining) <= 30) return "DUE";
  if (daysRemaining && daysRemaining <= 30) return "DUE";
  return "";
};

export const processDataWithFormulas = (data, refs) => {
  let processedData = data.map((row, index) => {
    return applyFormulas(row, data, index, refs);
  });

  processedData = processedData.map((row, index) => {
    return applyFormulas(row, processedData, index, refs);
  });

  return processedData;
};
