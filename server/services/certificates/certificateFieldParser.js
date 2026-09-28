const fields = require('../../config/certificateFieldPatterns');
const policy = require('../../config/certificateExtractionPolicy');
const namePolicy = require('../../config/certificateNameMatching');
const aliases = require('../qualificationEngine/aircraftAliases.json');
const { normalizeAircraft } = require('../qualificationEngine/normalizer');
const { readLayout, plausibleName } = require('./certificateLayoutParser');

const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const aircraftPattern = Object.values(aliases).flat().sort((a, b) => b.length - a.length)
  .map(alias => alias.split(/[\s-]+/).map(escapeRegex).join('[\\s-]*')).join('|');
const aircraftRegex = () => new RegExp(`(?<![\\p{L}\\p{N}])(?:${aircraftPattern})(?![\\p{L}\\p{N}])`, 'giu');
const negative = /\b(?:not (?:rated|authorized|authorised|qualified|valid|included)|excluded?|except|prohibited|only|restricted|under supervision|differences)\b/i;
const explicitNoLimit = /^(?:none|no (?:limitations?|restrictions?))\.?$/i;
const nonExpiring = /^(?:does not expire|no expir(?:y|ation)|non[- ]expiring|lifetime)\.?$/i;
const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
const frenchMonths = ['janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin', 'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'decembre'];
const monthNumber = name => {
  const token = name.toLowerCase();
  return months.findIndex((value, index) => value === token || value.slice(0, 3) === token || frenchMonths[index] === token || (index === 8 && token === 'sept')) + 1;
};

function parseCertificateDate(raw) {
  if (!raw) return { value: null, reason: 'MISSING_DATE' };
  const text = raw.normalize('NFKD').replace(/\p{M}/gu, '').trim().replace(/^le\s+/i, '').replace(/(\d)\s+(st|nd|rd|th)\b/gi, '$1$2').replace(/[-\s]+day[-\s]*of[-\s]+/i, ' day of ');
  let year, month, day, match;
  if ((match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text))) [, year, month, day] = match;
  else if ((match = /^(\d{1,2})(?:st|nd|rd|th)?(?: day of)?[\s-]+([a-z]+)\.?[\s,-]+(\d{4})$/i.exec(text))) {
    day = match[1]; month = monthNumber(match[2]); year = match[3];
  } else if ((match = /^([a-z]+)\.?[\s-]+(\d{1,2})(?:st|nd|rd|th)?[\s,-]+(\d{4})$/i.exec(text))) {
    month = monthNumber(match[1]); day = match[2]; year = match[3];
  } else if ((match = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(text))) {
    const a = Number(match[1]), b = Number(match[2]); year = match[3];
    if (a <= 12 && b <= 12 && a !== b) return { value: null, reason: 'AMBIGUOUS_DATE' };
    [month, day] = a > 12 ? [b, a] : [a, b];
  } else return { value: null, reason: 'INVALID_DATE' };
  const value = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
    ? { value, reason: null } : { value: null, reason: 'INVALID_DATE' };
}

