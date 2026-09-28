module.exports = Object.freeze({
  maxFileBytes: 4 * 1024 * 1024,
  maxPdfPages: 20,
  maxImagePixels: 25_000_000,
  validationTimeoutMs: 12_000,
  maxConcurrentValidations: 2,
  allowedTypes: Object.freeze({
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.pdf': 'application/pdf',
  }),
});
