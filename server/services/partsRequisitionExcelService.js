const path = require("path");
const ExcelJS = require("exceljs");

const TEMPLATE_PATH = path.join(
  __dirname,
  "..",
  "templates",
  "parts-requisition-monitoring.xlsx",
);

const ITEM_START_ROW = 9;
const ITEM_END_ROW = 26;
const TEMPLATE_ITEM_ROW_COUNT = ITEM_END_ROW - ITEM_START_ROW + 1;

const formatDate = (value) => {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return `${date.getMonth() + 1}/${String(date.getDate()).padStart(
    2,
    "0",
  )}/${date.getFullYear()}`;
};

const cleanValue = (value) =>
  value === null || value === undefined ? "" : String(value);

const firstValue = (...values) =>
  values.find((value) => cleanValue(value).trim() !== "") || "";

const getMatCodeText = (item = {}) => {
  if (Array.isArray(item.codeParticular) && item.codeParticular.length > 0) {
    return item.codeParticular
      .map((entry) => entry?.matCodeNo)
      .filter(Boolean)
      .join(", ");
  }

  return item.matCodeNo || "";
};

const getParticularText = (item = {}) => {
  if (item.particular) return item.particular;

  if (Array.isArray(item.codeParticular) && item.codeParticular.length > 0) {
    return item.codeParticular
      .map((entry) => entry?.particular)
      .filter(Boolean)
      .join(", ");
  }

  return "";
};

const fillItemRow = (worksheet, rowNumber, item = {}, fallbackItemNo) => {
  worksheet.getCell(`A${rowNumber}`).value = item.itemNo || fallbackItemNo;
  worksheet.getCell(`B${rowNumber}`).value = getMatCodeText(item);
  worksheet.getCell(`C${rowNumber}`).value = getParticularText(item);
  worksheet.getCell(`F${rowNumber}`).value = Number(item.quantity) || "";
  worksheet.getCell(`H${rowNumber}`).value = cleanValue(item.unitOfMeasure);
  worksheet.getCell(`I${rowNumber}`).value = cleanValue(item.purpose);
};

const clearUnusedItemRows = (worksheet, itemCount) => {
  for (
    let rowNumber = ITEM_START_ROW + itemCount;
    rowNumber <= ITEM_END_ROW;
    rowNumber += 1
  ) {
    ["A", "B", "C", "F", "H", "I"].forEach((column) => {
      worksheet.getCell(`${column}${rowNumber}`).value = "";
    });
  }
};

const addOverflowItemsSheet = (workbook, requisition, overflowItems) => {
  if (overflowItems.length === 0) return;

  const worksheet = workbook.addWorksheet("Additional Items");
  worksheet.columns = [
    { header: "WRS No.", key: "wrsNo", width: 16 },
    { header: "Item No.", key: "itemNo", width: 10 },
    { header: "Matcode No.", key: "matCodeNo", width: 18 },
    { header: "Particular", key: "particular", width: 34 },
    { header: "Quantity", key: "quantity", width: 12 },
    { header: "Unit of Measure", key: "unitOfMeasure", width: 18 },
    { header: "Purpose", key: "purpose", width: 32 },
    { header: "Available Qty", key: "availableQty", width: 14 },
    { header: "Stock Status", key: "stockStatus", width: 18 },
  ];

  overflowItems.forEach((item, index) => {
    worksheet.addRow({
      wrsNo: requisition.wrsNo,
      itemNo: item.itemNo || TEMPLATE_ITEM_ROW_COUNT + index + 1,
      matCodeNo: getMatCodeText(item),
      particular: getParticularText(item),
      quantity: Number(item.quantity) || "",
      unitOfMeasure: cleanValue(item.unitOfMeasure),
      purpose: cleanValue(item.purpose),
      availableQty: Number(item.availableQty) || "",
      stockStatus: cleanValue(item.stockStatus),
    });
  });

  worksheet.getRow(1).font = { bold: true };
};

const buildPartsRequisitionWorkbook = async (requisition) => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(TEMPLATE_PATH);

  const worksheet =
    workbook.getWorksheet("FM-NGCP-11Q (WRS)") || workbook.worksheets[0];

  if (!worksheet) {
    throw new Error("Parts requisition Excel template has no worksheets.");
  }

  const items = Array.isArray(requisition.items) ? requisition.items : [];
  const templateItems = items.slice(0, TEMPLATE_ITEM_ROW_COUNT);
  const overflowItems = items.slice(TEMPLATE_ITEM_ROW_COUNT);

  worksheet.getCell("L5").value = cleanValue(requisition.moWbsReservationNo);
  worksheet.getCell("N6").value = formatDate(requisition.dateRequested);
  worksheet.getCell("N33").value = cleanValue(requisition.wrsNo);

  templateItems.forEach((item, index) => {
    fillItemRow(worksheet, ITEM_START_ROW + index, item, index + 1);
  });
  clearUnusedItemRows(worksheet, templateItems.length);
  addOverflowItemsSheet(workbook, requisition, overflowItems);

  const staff = requisition.staff || {};
  worksheet.getCell("A28").value = cleanValue(staff.requisitioner);
  worksheet.getCell("B32").value = formatDate(requisition.dateRequested);

  worksheet.getCell("E28").value = cleanValue(staff.approvedBy);
  worksheet.getCell("F32").value = formatDate(requisition.dateApproved);

  const receivedBy = firstValue(staff.receiver, staff.requisitioner);
  const receivedByTitle = firstValue(
    staff.receiverTitle,
    staff.requisitionerTitle,
  );
  const receivedDate = staff.receiver
    ? requisition.dateReceived || requisition.dateDelivered
    : requisition.dateRequested;

  worksheet.getCell("J28").value = cleanValue(receivedBy);
  // worksheet.getCell("K29").value = cleanValue(receivedByTitle);
  worksheet.getCell("K32").value = formatDate(receivedDate);

  worksheet.getCell("A34").value = cleanValue(staff.warehouseBy);
  worksheet.getCell("B37").value = formatDate(
    requisition.dateWarehouseReviewed,
  );

  worksheet.getCell("J34").value = cleanValue(staff.notedBy);
  // worksheet.getCell("J37").value = formatDate(requisition.dateDelivered);

  return workbook;
};

module.exports = {
  buildPartsRequisitionWorkbook,
};
