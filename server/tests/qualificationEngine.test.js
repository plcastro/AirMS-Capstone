const test = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeAircraft,
  normalizeCertificate,
  buildQualificationProfile,
  evaluateQualification,
} = require('../services/qualificationEngine');

const personnelData = { id: 'mechanic-1', jobTitle: 'Mechanic' };
const asOf = '2026-09-28';
const certificate = (changes = {}) => ({
  id: 'certificate-1', personnelId: personnelData.id,
  status: 'VERIFIED', reviewedBy: 'reviewer-1', reviewedAt: '2026-09-20T10:00:00Z',
  issueDate: '2026-01-01', expiryDate: '2027-05-20',
  aircraftRatings: ['AS350B3'], limitations: [],
  ...changes,
});
const evaluate = (certificates = [certificate()], changes = {}) => evaluateQualification({
  personnelData, certificates, asOf, aircraftType: 'AS350B3', ...changes,
});

test('every configured aircraft alias normalizes to its approved qualification group', () => {
  const aliases = require('../services/qualificationEngine/aircraftAliases.json');
  for (const [canonical, names] of Object.entries(aliases)) {
    for (const name of names) assert.equal(normalizeAircraft(` ${name.toLowerCase()} `), canonical);
  }
  for (const unknown of ['B412', 'Bell 412', 'AS350', 'B412 EF', 'AS350B2', 'Not AS350B3', '', null, {}]) {
    assert.equal(normalizeAircraft(unknown), null);
  }
});

test('valid certificates grant all tasks for either aircraft without task-specific rules', () => {
  for (const aircraftType of ['AS350B3', 'B412EP']) {
    for (const task of ['Airframe Inspection', 'Engine Maintenance', 'Custom maintenance task', null]) {
      const result = evaluate([certificate({ aircraftRatings: [aircraftType] })], { aircraftType, task });
      assert.equal(result.decision, 'QUALIFIED');
      assert.equal(result.qualified, true);
      assert.equal(result.allTasksAllowed, true);
      assert.equal(result.permittedTaskScope, 'ALL_TASKS');
      assert.equal(result.requiresManualReview, false);
      assert.equal(result.task, task);
      assert.deepEqual(result.sourceCertificates, ['certificate-1']);
      assert.deepEqual(result.failedRules, []);
      assert.equal(result.validThrough, '2027-05-20');
      assert.equal(result.evaluatedAsOf, asOf);
      assert.equal(result.ruleVersion, '1.1.0');
    }
  }
});

test('approved AS350B3 coverage includes AS350B3e with the same review and validity requirements', () => {
  assert.equal(evaluate(undefined, { aircraftType: 'AS350B3e' }).allTasksAllowed, true);
  assert.equal(evaluate([certificate({ aircraftRatings: ['AS350 B3e'] })]).qualified, true);
  for (const changes of [{ status: 'PENDING_REVIEW' }, { status: 'REVOKED' }, { expiryDate: '2025-01-01' }, { limitations: ['Inspection only'] }]) {
    assert.equal(evaluate([certificate(changes)], { aircraftType: 'AS350B3e' }).qualified, false);
  }
  assert.equal(evaluate(undefined, { aircraftType: 'AS350B2' }).qualified, false);
});

test('a certificate with both aircraft covers both but never an unknown aircraft', () => {
  const certificates = [certificate({ aircraftRatings: ['Bell 412 EP', 'Eurocopter AS350 B3'] })];
  for (const aircraftType of ['AS350B3', 'B412EP']) assert.equal(evaluate(certificates, { aircraftType }).qualified, true);
  const unknown = evaluate(certificates, { aircraftType: 'B412 EF' });
  assert.equal(unknown.decision, 'NEEDS_REVIEW');
  assert.equal(unknown.allTasksAllowed, false);
});

test('eligibility is scoped to the certificate holder and mechanic role', () => {
  assert.equal(evaluate([certificate({ personnelId: 'someone-else' })]).qualified, false);
  assert.equal(evaluate([], { personnelData: {} }).qualified, false);
  for (const jobTitle of ['Pilot', 'Maintenance Manager', 'Superadmin', '']) {
    assert.equal(evaluate(undefined, { personnelData: { ...personnelData, jobTitle } }).qualified, false);
  }
  assert.equal(evaluate([certificate({ aircraftRatings: ['B412EP'] })]).qualified, false);
});

