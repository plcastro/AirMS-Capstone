const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { once } = require('node:events');
const { matchCertificateHolder } = require('../services/certificates/certificateHolderMatcher');
const { createCertificateHolderMatchService } = require('../services/certificates/certificateHolderMatchService');
const { createCertificateController } = require('../controllers/certificateController');
const { createCertificateRouter } = require('../routes/certificateRoute');

const owner = '111111111111111111111111', other = '222222222222222222222222';
const mechanic = (changes = {}) => ({ _id: owner, firstName: 'Juan', lastName: 'Dela Cruz', ...changes });
const match = (name, people = [mechanic()]) => matchCertificateHolder(name, people);

test('holder matching handles formatting, accents, middle initials and surname-first order', () => {
  for (const name of ['Juan Dela Cruz', 'JUÁN   DELA-CRUZ', 'Mr. Juan Dela Cruz', 'Juan P. Dela Cruz', 'Dela Cruz, Juan', 'Dela Cruz Juan P.']) {
    const result = match(name);
    assert.equal(result.status, 'LIKELY_MATCH', name);
    assert.equal(result.suggestedPersonnelId, owner);
    assert.equal(result.requiresConfirmation, true);
    assert.equal(result.scoreMeaning, 'NAME_SIMILARITY_NOT_IDENTITY_PROBABILITY');
  }
});

test('small spelling errors produce ranked suggestions without asserting ownership', () => {
  const result = match('Juan Dela Crzu');
  assert.equal(result.status, 'LIKELY_MATCH');
  assert.ok(result.candidates[0].score < 1);
  assert.ok(result.candidates[0].reasons.includes('SIMILAR_SPELLING'));
  assert.equal(result.personnelId, undefined);
  assert.equal(result.qualified, undefined);
  const transposed = match('Jhon Smith', [mechanic({ firstName: 'John', lastName: 'Smith' })]);
  assert.equal(transposed.status, 'POSSIBLE_MATCH');
  assert.equal(transposed.suggestedPersonnelId, null);
});

test('duplicate names and close competing matches require a choice', () => {
  for (const people of [[mechanic(), mechanic({ _id: other })], [mechanic(), mechanic({ _id: other, firstName: 'Juana' })]]) {
    const result = match('Juan Dela Cruz', people);
    if (people[1].firstName === 'Juan') assert.equal(result.status, 'AMBIGUOUS');
    else assert.equal(result.status, 'LIKELY_MATCH');
    assert.deepEqual(match('Juan Dela Cruz', [...people].reverse()), result);
  }
  const close = match('Christopher Santos', [mechanic({ firstName: 'Christopher', lastName: 'Santos' }), mechanic({ _id: other, firstName: 'Christofer', lastName: 'Santos' })]);
  // Identical surnames alone cannot make a substantially different given name a tie.
  assert.equal(close.candidates.length, 2);
  const tied = match('Christopher Santos', [mechanic({ firstName: 'Christopher', lastName: 'Santos' }), mechanic({ _id: other, firstName: 'Christophe', lastName: 'Santos' })]);
  assert.equal(tied.status, 'AMBIGUOUS');
  assert.equal(tied.suggestedPersonnelId, null);
});

test('initials, short surname typos, missing names and unrelated names cannot yield a likely match', () => {
  for (const name of ['J. Dela Cruz', 'Juan', 'Dela Cruz', '', 'Ramon Santos', 'a'.repeat(161)]) {
    assert.notEqual(match(name).status, 'LIKELY_MATCH', name);
    assert.equal(match(name).suggestedPersonnelId, null);
  }
  assert.equal(match('J. Dela Cruz').status, 'POSSIBLE_MATCH');
  assert.notEqual(match('Michael Ly', [mechanic({ firstName: 'Michael', lastName: 'Lee' })]).status, 'LIKELY_MATCH');
  assert.notEqual(match('Juan Miguel Santos', [mechanic({ firstName: 'Juan Carlos', lastName: 'Santos' })]).status, 'LIKELY_MATCH');
  assert.equal(match('Juan Dela Cruz', []).status, 'NO_MATCH');
});

