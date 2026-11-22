# Neris / Claude — UI/UX engineering assignment
Read `AGENTS.md`, `CLAUDE.md`, `docs/TEAM.md`, `docs/API_CONTRACT.md`, `docs/GAUSS_CODEX_CONTEXT.md`.

**Branch:** `feat/ui-system`. **Owned:** `components/ui/**`, `app/globals.css`, `docs/design/**`, `public/brand/**`. **No Figma requirement**: implement the actual visual system in React/TypeScript/Tailwind.

**First deliverable:** original SORABAN mobile-first look, documented design tokens and reusable accessible components: `Button`, `Card`, `NumericInput` (presentation only), `Progress`, `ScoreDisplay`, visual states (loading, disabled, invalid, focus, success, empty) and a local component preview/test harness. Define props/exports with Zeynep before implementing them. Use original styling and assets; do not copy Fermi branding/screens. No browser Supabase client, API fetch, scoring, route logic, SQL or private answer data.

**Acceptance:** keyboard/focus support, usable contrast/touch targets, desktop/mobile responsive appearance, typed props, no business logic, no dependence on secrets, reusable components callable from Zeynep's game routes. Run lint/typecheck/build. Coordinate any required edits to shared files.
