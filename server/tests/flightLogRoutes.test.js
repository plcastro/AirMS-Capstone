const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const express = require('express');
const { requireActionConfirmation } = require('../middleware/actionConfirmation');

const routes = [
  ['POST', '/preflight-confirmations', 'entryConfirmation'],
  ['GET', '/crew-options', 'getFlightLogCrewOptions'],
  ['GET', '/flight-id/workspace', 'workspace'],
  ['POST', '/flight-id/review', 'review'],
  ['PUT', '/flight-id/release', 'release'],
  ['PUT', '/flight-id/accept', 'accept'],
  ['PUT', '/flight-id/submit', 'submit'],
  ['PUT', '/flight-id/complete', 'complete'],
  ['PUT', '/flight-id/return', 'return'],
  ['PUT', '/flight-id/reconcile', 'reconcile'],
  ['PUT', '/flight-id/amend', 'amend'],
  ['POST', '/flight-id/defects', 'defects'],
  ['PUT', '/flight-id/defects/defect-id', 'defects'],
  ['POST', '/flight-id/inspections', 'createInspections'],
  ['PUT', '/flight-id/inspections/pre/inspection-id', 'editPre'],
  ['PUT', '/flight-id/inspections/post/inspection-id', 'editPost'],
  ['PUT', '/flight-id', 'save'],
];

async function routeServer(t) {
  const handler = name => (req, res) => res.json({ handler: name, params: req.params });
  const workflow = Object.fromEntries(['workspace', 'review', 'save', 'amend', 'reconcile', 'defects'].map(name => [name, handler(name)]));
  workflow.action = handler;
  const controllers = Object.fromEntries([
    'createFlightLog', 'getFlightLogs', 'getFlightLogById', 'getFlightLogsByAircraft', 'updateFlightLog',
    'releaseFlightLog', 'acceptFlightLog', 'completeFlightLog', 'getFlightLogStats', 'searchFlightLogs', 'getFlightLogCrewOptions',
  ].map(name => [name, handler(name)]));
  const dependencies = {
    express,
    '../middleware/authMiddleware': { verifyToken: (req, res, next) => req.headers.authorization === 'Bearer test'
      ? next() : res.status(401).json({ message: 'Authentication required' }) },
    '../middleware/sessionActivity': { touchSessionActivity: (_req, _res, next) => next() },
    '../middleware/actionConfirmation': { requireActionConfirmation },
    '../controllers/flightLogController': controllers,
    '../controllers/flightWorkflowController': workflow,
    '../controllers/flightInspectionWorkflowController': {
      create: handler('createInspections'), edit: kind => handler(kind === 'pre' ? 'editPre' : 'editPost'),
    },
    '../controllers/flightEntryConfirmationController': handler('entryConfirmation'),
    '../utils/flightLogPilot': { getAssignedPilotOptions: handler('pilotOptions') },
  };
  const filename = path.join(__dirname, '../routes/flightLogRoute.js');
  const module = { exports: {} };
  vm.compileFunction(fs.readFileSync(filename, 'utf8'), ['require', 'module', 'exports'], { filename })(name => {
    assert.ok(Object.hasOwn(dependencies, name), `Unexpected route dependency: ${name}`);
    return dependencies[name];
  }, module, module.exports);
  const app = express();
  app.use(express.json());
  app.use('/api/flightlogs', module.exports);
  app.use('/api', require('../middleware/apiNotFound'));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())));
  return async (method, url, headers = {}) => fetch(`http://127.0.0.1:${server.address().port}/api/flightlogs${url}`, {
    method,
    headers: { Authorization: 'Bearer test', 'x-action-confirmed': 'true', ...headers },
  });
}

test('flight screens reach JSON workflow handlers instead of HTML 404s or the generic ID route', async t => {
  const request = await routeServer(t);
  for (const [method, url, name] of routes) {
    const response = await request(method, url);
    assert.equal(response.status, 200, `${method} ${url}`);
    assert.match(response.headers.get('content-type'), /application\/json/, `${method} ${url}`);
    const body = await response.json();
    assert.equal(body.handler, name, `${method} ${url}`);
    if (url.includes('/inspections/')) assert.deepEqual(body.params, { flightId: 'flight-id', id: 'inspection-id' });
    if (url.endsWith('/defect-id')) assert.deepEqual(body.params, { id: 'flight-id', defectId: 'defect-id' });
  }
});

test('workflow routes retain authentication and explicit confirmation for mutations', async t => {
  const request = await routeServer(t);
  for (const [method, url] of routes) {
    const denied = await request(method, url, { Authorization: '' });
    assert.equal(denied.status, 401, `${method} ${url}`);
    assert.match(denied.headers.get('content-type'), /application\/json/);
    await denied.text();
    if (method !== 'GET') {
      const unconfirmed = await request(method, url, { 'x-action-confirmed': '' });
      assert.equal(unconfirmed.status, 400, `${method} ${url}`);
      assert.match((await unconfirmed.json()).message, /confirmation required/i);
    }
  }
});

test('unknown API endpoints return a parseable JSON error', async t => {
  const request = await routeServer(t);
  const response = await request('POST', '/missing-endpoint');
  assert.equal(response.status, 404);
  assert.match(response.headers.get('content-type'), /application\/json/);
  assert.deepEqual(await response.json(), { success: false, message: 'API endpoint not found.' });
});
