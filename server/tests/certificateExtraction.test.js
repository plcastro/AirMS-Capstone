const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { EventEmitter } = require('node:events');
const { fork } = require('node:child_process');
const PDFDocument = require('pdfkit');
const sharp = require('sharp');
const { parseCertificateDate, parseCertificateFields } = require('../services/certificates/certificateFieldParser');
const { createCertificateTextReader } = require('../services/certificates/certificateTextReader');
const { createCertificateReadingService } = require('../services/certificates/certificateReadingService');
const { createCertificateHolderMatchService } = require('../services/certificates/certificateHolderMatchService');
const { usableEmbeddedText } = require('../services/certificates/certificateTextQuality');

const text = [
  'CERTIFICATE OF TRAINING', 'Holder Name: Juan Dela Cruz', 'Certificate Number: TRAIN-123',
  'Issued by: Training Academy', 'Aircraft Ratings: AS350B3, B412EP',
  'Issue Date: 2026-01-15', 'Expiry Date: 2027-05-20', 'Limitations: None',
].join('\n');
const extraction = (raw = text, extra = {}) => ({ rawText: raw, pages: [{ page: 1, text: raw, method: 'PDF_TEXT', confidence: null, ...extra }] });
const flags = data => data.warnings.map(warning => warning.code);
const readText = createCertificateTextReader({ spawn: (worker, args, options) => fork(worker, args, {
  ...options, execArgv: [...options.execArgv, '--require', path.join(__dirname, 'helpers/certificateOfflineOnly.cjs')],
}) });
const makePdf = (draw, options = {}) => new Promise((resolve, reject) => {
  const doc = new PDFDocument({ size: 'A4', margin: 30, ...options }), chunks = [];
  doc.on('data', chunk => chunks.push(chunk)); doc.on('error', reject);
  doc.on('end', () => resolve(Buffer.concat(chunks))); draw(doc); doc.end();
});
// Synthetic source with predictable typography; no personnel documents are used.
let fixtureImage;
const image = async () => {
  if (!fixtureImage) {
    const lines = text.split('\n').map((line, index) => `<text x="80" y="${100 + index * 100}">${line}</text>`).join('');
    fixtureImage = await sharp(Buffer.from(`<svg width="1700" height="1000"><rect width="100%" height="100%" fill="white"/><g font-family="Arial" font-size="40" fill="black">${lines}</g></svg>`)).png().toBuffer();
  }
  return fixtureImage;
};

test('parser extracts labelled facts, both aircraft and page evidence without an eligibility decision', () => {
  const result = parseCertificateFields(extraction());
  assert.equal(result.holderName, 'Juan Dela Cruz'); assert.equal(result.certificateNumber, 'TRAIN-123');
  assert.equal(result.issuingAuthority, 'Training Academy');
  assert.deepEqual(result.aircraftRatings, ['AS350B3', 'B412EP']);
  assert.equal(result.issueDate, '2026-01-15'); assert.equal(result.expiryDate, '2027-05-20');
  assert.deepEqual(result.limitations, []); assert.equal(result.confidence, null);
  assert.equal(result.requiresManualReview, true); assert.equal(result.qualified, undefined);
  assert.equal(result.evidence.find(item => item.field === 'holderName').line, 2);
  assert.equal(result.originalExtractedFields.holderName[0], result.holderName);
});

test('parser reuses central aircraft aliases, retains unknown variants and does not repair aircraft guesses', () => {
  const result = parseCertificateFields(extraction(text.replace('AS350B3, B412EP', 'Eurocopter AS350 B3; Bell 412 EP; B412 EF')));
  assert.deepEqual(result.aircraftRatings, ['AS350B3', 'B412EP']);
  assert.deepEqual(result.unknownAircraftRatings, ['B412 EF']);
  assert.equal(result.normalization[0].original, 'Eurocopter AS350 B3');
  assert.ok(flags(result).includes('UNKNOWN_AIRCRAFT'));
  assert.deepEqual(parseCertificateFields(extraction('Aircraft Rating: B412EPX')).aircraftRatings, []);
  const approved = parseCertificateFields(extraction('Aircraft Ratings: AS350B3e'));
  assert.deepEqual(approved.aircraftRatings, ['AS350B3']);
  assert.equal(approved.normalization[0].original, 'AS350B3e');
  assert.deepEqual(parseCertificateFields(extraction('Aircraft Ratings: AS350B3eX')).aircraftRatings, []);
});

