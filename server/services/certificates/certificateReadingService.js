const { createCertificateService } = require('./certificateService');
const { readCertificateText } = require('./certificateTextReader');
const { parseCertificateFields } = require('./certificateFieldParser');
const { createCertificateHolderMatchService } = require('./certificateHolderMatchService');

// Read-only draft builder used by the analysis API. No database writes to
// certificate fields, owner, verification or personnel qualification are performed.
function createCertificateReadingService({
  certificates = createCertificateService(), readText = readCertificateText,
  matchHolder = createCertificateHolderMatchService(),
} = {}) {
  return async function readCertificate(req, certificateId) {
    // Both operations enforce ownership/role access. Download also records file access.
    const record = await certificates.get(req, certificateId);
    const original = await certificates.download(req, certificateId);
    const extension = { 'application/pdf': '.pdf', 'image/png': '.png', 'image/jpeg': '.jpg' }[original.mimeType] || '.unsupported';
    // The stored display name may be truncated. Type comes from validated metadata;
    // the reader still checks the original byte signature and decodes the contents.
    const extraction = await readText({ buffer: original.data, originalname: `certificate${extension}`, mimetype: original.mimeType });
    const certificateData = parseCertificateFields(extraction);
    const holderMatch = certificateData.holderName ? await matchHolder(req, certificateData.holderName) : null;
    if (!holderMatch || holderMatch.status !== 'LIKELY_MATCH') certificateData.warnings.push({ code: 'HOLDER_MATCH_REQUIRES_REVIEW', field: 'holderName', page: null });
    else if (holderMatch.suggestedPersonnelId !== record.personnelId) certificateData.warnings.push({ code: 'HOLDER_DIFFERS_FROM_CERTIFICATE_OWNER', field: 'holderName', page: null });
    return { certificateId: record.id, personnelId: record.personnelId, sourceRevision: record.revision,
      sourceSha256: record.file.sha256, status: 'DRAFT', requiresConfirmation: true,
      extraction, certificateData, holderMatch };
  };
}

module.exports = { createCertificateReadingService };
