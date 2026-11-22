# Contributing to SORABAN

Read [the specification](docs/GAUSS_CODEX_CONTEXT.md), [AGENTS.md](AGENTS.md) and
[team ownership](docs/TEAM.md). Parallel feature development now follows the named three-agent roles in
[TEAM.md](docs/TEAM.md) and proposed [API contract](docs/API_CONTRACT.md).
Claude agents also read [CLAUDE.md](CLAUDE.md); each agent reads its assigned brief
in `docs/agents/`. No Figma handoff is required.
Use issues/PRs to assign one developer per task and agree changes across boundaries.

## Local setup

Use the checkout directory (existing machines may still call it `gauss`). With nvm
loaded, select the project-pinned Node 24 LTS version:

```sh
nvm use
node --version
npm ci
npm run dev
```

If missing, `nvm install --skip-default-packages` installs the `.nvmrc` version.
Codex must obtain approval before installing that machine-level runtime. Do not
change the nvm default or shell startup files for this project. Select Node again
when opening a new terminal; use the other project's runtime when switching work.
Use npm and commit package.json/package-lock.json together for dependency changes.

Placeholder pages and checks work without Supabase credentials. For integration:

1. Create `.env.local` from `.env.example` only if absent; preserve existing values.
2. Privately obtain the authorized URL and **publishable** key. Enter them locally
   as `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
3. Restrict the file to its owner (`chmod 600 .env.local`). Verify exclusion with
   `git check-ignore .env.local` and no tracked file with `git ls-files -- .env.local`.
4. Restart the dev server after changes. Never paste keys into chat, PRs or logs.

No secret/service-role key or database password is required. Keep `.env.example`
blank. Never force-add ignored files. Ignore rules reduce accidents; they cannot
recognize every secret placed in an arbitrary source file. Review staged changes.
Do not use shared-project writes, auth changes, migrations or deployment as a test.

## Branches, PRs and merging

Each contributor clones the existing GitHub repository on their **own** computer,
then starts from an updated `main`:

```sh
git switch main
git pull --ff-only origin main
git switch -c feat/your-owned-feature
```

Use `feat/`, `fix/`, `docs/` or `chore/` branches. Keep commits focused; stage explicit
paths and inspect `git diff --cached` before committing. Open a PR targeting `main`
with the problem, behavior, affected owners, checks and remaining risks. Use the PR
template; identify draft SQL changes explicitly as unapplied. Request another developer's
review and involve owners per `docs/TEAM.md`. Never commit credentials or fabricated
real content. GitHub publication/push requires explicit authorization in Codex.

Before requesting merge, run:

```sh
npm test
npm run lint
npm run build
npm run typecheck
git diff --check
```

Build generates Next.js route types, so it precedes standalone typecheck for fresh
checkouts. For dependency updates also run `npm audit`. Static SQL review does not
prove RLS or concurrency safety; database execution needs separate explicit approval.

Bring the latest `main` into the feature branch before merge (a merge is fine; rebase
only your own unshared commits). Resolve conflicts with the affected owner and re-run
checks. A reviewer squash-merges the approved PR, then teammates pull `main` with
`--ff-only`. Never push directly or force-push to `main` during normal team work.
The initial repository publication has been completed. Follow branch/PR review for
all further changes; do not run the old bootstrap push again.

## Existing GitHub repository (already published)

Use https://github.com/eliffozkan/soraban.git. The public repository already exists and has been pushed; do not
create another repository or change its visibility/access permissions as part of setup.
Do not reinitialize Git or rewrite existing commits. Use the existing authentication;
`gh auth status` checks it without changing account configuration.

For the existing checkout, inspect `git remote -v`. Only if `origin` is missing:

```sh
git remote add origin https://github.com/eliffozkan/soraban.git
```

If an existing origin points elsewhere, stop and ask before changing it. After reviewing
and committing the intended files, the one-time authorized bootstrap push is:

```sh
git push -u origin main
```

Subsequent changes follow the branch/PR workflow above. A non-fast-forward rejection
requires fetching and reviewing remote changes; never force-push. Publishing draft SQL
does not execute it or approve a migration. Collaborator access and review enforcement
are separate work requiring authorization.