function parseCertificateFields(extraction) {
  const evidence = [], warnings = [], aircraftMentions = [], values = Object.fromEntries(Object.keys(fields).map(key => [key, []]));
  const warn = (code, field = null, page = null) => {
    if (!warnings.some(item => item.code === code && item.field === field && item.page === page)) warnings.push({ code, field, page });
  };
  const add = (field, value, page, line, text, method, confidence) => {
    const trimmed = (field === 'holderName' ? value.replace(/^[=<>~|*]+\s*/, '').replace(/\s*[=<>~|*]+$/, '') : value).trim();
    if (!trimmed) return;
    if (trimmed.length > (field === 'holderName' ? namePolicy.maxNameLength : 1000)) { warn('FIELD_TOO_LONG', field, page); return; }
    values[field].push(trimmed);
    evidence.push({ field, value: trimmed, page, line, text: text.slice(0, 1200), method, confidence });
  };
  const detectField = text => {
    // Decorative borders can become punctuation or a lone X before a known label.
    const cleaned = text.replace(/^(?:[=<>~|*\d]+\s*|[xX]\s+(?=has ))/, '')
      .replace(/^\((.*)\)$/, '$1').replace(/^this 1s to /i, 'This is to ')
      .replace(/^is hereby,? awarded\.? to/i, 'Is hereby awarded to');
    return Object.entries(fields).map(([key, pattern]) => ({ key, match: pattern.exec(cleaned) })).find(item => item.match);
  };
  const pages = extraction.pages || [];
  for (const page of pages) {
    if (page.method === 'OCR') {
      if (page.confidence < policy.lowOcrConfidence) warn('LOW_OCR_CONFIDENCE', null, page.page);
      else if (page.confidence < policy.highOcrConfidence) warn('OCR_NEEDS_VERIFICATION', null, page.page);
    }
    const sources = [{ text: page.text, method: page.method, confidence: page.confidence }];
    if (page.alternateText?.trim()) {
      sources.push({ text: page.alternateText, method: 'OCR_ADAPTIVE', confidence: page.alternateConfidence });
      warn('ADDITIONAL_OCR_READING_REQUIRES_REVIEW', null, page.page);
      if (page.alternateConfidence < policy.lowOcrConfidence) warn('LOW_OCR_CONFIDENCE', null, page.page);
    }
    if (page.embeddedText?.trim()) sources.push({ text: page.embeddedText, method: 'PDF_TEXT', confidence: null });
    for (const source of sources) {
      const lines = source.text.split(/\r?\n/).map(line => line.trim());
      const layout = readLayout(lines);
      for (const item of layout.entries) add(item.field, item.value, page.page, item.index + 1, item.text, source.method, source.confidence);
      for (const item of layout.warnings) warn(item.code, item.field, page.page);
      let section = null;
      for (let index = 0; index < lines.length; index++) {
        const line = lines[index], found = layout.handled.has(index) ? null : detectField(line);
        if (!line) { section = null; continue; }
        if (layout.handled.has(index)) { section = null; }
        else if (found) {
          section = ['aircraftRatings', 'qualifications', 'taskAuthorizations', 'limitations'].includes(found.key) ? found.key : null;
          let value = found.match[1], evidenceLine = line;
          // French translations following an English recipient label are labels,
          // not a person's name. Preserve the full bilingual line as evidence.
          if (found.key === 'holderName') value = value.replace(/\s*\/\s*Ce certificat\b.*$/i, '').trim();
          if (!value) {
            let next = index + 1;
            while (next < lines.length && (!lines[next] || (found.key === 'qualifications' && !/[\p{L}]{3}/u.test(lines[next])))) next++;
            const nextLine = lines[next];
            if (nextLine && !detectField(nextLine) && !/^certificate\b/i.test(nextLine)) {
              value = nextLine; evidenceLine += `\n${value}`;
            }
          }
          if (found.key === 'holderName' && !plausibleName(value)) {
            warn('HOLDER_LABEL_WITHOUT_READABLE_NAME', 'holderName', page.page);
          } else if (!found.match[1] && ['issueDate', 'expiryDate'].includes(found.key) && value && !parseCertificateDate(value).value && !(found.key === 'expiryDate' && nonExpiring.test(value))) {
            warn('UNREADABLE_DATE_REQUIRES_REVIEW', found.key, page.page);
          } else add(found.key, value, page.page, index + 1, evidenceLine, source.method, source.confidence);
        } else if (/^certificate of (?:training|completion|competenc[ey]|recognition|qualification|achievement)\b/i.test(line)) {
          section = null;
          add('certificateType', line, page.page, index + 1, line, source.method, source.confidence);
        } else {
          const holder = /^this (?:is to )?certif(?:ies|y) that\s+(.+?)(?:\s+has (?:successfully )?(?:completed|attended|passed).*)?$/i.exec(line);
          if (holder) add('holderName', holder[1], page.page, index + 1, line, source.method, source.confidence);
          else if (section) add(section, line.replace(/^[-*•]\s*/, ''), page.page, index + 1, line, source.method, source.confidence);
        }
        if (found?.key !== 'aircraftRatings' && section !== 'aircraftRatings') {
          for (const mention of line.matchAll(aircraftRegex())) {
            aircraftMentions.push({ original: mention[0], normalized: normalizeAircraft(mention[0]), page: page.page, line: index + 1,
              text: line, method: source.method, confidence: source.confidence });
            warn('AIRCRAFT_MENTION_OUTSIDE_RATING_FIELD', 'aircraftRatings', page.page);
          }
        }
        if (negative.test(line)) {
          add('limitations', line, page.page, index + 1, line, source.method, source.confidence);
          warn('RESTRICTION_REQUIRES_REVIEW', 'limitations', page.page);
        }
      }
    }
  }
  for (const key of Object.keys(values)) values[key] = [...new Set(values[key])];
  const single = field => {
    // Ignore punctuation/case only when comparing names. Do not merge different
    // letters, initials, suffixes or word orders across OCR readings.
    const unique = [...new Set(values[field].map(value => field === 'holderName'
      ? value.toLowerCase().replace(/[.,]/g, '').replace(/\s+/g, ' ').trim()
      : ['issueDate', 'expiryDate'].includes(field) ? parseCertificateDate(value).value || value.toLowerCase() : value.toLowerCase()))];
    if (unique.length > 1) { warn('CONFLICTING_VALUES', field); return null; }
    return values[field][0] || null;
  };
  const holderName = single('holderName');
  const dates = {};
  for (const field of ['issueDate', 'expiryDate']) {
    const raw = single(field);
    const parsed = field === 'expiryDate' && raw && nonExpiring.test(raw) ? { value: null, reason: null } : parseCertificateDate(raw);
    dates[field] = parsed.value;
    if (parsed.reason) warn(parsed.reason, field);
  }
  const expiry = single('expiryDate');
  const doesNotExpire = Boolean(expiry && nonExpiring.test(expiry));
  if (dates.issueDate && dates.expiryDate && dates.issueDate > dates.expiryDate) warn('REVERSED_DATES', 'expiryDate');
  const aircraftRatings = [], unknownAircraftRatings = [], normalization = [];
  for (const raw of values.aircraftRatings) {
    if (negative.test(raw)) { warn('RESTRICTED_AIRCRAFT_TEXT', 'aircraftRatings'); continue; }
    for (const found of raw.matchAll(aircraftRegex())) {
      const normalized = normalizeAircraft(found[0]);
      if (normalized) { aircraftRatings.push(normalized); normalization.push({ field: 'aircraftRatings', original: found[0], normalized }); }
    }
    const remainder = raw.replace(aircraftRegex(), '').replace(/\b(?:and|or)\b/gi, '').replace(/[,;&/+()]/g, ' ').trim();
    if (remainder) { unknownAircraftRatings.push(remainder); warn('UNKNOWN_AIRCRAFT', 'aircraftRatings'); }
  }
  const limitations = values.limitations.filter(value => !explicitNoLimit.test(value));
  if (!holderName) warn('HOLDER_NAME_REQUIRES_REVIEW', 'holderName');
  if (!aircraftRatings.length) warn('NO_RECOGNIZED_AIRCRAFT_RATING', 'aircraftRatings');
  if (!values.certificateType.length && !values.certificateNumber.length) warn('CERTIFICATE_TYPE_UNCERTAIN', 'certificateType');
  if (!extraction.rawText?.trim()) warn('NO_READABLE_TEXT');
  const ocrPages = pages.filter(page => page.method === 'OCR');
  const confidence = ocrPages.length ? Math.min(...ocrPages.flatMap(page => [page.confidence ?? 0, ...(page.alternateText ? [page.alternateConfidence ?? 0] : [])])) : null;
  return {
    certificateType: single('certificateType'), holderName, certificateNumber: single('certificateNumber'), issuingAuthority: single('issuingAuthority'),
    ...dates, doesNotExpire, aircraftRatings: [...new Set(aircraftRatings)], unknownAircraftRatings: [...new Set(unknownAircraftRatings)],
    qualifications: values.qualifications, taskAuthorizations: values.taskAuthorizations, limitations,
    rawText: extraction.rawText, originalExtractedFields: values, normalization, evidence, aircraftMentions,
    confidence, confidenceMeaning: 'MINIMUM_PAGE_OCR_SCORE_NOT_IDENTITY_OR_ELIGIBILITY', warnings,
    requiresManualReview: true, parserVersion: policy.version,
  };
}

module.exports = { parseCertificateDate, parseCertificateFields };
