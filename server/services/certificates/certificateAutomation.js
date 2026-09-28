const policy = require('../../config/certificateAutomationPolicy');
const { aircraftMatchErrors } = require('./certificateAircraftMatch');

// A page-wide OCR score can be lowered by logos or signatures. The decision uses
// recognized holder/aircraft text and its source, not a whole-page score cutoff.
const clearEvidence = item => ['PDF_TEXT', 'OCR', 'OCR_ADAPTIVE'].includes(item?.method);

function assessAutomaticVerification(analysis, normalizedData, personnelId) {
  const reasons = [];
  const add = (code, message, field = null) => {
    if (!reasons.some(item => item.code === code && item.field === field && item.message === message)) reasons.push({ code, message, field });
  };
  const pages = analysis.extraction?.pages || [];
  if (!pages.length || !analysis.extraction?.rawText?.trim() || !pages.some(page => page.text?.trim())) {
    add('UNREADABLE_DOCUMENT', 'Some of this document could not be read. Upload a clearer copy or check the details.');
  }
  for (const message of aircraftMatchErrors(normalizedData)) add('MISSING_OR_INVALID_DETAILS', message);
  const holder = analysis.holderMatch;
  const candidate = holder?.candidates?.find(item => String(item.personnelId) === String(personnelId));
  if (holder?.status !== 'LIKELY_MATCH' || String(holder.suggestedPersonnelId) !== String(personnelId)
    || !Number.isFinite(candidate?.score) || candidate.score < policy.minimumNameSimilarity) {
    add('CHECK_CERTIFICATE_HOLDER', 'Check that the certificate holder is the selected mechanic.', 'holderName');
  }
  const data = analysis.certificateData || {};
  for (const field of ['holderName']) {
    if (!(data.evidence || []).some(item => item.field === field && item.value && clearEvidence(item))) {
      add('UNCERTAIN_FIELD', `Check the ${field === 'holderName' ? 'certificate holder' : 'certificate type'}; its text is unclear.`, field);
    }
  }
  const matches = normalizedData.detectedAircraft || [];
  for (const aircraft of normalizedData.aircraftRatings || []) {
    if (!matches.some(item => item.aircraftType === aircraft && !item.ambiguous && clearEvidence(item))) {
      add('UNCERTAIN_AIRCRAFT', 'Check the aircraft name in the qualification; its text is unclear.', aircraft);
    }
  }
  // Unrelated metadata and course scope notes do not obstruct the match policy.
  for (const warning of data.warnings || []) {
    if (warning.code === 'CONFLICTING_VALUES' && ['holderName', 'qualifications', 'aircraftRatings'].includes(warning.field)) {
      add(warning.code, 'The readings disagree on a required detail. Check it against the original.', warning.field);
    }
  }
  return { eligible: reasons.length === 0, policyVersion: policy.version, qualificationPolicy: policy.qualificationPolicy,
    reasons, matchedAircraft: [...(normalizedData.aircraftRatings || [])], evidence: matches,
    explanation: 'The certificate holder matches this mechanic and the detected aircraft matches a supported type. AirMS approves all tasks for that aircraft. Licence validity and expiry dates are ignored under the current rule.',
    sourceNotes: [...(normalizedData.limitations || [])],
    confidenceBasis: 'MATCHED_HOLDER_AND_AIRCRAFT_TEXT', minimumNameSimilarity: policy.minimumNameSimilarity };
}

module.exports = { assessAutomaticVerification };
