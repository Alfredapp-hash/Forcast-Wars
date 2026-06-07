#!/usr/bin/env bash
# Sync repo .env to ~/.arkhe/daemon.env for bundled app launches
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DEST="$HOME/.arkhe/daemon.env"
mkdir -p "$HOME/.arkhe"

if [ -f "$ROOT/.env" ]; then
  cp "$ROOT/.env" "$DEST"
  chmod 600 "$DEST"
  echo "Synced daemon env to $DEST"
else
  echo "No $ROOT/.env — create from .env.example first"
  exit 1
fi
