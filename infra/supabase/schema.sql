-- Arkhe AgentOS — Ark-playground (deoyyzrzoacyjeozwvek)
-- Applied via migration: arkhe_agentos_initial

create extension if not exists vector with schema extensions;

create table if not exists public.agents (
  id text primary key,
  role text not null,
  specialty text,
  preferred_layer smallint not null default 2,
  preferred_model text,
  status text not null default 'dormant',
  allowed_tools jsonb not null default '[]'::jsonb,
  activations integer not null default 0,
  last_activated_at timestamptz,
  workspace_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.agent_memories (
  id uuid primary key default gen_random_uuid(),
  agent_id text not null references public.agents(id) on delete cascade,
  mission_id text,
  memory_type text not null default 'episodic',
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  embedding extensions.vector(1536),
  created_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id text primary key,
  mission_id text,
  assigned_agent_id text references public.agents(id),
  title text not null,
  status text not null default 'queued',
  depends_on text[] default '{}',
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.workflows (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  template text not null,
  steps jsonb not null default '[]'::jsonb,
  workspace_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.knowledge_base (
  id uuid primary key default gen_random_uuid(),
  workspace_id text,
  title text not null,
  body text not null,
  source text,
  tags text[] default '{}',
  embedding extensions.vector(1536),
  created_at timestamptz not null default now()
);

create table if not exists public.conversation_history (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  agent_id text references public.agents(id),
  role text not null,
  content text not null,
  model text,
  provider text,
  tokens_in integer default 0,
  tokens_out integer default 0,
  cost_usd numeric(10, 4) default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_agent_memories_agent on public.agent_memories(agent_id);
create index if not exists idx_tasks_mission on public.tasks(mission_id);
create index if not exists idx_conversation_session on public.conversation_history(session_id);

alter table public.agents enable row level security;
alter table public.agent_memories enable row level security;
alter table public.tasks enable row level security;
alter table public.workflows enable row level security;
alter table public.knowledge_base enable row level security;
alter table public.conversation_history enable row level security;

create or replace function public.match_agent_memories(
  query_embedding extensions.vector(1536),
  match_count int default 20
)
returns table (
  id uuid,
  agent_id text,
  mission_id text,
  memory_type text,
  content text,
  metadata jsonb,
  created_at timestamptz,
  similarity float
)
language sql stable
as $$
  select
    am.id,
    am.agent_id,
    am.mission_id,
    am.memory_type,
    am.content,
    am.metadata,
    am.created_at,
    1 - (am.embedding <=> query_embedding) as similarity
  from public.agent_memories am
  where am.embedding is not null
  order by am.embedding <=> query_embedding
  limit match_count;
$$;
