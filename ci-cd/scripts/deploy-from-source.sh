#!/bin/bash
# Git-based deployment - no Docker.
# Usage: ./deploy-from-source.sh <env> <branch> [frontend_changed] [backend_changed]

set -e

# Load nvm for yarn/node in non-interactive SSH sessions.
if [ -f "/home/ubuntu/.nvm/nvm.sh" ]; then
  export NVM_DIR="/home/ubuntu/.nvm"
  set +e
  . "/home/ubuntu/.nvm/nvm.sh"
  nvm use 20 >/dev/null 2>&1 || nvm use 22 >/dev/null 2>&1 || true
  set -e
fi

ENV=${1:-prod}
BRANCH=${2:-prod}
FRONTEND_CHANGED=${3:-true}
BACKEND_CHANGED=${4:-true}

REPO_DIR=${REPO_DIR:-/home/ubuntu/prod/vidhigya}

if [ ! -d "$REPO_DIR" ]; then
  echo "Repo not found at $REPO_DIR"
  exit 1
fi

echo "Deploying Vidhigya to $ENV (branch: $BRANCH)"
echo "Frontend: $FRONTEND_CHANGED | Backend: $BACKEND_CHANGED"

cd "$REPO_DIR"
if [ "$SKIP_GIT_PULL" = "1" ]; then
  echo "Code was rsynced from CI - skipping git pull"
  PREV_HEAD=$(git rev-parse HEAD~1 2>/dev/null || echo "HEAD")
else
  git fetch origin
  git checkout "$BRANCH"
  git pull origin "$BRANCH"
  PREV_HEAD=$(git rev-parse HEAD~1 2>/dev/null || echo "HEAD")
fi

packages_changed() {
  local app_path=$1
  git diff --name-only "$PREV_HEAD" HEAD -- "$app_path/package.json" "yarn.lock" "package.json" 2>/dev/null | grep -q . && echo "yes" || echo "no"
}

needs_backend_rebuild() {
  local dist_file="$REPO_DIR/apps/backend/dist/main.js"
  if [ ! -f "$dist_file" ]; then
    echo "yes"
    return
  fi
  local latest_src
  latest_src=$(find "$REPO_DIR/apps/backend/src" -type f -newer "$dist_file" 2>/dev/null | head -n 1)
  if [ -n "$latest_src" ]; then
    echo "yes"
  else
    echo "no"
  fi
}

# Copy app-specific env files from server.
# Expected server files:
#   /home/ubuntu/prod.vidhigya.web.env
#   /home/ubuntu/prod.vidhigya.backend.env
ENV_DIR="${ENV_DIR:-/home/ubuntu}"
ENV_PREFIX="$([ "$ENV" = "prod" ] && echo "prod" || echo "staging").vidhigya"

sync_server_env_from_repo() {
  local app_dir=$1
  local app_name=$2
  local server_file="$ENV_DIR/${ENV_PREFIX}.${app_name}.env"
  local source_file=""

  if [ "$ENV" = "prod" ]; then
    [ -f "$REPO_DIR/$app_dir/.env.prod" ] && source_file="$REPO_DIR/$app_dir/.env.prod"
  else
    [ -f "$REPO_DIR/$app_dir/.env.staging" ] && source_file="$REPO_DIR/$app_dir/.env.staging"
    [ -z "$source_file" ] && [ -f "$REPO_DIR/$app_dir/.env.stage" ] && source_file="$REPO_DIR/$app_dir/.env.stage"
  fi
  [ -z "$source_file" ] && [ -f "$REPO_DIR/$app_dir/.env.prod" ] && source_file="$REPO_DIR/$app_dir/.env.prod"

  if [ -n "$source_file" ]; then
    cp "$source_file" "$server_file"
    echo "synced $source_file -> $server_file"
  else
    echo "No repo env source found for $app_dir ($ENV). Keeping existing $server_file"
  fi
}

copy_app_env() {
  local app_dir=$1
  local app_name=$2
  local src="$ENV_DIR/${ENV_PREFIX}.${app_name}.env"
  local dest="$REPO_DIR/$app_dir/.env"
  if [ -f "$src" ]; then
    cp "$src" "$dest"
    echo "$app_dir: ${ENV_PREFIX}.${app_name}.env -> .env"
  else
    echo "Missing $src on server"
    exit 1
  fi
}

echo "Copying env files for $ENV..."
sync_server_env_from_repo "apps/web" "web"
sync_server_env_from_repo "apps/backend" "backend"
copy_app_env "apps/web" "web"
copy_app_env "apps/backend" "backend"

if [ "$BACKEND_CHANGED" != "true" ]; then
  BACKEND_STALE=$(needs_backend_rebuild)
  if [ "$BACKEND_STALE" = "yes" ]; then
    echo "Backend dist is stale or missing - forcing backend deploy"
    BACKEND_CHANGED=true
  fi
fi

if [ "$FRONTEND_CHANGED" = "true" ]; then
  echo "Deploying frontend..."
  cd "$REPO_DIR"
  PKG_CHANGED=$(packages_changed "apps/web")
  [ ! -d "node_modules" ] || [ "$PKG_CHANGED" = "yes" ] && yarn install --frozen-lockfile
  yarn workspace vidhigya-frontend build
  pm2 restart vidhigya-frontend --update-env 2>/dev/null || (cd "$REPO_DIR" && REPO_DIR="$REPO_DIR" pm2 start ecosystem.config.cjs --only vidhigya-frontend)
  echo "Frontend deployed"
else
  echo "Skipping frontend"
fi

if [ "$BACKEND_CHANGED" = "true" ]; then
  echo "Deploying backend..."
  cd "$REPO_DIR"
  PKG_CHANGED=$(packages_changed "apps/backend")
  [ ! -d "node_modules" ] || [ "$PKG_CHANGED" = "yes" ] && yarn install --frozen-lockfile
  cd "$REPO_DIR/apps/backend"
  [ ! -d "node_modules" ] || [ "$PKG_CHANGED" = "yes" ] && yarn install --frozen-lockfile
  npx prisma generate
  npx prisma migrate deploy 2>/dev/null || npx prisma db push 2>/dev/null || true
  yarn build
  if [ ! -f "$REPO_DIR/apps/backend/dist/src/main.js" ] && [ -f "$REPO_DIR/apps/backend/dist/main.js" ]; then
    mkdir -p "$REPO_DIR/apps/backend/dist/src"
    cp "$REPO_DIR/apps/backend/dist/main.js" "$REPO_DIR/apps/backend/dist/src/main.js"
  fi
  pm2 restart vidhigya-backend --update-env 2>/dev/null || (cd "$REPO_DIR" && REPO_DIR="$REPO_DIR" pm2 start ecosystem.config.cjs --only vidhigya-backend)
  echo "Backend deployed"
else
  echo "Skipping backend"
fi

pm2 save 2>/dev/null || true
echo "Deployment completed."
