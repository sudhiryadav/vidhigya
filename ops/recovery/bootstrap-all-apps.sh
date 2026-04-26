#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="${1:-$SCRIPT_DIR/recovery.config.sh}"

if [[ ! -f "$CONFIG_FILE" ]]; then
  echo "Missing config file: $CONFIG_FILE"
  echo "Create it from: $SCRIPT_DIR/recovery.config.example.sh"
  exit 1
fi

# shellcheck source=/dev/null
source "$CONFIG_FILE"

required_vars=(
  SSH_HOST
  QURIEUS_DOMAIN
  QURIEUS_DOMAIN_WWW
  MYFLATMATE_DOMAIN
  MYFLATMATE_DOMAIN_WWW
  VIDHIGYA_DOMAIN
  ENV_QURIEUS_BACKEND
  ENV_QURIEUS_FRONTEND
  ENV_QURIEUS_BOT
  ENV_MYFLATMATE_BACKEND
  ENV_MYFLATMATE_FRONTEND
  ENV_VIDHIGYA_BACKEND
  ENV_VIDHIGYA_WEB
)

for v in "${required_vars[@]}"; do
  if [[ -z "${!v:-}" ]]; then
    echo "Config variable is required: $v"
    exit 1
  fi
done

required_env_files=(
  "$ENV_QURIEUS_BACKEND"
  "$ENV_QURIEUS_FRONTEND"
  "$ENV_QURIEUS_BOT"
  "$ENV_MYFLATMATE_BACKEND"
  "$ENV_MYFLATMATE_FRONTEND"
  "$ENV_VIDHIGYA_BACKEND"
  "$ENV_VIDHIGYA_WEB"
)

for f in "${required_env_files[@]}"; do
  if [[ ! -f "$f" ]]; then
    echo "Env source file not found: $f"
    exit 1
  fi
done

echo "Uploading production env files to $SSH_HOST..."
scp "$ENV_QURIEUS_BACKEND" "$SSH_HOST:/home/ubuntu/prod.qurieus.backend.env"
scp "$ENV_QURIEUS_FRONTEND" "$SSH_HOST:/home/ubuntu/prod.qurieus.frontend.env"
scp "$ENV_QURIEUS_BOT" "$SSH_HOST:/home/ubuntu/prod.qurieus.bot.env"
scp "$ENV_MYFLATMATE_BACKEND" "$SSH_HOST:/home/ubuntu/prod.myflatmate.backend.env"
scp "$ENV_MYFLATMATE_FRONTEND" "$SSH_HOST:/home/ubuntu/prod.myflatmate.frontend.env"
scp "$ENV_VIDHIGYA_BACKEND" "$SSH_HOST:/home/ubuntu/prod.vidhigya.backend.env"
scp "$ENV_VIDHIGYA_WEB" "$SSH_HOST:/home/ubuntu/prod.vidhigya.web.env"

echo "Running remote bootstrap..."
ssh "$SSH_HOST" \
  "QURIEUS_DOMAIN='$QURIEUS_DOMAIN' \
   QURIEUS_DOMAIN_WWW='$QURIEUS_DOMAIN_WWW' \
   MYFLATMATE_DOMAIN='$MYFLATMATE_DOMAIN' \
   MYFLATMATE_DOMAIN_WWW='$MYFLATMATE_DOMAIN_WWW' \
   VIDHIGYA_DOMAIN='$VIDHIGYA_DOMAIN' \
   ENABLE_CERTBOT='${ENABLE_CERTBOT:-false}' \
   CERTBOT_EMAIL='${CERTBOT_EMAIL:-}' \
   GITLAB_DEPLOY_USER='${GITLAB_DEPLOY_USER:-}' \
   GITLAB_DEPLOY_TOKEN='${GITLAB_DEPLOY_TOKEN:-}' \
   bash -s" <<'REMOTE_SCRIPT'
set -euo pipefail

export HOME=/home/ubuntu
export PM2_HOME=/home/ubuntu/.pm2

sudo apt-get update -y
sudo apt-get install -y git rsync nginx certbot python3-certbot-nginx build-essential curl

if [[ ! -d "/home/ubuntu/.nvm" ]]; then
  curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
fi

export NVM_DIR="/home/ubuntu/.nvm"
# shellcheck source=/dev/null
source "$NVM_DIR/nvm.sh"
nvm install 20
nvm use 20

npm install -g yarn pm2

if ! systemctl is-enabled pm2-ubuntu >/dev/null 2>&1; then
  pm2 startup systemd -u ubuntu --hp /home/ubuntu || true
fi

mkdir -p /home/ubuntu/prod

repo_url() {
  local ssh_url="$1"
  local https_url="$2"
  if [[ -n "${GITLAB_DEPLOY_USER:-}" && -n "${GITLAB_DEPLOY_TOKEN:-}" ]]; then
    echo "https://${GITLAB_DEPLOY_USER}:${GITLAB_DEPLOY_TOKEN}@${https_url}"
  else
    echo "$ssh_url"
  fi
}

