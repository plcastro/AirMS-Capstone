const test = require('node:test');
const assert = require('node:assert/strict');
const { appleAssociation, androidAssociation } = require('../utils/mobileLinkAssociation');

test('Apple association accepts only a valid team ID and scopes app links', () => {
  assert.equal(appleAssociation('unknown'), null);
  const result = appleAssociation('ABCDE12345');
  assert.equal(result.applinks.details[0].appID, 'ABCDE12345.com.arckexe.airms');
  assert.ok(result.applinks.details[0].paths.includes('/dashboard/*'));
});

test('Android association accepts release certificate SHA-256 fingerprints', () => {
  assert.equal(androidAssociation('invalid'), null);
  const fingerprint = Array(32).fill('AB').join(':');
  const result = androidAssociation(fingerprint);
  assert.deepEqual(result[0].target.sha256_cert_fingerprints, [fingerprint]);
  assert.equal(result[0].target.package_name, 'com.arckexe.airms');
});
