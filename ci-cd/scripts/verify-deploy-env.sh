#!/usr/bin/env bash
# Fail if any listed key is missing or has an empty value in a KEY=VALUE .env file.
# Usage: verify-deploy-env.sh /path/to/.env KEY1 KEY2 ...
set -euo pipefail

if [ "$#" -lt 2 ]; then
  echo "usage: $0 <env-file> <key> [key ...]"
  exit 2
fi

ENV_FILE="$1"
shift

if [ ! -f "$ENV_FILE" ]; then
  echo "verify-deploy-env: file not found: $ENV_FILE"
  exit 1
fi

_strip_value() {
  # shellcheck disable=SC2001
  echo "$1" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' \
    -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//" | tr -d '\r'
}

_value_for_key() {
  local key="$1"
  local line raw val
  line=$(grep -E "^[[:space:]]*(export[[:space:]]+)?${key}=" "$ENV_FILE" | tail -n1 || true)
  [ -z "$line" ] && return 1
  raw="${line#*=}"
  # Drop inline comment (naive: only if # not inside quotes — good enough for deploy keys)
  raw="${raw%%#*}"
  val=$(_strip_value "$raw")
  [ -n "$val" ]
}

missing=()
for k in "$@"; do
  if ! _value_for_key "$k"; then
    missing+=("$k")
  fi
done

if [ "${#missing[@]}" -gt 0 ]; then
  echo "verify-deploy-env: missing or empty in $ENV_FILE:"
  printf '  - %s\n' "${missing[@]}"
  exit 1
fi

echo "verify-deploy-env: OK ($ENV_FILE, $# keys checked)"
