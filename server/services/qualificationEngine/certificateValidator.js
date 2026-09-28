const policy = require('./qualificationRules.json');
const { normalizeCertificate, normalizeId } = require('./normalizer');
const automation = require('../../config/certificateAutomationPolicy');

function isCalendarDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function assertEvaluationDate(asOf) {
  if (!isCalendarDate(asOf)) throw new TypeError('asOf must be a valid YYYY-MM-DD business date.');
}

function validateCertificate(certificate, { personnelId, asOf, duplicate = false }) {
  const data = normalizeCertificate(certificate);
  const issue = certificate.issueDate;
  const expiry = certificate.expiryDate;
  const hasIssue = issue !== undefined && issue !== null && issue !== '';
  const hasExpiry = expiry !== undefined && expiry !== null && expiry !== '';
  const issueValid = isCalendarDate(issue);
  const expiryValid = isCalendarDate(expiry);
  const noExpiry = certificate.doesNotExpire === true && !hasExpiry;
  const expired = data.status === 'EXPIRED' || (expiryValid && (policy.expiryDateInclusive ? expiry < asOf : expiry <= asOf));
  const revoked = data.status === 'REVOKED' || Boolean(certificate.revokedAt);
  const limitationsValid = certificate.limitations === undefined || Array.isArray(certificate.limitations);
  const limitations = Array.isArray(certificate.limitations) ? [...certificate.limitations] : [];
  const reviewedAt = certificate.reviewedAt;
  // Confirmation dates are ISO timestamps; require a real calendar date as well.
  const humanReviewValid = typeof reviewedAt === 'string' &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(reviewedAt) &&
    isCalendarDate(reviewedAt.slice(0, 10)) && Number.isFinite(Date.parse(reviewedAt)) &&
    reviewedAt.slice(0, 10) <= asOf && Boolean(normalizeId(certificate.reviewedBy));
  const automatic = certificate.verificationDecision;
  const automaticValid = certificate.verificationMethod === 'AUTOMATIC' && automatic?.eligible === true
    && automatic.policyVersion === automation.version && Array.isArray(automatic.reasons) && automatic.reasons.length === 0
    && automatic.certificateId === data.certificateId && automatic.personnelId === data.personnelId
    && /^[a-f0-9]{64}$/.test(automatic.sourceSha256 || '')
    && typeof certificate.verifiedAt === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(certificate.verifiedAt)
    && isCalendarDate(certificate.verifiedAt.slice(0, 10)) && Number.isFinite(Date.parse(certificate.verifiedAt)) && certificate.verifiedAt.slice(0, 10) <= asOf;
  const reviewValid = certificate.verificationMethod === 'AUTOMATIC' ? automaticValid : humanReviewValid;
  const conditions = {
    CERTIFICATE_ID: [Boolean(data.certificateId), 'Certificate has a source ID.', 'Certificate source ID is missing.', true],
    PERSONNEL_MATCH: [Boolean(personnelId) && data.personnelId === personnelId, 'Certificate belongs to this person.', 'Certificate is not linked to this person.', false],
    VERIFIED: [data.status === 'VERIFIED', 'Certificate was verified.', 'Certificate is not verified.', !['REJECTED', 'REVOKED', 'EXPIRED'].includes(data.status)],
    REVIEW_EVIDENCE: [reviewValid, 'Certificate acceptance evidence is recorded.', 'Valid acceptance evidence is missing or dated after evaluation.', true],
    NOT_REVOKED: [!revoked, 'Certificate is not revoked.', 'Certificate has been revoked.', false],
    ISSUE_DATE: [!hasIssue || (issueValid && issue <= asOf), 'Issue date is applicable or not specified.', 'Issue date is invalid or in the future.', !issueValid],
    EXPIRY_DATE: [!expired && (noExpiry || (expiryValid && certificate.doesNotExpire !== true)), 'Certificate is within validity or explicitly non-expiring.', expired ? 'Certificate has expired.' : 'Expiry information is missing, invalid, or contradictory.', !expired],
    DATE_ORDER: [!hasIssue || !hasExpiry || (issueValid && expiryValid && issue <= expiry), 'Certificate date order is valid.', 'Certificate dates are inconsistent.', true],
    AIRCRAFT_RATINGS: [data.aircraftRatings.length > 0, 'An aircraft rating is present.', 'No recognized aircraft rating is present.', true],
    KNOWN_AIRCRAFT: [Array.isArray(certificate.aircraftRatings) && data.unknownAircraftRatings.length === 0, 'Aircraft labels are recognized.', 'An aircraft label is ambiguous, unknown, or malformed.', true],
    NO_LIMITATIONS: [limitationsValid && limitations.length === 0, 'No unresolved certificate limitations.', 'Certificate limitations require review before granting all tasks.', true],
    REVIEW_RESOLVED: [certificate.requiresManualReview !== true, 'No outstanding manual review flag.', 'Certificate still requires manual review.', true],
    UNIQUE_SOURCE: [!duplicate, 'Certificate source ID is unique.', 'Duplicate certificate source ID requires reconciliation.', true],
  };
  const checks = policy.requirements.map(code => {
    if (!conditions[code]) throw new Error(`Unsupported qualification requirement: ${code}`);
    const [passed, success, failure, manualReview] = conditions[code];
    return { code, passed, message: passed ? success : failure, requiresManualReview: !passed && manualReview, certificateId: data.certificateId };
  });
  return {
    ...data,
    limitations,
    issueDate: issueValid ? issue : null,
    expiryDate: expiryValid ? expiry : null,
    doesNotExpire: noExpiry,
    expired,
    revoked,
    eligible: checks.every(check => check.passed),
    requiresManualReview: checks.some(check => check.requiresManualReview),
    checks,
  };
}

module.exports = { assertEvaluationDate, validateCertificate, isCalendarDate };
