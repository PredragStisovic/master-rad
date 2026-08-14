import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { Cache } from 'cache-manager';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { ProjectEntity } from './../src/modules/projects/entities/project.entity';
import { ProjectSummaryEntity } from './../src/modules/reports/entities/project-summary.entity';
import { TaskEntity } from './../src/modules/tasks/entities/task.entity';
import { PrismaService } from './../src/prisma/prisma.service';

/** Unwraps the envelope added by the global `TransformInterceptor`. */
const unwrap = <T>(response: { body: unknown }): T =>
  (response.body as { data: T }).data;

describe('ReportsController (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let cache: Cache;
  let roleId: number;
  let blindRoleId: number;
  let ownerToken: string;
  let memberToken: string;
  let outsiderToken: string;
  let blindToken: string;
  let memberId: number;
  let blindId: number;
  let projectId: number;
  let emptyProjectId: number;

  const password = 'S3cretPassw0rd';
  const ownerEmail = 'e2e.reports.owner@example.com';
  const memberEmail = 'e2e.reports.member@example.com';
  const outsiderEmail = 'e2e.reports.outsider@example.com';
  const blindEmail = 'e2e.reports.blind@example.com';
  const emails = [ownerEmail, memberEmail, outsiderEmail, blindEmail];

  const createUser = async (email: string, role: number): Promise<number> => {
    const response = await request(app.getHttpServer())
      .post('/users')
      .send({
        email,
        password,
        firstName: 'Reports',
        lastName: 'E2e',
        roleId: role,
      })
      .expect(201);

    return unwrap<{ id: number }>(response).id;
  };

  const login = async (email: string): Promise<string> => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(201);

    return unwrap<{ access_token: string }>(response).access_token;
  };

  const createProject = async (name: string): Promise<number> => {
    const response = await request(app.getHttpServer())
      .post('/projects')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name })
      .expect(201);

    return unwrap<ProjectEntity>(response).id;
  };

  const createTask = async (
    payload: Record<string, unknown>,
  ): Promise<TaskEntity> => {
    const response = await request(app.getHttpServer())
      .post(`/projects/${projectId}/tasks`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ title: 'E2e reports task', ...payload })
      .expect(201);

    return unwrap<TaskEntity>(response);
  };

  const summaryOf = async (token: string, project: number) =>
    request(app.getHttpServer())
      .get(`/projects/${project}/reports/summary`)
      .set('Authorization', `Bearer ${token}`);

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();

    prisma = app.get(PrismaService);
    cache = app.get(CACHE_MANAGER);

    const role = await prisma.role.upsert({
      where: { name: 'e2e-reports-role' },
      create: { name: 'e2e-reports-role' },
      update: {},
    });
    roleId = role.id;

    await prisma.role.update({
      where: { id: roleId },
      data: {
        permissions: {
          connectOrCreate: [
            'projects:create',
            'projects:read',
            'tasks:read',
            'tasks:create',
            'tasks:update',
          ].map((name) => ({ where: { name }, create: { name } })),
        },
      },
    });

    // A project member who may not read tasks, and so may not read the counts.
    const blindRole = await prisma.role.upsert({
      where: { name: 'e2e-reports-blind-role' },
      create: { name: 'e2e-reports-blind-role' },
      update: {},
    });
    blindRoleId = blindRole.id;

    await prisma.role.update({
      where: { id: blindRoleId },
      data: {
        permissions: {
          connectOrCreate: ['projects:read'].map((name) => ({
            where: { name },
            create: { name },
          })),
        },
      },
    });

    await prisma.user.deleteMany({ where: { email: { in: emails } } });

    await createUser(ownerEmail, roleId);
    memberId = await createUser(memberEmail, roleId);
    await createUser(outsiderEmail, roleId);
    blindId = await createUser(blindEmail, blindRoleId);

    ownerToken = await login(ownerEmail);
    memberToken = await login(memberEmail);
    outsiderToken = await login(outsiderEmail);
    blindToken = await login(blindEmail);

    projectId = await createProject('E2e reports project');
    emptyProjectId = await createProject('E2e reports empty project');

    await prisma.projectMember.createMany({
      data: [
        { projectId, userId: memberId },
        { projectId, userId: blindId },
      ],
    });
  });

  // The summary is cached with no write-through invalidation, so a test that
  // rebuilds the project's tasks would otherwise read the previous test's
  // numbers. Clearing keeps each case about the aggregation, not the TTL —
  // the caching itself is asserted on its own below.
  beforeEach(async () => {
    await prisma.task.deleteMany({ where: { projectId } });
    await cache.clear();
  });

  afterAll(async () => {
    await prisma.project.deleteMany({
      where: { id: { in: [projectId, emptyProjectId] } },
    });
    await prisma.user.deleteMany({ where: { email: { in: emails } } });
    await prisma.role.deleteMany({
      where: { id: { in: [roleId, blindRoleId] } },
    });
    await prisma.$disconnect();
    await app.close();
  });

  it('GET summary counts the project’s tasks by status', async () => {
    await createTask({});
    await createTask({});
    const inProgress = await createTask({});

    await request(app.getHttpServer())
      .patch(`/projects/${projectId}/tasks/${inProgress.id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ status: 'IN_PROGRESS' })
      .expect(200);

    const response = await summaryOf(ownerToken, projectId);
    const summary = unwrap<ProjectSummaryEntity>(response);

    expect(response.status).toBe(200);
    expect(summary.totalTasks).toBe(3);
    expect(summary.byStatus).toEqual({
      TODO: 2,
      IN_PROGRESS: 1,
      IN_REVIEW: 0,
      DONE: 0,
    });
  });

  it('GET summary counts by assignee, unassigned last', async () => {
    const assigned = await createTask({});
    await createTask({});

    await request(app.getHttpServer())
      .patch(`/projects/${projectId}/tasks/${assigned.id}/assignee`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ assigneeId: memberId })
      .expect(200);

    const response = await summaryOf(ownerToken, projectId);

    expect(response.status).toBe(200);
    expect(unwrap<ProjectSummaryEntity>(response).byAssignee).toEqual([
      { assigneeId: memberId, count: 1 },
      { assigneeId: null, count: 1 },
    ]);
  });

  it('GET summary reports an empty project as zeroes', async () => {
    const response = await summaryOf(ownerToken, emptyProjectId);
    const summary = unwrap<ProjectSummaryEntity>(response);

    expect(response.status).toBe(200);
    expect(summary).toEqual({
      projectId: emptyProjectId,
      totalTasks: 0,
      byStatus: { TODO: 0, IN_PROGRESS: 0, IN_REVIEW: 0, DONE: 0 },
      byAssignee: [],
    });
  });

  it('GET summary counts only the project it was asked about', async () => {
    await createTask({});

    const response = await summaryOf(ownerToken, emptyProjectId);

    expect(response.status).toBe(200);
    expect(unwrap<ProjectSummaryEntity>(response).totalTasks).toBe(0);
  });

  it('GET summary is readable by a plain project member', async () => {
    await createTask({});

    const response = await summaryOf(memberToken, projectId);

    expect(response.status).toBe(200);
    expect(unwrap<ProjectSummaryEntity>(response).totalTasks).toBe(1);
  });

  it('GET summary serves a repeat read from cache', async () => {
    await createTask({});
    await summaryOf(ownerToken, projectId);

    // Written after the summary was cached, so it must not show up until the
    // entry expires — this endpoint trades freshness for the two aggregates.
    await createTask({});
    const cached = await summaryOf(ownerToken, projectId);

    expect(cached.status).toBe(200);
    expect(unwrap<ProjectSummaryEntity>(cached).totalTasks).toBe(1);

    await cache.clear();
    const fresh = await summaryOf(ownerToken, projectId);

    expect(unwrap<ProjectSummaryEntity>(fresh).totalTasks).toBe(2);
  });

  it('GET summary caches each project separately', async () => {
    await createTask({});
    await summaryOf(ownerToken, projectId);

    const other = await summaryOf(ownerToken, emptyProjectId);

    expect(other.status).toBe(200);
    expect(unwrap<ProjectSummaryEntity>(other).projectId).toBe(emptyProjectId);
    expect(unwrap<ProjectSummaryEntity>(other).totalTasks).toBe(0);
  });

  it('GET summary is forbidden for a non-member', async () => {
    const response = await summaryOf(outsiderToken, projectId);

    expect(response.status).toBe(403);
  });

  it('GET summary is forbidden for a member without tasks:read', async () => {
    const response = await summaryOf(blindToken, projectId);

    expect(response.status).toBe(403);
  });

  it('GET summary 404s on an unknown project', async () => {
    const response = await summaryOf(ownerToken, 999999);

    expect(response.status).toBe(404);
  });

  it('GET summary rejects an anonymous caller', async () => {
    const response = await request(app.getHttpServer()).get(
      `/projects/${projectId}/reports/summary`,
    );

    expect(response.status).toBe(401);
  });
});
