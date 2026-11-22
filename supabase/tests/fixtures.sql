-- SYNTHETIC ONLY: no real questions, identities or season start.
insert into auth.users (id) values
  ('a0000000-0000-4000-8000-000000000001'),
  ('a0000000-0000-4000-8000-000000000002'),
  ('a0000000-0000-4000-8000-000000000003');
insert into public.game_days (id, day_number, play_date)
select ('10000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid, n,
  (clock_timestamp() at time zone 'Europe/Istanbul')::date + n - 2
from generate_series(1, 30) n;
insert into public.public_questions (id, game_day_id, position, prompt, unit, category)
select ('20000000-0000-4000-8000-' || lpad((d * 10 + p)::text, 12, '0'))::uuid,
  ('10000000-0000-4000-8000-' || lpad(d::text, 12, '0'))::uuid,
  p, 'SYNTHETIC estimation fixture ' || p, 'synthetic units', 'kampus'
from generate_series(1, 3) d cross join generate_series(1, 5) p;
insert into soraban_private.private_answers (question_id, answer, reasoning, source_url)
select id, position * 1000, 'SYNTHETIC reasoning, not a real fact', 'https://example.org/synthetic'
from public.public_questions;
