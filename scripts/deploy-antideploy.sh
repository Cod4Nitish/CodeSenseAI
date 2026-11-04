#!/usr/bin/env bash
# Package CodeSense AI (no secrets, no node_modules/.venv/db files) and deploy to Antideploy.
# Usage: bash scripts/deploy-antideploy.sh        (token is read from ~/.antideploy/config.json, never printed)
set -euo pipefail
cd "$(dirname "$0")/.."
APP_ID=$(sed -n 's/.*"applicationId"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' .antideploy.json)
TOKEN=$(sed -n 's/.*"token"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' ~/.antideploy/config.json)
[ -n "$APP_ID" ] && [ -n "$TOKEN" ] || { echo "missing .antideploy.json or ~/.antideploy/config.json"; exit 1; }
tar czf - \
  --exclude=.git --exclude=node_modules --exclude=.venv --exclude=__pycache__ \
  --exclude=dist --exclude='*.db' --exclude='*.db-shm' --exclude='*.db-wal' \
  --exclude=.env --exclude='*.env' --exclude=.pytest_cache --exclude=backend/tests \
  --exclude=backend/eval --exclude='*.apk' . \
| curl -sS -X POST "https://antideploy.com/api/v1/deploy?applicationId=$APP_ID" \
    -H "authorization: Bearer $TOKEN" -F "archive=@-"
echo
