#!/usr/bin/env bash
# deploy-prod.sh – Deploy a release from /home/ga/md (dev) to /home/ga/mdedit (prod)
#
# Usage:
#   ./deploy-prod.sh            # Deploy current state (bumps patch version)
#   ./deploy-prod.sh 1.2.3      # Deploy with explicit version
#   ./deploy-prod.sh --help
#
# What it does:
#   1. Optionally bumps the version in package.json
#   2. Builds the Docker image from /home/ga/md tagged as mdedit-app:<version>
#   3. Tags it as mdedit-app:latest
#   4. Syncs the tracked production compose file into /home/ga/mdedit
#   5. Restarts the production container using the freshly built image

set -euo pipefail

DEV_DIR="/home/ga/md"
PROD_DIR="/home/ga/mdedit"
IMAGE_NAME="mdedit-app"

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
  exit 0
fi

# ── Determine version ────────────────────────────────────────────────────────
CURRENT_VERSION=$(node -e "console.log(require('./package.json').version)")

if [[ -n "${1:-}" ]]; then
  NEW_VERSION="$1"
else
  NEW_VERSION="$CURRENT_VERSION"
fi

echo "► Deploying version $NEW_VERSION to production (mdedit.io)"

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

# ── Sync tracked production config ────────────────────────────────────────────
echo "  Syncing tracked production compose file ..."
install -m 644 "$DEV_DIR/deploy/docker-compose.prod.yml" "$PROD_DIR/docker-compose.yml"

# ── Restart production container ──────────────────────────────────────────────
echo "  Restarting production container ..."
cd "$PROD_DIR"
docker compose pull --ignore-buildable 2>/dev/null || true
docker compose up -d --force-recreate

# ── Health check ─────────────────────────────────────────────────────────────
echo "  Waiting for health check ..."
sleep 5
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3211/health || echo "000")
if [[ "$HTTP_STATUS" == "200" ]]; then
  echo "✓ Production is up and healthy (v$NEW_VERSION)"
else
  echo "✗ Health check failed (HTTP $HTTP_STATUS) – check: docker compose -f $PROD_DIR/docker-compose.yml logs"
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

echo "Done. Production running at http://localhost:3211 (→ https://mdedit.io)"
