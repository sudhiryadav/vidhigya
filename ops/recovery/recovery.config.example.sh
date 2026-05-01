#!/usr/bin/env bash
# Copy this file to recovery.config.sh and fill values.

# SSH target used by this script (must be reachable from your machine).
export SSH_HOST="Vidhigya"

# Optional: if set to true, script will request certbot certificates.
export ENABLE_CERTBOT="false"
# Required only when ENABLE_CERTBOT=true.
export CERTBOT_EMAIL="ops@example.com"

# Domains (used for nginx + certbot).
export QURIEUS_DOMAIN="qurieus.com"
export QURIEUS_DOMAIN_WWW="www.qurieus.com"
export MYFLATMATE_DOMAIN="myflatmate.in"
export MYFLATMATE_DOMAIN_WWW="www.myflatmate.in"
export VIDHIGYA_DOMAIN="vidhigya.qurieus.com"

# If you have GitLab deploy credentials for private repos, set them here.
# Leave empty to use git@ SSH URLs on the target server.
export GITLAB_DEPLOY_USER=""
export GITLAB_DEPLOY_TOKEN=""

# Local absolute paths for production env sources.
export ENV_QURIEUS_BACKEND="/absolute/path/to/prod.qurieus.backend.env"
export ENV_QURIEUS_FRONTEND="/absolute/path/to/prod.qurieus.frontend.env"
export ENV_QURIEUS_BOT="/absolute/path/to/prod.qurieus.bot.env"

export ENV_MYFLATMATE_BACKEND="/absolute/path/to/prod.myflatmate.backend.env"
export ENV_MYFLATMATE_FRONTEND="/absolute/path/to/prod.myflatmate.frontend.env"

export ENV_VIDHIGYA_BACKEND="/absolute/path/to/vidhigya.backend.env"
export ENV_VIDHIGYA_WEB="/absolute/path/to/vidhigya.web.env"
