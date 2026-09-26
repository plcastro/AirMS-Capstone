const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { fail } = require('../utils/flightWorkflowRules');

const id = '000000000000000000000001';
function signerHarness() {
  const user = { status: 'active', jobTitle: 'Pilot', pin: 'hashed', firstName: 'Actual', lastName: 'Pilot', licenseNo: 'LIC-1' };
  const dependencies = {
    bcrypt: { compare: async value => value === '123456' },
    '../models/userModel': { findById: () => ({ select: async () => user }) },
    './flightWorkflowRules': { fail },
  };
  const file = path.join(__dirname, '../utils/flightWorkflowSigning.js'), module = { exports: {} };
  vm.compileFunction(fs.readFileSync(file, 'utf8'), ['require', 'module', 'exports'], { filename: file })(name => {
    assert.ok(Object.hasOwn(dependencies, name), `Unexpected signing dependency: ${name}`);
    return dependencies[name];
  }, module, module.exports);
  const sign = (body = {}, actor = {}, scope = 'accept') => module.exports.verifyWorkflowSigner({ user: { id, jobTitle: 'Pilot', ...actor }, body: { pin: '123456', signature: 'data:image/png;base64,iVBORw0KGgo=', name: 'Forged client name', licenseNo: 'Fake license', ...body } }, { rpc: 'RP-C1234' }, scope);
  return { sign, user };
}

test('final certification verifies the PIN on the server and records the database signer identity', async () => {
  const h = signerHarness(), signature = await h.sign();
  assert.equal(signature.name, 'Actual Pilot'); assert.equal(signature.licenseNo, 'LIC-1');
  assert.equal(signature.userId, id);
  for (const key of ['authorizationId', 'authorizationReference', 'licenseType']) assert.equal(Object.hasOwn(signature, key), false);
  assert.equal(signature.pin, undefined);
  await assert.rejects(h.sign({ pin: '999999' }), /Incorrect signing PIN/);
  await assert.rejects(h.sign({ signature: '' }), /Draw your signature/);
});

test('every signing scope works without a crew authorization record or account license prerequisite', async () => {
  for (const jobTitle of ['Mechanic', 'Pilot']) {
    const h = signerHarness();
    h.user.jobTitle = jobTitle;
    delete h.user.licenseNo;
    for (const scope of ['pre_confirmed_all', 'pre_released', 'pre_completed', 'post_confirmed_all', 'post_completed', 'release', 'accept', 'submit', 'complete', 'monitoring_reconciliation', 'amendment', 'defect_rectified', 'defect_deferred']) {
      const signed = await h.sign({}, { jobTitle }, scope);
      assert.equal(signed.userId, id);
      assert.equal(signed.title, jobTitle);
      assert.equal(signed.licenseNo, '');
      assert.equal(signed.scope, scope);
    }
  }
});

test('inactive accounts cannot sign even with the correct PIN', async () => {
  const h = signerHarness(); h.user.status = 'inactive'; await assert.rejects(h.sign(), { status: 403 });
});

test('repeated incorrect workflow PINs are rate limited and an old authenticated role cannot sign', async () => {
  const h = signerHarness();
  for (let i = 0; i < 5; i++) await assert.rejects(h.sign({ pin: '999999' }), { status: 403 });
  await assert.rejects(h.sign(), { status: 429 });
  await assert.rejects(signerHarness().sign({}, { jobTitle: 'Mechanic' }), { status: 403 });
});

test('legacy inspection routes point to versioned workflow handlers, with record deletion disabled', () => {
  for (const kind of ['pre', 'post']) {
    const methods = [], create = () => {}, remove = () => {}, edit = () => {};
    const router = Object.fromEntries(['use', 'get', 'post', 'put', 'delete'].map(method => [method, (...args) => { methods.push([method, ...args]); }]));
    const workflow = { createLegacy: create, remove, edit: value => { assert.equal(value, kind); return edit; } };
    const file = path.join(__dirname, `../routes/${kind}InspectionRoute.js`), module = { exports: {} };
    vm.compileFunction(fs.readFileSync(file, 'utf8'), ['require', 'module', 'exports'], { filename: file })(name => name === 'express' ? { Router: () => router } : name.endsWith('flightInspectionWorkflowController') ? workflow : {}, module, module.exports);
    assert.equal(methods.find(item => item[0] === 'post').at(-1), create);
    assert.equal(methods.find(item => item[0] === 'put').at(-1), edit);
    assert.equal(methods.find(item => item[0] === 'delete').at(-1), remove);
  }
});
