const assert = require("node:assert/strict");
const test = require("node:test");

const {
  isLoginOtpExemptUser,
  consumeFirstLoginOtpExemption,
} = require("../utils/loginOtpExemptions");

const reviewEmails = [
  "appreviewsuperadmin@airms.online",
  "appreviewmaintenancemanager@airms.online",
  "appreviewofficerincharge@airms.online",
  "appreviewmechanic@airms.online",
  "appreviewpilot@airms.online",
  "appreviewwarehousepersonnel@airms.online",
];

test("only the six app review account emails are exempt from login OTP", () => {
  for (const email of reviewEmails) {
    assert.equal(isLoginOtpExemptUser({ email }), true, email);
    assert.equal(isLoginOtpExemptUser({ email: ` ${email.toUpperCase()} ` }), true);
  }

  assert.equal(isLoginOtpExemptUser({ email: "pilot@airms.online" }), false);
  assert.equal(
    isLoginOtpExemptUser({ email: "appreviewpilot@airms.online.attacker.test" }),
    false,
  );
  assert.equal(
    isLoginOtpExemptUser({ username: "appreviewpilot@airms.online" }),
    false,
  );
  assert.equal(isLoginOtpExemptUser(null), false);
});

test("first-login OTP grants require an active account with no previous login", async () => {
  const model = { updateOne: () => assert.fail("Must not consume a grant") };
  for (const user of [
    null,
    { status: "active", lastLogin: null },
    { status: "active", lastLogin: null, skipFirstLoginOtp: false },
    { status: "inactive", lastLogin: null, skipFirstLoginOtp: true },
    { status: "deactivated", lastLogin: null, skipFirstLoginOtp: true },
    { status: "active", lastLogin: new Date(), skipFirstLoginOtp: true },
  ]) {
    assert.equal(await consumeFirstLoginOtpExemption(user, model), false);
  }
});

test("only one concurrent login can consume a first-login OTP grant", async () => {
  let available = true;
  const model = {
    updateOne: async (filter, update) => {
      assert.deepEqual(filter, {
        _id: "target-user",
        status: "active",
        lastLogin: null,
        skipFirstLoginOtp: true,
      });
      assert.deepEqual(update, { $set: { skipFirstLoginOtp: false } });
      const modifiedCount = available ? 1 : 0;
      available = false;
      return { modifiedCount };
    },
  };
  const user = {
    _id: "target-user",
    status: "active",
    lastLogin: null,
    skipFirstLoginOtp: true,
  };
  const concurrentUser = { ...user };
  const results = await Promise.all([
    consumeFirstLoginOtpExemption(user, model),
    consumeFirstLoginOtpExemption(concurrentUser, model),
  ]);
  assert.deepEqual(results, [true, false]);
  assert.equal(user.skipFirstLoginOtp, false);
  assert.equal(concurrentUser.skipFirstLoginOtp, false);
  assert.equal(await consumeFirstLoginOtpExemption(user, model), false);
});

test("a failed database operation does not authorize an OTP exemption", async () => {
  const user = {
    _id: "target-user",
    status: "active",
    lastLogin: null,
    skipFirstLoginOtp: true,
  };
  await assert.rejects(
    consumeFirstLoginOtpExemption(user, {
      updateOne: async () => { throw new Error("Database unavailable"); },
    }),
    /Database unavailable/,
  );
});
