# GAUSS — Project Context and Implementation Brief
Version: 0.2 (21 November 2026)
Status: working specification for Codex and the project team
Source: GAUSS Game Design Document v0.1 (13 November 2026) and reviewed feedback. Where this document differs from v0.1, **this document takes precedence**.

## Product
GAUSS is a browser-based, mobile-first daily numerical estimation game about Middle East Technical University (ODTÜ/METU). It is for *anyone interested in ODTÜ*, not just enrolled students. It is inspired by the public gameplay patterns of the Turkish Fermi game (fermi.tr), but must have distinct original branding, layout, copy and question content. Do not copy third-party protected code, private APIs, designs, assets or question banks.

### Season and rules
- Season 1: 30 consecutive days; 6 questions per day; **180 verified questions**, with a target of 20 backups. Content is researched separately and must not be fabricated.
- Everyone gets the same six questions on a given day. One locked guess per player per question.
- Game day uses the server-derived date in the `Europe/Istanbul` timezone and turns over at 00:00 local time. Season start date is configurable, **not hard-coded without approval**.
- A response reveals the actual value, score, short reasoning and source **only after that user's guess is securely committed**.
- Daily score: arithmetic mean of six unrounded question scores, rounded only in the UI. A completed six-question day qualifies for a leaderboard entry. Partly played days remain saved but do not appear on the completed-day leaderboard.
- Season ranking: sum of completed daily scores (missed days yield no points), with played-day count and average displayed separately. Streak does not add bonus points. Define deterministic tie breaking.
- Archive: past questions may be read after their day, but cannot be retroactively played for points.
- Results can be shared as spoiler-free text or an image. Small onboarding explains proportional scoring. Scope excludes friend lists, badges, challenges, notifications and admin panels in the MVP.
- A question judged factually invalid can be voided and excluded from everyone's daily denominator; recalculate affected scores transparently. Include an issue-report action later in the first season.

### Scoring
For positive finite `answer` and `guess`:

`ratio = max(guess / answer, answer / guess)`
`score = max(0, 100 - 50 * log10(ratio))`

Use raw floating point score for calculations and tie breaking; round only for UI display. Examples: exact 100, 2x ~84.95, 3x ~76.14, 10x 50, 30x ~26.14, 100x 0. This is GAUSS's proposed public formula, not a claim about Fermi's undisclosed internals. Reject NaN, Infinity, zero, negative inputs and values above the configured maximum (initial proposal 1e15). Questions whose meaningful correct answer is zero or negative are out of initial scope.

### Number entry
Numeric input must be usable on mobile and desktop and accessible to assistive technologies. The question itself fixes the unit. If there are magnitude shortcuts (thousand, million, billion), they scale the number, **not** the physical unit. Avoid ambiguous Turkish vs English separators: display the *parsed value* in an explicit pre-submit confirmation (example: `1.500 → 1,500 / bin beş yüz`). No paste blocking; server-side validation is mandatory.

### Accounts, security and data
- First-time visitor can play via Supabase anonymous authentication; game progress, guesses and scores are server-side. Local storage may cache UI only.
- Later, a player can link a Google identity to keep their progress across devices and enter official leaderboards. Check the current Supabase identity-linking documentation and account-conflict behavior before implementation. Multiple accounts remain a risk.
- Public nickname moderation (offensive or impersonating names) and a concise privacy notice are required before production release. Do not expose players' emails.
- Public questions and **private answers must be separated** at the database authorization level. No answer, correct value, or source that leaks the answer is readable before the server locks the user's guess. Service-role credentials must never reach the client, logs, or git.
- Apply RLS, server-side authorization, request validation, atomic guess locking and a UNIQUE(player_id, question_id) constraint. Treat Supabase anonymous accounts carefully because they can have the `authenticated` role.
- No secret or production write operations without explicit confirmation. Migration SQL is to be reviewed before execution. Apply rate limiting before a public launch.

### Suggested architecture
- Single GitHub repository, Next.js App Router, React, TypeScript, Tailwind CSS.
- Next.js Route Handlers / server functions for game rules, with Supabase PostgreSQL and Auth.
- Vercel hosting with GitHub preview deployments, subject to current plan terms and limits. Free launch is a target, not a capacity guarantee.
- User-facing routes: `/` (today and onboarding), `/play` (questions and result states), `/results`, `/leaderboard`.
- Proposed API routes: `GET /api/today`, `POST /api/guesses`, `GET /api/leaderboard`, `GET /api/health`.
- Suggested logical data: game_days; public_questions; private_answers; player_profiles; guesses; daily_scores. Add only needed columns. Do not publish the answer table through public views or policies.

### Team and design responsibilities
- Project owner: backend, data model, scoring, API and integration.
- Collaborator: UI/UX layouts, styles, components, states and responsive behavior in Figma.
- Frontend implementation and end-to-end testing are shared. Figma output is a design spec, not executable frontend code.

## Delivery plan
A. Reference analysis and validated rules, with edge-case checklist.
B. Repository and technical skeleton, scoring module/tests and draft schema.
C. One complete six-question vertical slice (dummy fixture data only) with persistence and proper reveal behavior.
D. Visual design integration, verified accounts, leaderboard and spoiler-free sharing.
E. Prepare all 180+20 sourced questions, run mobile, abuse, security and load tests; pilot with at least 30 people.
F. Deploy, monitor traffic/errors and run the 30-day season. After day 30, show a final recap and an end-of-season screen; a second season is a later decision.

## Current task — setup only (21 November)
The local project already exists at `~/gauss`, created with `npx create-next-app@latest gauss --yes`, with Next.js 16, TypeScript and Tailwind. **Do not reinitialize it.**
1. Inspect project configuration, present a concise implementation plan and check dependencies and scripts.
2. Prepare a clean directory structure for components, game logic, API, data access and tests. Keep UI placeholder minimal so Figma can guide the final design.
3. Implement the standalone scoring function and tests (exact, 2x, 3x, 10x, 30x, 100x; invalid inputs; symmetry; raw precision).
4. Add `/api/health` and placeholders for `/`, `/play`, `/results`, `/leaderboard`.
5. Prepare Supabase integration helpers and `.env.example`. Do not fabricate project URL/keys; do not commit `.env.local`. No service-role keys in frontend.
6. Draft a reviewed SQL migration and RLS policies, **but do not apply the migration** until human approval.
7. Add a short root `AGENTS.md` with stable architecture/security rules and a practical README.
8. Run lint, tests and production build. Report the commands and outcomes, files changed, unresolved decisions and manual steps.

## Explicitly not part of today's setup
Do not implement real Google OAuth, a production leaderboard, an admin dashboard, upload the 180 question set, deploy with guessed credentials or modify GitHub/Vercel/Supabase accounts without authorization. Before changing any live environment or spending money, ask for approval. Prioritize reliable working foundations over breadth.
