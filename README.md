# GAUSS

Daily numerical estimation about METU/ODTÜ for anyone interested in the university.
The current deliverable is setup only. Read [the working specification](docs/GAUSS_CODEX_CONTEXT.md)
first; version 0.2 overrides the earlier GDD.

## Local development

Use Node.js **24 LTS** and its bundled npm. `.nvmrc` pins **24.22.3**;
`package.json` restricts the supported runtime to `24.x`. Supabase uses current
stable releases compatible with this runtime. The existing Next.js 16.4.6 / React
19.3 / Tailwind 4 starter is preserved.

```sh
nvm use
node --version
npm ci
npm run dev
```

If nvm is not loaded, source `~/.nvm/nvm.sh` first. If the pinned runtime is
missing, installing it with `nvm install --skip-default-packages` writes to
`~/.nvm` and requires machine-change approval in Codex. Keep the existing nvm
default; do not run `nvm alias default` or change shell startup files for GAUSS.
`nvm use` selects Node in the current shell, not automatically when changing
directories. Use a dedicated GAUSS terminal; close it or select the other project’s
Node version when switching projects.

Visit http://localhost:3000. No environment variables are needed for the placeholder
pages or production build. For later Supabase integration, copy `.env.example` to
`.env.local` and supply your project's URL and **publishable** key. Empty fields
are intentional. `.env.local` is ignored; never commit credentials. Next.js bundles
`NEXT_PUBLIC_*` values at build time, so rebuild after changing them.

## Structure

```text
app/                     App Router pages and thin API Route Handlers
  api/health/route.ts     Public liveness endpoint
components/              Reusable presentation; minimal pending Figma
lib/game/                Pure game logic, independent of React and Supabase
lib/supabase/            Browser and request-scoped server client factories
lib/data/                Reserved server-only repository boundary
tests/                  Unit tests (game logic)
supabase/drafts/         Review-only SQL; outside automatic migration discovery
docs/                    Specification and schema security review
```

Available routes: `/`, `/play`, `/results`, `/leaderboard` are Turkish placeholders.
`GET /api/health` returns `{"status":"ok","service":"gauss"}` without configuration,
authentication or database access. It reports application liveness, not database
readiness. Gameplay, guess APIs, accounts, ranking and sharing are deferred.
System fonts keep builds independent of font downloads; final branding, styles,
components and interaction states will follow Figma.

## Scoring

`scoreGuess(answer, guess, maximum?)` in `lib/game/scoring.ts` implements
`max(0, 100 - 50 * log10(max(guess/answer, answer/guess)))` without rounding.
Both inputs must be positive finite numbers at or below the maximum (initial
proposal `1e15`); invalid values throw `RangeError`. No implicit string coercion.
The function accepts parsed numbers; accessible separator parsing/confirmation and
server request validation will be implemented with gameplay. Changing the maximum
also requires updating the SQL checks. Unit test numbers are synthetic mathematical
inputs, not questions or seed content.

## Supabase and security

The browser factory uses only public configuration. The server factory imports
`server-only`, creates a client per request, and retains the user's RLS scope.
It is intended for writable-cookie Route Handlers / Server Actions; cookie-write
errors are not swallowed. No privileged client or live database calls are present.
Before connecting auth to rendered pages, implement session refresh/proxy, verified
server identity checks, cookie/cache handling and auth integration tests. Do not
cache personalized responses. Anonymous Auth and Google linking are not implemented.
Check current identity-linking and account-conflict documentation before adding them.

[Draft SQL](supabase/drafts/0001_initial_schema.sql) and [review notes](docs/SCHEMA_REVIEW.md)
separate private answers from public prompts, enable RLS and deny client writes.
The unique player/question constraint supports future atomic locking; it is not a
complete submission protocol. No answers are readable through client roles, even
after guessing; a reviewed server transaction must implement safe reveal later.
No public leaderboard projection exists yet. Keep `gauss_private` outside exposed
schemas. Do not execute or move the draft into active migrations without explicit
human approval. No migrations, auth settings or external accounts were changed.

## Checks

```sh
npm test
npm run lint
npm run typecheck
npm run build
npm audit
```

Verified with Node **24.22.3** / npm **11.19.1**: clean `npm ci`, 22 scoring tests,
lint, typecheck, production build and audit all pass; audit reports zero
vulnerabilities. `npm ci` leaves the lockfile hash unchanged. The existing ESLint
9.39.5 emits a deprecation notice during installation; a lint-toolchain upgrade
is separate work.

`npm run test:watch` starts interactive unit testing. Tests cover scoring examples,
invalid input, symmetry, configurable bounds and raw precision. SQL review is static;
RLS, concurrency, auth and reveal require isolated database integration tests after
execution approval. For local production checks run `npm run start`, then request
the four page routes and `/api/health`. Build generates Next.js route types for
`typecheck`; on a clean tree, run the build before standalone type checking if needed.

## Manual decisions and next phase

- Review/approve the draft SQL and execute only in an explicitly approved environment;
  test role isolation before gameplay. See the security test checklist in the review.
- Approve the season start and numeric maximum; decide deterministic daily/season
  tie breaking and behavior when every question in a day is voided.
- Supply authorized Supabase configuration when integration starts. Enable anonymous
  Auth and implement session refresh, then identity linking/conflict handling later.
- Next deliverable is a six-question vertical slice with explicitly dummy fixtures,
  atomic persistence and safe reveal. No real question content is supplied here.
- Figma supplies the frontend design. Before public launch: verified content,
  nickname moderation, privacy notice, rate limits, abuse/mobile/load testing and
  review of hosting capacity. Live deployment and spending require approval.
