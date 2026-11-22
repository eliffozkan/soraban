# SORABAN schema security and architecture review

Reviewed against [SORABAN_CODEX_CONTEXT.md](SORABAN_CODEX_CONTEXT.md) v0.2.
The migration has never been applied. The draft now uses `soraban_private`; only
its namespace spelling changed in this rename, with all grants, RLS, tables and
constraints preserved. The draft filename is unchanged. No live schema was renamed.

This is a **static review of a draft**,
not migration approval, a live configuration audit or proof of runtime RLS behavior.
No SQL was executed and no Supabase project was contacted during this review.
The earlier HTTP 200 only verified connectivity; it did not verify this schema.

## What this draft creates

Within one `BEGIN`/`COMMIT` block, on a fresh schema with existing Supabase roles and
`auth.users`, the draft creates:

| Object | Purpose and key constraints |
| --- | --- |
| Schema `soraban_private` | Private objects, no `PUBLIC`, `anon`, `authenticated` or `service_role` usage/create grant |
| `public.game_days` | UUID PK, unique finite `play_date`, unique day number 1–30, unpublished by default |
| `public.public_questions` | UUID PK, day FK, unique day/position 1–6, nonblank prompt/unit, paired void timestamp/internal reason |
| `soraban_private.private_answers` | Question PK/FK, positive bounded answer, nonblank reasoning, HTTPS-prefixed source |
| `public.player_profiles` | Auth user PK/FK, optional trimmed nickname 2–32 characters, approval requires a nickname |
| `public.guesses` | UUID PK, auth user/question FKs, UNIQUE(player_id, question_id), bounded guess/score, finite submission timestamp |
| `public.daily_scores` | Composite player/day PK, auth user/day FKs, bounded score, denominator 1–6, finite completion timestamp |
| `guesses_question_id_idx` | Ordinary index for per-question void recalculation |

There are six primary keys, four additional unique constraints, seven foreign keys
and ten implicit PK/unique indexes, plus the one explicit index above. Auth-user
references cascade deletion of that user's profile/guesses/daily scores; question
and day references otherwise restrict deletion. `gen_random_uuid()` uses PostgreSQL's
existing built-in function; the draft installs no extension.

All six tables enable RLS. Five **SELECT-only** policies allow released days/prompts
and a player's own profile/guesses/daily scores. There is no answer policy. Explicit
column SELECT grants mirror those roles; `void_reason` is deliberately not granted.
`USAGE` on the existing public schema is granted to the two client roles. All direct
table privileges for `PUBLIC`, `anon`, `authenticated` and `service_role` are first
revoked; only the documented client reads are restored. Owners/superusers remain
trusted. `BYPASSRLS` alone does not bypass table/schema privileges.

No data, dates, credentials, functions/RPCs, triggers, views, custom types, policies
for writes, role creation, auth settings, exposed-schema changes or default-privilege
changes are included. The initial migration deliberately fails if `soraban_private`
already exists; it is not an idempotent rerun/repair script.

## Findings and minimal corrections

| Finding | Classification | Resolution |
| --- | --- | --- |
| Table-wide question SELECT exposes arbitrary `void_reason` text, which could disclose the corrected answer | Concrete potential spoiler path; not evidence that any content leaked | Read-column allowlists exclude this internal note; retain the existing paired void fields without another table/view |
| Possible inherited grants to `service_role` are not explicitly removed in the original draft | Default-dependent privilege gap, not an ordinary-client exploit | Revoke its access to all six tables and the private schema; plan a narrowly granted user-authenticated RPC instead of a service-key write path |
| `IF NOT EXISTS` can reuse an unknown private schema | Avoidable initial-migration ambiguity | Require a fresh schema; existing objects now cause a failure requiring investigation |
| `now()` is transaction-start time, potentially stale across midnight in a long transaction | Boundary ambiguity; short single-statement requests were already timezone-correct | Read policies use statement-start time in Europe/Istanbul; future submission must validate again after lock waits |
| Infinite dates/timestamps, blank editorial reasons, space-padded nicknames and approved-but-null nicknames were accepted | Integrity gaps for trusted writers, not client score exploits | Add finite/nonblank/trim/approval checks |
| No question-leading index on guesses | Recalculation cost grows with total players | Add one index; avoid extra indexes until demonstrated necessary |

Existing positive upper bounds already reject zero, negatives, Infinity and PostgreSQL
NaN. NULL is separately rejected for required numeric fields. Scores remain double
precision with no stored rounding. The `1e15` bound still matches the TypeScript
scoring default and remains a product proposal. No formula check is added to a row:
it would require reading secret answers and does not replace a trusted transaction.

## Permission and leakage boundaries

