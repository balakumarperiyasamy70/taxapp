#!/bin/bash
# Run ONCE on Bluehost VPS to prepare the server.
# After this, all deploys happen via: git push origin master → ssh → taxapp-deploy
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
sudo mkdir -p /opt/taxapp/backend
sudo mkdir -p /opt/taxapp/frontend-extension/dist
sudo mkdir -p /opt/taxapp/frontend-filing/dist
sudo mkdir -p /opt/taxapp/frontend-loan/dist
sudo mkdir -p /opt/taxapp/uploads
sudo chown -R $USER:$USER /opt/taxapp

echo "==> Setting up Python venv..."
python3 -m venv /opt/taxapp/backend/venv

echo "==> Setting up PostgreSQL..."
sudo -u postgres psql -c "CREATE USER taxapp_user WITH PASSWORD 'CHANGE_ME_NOW';" || true
sudo -u postgres psql -c "CREATE DATABASE taxapp_db OWNER taxapp_user;" || true

echo "==> Cloning repo from GitHub..."
git clone https://github.com/balakumarperiyasamy70/taxapp.git /opt/taxapp/repo

echo "==> Installing deploy script..."
cat > /usr/local/bin/taxapp-deploy << 'DEPLOY'
#!/bin/bash
set -e

echo "==> Pulling latest from GitHub..."
cd /opt/taxapp/repo
git pull origin master

# Backend
echo "==> Updating backend..."
rsync -a --delete /opt/taxapp/repo/backend/ /opt/taxapp/backend/
cd /opt/taxapp/backend
source venv/bin/activate
pip install -r requirements.txt -q
alembic upgrade head 2>/dev/null || echo "  (skipping migrations)"
deactivate

# Frontend: extension
echo "==> Building frontend-extension..."
cd /opt/taxapp/repo/frontend
npm ci --silent
VITE_SITE=extension npx vite build --outDir /opt/taxapp/frontend-extension/dist --emptyOutDir

# Frontend: filing
echo "==> Building frontend-filing..."
VITE_SITE=filing npx vite build --outDir /opt/taxapp/frontend-filing/dist --emptyOutDir

# Frontend: loan
echo "==> Building frontend-loan..."
VITE_SITE=loan npx vite build --outDir /opt/taxapp/frontend-loan/dist --emptyOutDir

# Restart backend
echo "==> Restarting backend..."
systemctl restart taxapp-backend
systemctl reload nginx

echo "==> Deploy complete!"
DEPLOY

chmod +x /usr/local/bin/taxapp-deploy

echo "==> Configuring Nginx..."
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
WorkingDirectory=/opt/taxapp/backend
ExecStart=/opt/taxapp/backend/venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
Restart=always
EnvironmentFile=/opt/taxapp/backend/.env

[Install]
WantedBy=multi-user.target
SERVICE

sudo systemctl daemon-reload
sudo systemctl enable taxapp-backend

echo ""
echo "============================================"
echo " VPS setup complete!"
echo "============================================"
echo ""
echo " IMPORTANT: Create .env before first deploy:"
echo "   cp /opt/taxapp/repo/backend/.env.example /opt/taxapp/backend/.env"
echo "   nano /opt/taxapp/backend/.env"
echo ""
echo " Deployment workflow:"
echo "   1. Local: git push origin master"
echo "   2. VPS:   taxapp-deploy"
echo "============================================"
