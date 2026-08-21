# Semantičke kategorije po PR-u

Radna tabela za §2 i §5 [`METHODOLOGY.md`](METHODOLOGY.md). Jedan red po realizovanom
Pull Request-u. **Kolona `Kategorija` se popunjava ručno** — po _suštini promene_, ne po
prefiksu grane (`feature/auth-login-jwt` je **Security**, ne Feature).

Status: **popunjeno svih 60 redova**.

Dozvoljene vrednosti (tačno jedna po PR-u):

`Feature` · `Bug fix` · `Refactoring` · `Performance` · `Security` · `DB migration` · `Infrastructure / CI`

Kolona `Rizik` je **pre-registrovani ključ** iz [`BACKLOG.md`](BACKLOG.md) — ne menjati je ovde.
Kolona `Signali` je samo mehanički trag (koje su datoteke dirane), kao podsetnik — nije predlog kategorije.

| PR | Grana | BL# | Rizik | Signali | Kategorija |
| ---: | --- | ---: | :---: | --- | --- |
| 1 | `feature/config-module` | 2 | L | — | Infrastructure / CI |
| 2 | `feature/prisma-setup` | 3 | M | — | DB migration |
| 3 | `feature/docker-compose` | 4 | L | — | Infrastructure / CI |
| 4 | `feature/health-check` | 5 | L | — | Infrastructure / CI |
| 5 | `feature/swagger-setup` | 6 | L | — | Infrastructure / CI |
| 6 | `feature/common-module` | 7 | M | — | Feature |
| 7 | `feature/base-entities-migration` | 8 | M | migration, authz | DB migration |
| 8 | `feature/users-crud` | 9 | L | — | Feature |
| 9 | `feature/password-hashing` | 10 | M | — | Security |
| 10 | `feature/registration-endpoint` | 11 | M | authz | Feature |
| 11 | `feature/auth-login-jwt` | 12 | H | authz | Security |
| 12 | `feature/auth-refesh-token` | 13 | H | authz | Security |
| 13+14 | `fix-package-discrepancy` | 60 | L | — | Bug fix |
| 15 | `feature/add-default-role` | 59 | M | authz | DB migration |
| 16 | `ci/track-prisma-config` | 61 | L | — | Infrastructure / CI |
| 17 | `bugfix/jwt-strategy-wiring` | 62 | M | authz, ci | Bug fix |
| 18 | `feature/create-refresh-token` | 58 | H | migration | DB migration |
| 19 | `feature/current-user-decorator` | 14 | L | authz | Feature |
| 20 | `feature/logout-token-revocation` | 15 | M | authz | Refactoring |
| 21 | `feature/roles-crud` | 16 | L | authz | Feature |
| 22 | `feature/permissions-seed` | 17 | M | authz | DB migration |
| 23 | `feature/roles-guard` | 18 | H | authz | Security |
| 24 | `feature/permissions-guard` | 19 | H | authz | Security |
| 25 | `feature/adding-auth-guards-and-authorization` | 63 | M | authz | Refactoring |
| 26 | `fix/logic-for-permission-guard-and-e2e-tests` | 64 | M | authz | Bug fix |
| 27 | `feature/assign-roles-to-users` | 20 | M | — | Feature |
| 28 | `feature/projects-crud` | 22 | L | authz | Feature |
| 29 | `feature/projects-migration` | 21 | M | migration | DB migration |
| 30 | `feature/project-members-migration` | 23 | M | migration | DB migration |
| 31 | `feature/project-members-crud` | 24 | M | — | Feature |
| 32 | `feature/project-access-guard` | 25 | H | authz | Security |
| 33 | `feature/coverage-config` | 53 | L | ci | Infrastructure / CI |
| 34 | `ci/sonarqube-config` | 56 | L | ci | Infrastructure / CI |
| 35 | `feature/tasks-migration` | 26 | M | migration | DB migration |
| 36 | `feature/tasks-crud` | 27 | M | authz | Feature |
| 37 | `feature/task-status-workflow` | 28 | M | authz | Feature |
| 38 | `feature/task-assignment` | 29 | M | migration | Feature |
| 39 | `feature/task-pagination-filter` | 30 | L | — | Feature |
| 40 | `feature/task-sorting` | 31 | L | — | Feature |
| 41 | `ci/sonar-coverage-exclusions` | 65 | L | ci | Infrastructure / CI |
| 42 | `feature/task-comments-migration` | 32 | L | migration | DB migration |
| 43 | `feature/task-comments-crud` | 33 | L | authz | Feature |
| 44 | `feature/task-attachments-migration` | 34 | M | migration | DB migration |
| 45 | `fix/run-prisma-format` | 66 | L | — | Bug fix |
| 46 | `feature/task-attachments-upload` | 35 | M | — | Feature |
| 47 | `feature/audit-log-migration` | 36 | M | migration | DB migration |
| 48 | `feature/audit-log-interceptor` | 37 | M | authz | Feature |
| 49 | `feature/notifications-migration` | 38 | L | migration | DB migration |
| 50 | `feature/notifications-service` | 39 | L | authz | Feature |
| 51 | `feature/notifications-events` | 40 | M | — | Feature |
| 52 | `feature/search-basic` | 41 | M | — | Feature |
| 53 | `feature/reports-summary` | 42 | M | — | Feature |
| 54 | `feature/reports-user-activity` | 43 | L | authz | Feature |
| 55 | `refactor/task-scope-guards` | 44 | M | ci | Refactoring |
| 56 | `performance/search-index` | 45 | H | migration | DB migration |
| 57 | `performance/caching` | 46 | M | — | Performance |
| 58 | `performance/query-optimization` | 47 | M | migration | DB migration |
| 59 | `security/refresh-token-hardening` | 48 | H | migration, authz | Security |
| 60 | `security/rate-limiting` | 49 | M | authz | Security |
| 61 | `bugfix/task-filter` | 51 | L | — | Bug fix |

## Zbir

| Kategorija | Ciljni broj (≈) | Realizovano | Razlika |
| --- | ---: | ---: | ---: |
| Feature | 22 | 21 | −1 |
| DB migration | 8 | 14 | +6 |
| Security | 8 | 8 | 0 |
| Infrastructure / CI | 12 | 8 | −4 |
| Bug fix | 10 | 5 | −5 |
| Refactoring | 8 | 3 | −5 |
| Performance | 5 | 1 | −4 |
| **Ukupno** | **~73** | **60** | **−13** |