- Unauthenticated visitors (`anon`) read only published days on/before the current
  Istanbul date and their public question columns. Anonymous **Auth** users assume
  `authenticated`; own-row checks use `auth.uid()` for both anonymous and permanent
  users. Logged-out/other-user identities must not see progress. No profile row is
  automatically created yet.
- Question visibility uses an explicitly correlated query to `game_days`; its RLS
  supplies the publication/date gate. There is no blanket answer view, join policy,
  answer RPC or Realtime publication added by this draft. Keep `soraban_private` out
  of exposed Data API schemas even though schema/table ACLs also deny client access.
- Select question columns explicitly. Literal SQL `SELECT *` includes the forbidden
  note and fails. Do not restore table-wide SELECT to work around a frontend query.
  A public void message can be fixed, spoiler-free UI copy based on `voided_at`.
- Prompt/unit text still needs editorial review: SQL cannot detect an answer written
  into a public prompt. Source URLs receive only a prefix check, not source verification
  or SSRF protection; do not fetch arbitrary sources on behalf of clients.
- No client can insert/update/delete guesses or scores. A score in [0,100] is not
  proof of correct computation; an owner can still insert an arbitrary in-range score.
  Owner access is intentional for the later definer transaction, not a player capability.
- RLS is not forced: owners/superusers may bypass it, as may privileged roles if they
  are later granted access. No audit of existing role memberships, project grants,
  unrelated RPCs, views or exposed schemas has occurred. Future objects need explicit
  ACL review; this migration does not globally alter another feature's privileges.

## Tomorrow's transactional guess API — required contract, not implemented

The current publishable-key server helper retains user RLS scope. It cannot read
answers or write guesses, and several independent `.from()` calls are not a database
transaction. Implement a single reviewed database RPC invoked with the verified
user session through the Next.js handler. Avoid adding a general service-role client.

1. Accept only question ID and parsed guess. Derive player ID from `auth.uid()` inside
   the transaction, reject NULL identity, and validate finite positive input <= maximum.
   Never accept a caller's player ID, answer, score, date or completion timestamp.
   Anonymous Auth users are allowed to play; `authenticated` alone does not establish
   Google linking or official-leaderboard eligibility.
2. Use a tightly scoped `SECURITY DEFINER` function, trusted owner, empty `search_path`
   and qualified objects. Revoke EXECUTE from `PUBLIC`, `anon` and any direct default
   grantees, then grant only to `authenticated`. RLS is bypassed for owner operations,
   so all authorization/day checks must be inside the function. Direct RPC calls must
   be safe even if the caller skips the Next.js handler.
3. Serialize both submission and content maintenance. Minimal option with these tables:
   acquire a shared lock on the question's `game_days` row, create the caller's profile
   if absent, then lock that profile row FOR UPDATE. This serializes that player's
   requests, including different questions, without locking all players against each
   other. Publication/voiding/content correction must acquire an exclusive day lock
   first and use a consistent lock order. Do not hold a lock while doing network work.
4. Once locks are acquired, capture one trusted `clock_timestamp()` and derive its
   Europe/Istanbul date. New guesses require **equality** with play_date, published
   status, a nonvoid question and an existing private answer. Public read policy's
   `<=` is only for archive visibility. A request that waited past midnight must not
   insert yesterday's guess. Define acceptance at this post-lock check; a transaction
   admitted just before midnight may finish after it. The stored `committed_at` is a
   logical admission timestamp, not PostgreSQL's physical commit instant.
5. If this caller already has a committed guess, return the original saved result
   without replacing it, including on retries after midnight. A different supplied
   guess never earns a second attempt. Retain UNIQUE(player_id, question_id) as the
   final race guard. Do not use an upsert that updates an existing guess or reveal an
   answer after an unsuccessful new insert. Other players' guesses are irrelevant.
6. Compute the raw score from the private answer in the database, insert once, and
   recompute the caller's completion projection in the same transaction. Match the
   TypeScript golden cases, including extreme finite inputs: PostgreSQL float division
   can raise overflow where JS produces Infinity; handle the zero-score tail safely.
   Test numerical agreement without rounding persisted scores.
7. Rebuild `daily_scores` only when every currently nonvoid question has a committed
   guess. Use their unrounded arithmetic mean and the nonvoid denominator; delete a
   stale projection if it is no longer qualified. The per-player lock prevents two
   concurrent final guesses from each observing an incomplete day. A unique projection
   key alone does not solve this race. Return an explicit safe DTO after the RPC
   transaction succeeds; only then may the handler send answer/reason/source. Do not
   stream, log or publicly cache reveal payloads. A lost response must be retryable.

