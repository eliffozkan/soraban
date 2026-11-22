# Disposable gameplay verification — execution approval required

**Episode sprint:** the current harness now also loads 0003 and runs
`episode_checks.py`. It has not been executed for this revision; the earlier
five-group pass below covers only the previous Milestone 2 SQL. A new explicit
approval is needed. The runner rejects remote Docker endpoints. See
`supabase/EPISODES.md` for content/import and the updated execution sequence.

Do not run these commands until Elif separately approves disposable database and
migration execution. PR approval is not execution approval. Nothing here reads
`.env.local` or contacts live Supabase.

After approval, with Docker available, from the repo root:

```sh
python3 supabase/tests/integration.py --approved-disposable-execution
```

The runner downloads `postgres:17-alpine` if needed and creates a uniquely named
temporary container with **no network, host ports, persistent volumes or password**.
Database files live in a disposable tmpfs. It
executes psql inside it: `bootstrap.sql`, both drafts in order, then `fixtures.sql`.
It prints the five original result groups plus three episode/profile/ranking groups
and stops its own container in `finally`.
The local trust setting is for this isolated container only, never a shared DB.

Prepared checks: exact publication/answer coverage/consecutive dates; permissions,
RLS and answer privacy; SQL scoring/invalid numbers; concurrent same question and
different final questions; rollback, caller isolation and closed days; void-induced
completion and final-question protection. Fixtures are explicitly synthetic and
use a temporary schedule relative to the test clock, not a real season start.
Running across midnight may close the test day; rerun in a fresh container then.

These are PostgreSQL tests with minimal `auth.users`/`auth.uid()` test doubles,
not Supabase Auth, PostgREST or browser tests. The explicitly approved run on
22 November 2026 passed all five groups with exit 0; no runtime fixes were needed.
An independent Docker check confirmed no matching containers remained afterward.
No `.env.local` or live-service access occurred. See `docs/SCHEMA_REVIEW.md` for
the tested cases and remaining gaps; the parallel tests do not force every lock
interleaving or exercise a midnight/concurrent-void race.

For actual local end-to-end gameplay, after separate approval:

1. Start disposable local Supabase with anonymous sign-in enabled, keep
   `soraban_private` outside exposed schemas, and leave PostgREST transaction
   overrides disabled. Do not change the live project's settings.
2. Apply `0001_initial_schema.sql` then `0002_gameplay.sql` once to its fresh DB.
   Do not load `bootstrap.sql` into Supabase.
3. Create local test users via Auth. Load marked synthetic questions/answers and
   a 30-day test schedule, then call owner-only publication with the explicit
   approved test start. `fixtures.sql` is for the PostgreSQL harness, not an Auth
   seeding script; do not insert fake identities into real Supabase Auth.
4. Privately set the local URL/publishable key and start Next.js. POST same-origin
   `/api/session/anonymous`, retain cookies, and exercise today, guesses and
   my-today. Verify retries, five-question completion, refresh and response loss.
   Confirm commit failures and `Prefer: tx=rollback` cannot return provisional
   answers through PostgREST.

PR #8 already supplies Zeynep's five-position/category types and game screens.
She can replace the mock adapter after this verification and HTTP error/DTO review.
No production credentials or real questions are needed.
