# SORABAN — Milestone 2 schema review

Specification v0.3: five questions/day, 30 days, positive values through 1e15.
Both drafts were applied successfully only inside the approved disposable
PostgreSQL container, which has been removed. **Supabase/shared/live databases
remain unapplied.** Full Supabase Auth/PostgREST verification is still pending.

## Schema and privileges

Apply 0001 then 0002 only to a fresh approved database. Initial creation deliberately
fails on existing objects; this is not an upgrade script. No data, dates, users,
credentials or Auth settings are included. The six tables remain. Private helper
`questions_per_day()` is the publication count (5), matching table capacity bounds.
Changing the count requires a reviewed migration and data revalidation;
API totals derive from rows. Optional category uses Neris's six keys.

All tables enable RLS. Released public columns and caller-owned progress have
SELECT-only policies. No client can write content, guesses or scores. Private
schema USAGE and helper EXECUTE are denied to clients/service_role; answers have
no client policy. Keep this schema outside the exposed Data API. Question column
grants exclude internal void_reason; wildcard SELECT is intentionally denied.

Only soraban_today, soraban_my_today and soraban_submit_guess grant authenticated
EXECUTE. SECURITY DEFINER uses empty search_path and qualified references, with
PUBLIC/anon/service_role grants explicitly revoked. Identity is auth.uid(), also
checked against auth.users, never an argument. Anonymous Auth users may play;
this is not official ranking identity verification. Handlers verify Auth again.

## Publication, locking and commit

Owner-only publish_game_day(day_id, approved_start) locks schedule maintenance and
the day. It requires all 30 consecutive dates matching the explicit approved start
and five positions with private answers, none prevoided. Future publication is
allowed but public reads hide future content. No editorial API or content-writing
role is added. Owners are trusted: freeze published dates/prompts/answers and use
the maintenance functions rather than ad hoc updates. Owners/superusers can bypass
RLS or alter code; adding editors later requires a separate freeze/grant design.

Lock order is day then player. Reads share-lock the day, ensure a profile exists,
then share-lock it. Submission share-locks the day, ensures the profile exists,
then locks it FOR UPDATE. This serializes one player's submissions, including
concurrent final questions, without serializing different players. UNIQUE on
(player_id, question_id) is the final duplicate guard; guesses are never updated.

After lock waits, one wall-clock timestamp determines admission and Istanbul date.
New guesses require today's published nonvoid question and full answer coverage.
Valid retries return the original result even after midnight or voiding; invalid
numeric retries still fail. Logical committed_at is admission time, not WAL commit
time. Raw scoring uses the existing formula and 1e15 maximum, guarding the
zero-score tail before a potentially overflowing division.

Insert, score projection and reveal selection run in one transaction. The handler
awaits the RPC before sending a reveal; no streaming or logging. Keep PostgREST
transaction-end at commit and transaction overrides disabled (defaults). Do not
allow client Prefer: tx=rollback. A function returns inside its transaction; the
HTTP gateway must withhold the result until commit. Direct owner SQL is trusted.
Gateway behavior still needs an approved local Supabase test.

Reads recheck the database Istanbul date after waits. Today returns public data
only; my-today joins answers only to the caller's saved guesses, including answered
void positions. DTO allowlists drop unknown fields and reject malformed responses.
Missing schema/RPCs and unknown DB failures produce safe 503 responses. Responses
are private/no-store; no privileged credential is introduced.

## Completion and voiding

Total count includes all positions. Answered count, completion and raw mean exclude
void questions. Incomplete scores are null; complete scores may be zero. Only
completed projections are stored. Owner-only void_question locks the day exclusively,
then affected profiles in UUID order, and recalculates atomically. It may complete
previously incomplete players but cannot void the final valid question. Saved raw
attempts remain unchanged. Existing completed players retain completion time;
newly complete players use the later of the last valid guess and void time.
Internal reasons never enter public DTOs; repeating a void retains its record.

## Evidence and approval gate

The existing temporary pglast parser accepts SQL statements and PL/pgSQL bodies
without execution. Node tests use mocked RPC responses with real handlers, including
no response before the RPC promise resolves. Existing session/scoring tests remain.
These checks do not prove runtime database permissions, locks or scoring agreement.

On 22 November 2026, Elif explicitly approved and the agent executed
`python3 -u supabase/tests/integration.py --approved-disposable-execution` once.
It exited 0 with all five result groups passing, without a SQL or runner fix:

- Exact publication count, private-answer coverage and consecutive schedule.
- Direct-role ACL denials, answer secrecy, missing-identity rejection and released-day RLS.
- SQL scoring golden cases (1e-10 tolerance), subnormal inputs and invalid guesses.
- Parallel same-question attempts returning the same immutable result; changed-guess
  retry; parallel final questions completing the day; caller isolation, closed days
  and rolled-back attempts leaving no progress.
- Void recalculation, completion of a previously incomplete player, and rejection
  of voiding the final valid question.

Docker's effective endpoint was verified as a local Unix socket before execution.
The runner used a fresh PostgreSQL 17 container, network none, tmpfs data, no host
ports or persistent volumes, minimal Auth/role test doubles and synthetic fixtures.
No `.env.local` read or existing database connection occurred. The runner stopped
its container; a separate `docker ps -a` filtered to its unique test-name prefix
returned no containers, matching the empty pre-run baseline.

These results verify the tested PostgreSQL paths, not every lock interleaving.
The parallel cases do not impose a deterministic lock barrier. Midnight lock waits,
simultaneous void/submission, Supabase JWT/Auth behavior, inherited real-project
grants, HTTP cookies and PostgREST commit/rollback preferences remain unverified.
Owners remain trusted; published-content freezing is an operational rule, not
protection against an owner bypassing the maintenance functions.

Minimum next approval: start a fresh disposable local Supabase stack, apply both
drafts there and verify Auth/PostgREST/HTTP cookies and commit behavior with local
synthetic users/content before adapter integration. The PostgreSQL-only approval
does not authorize that stack or a live migration/user/deployment. See
`supabase/tests/README.md`.

References: [Supabase functions](https://supabase.com/docs/guides/database/functions),
[PostgREST transactions](https://docs.postgrest.org/en/stable/references/transactions.html),
[PostgreSQL locks](https://www.postgresql.org/docs/17/explicit-locking.html).
