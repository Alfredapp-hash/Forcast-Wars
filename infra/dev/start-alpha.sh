#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
  echo "Loaded .env (Supabase: ${SUPABASE_URL:-not set})"
fi

pnpm install
pnpm build

if [ ! -d apps/macos/ArkheAgentOS.xcodeproj ]; then
  bash infra/dev/scaffold-xcode.sh
fi

echo "Starting daemon..."
export ARKHE_AUTO_APPROVE=1
pnpm dev:daemon &
DAEMON_PID=$!

cleanup() {
  kill "$DAEMON_PID" 2>/dev/null || true
}
trap cleanup EXIT

sleep 2
ARKHE_AUTO_APPROVE=1 pnpm smoke:daemon
open apps/macos/ArkheAgentOS.xcodeproj

echo "Daemon running (pid $DAEMON_PID). Press Ctrl+C to stop."
wait "$DAEMON_PID"
