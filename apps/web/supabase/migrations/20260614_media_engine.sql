-- ─────────────────────────────────────────────────────────────────────────────
-- Arkhe Media Engine — Database Schema
-- Autonomous creation. Manual publication.
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ── Channels ──────────────────────────────────────────────────────────────────
create table if not exists me_channels (
  id          text primary key,  -- 'ark_legal_signal' | 'agentos_journey'
  name        text not null,
  tagline     text,
  color       text,
  created_at  timestamptz default now()
);

insert into me_channels (id, name, tagline, color) values
  ('ark_legal_signal', 'Ark Legal Signal',  'Legal education for the public',           '#06b6d4'),
  ('agentos_journey',  'AgentOS Journey',   'Documenting autonomous AI in the real world', '#8b5cf6')
on conflict (id) do nothing;

-- ── Topics ────────────────────────────────────────────────────────────────────
create table if not exists me_topics (
  id                  uuid primary key default gen_random_uuid(),
  title               text not null,
  summary             text,
  source_notes        text,
  attention_score     smallint check (attention_score between 1 and 10),
  urgency_score       smallint check (urgency_score between 1 and 10),
  legal_issue         text,
  channel             text references me_channels(id),
  recommended_angle   text,
  risk_level          text not null default 'low' check (risk_level in ('low','medium','high','critical')),
  status              text not null default 'discovered' check (status in (
    'discovered','selected','drafting','guardrail_review','ready_for_brian',
    'revision_requested','approved','exported','posted_manually',
    'rejected','archived','too_risky'
  )),
  ark_reasoning       text,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

-- ── Source links (one-to-many for topics) ─────────────────────────────────────
create table if not exists me_source_links (
  id         uuid primary key default gen_random_uuid(),
  topic_id   uuid references me_topics(id) on delete cascade,
  url        text not null,
  label      text,
  created_at timestamptz default now()
);

-- ── Generated scripts ─────────────────────────────────────────────────────────
create table if not exists me_generated_scripts (
  id                  uuid primary key default gen_random_uuid(),
  topic_id            uuid references me_topics(id) on delete cascade,
  angles              jsonb,     -- VideoAngle[]
  chosen_angle_index  smallint default 0,
  script_30s          text,
  script_60s          text,
  script_2min         text,
  shorts_title        text,
  long_title          text,
  caption             text,
  hashtags            text[],
  blog_transcript     text,
  pinned_comment      text,
  thumbnail_concept   text,
  visual_sequence     text[],
  voiceover_text      text,
  created_at          timestamptz default now()
);

-- ── Guardrail reports ─────────────────────────────────────────────────────────
create table if not exists me_guardrail_reports (
  id                    uuid primary key default gen_random_uuid(),
  script_id             uuid references me_generated_scripts(id) on delete cascade,
  approved_for_review   boolean not null default false,
  risk_score            smallint check (risk_score between 0 and 100),
  risk_level            text check (risk_level in ('low','medium','high','critical')),
  issues                text[],
  required_fixes        text[],
  safe_summary          text,
  recommended_revision  text,
  reviewed_at           timestamptz default now()
);

-- ── Video packages (assembled bundle) ────────────────────────────────────────
create table if not exists me_video_packages (
  id              uuid primary key default gen_random_uuid(),
  topic_id        uuid references me_topics(id) on delete cascade,
  script_id       uuid references me_generated_scripts(id),
  guardrail_id    uuid references me_guardrail_reports(id),
  package_status  text not null default 'drafting',
  created_at      timestamptz default now()
);

-- ── Approvals ────────────────────────────────────────────────────────────────
create table if not exists me_approvals (
  id            uuid primary key default gen_random_uuid(),
  package_id    uuid references me_video_packages(id) on delete cascade,
  action        text not null check (action in ('approve','reject','revise','save_for_later','mark_too_risky')),
  notes         text,
  actioned_by   text default 'Brian',
  actioned_at   timestamptz default now()
);

-- ── Exports ──────────────────────────────────────────────────────────────────
create table if not exists me_exports (
  id                      uuid primary key default gen_random_uuid(),
  package_id              uuid references me_video_packages(id) on delete cascade,
  voiceover_script        text,
  captions_text           text,
  title                   text,
  description             text,
  hashtags                text[],
  pinned_comment          text,
  thumbnail_prompt        text,
  blog_transcript         text,
  source_notes            text,
  guardrail_summary       text,
  recommended_platform    text,
  recommended_post_time   text,
  brian_checklist         text[],
  exported_at             timestamptz default now()
);

-- ── Manual posts (Brian records when he posts) ────────────────────────────────
create table if not exists me_manual_posts (
  id          uuid primary key default gen_random_uuid(),
  package_id  uuid references me_video_packages(id),
  platform    text not null,
  post_url    text,
  channel     text references me_channels(id),
  notes       text,
  posted_at   timestamptz default now()
);

-- ── Analytics snapshots ───────────────────────────────────────────────────────
create table if not exists me_analytics_snapshots (
  id                uuid primary key default gen_random_uuid(),
  manual_post_id    uuid references me_manual_posts(id),
  channel           text references me_channels(id),
  upload_date       date,
  post_url          text,
  views_1h          integer default 0,
  views_24h         integer default 0,
  views_7d          integer default 0,
  likes             integer default 0,
  comments          integer default 0,
  shares            integer default 0,
  profile_clicks    integer default 0,
  link_clicks       integer default 0,
  followers_gained  integer default 0,
  estimated_cost    numeric(10,4) default 0,
  estimated_revenue numeric(10,4) default 0,
  notes             text,
  recorded_at       timestamptz default now()
);

-- ── Mission logs ──────────────────────────────────────────────────────────────
create table if not exists me_mission_logs (
  id                  uuid primary key default gen_random_uuid(),
  week_start          date not null,
  week_end            date not null,
  topics_found        integer default 0,
  packages_created    integer default 0,
  packages_approved   integer default 0,
  packages_rejected   integer default 0,
  packages_posted     integer default 0,
  best_performer      text,
  worst_performer     text,
  total_cost          numeric(10,4) default 0,
  total_revenue       numeric(10,4) default 0,
  ark_narrative       text,
  next_steps          text[],
  created_at          timestamptz default now()
);

-- ── Triggers: updated_at on topics ───────────────────────────────────────────
create or replace function me_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_me_topics_updated_at on me_topics;
create trigger trg_me_topics_updated_at
  before update on me_topics
  for each row execute function me_set_updated_at();

-- ── Seed: sample topics for Appeal Week test ─────────────────────────────────
insert into me_topics (title, summary, legal_issue, channel, recommended_angle, risk_level, status, attention_score, urgency_score, ark_reasoning)
values
  (
    'Appeal Week: What Does an Appeal Actually Require?',
    'Many people believe an appeal is a second trial. It is not. This video explains what a criminal appeal actually requires.',
    'appeal', 'ark_legal_signal',
    'Explain the difference between a trial and an appeal; focus on preserved error and standard of review',
    'low', 'discovered', 9, 8,
    'High attention due to public misconceptions about appeals. Safe to teach because we explain legal standards without deciding any case.'
  ),
  (
    'What Is Harmless Error and Why Does It Matter?',
    'Courts often affirm convictions even when errors occurred at trial. The harmless error doctrine explains when errors do not change outcomes.',
    'harmless_error', 'ark_legal_signal',
    'Explain harmless error standard and why courts use it',
    'low', 'discovered', 8, 7,
    'Strong educational value. Widely misunderstood concept. Zero factual speculation needed.'
  ),
  (
    'AgentOS Journey: What Did Ark Cost This Week?',
    'Weekly transparency report from Ark documenting production costs, revenue, and progress toward self-sustainability.',
    null, 'agentos_journey',
    'Document real costs and real outcomes from this production week',
    'low', 'discovered', 7, 9,
    'Core mission content. Builds audience trust through radical transparency about AI economics.'
  )
on conflict do nothing;
