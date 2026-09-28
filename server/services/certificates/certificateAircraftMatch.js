const aliases = require('../qualificationEngine/aircraftAliases.json');
const { normalizeAircraft } = require('../qualificationEngine/normalizer');
const { normalizeReviewData } = require('./certificateReviewData');

const escape = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const pattern = Object.values(aliases).flat().sort((a, b) => b.length - a.length)
  .map(label => label.split(/[\s-]+/).map(escape).join('[\\s-]*')).join('|');
const aircraftPattern = () => new RegExp(`(?<![\\p{L}\\p{N}])(?:${pattern})(?![\\p{L}\\p{N}])`, 'giu');

// Preserve the actual detected text; never infer an aircraft from an engine family.
function detectCertificateAircraft(data) {
  const detected = [];
  for (const field of ['qualifications', 'aircraftRatings']) {
    for (const statement of (field === 'aircraftRatings' ? data.originalExtractedFields?.aircraftRatings || data[field] : data[field]) || []) {
      const evidence = (data.evidence || []).filter(item => item.field === field && item.value === statement);
      const best = evidence.sort((a, b) => (b.method === 'PDF_TEXT' ? 1 : b.confidence || 0) - (a.method === 'PDF_TEXT' ? 1 : a.confidence || 0))[0];
      for (const match of statement.matchAll(aircraftPattern())) {
        const aircraftType = normalizeAircraft(match[0]);
        if (!detected.some(item => item.aircraftType === aircraftType && item.qualification === statement)) {
          detected.push({ aircraftType, detectedText: match[0], qualification: statement,
            page: best?.page || null, method: best?.method || null, confidence: best?.confidence ?? null,
            ambiguous: /\b(?:not (?:rated|authorized|authorised|qualified|valid)|except|excluded|prohibited|differences)\b/i.test(statement) });
        }
      }
    }
  }
  for (const mention of data.aircraftMentions || []) {
    if (detected.some(item => item.aircraftType === mention.normalized)) continue;
    const page = data.extractionPages?.find(item => item.page === mention.page);
    const statement = mention.text || page?.text?.split(/\r?\n/)[mention.line - 1]?.trim() || mention.original;
    detected.push({ aircraftType: mention.normalized, detectedText: mention.original, qualification: statement,
      page: mention.page, method: mention.method || page?.method || null, confidence: mention.confidence ?? page?.confidence ?? null,
      ambiguous: /\b(?:not (?:rated|authorized|authorised|qualified|valid)|except|excluded|prohibited|differences)\b/i.test(statement) });
  }
  return detected;
}

function matchedCertificateData(extracted, corrections = {}) {
  const data = normalizeReviewData(extracted, corrections);
  const source = { ...extracted, ...corrections, originalExtractedFields: { ...extracted.originalExtractedFields,
    ...(Object.hasOwn(corrections, 'aircraftRatings') ? { aircraftRatings: corrections.aircraftRatings } : {}) } };
  if (Object.hasOwn(corrections, 'qualifications') && !Object.hasOwn(corrections, 'aircraftRatings')) {
    source.aircraftRatings = []; source.originalExtractedFields.aircraftRatings = [];
    source.aircraftMentions = [];
  }
  const detectedAircraft = detectCertificateAircraft(source);
  const aircraftRatings = [...new Set(detectedAircraft.filter(item => !item.ambiguous).map(item => item.aircraftType))];
  detectedAircraft.sort((a, b) => (b.method === 'PDF_TEXT' ? 1 : b.confidence || 0) - (a.method === 'PDF_TEXT' ? 1 : a.confidence || 0));
  return { ...data, aircraftRatings, detectedAircraft,
    qualifications: data.qualifications.length ? data.qualifications : detectedAircraft.map(item => item.qualification) };
}

function aircraftMatchErrors(data) {
  const errors = [];
  if (!data.holderName) errors.push('Check the certificate holder. The name could not be read.');
  if (!data.aircraftRatings?.length) errors.push('No supported aircraft matches the qualification. Check the aircraft name in the qualification text.');
  if (data.detectedAircraft?.some(item => item.ambiguous)) errors.push('The aircraft statement contains a difference or exclusion. Check which aircraft the qualification covers.');
  return errors;
}

module.exports = { detectCertificateAircraft, matchedCertificateData, aircraftMatchErrors };
