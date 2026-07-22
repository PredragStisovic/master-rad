# master-rad — Task/Project Management API

> Experimental platform for a Master's thesis in Software Engineering:
> **evaluating LLM-assisted Pull Request risk assessment in a CI/CD pipeline.**

## What this is

This repository is a backend **Task / Project Management** system built with NestJS. The
application is **not** the research object — it is the *experimental platform*. The real subject
of the thesis is whether a Large Language Model can improve the Pull Request review process by
estimating the **risk of merging a PR**, even when every traditional CI quality gate passes.

Because of that, **the development history itself is the data.** The project is built through a
long series of small, single-purpose Pull Requests at genuinely different risk levels, so the
repo ends up looking like a real production project's history rather than a tutorial.

The eventual pipeline will collect software-quality metrics and submit them, together with the
PR diff, to an LLM that produces:

- **Risk Score** (1–10)
- **Confidence**
- **Explanation**
- **Potential issues**
- **Recommendations**

The LLM stage is added later, on top of the existing CI, and is intentionally **not** part of
the application backlog.

## Tech stack

Backend only — no frontend.

| Concern | Choice |
|---|---|
| Framework | NestJS 11 (TypeScript) |
| Database | PostgreSQL |
| ORM | Prisma |
| Auth | JWT (access + rotating refresh) |
| Docs | Swagger / OpenAPI |
| Tests | Jest + Supertest |
| Packaging | Docker + docker-compose |
| CI (later) | GitHub Actions · SonarQube · security scan · LLM risk stage |

Requires Node 22 / npm 10.

## Architecture

NestJS **modular monolith**, clean/layered architecture, written as production code.

```
Controller (HTTP, DTO validation, Swagger)
   → Service (application/domain logic, transactions)
      → Repository (Prisma data access)
Guards (auth, roles, permissions, project-scope) as cross-cutting policy
```

Target source layout (grows PR by PR):

```
src/
  config/            # schema-validated env, config module
  common/            # exception filter, interceptors, decorators, pagination, base guards
  prisma/            # PrismaService, PrismaModule
  health/
  modules/
    auth/  users/  roles/  projects/  project-members/
    tasks/  task-comments/  task-attachments/
    notifications/  audit-log/  search/  reports/
prisma/               # schema.prisma, migrations/, seed.ts
test/                 # e2e (supertest)
docker/               # Dockerfile, docker-compose.yml
.github/workflows/    # CI (added late)
```

**Feature modules:** Auth · Users · Roles & Permissions · Projects · Project Members · Tasks ·
Task Comments · Task Attachments · Notifications · Audit Log · Search · Reports.

## How the work is structured (backlog & PRs)

Development follows a fixed backlog of **57 small Pull Requests across 9 phases**. Rules:

- **One logical change per PR.** No mega-PRs.
- **One branch = one PR.** Branch prefixes signal intent (and seed risk diversity):
  `feature/`, `refactor/`, `bugfix/`, `performance/`, `security/`, `ci/`.
- Every PR ships with DTO validation (`class-validator`), Swagger annotations, and tests.
- Prisma migrations are committed and reversible; seed scripts are idempotent.

### Phases

| Phase | Theme | PRs |
|---|---|---|
| 0 | Foundations (scaffold, config, DB, docker, health, common) | 01–08 |
| 1 | Auth & Users (hashing, register, login, JWT, refresh) | 09–15 |
| 2 | Roles & Permissions (RBAC guards) | 16–20 |
| 3 | Projects & Members (project-scoped authz) | 21–25 |
| 4 | Tasks core (CRUD, workflow, assignment, query) | 26–31 |
| 5 | Collaboration (comments, attachments) | 32–35 |
| 6 | Cross-cutting (audit log, notifications, events) | 36–40 |
| 7 | Query features (search, reports) | 41–43 |
| 8 | Hardening & optimization (rich Medium/High samples) | 44–51 |
| 9 | Test / CI readiness (no LLM stage yet) | 52–57 |

### Risk distribution (the thesis target labels)

Deliberately shaped to look like a real project — most changes safe, risk clustered in
security/authz/migrations:

| Risk | Count | Share | Where it lives |
|---|---|---|---|
| Low | ~24 | ~42% | CRUD, DTOs, pagination, reports, CI config |
| Medium | ~26 | ~46% | migrations, refactors, caching, cross-cutting, search |
| High | 7 | ~12% | login/JWT, refresh tokens, roles/permission guards, project-access guard, refresh-token hardening, permission-system redesign |

The 7 High-risk PRs are the *"all gates green but still risky"* cases the LLM must learn to
flag. The full per-PR backlog (branch, goal, risk, complexity, size, dependencies, suggested
owner) lives in [`docs/BACKLOG.md`](docs/BACKLOG.md).

### Authorship note (thesis validity)

PRs are authored by a **mix** of the human researcher and Claude, deliberately spread across
*every* risk band. If author correlated with risk (e.g. all High-risk PRs human-written), the
LLM evaluation would be confounded. Each PR should record a short **ground-truth risk
rationale** in its description so LLM predictions can be scored against it later.

## Getting started

```bash
npm install

# development
npm run start:dev

# tests
npm run test          # unit
npm run test:e2e      # e2e
npm run test:cov      # coverage
```

(Database, Docker, and Swagger wiring arrive in Phase 0 PRs 02–06.)

## Status

Phase 0 in progress — NestJS scaffold in place (`feature/bootstrap-nestjs`). See
[`docs/BACKLOG.md`](docs/BACKLOG.md) for what's next.
