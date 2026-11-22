-- DRAFT ONLY. Not applied. Human review and explicit execution approval required.
-- No seed data, season start, auth configuration, or gameplay RPC is included.
begin;

-- Initial migration: fail rather than reuse a pre-existing schema with unknown objects/ACLs.
create schema gauss_private;
revoke all on schema gauss_private from public, anon, authenticated, service_role;
grant usage on schema public to anon, authenticated;

create table public.game_days (
  id uuid primary key default gen_random_uuid(),
  day_number smallint not null unique check (day_number between 1 and 30),
  play_date date not null unique check (isfinite(play_date)),
  published boolean not null default false
);

create table public.public_questions (
  id uuid primary key default gen_random_uuid(),
  game_day_id uuid not null references public.game_days(id),
  position smallint not null check (position between 1 and 6),
  prompt text not null check (length(trim(prompt)) > 0),
  unit text not null check (length(trim(unit)) > 0),
  voided_at timestamptz check (isfinite(voided_at)),
  -- Internal editorial notes may contain spoilers; excluded from client column grants.
  void_reason text check (length(trim(void_reason)) > 0),
  unique (game_day_id, position),
  check ((voided_at is null) = (void_reason is null))
);

-- Keep this schema OUT of the Supabase exposed schemas. No public answer views.
create table gauss_private.private_answers (
  question_id uuid primary key references public.public_questions(id),
  answer double precision not null check (answer > 0 and answer <= 1e15),
  reasoning text not null check (length(trim(reasoning)) > 0),
  source_url text not null check (source_url ~ '^https://')
);

create table public.player_profiles (
  player_id uuid primary key references auth.users(id) on delete cascade,
  nickname text check (nickname = trim(nickname) and char_length(nickname) between 2 and 32),
  nickname_approved boolean not null default false,
  check (not nickname_approved or nickname is not null)
);

create table public.guesses (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references auth.users(id) on delete cascade,
  question_id uuid not null references public.public_questions(id),
  guess double precision not null check (guess > 0 and guess <= 1e15),
  score double precision not null check (score >= 0 and score <= 100),
  -- Logical submission time, not a physical WAL commit timestamp.
  -- The future RPC must set this from its trusted post-lock admission time.
  committed_at timestamptz not null default statement_timestamp() check (isfinite(committed_at)),
  unique (player_id, question_id)
);

-- Supports per-question void recalculation without a scan of every player.
create index guesses_question_id_idx on public.guesses (question_id);

-- Server-maintained projection of COMPLETED days only; partial progress is in guesses.
create table public.daily_scores (
  player_id uuid not null references auth.users(id) on delete cascade,
  game_day_id uuid not null references public.game_days(id),
  score double precision not null check (score >= 0 and score <= 100),
  question_count smallint not null check (question_count between 1 and 6),
  completed_at timestamptz not null check (isfinite(completed_at)),
  primary key (player_id, game_day_id)
);

alter table public.game_days enable row level security;
alter table public.public_questions enable row level security;
alter table gauss_private.private_answers enable row level security;
alter table public.player_profiles enable row level security;
alter table public.guesses enable row level security;
alter table public.daily_scores enable row level security;

-- Explicit grants: no inherited Supabase table defaults or client write access.
revoke all on public.game_days, public.public_questions, public.player_profiles,
  public.guesses, public.daily_scores from public, anon, authenticated, service_role;
revoke all on gauss_private.private_answers from public, anon, authenticated, service_role;
-- Column allowlists also prevent future private columns becoming public by accident.
-- Clients must select these columns explicitly: SELECT * on questions is denied.
grant select (id, day_number, play_date, published)
  on public.game_days to anon, authenticated;
grant select (id, game_day_id, position, prompt, unit, voided_at)
  on public.public_questions to anon, authenticated;
grant select (player_id, nickname, nickname_approved)
  on public.player_profiles to authenticated;
grant select (id, player_id, question_id, guess, score, committed_at)
  on public.guesses to authenticated;
grant select (player_id, game_day_id, score, question_count, completed_at)
  on public.daily_scores to authenticated;

-- Publishing today also makes previous published days readable as an archive.
create policy released_days_read on public.game_days for select to anon, authenticated
  using (published and play_date <= (statement_timestamp() at time zone 'Europe/Istanbul')::date);
create policy released_questions_read on public.public_questions for select to anon, authenticated
  using (exists (select 1 from public.game_days d where d.id = public_questions.game_day_id));

-- Anonymous Auth users have the authenticated role too. Ownership is mandatory.
create policy own_profile_read on public.player_profiles for select to authenticated
  using ((select auth.uid()) = player_id);
create policy own_guesses_read on public.guesses for select to authenticated
  using ((select auth.uid()) = player_id);
create policy own_daily_scores_read on public.daily_scores for select to authenticated
  using ((select auth.uid()) = player_id);

-- Intentionally NO answer policy, client write policy, leaderboard view or SECURITY
-- DEFINER function. Transactional submission/reveal must be reviewed in the next phase.
-- service_role is explicitly denied direct access to these tables too: BYPASSRLS
-- does not bypass ACLs. Use a reviewed, narrowly granted authenticated RPC later;
-- the current publishable-key server client cannot write or read private answers.
-- No broad default privileges, existing functions, auth settings or exposed schemas
-- are changed. Future tables/functions still need their own explicit ACL review.
commit;
