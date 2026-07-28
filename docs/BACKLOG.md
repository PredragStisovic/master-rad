# Backlog — 57 Pull Requests

> This is the **initial, pre-written** plan — the feature/infrastructure spine. Per
> [`METHODOLOGY.md`](METHODOLOGY.md), it is deliberately feature/infra-heavy: **Bug fix** and
> **Refactoring** PRs are a _reserved budget_ filled **organically** during development, so the
> realized total grows toward ~65–75. Each PR is classified by **semantic category** (not branch
> prefix), and migrations follow the _mixed_ rule (small → folded into the feature; large/risky
> → standalone `DB migration` PR). Record each PR's semantic category + ground-truth risk
> rationale at implementation time.

Legend — **Risk** = expected _merge_ risk (the thesis label): **L** / **M** / **H**.
**Cx** = implementation complexity (○ low / ◐ med / ● high).
**Size**: S <150 LOC · M 150–400 · L >400.
**Own** (suggested owner): **C** = Claude · **U** = You (flexible — keep the author/risk spread; see README).

## Phase 0 — Foundations

| #   | Branch                          | Goal                                                | Risk | Cx  | Size | Deps  | Own |
| --- | ------------------------------- | --------------------------------------------------- | ---- | --- | ---- | ----- | --- |
| 01  | feature/bootstrap-nestjs        | Scaffold NestJS + TS + ESLint/Prettier + Jest       | L    | ○   | M    | —     | C   |
| 02  | feature/config-module           | `@nestjs/config` + schema-validated env             | L    | ○   | S    | 01    | C   |
| 03  | feature/prisma-setup            | Prisma init, `PrismaService`/module, base migration | M    | ◐   | M    | 01,02 | C   |
| 04  | feature/docker-compose          | Multi-stage Dockerfile + compose (app+postgres)     | L    | ◐   | M    | 01,03 | C   |
| 05  | feature/health-check            | Terminus health (DB)                                | L    | ○   | S    | 03    | C   |
| 06  | feature/swagger-setup           | OpenAPI/Swagger bootstrap                           | L    | ○   | S    | 01    | C   |
| 07  | feature/common-module           | Exception filter, interceptors, base pagination DTO | M    | ◐   | M    | 01    | C   |
| 08  | feature/base-entities-migration | User/Role/Permission models + migration             | M    | ◐   | M    | 03    | U   |

## Phase 1 — Auth & Users

| #   | Branch                          | Goal                                         | Risk  | Cx  | Size | Deps  | Own |
| --- | ------------------------------- | -------------------------------------------- | ----- | --- | ---- | ----- | --- |
| 09  | feature/users-crud              | Users module CRUD                            | L     | ○   | M    | 07,08 | C   |
| 10  | feature/password-hashing        | argon2/bcrypt hashing on user create         | M     | ◐   | S    | 09    | U   |
| 11  | feature/auth-register           | Registration endpoint                        | M     | ◐   | M    | 09,10 | C   |
| 12  | feature/auth-login-jwt          | Login + JWT access token + JwtStrategy/Guard | **H** | ●   | M    | 11    | U   |
| 13  | feature/auth-refresh-token      | Rotating refresh tokens (hashed, stored)     | **H** | ●   | M    | 12    | U   |
| 14  | feature/current-user-decorator  | `@CurrentUser` + `/me`                       | L     | ○   | S    | 12    | C   |
| 15  | feature/logout-token-revocation | Logout / revoke refresh token                | M     | ◐   | S    | 13    | C   |

## Phase 2 — Roles & Permissions

| #   | Branch                        | Goal                                     | Risk  | Cx  | Size | Deps  | Own |
| --- | ----------------------------- | ---------------------------------------- | ----- | --- | ---- | ----- | --- |
| 16  | feature/roles-crud            | Roles CRUD                               | L     | ○   | M    | 08    | C   |
| 17  | feature/permissions-seed      | Permission catalog + idempotent seed     | M     | ◐   | M    | 08,16 | C   |
| 18  | feature/roles-guard           | `RolesGuard` + `@Roles`, wired to routes | **H** | ●   | M    | 12,16 | U   |
| 19  | feature/permissions-guard     | `@RequirePermissions` + guard            | **H** | ●   | M    | 17,18 | U   |
| 20  | feature/assign-roles-to-users | User↔role assignment endpoints           | M     | ◐   | S    | 09,16 | C   |

