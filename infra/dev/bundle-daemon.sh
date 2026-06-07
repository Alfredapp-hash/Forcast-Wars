#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
STAGING="$ROOT/.bundle/daemon-stage"
DEST="$ROOT/.bundle/Daemon"

cd "$ROOT"

echo "Building workspace..."
pnpm build

echo "Staging daemon bundle..."
rm -rf "$STAGING" "$DEST"
mkdir -p "$STAGING" "$DEST/bin"

pnpm --filter @arkhe/local-daemon deploy --prod --legacy "$STAGING"
cp -R "$STAGING/." "$DEST/"

# Bundle a portable official Node distribution for one-click app launch.
# Homebrew's node binary depends on many /opt/homebrew dylibs, so do not copy it.
NODE_VERSION="${NODE_BUNDLE_VERSION:-v22.21.1}"
ARCH="$(uname -m)"
case "$ARCH" in
  arm64) NODE_ARCH="darwin-arm64" ;;
  x86_64) NODE_ARCH="darwin-x64" ;;
  *) echo "Unsupported Node bundle arch: $ARCH"; exit 1 ;;
esac
NODE_TARBALL="node-$NODE_VERSION-$NODE_ARCH.tar.xz"
NODE_URL="https://nodejs.org/dist/$NODE_VERSION/$NODE_TARBALL"
NODE_CACHE="$ROOT/.bundle/$NODE_TARBALL"
NODE_EXTRACT="$ROOT/.bundle/node-$NODE_VERSION-$NODE_ARCH"

if [ ! -f "$NODE_CACHE" ]; then
  echo "Downloading $NODE_URL"
  curl -fsSL "$NODE_URL" -o "$NODE_CACHE"
fi

rm -rf "$NODE_EXTRACT"
tar -xJf "$NODE_CACHE" -C "$ROOT/.bundle"
cp "$NODE_EXTRACT/bin/node" "$DEST/bin/node"
chmod +x "$DEST/bin/node"
echo "Bundled Node $( "$DEST/bin/node" --version ) from official $NODE_ARCH build"

mkdir -p "$ROOT/.bundle"
echo "$ROOT" > "$ROOT/.bundle/last-build"

echo "Bundled daemon to $DEST"
echo "Next: open Xcode and build Arkhe AgentOS, or run pnpm package:app"
