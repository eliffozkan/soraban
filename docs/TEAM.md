# SORABAN team ownership

Three developers choose one primary role each before starting parallel work. Names
and GitHub handles are not yet supplied; the roles below are assignments to make,
not invented identities. Record the agreed handles in a follow-up PR. Ownership
coordinates work and review; everyone can contribute across boundaries.

| Primary role | Owns | Required coordination |
| --- | --- | --- |
| Developer A — frontend | `components/`, `app/` pages/layouts/styles except `app/api/`, `public/`; Figma translation, accessibility, responsive states | Agree API DTOs with B; obtain B review for auth/session or result rendering |
| Developer B — backend/API | `app/api/`, `lib/game/`, `lib/data/`, `lib/supabase/`, game/API tests | C reviews authorization, scoring/persistence and transaction changes; A reviews consumer-facing API changes |
| Developer C — database/content | `supabase/`, `docs/SCHEMA_REVIEW.md`, verified-question research and source review | B reviews every SQL/RLS/scoring-data change; A reviews public question wording and units |

B coordinates shared package/lockfile, Next.js/TypeScript configuration and integration
changes. Another developer reviews them. Product-rule or architecture changes in
`docs/GAUSS_CODEX_CONTEXT.md` need the affected owners' review and project-owner approval
for unresolved decisions; a renamed product does not change the accepted rules.

## Boundaries

- UI consumes explicit public DTOs. It cannot import repositories, private answers
  or privileged clients. Keep design changes out of game rules and database code.
- Route Handlers authenticate and validate requests. Pure rules stay in `lib/game`;
  server-only repositories stay in `lib/data`. No direct client score writes.
- SQL changes stay as review-only drafts until the project owner explicitly approves
  execution for a named environment. PR approval is not permission to apply a migration.
- Content ownership covers real source verification, units, positive correct values,
  dates and backups. No invented real questions, seeded answers or unreviewed imports.
  Keep answer/source research outside public frontend assets. A fixture, when requested
  later, must be explicitly dummy data and isolated from real content.
- Describe the affected boundary in an issue/PR before editing shared files. Keep
  features small; avoid concurrent edits to layout, schema and package-lock.json.
  Preserve unpublished work in others' branches; resolve conflicts with the owner.

## Review and integration

Every PR needs at least one other developer's review and all local checks. Changes
spanning boundaries need each affected role involved. Database/security changes need
B and C involved; if one authors the change, the other reviews. Re-run checks after
conflict resolution. Merge by squash into `main`; never force-push `main`. PR approvals
for publishing, migrations or spending are distinct from implementation review.

No CODEOWNERS file with fabricated handles is installed. GitHub collaborators, reviewer
rules, branch protections and automated CI are not configured by this local task.
After approved publication, assign handles, invite the two collaborators, and configure
`main` to require PR review and the agreed checks where available. Until then the
review/check rules are a manual team convention, not enforced by GitHub.

## Retained internal names

SORABAN is the product/UI name; npm package and health service identity are `soraban`.
The following retain GAUSS-era names intentionally:

- `gauss_private` and all SQL tables, constraints and policies: preserve the authorization
  boundary and migration review. A database rename needs a separately reviewed migration.
- `supabase/drafts/0001_initial_schema.sql`: same file, still draft-only and unapplied.
- `docs/GAUSS_CODEX_CONTEXT.md`: stable specification path used by existing instructions;
  its heading/product copy now say SORABAN, with original GDD attribution preserved.
- The existing checkout `/home/elif/gauss`, historical create-next-app command, Git
  commit messages and temporary `/tmp/gauss-*` review-tool references: historical paths
  and records, not current branding. Do not move the checkout or rewrite Git history.
- The existing Supabase project URL/identity is infrastructure, independent of branding;
  no project rename, recreation, credential change or schema execution was performed.