test('course completion layout reads explicit holder and conferred date without inventing aircraft coverage or expiry', () => {
  const raw = 'Certifies that\n\nAlex Example\n\nhas satisfactorily completed a course of\nP&WC PT6A - Large Series Line & Base Maintenance\n\nConferred on 15th day of November, 2019';
  const result = parseCertificateFields(extraction(raw));
  assert.equal(result.holderName, 'Alex Example');
  assert.equal(result.issueDate, '2019-11-15');
  assert.deepEqual(result.qualifications, ['P&WC PT6A - Large Series Line & Base Maintenance']);
  assert.deepEqual(result.aircraftRatings, []);
  assert.equal(result.expiryDate, null);
  assert.equal(result.doesNotExpire, false);
  assert.equal(result.requiresManualReview, true);
  assert.ok(flags(result).includes('NO_RECOGNIZED_AIRCRAFT_RATING'));
});

test('dates reject ambiguous formats, impossible dates and guessed missing expiry', () => {
  for (const [input, expected] of [['15 January 2026', '2026-01-15'], ['May 20, 2027', '2027-05-20'], ['20/05/2027', '2027-05-20'], ['05/20/2027', '2027-05-20'], ['2024-02-29', '2024-02-29']]) {
    assert.equal(parseCertificateDate(input).value, expected);
  }
  assert.equal(parseCertificateDate('04/05/2027').reason, 'AMBIGUOUS_DATE');
  for (const invalid of ['2027-02-29', '31 February 2026', 'next year', '05/20/27']) assert.equal(parseCertificateDate(invalid).value, null);
  const missing = parseCertificateFields(extraction('Holder Name: Juan Dela Cruz'));
  assert.equal(missing.expiryDate, null); assert.equal(missing.doesNotExpire, false);
  const explicit = parseCertificateFields(extraction(text.replace('2027-05-20', 'Does not expire')));
  assert.equal(explicit.doesNotExpire, true);
  assert.ok(flags(parseCertificateFields(extraction(text.replace('2027-05-20', '2025-01-01')))).includes('REVERSED_DATES'));
});

test('conflicting holder, certificate and expiry values remain unresolved and retain original evidence', () => {
  const raw = `${text}\nHolder Name: Pedro Santos\nCertificate Number: OTHER-9\nExpiry Date: 2028-05-20`;
  const result = parseCertificateFields(extraction(raw));
  assert.equal(result.holderName, null); assert.equal(result.certificateNumber, null); assert.equal(result.expiryDate, null);
  assert.deepEqual(result.originalExtractedFields.holderName, ['Juan Dela Cruz', 'Pedro Santos']);
  assert.ok(flags(result).includes('CONFLICTING_VALUES'));
  const conflictWithEmbedded = parseCertificateFields(extraction(text, { method: 'OCR', confidence: 0.99, embeddedText: 'Holder Name: Pedro Santos' }));
  assert.equal(conflictWithEmbedded.holderName, null);
});

test('adaptive OCR retains competing evidence, recovers readable dates and flags holder conflicts', () => {
  const primary = 'Certifies that\nAlex Example\nConferred on\nUnreadable decoration';
  const result = parseCertificateFields(extraction(primary, { method: 'OCR', confidence: 0.72,
    alternateText: '<7 Certifies that\n= Alex Example\nX has satisfactorily completed a course of\nPT6A maintenance\nConferred on 15th day of November, 2019', alternateConfidence: 0.63 }));
  assert.equal(result.holderName, 'Alex Example');
  assert.equal(result.issueDate, '2019-11-15');
  assert.equal(result.confidence, 0.63);
  assert.ok(result.evidence.some(item => item.method === 'OCR_ADAPTIVE' && item.field === 'issueDate'));
  assert.ok(flags(result).includes('ADDITIONAL_OCR_READING_REQUIRES_REVIEW'));
  assert.deepEqual(result.aircraftRatings, []);
  const conflict = parseCertificateFields(extraction(primary, { method: 'OCR', confidence: 0.72,
    alternateText: 'Certifies that\nAnother Person', alternateConfidence: 0.99 }));
  assert.equal(conflict.holderName, null);
  assert.ok(flags(conflict).includes('CONFLICTING_VALUES'));
});

