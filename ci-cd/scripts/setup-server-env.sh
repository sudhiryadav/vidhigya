#!/bin/bash
# Deprecated helper kept for compatibility.
# Production deploy now uses app-local .env files directly.

set -e

echo "setup-server-env.sh is deprecated."
echo "Use CI File variables WEB_ENV_FILE, BACKEND_ENV_FILE, and AI_ENV_FILE."
echo "These are uploaded directly to apps/*/.env during deployment."
