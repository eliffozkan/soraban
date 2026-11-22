-- REVIEW DRAFT. Fresh database only: apply after 0001 and 0002, with explicit approval.
begin;

alter table public.player_profiles
  add column nickname_changed_at timestamptz check (isfinite(nickname_changed_at)),
  add column nickname_window_start timestamptz check (isfinite(nickname_window_start)),
  add column nickname_changes integer not null default 0 check (nickname_changes between 0 and 5),
  add column nickname_locked boolean not null default false,
  add column leaderboard_hidden boolean not null default false,
  add column moderation_reason text;
create index daily_scores_ranking_idx on public.daily_scores(game_day_id, score desc, completed_at, player_id);

create function soraban_private.episode_json(p_day uuid) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object('id', d.id, 'slug', d.episode_key, 'title', d.episode_title,
    'date', d.play_date, 'totalCount', soraban_private.questions_per_day())
  from public.game_days d where d.id = p_day and d.episode_key is not null
$$;

create function public.soraban_episodes() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('episodes', coalesce(jsonb_agg(soraban_private.episode_json(d.id)
    order by case when d.episode_key = 'demo' then 0 else 1 end), '[]'::jsonb))
  from public.game_days d where d.published and d.episode_key is not null
$$;

create function public.soraban_episode(p_slug text, p_reveal boolean default false) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare v_player uuid := soraban_private.player_id(); v_day public.game_days; v_result jsonb;
begin
  select * into v_day from public.game_days where published and episode_key = p_slug for share;
  if not found then raise sqlstate 'PT404' using message = 'EPISODE_NOT_FOUND'; end if;
  insert into public.player_profiles(player_id) values(v_player) on conflict do nothing;
  perform 1 from public.player_profiles where player_id = v_player for share;
  perform soraban_private.assert_day_content(v_day.id);
  v_result := jsonb_build_object('episode', soraban_private.episode_json(v_day.id),
    'progress', soraban_private.progress(v_player, v_day.id));
  if p_reveal then
    return v_result || jsonb_build_object('guesses', coalesce((
      select jsonb_agg(soraban_private.revealed_guess(v_player, q.id) order by q.position)
      from public.public_questions q join public.guesses g on g.question_id = q.id and g.player_id = v_player
      where q.game_day_id = v_day.id), '[]'::jsonb));
  end if;
  return v_result || jsonb_build_object('questions', (
    select jsonb_agg(jsonb_strip_nulls(jsonb_build_object('id', q.id, 'position', q.position,
      'prompt', q.prompt, 'unit', q.unit, 'category', q.category,
      'state', case when q.voided_at is not null then 'void' when g.id is null then 'unanswered' else 'answered' end)) order by q.position)
    from public.public_questions q left join public.guesses g on g.question_id = q.id and g.player_id = v_player
    where q.game_day_id = v_day.id));
end;
$$;

create function soraban_private.normalize_nickname(p_name text) returns text
language plpgsql immutable set search_path = '' as $$
declare v_name text;
begin
  if p_name is null or octet_length(p_name) > 256 or p_name ~ '[[:cntrl:]]' then
    raise sqlstate 'PT400' using message = 'INVALID_NICKNAME';
  end if;
  v_name := trim(regexp_replace(normalize(p_name, NFKC), ' +', ' ', 'g'));
  if char_length(v_name) not between 2 and 24
    or v_name collate "C" !~ '^[A-Za-zÇĞİÖŞÜçğıöşü0-9][A-Za-zÇĞİÖŞÜçğıöşü0-9 _-]+$' then
    raise sqlstate 'PT400' using message = 'INVALID_NICKNAME';
  end if;
  return v_name;
end;
$$;

create function soraban_private.nickname_blocked(p_name text) returns boolean
language sql immutable set search_path = '' as $$
  select translate(regexp_replace(lower(translate(p_name, 'ÇĞİÖŞÜçğıöşü', 'CGIOSUcgiosu')),
    '[^a-z0-9]', '', 'g'), '013457', 'oieast')
    ~ '(fuck|shit|siktir|orospu|yarrak|amk|admin|moderator|soraban)'
$$;

create function soraban_private.profile_json(p_player uuid) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object('nickname', nickname, 'nicknameApproved', nickname_approved,
    'displayName', case when nickname_approved then nickname else 'Anonim oyuncu' end,
    'nicknameLocked', nickname_locked, 'leaderboardHidden', leaderboard_hidden)
  from public.player_profiles where player_id = p_player
$$;

create function public.soraban_profile() returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare v_player uuid := soraban_private.player_id();
begin
  insert into public.player_profiles(player_id) values(v_player) on conflict do nothing;
  perform 1 from public.player_profiles where player_id = v_player for share;
  return soraban_private.profile_json(v_player);
end;
$$;

create function public.soraban_set_nickname(p_nickname text) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_player uuid := soraban_private.player_id();
  v_name text := soraban_private.normalize_nickname(p_nickname);
  v_profile public.player_profiles;
  v_now timestamptz;
