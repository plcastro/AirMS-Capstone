const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const jwt = require("jsonwebtoken");

process.env.JWT_SECRET ||= "test-jwt-secret";
process.env.REFRESH_SECRET ||= "test-refresh-secret";

const controllerPath = path.resolve(__dirname, "../controllers/userController.js");
const loadController = vm.compileFunction(
  fs.readFileSync(controllerPath, "utf8"),
  ["require", "module", "exports", "__dirname", "__filename"],
  { filename: controllerPath },
);

// In-memory refresh token store with the Mongo operations the endpoint uses.
let seedCount = 0;

const createStore = () => {
  const rows = [];
  const matches = (row, filter) => Object.entries(filter).every(([key, expected]) => {
    if (expected && typeof expected === "object" && "$ne" in expected) return row[key] !== expected.$ne;
    return (row[key] ?? null) === expected;
  });
  return {
    rows,
    create: async (values) => { rows.push({ revokedAt: null, replacedByTokenHash: null, ...values }); return values; },
    findOne: async (filter) => rows.find((row) => matches(row, filter)) || null,
    findOneAndUpdate: async (filter, update) => {
      const row = rows.find((item) => matches(item, filter));
      if (row) Object.assign(row, update);
      return row || null;
    },
    updateOne: async (filter, update) => {
      const row = rows.find((item) => matches(item, filter));
      if (row) Object.assign(row, update);
    },
    updateMany: async (filter, update) => {
      rows.filter((row) => matches(row, filter)).forEach((row) => Object.assign(row, update));
    },
  };
};

const setup = () => {
  const store = createStore();
  const user = { _id: "user-1", username: "mech", status: "active" };
  const session = { userId: "user-1", sessionId: "session-1", isActive: true, lastActivityAt: new Date() };
  const stubs = {
    bcrypt: {},
    jsonwebtoken: jwt,
    "../utils/sendEmail": async () => {},
    "../utils/emailTemplates": {},
    validator: require("validator"),
    fs,
    path,
    crypto: require("node:crypto"),
    "@vercel/blob": {},
    "../models/userModel": { findById: async () => user },
    "../models/userSessionModel": {
      findOne: async () => session,
      findOneAndUpdate: async () => session,
    },
    "../models/refreshTokenModel": store,
    "./logsController": { auditLog: async () => {} },
    "../utils/generateUniqueUsername": async () => "user",
    "../utils/generateOTP": () => "000000",
    "../utils/loginOtpExemptions": require("../utils/loginOtpExemptions"),
    "../utils/accountCreationPolicy": require("../utils/accountCreationPolicy"),
    "../utils/sessionIdle": require("../utils/sessionIdle"),
    "../middleware/requestContext": require("../middleware/requestContext"),
    "../middleware/rateLimiter": {},
  };
  const controllerModule = { exports: {} };
  loadController((name) => {
    assert.ok(Object.hasOwn(stubs, name), `Unexpected controller dependency: ${name}`);
    return stubs[name];
  }, controllerModule, controllerModule.exports, path.dirname(controllerPath), controllerPath);

  const refresh = async (refreshToken, cookieRefreshToken) => {
    const response = {
      cookie() {}, clearCookie() {},
      status(code) { this.statusCode = code; return this; },
      json(body) { this.body = body; return this; },
    };
    await controllerModule.exports.refreshToken({
      body: { refreshToken },
      ...(cookieRefreshToken ? { cookies: { refreshToken: cookieRefreshToken } } : {}),
      headers: { "x-platform": "MOBILE", "x-session-id": "session-1", "x-client-active-at": String(Date.now()) },
      ip: "127.0.0.1",
    }, response);
    return response;
  };

  const issue = async () => {
    const token = jwt.sign({ id: "user-1", type: "refresh" }, process.env.REFRESH_SECRET, { jwtid: `seed-${++seedCount}` });
    const tokenHash = require("node:crypto").createHash("sha256").update(token).digest("hex");
    await store.create({ userId: "user-1", tokenHash, expiresAt: new Date(Date.now() + 60000), isPersistent: true });
    return token;
  };

  return { store, refresh, issue };
};

test("a normal refresh rotates the token", async () => {
  const { refresh, issue } = setup();
  const first = await issue();
  const response = await refresh(first);
  assert.equal(response.statusCode, undefined);
  assert.ok(response.body.refreshToken);
  assert.notEqual(response.body.refreshToken, first);
});

test("retrying with the previous token succeeds while its replacement was never used", async () => {
  const { refresh, issue } = setup();
  const first = await issue();
  const lost = (await refresh(first)).body.refreshToken;
  // App closed before saving `lost`; the next launch sends `first` again.
  const retry = await refresh(first);
  assert.equal(retry.statusCode, undefined, JSON.stringify(retry.body));
  const current = retry.body.refreshToken;
  assert.notEqual(current, lost);
  // The never-delivered token is retired; the newest token keeps working.
  assert.equal((await refresh(lost)).statusCode, 403);
});

test("a stale cookie left in the app's cookie jar does not override the body token", async () => {
  const { refresh, issue } = setup();
  const first = await issue();
  const second = (await refresh(first)).body.refreshToken;
  const third = (await refresh(second)).body.refreshToken;
  // Relaunch after the app was killed: the native cookie jar still holds `first`.
  const response = await refresh(third, first);
  assert.equal(response.statusCode, undefined, JSON.stringify(response.body));
  assert.ok(response.body.refreshToken);
});

test("reusing an old token after its replacement was used is still rejected", async () => {
  const { refresh, issue, store } = setup();
  const first = await issue();
  const second = (await refresh(first)).body.refreshToken;
  const third = (await refresh(second)).body.refreshToken;
  assert.ok(third);
  const replay = await refresh(first);
  assert.equal(replay.statusCode, 403);
  assert.equal(replay.body.message, "Refresh token already rotated");
  assert.ok(store.rows.some((row) => !row.revokedAt), "current token survives a detected stale retry");
});

test("a device replaced by a newer login is signed out without ending the newer session", async () => {
  const { refresh, issue, store } = setup();
  const phone = await issue();
  const web = await issue();
  // A new login cancels every other refresh token for the user.
  const webHash = require("node:crypto").createHash("sha256").update(web).digest("hex");
  store.rows.filter((row) => row.tokenHash !== webHash).forEach((row) => {
    row.revokedAt = new Date();
    row.revokedReason = "Superseded by newer refresh token";
  });
  const stale = await refresh(phone);
  assert.equal(stale.statusCode, 401);
  assert.match(stale.body.message, /session is no longer active/i);
  const current = await refresh(web);
  assert.equal(current.statusCode, undefined, JSON.stringify(current.body));
});

test("a server failure during refresh does not end the session", async () => {
  const { refresh, issue, store } = setup();
  const token = await issue();
  store.findOne = async () => { throw new Error("database unavailable"); };
  const failed = await refresh(token);
  assert.equal(failed.statusCode, 500);
  assert.doesNotMatch(failed.body.message, /refresh token/i);
});

test("a malformed refresh token is still rejected", async () => {
  const { refresh } = setup();
  const response = await refresh("not-a-jwt");
  assert.equal(response.statusCode, 403);
  assert.equal(response.body.message, "Invalid refresh token");
});
