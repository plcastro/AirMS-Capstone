const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const bcrypt = require("bcrypt");

const { getAccountCreationPolicy } = require("../utils/accountCreationPolicy");
const { isLoginOtpExemptUser } = require("../utils/loginOtpExemptions");

const specifiedEmails = [
  "albertsulanguit16@gmail.com",
  "reetu22t@gmail.com",
  "nehemiahdamian@gmail.com",
  "archimedezccruz@gmail.com",
];

test("creation exemptions match the listed addresses and whole NGCP domain", () => {
  for (const email of [...specifiedEmails, "staff@ngcp.ph", "first.last+test@ngcp.ph"]) {
    const expected = {
      suppressInvitationEmail: true,
      loginOtpExempt: true,
      tempPassword: "Password123",
    };
    assert.deepEqual(getAccountCreationPolicy(email), expected, email);
    assert.deepEqual(getAccountCreationPolicy(` ${email.toUpperCase()} `), expected);
  }
});

test("creation exemptions reject unrelated addresses and domain lookalikes", () => {
  for (const email of [
    "ordinary@gmail.com",
    "albertsulanguit16+extra@gmail.com",
    "albertsulanguit16@gmail.com.attacker.test",
    "staff@sub.ngcp.ph",
    "staff@ngcp.ph.attacker.test",
    "staff@notngcp.ph",
    "staff@ngcp.phx",
    "staff@ngcp.ph.",
    "staff@@ngcp.ph",
    "staff name@ngcp.ph",
    "@ngcp.ph",
    "ngcp.ph",
    "",
    null,
    undefined,
    42,
    { email: "staff@ngcp.ph" },
  ]) {
    assert.deepEqual(getAccountCreationPolicy(email), {
      suppressInvitationEmail: false,
      loginOtpExempt: false,
      tempPassword: null,
    }, String(email));
  }
});

// Load the real controller with isolated database/mail dependencies. This avoids
// changing the require cache or connecting to external services during tests.
const controllerPath = path.resolve(__dirname, "../controllers/userController.js");
const loadController = vm.compileFunction(
  fs.readFileSync(controllerPath, "utf8"),
  ["require", "module", "exports", "__dirname", "__filename"],
  { filename: controllerPath },
);

const createAccount = async (email, bodyOverrides = {}) => {
  const created = [];
  const sentEmails = [];
  const emailCredentials = [];
  const auditEntries = [];
  const stubs = {
    bcrypt,
    jsonwebtoken: {},
    "../utils/sendEmail": async (message) => sentEmails.push(message),
    "../utils/emailTemplates": {
      buildActivationEmail: (credentials) => {
        emailCredentials.push(credentials);
        return { text: "Activation instructions", html: "<p>Activation instructions</p>" };
      },
      buildOtpEmail: () => assert.fail("Account creation must not send an OTP"),
    },
    validator: require("validator"),
    fs,
    path,
    crypto: require("node:crypto"),
    "@vercel/blob": {},
    "../models/userModel": {
      findOne: async () => null,
      create: async (values) => {
        const account = { _id: "created-user", ...values };
        created.push(account);
        return account;
      },
    },
    "../models/userSessionModel": {},
    "../models/refreshTokenModel": {},
    "./logsController": {
      auditLog: async (...args) => auditEntries.push(args),
    },
    "../utils/generateUniqueUsername": async () => "createduser",
    "../utils/generateOTP": () => assert.fail("Account creation must not generate an OTP"),
    "../utils/loginOtpExemptions": require("../utils/loginOtpExemptions"),
    "../utils/accountCreationPolicy": require("../utils/accountCreationPolicy"),
    "../utils/sessionIdle": require("../utils/sessionIdle"),
    "../middleware/requestContext": {},
    "../middleware/rateLimiter": {},
  };
  const controllerModule = { exports: {} };
  loadController((name) => {
    assert.ok(Object.hasOwn(stubs, name), `Unexpected controller dependency: ${name}`);
    return stubs[name];
  }, controllerModule, controllerModule.exports, path.dirname(controllerPath), controllerPath);

  const response = {
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
  await controllerModule.exports.createUser({
    user: { id: "creating-admin" },
    body: {
      firstName: "Created",
      lastName: "User",
      email,
      jobTitle: "Warehouse Personnel",
      access: "User",
      ...bodyOverrides,
    },
  }, response);

  return { created, sentEmails, emailCredentials, auditEntries, response };
};

for (const email of [...specifiedEmails, " NGCP.USER@NGCP.PH "]) {
  test(`creating ${email.trim()} applies the password and persistent login exemption without sending mail`, async () => {
    const startedAt = Date.now();
    const result = await createAccount(email);
    assert.equal(result.response.statusCode, 201);
    assert.equal(result.created.length, 1);
    const account = result.created[0];
    assert.equal(account.email, email.trim());
    assert.equal(await bcrypt.compare("Password123", account.password), true);
    assert.equal(bcrypt.getRounds(account.password), 12);
    assert.equal(account.loginOtpExempt, true);
    assert.equal(isLoginOtpExemptUser(account), true);
    assert.equal(isLoginOtpExemptUser({ ...account, lastLogin: new Date() }), true);
    assert.equal(account.status, "inactive");
    assert.equal(account.invitationStatus, "pending");
    assert.equal(account.invitationSentAt, null);
    assert.ok(account.tempPasswordExpires >= startedAt + 24 * 60 * 60 * 1000);
    assert.equal(new Date(account.invitationExpiresAt).getTime(), account.tempPasswordExpires);
    assert.equal(result.sentEmails.length, 0);
    assert.equal(result.emailCredentials.length, 0);
    assert.deepEqual(result.auditEntries, [[
      "User created: createduser, email sent successfully (actorId: creating-admin)",
      "creating-admin",
    ]]);
    assert.equal(result.response.body.emailSent, false);
  });
}

test("unrelated accounts retain emailed random credentials and OTP despite supplied exemption fields", async () => {
  for (const email of ["ordinary@gmail.com", "staff@sub.ngcp.ph", "staff@ngcp.ph.attacker.test"]) {
    const result = await createAccount(email, {
      loginOtpExempt: true,
      suppressInvitationEmail: true,
      tempPassword: "Password123",
    });
    assert.equal(result.response.statusCode, 201);
    const account = result.created[0];
    assert.equal(account.loginOtpExempt, false);
    assert.equal(isLoginOtpExemptUser(account), false);
    assert.equal(result.sentEmails.length, 1);
    assert.equal(result.sentEmails[0].to, email);
    assert.equal(result.emailCredentials.length, 1);
    const generatedPassword = result.emailCredentials[0].tempPassword;
    assert.notEqual(generatedPassword, "Password123");
    assert.equal(await bcrypt.compare(generatedPassword, account.password), true);
    assert.equal(bcrypt.getRounds(account.password), 12);
    assert.ok(account.invitationSentAt instanceof Date);
    assert.equal(result.response.body.emailSent, true);
    assert.deepEqual(result.auditEntries, [[
      "User created: createduser, email sent successfully (actorId: creating-admin)",
      "creating-admin",
    ]]);
  }
});
