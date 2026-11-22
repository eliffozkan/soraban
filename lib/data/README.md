# Backend foundation — Milestone 1

Status: implemented locally, external services mocked in tests. No SQL has been
executed. No real Auth account has been created for verification. The shared
API proposal still describes future successful gameplay payloads.

## Routes and integration

| Route | Current behavior |
| --- | --- |
| `POST /api/session/anonymous` | Verify/reuse the current anonymous or permanent user; otherwise sign in anonymously and verify the resulting user. Returns only `{ status: "ready", isAnonymous: boolean }`. |
| `GET /api/today` | Verify identity; `401 AUTH_REQUIRED` if absent, otherwise `503 DAY_UNAVAILABLE`. Never creates accounts. |
| `GET /api/me/today` | Same authorization/unavailability boundary. No revealed submissions yet. |
| `POST /api/guesses` | Check same origin, verify identity, validate the bounded JSON body; return `503 DAY_UNAVAILABLE` for valid requests. Never writes or returns a reveal. |
| `GET /api/health` | Existing liveness response; no DB readiness claim. |

Zeynep should call the session POST from one shared initialization adapter, await
`ready`, then request today. Use same-origin cookies, no request body, and normal
browser `Origin` headers. Both POST endpoints require an exact same-origin
`Origin`; missing/foreign origins or cross-site fetch metadata return
`403 ORIGIN_FORBIDDEN`. No permissive CORS headers are supplied.
Origin checking uses the incoming Host and request protocol because Next can
reconstruct a listener hostname internally. It does not trust X-Forwarded-Host;
a reverse proxy must preserve the public Host and correct request protocol.

The session POST returns `429 AUTH_RATE_LIMITED` with `Retry-After: 60` for local
or upstream rate limits, `503 AUTH_UNAVAILABLE` for Auth failures, and
`503 SERVICE_UNAVAILABLE` for missing configuration or unexpected failures. An
explicit invalid/revoked session returns `401 AUTH_REQUIRED`; it is not silently
replaced during that failed verification. Expired sessions that can refresh reuse
the original identity. A missing session can create a guest. Invalid credentials
may be cleared locally by the SDK; after that a later explicit initialization
can create a fresh guest. No guarantee of recovery of expired anonymous progress
is made. Identity linking, account-conflict recovery and official eligibility
are separate features.

Repeated calls with persisted valid cookies reuse the same user. Concurrent
cookie-free requests, or a lost first response before the browser receives its
cookies, cannot identify a common player: the frontend must serialize bootstrap
calls. There is no process-global session client or cross-user session cache.

All new API success/error responses have private/no-store cache headers, Pragma
and Expires. Route clients use Next's writable cookie store and fail if writes
fail. Supabase SSR handles cookie encoding/chunking. SameSite=Lax, Path=/ and
Secure in production are explicit; HttpOnly is left at the SSR library default
so the existing browser SSR client can read the same session. Tokens are carried
only by the normal SSR session cookies, never response JSON or application logs.

`proxy.ts` refreshes the four game page paths, forwarding updates into both the
downstream request and browser response. It never creates users or authorizes
gameplay. APIs refresh and verify independently, avoiding a second proxy refresh
for the same API request. Refresh-service failures leave pages renderable; API
authorization still fails closed. Health and static assets bypass this proxy.

Anonymous creation attempts are capped at 20/minute **per server process**, with
constant memory. Existing valid sessions bypass that cap. Supabase Auth's 429 is
also propagated. This is a local backstop, not a durable distributed or per-IP
limiter: serverless replicas/restarts reset it. Before public launch, coordinate
a trusted-edge/distributed limit and CAPTCHA as appropriate; do not trust arbitrary
forwarded-IP headers or change live Auth settings as part of testing.

Guess JSON accepts only `questionId` (UUID) and `guess` (positive finite JSON number
through the existing 1e15 maximum). The reader caps the body at 1024 bytes even
without Content-Length; malformed JSON, wrong content type, invalid numbers and
extra fields return `400 INVALID_GUESS`. Submitted player IDs, scores, dates and
completion flags are never used. Unauthorized requests are rejected before body
parsing. No answers, reasoning or source URLs enter these handlers.

