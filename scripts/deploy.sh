#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

COMPOSE="docker compose -f docker-compose.prod.yml"
NO_CACHE=${NO_CACHE:-false}

echo "==> Pulling latest code..."
git pull

echo "==> Building app image..."
if [ "$NO_CACHE" = "true" ]; then
  $COMPOSE build --no-cache app
else
  $COMPOSE build app
fi

echo "==> Recreating containers..."
$COMPOSE up -d --force-recreate

echo "==> Waiting for app to become healthy..."
for i in $(seq 1 30); do
  STATUS=$($COMPOSE ps --format json app 2>/dev/null | grep -o '"Health":"[^"]*"' | cut -d'"' -f4 || echo "")
  if [ "$STATUS" = "healthy" ]; then
    echo "==> App is healthy."
    break
  fi
  if [ "$i" = "30" ]; then
    echo "WARNING: App did not report healthy after 60s. Check logs:"
    $COMPOSE logs --tail=50 app
    exit 1
  fi
  sleep 2
done

echo "==> Done. Running containers:"
$COMPOSE ps
