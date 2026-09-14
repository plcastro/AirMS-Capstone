// App review accounts may sign in on a new device without email verification.
// Match only the email on the authenticated user record, never the login input.
const LOGIN_OTP_EXEMPT_EMAILS = new Set([
  "appreviewsuperadmin@airms.online",
  "appreviewmaintenancemanager@airms.online",
  "appreviewofficerincharge@airms.online",
  "appreviewmechanic@airms.online",
  "appreviewpilot@airms.online",
  "appreviewwarehousepersonnel@airms.online",
]);

const isLoginOtpExemptUser = (user) =>
  typeof user?.email === "string" &&
  LOGIN_OTP_EXEMPT_EMAILS.has(user.email.trim().toLowerCase());

module.exports = { isLoginOtpExemptUser };
