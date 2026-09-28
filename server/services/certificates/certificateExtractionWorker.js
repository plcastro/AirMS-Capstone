const path = require('node:path');
const fs = require('node:fs/promises');
const policy = require('../../config/certificateExtractionPolicy');
const uploadPolicy = require('../../config/certificatePolicy');
const { usableEmbeddedText } = require('./certificateTextQuality');

async function extract({ buffer: input, mimeType }) {
  const sharp = require('sharp');
  const buffer = Buffer.from(input);
  let parser, ocr;
  let totalCharacters = 0;
  const pages = [];
  const addPage = page => {
    totalCharacters += page.text.length + (page.embeddedText?.length || 0) + (page.alternateText?.length || 0);
    if (page.text.length > policy.maxPageCharacters || (page.alternateText?.length || 0) > policy.maxPageCharacters || totalCharacters > policy.maxTextCharacters) throw new Error('TEXT_LIMIT');
    pages.push(page);
  };
  const recognize = async image => {
    if (!ocr) {
      const { createWorker, OEM, PSM } = require('tesseract.js');
      // Package assets only: no CDN, remote document URL or writable language cache.
      const langPath = path.dirname(require.resolve('@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz'));
      await fs.access(path.join(langPath, 'eng.traineddata.gz'));
      ocr = await createWorker(policy.language, OEM.LSTM_ONLY, {
        langPath, gzip: true, cacheMethod: 'none',
        workerPath: require.resolve('tesseract.js/src/worker-script/node/index.js'),
        errorHandler: () => {},
      });
      await ocr.setParameters({ tessedit_pageseg_mode: PSM.AUTO, user_defined_dpi: '200' });
    }
    const prepared = await sharp(image, { limitInputPixels: uploadPolicy.maxImagePixels, failOn: 'warning' })
      .rotate().flatten({ background: '#ffffff' })
      .resize({ width: policy.renderLongEdge, height: policy.renderLongEdge, fit: 'inside', withoutEnlargement: true })
      .greyscale().normalize().png().toBuffer();
    await ocr.setParameters({ thresholding_method: '0' });
    const { data } = await ocr.recognize(prepared, {}, { text: true });
    const text = data.text || '';
    const confidence = text.trim() && Number.isFinite(data.confidence) ? Math.max(0, Math.min(1, data.confidence / 100)) : 0;
    // Uneven lighting on photographed certificates can hide text in global
    // thresholding. Retain a bounded adaptive reading as additional evidence;
    // the parser flags conflicts instead of choosing whichever score is higher.
    if (text.trim() && confidence < policy.highOcrConfidence) {
      await ocr.setParameters({ thresholding_method: '2' });
      const { data: alternate } = await ocr.recognize(prepared, {}, { text: true });
      return { text, confidence, alternateText: alternate.text || '',
        alternateConfidence: Number.isFinite(alternate.confidence) ? Math.max(0, Math.min(1, alternate.confidence / 100)) : 0 };
    }
    return { text, confidence };
  };
  try {
    if (mimeType === 'application/pdf') {
      const { PDFParse } = require('pdf-parse');
      parser = new PDFParse({ data: new Uint8Array(buffer), isEvalSupported: false, stopAtErrors: true });
      const info = await parser.getInfo({ parsePageInfo: true });
      if (!info.total || info.total > uploadPolicy.maxPdfPages) throw new Error('PAGE_LIMIT');
      for (let pageNumber = 1; pageNumber <= info.total; pageNumber++) {
        const extracted = await parser.getText({ partial: [pageNumber], pageJoiner: '', parseHyperlinks: false });
        const embeddedText = extracted.pages[0]?.text || '';
        if (embeddedText.length > policy.maxPageCharacters) throw new Error('TEXT_LIMIT');
        if (usableEmbeddedText(embeddedText)) {
          addPage({ page: pageNumber, method: 'PDF_TEXT', text: embeddedText, confidence: null });
          continue;
        }
        const pageInfo = info.pages.find(page => page.pageNumber === pageNumber);
        const width = pageInfo?.width, height = pageInfo?.height;
        if (!(width > 0 && height > 0 && Number.isFinite(width * height))) throw new Error('PAGE_DIMENSIONS');
        const scale = Math.min(3, policy.renderLongEdge / Math.max(width, height), Math.sqrt(policy.maxRenderPixels / (width * height)));
        const rendered = await parser.getScreenshot({ partial: [pageNumber], scale, imageDataUrl: false, imageBuffer: true });
        const image = rendered.pages[0]?.data;
        if (!image) throw new Error('PAGE_RENDER');
        addPage({ page: pageNumber, method: 'OCR', ...await recognize(image), embeddedText });
      }
    } else {
      const meta = await sharp(buffer, { limitInputPixels: uploadPolicy.maxImagePixels, failOn: 'warning' }).metadata();
      const expected = mimeType === 'image/png' ? 'png' : 'jpeg';
      if (meta.format !== expected || (meta.pages || 1) !== 1) throw new Error('IMAGE_FORMAT');
      addPage({ page: 1, method: 'OCR', ...await recognize(buffer) });
    }
    return { pages, rawText: pages.map(page => page.text + (page.alternateText ? `\n\n[Additional adaptive OCR reading]\n${page.alternateText}` : '')).join('\n\n'), language: policy.language, readerVersion: policy.version };
  } finally {
    try { if (ocr) await ocr.terminate(); } finally { if (parser) await parser.destroy(); }
  }
}

module.exports = __filename;
if (require.main === module) {
  process.once('message', data => {
    extract(data).then(result => process.send({ result })).catch(error => process.send({
      error: error.code === 'MODULE_NOT_FOUND' || error.code === 'ENOENT' ? 'OCR_ASSETS_UNAVAILABLE' : 'DOCUMENT_EXTRACTION_FAILED',
    }));
  });
}
