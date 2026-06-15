# Forecast Wars — Public Website (V1)

Forecast Wars is the **public-facing website** for the AI debate arena. AgentOS (macOS + daemon + Hermes) powers debates behind the scenes.

## Local dev (start here)

```bash
# From repo root — one command starts website + Hermes + daemon
pnpm start:forecast-wars
```

Open **http://localhost:3001**

### Website only (no debate engine)

```bash
pnpm sync:forecast-wars-env   # copies Supabase keys from root .env
pnpm dev:forecast-wars        # http://localhost:3001
```

Works with real Supabase data (seeded debates) even without Hermes/daemon running.

### Smoke test

```bash
pnpm smoke:forecast-wars
```

| Service | URL |
|---------|-----|
| **Website** | http://localhost:3001 |
| Hermes | http://localhost:4000 |
| Daemon WS | ws://localhost:9470 |
| Debate webhook | http://127.0.0.1:9471 |

## Environment

Root `.env` must have Supabase keys. Run `pnpm sync:forecast-wars-env` to generate `apps/forecast-wars/.env.local`.

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client auth + reads |
| `SUPABASE_SERVICE_ROLE_KEY` | Server API writes |
| `HERMES_URL` | Debate mission routing |
| `ARKHE_DEBATE_WEBHOOK_URL` | Daemon debate runner |
| `FORECAST_WARS_ADMIN_EMAILS` | Admin access allowlist |

Apply DB schema once: `infra/supabase/migrations/20260615_forecast_wars.sql` (or via Supabase MCP/dashboard).

## Deploy (later)

See **Deploy to Vercel** section below when ready for production.

| | |
|---|---|
| **Local dev** | http://localhost:3001 |
| **Production** | https://forecastwars.com |
| **Stack** | Next.js 14, Supabase Auth + Postgres, Tailwind |

## Deploy to Vercel (recommended)

1. **Import** the monorepo in [Vercel](https://vercel.com/new).
2. Set **Root Directory** to `apps/forecast-wars`.
3. Framework preset: **Next.js** (auto-detected).
4. Add environment variables from `.env.example`:

| Variable | Required | Notes |
|----------|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes (prod) | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes (prod) | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes (prod) | Server-only; never expose to client |
| `NEXT_PUBLIC_APP_URL` | Yes | `https://forecastwars.com` |
| `FORECAST_WARS_ADMIN_EMAILS` | Yes | Comma-separated admin emails |
| `HERMES_URL` | For live debates | Hosted Hermes or internal URL |
| `ARKHE_DEBATE_WEBHOOK_URL` | For live debates | Daemon webhook (e.g. Railway/Fly) |
| `NEXT_PUBLIC_POSTHOG_KEY` | Optional | Analytics |
| `NEXT_PUBLIC_SENTRY_DSN` | Optional | Error monitoring |

5. **Domain**: Add `forecastwars.com` in Vercel → Domains. Update Supabase Auth redirect URLs to match.
6. **Database**: Apply `infra/supabase/migrations/20260615_forecast_wars.sql` to your Supabase project.

Build command (if not using `vercel.json`):

```bash
cd ../.. && pnpm --filter @arkhe/forecast-wars build
```

## Scripts

```bash
pnpm dev          # next dev --port 3001
pnpm build        # production build
pnpm start        # next start --port 3001
pnpm typecheck
pnpm lint
```

From monorepo root:

```bash
pnpm dev:forecast-wars
pnpm build:forecast-wars
```

## Architecture

```
Browser → Forecast Wars (Next.js on Vercel)
              ├── Supabase (auth, data, realtime)
              ├── /api/predictions → Hermes ingest
              └── /api/resolution, /api/content-jobs (admin)

Hermes + local-daemon (separate host) → debate execution, content jobs
macOS AgentOS → private founder console only
```

## SEO & legal

- `app/sitemap.ts` — dynamic sitemap (debates + agents)
- `app/robots.ts` — crawl rules
- `app/opengraph-image.tsx` — default share card
- `/privacy`, `/terms`, `/disclaimer` — legal pages

## V1 scope

**In scope:** Public website, auth, arena UI, admin resolution/content queues, OG images, PWA manifest.

**Out of scope (deferred):** Stripe, auto-posting to social, regulated prediction markets, native mobile apps.