Publication must validate exactly six positions with six private answers, freeze the
published content, and validate the configured consecutive season schedule. The schema
currently enforces **at most six**, not exactly six; FK existence only ensures every
answer points to a question, not every question has an answer. Do not emulate these
cross-row rules with an ordinary CHECK or a client-write policy. Publication/submission
validation is simpler for this MVP than adding a general trigger framework.

Voiding must use the exclusive day lock, mark the pair of void fields, and recalculate
affected players' projections atomically from nonvoid questions. Existing guesses and
raw scores may remain as historical records but must be excluded from aggregation.
Decide whether previously incomplete players become complete when the missing question
is voided. All-void days cannot be represented in `daily_scores` (denominator minimum 1):
until decided, block voiding the final valid question; do not silently invent points.
A later archive-answer read operation must be separately authorized; this draft exposes
past prompts, not past answers, and permits no retroactive scoring.

## Unnecessary complexity avoided and remaining decisions

Keep the six small tables for now. `daily_scores` is a denormalized cache and creates
an invariant the transaction must maintain; computing it on demand is a future simpler
alternative if no persisted ranking is needed. No season table is necessary for one
30-day season, and no nickname uniqueness, identity-copy table, scoring trigger,
public leaderboard view or extra auth system is justified for tomorrow's slice.
The guess UUID is redundant for uniqueness but harmless; changing it offers no security
benefit. No broad schema/default-privilege rewrites or FORCE RLS are added.

Owner decisions remain: actual season start/schedule, maximum, all-void semantics and
ranking tie rules. Suggested daily tie order is raw score descending, completion time
ascending, then player UUID; season ties could use last completed-day time then UUID.
These are proposals, not implemented behavior. Later official rankings need linked
identity and moderated names; the current schema has neither public ranking nor verified
identity state. Multiple anonymous accounts, rate limiting, privacy and moderation are
launch work, not solved by RLS or the existing connectivity check.

## Verification and approval gate

Applicable local checks: PostgreSQL syntax parsing and AST inventory/ACL checks using
an isolated temporary parser, TypeScript scoring tests and whitespace/diff review.
A parser does not resolve Supabase roles/functions or evaluate constraints/policies.
It does not execute the migration. Local results on Node 24.22.3:

- `pglast` 7.24 (installed only in a temporary review environment) accepted all
  30 statements. AST checks verified the object/constraint counts, RLS on all six
  tables, SELECT-only policies, role/column grant boundaries and unique guess key.
- `npm test`: 22 scoring tests passed.
- `npm run lint`, `npm run typecheck`, `npm run build`: passed.
- `git diff --check`: passed. Only this review and the draft SQL changed.

Application checks are regressions, not database tests. The placeholder build did
not invoke a Supabase client; `.env.local` and existing application files were not
changed. No SQL migration, local database execution or remote write was performed.

**Verdict:** ready for human review as a restricted foundation draft, **not ready for
playable-MVP approval or an untested production execution**. After separate explicit
approval to execute SQL in an isolated environment, verify the matrix below before
approving a shared environment. Submission RPC and its tests need a separate reviewed
change; there is intentionally no functioning write/reveal path in this migration.

| Runtime check after execution approval | Expected result |
| --- | --- |
| Logged-out, anonymous owner, permanent owner, other-user sessions | Released public columns only; own progress only; no emails |
| Direct reads, embeds and SQL queries of answer/reason/source and void_reason | Denied for both client roles, including after a guess |
| Direct INSERT/UPDATE/DELETE/TRUNCATE, and forged score/player/timestamp writes | Denied; service role also lacks direct grants on these objects |
| Future, unpublished and past days; timezone set to UTC, Istanbul and Stockholm | Future/unpublished prompts hidden; old prompts readable; old new guesses rejected |
| Two identical submissions, changed-guess retry, two different final questions | One immutable guess per question; one correct completed projection |
| Failure after insert, response loss, midnight lock wait, concurrent void | Rollback leaks no answer; committed retry works; day/denominator rules remain consistent |
| NaN/Infinity/zero/negative/oversized guesses and extreme finite ratios | Rejected or scored according to the raw formula, no overflow failure |
| Publish fewer than six questions/missing answers/nonconsecutive schedule | Rejected by reviewed publication path |
| Void a question or the last valid question | Atomic recalculation; final-question void blocked until semantics approved |

Primary references consulted (no project credentials used):
- [Supabase RLS and anonymous Auth roles](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase database function security and execute privileges](https://supabase.com/docs/guides/database/functions)
- [PostgreSQL table/column/schema privileges](https://www.postgresql.org/docs/17/ddl-priv.html)
- [PostgreSQL transaction, statement and wall-clock time](https://www.postgresql.org/docs/17/functions-datetime.html)
- [PostgreSQL floating-point special values](https://www.postgresql.org/docs/17/datatype-numeric.html)
