# GAUSS project instructions

- Read `docs/GAUSS_CODEX_CONTEXT.md` completely first. It supersedes the older GDD.
- Setup scope only until requested otherwise. No fabricated questions, credentials,
  hard-coded season start, live account changes, deployment or spending.
- Explicit human approval is required before executing any migration or secret /
  production write operation. SQL in `supabase/drafts` is review material only.
- Keep App Router pages and Route Handlers thin; reusable UI in `components`, pure
  rules in `lib/game`, server-only repositories in `lib/data`, clients in `lib/supabase`.
  Keep presentation independent so Figma can guide the eventual frontend.
- Server-derived Europe/Istanbul date governs the day. One atomic locked guess per
  player/question; reveal answer/reason/source only after commit. Authorize server-side.
- Private answers require database-level separation and no public policies/views.
  Anonymous Supabase users can have the authenticated role; check ownership and
  verified linked identity separately. Never trust a submitted player ID or score.
- Never expose or log secret/service-role keys. Do not commit `.env.local`; only
  blank `.env.example` is tracked. Setup does not require privileged credentials.
- Preserve raw scores for aggregation/ties; round only for display. Reject invalid
  numbers and keep SQL bounds consistent with the scoring maximum.
- Use Node 24 LTS via the project `.nvmrc` (`nvm use`). Do not change nvm defaults
  or shell startup files for this project. Ask before installing machine-level runtimes.
- Run `npm test`, `npm run lint`, `npm run typecheck`, `npm run build` after changes.
  Report missing integrations and approvals accurately; do not claim RLS is tested
  without isolated database tests. Auth refresh/proxy is deferred until auth is built.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
