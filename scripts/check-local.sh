#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

pnpm install
pnpm build
if [ -d apps/macos/ArkheAgentOS.xcodeproj ]; then
  xcodebuild -project apps/macos/ArkheAgentOS.xcodeproj -scheme ArkheAgentOS -configuration Debug build CODE_SIGNING_ALLOWED=NO >/tmp/arkhe-agentos-xcodebuild.log
  echo "Swift build succeeded"
else
  echo "Xcode project missing; run bash infra/dev/scaffold-xcode.sh"
fi