test('name matching preserves source data and distinguishes different compound surnames', () => {
  const people = [mechanic({ lastName: "O'Connor" })], before = structuredClone(people);
  assert.equal(match('Juan OConnor', people).status, 'LIKELY_MATCH');
  assert.deepEqual(people, before);
  assert.notEqual(match('Juan Del Rosario').status, 'LIKELY_MATCH');
});

test('military rank and service labels do not hide a name match or change the source', () => {
  for (const name of ['SGT Juan P. Dela Cruz 123456 PAF', 'A2C Juan Dela Cruz 123456-PAF']) {
    const result = match(name);
    assert.equal(result.status, 'LIKELY_MATCH');
    assert.equal(result.holderName, name);
    assert.equal(result.requiresConfirmation, true);
  }
});

test('generational suffix position is flexible but missing or conflicting suffixes cannot yield a likely match', () => {
  const junior = mechanic({ lastName: 'Dela Cruz Jr.' });
  for (const name of ['Juan Jr. P. Dela Cruz', 'Juan P. Dela Cruz Jr.', 'Dela Cruz, Juan Jr.']) {
    assert.equal(match(name, [junior]).status, 'LIKELY_MATCH');
  }
  assert.equal(match('Juan Dela Cruz Sr.', [junior]).status, 'NO_MATCH');
  assert.equal(match('Juan Dela Cruz', [junior]).status, 'POSSIBLE_MATCH');
  assert.equal(match('Juan Dela Cruz Jr.').status, 'POSSIBLE_MATCH');
  assert.equal(match('Juan Dela Cruz Jr.', [junior, mechanic({ _id: other })]).suggestedPersonnelId, owner);
});

test('directory matching selects only mechanic names and restricts mechanics to their own profile', async () => {
  const calls = [];
  const matchHolder = createCertificateHolderMatchService({ users: {
    find: filter => { calls.push(filter); return { select: fields => {
      assert.equal(fields, '_id firstName lastName');
      return { lean: async () => [mechanic()] };
    } }; },
  } });
  for (const jobTitle of ['Maintenance Manager', 'Admin Staff', 'Mechanic']) {
    const result = await matchHolder({ user: { id: owner, jobTitle } }, 'Juan Dela Cruz');
    assert.equal(result.comparisonScope, jobTitle === 'Mechanic' ? 'OWN_PROFILE' : 'MECHANIC_DIRECTORY');
    assert.deepEqual(calls.at(-1), jobTitle === 'Mechanic' ? { jobTitle: 'Mechanic', _id: owner } : { jobTitle: 'Mechanic' });
  }
  const count = calls.length;
  await assert.rejects(matchHolder({ user: { id: owner, jobTitle: 'Pilot' } }, 'Juan Dela Cruz'), error => error.status === 403);
  await assert.rejects(matchHolder({}, 'Juan Dela Cruz'), error => error.status === 403);
  for (const name of ['', {}, 'a'.repeat(161)]) await assert.rejects(matchHolder({ user: { id: owner, jobTitle: 'Mechanic' } }, name), error => error.status === 400);
  assert.equal(calls.length, count);
});

test('holder matching HTTP endpoint returns private suggestions without saving a certificate', async t => {
  const matchHolder = createCertificateHolderMatchService({ users: { find: () => ({ select: () => ({ lean: async () => [mechanic()] }) }) } });
  const app = express();
  app.use('/api/certificates', createCertificateRouter({
    authenticate: (req, res, next) => { req.user = { id: owner, jobTitle: req.headers['test-role'] || 'Maintenance Manager' }; next(); },
    controller: createCertificateController({}, matchHolder),
  }));
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }));
  const url = `http://127.0.0.1:${server.address().port}/api/certificates/match-holder`;
  const post = (body, headers = {}) => fetch(url, { method: 'POST', body, headers: { 'content-type': 'application/json', ...headers } });
  const response = await post(JSON.stringify({ holderName: 'Juan Dela Crzu' }));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  assert.equal((await response.json()).data.status, 'LIKELY_MATCH');
  assert.equal((await post('{')).status, 400);
  assert.equal((await post(JSON.stringify({ holderName: 'x'.repeat(3000) }))).status, 413);
  assert.equal((await post(JSON.stringify({ holderName: 'Juan Dela Cruz' }), { 'test-role': 'Pilot' })).status, 403);
});
