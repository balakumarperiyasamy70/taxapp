#!/bin/bash
# Run ONCE on Bluehost VPS to prepare the server.
# After this, all deploys happen via: git push origin master → ssh → taxapp.conf-deploy
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
sudo mkdir -p /opt/taxapp.conf/backend
sudo mkdir -p /opt/taxapp.conf/frontend-extension/dist
sudo mkdir -p /opt/taxapp.conf/frontend-filing/dist
sudo mkdir -p /opt/taxapp.conf/frontend-loan/dist
sudo mkdir -p /opt/taxapp.conf/uploads
sudo chown -R $USER:$USER /opt/taxapp.conf

echo "==> Setting up Python venv..."
python3 -m venv /opt/taxapp.conf/backend/venv

echo "==> Setting up PostgreSQL..."
sudo -u postgres psql -c "CREATE USER taxapp.conf_user WITH PASSWORD 'CHANGE_ME_NOW';" || true
sudo -u postgres psql -c "CREATE DATABASE taxapp.conf_db OWNER taxapp.conf_user;" || true

echo "==> Cloning repo from GitHub..."
git clone https://github.com/balakumarperiyasamy70/taxapp.conf.git /opt/taxapp.conf/repo

echo "==> Installing deploy script..."
cat > /usr/local/bin/taxapp.conf-deploy << 'DEPLOY'
#!/bin/bash
set -e

echo "==> Pulling latest from GitHub..."
cd /opt/taxapp.conf/repo
git pull origin master

# Backend
echo "==> Updating backend..."
rsync -a --delete --exclude='venv/' --exclude='.env' /opt/taxapp.conf/repo/backend/ /opt/taxapp.conf/backend/
cd /opt/taxapp.conf/backend
source venv/bin/activate
pip install -r requirements.txt -q
alembic upgrade head 2>/dev/null || echo "  (skipping migrations)"
deactivate

# Frontend: extension
echo "==> Building frontend-extension..."
cd /opt/taxapp.conf/repo/frontend
npm ci --silent
VITE_SITE=extension npx vite build --outDir /opt/taxapp.conf/frontend-extension/dist --emptyOutDir

# Frontend: filing
echo "==> Building frontend-filing..."
VITE_SITE=filing npx vite build --outDir /opt/taxapp.conf/frontend-filing/dist --emptyOutDir

# Frontend: loan
echo "==> Building frontend-loan..."
VITE_SITE=loan npx vite build --outDir /opt/taxapp.conf/frontend-loan/dist --emptyOutDir

# Restart backend
echo "==> Restarting backend..."
systemctl restart taxapp.conf-backend
systemctl reload nginx

echo "==> Deploy complete!"
DEPLOY

chmod +x /usr/local/bin/taxapp.conf-deploy

echo "==> Configuring Nginx..."
sudo tee /etc/nginx/sites-available/taxapp.conf > /dev/null << 'NGINX'
server {
    listen 80;
    server_name fileextension.taxrefundloan.us taxfiling.taxrefundloan.us loan.taxrefundloan.us;
    return 200 "TaxApp coming soon";
    add_header Content-Type text/plain;
}
NGINX
sudo ln -sf /etc/nginx/sites-available/taxapp.conf /etc/nginx/sites-enabled/taxapp.conf
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

echo "==> Getting SSL certificates..."
sudo certbot --nginx \
    -d fileextension.taxrefundloan.us \
    -d taxfiling.taxrefundloan.us \
    -d loan.taxrefundloan.us \
    --agree-tos --redirect

echo "==> Creating systemd service for backend..."
sudo tee /etc/systemd/system/taxapp.conf-backend.service > /dev/null << 'SERVICE'
[Unit]
Description=TaxApp FastAPI Backend
After=network.target postgresql.service

[Service]
User=root
WorkingDirectory=/opt/taxapp.conf/backend
ExecStart=/opt/taxapp.conf/backend/venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8003
Restart=always
EnvironmentFile=/opt/taxapp.conf/backend/.env

[Install]
WantedBy=multi-user.target
SERVICE

sudo systemctl daemon-reload
sudo systemctl enable taxapp.conf-backend

echo ""
echo "============================================"
echo " VPS setup complete!"
echo "============================================"
echo ""
echo " IMPORTANT: Create .env before first deploy:"
echo "   cp /opt/taxapp.conf/repo/backend/.env.example /opt/taxapp.conf/backend/.env"
echo "   nano /opt/taxapp.conf/backend/.env"
echo ""
echo " Deployment workflow:"
echo "   1. Local: git push origin master"
echo "   2. VPS:   taxapp.conf-deploy"
echo "============================================"
