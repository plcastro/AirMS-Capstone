const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { once } = require('node:events');
const { createCertificateService } = require('../services/certificates/certificateService');
const { canAccessPersonnel } = require('../services/certificates/certificateAccess');
const { createCertificateController } = require('../controllers/certificateController');
const { createCertificateRouter } = require('../routes/certificateRoute');
const { validateEnvelope } = require('../services/certificates/certificateFileValidator');
const { evaluateQualification } = require('../services/qualificationEngine');
const Certificate = require('../models/certificateRecordModel');
const Audit = require('../models/certificateAuditModel');
const policy = require('../config/certificatePolicy');

const owner = '111111111111111111111111', other = '222222222222222222222222', id = '333333333333333333333333';
const request = (jobTitle = 'mechanic', userId = owner) => ({ user: { id: userId, jobTitle } });
// The transport tests use envelope validation; real document decoding is covered in certificateFiles.test.js.
const bytes = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0]);
const file = { buffer: bytes, originalname: 'certificate.png', mimetype: 'image/png' };
const metadata = validateEnvelope(file);
const chain = value => {
  const query = { lean: async () => value };
  for (const method of ['select', 'sort', 'skip', 'limit']) query[method] = () => query;
  return query;
};
function fixture(options = {}) {
  const calls = [], session = {};
  let record = { _id: id, personnelId: owner, uploadedBy: owner, status: 'PENDING_REVIEW', processingStatus: 'UPLOADED', revision: 1,
    file: { ...metadata, provider: 'local', key: 'certificates/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa.png' } };
  const audit = {
    create: async (data, settings) => { calls.push(['audit', data, settings]); if (options.auditFailure) throw new Error('Audit unavailable'); },
    find: () => { calls.push(['history']); return chain([{ _id: id, actorId: owner, action: 'UPLOADED', revision: 1, details: {} }]); },
  };
  const service = createCertificateService({
    users: { findById: () => { calls.push(['user']); return chain(options.missingUser ? null : { jobTitle: options.targetRole || 'Mechanic' }); } },
    records: {
      create: async (data, settings) => { calls.push(['create', data, settings]); record = { ...data[0], _id: id }; return [record]; },
      findById: () => chain(options.missingRecord ? null : record),
      find: filter => { calls.push(['find', filter]); return chain([record]); }, countDocuments: async () => 1,
    }, audit,
    storage: {
      ready: () => {}, save: async () => { calls.push(['save']); return { provider: 'local', key: record.file.key }; },
      read: async () => { calls.push(['read']); return bytes; }, remove: async () => { calls.push(['remove']); },
    },
    validate: async value => { calls.push(['validate']); return validateEnvelope(value); },
    transaction: async callback => { calls.push(['transaction']); await callback(session); if (options.commitFailure) throw options.commitFailure; },
  });
  return { service, calls, session };
}

test('certificate permissions restrict mechanics to their own records and allow designated managers', () => {
  for (const action of ['read', 'upload']) {
    assert.equal(canAccessPersonnel(request(), owner, action), true);
    assert.equal(canAccessPersonnel(request(), other, action), false);
    for (const role of ['maintenance manager', 'superadmin']) assert.equal(canAccessPersonnel(request(role), other, action), true);
    for (const role of ['pilot', 'warehouse personnel', 'officer-in-charge', 'unknown']) assert.equal(canAccessPersonnel(request(role), owner, action), false);
    assert.equal(canAccessPersonnel({}, owner, action), false);
  }
});

test('unauthorized uploads fail before user lookup, validation or storage', async () => {
  const { service, calls } = fixture();
  await assert.rejects(service.upload(request(), other, file), error => error.status === 403);
  await assert.rejects(service.upload(request('pilot'), owner, file), error => error.status === 403);
  await assert.rejects(service.upload(request(), '../invalid', file), error => error.status === 400);
  assert.deepEqual(calls, []);
});

