#!/usr/bin/env bash
# Build Release app and create a distributable DMG (unsigned — notarize separately)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
MACOS="$ROOT/apps/macos"
APP_NAME="Arkhe AgentOS"
BUILD_DIR="$MACOS/build"
DMG_DIR="$ROOT/dist"
VERSION="0.1.0-alpha"

cd "$ROOT"

echo "==> Bundle daemon + Node"
bash infra/dev/bundle-daemon.sh
bash infra/dev/sync-daemon-env.sh

echo "==> Xcode Release build"
cd "$MACOS"
xcodegen generate
xcodebuild \
  -project ArkheAgentOS.xcodeproj \
  -scheme ArkheAgentOS \
  -configuration Release \
  -derivedDataPath "$BUILD_DIR/DerivedData" \
  CODE_SIGNING_ALLOWED=NO \
  build

APP_PATH="$BUILD_DIR/DerivedData/Build/Products/Release/$APP_NAME.app"
if [ ! -d "$APP_PATH" ]; then
  echo "Build failed — app not found at $APP_PATH"
  exit 1
fi

echo "==> Embed daemon bundle"
rm -rf "$APP_PATH/Contents/Resources/Daemon"
mkdir -p "$APP_PATH/Contents/Resources"
cp -R "$ROOT/.bundle/Daemon" "$APP_PATH/Contents/Resources/Daemon"

echo "==> Clean xattrs and ad-hoc sign"
xattr -cr "$APP_PATH" 2>/dev/null || true
codesign --force --deep --sign - "$APP_PATH"

mkdir -p "$DMG_DIR"
STAGE="$BUILD_DIR/dmg-stage"
rm -rf "$STAGE"
mkdir -p "$STAGE"
cp -R "$APP_PATH" "$STAGE/"
ln -s /Applications "$STAGE/Applications"

DMG="$DMG_DIR/ArkheAgentOS-${VERSION}.dmg"
rm -f "$DMG"
hdiutil create -volname "Arkhe AgentOS" -srcfolder "$STAGE" -ov -format UDZO "$DMG"

echo "Created $DMG"
echo "For notarization (manual or scripted):"
echo "  bash infra/dev/notarize.sh \"$DMG\" \"Developer ID Application: <Your Name (TEAMID)>\" <keychain-profile>"
echo "See docs/release/PACKAGING.md and the notarize.sh script for automated flow."
