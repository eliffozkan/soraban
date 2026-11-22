-- DRAFT ONLY. Not executed. Requires 0001 on a fresh, approved database.
begin;

create function soraban_private.score_guess(p_answer double precision, p_guess double precision)
returns double precision language plpgsql immutable set search_path = '' as $$
declare
  hi double precision := greatest(p_answer, p_guess);
  lo double precision := least(p_answer, p_guess);
begin
  if p_answer is null or p_guess is null
    or not (p_answer > 0 and p_answer <= 1e15 and p_guess > 0 and p_guess <= 1e15) then
    raise sqlstate 'PT400' using message = 'INVALID_GUESS';
  end if;
  -- Guard overflow before dividing, including subnormal inputs. No stored rounding.
  if ln(hi) - ln(lo) >= ln(100::double precision) then return 0; end if;
  return greatest(0, 100 - 50 * log(hi / lo));
end;
$$;

create function soraban_private.player_id() returns uuid
language plpgsql stable set search_path = '' as $$
declare v_player uuid := auth.uid();
begin
  if v_player is null or not exists (select 1 from auth.users where id = v_player) then
    raise sqlstate 'PT401' using message = 'AUTH_REQUIRED';
  end if;
  return v_player;
end;
$$;

create function soraban_private.progress(p_player uuid, p_day uuid) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'answeredCount', count(g.id) filter (where q.voided_at is null),
    'totalCount', count(*),
    'completed', count(*) filter (where q.voided_at is null) > 0
      and count(g.id) filter (where q.voided_at is null) = count(*) filter (where q.voided_at is null),
    'scoreRaw', case when count(*) filter (where q.voided_at is null) > 0
      and count(g.id) filter (where q.voided_at is null) = count(*) filter (where q.voided_at is null)
      then avg(g.score order by q.position) filter (where q.voided_at is null) else null end
  ) from public.public_questions q
  left join public.guesses g on g.question_id = q.id and g.player_id = p_player
  where q.game_day_id = p_day
$$;

create function soraban_private.refresh_daily_score(p_player uuid, p_day uuid) returns void
language plpgsql set search_path = '' as $$
declare v_progress jsonb; v_completed timestamptz;
begin
  v_progress := soraban_private.progress(p_player, p_day);
  if (v_progress->>'completed')::boolean then
    select greatest(max(g.committed_at) filter (where q.voided_at is null), max(q.voided_at))
    into v_completed from public.public_questions q
    left join public.guesses g on g.question_id = q.id and g.player_id = p_player
    where q.game_day_id = p_day;
    insert into public.daily_scores (player_id, game_day_id, score, question_count, completed_at)
    values (p_player, p_day, (v_progress->>'scoreRaw')::double precision,
      (v_progress->>'answeredCount')::smallint, v_completed)
    on conflict (player_id, game_day_id) do update
      set score = excluded.score, question_count = excluded.question_count;
    -- Preserve original completion time on retries/recalculation of completed days.
  else
    delete from public.daily_scores where player_id = p_player and game_day_id = p_day;
  end if;
end;
$$;

create function soraban_private.assert_day_content(p_day uuid) returns void
language plpgsql stable set search_path = '' as $$
begin
  if (select count(*) from public.public_questions where game_day_id = p_day)
       <> soraban_private.questions_per_day()
    or exists (select 1 from public.public_questions q
      left join soraban_private.private_answers a on a.question_id = q.id
      where q.game_day_id = p_day and a.question_id is null)
    or not exists (select 1 from public.public_questions where game_day_id = p_day and voided_at is null) then
    raise sqlstate 'PT503' using message = 'DAY_UNAVAILABLE';
  end if;
end;
$$;

