# Packaging Arkhe AgentOS

## Local DMG

```bash
pnpm package:app
```

This performs:

1. `pnpm build`
2. daemon deploy into `apps/macos/ArkheAgentOS/Resources/Daemon`
3. Node binary copy into `Resources/Daemon/bin/node`
4. `.env` sync to `~/.arkhe/daemon.env`
5. Xcode Release build
6. DMG creation in `dist/`

## Secrets

The macOS app contains only the publishable Supabase key in `SupabaseConfig.swift`.

Server secrets must live in:

```bash
~/.arkhe/daemon.env
```

The bundle launcher loads that file before starting the daemon.

## Signing / Notarization

For external private alpha:

```bash
codesign --deep --force --options runtime --sign "Developer ID Application: <Team>" "Arkhe AgentOS.app"
xcrun notarytool submit dist/ArkheAgentOS-0.1.0-alpha.dmg --keychain-profile "<profile>" --wait
xcrun stapler staple dist/ArkheAgentOS-0.1.0-alpha.dmg
```

Notarization is not automated yet because it needs Apple Developer credentials.

## Known Packaging Limits

- Bundled Node is copied from the build machine and should match tester architecture.
- Playwright Chromium is included through pnpm deploy dependencies, but first launch should still be smoke-tested on a clean Mac.
- Apple Foundation Models require macOS 26+ and compatible Apple silicon.
