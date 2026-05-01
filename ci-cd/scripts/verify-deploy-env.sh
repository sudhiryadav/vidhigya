#!/usr/bin/env bash
# Fail if any listed key is missing or empty in KEY=VALUE .env files.
#
# Usage — require ALL keys present:
#   verify-deploy-env.sh /path/to/.env KEY1 KEY2 ...
#
# Usage — require at least ONE key present (--any-of):
#   verify-deploy-env.sh --any-of /path/to/.env KEY_A KEY_B
#
set -euo pipefail

_strip_value() {
  # shellcheck disable=SC2001
  echo "$1" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' \
    -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//" | tr -d '\r'
}

_value_nonempty() {
  local key="$1"
  local line raw val
  line=$(grep -E "^[[:space:]]*(export[[:space:]]+)?${key}=" "$ENV_FILE" | tail -n1 || true)
  [ -z "$line" ] && return 1
  raw="${line#*=}"
  raw="${raw%%#*}"
  val=$(_strip_value "$raw")
  [ -n "$val" ]
}

if [ "${1:-}" = "--any-of" ]; then
  shift
  if [ "$#" -lt 2 ]; then
    echo "usage: $0 --any-of <env-file> <key> [key ...]"
    exit 2
  fi
  ENV_FILE="$1"
  shift
  if [ ! -f "$ENV_FILE" ]; then
    echo "verify-deploy-env: file not found: $ENV_FILE"
    exit 1
  fi
  for k in "$@"; do
    if _value_nonempty "$k"; then
      echo "verify-deploy-env: OK — at least one of [$*] is set in $ENV_FILE ($k)"
      exit 0
    fi
  done
  echo "verify-deploy-env: missing ALL of [--any-of] in $ENV_FILE:"
  printf '  - %s\n' "$@"
  exit 1
fi

if [ "$#" -lt 2 ]; then
  echo "usage: $0 [--any-of] <env-file> <key> [key ...]"
  exit 2
fi

ENV_FILE="$1"
shift

if [ ! -f "$ENV_FILE" ]; then
  echo "verify-deploy-env: file not found: $ENV_FILE"
  exit 1
fi

missing=()
for k in "$@"; do
  if ! _value_nonempty "$k"; then
    missing+=("$k")
  fi
done

if [ "${#missing[@]}" -gt 0 ]; then
  echo "verify-deploy-env: missing or empty in $ENV_FILE:"
  printf '  - %s\n' "${missing[@]}"
  exit 1
fi

echo "verify-deploy-env: OK ($ENV_FILE, $# keys checked)"