## Phase 3 — Projects & Members

| #   | Branch                            | Goal                                           | Risk  | Cx  | Size | Deps  | Own |
| --- | --------------------------------- | ---------------------------------------------- | ----- | --- | ---- | ----- | --- |
| 21  | feature/projects-migration        | Project model + migration                      | M     | ◐   | S    | 08    | C   |
| 22  | feature/projects-crud             | Project CRUD                                   | L     | ○   | M    | 21    | C   |
| 23  | feature/project-members-migration | ProjectMember join + project roles + migration | M     | ◐   | S    | 21    | C   |
| 24  | feature/project-members-crud      | Add/remove/list members                        | M     | ◐   | M    | 22,23 | C   |
| 25  | feature/project-access-guard      | Project-scoped authz (member/owner)            | **H** | ●   | M    | 19,24 | U   |

## Phase 4 — Tasks core

| #   | Branch                         | Goal                                              | Risk | Cx  | Size | Deps  | Own |
| --- | ------------------------------ | ------------------------------------------------- | ---- | --- | ---- | ----- | --- |
| 26  | feature/tasks-migration        | Task model (status/priority enums) + migration    | M    | ◐   | S    | 21    | C   |
| 27  | feature/tasks-crud             | Task CRUD within a project                        | M    | ◐   | M    | 25,26 | C   |
| 28  | feature/task-status-workflow   | Validated status transitions                      | M    | ◐   | M    | 27    | U   |
| 29  | feature/task-assignment        | Assign task to a project member                   | M    | ◐   | S    | 24,27 | C   |
| 30  | feature/task-pagination-filter | Pagination + filtering (status/assignee/priority) | L    | ○   | M    | 27    | C   |
| 31  | feature/task-sorting           | Sorting on task list                              | L    | ○   | S    | 30    | C   |

## Phase 5 — Collaboration

| #   | Branch                             | Goal                                   | Risk | Cx  | Size | Deps  | Own |
| --- | ---------------------------------- | -------------------------------------- | ---- | --- | ---- | ----- | --- |
| 32  | feature/task-comments-migration    | TaskComment model + migration          | L    | ○   | S    | 26    | C   |
| 33  | feature/task-comments-crud         | Comments CRUD                          | L    | ○   | M    | 27,32 | C   |
| 34  | feature/task-attachments-migration | TaskAttachment model + migration       | M    | ◐   | S    | 26    | C   |
| 35  | feature/task-attachments-upload    | File upload (local/S3-stub) + metadata | M    | ●   | M    | 27,34 | U   |

## Phase 6 — Cross-cutting

| #   | Branch                          | Goal                                    | Risk | Cx  | Size | Deps     | Own |
| --- | ------------------------------- | --------------------------------------- | ---- | --- | ---- | -------- | --- |
| 36  | feature/audit-log-migration     | AuditLog model + migration              | M    | ◐   | S    | 08       | C   |
| 37  | feature/audit-log-interceptor   | Interceptor capturing mutations         | M    | ●   | M    | 07,36    | U   |
| 38  | feature/notifications-migration | Notification model + migration          | L    | ○   | S    | 08       | C   |
| 39  | feature/notifications-service   | Create/list/mark-read                   | L    | ○   | M    | 38       | C   |
| 40  | feature/notifications-events    | Emit on assign/comment via EventEmitter | M    | ●   | M    | 29,33,39 | U   |

## Phase 7 — Query features

| #   | Branch                        | Goal                                        | Risk | Cx  | Size | Deps  | Own |
| --- | ----------------------------- | ------------------------------------------- | ---- | --- | ---- | ----- | --- |
| 41  | feature/search-basic          | Search across tasks/projects (ILIKE)        | M    | ◐   | M    | 22,27 | C   |
| 42  | feature/reports-summary       | Project summary (counts by status/assignee) | M    | ◐   | M    | 27    | C   |
| 43  | feature/reports-user-activity | User activity report                        | L    | ○   | M    | 36,42 | C   |

