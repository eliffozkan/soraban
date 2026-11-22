# Presentation episodes: content, moderation and execution gates

Current drafts support Demo and 22 November 2026 with five different questions
each. No real question set is included. Zeynep supplies verified content privately.
Both are calendar-independent, one immutable attempt per identity/question; reload
resumes, and a new audience can use Demo without resetting existing scores.

## Private manifest and repeatable publication

Keep input and generated SQL **outside the repository**, access restricted to the
owner. Input is `{ "episodes": [...] }`, containing exactly two objects:

| Field | Demo | Dated episode |
| --- | --- | --- |
| slug | `demo` | `2026-11-22` |
| title | Human-supplied display title, 1–80 chars | Same constraint |
| date | JSON null | `2026-11-22` |
| questions | Five objects, positions 1–5 | Five different objects, positions 1–5 |

Each question requires `position`, `prompt`, `unit`, positive finite `answer`
through 1e15, `reasoning`, HTTPS `sourceUrl`, `verified: true`, and nonempty
`verifiedBy` naming the human reviewer. Optional `category` uses Neris's six keys.
All ten normalized prompts must differ. Verification is a human attestation;
the tool does not independently check facts or fetch sources. Never put real
answers in public fixtures, chat, PRs, screenshots or frontend bundles.

Preparation does not contact a database:

```sh
python3 -B supabase/import_episodes.py --input /private/verified-episodes.json --output /private/episode-publication.sql
```

Output is mode 0600 and existing files are never overwritten. It wraps both
owner-only `import_episode` calls in one transaction. Running that SQL after
execution approval imports/publishes both atomically, without season rows or a
season start. Identical reimport is a no-op; changed published metadata/content
is rejected, preserving saved guesses and voids. Corrections require reviewed
voiding or a separately approved content/version decision, not a silent reset.

## What requires new approval

**Nothing in this sprint executes SQL or changes live accounts.** Earlier approval
covered an older disposable test, not the new draft or any other database.

1. Approve running the extended isolated PostgreSQL harness. It applies 0001,
   0002 and 0003 only in its fresh network-none/tmpfs container, with synthetic
   fixtures and Auth test doubles, then removes the container:
   `python3 -B -u supabase/tests/integration.py --approved-disposable-execution`.
2. Separately approve a fresh local Supabase test: apply those three drafts once,
   create local anonymous identities, and publish synthetic content to verify real
   JWT/RLS, HTTP cookies, commit/rollback preferences, both episode boards and reload.
   Keep the private schema unexposed; PostgREST transaction override stays disabled.
3. Only after tests/content review: approve the named target database migration,
   private ten-question publication and deployment separately. Do not infer those
   approvals from a PR merge or a publishable key. No privileged credentials are
   needed for the frontend; do not pass database passwords in command-line URLs.

## Owner-only moderation

There is no public admin endpoint. After explicit approval on the intended DB,
the trusted owner calls `soraban_private.moderate_profile(player_uuid,
expected_current_nickname, approve, hide, lock, reason)`. Expected nickname guards
against approving a name changed during review. Only the owner's private console
sees UUIDs/reasons. Clients cannot approve, hide, unhide or unlock themselves.
Hide excludes the player from rankings; lock prevents renaming. Ordinary edits
cannot clear either flag, and revoke prior name approval. A fixed anonymous name
is displayed whenever a nickname is pending/unapproved.

New HTTP endpoints/DTOs and adapter review points are in `docs/API_CONTRACT.md`.
