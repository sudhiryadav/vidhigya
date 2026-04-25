#!/bin/bash
# Copies repo env templates to server-level env files.
# Run on server from repo root:
#   bash ci-cd/scripts/setup-server-env.sh prod

set -e

ENV=${1:-prod}
REPO_DIR=${REPO_DIR:-/home/ubuntu/prod/vidhigya}
ENV_DIR=${ENV_DIR:-/home/ubuntu}
PREFIX="$([ "$ENV" = "prod" ] && echo "prod" || echo "staging").vidhigya"

mkdir -p "$ENV_DIR"

copy_if_exists() {
  local src=$1
  local dest=$2
  if [ -f "$src" ]; then
    cp "$src" "$dest"
    echo "Copied $src -> $dest"
  else
    echo "Missing $src (skipped)"
  fi
}

if [ "$ENV" = "prod" ]; then
  copy_if_exists "$REPO_DIR/apps/web/.env.prod" "$ENV_DIR/${PREFIX}.web.env"
  copy_if_exists "$REPO_DIR/apps/backend/.env.prod" "$ENV_DIR/${PREFIX}.backend.env"
else
  copy_if_exists "$REPO_DIR/apps/web/.env.staging" "$ENV_DIR/${PREFIX}.web.env"
  copy_if_exists "$REPO_DIR/apps/backend/.env.staging" "$ENV_DIR/${PREFIX}.backend.env"
fi

echo "Done."