test('manager uploads require an existing mechanic as the certificate holder', async () => {
  for (const [options, status] of [[{ missingUser: true }, 404], [{ targetRole: 'pilot' }, 400]]) {
    const { service, calls } = fixture(options);
    await assert.rejects(service.upload(request('maintenance manager'), other, file), error => error.status === status);
    assert.deepEqual(calls.map(call => call[0]), ['user']);
  }
});

test('uploads atomically record pending status and audit history and cannot grant qualification', async () => {
  const { service, calls, session } = fixture();
  const req = { ...request(), body: { status: 'VERIFIED', reviewedBy: other, aircraftRatings: ['AS350B3'] } };
  const result = await service.upload(req, owner, file);
  assert.equal(result.status, 'PENDING_REVIEW'); assert.equal(result.processingStatus, 'UPLOADED');
  assert.equal(result.reviewedBy, null); assert.equal(result.file.key, undefined); assert.equal(result.file.provider, undefined);
  assert.equal(result.file.sha256, metadata.sha256);
  const recordCall = calls.find(call => call[0] === 'create'), auditCall = calls.find(call => call[0] === 'audit');
  assert.equal(recordCall[2].session, session); assert.equal(auditCall[2].session, session);
  assert.equal(auditCall[1][0].action, 'UPLOADED'); assert.equal(auditCall[1][0].certificateId, id);
  assert.equal(evaluateQualification({ personnelData: { id: owner, jobTitle: 'mechanic' }, certificates: [result], aircraftType: 'AS350B3', asOf: '2026-09-28' }).qualified, false);
});

test('failed database transactions remove originals, but ambiguous commits retain them for reconciliation', async () => {
  for (const options of [{ auditFailure: true }, { commitFailure: new Error('Aborted') }]) {
    const { service, calls } = fixture(options);
    await assert.rejects(service.upload(request(), owner, file));
    assert.equal(calls.at(-1)[0], 'remove');
  }
  const error = Object.assign(new Error('Commit outcome unknown'), { hasErrorLabel: label => label === 'UnknownTransactionCommitResult' });
  const { service, calls } = fixture({ commitFailure: error });
  await assert.rejects(service.upload(request(), owner, file), error);
  assert.equal(calls.some(call => call[0] === 'remove'), false);
});

test('metadata, history and files reject cross-user reads before storage access', async () => {
  const { service, calls } = fixture();
  const foreign = request('mechanic', other);
  for (const action of [() => service.list(foreign, owner), () => service.get(foreign, id), () => service.history(foreign, id), () => service.download(foreign, id)]) {
    await assert.rejects(action(), error => error.status === 403);
  }
  assert.deepEqual(calls, []);
  const listing = await service.list(request(), owner);
  assert.equal(listing.pagination.total, 1);
  assert.equal(listing.data[0].file.key, undefined);
  assert.equal((await service.get(request('maintenance manager'), id)).file.provider, undefined);
  assert.equal((await service.history(request(), id))[0].action, 'UPLOADED');
  await service.list(request(), owner, 1, 'PENDING_REVIEW');
  assert.deepEqual(calls.filter(call => call[0] === 'find').at(-1)[1], { personnelId: owner, status: 'PENDING_REVIEW' });
  await assert.rejects(service.list(request(), owner, 1, 'invalid'), error => error.status === 400);
});

test('file access is audited before delivery and denied when audit persistence fails', async () => {
  const { service, calls } = fixture();
  assert.deepEqual((await service.download(request(), id)).data, bytes);
  assert.deepEqual(calls.map(call => call[0]), ['read', 'audit']);
  assert.equal(calls[1][1].action, 'FILE_ACCESS_GRANTED');
  await assert.rejects(fixture({ auditFailure: true }).service.download(request(), id), /Audit unavailable/);
});