clone_or_update() {
  local repo_url="$1"
  local target="$2"
  local branch="$3"
  if [[ ! -d "$target/.git" ]]; then
    git clone --branch "$branch" "$repo_url" "$target"
  else
    git -C "$target" fetch origin
    git -C "$target" checkout "$branch"
    git -C "$target" reset --hard "origin/$branch"
  fi
}

QURIEUS_REPO="$(repo_url \
  'git@gitlab.com:frontslash/apps/qurieus.git' \
  'gitlab.com/frontslash/apps/qurieus.git')"
MYFLATMATE_REPO="$(repo_url \
  'git@gitlab.com:frontslash/apps/roommate-matcher.git' \
  'gitlab.com/frontslash/apps/roommate-matcher.git')"
VIDHIGYA_REPO="$(repo_url \
  'git@gitlab.com:frontslash/apps/vidhigya.git' \
  'gitlab.com/frontslash/apps/vidhigya.git')"

clone_or_update "$QURIEUS_REPO" "/home/ubuntu/qurieus" "prod"
clone_or_update "$MYFLATMATE_REPO" "/home/ubuntu/prod/myflatmate" "prod"
clone_or_update "$VIDHIGYA_REPO" "/home/ubuntu/prod/vidhigya" "prod"

chmod +x /home/ubuntu/qurieus/ci-cd/scripts/*.sh || true
chmod +x /home/ubuntu/prod/myflatmate/ci-cd/scripts/*.sh || true
chmod +x /home/ubuntu/prod/vidhigya/ci-cd/scripts/*.sh || true

cat <<EOF | sudo tee /etc/nginx/sites-available/qurieus >/dev/null
server {
    listen 80;
    server_name ${QURIEUS_DOMAIN} ${QURIEUS_DOMAIN_WWW};
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl;
    server_name ${QURIEUS_DOMAIN} ${QURIEUS_DOMAIN_WWW};
    ssl_certificate /etc/letsencrypt/live/${QURIEUS_DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${QURIEUS_DOMAIN}/privkey.pem;

    location /api/v1/ {
        proxy_pass http://127.0.0.1:8001/api/v1/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location / {
        proxy_pass http://127.0.0.1:8000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Forwarded-Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

sudo cp /home/ubuntu/prod/myflatmate/apps/backend/nginx/sites-available/myflatmate \
  /etc/nginx/sites-available/myflatmate
sudo cp /home/ubuntu/prod/vidhigya/apps/backend/nginx/sites-available/vidhigya \
  /etc/nginx/sites-available/vidhigya

sudo ln -sfn /etc/nginx/sites-available/qurieus /etc/nginx/sites-enabled/qurieus
sudo ln -sfn /etc/nginx/sites-available/myflatmate /etc/nginx/sites-enabled/myflatmate
sudo ln -sfn /etc/nginx/sites-available/vidhigya /etc/nginx/sites-enabled/vidhigya
sudo nginx -t
sudo systemctl restart nginx

if [[ "${ENABLE_CERTBOT}" == "true" ]]; then
  certbot_common=(--nginx --non-interactive --agree-tos -m "${CERTBOT_EMAIL}" --redirect)
  sudo certbot "${certbot_common[@]}" -d "${QURIEUS_DOMAIN}" -d "${QURIEUS_DOMAIN_WWW}" || true
  sudo certbot "${certbot_common[@]}" -d "${MYFLATMATE_DOMAIN}" -d "${MYFLATMATE_DOMAIN_WWW}" || true
  sudo certbot "${certbot_common[@]}" -d "${VIDHIGYA_DOMAIN}" || true
fi

cd /home/ubuntu/qurieus
REPO_DIR="/home/ubuntu/qurieus" bash ci-cd/scripts/deploy-from-source.sh prod prod true true true

cd /home/ubuntu/prod/myflatmate
REPO_DIR="/home/ubuntu/prod/myflatmate" bash ci-cd/scripts/deploy-from-source.sh prod prod true true

cd /home/ubuntu/prod/vidhigya
REPO_DIR="/home/ubuntu/prod/vidhigya" bash ci-cd/scripts/deploy-from-source.sh prod prod true true

pm2 install pm2-logrotate || true
pm2 set pm2-logrotate:max_size 20M
pm2 set pm2-logrotate:retain 14
pm2 set pm2-logrotate:compress true
pm2 set pm2-logrotate:rotateInterval "0 0 * * *"
pm2 set pm2-logrotate:workerInterval 30
pm2 save

echo "Bootstrap complete."
df -h /
pm2 list
REMOTE_SCRIPT

echo "Done. Server bootstrap finished for all apps."
