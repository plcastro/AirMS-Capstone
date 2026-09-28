const policy = require('../../config/certificatePolicy');

async function inspect(workerData) {
  const buffer = Buffer.from(workerData.buffer);
  if (workerData.mimeType === 'application/pdf') {
    const { PDFParse } = require('pdf-parse');
    const parser = new PDFParse({ data: new Uint8Array(buffer), isEvalSupported: false, stopAtErrors: true });
    try {
      const info = await parser.getInfo();
      if (!info.total || info.total > policy.maxPdfPages) throw new Error(`PDF must contain between 1 and ${policy.maxPdfPages} pages.`);
      // Load every page structure; encrypted/damaged documents fail validation.
      await parser.getInfo({ parsePageInfo: true });
      return { pageCount: info.total };
    } finally { await parser.destroy(); }
  }
  const sharp = require('sharp');
  const image = sharp(buffer, { limitInputPixels: policy.maxImagePixels, failOn: 'warning' });
  const meta = await image.metadata();
  const expected = workerData.mimeType === 'image/png' ? 'png' : 'jpeg';
  if (meta.format !== expected || !meta.width || !meta.height || (meta.pages || 1) !== 1) throw new Error('Unsupported image contents.');
  await image.stats(); // Decode the image, rather than only trusting its header.
  return { width: meta.width, height: meta.height, pageCount: 1 };
}

module.exports = __filename;
if (require.main === module) {
  process.once('message', data => {
    inspect(data).then(details => process.send({ details })).catch(() => {
      process.send({ error: 'Document is damaged, encrypted, unsupported, or exceeds image/page limits.' });
    });
  });
}
