import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PaginatedResult } from './../src/common/dto/pagination.dto';
import { ProjectEntity } from './../src/modules/projects/entities/project.entity';
import { TaskEntity } from './../src/modules/tasks/entities/task.entity';
import { PrismaService } from './../src/prisma/prisma.service';

/** Unwraps the envelope added by the global `TransformInterceptor`. */
const unwrap = <T>(response: { body: unknown }): T =>
  (response.body as { data: T }).data;

describe('TasksController (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let roleId: number;
  let accessToken: string;
  let projectId: number;
  let memberId: number;
  let outsiderId: number;

  const adminEmail = 'e2e.tasks.admin@example.com';
  const adminPassword = 'S3cretPassw0rd';
  const memberEmail = 'e2e.tasks.member@example.com';
  const outsiderEmail = 'e2e.tasks.outsider@example.com';

  const payload = {
    title: 'E2e task',
    description: 'Created by the e2e suite',
  };

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

    const role = await prisma.role.upsert({
      where: { name: 'e2e-tasks-role' },
      create: { name: 'e2e-tasks-role' },
      update: {},
    });
    roleId = role.id;

    await prisma.role.update({
      where: { id: roleId },
      data: {
        permissions: {
          connectOrCreate: [
            'projects:create',
            'tasks:read',
            'tasks:create',
            'tasks:update',
            'tasks:delete',
          ].map((name) => ({ where: { name }, create: { name } })),
        },
      },
    });

    await prisma.user.deleteMany({
      where: { email: { in: [adminEmail, memberEmail, outsiderEmail] } },
    });
    await request(app.getHttpServer())
      .post('/users')
      .send({
        email: adminEmail,
        password: adminPassword,
        firstName: 'Admin',
        lastName: 'E2e',
        roleId,
      })
      .expect(201);

    const memberResponse = await request(app.getHttpServer())
      .post('/users')
      .send({
        email: memberEmail,
        password: adminPassword,
        firstName: 'Member',
        lastName: 'E2e',
        roleId,
      })
      .expect(201);

    memberId = unwrap<{ id: number }>(memberResponse).id;

    const outsiderResponse = await request(app.getHttpServer())
      .post('/users')
      .send({
        email: outsiderEmail,
        password: adminPassword,
        firstName: 'Outsider',
        lastName: 'E2e',
        roleId,
      })
      .expect(201);

    outsiderId = unwrap<{ id: number }>(outsiderResponse).id;

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: adminEmail, password: adminPassword })
      .expect(201);

    accessToken = unwrap<{ access_token: string }>(loginResponse).access_token;

    const projectResponse = await request(app.getHttpServer())
      .post('/projects')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'E2e tasks project' })
      .expect(201);

    projectId = unwrap<ProjectEntity>(projectResponse).id;

    await prisma.projectMember.create({
      data: { projectId, userId: memberId },
    });
  });

  beforeEach(async () => {
    await prisma.task.deleteMany({ where: { projectId } });
  });

  afterAll(async () => {
    await prisma.task.deleteMany({ where: { projectId } });
    await prisma.project.deleteMany({ where: { id: projectId } });
    await prisma.user.deleteMany({
      where: { email: { in: [adminEmail, memberEmail, outsiderEmail] } },
    });
    await prisma.role.deleteMany({ where: { id: roleId } });
    await prisma.$disconnect();
    await app.close();
  });

  const createTask = async (
    overrides: Record<string, unknown> = {},
  ): Promise<TaskEntity> => {
    const response = await request(app.getHttpServer())
      .post(`/projects/${projectId}/tasks`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ ...payload, ...overrides })
      .expect(201);

    return unwrap<TaskEntity>(response);
  };

  it('POST /projects/:projectId/tasks creates a task with the default status and priority', async () => {
    const created = await createTask();

    expect(created).toEqual({
      id: expect.any(Number) as unknown,
      title: payload.title,
      description: payload.description,
      status: 'TODO',
      priority: 'MEDIUM',
      projectId,
      assigneeId: null,
      createdAt: expect.any(String) as unknown,
      updatedAt: expect.any(String) as unknown,
    });
  });

  it('POST /projects/:projectId/tasks rejects an invalid payload', async () => {
    const response = await request(app.getHttpServer())
      .post(`/projects/${projectId}/tasks`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: '', priority: 'URGENT' });

    expect(response.status).toBe(400);
  });

  it('POST /projects/:projectId/tasks requires authentication', async () => {
    const response = await request(app.getHttpServer())
      .post(`/projects/${projectId}/tasks`)
      .send(payload);

    expect(response.status).toBe(401);
  });

  it('GET /projects/:projectId/tasks lists the tasks of the project', async () => {
    await createTask();

    const response = await request(app.getHttpServer())
      .get(`/projects/${projectId}/tasks`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const page = unwrap<PaginatedResult<TaskEntity>>(response);

    expect(page.data).toHaveLength(1);
    expect(page.data[0].title).toBe(payload.title);
    expect(page.meta).toEqual({
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    });
  });

  it('GET /projects/:projectId/tasks paginates the list', async () => {
    await Promise.all([createTask(), createTask(), createTask()]);

    const response = await request(app.getHttpServer())
      .get(`/projects/${projectId}/tasks?page=2&limit=2`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const page = unwrap<PaginatedResult<TaskEntity>>(response);

    expect(page.data).toHaveLength(1);
    expect(page.meta).toEqual({
      total: 3,
      page: 2,
      limit: 2,
      totalPages: 2,
    });
  });

  it('GET /projects/:projectId/tasks filters by status and priority', async () => {
    const kept = await createTask();
    await createTask();

    await request(app.getHttpServer())
      .patch(`/projects/${projectId}/tasks/${kept.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ status: 'DONE', priority: 'HIGH' })
      .expect(200);

    const response = await request(app.getHttpServer())
      .get(`/projects/${projectId}/tasks?status=DONE&priority=HIGH`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const page = unwrap<PaginatedResult<TaskEntity>>(response);

    expect(page.data.map((task) => task.id)).toEqual([kept.id]);
    expect(page.meta.total).toBe(1);
  });

  it('GET /projects/:projectId/tasks filters by assignee', async () => {
    const assigned = await createTask();
    await createTask();

    await request(app.getHttpServer())
      .patch(`/projects/${projectId}/tasks/${assigned.id}/assignee`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ assigneeId: memberId })
      .expect(200);

    const response = await request(app.getHttpServer())
      .get(`/projects/${projectId}/tasks?assigneeId=${memberId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const page = unwrap<PaginatedResult<TaskEntity>>(response);

    expect(page.data.map((task) => task.id)).toEqual([assigned.id]);
    expect(page.meta.total).toBe(1);
  });

  it('GET /projects/:projectId/tasks sorts by the requested column and direction', async () => {
    await createTask({ title: 'Bravo' });
    await createTask({ title: 'Alpha' });
    await createTask({ title: 'Charlie' });

    const response = await request(app.getHttpServer())
      .get(`/projects/${projectId}/tasks?sortBy=title&sortOrder=desc`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const page = unwrap<PaginatedResult<TaskEntity>>(response);

    expect(page.data.map((task) => task.title)).toEqual([
      'Charlie',
      'Bravo',
      'Alpha',
    ]);
  });

  it('GET /projects/:projectId/tasks keeps the sort stable across pages', async () => {
    await createTask({ priority: 'HIGH' });
    await createTask({ priority: 'HIGH' });
    await createTask({ priority: 'LOW' });

    const query = `sortBy=priority&sortOrder=asc&limit=2`;

    const firstPage = await request(app.getHttpServer())
      .get(`/projects/${projectId}/tasks?${query}&page=1`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const secondPage = await request(app.getHttpServer())
      .get(`/projects/${projectId}/tasks?${query}&page=2`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const ids = [
      ...unwrap<PaginatedResult<TaskEntity>>(firstPage).data,
      ...unwrap<PaginatedResult<TaskEntity>>(secondPage).data,
    ].map((task) => task.id);

    expect(new Set(ids).size).toBe(3);
  });

  it('GET /projects/:projectId/tasks rejects a column outside the sort allow-list', async () => {
    const response = await request(app.getHttpServer())
      .get(`/projects/${projectId}/tasks?sortBy=description`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(400);
  });

  it('GET /projects/:projectId/tasks rejects an unknown status filter', async () => {
    const response = await request(app.getHttpServer())
      .get(`/projects/${projectId}/tasks?status=ARCHIVED`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(400);
  });

  it('GET /projects/:projectId/tasks/:id returns the task', async () => {
    const created = await createTask();

    const response = await request(app.getHttpServer())
      .get(`/projects/${projectId}/tasks/${created.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(unwrap<TaskEntity>(response).id).toBe(created.id);
  });

  it('GET /projects/:projectId/tasks/:id returns 404 for an unknown task', async () => {
    const response = await request(app.getHttpServer())
      .get(`/projects/${projectId}/tasks/0`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(404);
  });

  it('PATCH /projects/:projectId/tasks/:id updates the task', async () => {
    const created = await createTask();

    const response = await request(app.getHttpServer())
      .patch(`/projects/${projectId}/tasks/${created.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ status: 'IN_PROGRESS', priority: 'HIGH' })
      .expect(200);

    const updated = unwrap<TaskEntity>(response);

    expect(updated.status).toBe('IN_PROGRESS');
    expect(updated.priority).toBe('HIGH');
  });

  it('PATCH /projects/:projectId/tasks/:id/assignee assigns the task to a project member', async () => {
    const created = await createTask();

    const response = await request(app.getHttpServer())
      .patch(`/projects/${projectId}/tasks/${created.id}/assignee`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ assigneeId: memberId })
      .expect(200);

    expect(unwrap<TaskEntity>(response).assigneeId).toBe(memberId);
  });

  it('PATCH /projects/:projectId/tasks/:id/assignee rejects a user outside the project', async () => {
    const created = await createTask();

    const response = await request(app.getHttpServer())
      .patch(`/projects/${projectId}/tasks/${created.id}/assignee`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ assigneeId: outsiderId });

    expect(response.status).toBe(400);
  });

  it('PATCH /projects/:projectId/tasks/:id/assignee returns 404 for an unknown task', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/projects/${projectId}/tasks/0/assignee`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ assigneeId: memberId });

    expect(response.status).toBe(404);
  });

  it('DELETE /projects/:projectId/tasks/:id/assignee clears the assignee', async () => {
    const created = await createTask();

    await request(app.getHttpServer())
      .patch(`/projects/${projectId}/tasks/${created.id}/assignee`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ assigneeId: memberId })
      .expect(200);

    const response = await request(app.getHttpServer())
      .delete(`/projects/${projectId}/tasks/${created.id}/assignee`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(unwrap<TaskEntity>(response).assigneeId).toBeNull();
  });

  it('DELETE /projects/:projectId/tasks/:id removes the task', async () => {
    const created = await createTask();

    const deletion = await request(app.getHttpServer())
      .delete(`/projects/${projectId}/tasks/${created.id}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(deletion.status).toBe(200);

    const lookup = await request(app.getHttpServer())
      .get(`/projects/${projectId}/tasks/${created.id}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(lookup.status).toBe(404);
  });
});
