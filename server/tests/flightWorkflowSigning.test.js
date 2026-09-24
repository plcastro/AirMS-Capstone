const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { fail } = require('../utils/flightWorkflowRules');

const id = '000000000000000000000001';
function signerHarness() {
  const user = { status: 'active', jobTitle: 'Pilot', pin: 'hashed', firstName: 'Actual', lastName: 'Pilot', licenseNo: 'LIC-1' };
  const authorization = { _id: 'authority', active: true, licenseNo: 'LIC-1', aircraft: ['RP-C1234'], validUntil: '2099-01-01', licenseType: 'Pilot', reference: 'Verified authority' };
  const dependencies = {
    bcrypt: { compare: async value => value === '123456' },
    '../models/userModel': { findById: () => ({ select: async () => user }) },
    '../models/flightCrewAuthorizationModel': { findOne: async () => authorization.active ? authorization : null },
    './flightWorkflowRules': { fail },
  };
  const file = path.join(__dirname, '../utils/flightWorkflowSigning.js'), module = { exports: {} };
  vm.compileFunction(fs.readFileSync(file, 'utf8'), ['require', 'module', 'exports'], { filename: file })(name => dependencies[name], module, module.exports);
  const sign = (body = {}, actor = {}) => module.exports.verifyWorkflowSigner({ user: { id, jobTitle: 'Pilot', ...actor }, body: { pin: '123456', signature: 'data:image/png;base64,iVBORw0KGgo=', name: 'Forged client name', licenseNo: 'Fake license', ...body } }, { rpc: 'RP-C1234' }, 'accept');
  return { sign, user, authorization };
}

test('final certification verifies the PIN on the server and records the database signer identity', async () => {
  const h = signerHarness(), signature = await h.sign();
  assert.equal(signature.name, 'Actual Pilot'); assert.equal(signature.licenseNo, 'LIC-1');
  assert.equal(signature.userId, id); assert.equal(signature.authorizationReference, 'Verified authority');
  assert.equal(signature.pin, undefined);
  await assert.rejects(h.sign({ pin: '999999' }), /Incorrect signing PIN/);
  await assert.rejects(h.sign({ signature: '' }), /Draw your signature/);
});

test('expired, revoked, wrong-aircraft and mismatched-license authorizations cannot certify', async () => {
  for (const patch of [{ validUntil: '2000-01-01' }, { active: false }, { aircraft: ['RP-C9999'] }, { licenseNo: 'OTHER' }]) {
    const h = signerHarness(); Object.assign(h.authorization, patch);
    await assert.rejects(h.sign(), { status: 403 });
  }
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