test('certificate schema validates required metadata and audit model prevents rewriting history', async () => {
  const doc = new Certificate({ personnelId: owner, uploadedBy: owner, file: { ...metadata, provider: 'local', key: 'opaque' } });
  await doc.validate();
  assert.equal(doc.status, 'PENDING_REVIEW'); assert.equal(doc.reviewedAt, null);
  await assert.rejects(new Certificate({ personnelId: owner, uploadedBy: owner }).validate());
  assert.throws(() => new Certificate({ personnelId: owner, unexpectedField: true }), /strict/);
  await assert.rejects(Audit.updateOne({ _id: id }, { $set: { action: 'VERIFIED' } }).exec(), /append-only/);
  await assert.rejects(Audit.deleteMany({}).exec(), /append-only/);
  await assert.rejects(Audit.bulkWrite([{ deleteOne: { filter: { _id: id } } }]), /append-only/);
});

async function serve(t, dependencies) {
  const app = express();
  app.use('/api/certificates', createCertificateRouter(dependencies));
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve, reject) => { server.closeAllConnections(); server.close(error => error ? reject(error) : resolve()); }));
  return `http://127.0.0.1:${server.address().port}/api/certificates`;
}
function form({ field = 'file', extra, buffer = bytes, name = 'certificate.png', type = 'image/png' } = {}) {
  const body = new FormData();
  body.append(field, new Blob([buffer], { type }), name);
  if (extra) body.append('status', 'VERIFIED');
  return body;
}
const authenticate = (req, res, next) => { req.user = request(req.headers['test-role'] || 'mechanic', req.headers['test-user'] || owner).user; next(); };

test('certificate HTTP routes require authentication and disable caching even on auth failures', async t => {
  const base = await serve(t, {});
  const response = await fetch(`${base}/${id}/file`);
  assert.equal(response.status, 401);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
});

test('certificate HTTP upload validates multipart shape, limits and authorization', async t => {
  const { service, calls } = fixture();
  const base = await serve(t, { authenticate, controller: createCertificateController(service) });
  const send = (body, headers = {}) => fetch(`${base}/personnel/${owner}`, { method: 'POST', headers, body });
  assert.equal((await send(form())).status, 400);
  const headers = { 'x-action-confirmed': 'true' };
  assert.equal((await send(form(), { ...headers, 'test-user': other })).status, 403);
  assert.equal(calls.length, 0);
  for (const [body, status] of [[form({ field: 'wrong' }), 400], [form({ extra: true }), 400], [form({ buffer: Buffer.alloc(policy.maxFileBytes + 1) }), 413], [form({ name: 'file.svg', type: 'image/svg+xml' }), 415], [new FormData(), 400]]) {
    assert.equal((await send(body, headers)).status, status);
  }
  assert.equal(calls.some(call => call[0] === 'save'), false);
  const response = await send(form(), headers);
  assert.equal(response.status, 201);
  const result = await response.json();
  assert.equal(result.data.status, 'PENDING_REVIEW');
  assert.equal(result.data.file.key, undefined);
  assert.equal(result.data.file.name, 'certificate.png');
});

test('certificate HTTP downloads are private attachments and mechanics cannot confirm or delete records', async t => {
  const { service } = fixture();
  const base = await serve(t, { authenticate, controller: createCertificateController(service) });
  const response = await fetch(`${base}/${id}/file`);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'image/png');
  assert.match(response.headers.get('content-disposition'), /^attachment;/);
  assert.equal(response.headers.get('content-security-policy'), "sandbox; default-src 'none'");
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), bytes);
  assert.equal((await fetch(`${base}/${id}/file`, { headers: { 'test-user': other } })).status, 403);
  assert.equal((await fetch(`${base}?page=-1`)).status, 400);
  assert.equal((await fetch(`${base}/${id}/confirm`, { method: 'POST' })).status, 403);
  assert.equal((await fetch(`${base}/${id}`, { method: 'DELETE' })).status, 404);
});

test('certificate uploads are rate limited per authenticated account', async t => {
  const { service } = fixture();
  const base = await serve(t, { authenticate, controller: createCertificateController(service) });
  for (let i = 0; i < 10; i++) assert.equal((await fetch(`${base}/personnel/${owner}`, { method: 'POST' })).status, 400);
  assert.equal((await fetch(`${base}/personnel/${owner}`, { method: 'POST' })).status, 429);
});
