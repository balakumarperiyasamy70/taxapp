#!/bin/bash
# Run ONCE on VPS to create noreply@taxrefundloan.us in iRedMail
# Usage: bash /opt/taxapp/repo/deploy/setup-taxemail.sh

set -e

SMTP_PASS="TaxNoreply2024!"

echo "==> Generating password hash..."
NOREPLY_PASS=$(doveadm pw -s SHA512-CRYPT -p "$SMTP_PASS")

echo "==> Adding taxrefundloan.us domain to vmail..."
mysql -u root vmail -e "
INSERT INTO domain (domain, description, transport, backupmx, maxquota, quota, active, created, modified)
VALUES ('taxrefundloan.us', 'TaxRefundLoan', 'dovecot', 0, 0, 0, 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE modified=NOW();"

echo "==> Adding noreply@taxrefundloan.us mailbox..."
mysql -u root vmail -e "
INSERT INTO mailbox (username, password, name, language, first_name, last_name,
  mobile, telephone, recovery_email, maildir, quota, domain, transport,
  department, employeeid, passwordlastchange, created, modified)
VALUES (
  'noreply@taxrefundloan.us', '$NOREPLY_PASS', 'No Reply TaxRefundLoan',
  'en', 'No', 'Reply', '', '', '',
  'taxrefundloan.us/n/o/r/noreply-$(date +%Y%m%d%H%M%S)/',
  1024, 'taxrefundloan.us', 'dovecot', '', '', NOW(), NOW(), NOW()
) ON DUPLICATE KEY UPDATE modified=NOW();"

echo "==> Adding alias..."
mysql -u root vmail -e "
INSERT INTO alias (address, goto, domain, active, created, modified)
VALUES ('noreply@taxrefundloan.us', 'noreply@taxrefundloan.us', 'taxrefundloan.us', 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE modified=NOW();"

echo "==> Adding DB columns for password reset..."
psql -U taxapp_user -d taxapp_db -c "
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR;
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMPTZ;"

echo "==> Updating .env with SMTP settings..."
ENV_FILE=/opt/taxapp/backend/.env
grep -q "^SMTP_PASSWORD=" "$ENV_FILE" \
  && sed -i "s/^SMTP_PASSWORD=.*/SMTP_PASSWORD=$SMTP_PASS/" "$ENV_FILE" \
  || echo "SMTP_PASSWORD=$SMTP_PASS" >> "$ENV_FILE"

grep -q "^FRONTEND_BASE_URL=" "$ENV_FILE" \
  && sed -i "s|^FRONTEND_BASE_URL=.*|FRONTEND_BASE_URL=https://loan.taxrefundloan.us|" "$ENV_FILE" \
  || echo "FRONTEND_BASE_URL=https://loan.taxrefundloan.us" >> "$ENV_FILE"

echo "==> Restarting backend..."
systemctl restart taxapp-backend

echo ""
echo "============================================"
echo " Setup complete!"
echo "============================================"
echo ""
echo " Verify mailbox:"
echo "   mysql -u root vmail -e \"SELECT username, domain, active FROM mailbox WHERE domain='taxrefundloan.us';\""
echo ""
echo " Test SMTP:"
echo "   echo 'Test email' | mail -s 'Test' -r noreply@taxrefundloan.us bala@trilokinc.com"
echo "============================================"
