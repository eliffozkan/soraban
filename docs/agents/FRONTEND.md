# Zeynep / Claude — frontend assignment
Read `AGENTS.md`, `CLAUDE.md`, `docs/TEAM.md`, `docs/API_CONTRACT.md`, `docs/GAUSS_CODEX_CONTEXT.md`.

**Branch:** `feat/frontend-flow`. **Owned:** `app/page.tsx`, `app/play/**`, `app/results/**`, `app/leaderboard/**`, `app/layout.tsx`, `components/game/**`, `lib/client/**`, frontend tests.

**First deliverable:** mobile-first screen flow with typed synthetic fixtures and a replaceable API adapter: entry/onboarding, six-question progression, numeric input and human-readable confirmation, locked submission state, revealed result, daily result/sharing and leaderboard loading/empty/error states. Handle keyboard/accessibility and do not make a real guess until backend is verified. Keep page-level design minimal initially; consume Neris's `components/ui/**` primitives and coordinate their props. Never create a second design system.

**Acceptance:** routes render with synthetic (clearly labeled) mock values; UI never contains real answers; client does not calculate authoritative scores; adapter matches agreed `docs/API_CONTRACT.md`; app passes tests/lint/build; no edits to backend, database, `app/globals.css` or `components/ui/**` without owner agreement.
