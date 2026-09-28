const mongoose = require('mongoose');
const Certificate = require('../../models/certificateRecordModel');
const Audit = require('../../models/certificateAuditModel');
const User = require('../../models/userModel');
const { createCertificateStorage } = require('./certificateStorage');
const { validateCertificateFile } = require('./certificateFileValidator');
const { actorId, assertAccess, assertId } = require('./certificateAccess');
const { CertificateError } = require('./certificateErrors');

function serializeCertificate(record, { includeAnalysis = false } = {}) {
  return {
    id: String(record._id), personnelId: String(record.personnelId), uploadedBy: String(record.uploadedBy),
    status: record.status, processingStatus: record.processingStatus, revision: record.revision,
    reviewedBy: record.reviewedBy ? String(record.reviewedBy) : null,
    reviewedAt: record.reviewedAt || null, revokedAt: record.revokedAt || null,
    analyzedAt: record.analyzedAt || null,
    verificationMethod: record.verificationMethod || null, verificationDecision: record.verificationDecision || null,
    verifiedAt: record.verifiedAt || record.reviewedAt || null,
    normalizedData: record.normalizedData || null, holderMatch: record.holderMatch || null,
    reviewNote: record.reviewNote || '', correctedFields: record.correctedFields || {},
    qualificationDecision: record.qualificationDecision || null,
    ...(includeAnalysis ? { analysis: record.analysis || null } : {}),
    createdAt: record.createdAt, updatedAt: record.updatedAt,
    file: record.file ? {
      name: record.file.originalName, mimeType: record.file.mimeType, size: record.file.size,
      sha256: record.file.sha256, pageCount: record.file.pageCount,
      width: record.file.width, height: record.file.height,
    } : undefined,
  };
}

function createCertificateService({
  records = Certificate, audit = Audit, users = User,
  storage = createCertificateStorage(), validate = validateCertificateFile,
  transaction = callback => mongoose.connection.transaction(callback),
} = {}) {
  async function authorizeUpload(req, personnelId) {
    assertId(personnelId);
    assertAccess(req, personnelId, 'upload');
    const person = await users.findById(personnelId).select('jobTitle').lean();
    if (!person) throw new CertificateError(404, 'Personnel record not found.');
    if (String(person.jobTitle).trim().toLowerCase() !== 'mechanic') throw new CertificateError(400, 'This feature currently accepts certificates for mechanics.');
    storage.ready();
  }

  async function upload(req, personnelId, file) {
    await authorizeUpload(req, personnelId);
    const metadata = await validate(file);
    const reference = await storage.save(file.buffer, metadata);
    try {
      let created;
      await transaction(async session => {
        const [record] = await records.create([{
          personnelId, uploadedBy: actorId(req), file: { ...reference, ...metadata },
          status: 'PENDING_REVIEW', processingStatus: 'UPLOADED', revision: 1,
        }], { session });
        await audit.create([{
          certificateId: record._id, personnelId, actorId: actorId(req), action: 'UPLOADED', revision: 1,
          details: { status: 'PENDING_REVIEW', sha256: metadata.sha256, mimeType: metadata.mimeType, size: metadata.size },
        }], { session });
        created = record;
      });
      return serializeCertificate(created);
    } catch (error) {
      if (error.hasErrorLabel?.('UnknownTransactionCommitResult')) {
        console.error('Certificate transaction outcome needs reconciliation:', reference.key);
        throw error;
      }
      await storage.remove(reference).catch(() => {
        // Record the opaque cleanup key, never document contents or storage tokens.
        console.error('Certificate upload rollback needs file cleanup:', reference.key);
      });
      throw error;
    }
  }

  async function getRecord(req, id) {
    assertId(id);
    const record = await records.findById(id).select('+file +analysis').lean();
    if (!record) throw new CertificateError(404, 'Certificate not found.');
    assertAccess(req, record.personnelId, 'read');
    return record;
  }
  async function list(req, personnelId, page = 1, status = 'all') {
    assertId(personnelId); assertAccess(req, personnelId, 'read');
    if (!['all', 'PENDING_REVIEW', 'VERIFIED', 'REJECTED', 'REVOKED'].includes(status)) throw new CertificateError(400, 'Invalid certificate status.');
    const filter = { personnelId, ...(status !== 'all' ? { status } : {}) };
    const [items, total] = await Promise.all([
      records.find(filter).select('+file').sort({ createdAt: -1, _id: -1 }).skip((page - 1) * 25).limit(25).lean(),
      records.countDocuments(filter),
    ]);
    return { data: items.map(item => serializeCertificate(item)), pagination: { page, pageSize: 25, total } };
  }
  async function history(req, id, page = 1) {
    await getRecord(req, id);
    const items = await audit.find({ certificateId: id }).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * 25).limit(25).lean();
    return items.map(item => ({ id: String(item._id), action: item.action, actorId: String(item.actorId), revision: item.revision, details: item.details, createdAt: item.createdAt }));
  }
  async function download(req, id) {
    const record = await getRecord(req, id);
    const data = await storage.read(record.file);
    // Fail closed if auditing fails; this records an access grant, not proof of delivery.
    await audit.create({ certificateId: record._id, personnelId: record.personnelId, actorId: actorId(req), action: 'FILE_ACCESS_GRANTED', revision: record.revision, details: {} });
    return { data, mimeType: record.file.mimeType, filename: record.file.originalName };
  }
  return { authorizeUpload, upload, list, history, download, get: async (req, id) => serializeCertificate(await getRecord(req, id), { includeAnalysis: true }) };
}

module.exports = { createCertificateService, serializeCertificate };
