const policy = require('./qualificationRules.json');
const { normalizeAircraft } = require('./normalizer');
const { buildQualificationProfile } = require('./profileBuilder');

function evaluateQualification({ personnelData, certificates, aircraftType, task = null, asOf } = {}) {
  const profile = buildQualificationProfile({ personnelData, certificates, asOf });
  const aircraft = normalizeAircraft(aircraftType);
  const supported = Boolean(aircraft && policy.aircraft.includes(aircraft));
  const samePerson = profile.certificateAssessments.filter(certificate => certificate.personnelId === profile.personnelId && profile.personnelId);
  const relevant = samePerson.filter(certificate => supported && certificate.aircraftRatings.includes(aircraft));
  const sources = relevant.filter(certificate => certificate.eligible);
  // A current verified restriction cannot be bypassed with another clean certificate.
  // Expired/revoked/rejected records never invalidate otherwise usable evidence.
  const blockedByRestriction = sources.some(source => source.approval) ? [] : relevant.filter(certificate => certificate.status === 'VERIFIED' &&
    !certificate.expired && !certificate.revoked && (policy.ignoreLicenseValidity || !certificate.issueDate || certificate.issueDate <= asOf) &&
    certificate.checks.some(check => check.code === 'NO_LIMITATIONS' && !check.passed));
  const checks = [
    { code: 'PERSONNEL_ID', passed: Boolean(profile.personnelId), message: profile.personnelId ? 'Personnel ID provided.' : 'Personnel ID is missing.' },
    { code: 'MECHANIC_ROLE', passed: profile.isMechanic, message: profile.isMechanic ? 'Person is a mechanic.' : 'Aircraft task qualification applies to mechanics.' },
    { code: 'SUPPORTED_AIRCRAFT', passed: supported, message: supported ? `Aircraft normalized to ${aircraft}.` : 'Aircraft model is unknown or unsupported.' },
    { code: 'VALID_SOURCE', passed: sources.length > 0, message: sources.length ? 'Verified, valid certificate covers this aircraft.' : 'No verified, valid certificate covers this aircraft.' },
    { code: 'UNRESTRICTED_SCOPE', passed: blockedByRestriction.length === 0, message: blockedByRestriction.length ? 'A current verified certificate has unresolved restrictions.' : 'No current verified restriction blocks all-task eligibility.' },
  ];
  const qualified = checks.every(check => check.passed);
  const uncertain = relevant.some(certificate => certificate.requiresManualReview && !certificate.expired && !certificate.revoked && certificate.status !== 'REJECTED') ||
    samePerson.some(certificate => certificate.unknownAircraftRatings.length && certificate.requiresManualReview && !certificate.expired && !certificate.revoked && certificate.status !== 'REJECTED');
  const requiresManualReview = !qualified && (!supported || !profile.personnelId ||
    (profile.isMechanic && (blockedByRestriction.length > 0 || uncertain)));
  const evidenceChecks = relevant.flatMap(certificate => certificate.checks);
  const failedEvidence = qualified ? [] : evidenceChecks.filter(check => !check.passed);
  const validThrough = !policy.ignoreLicenseValidity && qualified && !sources.some(certificate => certificate.doesNotExpire || !certificate.expiryDate)
    ? sources.map(certificate => certificate.expiryDate).sort().at(-1)
    : null;
  return {
    personnelId: profile.personnelId,
    aircraft,
    requestedAircraft: aircraftType ?? null,
    task,
    qualified,
    decision: qualified ? 'QUALIFIED' : requiresManualReview ? 'NEEDS_REVIEW' : 'NOT_QUALIFIED',
    requiresManualReview,
    allTasksAllowed: qualified,
    permittedTaskScope: qualified ? policy.taskScope : null,
    validThrough,
    evaluatedAsOf: asOf,
    validityIgnored: policy.ignoreLicenseValidity === true,
    ruleCode: policy.ruleCode,
    ruleVersion: policy.version,
    sourceCertificates: qualified ? sources.map(certificate => certificate.certificateId) : [],
    approvalEvidence: qualified ? sources.filter(source => source.approval).map(source => ({ ...source.approval,
      evidence: source.approval.evidence.filter(item => item.aircraftType === aircraft) })) : [],
    expiredCertificateIds: relevant.filter(certificate => certificate.expired).map(certificate => certificate.certificateId),
    restrictions: blockedByRestriction.flatMap(certificate => certificate.limitations.map(limitation => ({ certificateId: certificate.certificateId, limitation }))),
    matchedRules: checks.filter(check => check.passed).map(check => check.message),
    failedRules: [
      ...checks.filter(check => !check.passed).map(check => check.message),
      ...failedEvidence.map(check => `${check.certificateId || 'Unidentified certificate'}: ${check.message}`),
    ],
    checks,
    certificateChecks: evidenceChecks,
    certificateAssessments: profile.certificateAssessments,
  };
}

module.exports = { evaluateQualification };