-- Trusted, owner-only publication. Approved start is an explicit argument, never guessed.
-- Requiring the complete 30-day schedule prevents publishing an inconsistent season.
create function soraban_private.publish_game_day(p_day uuid, p_season_start date) returns void
language plpgsql set search_path = '' as $$
declare v_day public.game_days;
begin
  lock table public.game_days in share row exclusive mode;
  select * into v_day from public.game_days where id = p_day for update;
  if not found or v_day.episode_key is not null or p_season_start is null or not isfinite(p_season_start) then
    raise exception 'Invalid publication request';
  end if;
  if (select count(*) from public.game_days where episode_key is null) <> 30
    or exists (select 1 from public.game_days where episode_key is null and play_date <> p_season_start + (day_number - 1)) then
    raise exception 'The approved consecutive 30-day schedule is required';
  end if;
  perform soraban_private.assert_day_content(p_day);
  if exists (select 1 from public.public_questions where game_day_id = p_day and voided_at is not null) then
    raise exception 'Do not publish pre-voided content';
  end if;
  update public.game_days set published = true where id = p_day;
end;
$$;

-- No player/id arguments on exposed RPCs. Private helpers never receive client grants.
create function soraban_private.revealed_guess(p_player uuid, p_question uuid) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object('questionId', g.question_id, 'guess', g.guess,
    'scoreRaw', g.score, 'correctAnswer', a.answer, 'reasoning', a.reasoning, 'sourceUrl', a.source_url)
  from public.guesses g join soraban_private.private_answers a on a.question_id = g.question_id
  where g.player_id = p_player and g.question_id = p_question
$$;

create function soraban_private.read_today(p_reveal boolean) returns jsonb
language plpgsql set search_path = '' as $$
declare
  v_player uuid := soraban_private.player_id();
  v_day public.game_days;
  v_result jsonb;
begin
  select * into v_day from public.game_days
  where published and episode_key is null
    and play_date = (clock_timestamp() at time zone 'Europe/Istanbul')::date for share;
  if not found then raise sqlstate 'PT503' using message = 'DAY_UNAVAILABLE'; end if;
  -- Ensure the lock exists even on a player's first read racing their first guess.
  insert into public.player_profiles (player_id) values (v_player) on conflict (player_id) do nothing;
  perform 1 from public.player_profiles where player_id = v_player for share;
  -- A lock wait may cross midnight. Never mix yesterday's questions with today's state.
  if v_day.play_date <> (clock_timestamp() at time zone 'Europe/Istanbul')::date then
    raise sqlstate 'PT503' using message = 'DAY_UNAVAILABLE';
  end if;
  perform soraban_private.assert_day_content(v_day.id);
  v_result := jsonb_build_object('day', jsonb_build_object('id', v_day.id,
    'number', v_day.day_number, 'date', v_day.play_date),
    'progress', soraban_private.progress(v_player, v_day.id));
  if p_reveal then
    return v_result || jsonb_build_object('guesses', coalesce((
      select jsonb_agg(soraban_private.revealed_guess(v_player, q.id) order by q.position)
      from public.public_questions q join public.guesses g on g.question_id = q.id and g.player_id = v_player
      where q.game_day_id = v_day.id
    ), '[]'::jsonb));
  end if;
  return v_result || jsonb_build_object('questions', (
    select jsonb_agg(jsonb_strip_nulls(jsonb_build_object('id', q.id, 'position', q.position,
      'prompt', q.prompt, 'unit', q.unit, 'category', q.category,
      'state', case when q.voided_at is not null then 'void' when g.id is not null then 'answered' else 'unanswered' end)) order by q.position)
    from public.public_questions q left join public.guesses g on g.question_id = q.id and g.player_id = v_player
    where q.game_day_id = v_day.id
  ));
end;
$$;

-- VOLATILE: PostgREST must allow row locks and fresh snapshots after lock waits.
create function public.soraban_today() returns jsonb
language sql volatile security definer set search_path = '' as $$
  select soraban_private.read_today(false)
$$;
create function public.soraban_my_today() returns jsonb
language sql volatile security definer set search_path = '' as $$
  select soraban_private.read_today(true)
$$;

