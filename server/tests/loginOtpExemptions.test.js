const assert = require("node:assert/strict");
const test = require("node:test");

const { isLoginOtpExemptUser } = require("../utils/loginOtpExemptions");

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
