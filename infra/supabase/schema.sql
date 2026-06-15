-- Arkhe AgentOS — Ark-playground (deoyyzrzoacyjeozwvek)
-- Applied via migration: arkhe_agentos_initial

create extension if not exists vector with schema extensions;

create table if not exists public.agents (
  id text primary key,
  role text not null,
  specialty text,
  cortex text not null default 'general',
  permanent boolean not null default false,
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
  importance real not null default 0.35,
  context_tags text[] not null default '{}',
  access_count integer not null default 0,
  last_accessed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.agent_synapses (
  id text primary key,
  source_agent_id text not null references public.agents(id) on delete cascade,
  target_agent_id text not null references public.agents(id) on delete cascade,
  source_role text not null,
  target_role text not null,
  weight real not null default 0.15,
  messages integer not null default 0,
  successes integer not null default 0,
  failures integer not null default 0,
  trusted boolean not null default false,
  last_reason text,
  last_reinforced_at timestamptz,
  workspace_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint agent_synapses_distinct_agents check (source_agent_id <> target_agent_id)
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
create index if not exists idx_agent_memories_importance on public.agent_memories(importance desc);
create index if not exists idx_agent_memories_created_at on public.agent_memories(created_at desc);
create index if not exists idx_agent_memories_context_tags on public.agent_memories using gin(context_tags);
create index if not exists idx_agent_synapses_source on public.agent_synapses(source_agent_id);
create index if not exists idx_agent_synapses_target on public.agent_synapses(target_agent_id);
create index if not exists idx_agent_synapses_weight on public.agent_synapses(weight desc);
create index if not exists idx_agent_synapses_trusted on public.agent_synapses(trusted) where trusted = true;
create index if not exists idx_tasks_mission on public.tasks(mission_id);
create index if not exists idx_conversation_session on public.conversation_history(session_id);

alter table public.agents enable row level security;
alter table public.agent_memories enable row level security;
alter table public.agent_synapses enable row level security;
alter table public.tasks enable row level security;
alter table public.workflows enable row level security;
alter table public.knowledge_base enable row level security;
alter table public.conversation_history enable row level security;

create or replace function public.match_agent_memories(
  query_embedding extensions.vector(1536),
  match_count int default 20,
  context_agent_id text default null,
  context_mission_id text default null,
  context_tags text[] default '{}'
)
returns table (
  id uuid,
  agent_id text,
  mission_id text,
  memory_type text,
  content text,
  metadata jsonb,
  importance real,
  context_tags text[],
  access_count integer,
  last_accessed_at timestamptz,
  created_at timestamptz,
  similarity float,
  recency_score float,
  activation_score float
)
language sql stable
set search_path = public, extensions
as $$
  with scored as (
    select
      am.*,
      1 - (am.embedding <=> query_embedding) as similarity,
      1 / (1 + (extract(epoch from (now() - am.created_at)) / 86400.0) / 14.0) as recency_score,
      case when context_agent_id is not null and am.agent_id = context_agent_id then 0.15 else 0 end as agent_context_score,
      case when context_mission_id is not null and am.mission_id = context_mission_id then 0.15 else 0 end as mission_context_score,
      0.05 * (
        select count(*)::float
        from unnest(am.context_tags) tag
        where tag = any(context_tags)
      ) as tag_context_score
    from public.agent_memories am
    where am.embedding is not null
  )
  select
    scored.id,
    scored.agent_id,
    scored.mission_id,
    scored.memory_type,
    scored.content,
    scored.metadata,
    scored.importance,
    scored.context_tags,
    scored.access_count,
    scored.last_accessed_at,
    scored.created_at,
    scored.similarity,
    scored.recency_score,
    least(1.0,
      (scored.similarity * 0.45) +
      (scored.importance * 0.30) +
      (scored.recency_score * 0.15) +
      scored.agent_context_score +
      scored.mission_context_score +
      scored.tag_context_score
    ) as activation_score
  from scored
  order by activation_score desc
  limit match_count;
$$;

create or replace function public.touch_agent_memory(memory_id uuid)
returns void
language sql
set search_path = public
as $$
  update public.agent_memories
  set access_count = access_count + 1,
      last_accessed_at = now()
  where id = memory_id;
$$;

-- =====================================================================
-- Attention Cortex / Autonomous Media Company tables (Premium big swing)
-- These power the self-improving attention manufacturing loop.
-- Trends, scored opportunities, generated assets, video jobs, performance,
-- and the dreaming reflections that feed the Neural Mesh.
-- =====================================================================

create table if not exists public.media_trends (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  topic text not null,
  velocity real,
  search_growth_pct real,
  competition_score real,
  detected_at timestamptz not null default now(),
  workspace_id text,
  metadata jsonb default '{}'::jsonb
);

create table if not exists public.media_opportunities (
  id uuid primary key default gen_random_uuid(),
  topic text not null,
  opportunity_score real not null,
  search_growth_pct real,
  competition_score real,
  reason text,
  selected boolean not null default false,
  created_at timestamptz not null default now(),
  workspace_id text
);

create table if not exists public.media_content (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid references public.media_opportunities(id),
  asset_type text,
  title text,
  body text,
  content_ref text,
  tags text[] default '{}',
  created_at timestamptz not null default now(),
  workspace_id text
);

create table if not exists public.media_videos (
  id uuid primary key default gen_random_uuid(),
  content_id uuid references public.media_content(id),
  provider text,           -- veo | runway | kling | hailuo
  model text,
  duration_sec integer,
  style text,
  artifact_ref text,
  published_url text,
  external_id text,
  created_at timestamptz not null default now(),
  workspace_id text
);

create table if not exists public.media_performances (
  id uuid primary key default gen_random_uuid(),
  video_id uuid references public.media_videos(id),
  views integer,
  ctr real,
  watch_time_avg_sec real,
  retention_pct real,
  subs_delta integer,
  traffic_sources jsonb,
  reported_at timestamptz not null default now(),
  workspace_id text
);

create table if not exists public.media_reflections (
  id uuid primary key default gen_random_uuid(),
  video_id uuid references public.media_videos(id),
  reflection text not null,
  performance_delta real,
  proposed_new_agent_role text,
  created_at timestamptz not null default now(),
  workspace_id text
);

create index if not exists idx_media_trends_topic on public.media_trends(topic);
create index if not exists idx_media_opportunities_score on public.media_opportunities(opportunity_score desc);
create index if not exists idx_media_videos_provider on public.media_videos(provider);

alter table public.media_trends enable row level security;
alter table public.media_opportunities enable row level security;
alter table public.media_content enable row level security;
alter table public.media_videos enable row level security;
alter table public.media_performances enable row level security;
alter table public.media_reflections enable row level security;