## Boundaries and test evidence

- `app/api`: thin handlers and safe HTTP boundary.
- `lib/supabase`: request-scoped clients, verified identity, session creation/refresh.
- `lib/data`: server-only HTTP/request helpers and the explicit unavailable repository gate.
- `lib/game`: pure validation, unchanged scoring, and backend contract building blocks.

`lib/game/contracts.ts` reflects the proposal's field names. Its numeric count is
an internal dynamic design type, not an approved change to the shared literal-six
contract; no successful gameplay DTO is emitted yet. `/api/me/today` still needs
an agreed success envelope, so no competing response type is invented.

Tests cover pure validation/scoring, HTTP authorization and errors, actual SSR SDK
behavior with mocked fetch and a simulated Next cookie store, proxy cookie/header
forwarding, and a small TSX test-environment fixture. These are unit/transport
contract tests, **not** live Auth, browser end-to-end, database RLS or concurrency
integration tests. Test setup blocks unmocked fetch. No credentials are required.

Vitest runs `.test.ts` in Node and `.test.tsx` in jsdom, with DOM matchers and
React cleanup. Shared tooling/dependency/setup/CI changes form a separate review
group for Zeynep under `docs/INTEGRATION_DECISIONS.md`; no PR is published here.
Zeynep and Neris retain ownership of their component/flow tests. CI uses Node 24
and runs install, tests, lint, build and typecheck without Supabase secrets.

## Five-question direction — proposed coordinated change, not applied

Elif's current direction is five daily questions. No new code fixes a daily count.
Before serving successful gameplay, coordinate these exact changes:

1. `docs/API_CONTRACT.md`: replace `DailyProgress.totalCount: 6` with a numeric
   published-position count; revise both JSON examples and the exactly-six
   publication sentence. Define `/api/me/today`'s envelope. Keep `answeredCount`
   as answered nonvoid questions and completion as all nonvoid questions answered.
2. `docs/INTEGRATION_DECISIONS.md`: replace the six fixed positions/totalCount
   wording with the configured count (five for the coming season). Preserve the
   accepted void-completion rule and final-nonvoid-question block.
3. `supabase/drafts/0001_initial_schema.sql`: review the
   `public_questions.position BETWEEN 1 AND 6` and
   `daily_scores.question_count BETWEEN 1 AND 6` constraints. Five already fits
   both, but six remains allowed. Either approve bounds of five for this season,
   or retain a capacity bound and enforce the configured per-day count in the
   trusted publication path. A numeric API count alone cannot enforce publishing.
   Decide where the trusted configured count lives; do not add a season table
   just for this milestone.
4. The future publication transaction must validate exactly the configured count,
   contiguous positions and a private answer per position. Submission/voiding must
   aggregate actual nonvoid rows, never divide by a fixed five or six. Test both
   five and six to prove configuration works, including void-induced completion.
5. `docs/SORABAN_CODEX_CONTEXT.md`, `docs/SCHEMA_REVIEW.md` and
   `docs/agents/BACKEND.md`: revise six-question requirements and publication/test
   descriptions. At 30 days, five/day means 150 verified primary questions instead
   of 180; confirm backup target and readiness criteria separately.
6. Zeynep/Neris review adapter types, mocks, positions, progress and copy in their
   owned files. The score formula, 1e15 bound, raw precision, ranking and Istanbul
   rollover do not change as part of the count decision.

SQL and shared product/API documents remain unchanged in Milestone 1. This note
does not authorize migration execution. The next backend milestone is reviewed
publication/submission/reveal SQL plus isolated permission and concurrency tests,
followed by replacing the unavailable repository gate with verified persistence.

Implementation references: the installed Next.js guides under
`node_modules/next/dist/docs/` (Proxy, Route Handlers, cookies and unstable_rethrow),
the installed `@supabase/ssr` cookie interfaces, and
[Supabase's SSR guide](https://supabase.com/docs/guides/auth/server-side/creating-a-client?queryGroups=framework&framework=nextjs).
