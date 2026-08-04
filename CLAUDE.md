# CLAUDE.md

Guidance for Claude Code when working in this repository.

## What this project is

`master-rad` is a NestJS **Task/Project Management API** that serves as the experimental
platform for a Master's thesis on **LLM-assisted Pull Request risk assessment in CI/CD**. The
application is a means, not the end: **the development history (the PRs) is the research data.**

Read [`README.md`](README.md) for the full framing, [`docs/BACKLOG.md`](docs/BACKLOG.md) for
the 57-PR backlog (risk, deps, suggested owners), and [`docs/METHODOLOGY.md`](docs/METHODOLOGY.md)
for the experimental method — category taxonomy, target distributions, and the deviation log.

## The one rule that matters most

**One logical change per Pull Request.** Never batch unrelated changes. A PR that mixes, say,
a migration + a new endpoint + a refactor destroys the risk-labeling premise of the thesis.
When in doubt, make it smaller.

## Workflow (per PR)

1. Pick a PR from `docs/BACKLOG.md` whose dependencies are already merged.
2. Branch off the integration branch using the backlog's exact branch name
   (`feature/…`, `refactor/…`, `bugfix/…`, `performance/…`, `security/…`, `ci/…`).
3. Implement only that change, with:
   - DTO validation via `class-validator`
   - Swagger/OpenAPI annotations on new endpoints
   - Unit tests for new services; e2e tests where a route is added
   - Committed Prisma migrations (idempotent seeds) for schema PRs — written so they *could* be
     reversed, but never actually reverted or reset (see Verification)
4. **Verify before handing off** (see below).
5. **Stop for the user's review before starting the next PR.** Do not chain PRs.

Do not commit or push unless the user asks. When committing, keep the history focused (small,
meaningful commits) — it is part of the dataset.

## Verification

- `npm run build` and `npm test` must pass.
- Exercise new routes via e2e (`npm run test:e2e`) or a manual `curl` / Swagger check against
  the docker-compose Postgres.
- For migration PRs, confirm the migration applies via `npx prisma migrate dev --name <name>`
  against the docker-compose Postgres. That is the whole check — **do not verify the revert.**
- **Never run a destructive Prisma command** (`prisma migrate reset`, `db push --force-reset`,
  or hand-written `DROP`/`TRUNCATE` against the dev database). The local Postgres holds data
  worth keeping, and reset replays migrations forward — it does not test reversibility anyway.
  Reversibility is a review-time judgement about the SQL, not something to execute.
- The generated client is gitignored, so run `npx prisma generate` after a schema change (or
  after switching to a branch whose schema differs) before `npm run build`.

## Architecture & conventions

- NestJS modular monolith, layered: **Controller → Service → Repository (Prisma)**.
  Guards (auth / roles / permissions / project-scope) are cross-cutting policy.
- Keep new code in the established layout: cross-cutting infra in `src/common`, `src/config`,
  `src/prisma`; feature modules under `src/modules/<name>/`.
- **A service exposes only the methods its controller calls.** Everything else — guard clauses
  (`assertX` / `getExistingX`), query builders, mappers, any logic shared between endpoints —
  goes into an injectable `<name>.helper.ts` (`UsersHelper`) that the service depends on. No
  `private` support methods on services; the service method should read as the endpoint's
  orchestration and nothing more. See `src/modules/users/` for the reference shape.
- Test each unit against its own collaborators: `<name>.service.spec.ts` mocks the helper and the
  repository; `<name>.helper.spec.ts` mocks the repository and covers the guard/query logic.
- Match the surrounding code's style, naming, and test conventions. Prefer reusing existing
  `common/` utilities (pagination DTO, exception filter, decorators) over new ones.

## Thesis-specific expectations

- **Preserve the risk shape.** The backlog is intentionally mostly Low, some Medium, a few High
  (High concentrated in auth/authz/migrations). Don't accidentally turn a Low PR into a High one
  by pulling in extra scope.
- **Author must not correlate with risk.** PRs are split between the human and Claude across all
  risk bands on purpose. Respect the suggested `Own` column but keep the spread.
- **Record, per PR:** (1) the **primary semantic category** (Feature / Bug fix / Refactoring /
  Performance / Security / DB migration / Infrastructure-CI — by *meaning*, not branch prefix),
  and (2) a **ground-truth risk rationale** (why L/M/H) so LLM predictions can be scored later.
- **Bug fix / Refactoring are a reserved budget** — don't fabricate them up front; open them
  organically when a real bug surfaces or a unit genuinely needs restructuring.
- **Migrations follow the mixed rule** — a small/safe migration rides along with its feature; a
  large or risky one (new base table, data migration, index/tsvector, breaking change) is its own
  `DB migration` PR.
- When a planned PR is **split/merged** or an **unplanned** PR appears, add a row to the
  deviation log in `docs/METHODOLOGY.md`.
- The **LLM risk-assessment stage is not part of the app backlog** — don't build it into the
  application. It is added to CI later as the thesis instrument.

## Commands

```bash
npm run start:dev     # watch mode
npm run build         # nest build
npm run test          # unit
npm run test:e2e      # e2e
npm run test:cov      # coverage
npm run lint          # eslint --fix
npm run format        # prettier
```

Node 22 / npm 10.
