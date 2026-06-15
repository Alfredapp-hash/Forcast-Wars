# Packaging Arkhe AgentOS

## Local DMG (unsigned)

```bash
pnpm package:app
```

This performs:

1. `pnpm build` (via `bundle-daemon.sh`)
2. Daemon deploy into `.bundle/Daemon`
3. Node binary copy into bundled resources
4. `.env` sync to `~/.arkhe/daemon.env`
5. Xcode Release build (ad-hoc signed)
6. DMG creation in `dist/ArkheAgentOS-0.1.0-alpha.dmg`

Output paths:

| Artifact | Path |
|----------|------|
| Release `.app` | `apps/macos/build/DerivedData/Build/Products/Release/Arkhe AgentOS.app` |
| DMG | `dist/ArkheAgentOS-0.1.0-alpha.dmg` |

## Signing & Notarization (requires Apple Developer credentials)

Scripts are ready; credentials are **not** in the repo.

### One-command flow (after Release DMG exists)

```bash
bash infra/dev/notarize.sh \
  dist/ArkheAgentOS-0.1.0-alpha.dmg \
  "Developer ID Application: Your Name (TEAMID)" \
  notary-profile-name
```

`infra/dev/notarize.sh` performs:

1. Deep codesign DMG with Developer ID + hardened runtime
2. `xcrun notarytool submit … --wait`
3. `xcrun stapler staple`

### Prerequisites (human setup)

1. **Apple Developer Program** membership
2. **Developer ID Application** certificate in Keychain
3. **Notarytool keychain profile**:
   ```bash
   xcrun notarytool store-credentials notary-profile-name \
     --apple-id "you@example.com" \
     --team-id TEAMID \
     --password "app-specific-password"
   ```
4. For a properly signed `.app` before DMG, build Release **with** `CODE_SIGNING_ALLOWED=YES` and your identity (today `package-app.sh` uses ad-hoc sign for local dev).

### Blocker note

Without the above, `pnpm package:app` produces an **ad-hoc signed** DMG suitable for dev/testing on the build machine only. Gatekeeper will block it on other Macs until notarized.

## Auto-update (planned — Sparkle path)

Full Sparkle integration is **not** shipped in alpha. Intended path:

| Phase | Mechanism |
|-------|-----------|
| **Now (alpha)** | Manual download of new DMG from releases; version in `package.json` / app bundle |
| **Beta** | Sparkle 2.x framework embedded in macOS target; `SUFeedURL` pointing to `https://releases.arkhe.com/appcast.xml` |
| **Minimum viable** | Settings → "Check for Updates" opens release page or downloads latest DMG + shows install instructions |

### Version check without Sparkle (dev)

```bash
# Compare local vs remote tag
gh release view --json tagName
```

### Future Sparkle checklist

- [ ] Add Sparkle via SPM to `apps/macos/project.yml`
- [ ] Host `appcast.xml` + signed DMG on CDN
- [ ] EdDSA signing key in CI secret (not in repo)
- [ ] Settings "Check for Updates" → `SPUStandardUpdaterController`

See also: `docs/LANDING_COPY.md` for GTM blockers.

## Secrets

The macOS app contains only the publishable Supabase key in `SupabaseConfig.swift`.

Server secrets must live in:

```bash
~/.arkhe/daemon.env
```

The bundle launcher loads that file before starting the daemon.

## Known Packaging Limits

- Bundled Node is copied from the build machine and should match tester architecture (arm64 vs x86_64).
- Playwright Chromium is included through pnpm deploy dependencies; first launch should still be smoke-tested on a clean Mac.
- Apple Foundation Models require macOS 26+ and compatible Apple silicon.
- YouTube real upload requires OAuth + video file path (`localPath`, `storageRef`, or `ARKHE_YOUTUBE_UPLOAD_PATH`).
