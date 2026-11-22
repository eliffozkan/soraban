# SORABAN — Claude Code entrypoint

Claude must read `AGENTS.md`, `docs/TEAM.md`, `docs/API_CONTRACT.md`, `docs/GAUSS_CODEX_CONTEXT.md`, `CONTRIBUTING.md`, then the human-specific instructions below **before editing**.

- **Zeynep:** `docs/agents/FRONTEND.md`.
- **Neris:** `docs/agents/UIUX.md`.

These documents are the single shared source of truth across Codex and Claude. Do not launch autonomous agents that modify another person's owned files. The product is **SORABAN**; no Figma workflow is required. Neris builds functional visual React components; Zeynep builds functional gameplay screens and consumes API data. Elif owns backend/DB/security.

Always check `git status` and branch; work on the assigned feature branch, never `main`. Do not alter the API contract unilaterally, fabricate real question data, commit secrets, apply migrations, deploy or change remote settings without explicit approval. Use `nvm use` (Node 24), local Next.js package docs for current APIs, and run checks listed in `CONTRIBUTING.md` before PR. End work with changed paths, test results, and integration dependencies.
