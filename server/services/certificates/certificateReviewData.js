const { CertificateError } = require('./certificateErrors');
const { normalizeAircraft } = require('../qualificationEngine/normalizer');
const { isCalendarDate } = require('../qualificationEngine/certificateValidator');

const textFields = ['certificateType', 'holderName', 'certificateNumber', 'issuingAuthority'];
const dateFields = ['issueDate', 'expiryDate'];
const arrayFields = ['aircraftRatings', 'qualifications', 'taskAuthorizations', 'limitations'];
const allowed = new Set([...textFields, ...dateFields, ...arrayFields, 'doesNotExpire']);
const fail = message => { throw new CertificateError(400, message); };
const isObject = value => value && typeof value === 'object' && !Array.isArray(value);

function validateReviewBody(body, fields) {
  if (!isObject(body) || Object.keys(body).some(key => !fields.includes(key))) fail('Unexpected certificate request fields.');
  if (!Number.isSafeInteger(body.expectedRevision) || body.expectedRevision < 1) fail('Provide the current expectedRevision.');
  return body;
}
function reviewNote(value) {
  if (typeof value !== 'string' || !value.trim() || value.length > 2000) fail('Provide a review note of 1 to 2000 characters.');
  return value.trim();
}
function validateCorrections(value) {
  if (!isObject(value) || !Object.keys(value).length || Object.keys(value).some(key => !allowed.has(key))) fail('Provide supported certificate fields to correct.');
  const result = {};
  for (const [key, item] of Object.entries(value)) {
    if (textFields.includes(key)) {
      if (item !== null && (typeof item !== 'string' || item.length > (key === 'holderName' ? 160 : 1000))) fail(`Invalid ${key}.`);
      result[key] = item?.trim() || null;
    } else if (dateFields.includes(key)) {
      if (item !== null && !isCalendarDate(item)) fail(`${key} must be null or a valid YYYY-MM-DD date.`);
      result[key] = item;
    } else if (arrayFields.includes(key)) {
      if (!Array.isArray(item) || item.length > 50 || item.some(text => typeof text !== 'string' || !text.trim() || text.length > 1000)) fail(`Invalid ${key}.`);
      result[key] = [...new Set(item.map(text => text.trim()))];
    } else {
      if (typeof item !== 'boolean') fail('doesNotExpire must be a boolean.');
      result[key] = item;
    }
  }
  return result;
}

function normalizeReviewData(extracted, corrected = {}) {
  const data = {};
  for (const key of allowed) data[key] = Object.hasOwn(corrected, key) ? corrected[key] : extracted[key];
  for (const key of textFields) data[key] = typeof data[key] === 'string' ? data[key].trim() : null;
  for (const key of dateFields) data[key] = data[key] || null;
  for (const key of arrayFields) data[key] = Array.isArray(data[key]) ? [...data[key]] : [];
  data.doesNotExpire = data.doesNotExpire === true;
  // Unknown OCR ratings must survive until a reviewer explicitly corrects ratings.
  if (!Object.hasOwn(corrected, 'aircraftRatings')) data.aircraftRatings.push(...(extracted.unknownAircraftRatings || []));
  data.normalization = data.aircraftRatings.map(original => ({ field: 'aircraftRatings', original, normalized: normalizeAircraft(original) }));
  data.aircraftRatings = [...new Set(data.normalization.map(item => item.normalized || item.original))];
  return data;
}

function reviewErrors(data) {
  const errors = [];
  if (!data.holderName) errors.push('Holder name is required.');
  if (!data.certificateType && !data.certificateNumber) errors.push('Certificate type or certificate number is required.');
  if (data.issueDate && !isCalendarDate(data.issueDate)) errors.push('Issue date is invalid.');
  if (data.doesNotExpire ? Boolean(data.expiryDate) : !isCalendarDate(data.expiryDate)) errors.push('Provide an expiry date or explicitly confirm that this certificate does not expire.');
  if (data.issueDate && data.expiryDate && data.issueDate > data.expiryDate) errors.push('Expiry date cannot precede issue date.');
  if (!data.aircraftRatings.length || data.aircraftRatings.some(value => !normalizeAircraft(value))) errors.push('Select recognized aircraft ratings before confirmation.');
  return errors;
}

module.exports = { validateReviewBody, validateCorrections, normalizeReviewData, reviewErrors, reviewNote };