test('multiline fields preserve restrictions and do not treat negated aircraft text as a rating', () => {
  const raw = 'Holder Name:\n\nJuan Dela Cruz\nAircraft Ratings:\nAS350B3\nB412EP\nLimitations: Daytime only\nUnder supervision\nIssue Date: 2026-01-01';
  const result = parseCertificateFields(extraction(raw));
  assert.equal(result.holderName, 'Juan Dela Cruz');
  assert.deepEqual(result.aircraftRatings, ['AS350B3', 'B412EP']);
  assert.ok(result.limitations.includes('Under supervision'));
  assert.ok(flags(result).includes('RESTRICTION_REQUIRES_REVIEW'));
  const excluded = parseCertificateFields(extraction('Aircraft Rating: Not authorized for B412EP'));
  assert.deepEqual(excluded.aircraftRatings, []); assert.ok(excluded.limitations.length);
});

test('unlabelled aircraft mentions and unknown layouts remain reviewable without inventing facts', () => {
  const result = parseCertificateFields(extraction('Course: Bell 412 EP maintenance\nThis certifies that Juan Dela Cruz has completed training'));
  assert.equal(result.holderName, 'Juan Dela Cruz');
  assert.deepEqual(result.aircraftRatings, []);
  assert.equal(result.aircraftMentions[0].normalized, 'B412EP');
  assert.equal(result.certificateNumber, null); assert.equal(result.expiryDate, null);
  assert.ok(flags(result).includes('AIRCRAFT_MENTION_OUTSIDE_RATING_FIELD'));
});

test('low confidence, blank pages and non-certificate text remain unverified', () => {
  const poor = parseCertificateFields(extraction(text, { method: 'OCR', confidence: 0.40 }));
  assert.equal(poor.confidence, 0.4); assert.ok(flags(poor).includes('LOW_OCR_CONFIDENCE'));
  const blank = parseCertificateFields(extraction('', { method: 'OCR', confidence: 0 }));
  assert.ok(flags(blank).includes('NO_READABLE_TEXT'));
  const receipt = parseCertificateFields(extraction('Grocery receipt. Apples, milk, and bread. Total paid: 100.00'));
  assert.ok(flags(receipt).includes('CERTIFICATE_TYPE_UNCERTAIN')); assert.equal(receipt.holderName, null);
  assert.equal(parseCertificateFields(extraction(`Holder Name: ${'a'.repeat(161)}`)).holderName, null);
  assert.equal(parseCertificateFields(extraction('Nameless Test')).holderName, null);
});

test('embedded text quality rejects sparse or corrupt PDF text', () => {
  assert.equal(usableEmbeddedText(text), true);
  for (const sparse of ['', 'Page 1', 'x'.repeat(100), `${text}\uFFFD`]) assert.equal(usableEmbeddedText(sparse), false);
});

test('digital PDF reads embedded text without OCR', async () => {
  const buffer = await makePdf(doc => doc.fontSize(18).text(text));
  const result = await readText({ buffer, originalname: 'digital.pdf', mimetype: 'application/pdf' });
  assert.equal(result.pages[0].method, 'PDF_TEXT'); assert.equal(result.pages[0].confidence, null);
  assert.equal(parseCertificateFields(result).holderName, 'Juan Dela Cruz');
});

test('PNG and JPEG OCR work with network access disabled', async () => {
  for (const format of ['png', 'jpeg']) {
    const buffer = format === 'png' ? await image() : await sharp(await image()).jpeg().toBuffer();
    const result = await readText({ buffer, originalname: `certificate.${format}`, mimetype: `image/${format}` });
    assert.equal(result.pages[0].method, 'OCR');
    assert.match(result.rawText, /Juan Dela Cruz/); assert.ok(result.pages[0].confidence > 0.7);
    const facts = parseCertificateFields(result);
    assert.equal(facts.holderName, 'Juan Dela Cruz'); assert.deepEqual(facts.aircraftRatings, ['AS350B3', 'B412EP']);
  }
});

