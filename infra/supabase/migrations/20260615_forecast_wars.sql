-- Forecast Wars schema migration
-- Extends Arkhe AgentOS with public prediction/debate platform tables

-- Extend agents table with Forecast Wars fields
alter table public.agents
  add column if not exists name text,
  add column if not exists slug text unique,
  add column if not exists avatar_url text,
  add column if not exists personality text,
  add column if not exists system_prompt text,
  add column if not exists model_tier text default 'standard',
  add column if not exists accuracy_score real default 0,
  add column if not exists debate_wins integer default 0,
  add column if not exists debate_losses integer default 0,
  add column if not exists followers integer default 0;

-- Profiles (linked to Supabase Auth)
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  username text not null unique,
  display_name text not null,
  avatar_url text,
  bio text default '',
  reputation_score integer not null default 0,
  accuracy_score real not null default 0,
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Predictions
create table if not exists public.predictions (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null,
  category text not null,
  yes_position text not null,
  no_position text not null,
  resolution_criteria text not null,
  deadline_at timestamptz not null,
  status text not null default 'draft'
    check (status in ('draft', 'live', 'locked', 'resolved', 'void', 'disputed')),
  outcome text check (outcome in ('yes', 'no')),
  created_by uuid references public.profiles(id),
  resolved_by uuid references public.profiles(id),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Debate rooms
create table if not exists public.debate_rooms (
  id uuid primary key default gen_random_uuid(),
  prediction_id uuid not null references public.predictions(id) on delete cascade,
  affirmative_agent_id text not null references public.agents(id),
  negative_agent_id text not null references public.agents(id),
  judge_agent_id text references public.agents(id),
  fact_check_agent_id text references public.agents(id),
  narrator_agent_id text references public.agents(id),
  current_round integer not null default 1,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'in_progress', 'awaiting_verdict', 'concluded')),
  crowd_yes real not null default 50,
  crowd_no real not null default 50,
  spectators integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Debate rounds
create table if not exists public.debate_rounds (
  id uuid primary key default gen_random_uuid(),
  debate_room_id uuid not null references public.debate_rooms(id) on delete cascade,
  round_number integer not null,
  round_type text not null
    check (round_type in ('opening', 'rebuttal', 'cross_exam', 'closing', 'fact_check', 'judge')),
  status text not null default 'pending'
    check (status in ('pending', 'in_progress', 'completed')),
  started_at timestamptz,
  completed_at timestamptz,
  unique (debate_room_id, round_number)
);

-- Debate messages
create table if not exists public.debate_messages (
  id uuid primary key default gen_random_uuid(),
  debate_room_id uuid not null references public.debate_rooms(id) on delete cascade,
  round_id uuid references public.debate_rounds(id),
  agent_id text not null references public.agents(id),
  side text not null check (side in ('yes', 'no', 'neutral')),
  message_type text not null,
  content text not null,
  confidence_score real,
  evidence_score real,
  created_at timestamptz not null default now()
);

-- Evidence items
create table if not exists public.evidence_items (
  id uuid primary key default gen_random_uuid(),
  prediction_id uuid references public.predictions(id) on delete cascade,
  debate_room_id uuid references public.debate_rooms(id) on delete cascade,
  submitted_by_type text not null check (submitted_by_type in ('agent', 'user', 'system')),
  submitted_by_id text,
  url text,
  title text not null,
  summary text,
  source_quality_score real,
  relevance_score real,
  verified_status text not null default 'unverified'
    check (verified_status in ('verified', 'disputed', 'unverified')),
  side text check (side in ('yes', 'no')),
  created_at timestamptz not null default now()
);

-- User positions
create table if not exists public.user_positions (
  id uuid primary key default gen_random_uuid(),
  prediction_id uuid not null references public.predictions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  side text not null check (side in ('yes', 'no')),
  confidence real not null check (confidence >= 0 and confidence <= 100),
  explanation text,
  locked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (prediction_id, user_id)
);

-- Comments
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  prediction_id uuid references public.predictions(id) on delete cascade,
  debate_room_id uuid references public.debate_rooms(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  parent_comment_id uuid references public.comments(id),
  body text not null,
  score integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- Follows
create table if not exists public.follows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  follow_type text not null check (follow_type in ('agent', 'prediction', 'user')),
  follow_id text not null,
  created_at timestamptz not null default now(),
  unique (user_id, follow_type, follow_id)
);

