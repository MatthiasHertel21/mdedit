#!/usr/bin/env bash
# deploy-prod.sh - Generic local deployment helper.
#
# This script is intentionally free of host-specific paths, domains, and
# production configuration. Provide local deployment details via environment
# variables or untracked files outside the public repository.
#
# Usage:
#   PROD_DIR=/path/to/runtime ./deploy-prod.sh
#   PROD_DIR=/path/to/runtime ./deploy-prod.sh 1.2.3
#   ./deploy-prod.sh --help

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
DEV_DIR="${DEV_DIR:-$SCRIPT_DIR}"
PROD_DIR="${PROD_DIR:-}"
IMAGE_NAME="${IMAGE_NAME:-mdedit-app}"
PROD_COMPOSE_FILE="${PROD_COMPOSE_FILE:-${PROD_DIR:+$PROD_DIR/docker-compose.yml}}"
PROD_HEALTH_URL="${PROD_HEALTH_URL:-http://localhost:3211/health}"

cd "$DEV_DIR"

NODE_MAJOR=$(node -p "process.versions.node.split('.')[0]")
if [[ "$NODE_MAJOR" -lt 20 ]]; then
  echo "✗ Node 20+ is required for release checks and current production dependencies. Found: $(node -v)"
  exit 1
fi

# ── Help ─────────────────────────────────────────────────────────────────────
if [[ "${1:-}" == "--help" ]]; then
  echo "Usage: $0 [version]"
  echo "  version  optional semver (e.g. 1.2.3). Defaults to current package.json version."
  echo
  echo "Environment variables:"
  echo "  PROD_DIR           Required. Runtime directory containing docker-compose.yml and data/."
  echo "  PROD_COMPOSE_FILE  Optional. Defaults to \$PROD_DIR/docker-compose.yml."
  echo "  PROD_HEALTH_URL    Optional. Defaults to http://localhost:3211/health."
  echo "  IMAGE_NAME         Optional. Defaults to mdedit-app."
  exit 0
fi

if [[ -z "$PROD_DIR" ]]; then
  echo "✗ PROD_DIR is required. Keep host-specific runtime paths outside the public repo."
  exit 1
fi

if [[ -z "$PROD_COMPOSE_FILE" || ! -f "$PROD_COMPOSE_FILE" ]]; then
  echo "✗ Production compose file not found: ${PROD_COMPOSE_FILE:-<unset>}"
  exit 1
fi

# ── Determine version ────────────────────────────────────────────────────────
CURRENT_VERSION=$(node -e "console.log(require('./package.json').version)")

if [[ -n "${1:-}" ]]; then
  NEW_VERSION="$1"
else
  NEW_VERSION="$CURRENT_VERSION"
fi

echo "► Deploying version $NEW_VERSION"

echo "  Running release checks ..."
npm run audit:prod
npm run smoke:visual

# ── Bump version in package.json if changed ───────────────────────────────────
if [[ "$NEW_VERSION" != "$CURRENT_VERSION" ]]; then
  echo "  Bumping version: $CURRENT_VERSION → $NEW_VERSION"
  node -e "
    const fs = require('fs');
    const pkg = JSON.parse(fs.readFileSync('package.json','utf8'));
    pkg.version = '$NEW_VERSION';
    fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
  "
fi

# ── Build Docker image ────────────────────────────────────────────────────────
echo "  Building image $IMAGE_NAME:$NEW_VERSION ..."
docker build -t "$IMAGE_NAME:$NEW_VERSION" -t "$IMAGE_NAME:latest" .

# ── Restart production container ──────────────────────────────────────────────
echo "  Restarting production container ..."
cd "$PROD_DIR"
docker compose pull --ignore-buildable 2>/dev/null || true
docker compose up -d --force-recreate

# ── Health check ─────────────────────────────────────────────────────────────
echo "  Waiting for health check ..."
sleep 5
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$PROD_HEALTH_URL" || echo "000")
if [[ "$HTTP_STATUS" == "200" ]]; then
  echo "✓ Production is up and healthy (v$NEW_VERSION)"
else
  echo "✗ Health check failed (HTTP $HTTP_STATUS) - check: docker compose -f $PROD_COMPOSE_FILE logs"
  exit 1
fi

# ── Optional: commit & tag in git ─────────────────────────────────────────────
cd "$DEV_DIR"
if git diff --quiet HEAD -- package.json; then
  echo "  (package.json unchanged, no git tag)"
else
  echo "  Committing version bump and tagging v$NEW_VERSION ..."
  git add package.json
  git commit -m "chore: release v$NEW_VERSION"
  git tag "v$NEW_VERSION"
  echo "  Run 'git push && git push --tags' to publish."
fi

echo "Done. Production deployment finished."
