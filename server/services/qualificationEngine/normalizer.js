const aliases = require('./aircraftAliases.json');

// Match complete approved labels only (including the AS350B3/B3e policy group).
// Never infer an unconfigured variant from a family name or OCR typo.
const aircraftKey = value => typeof value === 'string'
  ? value.normalize('NFKC').trim().toUpperCase().replace(/[\s-]+/g, '')
  : '';
const aliasIndex = new Map();
for (const [canonical, labels] of Object.entries(aliases)) {
  for (const label of [canonical, ...labels]) {
    const key = aircraftKey(label);
    if (aliasIndex.has(key) && aliasIndex.get(key) !== canonical) {
      throw new Error(`Conflicting aircraft alias: ${label}`);
    }
    aliasIndex.set(key, canonical);
  }
}

const normalizeAircraft = value => aliasIndex.get(aircraftKey(value)) || null;
const normalizeId = value => {
  if (typeof value === 'string') return value.trim();
  // Support Mongo ObjectIds without accepting arbitrary objects as identities.
  if (value && typeof value.toHexString === 'function') return String(value.toHexString()).trim();
  return '';
};

function normalizeCertificate(certificate = {}) {
  const values = Array.isArray(certificate.aircraftRatings) ? certificate.aircraftRatings : [];
  const normalization = values.map(original => ({ original, normalized: normalizeAircraft(original) }));
  return {
    certificateId: normalizeId(certificate.id || certificate._id),
    personnelId: normalizeId(certificate.personnelId),
    aircraftRatings: [...new Set(normalization.map(item => item.normalized).filter(Boolean))],
    unknownAircraftRatings: normalization.filter(item => !item.normalized).map(item => item.original),
    normalization,
    status: typeof certificate.status === 'string' ? certificate.status.trim().toUpperCase() : '',
  };
}

module.exports = { normalizeAircraft, normalizeCertificate, normalizeId };
