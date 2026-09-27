const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const { createIdleSession, SESSION_IDLE_LIMIT_MS } = require('../../shared/sessionIdle');
const { sessionActivityAt, SESSION_IDLE_LIMIT_MS: serverLimit } = require('../utils/sessionIdle');
const MINUTE = 60000;
const START = 1800000000000;

function clock() {
  let now = START, lastActivity = START, expired = 0, nextId = 0;
  const timers = new Map(), warnings = [];
  const idle = createIdleSession({
    now: () => now, getLastActivity: () => lastActivity,
    onActivity: time => { lastActivity = time; },
    onWarning: minutes => warnings.push(minutes), onExpire: () => expired++,
    schedule: (callback, delay) => { const id = ++nextId; timers.set(id, { callback, at: now + delay }); return id; },
    cancel: id => timers.delete(id),
  });
  idle.check();
  return { idle, warnings, expired: () => expired, timers,
    otherTabActivity: time => { lastActivity = START + time; },
    sleep: time => { now = START + time; },
    advance(time) {
      const target = START + time;
      while (true) {
        const entry = [...timers.entries()].sort((a, b) => a[1].at - b[1].at)[0];
        if (!entry || entry[1].at > target) break;
        const [id, task] = entry; timers.delete(id); now = task.at; task.callback();
      }
      now = target;
    },
  };
}

test('web, mobile and server use 30 minutes; warn at 15, 10 and 5 remaining then expire once', () => {
  assert.equal(SESSION_IDLE_LIMIT_MS, 30 * MINUTE);
  assert.equal(serverLimit, SESSION_IDLE_LIMIT_MS);
  const c = clock();
  c.advance(15 * MINUTE - 1); assert.deepEqual(c.warnings, []);
  c.advance(15 * MINUTE); assert.deepEqual(c.warnings, [15]);
  c.advance(20 * MINUTE); assert.deepEqual(c.warnings, [15, 10]);
  c.advance(25 * MINUTE); assert.deepEqual(c.warnings, [15, 10, 5]);
  c.advance(30 * MINUTE - 1); assert.equal(c.expired(), 0);
  c.advance(30 * MINUTE); assert.equal(c.expired(), 1);
  c.idle.check(); c.idle.activity(); assert.equal(c.expired(), 1);
});

test('activity after a warning starts a fresh idle window and permits new warnings', () => {
  const c = clock(); c.advance(20 * MINUTE); c.idle.activity();
  c.advance(30 * MINUTE); assert.equal(c.expired(), 0);
  c.advance(35 * MINUTE); assert.deepEqual(c.warnings, [15, 10, 15]);
  c.advance(50 * MINUTE); assert.equal(c.expired(), 1);
});

test('resuming a suspended app shows only the current warning; expired first touches cannot renew', () => {
  const c = clock(); c.sleep(26 * MINUTE); c.idle.check(); c.idle.check();
  assert.deepEqual(c.warnings, [4]);
  c.sleep(31 * MINUTE); assert.equal(c.idle.activity(), false);
  assert.equal(c.expired(), 1);
});

test('reload preserves the deadline and activity in another browser tab extends it', () => {
  const c = clock(); c.sleep(19 * MINUTE); c.idle.check();
  assert.deepEqual(c.warnings, [11]);
  c.otherTabActivity(19 * MINUTE); c.idle.check();
  c.advance(30 * MINUTE); assert.equal(c.expired(), 0);
  c.advance(34 * MINUTE); assert.deepEqual(c.warnings, [11, 15]);
  c.idle.stop(); c.advance(60 * MINUTE); assert.equal(c.expired(), 0);
  assert.equal(c.timers.size, 0);
});

test('server ignores invalid activity and clamps small client clock skew', () => {
  const session = { lastActivityAt: new Date(START) };
  for (const value of [undefined, '', 'bad', -1, START + 60001]) {
    assert.equal(sessionActivityAt(session, value, START + 30000), START);
  }
  assert.equal(sessionActivityAt(session, START + 31000, START + 30000), START + 30000);
});

