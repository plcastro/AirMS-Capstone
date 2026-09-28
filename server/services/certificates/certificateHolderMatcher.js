const policy = require('../../config/certificateNameMatching');

const normalizeName = value => typeof value === 'string'
  ? value.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase()
    .replace(/['’]/g, '').replace(/[^\p{L}\s]/gu, ' ').trim().replace(/\s+/g, ' ')
  : '';
const tokens = value => normalizeName(value).split(' ').filter(Boolean);
const suffixes = new Set(['jr', 'sr', 'ii', 'iii', 'iv']);
const nameParts = value => {
  const parts = tokens(value);
  return { parts: parts.filter(part => !suffixes.has(part)), suffix: parts.filter(part => suffixes.has(part)).join(' ') };
};

// Edit distance includes adjacent transpositions (e.g. Jhon / John).
function similarity(a, b) {
  if (a === b) return 1;
  if (!a || !b) return 0;
  const matrix = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) {
    matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) matrix[i][j] = Math.min(matrix[i][j], matrix[i - 2][j - 2] + 1);
  }
  return 1 - matrix[a.length][b.length] / Math.max(a.length, b.length);
}

function scoreOrder(parts, first, last) {
  if (parts.length < last.length + 1) return null;
  const surname = parts.slice(-last.length), given = parts.slice(0, -last.length);
  if (given.length < first.length || given.length > first.length + 2) return null;
  const lastScore = similarity(surname.join(' '), last.join(' '));
  if (lastScore < 0.65) return null;
  let initials = false;
  const givenScores = first.map((word, i) => {
    if (word.length === 1 || given[i].length === 1) {
      initials = true;
      return word[0] === given[i][0] ? 0.65 : 0;
    }
    return similarity(word, given[i]);
  });
  if (givenScores.some(score => score < 0.60)) return null;
  const firstScore = givenScores.reduce((sum, score) => sum + score, 0) / first.length;
  const extraMiddle = given.length > first.length;
  let score = 0.45 * firstScore + 0.55 * lastScore - (extraMiddle ? 0.02 : 0);
  // A short surname typo or abbreviated given name is never a strong identity suggestion.
  if (initials || (last.join('').length <= 3 && lastScore < 1)) score = Math.min(score, 0.84);
  const reasons = [];
  if (firstScore === 1 && lastScore === 1) reasons.push('FIRST_AND_LAST_NAME_MATCH');
  else reasons.push('SIMILAR_SPELLING');
  if (initials) reasons.push('GIVEN_NAME_INITIAL_ONLY');
  if (extraMiddle) reasons.push('ADDITIONAL_MIDDLE_NAME_OR_INITIAL');
  return { score, reasons };
}

function matchCertificateHolder(holderName, mechanics) {
  const result = { holderName, status: 'NO_MATCH', suggestedPersonnelId: null, requiresConfirmation: true,
    scoreMeaning: 'NAME_SIMILARITY_NOT_IDENTITY_PROBABILITY', ruleVersion: policy.version, candidates: [] };
  if (typeof holderName !== 'string' || holderName.length > policy.maxNameLength) return result;
  // Rank/service labels are formatting, not part of the personal name. Keep the
  // original holderName in the result and never use the service number as identity.
  const comparisonName = holderName.replace(/^(?:A[12]C|SGT|SSGT|TSGT|MSGT)\.?\s+/i, '')
    .replace(/\s+\d{5,}\s*[-:]?\s*PAF\s*$/i, '');
  const { parts, suffix } = nameParts(comparisonName);
  while (['mr', 'mrs', 'ms', 'miss', 'dr', 'engr'].includes(parts[0])) parts.shift();
  if (parts.length < 2 || parts.length > policy.maxTokens) return result;
  const matches = new Map();
  for (const mechanic of mechanics) {
    const givenName = nameParts(mechanic.firstName), surname = nameParts(mechanic.lastName);
    const first = givenName.parts, last = surname.parts;
    const candidateSuffix = [givenName.suffix, surname.suffix].filter(Boolean).join(' ');
    if (suffix && candidateSuffix && suffix !== candidateSuffix) continue;
    const personnelId = String(mechanic._id || mechanic.id || '');
    if (!personnelId || !first.length || !last.length || normalizeName(`${mechanic.firstName} ${mechanic.lastName}`).length > policy.maxNameLength) continue;
    // Last-name-first documents may use commas or just spaces.
    const orders = [parts, [...parts.slice(last.length), ...parts.slice(0, last.length)]];
    const scored = orders.map(order => scoreOrder(order, first, last)).filter(Boolean).sort((a, b) => b.score - a.score)[0];
    if (scored && suffix !== candidateSuffix) {
      scored.score = Math.min(scored.score, 0.84);
      scored.reasons.push('GENERATIONAL_SUFFIX_REQUIRES_CONFIRMATION');
    }
    if (!scored || scored.score < policy.minimumScore) continue;
    const previous = matches.get(personnelId);
    if (!previous || previous.score < scored.score) matches.set(personnelId, {
      personnelId, name: `${mechanic.firstName} ${mechanic.lastName}`, ...scored,
    });
  }
  const ranked = [...matches.values()].sort((a, b) => b.score - a.score || a.personnelId.localeCompare(b.personnelId));
  if (!ranked.length) return result;
  const ambiguous = ranked.length > 1 && ranked[0].score - ranked[1].score < policy.ambiguityGap;
  result.status = ambiguous ? 'AMBIGUOUS' : ranked[0].score >= policy.likelyScore ? 'LIKELY_MATCH' : 'POSSIBLE_MATCH';
  if (result.status === 'LIKELY_MATCH') result.suggestedPersonnelId = ranked[0].personnelId;
  result.candidates = ranked.slice(0, policy.maxCandidates).map(candidate => ({ ...candidate, score: Math.round(candidate.score * 1000) / 1000 }));
  return result;
}

module.exports = { normalizeName, matchCertificateHolder };
