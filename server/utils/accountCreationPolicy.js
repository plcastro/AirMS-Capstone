const NO_INVITATION_EMAIL_ADDRESSES = new Set([
  "albertsulanguit16@gmail.com",
  "reetu22t@gmail.com",
  "nehemiahdamian@gmail.com",
  "archimedezccruz@gmail.com",
]);

const getAccountCreationPolicy = (email) => {
  const normalizedEmail =
    typeof email === "string" ? email.trim().toLowerCase() : "";
  const matches =
    NO_INVITATION_EMAIL_ADDRESSES.has(normalizedEmail) ||
    /^[^@\s]+@ngcp\.ph$/.test(normalizedEmail);

  return {
    suppressInvitationEmail: matches,
    loginOtpExempt: matches,
    tempPassword: matches ? "Password123" : null,
  };
};

module.exports = { getAccountCreationPolicy };
