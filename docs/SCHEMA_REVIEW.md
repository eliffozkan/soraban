# Initial schema review — draft, not executed

Static review against GAUSS context v0.2; this is not human approval or a runtime
PostgreSQL/RLS test. SQL deliberately lives in `supabase/drafts`, outside automatic
migration discovery. No Supabase project was contacted.

- Six tables cover days, public prompts, private answers, profiles, locked guesses
  and completed-day scores. No question data, season dates or credentials are seeded.
- Answers, reasoning and sources are in `gauss_private`, with no client schema/table
  grants or RLS policies. Keep that schema out of the exposed Data API schemas.
- All six tables enable RLS. Released prompts are readable on/after their Istanbul
  date only when explicitly published. Client writes are denied on every table.
- Anonymous Auth users receive `authenticated`; own-row policies use `auth.uid()`.
  Profile data is private for now, with no email column or public leaderboard.
- Unique `(player_id, question_id)` prevents duplicate inserts; clients cannot update
  or delete guesses. It does not implement the complete transactional game protocol.
- Positive finite numeric checks reject Infinity and PostgreSQL NaN using upper bounds
  (PostgreSQL orders NaN above finite values). Scores use double precision, no rounding.
- Day positions allow at most six questions. Exactly six verified questions per published
  day must be checked by the later publication/submission transaction.
- Draft maximum is 1e15, matching the scoring default; changes must update both.

## Before approving execution

Review on the intended Supabase version and decide the maximum value, season start,
tie breaking and all-void-day behavior. Suggested ties: raw score descending, then
completion time ascending, then player UUID ascending. Season ties could use the
last completed-day timestamp, then player UUID. These are proposals, not game logic.

After explicit migration-execution approval, test in an isolated database with
unauthenticated, anonymous Auth, permanent owner and other-user sessions. Verify
future/unpublished prompts and all private answers are inaccessible, own rows only,
and all direct inserts/updates/deletes fail. Test midnight boundaries independently
of database session timezone. No SQL/RLS runtime tests were run during setup.

Before the vertical slice, add a narrowly authorized submission transaction with a
fixed search_path, verified caller identity, current-day/void checks, atomic unique
insert, raw server scoring and reveal only after commit. Grant only its required
privileges; audit RPC execution permissions and any definer functions. Never add a
blanket answer-read policy. Archive answer access needs a separately reviewed path.

Completed daily scores are a future server-maintained projection, not client input.
Recompute on voiding and exclude voided questions from denominators. An all-void day
needs an owner decision. Official ranking must check linked identity, not merely the
`authenticated` role; profile approval must precede public nicknames. Before launch:
rate limits, privacy notice, conflict handling for identity linking and abuse tests.

References checked for setup:
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/auth/server-side/creating-a-client
- https://supabase.com/docs/guides/getting-started/api-keys