## Phase 8 — Hardening & optimization (rich Medium/High samples)

| #   | Branch                           | Goal                                           | Risk  | Cx  | Size | Deps  | Own |
| --- | -------------------------------- | ---------------------------------------------- | ----- | --- | ---- | ----- | --- |
| 44  | refactor/task-service            | Split task service into use-case services      | M     | ●   | M    | 27–31 | U   |
| 45  | performance/search-index         | GIN/tsvector full-text index + migration       | M→H   | ●   | M    | 41    | U   |
| 46  | performance/caching              | cache-manager/Redis on reports+search          | M     | ◐   | M    | 41,42 | C   |
| 47  | performance/query-optimization   | Kill N+1, narrow selects on task list          | M     | ◐   | M    | 30    | U   |
| 48  | security/refresh-token-hardening | Reuse detection + token-family invalidation    | **H** | ●   | M    | 13    | U   |
| 49  | security/rate-limiting           | Throttler on auth endpoints                    | M     | ◐   | S    | 12    | C   |
| 50  | refactor/permission-system       | Redesign to `resource:action` + data migration | **H** | ●   | L    | 19,25 | U   |
| 51  | bugfix/task-filter               | Fix combined/null-assignee filter edge case    | L     | ○   | S    | 30    | C   |

## Phase 9 — Test / CI readiness (LLM stage added later)

| #   | Branch                  | Goal                                      | Risk | Cx  | Size | Deps     | Own |
| --- | ----------------------- | ----------------------------------------- | ---- | --- | ---- | -------- | --- |
| 52  | feature/e2e-tests       | Supertest e2e for auth + tasks            | M    | ◐   | M    | broad    | C   |
| 53  | feature/coverage-config | Jest coverage thresholds                  | L    | ○   | S    | 01       | C   |
| 54  | feature/eslint-strict   | Stricter lint ruleset                     | L    | ○   | S    | 01       | C   |
| 55  | ci/github-actions-build | GH Actions build + test workflow          | M    | ◐   | M    | 01,52,53 | C   |
| 56  | ci/sonarqube-config     | `sonar-project.properties` + scanner step | L    | ○   | S    | 55       | C   |
| 57  | ci/security-scan        | Dependency/audit scan step                | L    | ○   | S    | 55       | C   |

> The **LLM Risk Assessment** stage is intentionally _out of this backlog_ — it is the thesis
> instrument added on top of PR-55/57 once the development history exists.

## To implement

Additional things not listed originally in backlog. It includes bugfixes or glossed over things

| #   | Branch                       | Goal                                               | Risk | Cx  | Size | Deps | Own |
| --- | ---------------------------- | -------------------------------------------------- | ---- | --- | ---- | ---- | --- |
| 58  | feature/create-refresh-token | Create a migration for refresh token               | L    | ○   | S    | 13   | U   |
| 59  | feature/add-default-role     | Add default role                                   | M    | ○   | S    |      | U   |
| 60  | fix-package-discrepancy      | Make the package.json and package-lock.json synced | L    | ◐   | L    |      | U   |
|     |                              |                                                    |      | ◐   |      |      | U   |
|     |                              |                                                    |      | ○   |      |      | U   |
|     |                              |                                                    |      | ○   |      |      | U   |

## Dependency structure

- **Critical spine:** 01 → 02 → 03 → (07, 08). Everything hangs off Prisma + base entities.
- **Auth chain:** 08 → 09 → 10 → 11 → 12 → 13 (strictly sequential; 12/13 are the High-risk core).
- **Authz chain:** (12, 16) → 18 → 19 → 25 — guards layer on auth and are reused by projects.
- **Tasks:** 25 & 26 gate 27; the rest of Phases 4–7 fan out from 27.
- **Phase 8 is deliberately late** so refactors/optimizations act on real, exercised code —
  producing authentic Medium/High diffs (e.g. 50 touches migrations + guards + multiple modules
  at once = a textbook High-risk PR even if tests pass).
- **Parallelizable once foundation lands:** roles (16–20), projects (21–24), and migration-only
  PRs can proceed on independent branches.