test('mixed PDF uses embedded text per digital page and OCR per scanned page', async () => {
  const png = await image();
  const buffer = await makePdf(doc => { doc.fontSize(18).text(text); doc.addPage().image(png, 20, 20, { width: 550 }); });
  const result = await readText({ buffer, originalname: 'mixed.pdf', mimetype: 'application/pdf' });
  assert.deepEqual(result.pages.map(page => page.method), ['PDF_TEXT', 'OCR']);
  assert.match(result.pages[1].text, /Juan Dela Cruz/);
  assert.equal(result.pages[1].page, 2);
  assert.ok(parseCertificateFields(result).evidence.some(item => item.page === 2 && item.field === 'holderName'));
});

test('blank images return review flags while encrypted, corrupt and over-limit PDFs are rejected', async () => {
  const buffer = await sharp({ create: { width: 600, height: 600, channels: 3, background: 'white' } }).png().toBuffer();
  const blank = await readText({ buffer, originalname: 'blank.png', mimetype: 'image/png' });
  assert.ok(flags(parseCertificateFields(blank)).includes('NO_READABLE_TEXT'));
  const tooMany = await makePdf(doc => { for (let i = 0; i < 21; i++) { if (i) doc.addPage(); doc.text(text); } });
  const encrypted = await makePdf(doc => doc.text(text), { userPassword: 'fixture-password' });
  for (const data of [Buffer.from('%PDF-1.7\nbroken\n%%EOF'), tooMany, encrypted]) {
    await assert.rejects(readText({ buffer: data, originalname: 'bad.pdf', mimetype: 'application/pdf' }), error => error.status === 422);
  }
});

test('reader timeout kills the worker, rejects concurrent work and releases its slot', async () => {
  let killed = 0;
  const reader = createCertificateTextReader({ timeoutMs: 10, spawn: () => {
    const child = new EventEmitter(); child.send = () => {};
    child.kill = () => { killed++; child.emit('exit', 1); }; return child;
  } });
  const file = { buffer: Buffer.from('%PDF-1.7\nfixture\n%%EOF'), originalname: 'fixture.pdf', mimetype: 'application/pdf' };
  const pending = reader(file);
  await assert.rejects(reader(file), error => error.status === 429);
  await assert.rejects(pending, /timed out/);
  await assert.rejects(reader(file), /timed out/); assert.equal(killed, 2);
});

test('reading service checks access before OCR and produces a draft linked to the unchanged owner', async () => {
  const calls = [], owner = '111111111111111111111111', suggested = '222222222222222222222222';
  const denied = createCertificateReadingService({ certificates: { get: async () => { throw new Error('Denied'); } }, readText: async () => calls.push('ocr') });
  await assert.rejects(denied({}, owner), /Denied/); assert.deepEqual(calls, []);
  const matchHolder = createCertificateHolderMatchService({ users: { find: () => ({ select: () => ({ lean: async () => [{ _id: suggested, firstName: 'Juan', lastName: 'Dela Cruz' }] }) }) } });
  const read = createCertificateReadingService({ certificates: {
    get: async () => ({ id: 'certificate', personnelId: owner, revision: 1, file: { sha256: 'hash' } }),
    download: async () => { calls.push('authorized-download'); return { data: Buffer.from('document'), filename: 'original.png', mimeType: 'image/png' }; },
  }, readText: async () => { calls.push('ocr'); return extraction(); }, matchHolder });
  const draft = await read({ user: { id: owner, jobTitle: 'Maintenance Manager' } }, 'certificate');
  assert.deepEqual(calls, ['authorized-download', 'ocr']);
  assert.equal(draft.status, 'DRAFT'); assert.equal(draft.personnelId, owner);
  assert.equal(draft.holderMatch.suggestedPersonnelId, suggested);
  assert.ok(flags(draft.certificateData).includes('HOLDER_DIFFERS_FROM_CERTIFICATE_OWNER'));
  assert.equal(draft.requiresConfirmation, true); assert.equal(draft.sourceSha256, 'hash');
});
