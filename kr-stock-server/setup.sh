#!/usr/bin/env bash
# One-shot installer for the KR stock quote server on a fresh Ubuntu VM
# (built for Oracle Cloud's Always Free tier). Installs Node.js + Caddy,
# deploys server.js as a systemd service, and sets up automatic HTTPS via
# Caddy + nip.io (no domain purchase needed — nip.io resolves
# "<ip-with-dashes>.nip.io" straight back to that IP).
#
# Usage: run this ON the VM (over SSH), as a user with sudo access:
#   bash setup.sh
set -euo pipefail

REPO_RAW_BASE="https://raw.githubusercontent.com/huhsanghun-dot/my-portfolio-dashboard/claude/asset-dashboard-realtime-65mtee/kr-stock-server"
APP_DIR="/opt/kr-stock-server"
ENV_FILE="/etc/kr-stock-server.env"

echo "=== 1/5 Node.js 20 설치 ==="
if ! command -v node >/dev/null 2>&1 || [[ "$(node -v)" < "v18" ]]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
else
  echo "이미 설치되어 있음: $(node -v)"
fi

echo "=== 2/5 Caddy 설치 (자동 HTTPS용) ==="
if ! command -v caddy >/dev/null 2>&1; then
  sudo apt-get update
  sudo apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
    | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
    | sudo tee /etc/apt/sources.list.d/caddy-stable.list >/dev/null
  sudo apt-get update
  sudo apt-get install -y caddy
else
  echo "이미 설치되어 있음"
fi

echo "=== 3/5 서버 코드 내려받기 ==="
sudo mkdir -p "$APP_DIR"
sudo curl -fsSL "$REPO_RAW_BASE/server.js" -o "$APP_DIR/server.js"

echo "=== 4/5 키움 API 키 입력 ==="
echo "키움 APP KEY를 붙여넣고 Enter:"
read -r KIWOOM_APP_KEY_INPUT
echo "키움 SECRET KEY를 붙여넣고 Enter:"
read -r KIWOOM_SECRET_KEY_INPUT

sudo tee "$ENV_FILE" >/dev/null <<EOF
KIWOOM_APP_KEY=$KIWOOM_APP_KEY_INPUT
KIWOOM_SECRET_KEY=$KIWOOM_SECRET_KEY_INPUT
KIWOOM_DOMAIN=https://api.kiwoom.com
ALLOWED_ORIGIN=https://huhsanghun-dot.github.io
PORT=8080
EOF
sudo chmod 600 "$ENV_FILE"

sudo tee /etc/systemd/system/kr-stock-server.service >/dev/null <<EOF
[Unit]
Description=KR Stock Quote Server
After=network.target

[Service]
EnvironmentFile=$ENV_FILE
ExecStart=/usr/bin/node $APP_DIR/server.js
Restart=always
User=nobody
NoNewPrivileges=true

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable kr-stock-server
sudo systemctl restart kr-stock-server

echo "=== 5/5 HTTPS 설정 (Caddy) ==="
PUBLIC_IP=$(curl -fsSL https://api.ipify.org)
DOMAIN="${PUBLIC_IP//./-}.nip.io"

sudo tee /etc/caddy/Caddyfile >/dev/null <<EOF
$DOMAIN {
  reverse_proxy localhost:8080
}
EOF
sudo systemctl restart caddy

echo ""
echo "=================================================="
echo " 설치 완료!"
echo " 서버 주소: https://$DOMAIN"
echo " 테스트:    https://$DOMAIN/health"
echo " 이 VM의 공인 IP ($PUBLIC_IP) 를 키움 Open API 포털의"
echo " 'IP 주소등록'에도 추가해주세요."
echo "=================================================="
