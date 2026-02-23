const nodemailer = require("nodemailer");

module.exports = async ({ to, subject, text, html }) => {
  if (!to) throw new Error("No recipient defined for email");

  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT),
    secure: Number(process.env.EMAIL_PORT) === 465, // true for 465, false for 587
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: `"AirMS Support" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    text,
    html,
  });
};
