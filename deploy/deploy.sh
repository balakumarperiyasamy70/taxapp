#!/bin/bash
# VPS deploy script — run after: git push origin master
# Location on VPS: /opt/taxapp/deploy.sh
# Usage: /opt/taxapp/deploy.sh

set -e

echo "==> Pulling latest from GitHub..."
cd /opt/taxapp/repo
git pull origin master

echo "==> Updating backend..."
rsync -a --delete --exclude='venv/' --exclude='.env' /opt/taxapp/repo/backend/ /opt/taxapp/backend/
cd /opt/taxapp/backend
source venv/bin/activate
pip install -r requirements.txt -q
alembic upgrade head 2>/dev/null || echo "  (no migrations to run)"
deactivate

echo "==> Deploying homepage..."
mkdir -p /opt/taxapp/public
cp -r /opt/taxapp/repo/public/* /opt/taxapp/public/

echo "==> Restarting backend..."
systemctl restart taxapp

echo "==> Reloading Nginx..."
systemctl reload nginx

echo ""
echo "==> Deploy complete!"
