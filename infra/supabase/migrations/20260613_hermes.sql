-- =============================================================
-- Hermes Routing Layer — initial schema
-- Migration: 20260613_hermes
-- =============================================================

-- ----------------------------------------------------
-- hermes_threads: top-level conversation/mission threads
-- ----------------------------------------------------
create table if not exists public.hermes_threads (
  id           uuid primary key default gen_random_uuid(),
  mission_id   text,
  source       text not null,                    -- voice | dashboard | agent | webhook | system
  title        text,
  status       text not null default 'active',   -- active | resolved | archived
  created_by   text,                             -- agent_id or user identifier
  workspace_id text,
  metadata     jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ----------------------------------------------------
-- hermes_messages: individual message envelopes
-- ----------------------------------------------------
create table if not exists public.hermes_messages (
  id          uuid primary key default gen_random_uuid(),
  thread_id   uuid not null references public.hermes_threads(id) on delete cascade,
  mission_id  text,
  source      text not null,                -- voice | dashboard | agent | webhook | system
  role        text not null,                -- user | agent | system | hermes
  payload     jsonb not null default '{}'::jsonb,
  context     jsonb not null default '{}'::jsonb,
  routing_hint text,
  status      text not null default 'received',  -- received | routing | dispatched | completed | failed
  workspace_id text,
  created_at  timestamptz not null default now()
);

-- ----------------------------------------------------
-- hermes_decisions: routing decisions per message
-- ----------------------------------------------------
create table if not exists public.hermes_decisions (
  id           uuid primary key default gen_random_uuid(),
  message_id   uuid not null references public.hermes_messages(id) on delete cascade,
  decision_type text not null,              -- dispatch_agent | dispatch_tool | notify | await_approval | reject
  target_id    text,                        -- agent_id or tool_id
  channel      text,                        -- email | push | voice | dashboard (for notify type)
  payload      jsonb not null default '{}'::jsonb,
  status       text not null default 'pending',  -- pending | executing | completed | failed
  error        text,
  created_at   timestamptz not null default now(),
  completed_at timestamptz
);

-- ----------------------------------------------------
-- hermes_capabilities: registered agent/tool capabilities
-- ----------------------------------------------------
create table if not exists public.hermes_capabilities (
  id              text primary key,              -- e.g. "agt_researcher_01" or "tool_browser"
  name            text not null,
  kind            text not null,                 -- agent | tool | integration
  roles           text[] not null default '{}',  -- e.g. ['research', 'browse']
  skills          text[] not null default '{}',  -- freeform skill tags
  status          text not null default 'dormant', -- dormant | active | overloaded | offline
  priority_layer  smallint not null default 2,
  preferred_model text,
  workspace_id    text,
  metadata        jsonb not null default '{}'::jsonb,
  registered_at   timestamptz not null default now(),
  last_seen_at    timestamptz
);

-- ----------------------------------------------------
-- hermes_notifications: outbound notification records
-- ----------------------------------------------------
create table if not exists public.hermes_notifications (
  id          uuid primary key default gen_random_uuid(),
  message_id  uuid references public.hermes_messages(id) on delete set null,
  decision_id uuid references public.hermes_decisions(id) on delete set null,
  channel     text not null,                    -- email | push | voice | dashboard | sms
  recipient   text not null,                    -- user_id or device token
  template_id text,
  payload     jsonb not null default '{}'::jsonb,
  status      text not null default 'queued',   -- queued | sent | failed | cancelled
  attempts    integer not null default 0,
  error       text,
  workspace_id text,
  scheduled_at timestamptz not null default now(),
  sent_at      timestamptz,
  created_at   timestamptz not null default now()
);

-- ----------------------------------------------------
-- hermes_approval_requests: pending human-in-the-loop holds
-- ----------------------------------------------------
create table if not exists public.hermes_approval_requests (
  id            uuid primary key default gen_random_uuid(),
  message_id    uuid references public.hermes_messages(id) on delete cascade,
  approval_id   text not null unique,            -- maps to @arkhe/contracts ApprovalId
  risk_class    text not null,                   -- green | yellow | orange | red
  action        text not null,
  summary       text not null,
  requested_by  text not null,                   -- agent_id
  status        text not null default 'pending', -- pending | approved | denied | expired
  resolved_by   text,                            -- "user" | "policy" | "timeout"
  workspace_id  text,
  expires_at    timestamptz not null,
  created_at    timestamptz not null default now(),
  resolved_at   timestamptz
);

-- ----------------------------------------------------
-- hermes_notification_preferences: per-user channel rules
-- ----------------------------------------------------
create table if not exists public.hermes_notification_preferences (
  id           uuid primary key default gen_random_uuid(),
  user_id      text not null,
  channel      text not null,                  -- email | push | voice | dashboard
  enabled      boolean not null default true,
  quiet_start  time,                           -- e.g. 22:00
  quiet_end    time,                           -- e.g. 07:00
  priority_min text not null default 'low',    -- low | medium | high | critical
  workspace_id text,
  updated_at   timestamptz not null default now(),
  unique (user_id, channel)
);

-- ----------------------------------------------------
-- Indexes
-- ----------------------------------------------------
create index if not exists idx_hermes_messages_thread      on public.hermes_messages(thread_id);
create index if not exists idx_hermes_messages_mission     on public.hermes_messages(mission_id);
create index if not exists idx_hermes_messages_status      on public.hermes_messages(status);
create index if not exists idx_hermes_messages_created     on public.hermes_messages(created_at desc);
create index if not exists idx_hermes_decisions_message    on public.hermes_decisions(message_id);
create index if not exists idx_hermes_decisions_status     on public.hermes_decisions(status);
create index if not exists idx_hermes_notifications_status on public.hermes_notifications(status);
create index if not exists idx_hermes_notifications_recipient on public.hermes_notifications(recipient);
create index if not exists idx_hermes_capabilities_kind    on public.hermes_capabilities(kind);
create index if not exists idx_hermes_capabilities_status  on public.hermes_capabilities(status);
create index if not exists idx_hermes_capabilities_roles   on public.hermes_capabilities using gin(roles);
create index if not exists idx_hermes_approvals_status     on public.hermes_approval_requests(status);
create index if not exists idx_hermes_threads_mission      on public.hermes_threads(mission_id);
create index if not exists idx_hermes_threads_status       on public.hermes_threads(status);

-- ----------------------------------------------------
-- Row Level Security
-- ----------------------------------------------------
alter table public.hermes_threads                   enable row level security;
alter table public.hermes_messages                  enable row level security;
alter table public.hermes_decisions                 enable row level security;
alter table public.hermes_capabilities              enable row level security;
alter table public.hermes_notifications             enable row level security;
alter table public.hermes_approval_requests         enable row level security;
alter table public.hermes_notification_preferences  enable row level security;

-- Service-role bypass (daemon + Hermes service use service role key)
create policy "service role full access hermes_threads"
  on public.hermes_threads for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "service role full access hermes_messages"
  on public.hermes_messages for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "service role full access hermes_decisions"
  on public.hermes_decisions for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "service role full access hermes_capabilities"
  on public.hermes_capabilities for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "service role full access hermes_notifications"
  on public.hermes_notifications for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "service role full access hermes_approval_requests"
  on public.hermes_approval_requests for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "service role full access hermes_notification_preferences"
  on public.hermes_notification_preferences for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- ----------------------------------------------------
-- updated_at trigger helper (reuse or create)
-- ----------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_hermes_threads_updated_at
  before update on public.hermes_threads
  for each row execute function public.set_updated_at();

-- Add mission_id to hermes_approval_requests (written by ApprovalsService)
alter table public.hermes_approval_requests
  add column if not exists mission_id text;

-- updated_at column for hermes_capabilities (missing from original DDL)
alter table public.hermes_capabilities
  add column if not exists updated_at timestamptz not null default now();

-- updated_at triggers for tables that expose it
create trigger trg_hermes_capabilities_updated_at
  before update on public.hermes_capabilities
  for each row execute function public.set_updated_at();

create trigger trg_hermes_notification_prefs_updated_at
  before update on public.hermes_notification_preferences
  for each row execute function public.set_updated_at();

-- Fast lookup by approval_id (used by ApprovalsService.resolve + updateStatus)
create index if not exists idx_hermes_approvals_approval_id
  on public.hermes_approval_requests(approval_id);

-- Fast lookup for pending approvals by expiry (for TTL sweeps)
create index if not exists idx_hermes_approvals_expires_at
  on public.hermes_approval_requests(expires_at)
  where status = 'pending';
