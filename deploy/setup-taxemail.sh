#!/bin/bash
# Run ONCE on VPS to create all taxrefundloan.us email accounts in iRedMail
# Usage: bash /opt/taxapp/repo/deploy/setup-taxemail.sh

set -e

DOMAIN="taxrefundloan.us"
DEFAULT_PASS="TaxMail2024!"
FORWARD_TO="Balakumar.Periyasamy@gmail.com"

add_mailbox() {
  local USER="$1"
  local FULL_NAME="$2"
  local FIRST="$3"
  local LAST="$4"
  local PASS="${5:-$DEFAULT_PASS}"
  local EMAIL="${USER}@${DOMAIN}"

  local A="${USER:0:1}"
  local B="${USER:1:1}"
  local C="${USER:2:1}"
  local HASH=$(doveadm pw -s SHA512-CRYPT -p "$PASS")

  echo "  Adding mailbox: ${EMAIL}..."
  mysql -u root vmail -e "
  INSERT INTO mailbox (username, password, name, language, first_name, last_name,
    mobile, telephone, recovery_email, maildir, quota, domain, transport,
    department, employeeid, passwordlastchange, created, modified)
  VALUES (
    '${EMAIL}', '${HASH}', '${FULL_NAME}',
    'en', '${FIRST}', '${LAST}', '', '', '',
    '${DOMAIN}/${A}/${B}/${C}/${USER}-$(date +%Y%m%d%H%M%S)/',
    1024, '${DOMAIN}', 'dovecot', '', '', NOW(), NOW(), NOW()
  ) ON DUPLICATE KEY UPDATE modified=NOW();"

  echo "  Adding forwarding: ${EMAIL} -> self + ${FORWARD_TO}..."
  # Self-reference (required by iRedMail)
  mysql -u root vmail -e "
  INSERT INTO forwardings (address, forwarding, domain, dest_domain, is_maillist, is_list, is_forwarding, is_alias, active)
  VALUES ('${EMAIL}', '${EMAIL}', '${DOMAIN}', '${DOMAIN}', 0, 0, 1, 0, 1)
  ON DUPLICATE KEY UPDATE active=1;"

  # Forward to Gmail
  mysql -u root vmail -e "
  INSERT INTO forwardings (address, forwarding, domain, dest_domain, is_maillist, is_list, is_forwarding, is_alias, active)
  VALUES ('${EMAIL}', '${FORWARD_TO}', '${DOMAIN}', 'gmail.com', 0, 0, 1, 0, 1)
  ON DUPLICATE KEY UPDATE active=1;"
}

echo "==> Adding ${DOMAIN} domain to vmail..."
mysql -u root vmail -e "
INSERT INTO domain (domain, description, transport, backupmx, maxquota, quota, active, created, modified)
VALUES ('${DOMAIN}', 'TaxRefundLoan', 'dovecot', 0, 0, 0, 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE modified=NOW();"

echo "==> Adding mailboxes and forwarding..."
#           user              full name                    first       last            password
add_mailbox "noreply"        "No Reply TaxRefundLoan"     "No"        "Reply"         "TaxNoreply2024!"
add_mailbox "info"           "Info TaxRefundLoan"         "Info"      "TaxRefundLoan"
add_mailbox "support"        "Support TaxRefundLoan"      "Support"   "TaxRefundLoan"
add_mailbox "admin"          "Admin TaxRefundLoan"        "Admin"     "TaxRefundLoan"
add_mailbox "fileextension"  "File Extension"             "File"      "Extension"
add_mailbox "taxfiling"      "Tax Filing"                 "Tax"       "Filing"
add_mailbox "refund"         "Refund TaxRefundLoan"       "Refund"    "TaxRefundLoan"

echo "==> Adding DB columns for password reset..."
psql -U taxapp_user -d taxapp_db -c "
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR;
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMPTZ;"

echo "==> Updating .env with SMTP settings..."
ENV_FILE=/opt/taxapp/backend/.env
grep -q "^SMTP_PASSWORD=" "$ENV_FILE" \
  && sed -i "s/^SMTP_PASSWORD=.*/SMTP_PASSWORD=TaxNoreply2024!/" "$ENV_FILE" \
  || echo "SMTP_PASSWORD=TaxNoreply2024!" >> "$ENV_FILE"

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
echo " Accounts created (all forward to ${FORWARD_TO}):"
echo "   noreply@${DOMAIN}       pass: TaxNoreply2024!"
echo "   info@${DOMAIN}          pass: $DEFAULT_PASS"
echo "   support@${DOMAIN}       pass: $DEFAULT_PASS"
echo "   admin@${DOMAIN}         pass: $DEFAULT_PASS"
echo "   fileextension@${DOMAIN} pass: $DEFAULT_PASS"
echo "   taxfiling@${DOMAIN}     pass: $DEFAULT_PASS"
echo "   refund@${DOMAIN}        pass: $DEFAULT_PASS"
echo ""
echo " Verify mailboxes:"
echo "   mysql -u root vmail -e \"SELECT username, active FROM mailbox WHERE domain='${DOMAIN}';\""
echo " Verify forwardings:"
echo "   mysql -u root vmail -e \"SELECT address, forwarding FROM forwardings WHERE domain='${DOMAIN}';\""
echo "============================================"
