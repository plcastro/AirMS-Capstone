const fs = require("fs");
const path = require("path");
const { PDFParse } = require("pdf-parse");

const targetPath = process.argv[2];
const outputDirArg = process.argv[3];
const firstPageArg = process.argv[4];
const lastPageArg = process.argv[5];

if (!targetPath || !outputDirArg) {
  console.error(
    "Usage: node scripts/renderPdfPages.js <pdf-path> <output-dir> [first-page] [last-page]",
  );
  process.exit(1);
}

const resolvedPdfPath = path.resolve(targetPath);
const resolvedOutputDir = path.resolve(outputDirArg);
const first = Number(firstPageArg || 1);
const last = Number(lastPageArg || first);

fs.mkdirSync(resolvedOutputDir, { recursive: true });

const parser = new PDFParse({ data: fs.readFileSync(resolvedPdfPath) });

parser
  .getScreenshot({
    first,
    last,
    imageDataUrl: false,
    desiredWidth: 1800,
  })
  .then(async (result) => {
    result.pages.forEach((page, index) => {
      const pageNumber = first + index;
      const filePath = path.join(resolvedOutputDir, `page-${pageNumber}.png`);
      fs.writeFileSync(filePath, page.data);
      console.log(filePath);
    });

    await parser.destroy();
  })
  .catch((error) => {
    console.error(`Failed to render PDF: ${error.message}`);
    process.exit(1);
  });
