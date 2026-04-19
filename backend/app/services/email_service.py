import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
from app.config import get_settings


def send_pdf_email(to_email: str, return_type: str, tax_year: int, pdf_bytes: bytes, password: str):
    settings = get_settings()

    subject = f"Your Tax Document — {return_type} ({tax_year}) | TaxRefundLoan.us"

    body = f"""Dear Customer,

Your tax document is attached to this email as a password-protected PDF.

To open the file, use this password:
  {password}

(Your password is: tax year + last 4 digits of your SSN or EIN)

Return Type : {return_type}
Tax Year    : {tax_year}

Please save this document for your records.

If you did not request this document or have any questions, please contact us at:
  support@taxrefundloan.us

— TaxRefundLoan.us Team
"""

    msg = MIMEMultipart()
    msg['From'] = settings.smtp_from
    msg['To'] = to_email
    msg['Subject'] = subject
    msg.attach(MIMEText(body, 'plain'))

    filename = f"TaxReturn_{return_type}_{tax_year}.pdf"
    attachment = MIMEApplication(pdf_bytes, _subtype='pdf')
    attachment.add_header('Content-Disposition', 'attachment', filename=filename)
    msg.attach(attachment)

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
        server.ehlo()
        server.starttls()
        server.login(settings.smtp_user, settings.smtp_password)
        server.sendmail(settings.smtp_from, to_email, msg.as_string())
