const nodemailer = require("nodemailer");

module.exports = async ({ to, subject, text, html }) => {
  if (!to) throw new Error("No recipient defined for email");

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT),
      secure: Number(process.env.EMAIL_PORT) === 465,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      connectionTimeout: 5000,
    });

    await transporter.verify();

    const info = await transporter.sendMail({
      from: `"AirMS Support" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
      html,
    });

    // console.log("Message sent: %s", info.messageId);

    return info;
  } catch (error) {
    console.error("EMAIL_ERROR_DETAIL:", error);
    throw error;
  }
};
