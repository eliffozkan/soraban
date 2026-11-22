# SORABAN — three-agent team contract
Status: working agreement | 22 November 2026

## Who owns what
All three contributors use AI coding agents on **separate local checkouts** of this repository. AI output is reviewed by the human who owns the change. There is **no Figma handoff**; Neris implements UI components directly in React/Tailwind.

| Human / agent | Primary ownership | Directly edits |
| --- | --- | --- |
| **Elif — Codex** | Backend, Supabase Auth/SQL, API, data access, scoring and security | `app/api/**`, `lib/game/**`, `lib/data/**`, `lib/supabase/**`, `supabase/**`, `tests/game/**`, `tests/api/**`, `docs/SCHEMA_REVIEW.md` |
| **Zeynep — Claude** | Frontend flow, routes, state, forms, API integration and accessibility | `app/page.tsx`, `app/play/**`, `app/results/**`, `app/leaderboard/**`, `app/layout.tsx`, `components/game/**`, `lib/client/**`, `tests/ui/**` |
| **Neris — Claude** | Visual design as code, design tokens, responsive primitives and reusable visual components | `components/ui/**`, `app/globals.css`, `docs/design/**`, `public/brand/**` |

**Interface:** Neris exposes prop-driven, accessible UI primitives without game state, scoring, database access or API fetches. Zeynep composes those primitives into game screens and owns client interactions. Elif provides authenticated API endpoints; Zeynep consumes documented DTOs only. No one independently builds a second version of another owner's layer.

**Shared/reviewed files:** `package.json`, `package-lock.json`, `next.config.ts`, `tsconfig.json`, `AGENTS.md`, `CLAUDE.md`, `CONTRIBUTING.md`, `docs/TEAM.md`, `docs/API_CONTRACT.md`, `docs/SORABAN_CODEX_CONTEXT.md` and the GitHub workflows. The proposed API contract is jointly accepted by Elif + Zeynep before changing its shapes; Neris reviews fields that affect display. Only one agent edits a shared file at a time.

## Build order and concrete deliverables
1. **Shared boundary:** Agree on `docs/API_CONTRACT.md`. No secret answers in public DTOs. Establish initial UI props (`Button`, `Card`, `NumericInput`, `Progress`, `ScoreDisplay`) between Neris and Zeynep. Components must remain independent of fetching.
2. **Parallel work — separate branches:**
   - Elif: database migration review and isolated SQL permission tests; authenticated transactional submission proposal/implementation and API tests. **No live migration or production write without explicit approval.**
   - Zeynep: mobile-first homepage, question flow, confirmation, reveal, result and leaderboard page states, initially against typed mock data behind a replaceable adapter. No hard-coded real answers.
   - Neris: original light/neutral visual language, tokens, typography, spacing, responsive rules, accessible buttons/inputs/cards/status states; components with documented props and a local preview.
3. **Integrate:** Neris component PR merges first (or components are brought into Zeynep's branch). Zeynep replaces mocks with Elif's endpoints only after the API contract and authorization behavior are verified.
4. **Review:** All checks green, responsive/mobile/error/keyboard flows inspected, one-guess invariant and answer privacy tested in a disposable environment. Publishing to Supabase/Vercel is a separate explicit approval.

## Collaboration protocol
- Each person **clones** `https://github.com/eliffozkan/soraban.git` on their own computer. Do not share a checkout or worktree among agents.
- Start from `main` and create a branch: `feat/backend-foundation`, `feat/frontend-flow`, `feat/ui-system`. One active feature branch per person; later branches named per task.
- Before changing files, agent reads `AGENTS.md`, `CLAUDE.md` (Claude), `docs/SORABAN_CODEX_CONTEXT.md`, `docs/TEAM.md`, `docs/API_CONTRACT.md` and the relevant `docs/agents/*.md`.
- Never commit directly to `main`. Push only your feature branch, open a PR, request at least one human teammate review, then squash merge. Pull `main` after each merge. No force pushes.
- Run `npm test`, `npm run lint`, `npm run build`, `npm run typecheck` and `git diff --check` before PR. Flag unavailable integration tests explicitly.
- Do not edit another person's owned paths without their agreement. Cross-boundary requests are documented in the PR/issues. Package and toolchain changes require coordination.
- All AI agents must **report files touched, test results, assumptions and dependencies**; never silently broaden the task or deploy.

## Security and shared development
- Production-candidate questions and correct answers are **not** checked into public source, fixtures or client bundles. Only explicitly marked synthetic mock data may be committed.
- `.env.local` stays local and ignored; Elif owns the Supabase project. Zeynep and Neris do not need credentials for mock/UI work.
- Existing SQL draft is not applied. Its private namespace is `soraban_private`;
  keep it outside exposed API schemas. This spelling change requires no live schema
  migration because the draft has never been executed. Execution still needs approval.
- No credentials in prompts, PRs, logs or screenshots. Never bypass RLS by exposing privileged keys; public question endpoints never reveal unpublished correct values.
- Use **SORABAN/soraban** and `docs/SORABAN_CODEX_CONTEXT.md` in active work.
  Historical provenance and an existing local checkout path are the only documented exceptions.

## Current stage
The starter and scoring tests are present, but gameplay routes are placeholders and real submission/auth/leaderboard APIs are not yet implemented. Contract examples describe **proposals**, not existing working endpoints. Team PRs should be scoped and independently reviewable.

## Naming and checkout paths

All agents use `docs/SORABAN_CODEX_CONTEXT.md`. The unapplied draft keeps its filename
`supabase/drafts/0001_initial_schema.sql` and uses `soraban_private` consistently in
SQL and security documentation. No live objects, credentials or Supabase project
identifiers are renamed. Existing branch/commit history is preserved.

An existing `~/gauss` checkout may be renamed to `~/soraban` **after Codex and other
processes using it exit**. Follow [the safe folder procedure](../CONTRIBUTING.md#rename-the-local-checkout-after-codex-exits).
Do not move an agent's current working directory or edit another person's checkout.
Historical attribution in the specification and Git commit messages retains the
original project name; these are records, not active imports, scripts or instructions.
