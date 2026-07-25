const path = require("path");

const AIRMS_LOGO_CID = "airms-logo";
const logoPath = path.resolve(
  __dirname,
  "../../client-web/src/assets/AirMS_web.webp",
);

const palette = {
  primary: "#26866f",
  primaryDark: "#006340",
  surface: "#f5f6f8",
  panel: "#ffffff",
  text: "#1f2937",
  muted: "#667085",
  border: "#e5e7eb",
  warningBg: "#fff7e6",
  warningBorder: "#ffd591",
  danger: "#cf1322",
};

const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const getAirmsLogoAttachment = () => ({
  filename: "AirMS_web.webp",
  path: logoPath,
  cid: AIRMS_LOGO_CID,
});

const renderDetailRow = (label, value) => `
  <tr>
    <td style="padding: 8px 0; color: ${palette.muted}; font-size: 13px;">${escapeHtml(label)}</td>
    <td style="padding: 8px 0; color: ${palette.text}; font-size: 14px; font-weight: 700; text-align: right;">${escapeHtml(value || "N/A")}</td>
  </tr>
`;

const renderButton = (label, url) => {
  if (!url) return "";

  return `
    <a href="${escapeHtml(url)}" style="display: inline-block; background: ${palette.primary}; color: #ffffff; padding: 12px 18px; border-radius: 6px; text-decoration: none; font-weight: 700; font-size: 14px;">
      ${escapeHtml(label)}
    </a>
  `;
};

const renderLayout = ({ title, eyebrow, preview, children, tone = "default" }) => {
  const accent = tone === "danger" ? palette.danger : palette.primary;

  return `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin: 0; padding: 0; background: ${palette.surface}; font-family: Arial, Helvetica, sans-serif; color: ${palette.text};">
    <span style="display: none; visibility: hidden; overflow: hidden; opacity: 0; height: 0; width: 0;">${escapeHtml(preview || title)}</span>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: ${palette.surface}; padding: 24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 620px; background: ${palette.panel}; border: 1px solid ${palette.border}; border-radius: 8px; overflow: hidden;">
            <tr>
              <td style="background: ${palette.primaryDark}; padding: 20px 24px;">
                <img src="cid:${AIRMS_LOGO_CID}" alt="AirMS" width="132" style="display: block; max-width: 132px; height: auto; margin-bottom: 18px;" />
                <div style="color: #d6f1e9; font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;">${escapeHtml(eyebrow || "AirMS")}</div>
                <h1 style="margin: 6px 0 0; color: #ffffff; font-size: 24px; line-height: 1.3;">${escapeHtml(title)}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding: 26px 24px; border-top: 4px solid ${accent};">
                ${children}
              </td>
            </tr>
            <tr>
              <td style="padding: 18px 24px; background: #fbfcfd; border-top: 1px solid ${palette.border}; color: ${palette.muted}; font-size: 12px; line-height: 1.6;">
                This is an automated message from AirMS. Please do not reply.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`;
};

const buildEmail = ({ title, eyebrow, preview, children, text, tone }) => ({
  html: renderLayout({ title, eyebrow, preview, children, tone }),
  text,
  attachments: [getAirmsLogoAttachment()],
});

const buildActivationEmail = ({
  firstName,
  username,
  tempPassword,
  jobTitle,
  portalUrlWeb,
  portalUrlMobile,
  isResend = false,
}) =>
  buildEmail({
    eyebrow: "Account Activation",
    title: isResend ? "AirMS Activation Resent" : "Welcome to AirMS",
    preview: "Your AirMS temporary credentials are ready.",
    text: `Hello ${firstName || "there"}, your AirMS username is ${username} and temporary password is ${tempPassword}. This password expires in 1 hour.`,
    children: `
      <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.7;">Hello <strong>${escapeHtml(firstName || "there")}</strong>,</p>
      <p style="margin: 0 0 18px; font-size: 15px; line-height: 1.7;">Your AirMS account credentials are ready. Use the temporary credentials below to sign in and finish setup.</p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 18px 0; border-collapse: collapse; border-top: 1px solid ${palette.border}; border-bottom: 1px solid ${palette.border};">
        ${renderDetailRow("Username", username)}
        ${renderDetailRow("Temporary Password", tempPassword)}
        ${renderDetailRow("Role", jobTitle)}
      </table>
      <div style="margin: 24px 0 10px; text-align: center;">
        ${renderButton("Access AirMS Web", portalUrlWeb)}
      </div>
      <div style="margin: 10px 0 24px; text-align: center;">
        ${renderButton("Access AirMS Mobile", portalUrlMobile)}
      </div>
      <div style="background: ${palette.warningBg}; border: 1px solid ${palette.warningBorder}; border-radius: 6px; padding: 12px 14px; color: ${palette.text}; font-size: 13px; line-height: 1.6;">
        <strong>Security note:</strong> This temporary password expires in <strong>1 hour</strong>.
      </div>
    `,
  });

