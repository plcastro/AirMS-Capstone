const mongoose = require('mongoose');
const Certificate = require('../../models/certificateRecordModel');
const Audit = require('../../models/certificateAuditModel');
const User = require('../../models/userModel');
const { hasPermission } = require('../../middleware/permissions');
const permissions = require('../../config/permissions');
const rules = require('../qualificationEngine/qualificationRules.json');
const { evaluateQualification } = require('../qualificationEngine');
const { actorId, assertId, assertAccess } = require('./certificateAccess');
const { CertificateError } = require('./certificateErrors');
const { serializeCertificate } = require('./certificateService');
const { createCertificateReadingService } = require('./certificateReadingService');
const { createCertificateHolderMatchService } = require('./certificateHolderMatchService');
const { validateReviewBody, validateCorrections, normalizeReviewData, reviewErrors, reviewNote } = require('./certificateReviewData');
const { assessAutomaticVerification } = require('./certificateAutomation');

// Eligibility is computed for the server's business date, never a client-supplied date.
const businessDate = at => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).format(at);
const iso = value => value ? new Date(value).toISOString() : null;
function qualificationSource(record) {
  return { ...record.normalizedData, id: String(record._id), personnelId: String(record.personnelId),
    status: record.status, reviewedBy: record.reviewedBy ? String(record.reviewedBy) : null,
    verificationMethod: record.verificationMethod, verificationDecision: record.verificationDecision, verifiedAt: iso(record.verifiedAt),
    reviewedAt: iso(record.reviewedAt), revokedAt: iso(record.revokedAt), requiresManualReview: record.status !== 'VERIFIED' };
}