test('no certificate or rating cannot grant eligibility', () => {
  assert.equal(evaluate([]).decision, 'NOT_QUALIFIED');
  for (const aircraftRatings of [[], undefined, 'AS350B3', [null], ['B412 EF']]) {
    assert.equal(evaluate([certificate({ aircraftRatings })]).qualified, false);
  }
});

test('unverified sources never qualify, regardless of OCR confidence', () => {
  for (const status of ['PENDING_REVIEW', 'REJECTED', '', undefined]) {
    const result = evaluate([certificate({ status, confidence: 1 })]);
    assert.equal(result.qualified, false);
    assert.deepEqual(result.sourceCertificates, []);
  }
  assert.equal(evaluate([certificate({ status: 'PENDING_REVIEW' })]).decision, 'NEEDS_REVIEW');
  assert.equal(evaluate([certificate({ status: 'REJECTED' })]).decision, 'NOT_QUALIFIED');
});

test('human-verified low-confidence extraction is eligible; outstanding review still blocks', () => {
  assert.equal(evaluate([certificate({ confidence: 0.2 })]).qualified, true);
  const result = evaluate([certificate({ confidence: 0.99, requiresManualReview: true })]);
  assert.equal(result.decision, 'NEEDS_REVIEW');
  assert.equal(result.qualified, false);
});

test('verification requires reviewer evidence and a source ID', () => {
  for (const changes of [{ reviewedBy: '' }, { reviewedAt: null }, { reviewedAt: 'bad date' },
    { reviewedAt: '2026-02-30T10:00:00Z' }, { reviewedAt: '2026-10-01T10:00:00Z' },
    { id: '' }, { id: {} }, { reviewedBy: {} }, { reviewedBy: true }]) {
    assert.equal(evaluate([certificate(changes)]).decision, 'NEEDS_REVIEW');
  }
});

test('expiry date is inclusive and eligibility ends on the following business date', () => {
  const certificates = [certificate({ expiryDate: asOf })];
  assert.equal(evaluate(certificates).qualified, true);
  const result = evaluate(certificates, { asOf: '2026-09-29' });
  assert.equal(result.decision, 'NOT_QUALIFIED');
  assert.deepEqual(result.expiredCertificateIds, ['certificate-1']);
  assert.ok(result.certificateChecks.some(check => check.code === 'EXPIRY_DATE' && !check.passed));
  assert.ok(result.failedRules.some(reason => reason.includes('expired')));
});

test('revoked and expired status override a future expiry date', () => {
  for (const changes of [{ status: 'REVOKED' }, { revokedAt: '2026-09-27T00:00:00Z' }, { status: 'EXPIRED' }]) {
    assert.equal(evaluate([certificate(changes)]).decision, 'NOT_QUALIFIED');
  }
});

test('missing expiry requires review; non-expiring evidence must be explicit', () => {
  assert.equal(evaluate([certificate({ expiryDate: null })]).decision, 'NEEDS_REVIEW');
  const unlimited = evaluate([certificate({ expiryDate: null, doesNotExpire: true })]);
  assert.equal(unlimited.qualified, true);
  assert.equal(unlimited.validThrough, null);
  assert.equal(evaluate([certificate({ doesNotExpire: true })]).decision, 'NEEDS_REVIEW');
});

test('invalid, ambiguous, reversed and future certificate dates cannot qualify', () => {
  for (const changes of [{ expiryDate: '2027-02-30' }, { expiryDate: '05/06/2027' },
    { issueDate: 'invalid' }, { issueDate: '2027-01-01' },
    { issueDate: '2026-08-01', expiryDate: '2026-07-01' }]) {
    assert.equal(evaluate([certificate(changes)]).qualified, false);
  }
});

test('limitations and ambiguous ratings require review instead of unrestricted access', () => {
  for (const changes of [{ limitations: ['Airframe tasks only'] }, { limitations: 'unknown' },
    { aircraftRatings: ['AS350B3', 'B412 EF'] }]) {
    const result = evaluate([certificate(changes)]);
    assert.equal(result.decision, 'NEEDS_REVIEW');
    assert.equal(result.allTasksAllowed, false);
  }
});

test('a current verified restriction cannot be bypassed by another certificate', () => {
  const restricted = certificate({ id: 'restricted', limitations: ['No engine work'] });
  const result = evaluate([certificate(), restricted]);
  assert.equal(result.qualified, false);
  assert.equal(result.decision, 'NEEDS_REVIEW');
  assert.deepEqual(result.restrictions, [{ certificateId: 'restricted', limitation: 'No engine work' }]);
  assert.equal(evaluate([certificate(), { ...restricted, aircraftRatings: ['B412EP'] }]).qualified, true);
  for (const changes of [{ status: 'REJECTED' }, { status: 'REVOKED' }, { expiryDate: '2026-08-01' }]) {
    assert.equal(evaluate([certificate(), { ...restricted, ...changes }]).qualified, true);
  }
});

