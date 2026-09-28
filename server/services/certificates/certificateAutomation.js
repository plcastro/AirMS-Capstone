const policy = require('../../config/certificateAutomationPolicy');
const { reviewErrors } = require('./certificateReviewData');

// Reading confidence alone cannot resolve missing facts or a different holder.
// This decision is made from server-produced evidence, never request fields.
function assessAutomaticVerification(analysis, normalizedData, personnelId) {
  const reasons = [];
  const add = (code, message, field = null) => {
    if (!reasons.some(item => item.code === code && item.field === field && item.message === message)) reasons.push({ code, message, field });
  };
  const pages = analysis.extraction?.pages || [];
  if (!pages.length || !analysis.extraction?.rawText?.trim() || pages.some(page => !page.text?.trim())) {
    add('UNREADABLE_DOCUMENT', 'Some of this document could not be read. Check the original or upload a clearer copy.');
  }
  for (const page of pages) {
    const readings = [{ method: page.method, confidence: page.confidence },
      ...(page.alternateText ? [{ method: 'OCR', confidence: page.alternateConfidence }] : [])];
    if (readings.some(item => item.method !== 'PDF_TEXT' && (item.method !== 'OCR' || !Number.isFinite(item.confidence) || item.confidence < policy.minimumOcrConfidence || item.confidence > 1))) {
      add('UNCERTAIN_READING', 'Some text is unclear. Check the extracted details against the original.');
    }
  }
  for (const message of reviewErrors(normalizedData)) add('MISSING_OR_INVALID_DETAILS', message);
  const holder = analysis.holderMatch;
  const candidate = holder?.candidates?.find(item => String(item.personnelId) === String(personnelId));
  if (holder?.status !== 'LIKELY_MATCH' || String(holder.suggestedPersonnelId) !== String(personnelId)
    || !Number.isFinite(candidate?.score) || candidate.score < policy.minimumNameSimilarity) {
    add('CHECK_CERTIFICATE_HOLDER', 'Confirm that the name on this certificate belongs to the selected mechanic.', 'holderName');
  }
  const data = analysis.certificateData || {};
  const evidence = data.evidence || [];
  const required = ['holderName', 'aircraftRatings', 'expiryDate', normalizedData.certificateType ? 'certificateType' : 'certificateNumber'];
  for (const field of required) {
    if (!evidence.some(item => item.field === field && item.value && (item.method === 'PDF_TEXT'
      || (['OCR', 'OCR_ADAPTIVE'].includes(item.method) && Number.isFinite(item.confidence) && item.confidence >= policy.minimumOcrConfidence && item.confidence <= 1)))) {
      add('MISSING_FIELD_EVIDENCE', `Check the ${({ holderName: 'holder name', aircraftRatings: 'aircraft ratings', expiryDate: 'expiry information', certificateType: 'certificate type', certificateNumber: 'certificate number' })[field]}; it could not be established from the document.`, field);
    }
  }
  if (normalizedData.limitations.length) add('CHECK_RESTRICTIONS', 'Check the certificate restrictions before accepting its aircraft coverage.', 'limitations');
  const informational = new Set(['AIRCRAFT_MENTION_OUTSIDE_RATING_FIELD', 'ADDITIONAL_OCR_READING_REQUIRES_REVIEW', 'COURSE_APPROVAL_EXPIRY_NOT_CERTIFICATE_EXPIRY']);
  for (const warning of data.warnings || []) {
    if (informational.has(warning.code) || (warning.code === 'MISSING_DATE' && warning.field === 'issueDate')) continue;
    const message = warning.code === 'CONFLICTING_VALUES' ? 'Different readings disagree. Check the conflicting details.'
      : warning.code === 'ASSESSMENT_MARKINGS_REQUIRE_VISUAL_REVIEW' ? 'Check the marked or crossed-out assessment statements in the original.'
        : 'A certificate detail could not be read or interpreted reliably. Check it against the original.';
    add(warning.code, message, warning.field || null);
  }
  return { eligible: reasons.length === 0, policyVersion: policy.version, reasons,
    minimumOcrConfidence: policy.minimumOcrConfidence, minimumNameSimilarity: policy.minimumNameSimilarity };
}

module.exports = { assessAutomaticVerification };
