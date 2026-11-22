# Elif / Codex — backend assignment
Read `AGENTS.md`, `docs/TEAM.md`, `docs/API_CONTRACT.md`, `docs/SCHEMA_REVIEW.md`, `docs/GAUSS_CODEX_CONTEXT.md`.

**Branch:** `feat/backend-foundation`. **Owned:** `app/api/**`, `lib/game/**`, `lib/data/**`, `lib/supabase/**`, `supabase/**`, backend tests. The existing SQL draft has not been applied.

**First deliverable:** document and implement the approved secure backend in small testable increments. Start with a design review of migration/RLS against a disposable database before execution; propose atomic one-guess-per-question submission (post-commit reveal), authenticated identity checks, Istanbul time, concurrency-safe score aggregate, exactly six published questions. Keep API examples consistent with `docs/API_CONTRACT.md`. Coordinate contract changes with Zeynep.

**Acceptance:** no early answer leakage; no direct client writes; duplicate and concurrent requests cannot change guesses or scores; tests cover auth, invalid numbers, boundary and retry behavior. Report DB tests as unverified until actually executed. No live migration or external deployment without Elif's explicit approval. Do not edit visual page code or CSS.