begin
  if soraban_private.nickname_blocked(v_name) then
    raise sqlstate 'PT400' using message = 'INVALID_NICKNAME';
  end if;
  insert into public.player_profiles(player_id) values(v_player) on conflict do nothing;
  select * into v_profile from public.player_profiles where player_id = v_player for update;
  v_now := clock_timestamp();
  if v_profile.nickname_locked then raise sqlstate 'PT403' using message = 'NICKNAME_LOCKED'; end if;
  if v_profile.nickname = v_name then return soraban_private.profile_json(v_player); end if;
  if v_profile.nickname_changed_at > v_now - interval '60 seconds'
    or (v_profile.nickname_window_start > v_now - interval '1 hour' and v_profile.nickname_changes >= 5) then
    raise sqlstate 'PT429' using message = 'RATE_LIMITED';
  end if;
  update public.player_profiles set nickname = v_name, nickname_approved = false,
    nickname_changed_at = v_now,
    nickname_window_start = case when nickname_window_start > v_now - interval '1 hour' then nickname_window_start else v_now end,
    nickname_changes = case when nickname_window_start > v_now - interval '1 hour' then nickname_changes + 1 else 1 end,
    moderation_reason = case when leaderboard_hidden then moderation_reason else null end
  where player_id = v_player;
  -- Changing a name cannot clear leaderboard_hidden or a moderator's lock.
  return soraban_private.profile_json(v_player);
end;
$$;

-- Owner-only, optimistic name match prevents approving a name changed during review.
create function soraban_private.moderate_profile(p_player uuid, p_expected_nickname text,
  p_approve boolean, p_hide boolean, p_lock boolean, p_reason text) returns void
language plpgsql set search_path = '' as $$
declare v_profile public.player_profiles;
begin
  select * into v_profile from public.player_profiles where player_id = p_player for update;
  if not found or v_profile.nickname is distinct from p_expected_nickname
    or p_approve is null or p_hide is null or p_lock is null or p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'Invalid or stale moderation request';
  end if;
  if p_approve and (v_profile.nickname is null or soraban_private.nickname_blocked(v_profile.nickname)) then
    raise exception 'Cannot approve this nickname';
  end if;
  if p_approve and soraban_private.normalize_nickname(v_profile.nickname) is distinct from v_profile.nickname then
    raise exception 'Cannot approve an invalid nickname';
  end if;
  update public.player_profiles set nickname_approved = p_approve, leaderboard_hidden = p_hide,
    nickname_locked = p_lock, moderation_reason = p_reason where player_id = p_player;
end;
$$;

create function public.soraban_episode_leaderboard(p_slug text, p_limit integer default 50, p_offset integer default 0)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare v_day public.game_days; v_player uuid := auth.uid(); v_result jsonb;
begin
  if p_limit is null or p_limit not between 1 and 100 or p_offset is null or p_offset not between 0 and 10000 then
    raise sqlstate 'PT400' using message = 'INVALID_PAGINATION';
  end if;
  if v_player is not null then perform soraban_private.player_id(); end if;
  select * into v_day from public.game_days where published and episode_key = p_slug for share;
  if not found then raise sqlstate 'PT404' using message = 'EPISODE_NOT_FOUND'; end if;
  perform soraban_private.assert_day_content(v_day.id);
  with ranked as (
    select s.player_id, s.score, rank() over(order by s.score desc) as rank,
      row_number() over(order by s.score desc, s.completed_at, s.player_id) as ordinal,
      case when p.nickname_approved then p.nickname else 'Anonim oyuncu' end as nickname
    from public.daily_scores s join public.player_profiles p on p.player_id = s.player_id
    where s.game_day_id = v_day.id and not p.leaderboard_hidden
  ), safe as (
    select player_id, ordinal, jsonb_build_object('rank', rank, 'nickname', nickname, 'scoreRaw', score) as entry from ranked
  )
  select jsonb_build_object('episode', soraban_private.episode_json(v_day.id), 'status', 'ready',
    'entries', coalesce((select jsonb_agg(entry order by ordinal) from safe
      where ordinal > p_offset and ordinal <= p_offset + p_limit), '[]'::jsonb),
    'me', (select entry from safe where player_id = v_player),
    'totalPlayers', (select count(*) from safe), 'limit', p_limit, 'offset', p_offset)
  into v_result;
  return v_result;
end;
$$;

