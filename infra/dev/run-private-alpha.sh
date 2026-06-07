#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

pnpm install
pnpm build
open apps/macos/ArkheAgentOS.xcodeproj
pnpm dev:daemon
