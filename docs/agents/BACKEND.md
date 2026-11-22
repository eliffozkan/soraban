# Elif / Codex — backend assignment
Read `AGENTS.md`, `docs/TEAM.md`, `docs/API_CONTRACT.md`, `docs/SCHEMA_REVIEW.md`, `docs/SORABAN_CODEX_CONTEXT.md`.

**Branch:** `feat/gameplay-persistence` (Milestone 1: `feat/backend-foundation`, merged). **Owned:** `app/api/**`, `lib/game/**`, `lib/data/**`, `lib/supabase/**`, `supabase/**`, backend tests. The SQL drafts have not been applied.

**Milestone 2:** implement the approved secure backend in small testable increments: atomic immutable submission (post-commit reveal), authenticated identity checks, Istanbul time, concurrency-safe score aggregate, exactly five published questions and optional existing category keys. Prepare disposable database tests, but obtain separate explicit approval before execution. Keep API examples consistent with `docs/API_CONTRACT.md`; Zeynep reviews contract changes and owns client updates.

**Acceptance:** no early answer leakage; no direct client writes; duplicate and concurrent requests cannot change guesses or scores; tests cover auth, invalid numbers, boundary and retry behavior. Report DB tests as unverified until actually executed. No live migration or external deployment without Elif's explicit approval. Do not edit visual page code or CSS.

## Agreed cross-team responsibilities
Elif owns `POST /api/session/anonymous`, SSR cookie/session refresh, verified server identity and tests; Zeynep calls it from the browser. Elif also owns the root Vitest/React test-environment setup, related dependencies and CI workflow in a separate reviewed PR. Read `docs/INTEGRATION_DECISIONS.md` for void progress, equal-rank, nickname/privacy ownership and season-start gate. Never apply live SQL without separately approved execution.