-- Owner-only atomic import/publication. Reimporting identical published content is
-- a no-op; changed published content cannot erase guesses, corrections or scores.
create function soraban_private.import_episode(p_slug text, p_title text, p_date date, p_questions jsonb)
returns uuid language plpgsql set search_path = '' as $$
declare v_day public.game_days; v_item jsonb; v_id uuid; v_input jsonb; v_stored jsonb;
begin
  if p_slug is null or p_slug not in ('demo', '2026-11-22') or p_title is null
    or length(trim(p_title)) not between 1 and 80
    or (p_slug = 'demo' and p_date is not null)
    or (p_slug = '2026-11-22' and p_date is distinct from date '2026-11-22')
    or jsonb_typeof(p_questions) is distinct from 'array' then
    raise exception 'Invalid episode manifest';
  end if;
  if jsonb_array_length(p_questions) <> soraban_private.questions_per_day() then
    raise exception 'Exactly five verified questions are required';
  end if;
  for v_item in select value from jsonb_array_elements(p_questions) loop
    if jsonb_typeof(v_item) is distinct from 'object'
      or jsonb_typeof(v_item->'position') is distinct from 'number'
      or coalesce(v_item->>'position', '') !~ '^[1-5]$'
      or jsonb_typeof(v_item->'answer') is distinct from 'number'
      or v_item->'verified' is distinct from 'true'::jsonb
      or coalesce(length(trim(v_item->>'verifiedBy')), 0) not between 1 and 100
      or coalesce(length(trim(v_item->>'prompt')), 0) not between 1 and 1000
      or coalesce(length(trim(v_item->>'unit')), 0) not between 1 and 100
      or coalesce(length(trim(v_item->>'reasoning')), 0) not between 1 and 4000
      or coalesce(length(v_item->>'sourceUrl'), 0) not between 9 and 2048
      or coalesce(v_item->>'sourceUrl', '') !~ '^https://[^[:space:]]+$' then
      raise exception 'Invalid or unverified question';
    end if;
    if not ((v_item->>'answer')::numeric > 0 and (v_item->>'answer')::numeric <= 1e15) then
      raise exception 'Invalid numerical answer';
    end if;
  end loop;
  if (select count(distinct value->>'position') from jsonb_array_elements(p_questions)) <> 5
    or (select count(distinct lower(regexp_replace(normalize(trim(value->>'prompt'), NFKC), '[[:space:]]+', ' ', 'g')))
      from jsonb_array_elements(p_questions)) <> 5 then
    raise exception 'Question positions and prompts must be unique';
  end if;
  lock table public.game_days in share row exclusive mode;
  select * into v_day from public.game_days where episode_key = p_slug for update;
  if not found then
    insert into public.game_days(episode_key, episode_title, play_date)
    values(p_slug, trim(p_title), p_date) returning * into v_day;
  end if;
  if exists (select 1 from public.public_questions q join public.game_days d on d.id = q.game_day_id
    where d.episode_key is not null and d.episode_key <> p_slug
      and lower(regexp_replace(normalize(trim(q.prompt), NFKC), '[[:space:]]+', ' ', 'g')) in (
        select lower(regexp_replace(normalize(trim(value->>'prompt'), NFKC), '[[:space:]]+', ' ', 'g'))
        from jsonb_array_elements(p_questions))) then
    raise exception 'Presentation episodes must contain different questions';
  end if;
  select jsonb_agg(jsonb_strip_nulls(jsonb_build_object('position', (q->>'position')::integer,
    'prompt', trim(q->>'prompt'), 'unit', trim(q->>'unit'), 'category', q->>'category',
    'answer', (q->>'answer')::double precision, 'reasoning', trim(q->>'reasoning'), 'sourceUrl', q->>'sourceUrl'))
    order by (q->>'position')::integer) into v_input from jsonb_array_elements(p_questions) q;
  if v_day.published then
    select jsonb_agg(jsonb_strip_nulls(jsonb_build_object('position', q.position, 'prompt', q.prompt,
      'unit', q.unit, 'category', q.category, 'answer', a.answer, 'reasoning', a.reasoning, 'sourceUrl', a.source_url))
      order by q.position) into v_stored from public.public_questions q
      join soraban_private.private_answers a on a.question_id = q.id where q.game_day_id = v_day.id;
    if v_input is distinct from v_stored or v_day.episode_title is distinct from trim(p_title)
      or v_day.play_date is distinct from p_date then
      raise exception 'Published episode differs; replacement is forbidden';
    end if;
    return v_day.id;
  end if;
  delete from soraban_private.private_answers where question_id in (select id from public.public_questions where game_day_id = v_day.id);
  delete from public.public_questions where game_day_id = v_day.id;
  for v_item in select value from jsonb_array_elements(v_input) loop
    insert into public.public_questions(game_day_id, position, prompt, unit, category)
    values(v_day.id, (v_item->>'position')::smallint, v_item->>'prompt', v_item->>'unit', v_item->>'category') returning id into v_id;
    insert into soraban_private.private_answers(question_id, answer, reasoning, source_url)
    values(v_id, (v_item->>'answer')::double precision, v_item->>'reasoning', v_item->>'sourceUrl');
  end loop;
  perform soraban_private.assert_day_content(v_day.id);
  update public.game_days set episode_title = trim(p_title), play_date = p_date, published = true where id = v_day.id;
  return v_day.id;
end;
$$;

revoke all on all functions in schema soraban_private from public, anon, authenticated, service_role;
revoke all on function public.soraban_episodes(), public.soraban_episode(text, boolean),
  public.soraban_profile(), public.soraban_set_nickname(text),
  public.soraban_episode_leaderboard(text, integer, integer) from public, anon, authenticated, service_role;
grant execute on function public.soraban_episodes(), public.soraban_episode_leaderboard(text, integer, integer) to anon, authenticated;
grant execute on function public.soraban_episode(text, boolean), public.soraban_profile(), public.soraban_set_nickname(text) to authenticated;
notify pgrst, 'reload schema';
commit;