const buildOtpEmail = ({
  title,
  intro,
  otp,
  validityMinutes,
  warning,
  eyebrow = "Security Verification",
}) =>
  buildEmail({
    eyebrow,
    title,
    preview: "Use this AirMS one-time code to continue.",
    text: `${intro} OTP: ${otp}. This code expires in ${validityMinutes} minutes.`,
    children: `
      <p style="margin: 0 0 18px; font-size: 15px; line-height: 1.7;">${escapeHtml(intro)}</p>
      <div style="background: #eef7f4; border: 1px solid #b7ddd3; border-radius: 8px; padding: 18px; text-align: center; color: ${palette.primaryDark}; font-size: 32px; font-weight: 700; letter-spacing: 6px;">
        ${escapeHtml(otp)}
      </div>
      <p style="margin: 18px 0 0; font-size: 14px; line-height: 1.7;">This code expires in <strong>${escapeHtml(validityMinutes)} minutes</strong>.</p>
      <p style="margin: 12px 0 0; color: ${palette.muted}; font-size: 12px; line-height: 1.6;">${escapeHtml(warning)}</p>
    `,
  });

const getAlertActor = (actor) => {
  if (!actor) return "";
  const username = actor.username || actor.name || "Unknown";
  const email = actor.email ? ` (${actor.email})` : "";
  return `${username}${email}`;
};

const buildSecurityAlertEmail = ({ alert, admin }) => {
  const severity = alert.severity || "WARNING";
  const createdAt = alert.createdAt
    ? new Date(alert.createdAt).toLocaleString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "N/A";

  return buildEmail({
    eyebrow: "Security Alert",
    title: alert.title || "AirMS Security Alert",
    preview: `A ${severity} security alert needs review.`,
    tone: severity === "CRITICAL" ? "danger" : "default",
    text: `Security alert for ${admin?.username || "administrator"}: ${alert.title}. Severity: ${severity}. ${alert.description || ""}`,
    children: `
      <p style="margin: 0 0 18px; font-size: 15px; line-height: 1.7;">Hello <strong>${escapeHtml(admin?.firstName || admin?.username || "Admin")}</strong>,</p>
      <p style="margin: 0 0 18px; font-size: 15px; line-height: 1.7;">AirMS recorded a security event that may require administrative review.</p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 18px 0; border-collapse: collapse; border-top: 1px solid ${palette.border}; border-bottom: 1px solid ${palette.border};">
        ${renderDetailRow("Severity", severity)}
        ${renderDetailRow("Description", alert.description)}
        ${renderDetailRow("Affected User", getAlertActor(alert.affectedUser))}
        ${renderDetailRow("Triggered By", getAlertActor(alert.triggeredBy))}
        ${renderDetailRow("IP Address", alert.details?.ipAddress)}
        ${renderDetailRow("Time", createdAt)}
      </table>
      <div style="background: ${severity === "CRITICAL" ? "#fff1f0" : palette.warningBg}; border: 1px solid ${severity === "CRITICAL" ? "#ffa39e" : palette.warningBorder}; border-radius: 6px; padding: 12px 14px; color: ${palette.text}; font-size: 13px; line-height: 1.6;">
        Please review this alert and take appropriate action if necessary.
      </div>
    `,
  });
};

module.exports = {
  buildActivationEmail,
  buildOtpEmail,
  buildSecurityAlertEmail,
};