create function public.soraban_submit_guess(p_question_id uuid, p_guess double precision) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_player uuid := soraban_private.player_id();
  v_day public.game_days;
  v_day_id uuid;
  v_question public.public_questions;
  v_answer double precision;
  v_admitted timestamptz;
begin
  if p_guess is null or not (p_guess > 0 and p_guess <= 1e15) then
    raise sqlstate 'PT400' using message = 'INVALID_GUESS';
  end if;
  select game_day_id into v_day_id from public.public_questions where id = p_question_id;
  if not found then raise sqlstate 'PT404' using message = 'QUESTION_NOT_FOUND'; end if;
  select * into v_day from public.game_days where id = v_day_id for share;
  if not v_day.published or (v_day.episode_key is null
    and v_day.play_date > (clock_timestamp() at time zone 'Europe/Istanbul')::date) then
    raise sqlstate 'PT404' using message = 'QUESTION_NOT_FOUND';
  end if;
  -- Same lock order for reads, guesses, and trusted voiding: day, then player.
  insert into public.player_profiles (player_id) values (v_player) on conflict (player_id) do nothing;
  perform 1 from public.player_profiles where player_id = v_player for update;
  v_admitted := clock_timestamp();
  if exists (select 1 from public.guesses where player_id = v_player and question_id = p_question_id) then
    return jsonb_build_object('guess', soraban_private.revealed_guess(v_player, p_question_id),
      'progress', soraban_private.progress(v_player, v_day.id));
  end if;
  select * into v_question from public.public_questions where id = p_question_id;
  if (v_day.episode_key is null and v_day.play_date <> (v_admitted at time zone 'Europe/Istanbul')::date)
    or v_question.voided_at is not null then
    raise sqlstate 'PT409' using message = 'DAY_CLOSED';
  end if;
  perform soraban_private.assert_day_content(v_day.id);
  select answer into v_answer from soraban_private.private_answers where question_id = p_question_id;
  insert into public.guesses (player_id, question_id, guess, score, committed_at)
  values (v_player, p_question_id, p_guess, soraban_private.score_guess(v_answer, p_guess), v_admitted);
  perform soraban_private.refresh_daily_score(v_player, v_day.id);
  -- This result is delivered by PostgREST only after the entire transaction commits.
  return jsonb_build_object('guess', soraban_private.revealed_guess(v_player, p_question_id),
    'progress', soraban_private.progress(v_player, v_day.id));
end;
$$;

-- Exceptional owner-only maintenance; no HTTP endpoint or client EXECUTE grant.
create function soraban_private.void_question(p_question uuid, p_reason text) returns void
language plpgsql set search_path = '' as $$
declare v_day uuid; v_player uuid; v_voided timestamptz;
begin
  select game_day_id into v_day from public.public_questions where id = p_question;
  if not found or p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'Invalid void request';
  end if;
  perform 1 from public.game_days where id = v_day and published for update;
  if not found then raise exception 'Only published questions can be voided'; end if;
  select voided_at into v_voided from public.public_questions where id = p_question;
  if v_voided is not null then return; end if;
  if (select count(*) from public.public_questions where game_day_id = v_day and voided_at is null) <= 1 then
    raise exception 'Cannot void the final valid question';
  end if;
  update public.public_questions set voided_at = clock_timestamp(), void_reason = trim(p_reason) where id = p_question;
  for v_player in select distinct g.player_id from public.guesses g
    join public.public_questions q on q.id = g.question_id where q.game_day_id = v_day order by g.player_id loop
    perform 1 from public.player_profiles where player_id = v_player for update;
    perform soraban_private.refresh_daily_score(v_player, v_day);
  end loop;
end;
$$;

revoke all on all functions in schema soraban_private from public, anon, authenticated, service_role;
revoke all on function public.soraban_today(), public.soraban_my_today(),
  public.soraban_submit_guess(uuid, double precision) from public, anon, authenticated, service_role;
grant execute on function public.soraban_today(), public.soraban_my_today(),
  public.soraban_submit_guess(uuid, double precision) to authenticated;
notify pgrst, 'reload schema';
commit;
