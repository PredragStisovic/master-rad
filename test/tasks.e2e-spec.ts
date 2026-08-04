import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
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

  const adminEmail = 'e2e.tasks.admin@example.com';
  const adminPassword = 'S3cretPassw0rd';

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

    await prisma.user.deleteMany({ where: { email: adminEmail } });
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
  });

  beforeEach(async () => {
    await prisma.task.deleteMany({ where: { projectId } });
  });

  afterAll(async () => {
    await prisma.task.deleteMany({ where: { projectId } });
    await prisma.project.deleteMany({ where: { id: projectId } });
    await prisma.user.deleteMany({ where: { email: adminEmail } });
    await prisma.role.deleteMany({ where: { id: roleId } });
    await prisma.$disconnect();
    await app.close();
  });

  const createTask = async (): Promise<TaskEntity> => {
    const response = await request(app.getHttpServer())
      .post(`/projects/${projectId}/tasks`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send(payload)
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

    const tasks = unwrap<TaskEntity[]>(response);

    expect(tasks).toHaveLength(1);
    expect(tasks[0].title).toBe(payload.title);
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
