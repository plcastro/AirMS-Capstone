import os
import smtplib
from email.message import EmailMessage


def send_email(to, subject, text=None, html=None):
    if not to:
        raise ValueError("No recipient defined for email")

    host = os.getenv("EMAIL_HOST")
    port = int(os.getenv("EMAIL_PORT", "587"))
    user = os.getenv("EMAIL_USER")
    password = os.getenv("EMAIL_PASS")

    missing = [
        name
        for name, value in {
            "EMAIL_HOST": host,
            "EMAIL_USER": user,
            "EMAIL_PASS": password,
        }.items()
        if not value
    ]
    if missing:
        raise RuntimeError(f"Missing email environment variables: {', '.join(missing)}")

    message = EmailMessage()
    message["From"] = f"AirMS Support <{user}>"
    message["To"] = to
    message["Subject"] = subject
    message.set_content(text or "")
    if html:
        message.add_alternative(html, subtype="html")

    if port == 465:
        with smtplib.SMTP_SSL(host, port, timeout=10) as smtp:
            smtp.login(user, password)
            smtp.send_message(message)
        return

    with smtplib.SMTP(host, port, timeout=10) as smtp:
        smtp.starttls()
        smtp.login(user, password)
        smtp.send_message(message)


def send_login_otp_email(to, otp):
    send_email(
        to=to,
        subject="Your AirMS Login Verification Code",
        text=f"Use this one-time code to complete your sign in: {otp}. This code expires in 10 minutes.",
        html=f"""
        <div style="font-family: Arial, sans-serif; max-width: 560px; margin: auto; color: #1f2937;">
          <h2 style="color:#26866f;">AirMS 2FA Verification</h2>
          <p>Use this one-time code to complete your sign in:</p>
          <div style="background:#f3f4f6;padding:18px;border-radius:8px;text-align:center;letter-spacing:6px;font-size:30px;font-weight:700;color:#111827;">
            {otp}
          </div>
          <p style="margin-top:16px;">This code expires in 10 minutes.</p>
          <p style="font-size:12px;color:#6b7280;">If you did not attempt to log in, please contact your administrator.</p>
        </div>
        """,
    )


def send_password_reset_otp_email(to, otp):
    send_email(
        to=to,
        subject="Your AirMS Password Reset Code",
        text=f"Use this one-time code to reset your password: {otp}. This code expires in 10 minutes.",
        html=f"""
        <div style="font-family: Arial, sans-serif; max-width: 560px; margin: auto; color: #1f2937;">
          <h2 style="color:#26866f;">AirMS Password Reset</h2>
          <p>Use this one-time code to reset your password:</p>
          <div style="background:#f3f4f6;padding:18px;border-radius:8px;text-align:center;letter-spacing:6px;font-size:30px;font-weight:700;color:#111827;">
            {otp}
          </div>
          <p style="margin-top:16px;">This code expires in 10 minutes.</p>
          <p style="font-size:12px;color:#6b7280;">If you did not request this, please contact your administrator.</p>
        </div>
        """,
    )