function createCertificateReviewService({
  records = Certificate, audit = Audit, users = User,
  readCertificate = createCertificateReadingService(), matchHolder = createCertificateHolderMatchService(),
  transaction = callback => mongoose.connection.transaction(callback), now = () => new Date(),
} = {}) {
  async function getRecord(req, id, action = 'read') {
    assertId(id);
    const record = await records.findById(id).select('+file +analysis').lean();
    if (!record) throw new CertificateError(404, 'Certificate not found.');
    assertAccess(req, record.personnelId, action);
    return record;
  }
  function requirePending(record, revision, analyzed = false) {
    if (record.revision !== revision) throw new CertificateError(409, 'Certificate changed. Reload it before continuing.');
    if (record.status !== 'PENDING_REVIEW') throw new CertificateError(409, 'Only pending certificates can be analyzed, corrected or confirmed.');
    if (analyzed && (record.processingStatus !== 'ANALYZED' || !record.analysis)) throw new CertificateError(409, 'Analyze the certificate before reviewing it.');
  }
  async function mechanic(personnelId, session = null) {
    const person = await users.findById(personnelId).select('_id firstName lastName jobTitle').session(session).lean();
    if (!person) throw new CertificateError(404, 'Personnel record not found.');
    if (String(person.jobTitle).trim().toLowerCase() !== 'mechanic') throw new CertificateError(400, 'Certificate qualifications apply to mechanics.');
    return person;
  }
  async function decisions(record, at, session = null) {
    const person = await mechanic(record.personnelId, session);
    const stored = await records.find({ personnelId: record.personnelId, status: 'VERIFIED' }).session(session).lean();
    const sources = stored.filter(item => String(item._id) !== String(record._id)).map(qualificationSource);
    sources.push(qualificationSource(record));
    return rules.aircraft.map(aircraftType => evaluateQualification({ personnelData: person, certificates: sources, aircraftType, asOf: businessDate(at) }));
  }
  async function previewFor(req, record, at = now()) {
    const errors = reviewErrors(record.normalizedData);
    const candidate = { ...record, status: errors.length ? 'PENDING_REVIEW' : 'VERIFIED', reviewedBy: actorId(req), reviewedAt: at };
    return { provisional: true, grantsQualifications: false, errors,
      explanation: 'Potential eligibility after an authorized reviewer confirms this revision; no qualification has been saved.',
      results: await decisions(candidate, at) };
  }
  async function persist(req, original, changes, action, details) {
    let saved;
    await transaction(async session => {
      saved = await records.findOneAndUpdate(
        { _id: original._id, revision: original.revision, status: original.status },
        { $set: changes, $inc: { revision: 1 } }, { new: true, runValidators: true, session },
      ).select('+file +analysis').lean();
      if (!saved) throw new CertificateError(409, 'Certificate changed. Reload it before continuing.');
      if (action === 'VERIFIED' || action === 'AUTO_VERIFIED') {
        // Re-evaluate in the confirmation transaction using the real reviewer and current portfolio.
        const at = changes.verifiedAt || changes.reviewedAt;
        const decision = { asOf: businessDate(at), results: await decisions(saved, at, session) };
        saved = await records.findOneAndUpdate({ _id: saved._id, revision: saved.revision },
          { $set: { qualificationDecision: decision } }, { new: true, runValidators: true, session }).select('+file +analysis').lean();
        details = { ...details, qualificationDecision: decision };
      }
      await audit.create([{
        certificateId: original._id, personnelId: original.personnelId, actorId: actorId(req),
        action, revision: saved.revision, details,
      }], { session });
    });
    return saved;
  }
  async function analyze(req, id, input) {
    const body = validateReviewBody(input, ['expectedRevision', 'confirmAction']);
    const record = await getRecord(req, id, 'upload');
    requirePending(record, body.expectedRevision);
    if (record.processingStatus === 'ANALYZED') throw new CertificateError(409, 'Analysis is already saved. Review or correct the extracted fields.');
    await mechanic(record.personnelId);
    let analysis;
    try {
      analysis = await readCertificate(req, id);
    } catch (error) {
      // Resource contention is retryable and does not change the document's revision.
      if (error.status !== 429) await persist(req, record, { processingStatus: 'FAILED' }, 'ANALYSIS_FAILED', { reason: 'DOCUMENT_READING_FAILED' });
      throw error;
    }
    if (analysis.sourceRevision !== record.revision || analysis.sourceSha256 !== record.file.sha256) throw new CertificateError(409, 'Analysis source changed. Reload the certificate.');
    const normalizedData = normalizeReviewData(analysis.certificateData);
    const at = now();
    const verificationDecision = { ...assessAutomaticVerification(analysis, normalizedData, record.personnelId),
      sourceSha256: analysis.sourceSha256, certificateId: String(record._id), personnelId: String(record.personnelId) };
    const automatic = verificationDecision.eligible;
    const preview = automatic ? null : await previewFor(req, { ...record, normalizedData }, at);
    const saved = await persist(req, record, { analysis, normalizedData, correctedFields: {},
      holderMatch: analysis.holderMatch, processingStatus: 'ANALYZED', analyzedAt: at, verificationDecision,
      ...(automatic ? { status: 'VERIFIED', verificationMethod: 'AUTOMATIC', verifiedAt: at } : {}) }, automatic ? 'AUTO_VERIFIED' : 'ANALYZED',
    { sourceSha256: analysis.sourceSha256, originalExtractedFields: analysis.certificateData.originalExtractedFields,
      normalization: normalizedData.normalization, warnings: analysis.certificateData.warnings, verificationDecision, preview });
    return { certificate: serializeCertificate(saved, { includeAnalysis: true }), preview };
  }
  async function correct(req, id, input) {
    const body = validateReviewBody(input, ['expectedRevision', 'corrections', 'reviewNote', 'confirmAction']);
    const corrections = validateCorrections(body.corrections), note = reviewNote(body.reviewNote);
    const record = await getRecord(req, id, 'upload');
    requirePending(record, body.expectedRevision, true);
    const correctedFields = { ...record.correctedFields, ...corrections };
    const normalizedData = normalizeReviewData(record.analysis.certificateData, correctedFields);
    const holderMatch = normalizedData.holderName ? await matchHolder(req, normalizedData.holderName) : null;
    const preview = await previewFor(req, { ...record, normalizedData });
    const saved = await persist(req, record, { correctedFields, normalizedData, holderMatch, reviewNote: note }, 'REVIEW_UPDATED',
      { before: record.normalizedData, after: normalizedData, corrections, reviewNote: note, holderMatch, preview });
    return { certificate: serializeCertificate(saved, { includeAnalysis: true }), preview };
  }
  async function preview(req, id, input) {
    const body = validateReviewBody(input, ['expectedRevision']);
    const record = await getRecord(req, id);
    requirePending(record, body.expectedRevision, true);
    return previewFor(req, record);
  }
  async function confirm(req, id, input) {
    if (!hasPermission(req, permissions.CERTIFICATES_REVIEW_ALL)) throw new CertificateError(403, 'Only authorized certificate reviewers can confirm certificates.');
    const body = validateReviewBody(input, ['expectedRevision', 'confirmedPersonnelId', 'sourceReviewed', 'reviewNote', 'confirmAction']);
    if (body.sourceReviewed !== true) throw new CertificateError(400, 'Review the source document and acknowledge sourceReviewed before confirmation.');
    assertId(body.confirmedPersonnelId);
    const note = reviewNote(body.reviewNote);
    const record = await getRecord(req, id);
    requirePending(record, body.expectedRevision, true);
    if (String(record.personnelId) !== body.confirmedPersonnelId) throw new CertificateError(409, 'The selected mechanic differs from the upload owner. Upload the certificate under the correct mechanic.');
    const errors = reviewErrors(record.normalizedData);
    if (errors.length) throw new CertificateError(422, errors.join(' '));
    const at = now();
    const saved = await persist(req, record, { status: 'VERIFIED', verificationMethod: 'MANUAL', verifiedAt: at, reviewedBy: actorId(req), reviewedAt: at, reviewNote: note }, 'VERIFIED',
      { sourceSha256: record.file.sha256, sourceReviewed: true, confirmedPersonnelId: body.confirmedPersonnelId,
        sourceRevision: record.revision, correctedFields: record.correctedFields, normalizedData: record.normalizedData, reviewNote: note });
    return serializeCertificate(saved, { includeAnalysis: true });
  }
  async function qualifications(req, personnelId) {
    assertId(personnelId); assertAccess(req, personnelId, 'read');
    const person = await mechanic(personnelId);
    const stored = await records.find({ personnelId, status: 'VERIFIED' }).lean();
    const asOf = businessDate(now());
    return { personnelId, asOf, results: rules.aircraft.map(aircraftType => evaluateQualification({
      personnelData: person, certificates: stored.map(qualificationSource), aircraftType, asOf,
    })) };
  }
  async function directory(req) {
    const all = hasPermission(req, permissions.CERTIFICATES_READ_ALL);
    if (!all) assertAccess(req, actorId(req), 'read');
    const filter = all ? { jobTitle: 'Mechanic' } : { _id: assertId(actorId(req)), jobTitle: 'Mechanic' };
    const people = await users.find(filter).select('_id firstName lastName').sort({ lastName: 1, firstName: 1 }).lean();
    return people.map(person => ({ id: String(person._id), name: `${person.firstName} ${person.lastName}`.trim() }));
  }
  async function disposition(req, id, input, action) {
    if (!hasPermission(req, permissions.CERTIFICATES_REVIEW_ALL)) throw new CertificateError(403, 'Only authorized reviewers can reject or revoke certificates.');
    const body = validateReviewBody(input, ['expectedRevision', 'reviewNote', 'confirmAction']);
    const note = reviewNote(body.reviewNote), record = await getRecord(req, id);
    const required = action === 'REJECTED' ? 'PENDING_REVIEW' : 'VERIFIED';
    if (!['REJECTED', 'REVOKED'].includes(action) || record.status !== required || record.revision !== body.expectedRevision) throw new CertificateError(409, 'Certificate changed or cannot be rejected/revoked in its current state. Reload it.');
    const at = now();
    const saved = await persist(req, record, { status: action, reviewNote: note,
      ...(action === 'REVOKED' ? { revokedAt: at } : { reviewedBy: actorId(req), reviewedAt: at }) }, action,
    { reviewNote: note, previousStatus: record.status, normalizedData: record.normalizedData, sourceSha256: record.file.sha256 });
    return serializeCertificate(saved, { includeAnalysis: true });
  }
  return { analyze, correct, preview, confirm, qualifications, directory, disposition };
}

module.exports = { createCertificateReviewService, businessDate, qualificationSource };
