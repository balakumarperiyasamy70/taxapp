import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.config import get_settings

settings = get_settings()


def send_email(to: str, subject: str, html_body: str) -> None:
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = settings.smtp_from
    msg["To"] = to
    msg.attach(MIMEText(html_body, "html"))

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
        server.ehlo()
        server.starttls()
        server.login(settings.smtp_user, settings.smtp_password)
        server.sendmail(settings.smtp_from, to, msg.as_string())


def send_password_reset_email(to: str, token: str) -> None:
    reset_url = f"{settings.frontend_base_url}/reset-password?token={token}"
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto">
      <h2 style="color:#e63946">TaxRefundLoan — Password Reset</h2>
      <p>We received a request to reset your password. Click the button below:</p>
      <a href="{reset_url}"
         style="display:inline-block;background:#e63946;color:white;padding:12px 24px;
                border-radius:6px;text-decoration:none;font-weight:600;margin:16px 0">
        Reset My Password
      </a>
      <p style="color:#666;font-size:0.9rem">
        This link expires in <strong>1 hour</strong>. If you didn't request a reset, ignore this email.
      </p>
      <p style="color:#666;font-size:0.85rem">
        Or copy this link: {reset_url}
      </p>
    </div>
    """
    send_email(to, "Reset your TaxRefundLoan password", html)
