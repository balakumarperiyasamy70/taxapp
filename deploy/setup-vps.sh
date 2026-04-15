#!/bin/bash
# Run once on fresh Bluehost VPS to set up the server
# Usage: bash setup-vps.sh

set -e

echo "==> Installing system packages..."
sudo apt update && sudo apt install -y \
    nginx postgresql postgresql-contrib \
    python3 python3-pip python3-venv \
    nodejs npm git certbot python3-certbot-nginx

echo "==> Creating app directories..."
sudo mkdir -p /var/www/taxapp/backend
sudo mkdir -p /var/www/taxapp/frontend-extension/dist
sudo mkdir -p /var/www/taxapp/frontend-filing/dist
sudo mkdir -p /var/www/taxapp/frontend-loan/dist
sudo mkdir -p /var/taxapp/uploads
sudo chown -R $USER:$USER /var/www/taxapp /var/taxapp

echo "==> Creating bare git repo..."
sudo mkdir -p /var/repo/taxapp.git
sudo chown -R $USER:$USER /var/repo/taxapp.git
git init --bare /var/repo/taxapp.git
cp /var/repo/taxapp.git/hooks/post-receive.sample /var/repo/taxapp.git/hooks/post-receive || true
chmod +x /var/repo/taxapp.git/hooks/post-receive

echo "==> Setting up Python venv..."
python3 -m venv /var/www/taxapp/backend/venv

echo "==> Setting up PostgreSQL..."
sudo -u postgres psql -c "CREATE USER taxapp_user WITH PASSWORD 'CHANGE_ME';" || true
sudo -u postgres psql -c "CREATE DATABASE taxapp_db OWNER taxapp_user;" || true

echo "==> Configuring Nginx..."
sudo cp /var/www/taxapp/backend/../nginx.conf /etc/nginx/sites-available/taxapp
sudo ln -sf /etc/nginx/sites-available/taxapp /etc/nginx/sites-enabled/taxapp
sudo nginx -t && sudo systemctl reload nginx

echo "==> Getting SSL certificate..."
sudo certbot --nginx -d fileextension.taxrefundloan.us \
    -d taxfiling.taxrefundloan.us \
    -d loan.taxrefundloan.us

echo "==> Creating systemd service for backend..."
sudo tee /etc/systemd/system/taxapp-backend.service > /dev/null <<EOF
[Unit]
Description=TaxApp FastAPI Backend
After=network.target postgresql.service

[Service]
User=$USER
WorkingDirectory=/var/www/taxapp/backend
ExecStart=/var/www/taxapp/backend/venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
Restart=always
EnvironmentFile=/var/www/taxapp/backend/.env

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable taxapp-backend
sudo systemctl start taxapp-backend

echo "==> Setup complete!"
echo "    Add git remote on local: git remote add vps ssh://USER@YOUR_VPS_IP/var/repo/taxapp.git"
