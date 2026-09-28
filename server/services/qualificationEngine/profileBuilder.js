const policy = require('./qualificationRules.json');
const { normalizeId } = require('./normalizer');
const { assertEvaluationDate, validateCertificate } = require('./certificateValidator');

function buildQualificationProfile({ personnelData = {}, certificates = [], asOf } = {}) {
  assertEvaluationDate(asOf);
  if (!Array.isArray(certificates) || certificates.some(item => !item || typeof item !== 'object' || Array.isArray(item))) {
    throw new TypeError('certificates must be an array of certificate records.');
  }
  const personnelId = normalizeId(personnelData.id || personnelData._id);
  const role = String(personnelData.jobTitle || '').trim().toLowerCase();
  const counts = new Map();
  for (const certificate of certificates) {
    const id = normalizeId(certificate.id || certificate._id);
    counts.set(id, (counts.get(id) || 0) + 1);
  }
  const certificateAssessments = certificates.map(certificate => validateCertificate(certificate, {
    personnelId, asOf, duplicate: counts.get(normalizeId(certificate.id || certificate._id)) > 1,
  })).sort((a, b) => a.certificateId.localeCompare(b.certificateId));
  const sourceCertificates = certificateAssessments.filter(certificate => certificate.eligible);
  return {
    personnelId,
    isMechanic: role === policy.personnelRole,
    asOf,
    ruleVersion: policy.version,
    aircraftRatings: role === policy.personnelRole
      ? [...new Set(sourceCertificates.flatMap(certificate => certificate.aircraftRatings))].sort()
      : [],
    sourceCertificates,
    certificateAssessments,
  };
}

module.exports = { buildQualificationProfile };
