# Ark-playground Supabase

**Project:** Ark-playground  
**URL:** https://deoyyzrzoacyjeozwvek.supabase.co  
**Ref:** `deoyyzrzoacyjeozwvek`

## Setup

1. Copy env template:

```bash
cp .env.example .env
```

2. Add keys to `.env`:

| Key | Where to get it | Used by |
|-----|-----------------|---------|
| `SUPABASE_PUBLISHABLE_KEY` | Dashboard → API → publishable | macOS app (client-safe) |
| `SUPABASE_SECRET_KEY` | Dashboard → API → secret (`sb_secret_...`) | **Daemon sync** |
| `SUPABASE_SERVICE_ROLE_KEY` | Legacy JWT `service_role` (alternative) | **Daemon sync** |

```
SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

The **publishable** key is safe in the Swift app. The **service role** key must never ship in the app — daemon only.

3. Start the daemon (loads `.env` automatically via `start-alpha.sh`):

```bash
pnpm start:alpha
```

## Tables

| Table | Purpose |
|-------|---------|
| `agents` | Resident expert registry sync |
| `agent_memories` | Episodic mission memory |
| `tasks` | Work items (future) |
| `workflows` | Mission templates (future) |
| `knowledge_base` | Personal knowledge vault (future) |
| `conversation_history` | Session transcripts (future) |

Migration applied: `arkhe_agentos_initial` (pgvector + RLS enabled).

## Verify sync

Open **Residents** tab → Supabase chip should show **Synced** after daemon starts.

Or check IPC:

```bash
# With daemon running
node -e "
const ws = new WebSocket('ws://127.0.0.1:9470');
ws.onopen = () => ws.send(JSON.stringify({ type: 'supabase_status' }));
ws.onmessage = (e) => { console.log(e.data); ws.close(); };
"
```
