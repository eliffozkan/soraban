# SORABAN — Auth, test and decision ownership
Accepted team integration decision · 22 November 2026

This decision resolves the cross-owner questions raised by the frontend and backend agents. Read with `docs/TEAM.md` and `docs/API_CONTRACT.md`. Backend implementation is in progress; database runtime verification is pending. This document does not authorize a live database migration, production auth-setting change, or deployment.

## Anonymous session: exact split

**Elif / Codex (server and authentication owner)**
- Implements `POST /api/session/anonymous` in `app/api/**`, using the request-scoped Supabase SSR server client in `lib/supabase/**`.
- The POST first verifies whether an existing session belongs to a real authenticated Supabase user. If it exists (including a linked Google account), keep it; never replace it with a new anonymous user. Otherwise create a Supabase Auth anonymous user using `signInAnonymously()` and persist its session via properly configured SSR cookies.
- Implements required session refresh/proxy and server-side identity checks; handles repeated calls, refreshes, errors, same-origin restrictions and rate limiting. Do not use a service-role secret or return tokens to the UI.
- Returns `{ "status": "ready", "isAnonymous": true }` (or `false` for an existing permanent/linked user), with `Cache-Control: no-store`. Define safe `429` / `503` failure codes. Document and test all behavior, including existing-session preservation, request retries and server cookies.
- Auth is separate from gameplay: `GET /api/today` does not create users and returns `401 AUTH_REQUIRED` if no valid session. Guess and private-progress endpoints verify identity again. No session is inferred from a player ID in request JSON.
- Google identity-linking and multi-device account conflict handling are a **separate feature**; initial anonymous play must not imply they are ready.

**Zeynep / Claude (client and screen-flow owner)**
- Implements a single `ensureGuestSession()` browser adapter in `lib/client/**` that calls `POST /api/session/anonymous` using same-origin cookies. It does **not** call Supabase `signInAnonymously()` a second time.
- On the first app/game entry, shows a nonblocking initialization state, calls the adapter once per current UI initialization, waits for success and only then requests `GET /api/today`. Handles network/auth/rate-limit errors and retry. Repeated page loads should reuse the existing server session.
- No credential, session token or private answer is stored in the frontend state, committed mock, or browser-local score authority. Use a typed mock adapter until Elif's endpoint is verified.
- For authenticated progress, render the DTO defined in `docs/API_CONTRACT.md`; changes to payload shape require both Elif and Zeynep to agree.

**Neris / Claude (UI library owner)**
- Supplies a prop-driven loading/initializing/error/retry visual component; no auth calls, Supabase code or gameplay state in `components/ui/**`.

**Integration criterion:** Two reloads do not create new users; a Google-linked user is not replaced; no logged-out guesses; no answers revealed before a committed guess; server + browser can read the same valid SSR session. Test anonymous and permanent sessions, expired cookies, request retries and malformed responses. Prevent uncontrolled anonymous account creation with rate limits and consider CAPTCHA before public launch.

## Tests and CI — file owner

- **Elif** owns the shared test infrastructure: `vitest.config.mts`, `package.json`, `package-lock.json`, test setup, `.github/workflows/ci.yml`; open a separate small PR after informing the team. Keep existing Node environment scoring tests working, and add a jsdom/happy-dom environment for React `.test.tsx` tests and packages needed for component testing. Use Vitest project configurations or test-file environment directives; do not switch the entire suite to DOM. Zeynep reviews this PR.
- **Zeynep** owns frontend behavioral tests in `tests/ui/game/**` and the mock-adapter tests, which must be discovered by `npm test`; **Neris** owns primitive component tests in `tests/ui/components/**`. Neither independently modifies root test tooling.
- CI on PRs runs `npm ci`, `npm test`, `npm run lint`, `npm run build` and `npm run typecheck` on Node 24. CI cannot prove Supabase RLS/concurrency without a controlled test database; report that separately.

## Product decisions — who signs off

Elif is the **product decision owner** and records decisions in the specification; Zeynep reviews frontend impact and Neris reviews design/copy impact before the related PR merges.

| Topic | Working rule / decision | Gate |
| --- | --- | --- |
| Numeric maximum | **1e15** for guess and positive correct value in TypeScript and SQL | Accepted for initial development; revisit as a separate change |
| Season start | **Unset**; a configurable Istanbul-local start date will be approved by Elif when 150 verified questions and rollout are ready | Blocks production season publication, not mocks |
| Equal scores | Raw, unrounded daily/season scores determine ties; equal raw scores **share rank**. Stable display order by completion timestamp, then player ID; this ordering does not change rank or points | Accepted for implementation, keep private IDs out of public DTOs |
| Daily questions and voiding | Five published positions; `totalCount` is their numeric count, `answeredCount` counts answered nonvoid questions, and completion is all **nonvoid** questions answered. A previously incomplete player becomes complete if all remaining valid questions were answered. Block voiding the final nonvoid question | Elif authorizes exceptional voiding actions |
| Public category | Optional: `kampus`, `akademik`, `yurt-yemek`, `tarih-kultur`, `eymir-doga`, `bilim-topluluklar` | Existing Neris keys; Zeynep owns client type/mock updates |
| Presentation nicknames/boards | Anonymous identities qualify for completed episode boards. PR #12 rules: NFC-normalized 3–20 Unicode letters/digits/spaces/_/-/., including a letter; basic blocked names; manual approval or anonymous fallback. One change/minute, five/hour. Owner-only hide/lock; changes revoke approval and cannot clear a hide/lock | Backend adopts PR #12's episode/nickname/leaderboard proposal; official season identity linking remains deferred |
| Privacy notice | Elif owns the factual data-processing inventory and policy review (anonymous IDs, linked email where applicable, guesses and retention). Zeynep integrates the notice into the flow; Neris owns presentation. Do not invent legal guarantees; get appropriate KVKK/privacy review before public collection | Public launch gate |
| Identity linking | Defer Google linking until account-conflict behavior and auth/RLS tests are agreed | Feature gate, not required for first anonymous session |

## Team coordination rules

- Root docs and tooling are shared: **one assigned agent changes them at a time**. For the current auth/test infrastructure work, Elif is the assigned owner, and Zeynep reviews.
- People already on `feat/backend-foundation`, `feat/frontend-flow`, or `feat/ui-system` should **fetch and merge** updated `main` into their own branch after this decision lands; do not reset, force-push, discard local work or create a duplicate repository.
- The historic rename PR has already merged; old branch names are not outstanding migrations. There is no Figma requirement. Neris writes the reusable UI code directly.
- Shared API contracts must not silently drift. Update the contract in a reviewed documentation change before implementing incompatible endpoint/DTO changes.
- Milestone 2 completes the coordinated backend/spec/SQL five-question change, preserving PR #8's accepted literal-five DTO and category registry. It adopts Zeynep's proposed `{ day, guesses, progress }` for `/api/me/today`; her owned files remain untouched. Zeynep reviews server support and HTTP error mapping before wiring the real adapter; Neris reviews display impact.
