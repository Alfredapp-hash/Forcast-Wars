#!/usr/bin/env bash
# Notarize a previously built DMG.
# Usage: ./infra/dev/notarize.sh dist/ArkheAgentOS-0.1.0-alpha.dmg "Developer ID Application: Your Name (TEAMID)" "notary-profile-name"
set -euo pipefail

DMG="${1:-}"
SIGN_IDENTITY="${2:-}"
KEYCHAIN_PROFILE="${3:-}"

if [[ -z "$DMG" || -z "$SIGN_IDENTITY" || -z "$KEYCHAIN_PROFILE" ]]; then
  echo "Usage: $0 <dmg-path> <sign-identity> <keychain-profile>"
  echo "Example: $0 dist/ArkheAgentOS-0.1.0-alpha.dmg \"Developer ID Application: Acme Inc (ABC123DEF)\" notary-acme"
  exit 1
fi

echo "==> Codesigning $DMG (deep)"
codesign --deep --force --options runtime --sign "$SIGN_IDENTITY" "$DMG"

echo "==> Submitting for notarization (profile: $KEYCHAIN_PROFILE)"
xcrun notarytool submit "$DMG" --keychain-profile "$KEYCHAIN_PROFILE" --wait

echo "==> Stapling"
xcrun stapler staple "$DMG"

echo "==> Done: $DMG is now notarized and stapled."
echo "You can verify with: spctl -a -vvv -t install \"$DMG\""