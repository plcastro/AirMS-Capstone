const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const sharp = require('sharp');
const PDFDocument = require('pdfkit');
const { validateEnvelope, validateCertificateFile } = require('../services/certificates/certificateFileValidator');
const { createCertificateStorage } = require('../services/certificates/certificateStorage');
const policy = require('../config/certificatePolicy');

const image = format => sharp({ create: { width: 16, height: 12, channels: 3, background: 'white' } }).toFormat(format).toBuffer();
const pdf = (pages = 1, options = {}) => new Promise(resolve => {
  const document = new PDFDocument(options), chunks = [];
  document.on('data', chunk => chunks.push(chunk));
  document.on('end', () => resolve(Buffer.concat(chunks)));
  for (let i = 0; i < pages; i++) { if (i) document.addPage(); document.text('Certificate fixture'); }
  document.end();
});

test('certificate validation accepts decoded JPG/JPEG/PNG and structured PDF files', async () => {
  for (const [extension, format, mimeType] of [['jpg', 'jpeg', 'image/jpeg'], ['jpeg', 'jpeg', 'image/jpeg'], ['png', 'png', 'image/png']]) {
    const buffer = await image(format);
    const result = await validateCertificateFile({ buffer, originalname: `Certificate.${extension.toUpperCase()}`, mimetype: mimeType });
    assert.equal(result.width, 16); assert.equal(result.height, 12); assert.equal(result.size, buffer.length);
    assert.equal(result.sha256, crypto.createHash('sha256').update(buffer).digest('hex'));
  }
  const result = await validateCertificateFile({ buffer: await pdf(2), originalname: 'certificate.pdf', mimetype: 'application/pdf' });
  assert.equal(result.pageCount, 2);
});

test('certificate validation rejects disguised executable, SVG, MIME mismatch, empty and oversized files', async () => {
  const buffer = await image('png');
  for (const file of [null, { buffer: Buffer.alloc(0), originalname: 'empty.png', mimetype: 'image/png' },
    { buffer, originalname: 'file.exe', mimetype: 'image/png' },
    { buffer, originalname: 'file.png.exe', mimetype: 'image/png' },
    { buffer, originalname: 'file.jpg', mimetype: 'image/png' },
    { buffer, originalname: 'file.png', mimetype: 'application/octet-stream' },
    { buffer: Buffer.from('MZ executable'), originalname: 'file.png', mimetype: 'image/png' },
    { buffer: Buffer.from('<svg onload="alert(1)"/>'), originalname: 'file.svg', mimetype: 'image/svg+xml' },
    { buffer: Buffer.alloc(policy.maxFileBytes + 1), originalname: 'large.pdf', mimetype: 'application/pdf' }]) {
    assert.throws(() => validateEnvelope(file));
  }
});

test('certificate validation fully parses damaged and password-protected PDFs and enforces page limit', async () => {
  for (const buffer of [Buffer.from('%PDF-1.7\nnot a document\n%%EOF'), await pdf(1, { userPassword: 'secret' }), await pdf(policy.maxPdfPages + 1)]) {
    await assert.rejects(validateCertificateFile({ buffer, originalname: 'file.pdf', mimetype: 'application/pdf' }), error => error.status === 422);
  }
});

test('certificate validation rejects truncated images and decompression limits', async () => {
  const truncated = (await image('png')).subarray(0, 40);
  await assert.rejects(validateCertificateFile({ buffer: truncated, originalname: 'file.png', mimetype: 'image/png' }));
  const oversized = await sharp({ create: { width: 5001, height: 5000, channels: 3, background: 'white' } }).png().toBuffer();
  await assert.rejects(validateCertificateFile({ buffer: oversized, originalname: 'file.png', mimetype: 'image/png' }), error => error.status === 422);
});

test('original filenames are sanitized separately from generated storage names', async () => {
  const result = validateEnvelope({ buffer: await image('png'), originalname: '../folder/unsafe"\r\n.png', mimetype: 'image/png' });
  assert.equal(result.originalName, 'unsafe___.png');
});

test('local private storage preserves original bytes and rejects traversal or tampering', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'airms-certificates-'));
  const storage = createCertificateStorage({ env: {}, root });
  const buffer = await image('png');
  const metadata = validateEnvelope({ buffer, originalname: 'original.png', mimetype: 'image/png' });
  const reference = await storage.save(buffer, metadata);
  const file = { ...reference, ...metadata };
  try {
    assert.equal(reference.provider, 'local');
    assert.match(reference.key, /^certificates\/[a-f0-9-]+\.png$/);
    assert.deepEqual(await storage.read(file), buffer);
    await assert.rejects(storage.read({ ...file, key: '../secret.png' }), /reference/);
    await assert.rejects(storage.remove({ ...file, key: '../secret.png' }), /reference/);
    const changed = Buffer.from(buffer); changed[20] ^= 1;
    await fs.writeFile(path.join(root, path.basename(reference.key)), changed);
    await assert.rejects(storage.read(file), /integrity/);
  } finally {
    await storage.remove(reference);
    await fs.rmdir(root);
  }
});

test('production storage fails closed without a dedicated private token, ignoring public tokens', () => {
  for (const env of [{ NODE_ENV: 'production' }, { VERCEL: '1', BLOB_READ_WRITE_TOKEN: 'public', DOCUMENT_BLOB_READ_WRITE_TOKEN: 'public-documents' }]) {
    assert.throws(() => createCertificateStorage({ env }).ready(), error => error.status === 503);
  }
});

test('Blob adapter uses private access and never returns public URLs to the service', async () => {
  const bytes = Buffer.from('original'), hash = crypto.createHash('sha256').update(bytes).digest('hex');
  const calls = [];
  const blob = {
    put: async (key, buffer, options) => { calls.push(['put', options]); assert.deepEqual(buffer, bytes); return { url: 'https://not-returned.example/file' }; },
    get: async (key, options) => { calls.push(['get', options]); return { statusCode: 200, blob: { pathname: key, size: bytes.length }, stream: new ReadableStream({ start(controller) { controller.enqueue(bytes); controller.close(); } }) }; },
    del: async (key, options) => calls.push(['del', options]),
  };
  const storage = createCertificateStorage({ env: { NODE_ENV: 'production', CERTIFICATE_BLOB_READ_WRITE_TOKEN: 'private-token' }, blob });
  const reference = await storage.save(bytes, { mimeType: 'application/pdf' });
  assert.deepEqual(Object.keys(reference).sort(), ['key', 'provider']);
  assert.deepEqual(await storage.read({ ...reference, size: bytes.length, sha256: hash }), bytes);
  await storage.remove(reference);
  assert.equal(calls[0][1].access, 'private'); assert.equal(calls[1][1].access, 'private');
  assert.equal(calls[1][1].useCache, false);
  assert.ok(calls.every(([, options]) => options.token === 'private-token'));
});