test('profiles aggregate only verified valid sources, with per-certificate provenance', () => {
  const certificates = [certificate(), certificate({ id: 'bell', aircraftRatings: ['Bell 412EP'] }),
    certificate({ id: 'pending', status: 'PENDING_REVIEW' }),
    certificate({ id: 'expired', expiryDate: '2026-08-01' }),
    certificate({ id: 'foreign', personnelId: 'other' })];
  const profile = buildQualificationProfile({ personnelData, certificates, asOf });
  assert.deepEqual(profile.aircraftRatings, ['AS350B3', 'B412EP']);
  assert.deepEqual(profile.sourceCertificates.map(source => source.certificateId), ['bell', 'certificate-1']);
  assert.equal(profile.certificateAssessments.length, 5);
  assert.deepEqual(evaluate(certificates, { aircraftType: 'B412EP' }).sourceCertificates, ['bell']);
});

test('expiry removes only the affected aircraft eligibility; another valid source can retain it', () => {
  const certificates = [certificate({ expiryDate: '2026-09-28' }),
    certificate({ id: 'bell', aircraftRatings: ['B412EP'] })];
  const nextDay = { asOf: '2026-09-29' };
  assert.equal(evaluate(certificates, nextDay).qualified, false);
  assert.equal(evaluate(certificates, { ...nextDay, aircraftType: 'B412EP' }).qualified, true);
  certificates.push(certificate({ id: 'renewal', expiryDate: '2028-01-01' }));
  const renewed = evaluate(certificates, nextDay);
  assert.equal(renewed.qualified, true);
  assert.deepEqual(renewed.sourceCertificates, ['renewal']);
  assert.equal(renewed.validThrough, '2028-01-01');
});

test('corrected aircraft facts qualify only after verification', () => {
  const raw = certificate({ aircraftRatings: ['B412 EF'], status: 'PENDING_REVIEW' });
  assert.equal(evaluate([raw], { aircraftType: 'B412EP' }).qualified, false);
  const corrected = { ...raw, aircraftRatings: ['B412EP'] };
  assert.equal(evaluate([corrected], { aircraftType: 'B412EP' }).qualified, false);
  const verified = { ...corrected, status: 'VERIFIED' };
  const result = evaluate([verified], { aircraftType: 'Bell 412 EP' });
  assert.equal(result.qualified, true);
  assert.equal(raw.aircraftRatings[0], 'B412 EF');
});

test('duplicate source IDs cannot silently combine conflicting certificate revisions', () => {
  assert.equal(evaluate([certificate(), certificate({ status: 'REVOKED' })]).qualified, false);
  assert.ok(evaluate([certificate(), certificate()]).certificateChecks.some(check => check.code === 'UNIQUE_SOURCE' && !check.passed));
});

test('normalization retains unknown labels and records canonical mappings', () => {
  const result = normalizeCertificate(certificate({ aircraftRatings: ['Bell 412 EP', 'B412EP', 'B412 EF'] }));
  assert.deepEqual(result.aircraftRatings, ['B412EP']);
  assert.deepEqual(result.unknownAircraftRatings, ['B412 EF']);
  assert.deepEqual(result.normalization[0], { original: 'Bell 412 EP', normalized: 'B412EP' });
});

test('evaluation is deterministic, order-independent for distinct sources, and does not mutate inputs', () => {
  const first = certificate();
  const second = certificate({ id: 'certificate-2', expiryDate: '2028-01-01' });
  const input = [first, second];
  const before = JSON.stringify(input);
  const result = evaluate(input);
  assert.deepEqual(evaluate(input), result);
  assert.deepEqual(evaluate([...input].reverse()), result);
  assert.equal(JSON.stringify(input), before);
});

test('evaluation requires an explicit real business date and well-formed input list', () => {
  for (const invalid of [undefined, null, '', '2026-02-30', '09/28/2026', '2026-09-28T00:00:00Z']) {
    assert.throws(() => evaluate(undefined, { asOf: invalid }), /asOf/);
  }
  for (const invalid of [null, {}, [null], ['certificate']]) {
    assert.throws(() => evaluate(invalid), /certificates/);
  }
});
