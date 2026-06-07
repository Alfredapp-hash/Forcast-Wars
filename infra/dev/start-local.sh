#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

echo "Starting Arkhe AgentOS local stack..."
pnpm install
pnpm dev:daemon