function load(file, mocks, now) {
  const filename = path.join(__dirname, file), localRequire = createRequire(filename);
  const module = { exports: {} };
  class ClockDate extends Date {
    constructor(...args) { super(...(args.length ? args : [now()])); }
    static now() { return now(); }
  }
  vm.compileFunction(fs.readFileSync(filename, 'utf8'), ['require', 'module', 'exports'], {
    filename, contextExtensions: [{ Date: ClockDate }],
  })(name => Object.hasOwn(mocks, name) ? mocks[name] : localRequire(name), module, module.exports);
  return module.exports;
}
function response() {
  return { code: 200, status(code) { this.code = code; return this; },
    json(body) { this.body = body; return this; }, cookie() {}, clearCookie() {} };
}
function backend({ platform = 'WEB', persistent = false, active = true } = {}) {
  let now = START;
  const session = { isActive: active, loginAt: new Date(START), lastActivityAt: new Date(START), platform };
  const writes = [];
  const user = { _id: 'user', status: 'active' };
  const mocks = {
    jsonwebtoken: { verify: () => ({ id: 'user', sessionId: 'session', platform }), sign: () => 'new-token' },
    '../models/userSessionModel': {
      findOne: async filter => filter.isActive && !session.isActive ? null : session,
      findOneAndUpdate: async (_filter, update) => {
        writes.push(update);
        if (update.$max) session.lastActivityAt = update.$max.lastActivityAt;
        else Object.assign(session, update);
        return session;
      },
    },
    '../models/userModel': { findById: () => Object.assign(Promise.resolve(user), {
      select: () => ({ lean: async () => user }),
    }) },
    '../models/refreshTokenModel': {
      findOne: async () => ({ isPersistent: persistent, expiresAt: new Date(START + 86400000) }),
      findOneAndUpdate: async () => ({}), updateMany: async () => ({}), updateOne: async () => ({}), deleteMany: async () => ({}), create: async () => ({}),
    },
    '../utils/sendEmail': async () => {},
    './logsController': { auditLog: async () => {} },
    '../middleware/rateLimiter': {},
    './requestContext': { updateRequestContext: () => {} },
  };
  const auth = load('../middleware/authMiddleware.js', mocks, () => now);
  const controller = load('../controllers/userController.js', mocks, () => now);
  return { session, writes, advance: minutes => { now = START + minutes * MINUTE; },
    async call(refresh = false, activity = START) {
      const req = { headers: { authorization: 'Bearer token', 'x-session-id': 'session', 'x-platform': platform,
        ...(activity === undefined ? {} : { 'x-client-active-at': String(activity) }) }, body: { refreshToken: 'refresh' } };
      const res = response();
      if (refresh) await controller.refreshToken(req, res);
      else await auth.verifyToken(req, res, () => { res.allowed = true; });
      return res;
    },
  };
}

for (const platform of ['WEB', 'MOBILE']) {
  test(`${platform}: background requests do not prolong the 30-minute idle deadline`, async () => {
    const h = backend({ platform });
    h.advance(20); assert.equal((await h.call()).allowed, true);
    assert.equal(h.session.lastActivityAt.getTime(), START);
    h.advance(30); const res = await h.call();
    assert.equal(res.code, 401); assert.match(res.body.message, /inactivity/);
    assert.equal(h.session.isActive, false);
  });
  test(`${platform}: real client activity extends an active session`, async () => {
    const h = backend({ platform }); h.advance(25);
    assert.equal((await h.call(false, START + 25 * MINUTE)).allowed, true);
    h.advance(40); assert.equal((await h.call()).allowed, true);
  });
  for (const persistent of [false, true]) {
    test(`${platform}: refresh enforces idle timeout with remember-me=${persistent}`, async () => {
      const h = backend({ platform, persistent });
      h.advance(20); const refreshed = await h.call(true);
      assert.equal(refreshed.code, 200, JSON.stringify(refreshed.body));
      assert.equal(h.session.lastActivityAt.getTime(), START);
      h.advance(30); const expired = await h.call(true);
      assert.equal(expired.code, 401); assert.match(expired.body.message, /inactivity/);
      h.advance(31); assert.equal((await h.call(true, START + 31 * MINUTE)).code, 401);
    });
  }
  test(`${platform}: persistent refresh cannot revive a revoked session`, async () => {
    const h = backend({ platform, persistent: true, active: false });
    assert.equal((await h.call(true)).code, 401);
    assert.equal(h.writes.length, 0);
  });
}
