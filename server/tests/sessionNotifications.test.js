const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const Notification = require('../models/notificationModel');
const { createIdleSession } = require('../../shared/sessionIdle');
const START = 1800000000000;
const MINUTE = 60000;
const userId = '000000000000000000000001';

function harness(platform = 'WEB') {
  let now = START + 15 * MINUTE;
  const session = { _id: '000000000000000000000002', sessionId: 'current-session',
    userId, isActive: true, platform, lastActivityAt: new Date(START) };
  const records = new Map(), pushes = [];
  const dependencies = {
    '../models/userSessionModel': { findOne: async query => {
      assert.deepEqual(query, { userId, sessionId: session.sessionId, isActive: true });
      return session.isActive ? session : null;
    } },
    '../models/notificationModel': { create: async data => {
      if (records.has(data._id)) throw Object.assign(new Error('Duplicate'), { code: 11000 });
      const doc = new Notification(data);
      records.set(data._id, doc.toObject());
      await doc.validate();
      return doc;
    } },
    '../utils/mobilePushService': { sendPushNotificationToUsers: async data => pushes.push(data) },
  };
  const filename = path.join(__dirname, '../controllers/sessionNotificationController.js');
  const module = { exports: {} }, localRequire = createRequire(filename);
  vm.compileFunction(fs.readFileSync(filename, 'utf8'), ['require', 'module', 'exports'], {
    filename, contextExtensions: [{ Date: { now: () => now } }],
  })(name => dependencies[name] || localRequire(name), module, module.exports);
  return { session, records, pushes, at: minutes => { now = START + minutes * MINUTE; },
    async call(body = {}) {
      const res = { code: 200, status(code) { this.code = code; return this; },
        json(value) { this.body = value; return this; }, end() { return this; } };
      await module.exports.createSessionWarning({ user: { id: userId, sessionId: session.sessionId },
        body: { lastActivityAt: START, thresholdMinutes: 15, ...body } }, res);
      return res;
    },
  };
}

test('idle warning callback identifies the threshold and idle window for server deduplication', () => {
  let now = START + 15 * MINUTE;
  const warnings = [];
  const timer = createIdleSession({ getLastActivity: () => START, now: () => now,
    schedule: () => 1, cancel: () => {}, onActivity: () => {}, onExpire: () => {},
    onWarning: (...args) => warnings.push(args) });
  timer.check(); now = START + 20 * MINUTE; timer.check(); now = START + 25 * MINUTE; timer.check();
  assert.deepEqual(warnings, [15, 10, 5].map(minutes => [minutes, { lastActivityAt: START, thresholdMinutes: minutes }]));
});

for (const platform of ['WEB', 'MOBILE']) {
  test(`${platform}: saves each warning to the user's inbox and sends the normal push notification`, async () => {
    const h = harness(platform);
    for (const minutes of [15, 10, 5]) {
      h.at(30 - minutes);
      assert.equal((await h.call({ thresholdMinutes: minutes, recipientUsers: ['another-user'] })).code, 201);
    }
    assert.equal(h.records.size, 3);
    assert.equal(h.pushes.length, 3);
    assert.equal(h.session.lastActivityAt.getTime(), START, 'notifications must not reset idle time');
    for (const record of h.records.values()) {
      assert.equal(record.module, 'sessions'); assert.equal(record.entityType, 'session');
      assert.deepEqual(record.recipientUsers.map(String), [userId]);
      assert.deepEqual(record.recipientRoles, []); assert.deepEqual(record.readBy, []);
      assert.equal(record.metadata.expiresAt, START + 30 * MINUTE);
      assert.match(record.title, new RegExp(platform === 'WEB' ? 'Web' : 'Mobile'));
    }
    for (const push of h.pushes) {
      assert.deepEqual(push.recipientUsers, [userId]);
      assert.ok(h.records.has(push.data.notificationId));
      assert.equal(push.data.module, 'sessions');
    }
  });
}

test('concurrent tabs and retries create one inbox item and one push per warning', async () => {
  const h = harness();
  const responses = await Promise.all([h.call(), h.call(), h.call()]);
  assert.deepEqual(responses.map(res => res.code).sort(), [200, 200, 201]);
  assert.equal(h.records.size, 1); assert.equal(h.pushes.length, 1);
  h.session.lastActivityAt = new Date(START + MINUTE); h.at(16);
  assert.equal((await h.call({ lastActivityAt: START + MINUTE })).code, 201);
  assert.equal(h.records.size, 2, 'a new idle window may warn again');
});

test('early, obsolete, expired and signed-out warnings are discarded', async () => {
  const h = harness();
  h.at(14); assert.equal((await h.call()).code, 204);
  h.at(20); assert.equal((await h.call()).code, 204);
  h.at(30); assert.equal((await h.call({ thresholdMinutes: 5 })).code, 204);
  h.at(15); h.session.lastActivityAt = new Date(START + MINUTE);
  assert.equal((await h.call()).code, 204);
  h.session.isActive = false; assert.equal((await h.call()).code, 401);
  assert.equal(h.records.size, 0); assert.equal(h.pushes.length, 0);
});

test('warning thresholds and timestamps cannot be supplied arbitrarily', async () => {
  const h = harness();
  for (const body of [{ thresholdMinutes: 20 }, { thresholdMinutes: '15' },
    { lastActivityAt: null }, { lastActivityAt: 'bad' }, { lastActivityAt: -1 }]) {
    assert.equal((await h.call(body)).code, 400);
  }
  assert.equal(h.records.size, 0);
});
