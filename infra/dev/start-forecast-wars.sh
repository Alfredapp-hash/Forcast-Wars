#!/usr/bin/env bash
# Start Forecast Wars local dev stack: Hermes + daemon + Next.js website
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

bash scripts/sync-forecast-wars-env.sh

# Free daemon ports if a previous run is still holding them
(for p in 9470 9471; do lsof -ti tcp:$p | xargs kill -9 2>/dev/null || true; done)

# Load root env for child processes
set -a
# shellcheck disable=SC1091
source .env
set +a

export ARKHE_FORECAST_WARS_FOCUS=1
export ARKHE_AUTO_APPROVE=1
export SUPABASE_URL="${SUPABASE_URL:-}"
export SUPABASE_SECRET_KEY="${SUPABASE_SECRET_KEY:-${SUPABASE_SERVICE_ROLE_KEY:-}}"
export SUPABASE_SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-$SUPABASE_SECRET_KEY}"
export HERMES_URL=http://127.0.0.1:4000

PIDS=()
cleanup() {
  echo ""
  echo "Stopping Forecast Wars local stack..."
  for pid in "${PIDS[@]:-}"; do
    kill "$pid" 2>/dev/null || true
  done
  wait 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "Building workspace packages (first run may take a minute)..."
pnpm --filter @arkhe/contracts build >/dev/null 2>&1 || pnpm --filter @arkhe/contracts build
pnpm --filter @arkhe/supabase-sync build >/dev/null 2>&1 || true

echo "Starting Hermes on :4000..."
pnpm dev:hermes &
PIDS+=($!)
sleep 3

echo "Starting local-daemon (WS :9470, debate webhook :9471)..."
pnpm dev:daemon &
PIDS+=($!)
sleep 2

echo "Starting Forecast Wars website on http://localhost:3001 ..."
pnpm dev:forecast-wars &
PIDS+=($!)

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Forecast Wars local dev"
echo "  Website:  http://localhost:3001"
echo "  Hermes:   http://localhost:4000"
echo "  Daemon:   ws://localhost:9470"
echo "  Debates:  http://127.0.0.1:9471"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Press Ctrl+C to stop all services."
echo ""

wait