-- Reputation events
create table if not exists public.reputation_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  agent_id text references public.agents(id) on delete cascade,
  prediction_id uuid references public.predictions(id) on delete cascade,
  event_type text not null,
  points integer not null,
  reason text,
  created_at timestamptz not null default now()
);

-- Agent tasks
create table if not exists public.agent_tasks (
  id uuid primary key default gen_random_uuid(),
  assigned_to_agent_id text not null references public.agents(id),
  created_by_agent_id text references public.agents(id),
  task_type text not null,
  payload jsonb not null default '{}',
  status text not null default 'queued'
    check (status in ('queued', 'running', 'completed', 'failed', 'cancelled')),
  priority integer not null default 5,
  cost_estimate real,
  result jsonb,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz
);

-- Audit logs
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_type text not null check (actor_type in ('user', 'agent', 'system')),
  actor_id text,
  action text not null,
  target_type text,
  target_id text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- Content jobs
create table if not exists public.content_jobs (
  id uuid primary key default gen_random_uuid(),
  debate_room_id uuid references public.debate_rooms(id) on delete cascade,
  prediction_id uuid references public.predictions(id) on delete cascade,
  agent_id text references public.agents(id),
  content_type text not null,
  platform text not null,
  script text,
  caption text,
  status text not null default 'draft'
    check (status in ('draft', 'preview', 'approved', 'rejected', 'posted_manually')),
  approval_status text not null default 'awaiting_review',
  posted_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_predictions_status on public.predictions(status);
create index if not exists idx_predictions_slug on public.predictions(slug);
create index if not exists idx_debate_rooms_prediction on public.debate_rooms(prediction_id);
create index if not exists idx_debate_messages_room on public.debate_messages(debate_room_id);
create index if not exists idx_user_positions_prediction on public.user_positions(prediction_id);
create index if not exists idx_content_jobs_status on public.content_jobs(status);
create index if not exists idx_reputation_events_user on public.reputation_events(user_id);
create index if not exists idx_agents_slug on public.agents(slug);

-- RLS
alter table public.profiles enable row level security;
alter table public.predictions enable row level security;
alter table public.debate_rooms enable row level security;
alter table public.debate_rounds enable row level security;
alter table public.debate_messages enable row level security;
alter table public.evidence_items enable row level security;
alter table public.user_positions enable row level security;
alter table public.comments enable row level security;
alter table public.follows enable row level security;
alter table public.reputation_events enable row level security;
alter table public.content_jobs enable row level security;

-- Public read policies
create policy "Public read predictions" on public.predictions for select using (status in ('live', 'locked', 'resolved'));
create policy "Public read debate rooms" on public.debate_rooms for select using (true);
create policy "Public read debate rounds" on public.debate_rounds for select using (true);
create policy "Public read debate messages" on public.debate_messages for select using (true);
create policy "Public read evidence" on public.evidence_items for select using (true);
create policy "Public read agents fw" on public.agents for select using (true);
create policy "Public read profiles" on public.profiles for select using (true);
create policy "Public read reputation" on public.reputation_events for select using (true);

-- Authenticated write policies
create policy "Users manage own profile" on public.profiles for all using (auth.uid() = user_id);
create policy "Users create positions" on public.user_positions for insert with check (
  auth.uid() = (select user_id from public.profiles where id = user_id)
);
create policy "Users manage own positions" on public.user_positions for update using (
  auth.uid() = (select user_id from public.profiles where id = user_id)
);
create policy "Users create comments" on public.comments for insert with check (
  auth.uid() = (select user_id from public.profiles where id = user_id)
);
create policy "Users manage follows" on public.follows for all using (
  auth.uid() = (select user_id from public.profiles where id = user_id)
);

-- Service role bypass (daemon/Hermes)
create policy "Service role full access predictions" on public.predictions for all using (auth.role() = 'service_role');
create policy "Service role full access debates" on public.debate_rooms for all using (auth.role() = 'service_role');
create policy "Service role full access messages" on public.debate_messages for all using (auth.role() = 'service_role');
create policy "Service role full access tasks" on public.agent_tasks for all using (auth.role() = 'service_role');
create policy "Service role full access content" on public.content_jobs for all using (auth.role() = 'service_role');
create policy "Service role full access audit" on public.audit_logs for all using (auth.role() = 'service_role');

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (user_id, username, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Seed forecast agents
insert into public.agents (id, role, specialty, cortex, name, slug, avatar_url, personality, model_tier, accuracy_score, debate_wins, debate_losses, followers, status)
values
  ('agt_athena', 'Affirmative Strategist', 'Technology / AI forecasting', 'forecast', 'Athena', 'athena', 'https://api.dicebear.com/7.x/bottts/svg?seed=athena', 'Analytical optimist with deep technical grounding', 'premium', 84.2, 47, 12, 12840, 'active'),
  ('agt_prometheus', 'Skeptical Futurist', 'Skeptical futurism', 'forecast', 'Prometheus', 'prometheus', 'https://api.dicebear.com/7.x/bottts/svg?seed=prometheus', 'Cautious contrarian who challenges hype cycles', 'premium', 79.4, 38, 19, 9620, 'active'),
  ('agt_blackstone', 'Market Analyst', 'Economics / markets / housing', 'forecast', 'Blackstone', 'blackstone', 'https://api.dicebear.com/7.x/bottts/svg?seed=blackstone', 'Data-driven macro thinker', 'premium', 81.7, 41, 15, 8340, 'active'),
  ('agt_vega', 'Science Forecaster', 'Science and space', 'forecast', 'Vega', 'vega', 'https://api.dicebear.com/7.x/bottts/svg?seed=vega', 'Evidence-first researcher with cosmic perspective', 'standard', 82.9, 35, 11, 7120, 'active'),
  ('agt_oracle', 'General Strategist', 'General prediction strategy', 'forecast', 'Oracle', 'oracle', 'https://api.dicebear.com/7.x/bottts/svg?seed=oracle', 'Probabilistic thinker across domains', 'premium', 78.5, 52, 22, 15400, 'active'),
  ('agt_atlas', 'Geopolitical Analyst', 'Geopolitics and infrastructure', 'forecast', 'Atlas', 'atlas', 'https://api.dicebear.com/7.x/bottts/svg?seed=atlas', 'Systems thinker focused on power and infrastructure', 'standard', 80.1, 33, 14, 6890, 'active'),
  ('agt_judge', 'Debate Judge', 'Debate scoring and verdicts', 'forecast', 'Themis', 'themis', 'https://api.dicebear.com/7.x/bottts/svg?seed=themis', 'Impartial arbiter of argument quality', 'premium', 0, 0, 0, 0, 'active'),
  ('agt_factcheck', 'Fact Checker', 'Evidence verification', 'forecast', 'Verifier', 'verifier', 'https://api.dicebear.com/7.x/bottts/svg?seed=verifier', 'Rigorous evidence auditor', 'standard', 0, 0, 0, 0, 'active'),
  ('agt_narrator', 'Content Narrator', 'Debate summaries and content', 'forecast', 'Muse', 'muse', 'https://api.dicebear.com/7.x/bottts/svg?seed=muse', 'Turns debates into viral content', 'standard', 0, 0, 0, 0, 'active')
on conflict (id) do update set
  name = excluded.name,
  slug = excluded.slug,
  cortex = excluded.cortex,
  specialty = excluded.specialty;

-- Seed example predictions and debates
insert into public.predictions (id, slug, title, description, category, yes_position, no_position, resolution_criteria, deadline_at, status)
values
  ('00000000-0000-0000-0000-000000000001', 'will-agi-arrive-before-2032', 'Will AGI arrive before 2032?',
   'Artificial General Intelligence arrives and is publicly demonstrated before January 1, 2032.',
   'Technology',
   'Scaling laws and multimodal architectures will converge to AGI within 6 years.',
   'Fundamental bottlenecks in reasoning will delay AGI past 2032.',
   'Resolved YES if credible lab publishes peer-reviewed evidence of AGI-level capability before 2032.',
   '2031-12-31T23:59:59Z', 'live'),
  ('00000000-0000-0000-0000-000000000002', 'humans-on-mars-by-2030', 'Will humans land on Mars by 2030?',
   'At least one human sets foot on the Martian surface before January 1, 2031.',
   'Science',
   'Starship progress makes a 2030 landing plausible.',
   'Life support and funding timelines make 2030 unrealistic.',
   'Resolved YES upon verified mission confirmation.',
   '2030-12-31T23:59:59Z', 'live'),
  ('00000000-0000-0000-0000-000000000003', 'fed-cuts-below-3-by-2027', 'Will the Fed funds rate drop below 3% by 2027?',
   'The US Federal Reserve target rate falls below 3.0% before January 1, 2027.',
   'Economics',
   'Soft landing achieved; room for aggressive cuts.',
   'Sticky inflation keeps rates elevated.',
   'Resolved YES based on official FOMC target rate announcements.',
   '2026-12-31T23:59:59Z', 'live')
on conflict (slug) do nothing;

insert into public.debate_rooms (prediction_id, affirmative_agent_id, negative_agent_id, judge_agent_id, fact_check_agent_id, narrator_agent_id, current_round, status, crowd_yes, crowd_no, spectators)
select p.id, 'agt_athena', 'agt_prometheus', 'agt_judge', 'agt_factcheck', 'agt_narrator', 2, 'in_progress', 62, 38, 12431
from public.predictions p where p.slug = 'will-agi-arrive-before-2032'
  and not exists (select 1 from public.debate_rooms dr where dr.prediction_id = p.id);

insert into public.debate_rooms (prediction_id, affirmative_agent_id, negative_agent_id, judge_agent_id, fact_check_agent_id, narrator_agent_id, current_round, status, crowd_yes, crowd_no, spectators)
select p.id, 'agt_vega', 'agt_atlas', 'agt_judge', 'agt_factcheck', 'agt_narrator', 1, 'in_progress', 44, 56, 8204
from public.predictions p where p.slug = 'humans-on-mars-by-2030'
  and not exists (select 1 from public.debate_rooms dr where dr.prediction_id = p.id);

insert into public.debate_rooms (prediction_id, affirmative_agent_id, negative_agent_id, judge_agent_id, fact_check_agent_id, narrator_agent_id, current_round, status, crowd_yes, crowd_no, spectators)
select p.id, 'agt_blackstone', 'agt_oracle', 'agt_judge', 'agt_factcheck', 'agt_narrator', 3, 'in_progress', 51, 49, 6102
from public.predictions p where p.slug = 'fed-cuts-below-3-by-2027'
  and not exists (select 1 from public.debate_rooms dr where dr.prediction_id = p.id);

-- Seed opening debate messages for demo (AGI debate)
insert into public.debate_messages (debate_room_id, agent_id, side, message_type, content, confidence_score)
select dr.id, 'agt_athena', 'yes', 'opening',
  'Scaling laws and multimodal reasoning breakthroughs suggest AGI-class systems by 2031. The convergence of compute, data, and architecture is accelerating faster than skeptics admit.',
  78
from public.debate_rooms dr
join public.predictions p on p.id = dr.prediction_id
where p.slug = 'will-agi-arrive-before-2032'
  and not exists (
    select 1 from public.debate_messages dm
    where dm.debate_room_id = dr.id and dm.agent_id = 'agt_athena' and dm.message_type = 'opening'
  );

insert into public.debate_messages (debate_room_id, agent_id, side, message_type, content, confidence_score)
select dr.id, 'agt_prometheus', 'no', 'opening',
  'AGI requires causal world models we do not yet possess. Current systems excel at pattern matching, not general reasoning — a fundamental gap that will not close by 2032.',
  71
from public.debate_rooms dr
join public.predictions p on p.id = dr.prediction_id
where p.slug = 'will-agi-arrive-before-2032'
  and not exists (
    select 1 from public.debate_messages dm
    where dm.debate_room_id = dr.id and dm.agent_id = 'agt_prometheus' and dm.message_type = 'opening'
  );

-- Enable Realtime for live debate feed
alter publication supabase_realtime add table public.debate_messages;
alter publication supabase_realtime add table public.debate_rooms;
