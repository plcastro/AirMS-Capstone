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

// Consume the database grant atomically so concurrent logins cannot reuse it.
const consumeFirstLoginOtpExemption = async (user, UserModel) => {
  if (
    user?.skipFirstLoginOtp !== true ||
    user.status !== "active" ||
    user.lastLogin != null
  ) {
    return false;
  }

  const result = await UserModel.updateOne(
    {
      _id: user._id,
      status: "active",
      lastLogin: null,
      skipFirstLoginOtp: true,
    },
    { $set: { skipFirstLoginOtp: false } },
  );

  user.skipFirstLoginOtp = false;
  return result.modifiedCount === 1;
};

module.exports = { isLoginOtpExemptUser, consumeFirstLoginOtpExemption };
