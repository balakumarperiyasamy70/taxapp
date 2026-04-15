#!/bin/bash
# Run ONCE on Bluehost VPS to prepare the server.
# After this, all deploys happen via: git push vps master
# Usage: bash setup-vps.sh

set -e

echo "==> Installing system packages..."
sudo apt update && sudo apt install -y \
    nginx postgresql postgresql-contrib \
    python3 python3-pip python3-venv \
    git certbot python3-certbot-nginx curl

echo "==> Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

echo "==> Creating app directories..."
sudo mkdir -p /var/www/taxapp/backend
sudo mkdir -p /var/www/taxapp/frontend-extension/dist
sudo mkdir -p /var/www/taxapp/frontend-filing/dist
sudo mkdir -p /var/www/taxapp/frontend-loan/dist
sudo mkdir -p /var/taxapp/uploads
sudo chown -R $USER:$USER /var/www/taxapp /var/taxapp

echo "==> Setting up Python venv..."
python3 -m venv /var/www/taxapp/backend/venv

echo "==> Setting up PostgreSQL..."
sudo -u postgres psql -c "CREATE USER taxapp_user WITH PASSWORD 'CHANGE_ME_NOW';" || true
sudo -u postgres psql -c "CREATE DATABASE taxapp_db OWNER taxapp_user;" || true

echo "==> Creating bare git repo..."
mkdir -p /var/repo/taxapp.git
git init --bare /var/repo/taxapp.git

echo "==> Installing post-receive deploy hook..."
cat > /var/repo/taxapp.git/hooks/post-receive << 'HOOK'
#!/bin/bash
set -e

WORK_TREE="/tmp/taxapp-deploy"
GIT_DIR="/var/repo/taxapp.git"

echo "==> Deploying TaxApp..."
rm -rf $WORK_TREE
git --work-tree=$WORK_TREE --git-dir=$GIT_DIR checkout -f master

# Backend
echo "==> Updating backend..."
rsync -a --delete $WORK_TREE/backend/ /var/www/taxapp/backend/
cd /var/www/taxapp/backend
source venv/bin/activate
pip install -r requirements.txt -q
alembic upgrade head 2>/dev/null || echo "  (skipping migrations — alembic not yet configured)"
deactivate

# Frontend: extension
echo "==> Building frontend-extension..."
cd $WORK_TREE/frontend
npm ci --silent
VITE_SITE=extension npx vite build --outDir /var/www/taxapp/frontend-extension/dist --emptyOutDir

# Frontend: filing
echo "==> Building frontend-filing..."
VITE_SITE=filing npx vite build --outDir /var/www/taxapp/frontend-filing/dist --emptyOutDir

# Frontend: loan
echo "==> Building frontend-loan..."
VITE_SITE=loan npx vite build --outDir /var/www/taxapp/frontend-loan/dist --emptyOutDir

# Restart backend
echo "==> Restarting backend..."
sudo systemctl restart taxapp-backend

# Reload Nginx
sudo systemctl reload nginx

echo "==> Deploy complete!"
HOOK

chmod +x /var/repo/taxapp.git/hooks/post-receive

echo "==> Configuring Nginx..."
sudo cp ~/setup-vps.sh /dev/null 2>/dev/null || true  # no-op placeholder
# Nginx config will be deployed on first git push
# For now create a minimal placeholder
sudo tee /etc/nginx/sites-available/taxapp > /dev/null << 'NGINX'
server {
    listen 80;
    server_name fileextension.taxrefundloan.us taxfiling.taxrefundloan.us loan.taxrefundloan.us;
    return 200 "TaxApp coming soon";
    add_header Content-Type text/plain;
}
NGINX
sudo ln -sf /etc/nginx/sites-available/taxapp /etc/nginx/sites-enabled/taxapp
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

echo "==> Getting SSL certificates..."
sudo certbot --nginx \
    -d fileextension.taxrefundloan.us \
    -d taxfiling.taxrefundloan.us \
    -d loan.taxrefundloan.us \
    --agree-tos --redirect

echo "==> Creating systemd service for backend..."
sudo tee /etc/systemd/system/taxapp-backend.service > /dev/null << 'SERVICE'
[Unit]
Description=TaxApp FastAPI Backend
After=network.target postgresql.service

[Service]
User=root
WorkingDirectory=/var/www/taxapp/backend
ExecStart=/var/www/taxapp/backend/venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
Restart=always
EnvironmentFile=/var/www/taxapp/backend/.env

[Install]
WantedBy=multi-user.target
SERVICE

sudo systemctl daemon-reload
sudo systemctl enable taxapp-backend
# NOTE: backend starts automatically after first git push deploys the code

echo ""
echo "============================================"
echo " VPS setup complete!"
echo "============================================"
echo ""
echo " Next — on your LOCAL machine run:"
echo "   cd taxapp"
echo "   git remote add vps ssh://root@129.121.85.32/var/repo/taxapp.git"
echo "   git push vps master"
echo ""
echo " That will trigger the post-receive hook and deploy everything."
echo ""
echo " IMPORTANT: Before first push, create .env on VPS:"
echo "   nano /var/www/taxapp/backend/.env"
echo "============================================"
