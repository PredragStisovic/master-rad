import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { ProjectEntity } from './../src/modules/projects/entities/project.entity';
import { TaskCommentEntity } from './../src/modules/task-comments/entities/task-comment.entity';
import { TaskEntity } from './../src/modules/tasks/entities/task.entity';
import { PrismaService } from './../src/prisma/prisma.service';

/** Unwraps the envelope added by the global `TransformInterceptor`. */
const unwrap = <T>(response: { body: unknown }): T =>
  (response.body as { data: T }).data;

describe('TaskCommentsController (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let roleId: number;
  let accessToken: string;
  let memberToken: string;
  let projectId: number;
  let taskId: number;
  let otherTaskId: number;
  let authorId: number;

  const authorEmail = 'e2e.comments.author@example.com';
  const password = 'S3cretPassw0rd';
  const memberEmail = 'e2e.comments.member@example.com';

  const payload = { body: 'Looks good, one nit on the migration name.' };

  const createUser = async (email: string): Promise<number> => {
    const response = await request(app.getHttpServer())
      .post('/users')
      .send({
        email,
        password,
        firstName: 'Comment',
        lastName: 'E2e',
        roleId,
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

  const createTask = async (title: string): Promise<number> => {
    const response = await request(app.getHttpServer())
      .post(`/projects/${projectId}/tasks`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title })
      .expect(201);

    return unwrap<TaskEntity>(response).id;
  };

  const createComment = async (
    token = accessToken,
    body = payload.body,
  ): Promise<TaskCommentEntity> => {
    const response = await request(app.getHttpServer())
      .post(`/projects/${projectId}/tasks/${taskId}/comments`)
      .set('Authorization', `Bearer ${token}`)
      .send({ body })
      .expect(201);

    return unwrap<TaskCommentEntity>(response);
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
      where: { name: 'e2e-comments-role' },
      create: { name: 'e2e-comments-role' },
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
            'comments:read',
            'comments:create',
            'comments:update',
            'comments:delete',
          ].map((name) => ({ where: { name }, create: { name } })),
        },
      },
    });

    await prisma.user.deleteMany({
      where: { email: { in: [authorEmail, memberEmail] } },
    });

    authorId = await createUser(authorEmail);
    const memberId = await createUser(memberEmail);

    accessToken = await login(authorEmail);
    memberToken = await login(memberEmail);

    const projectResponse = await request(app.getHttpServer())
      .post('/projects')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'E2e comments project' })
      .expect(201);

    projectId = unwrap<ProjectEntity>(projectResponse).id;

    await prisma.projectMember.create({
      data: { projectId, userId: memberId },
    });

    taskId = await createTask('Commented task');
    otherTaskId = await createTask('Another task');
  });

  beforeEach(async () => {
    await prisma.taskComment.deleteMany({
      where: { taskId: { in: [taskId, otherTaskId] } },
    });
  });

  afterAll(async () => {
    await prisma.task.deleteMany({ where: { projectId } });
    await prisma.project.deleteMany({ where: { id: projectId } });
    await prisma.user.deleteMany({
      where: { email: { in: [authorEmail, memberEmail] } },
    });
    await prisma.role.deleteMany({ where: { id: roleId } });
    await prisma.$disconnect();
    await app.close();
  });

  it('POST /projects/:projectId/tasks/:taskId/comments records the caller as the author', async () => {
    const created = await createComment();

    expect(created).toEqual({
      id: expect.any(Number) as unknown,
      body: payload.body,
      taskId,
      authorId,
      createdAt: expect.any(String) as unknown,
      updatedAt: expect.any(String) as unknown,
    });
  });

  it('POST /projects/:projectId/tasks/:taskId/comments rejects an empty body', async () => {
    const response = await request(app.getHttpServer())
      .post(`/projects/${projectId}/tasks/${taskId}/comments`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ body: '' });

    expect(response.status).toBe(400);
  });

  it('POST /projects/:projectId/tasks/:taskId/comments requires authentication', async () => {
    const response = await request(app.getHttpServer())
      .post(`/projects/${projectId}/tasks/${taskId}/comments`)
      .send(payload);

    expect(response.status).toBe(401);
  });

  it('POST /projects/:projectId/tasks/:taskId/comments returns 404 for an unknown task', async () => {
    const response = await request(app.getHttpServer())
      .post(`/projects/${projectId}/tasks/0/comments`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send(payload);

    expect(response.status).toBe(404);
  });

  it('GET /projects/:projectId/tasks/:taskId/comments lists the comments oldest first', async () => {
    const first = await createComment(accessToken, 'First');
    const second = await createComment(memberToken, 'Second');

    const response = await request(app.getHttpServer())
      .get(`/projects/${projectId}/tasks/${taskId}/comments`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const comments = unwrap<TaskCommentEntity[]>(response);

    expect(comments.map((comment) => comment.id)).toEqual([
      first.id,
      second.id,
    ]);
  });

  it('GET /projects/:projectId/tasks/:taskId/comments only returns the comments of that task', async () => {
    await createComment();

    const response = await request(app.getHttpServer())
      .get(`/projects/${projectId}/tasks/${otherTaskId}/comments`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(unwrap<TaskCommentEntity[]>(response)).toEqual([]);
  });

  it('GET /projects/:projectId/tasks/:taskId/comments/:id returns the comment', async () => {
    const created = await createComment();

    const response = await request(app.getHttpServer())
      .get(`/projects/${projectId}/tasks/${taskId}/comments/${created.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(unwrap<TaskCommentEntity>(response).id).toBe(created.id);
  });

  it('GET /projects/:projectId/tasks/:taskId/comments/:id returns 404 when the comment is on another task', async () => {
    const created = await createComment();

    const response = await request(app.getHttpServer())
      .get(`/projects/${projectId}/tasks/${otherTaskId}/comments/${created.id}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(404);
  });

  it('PATCH /projects/:projectId/tasks/:taskId/comments/:id edits the author own comment', async () => {
    const created = await createComment();

    const response = await request(app.getHttpServer())
      .patch(`/projects/${projectId}/tasks/${taskId}/comments/${created.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ body: 'Edited' })
      .expect(200);

    expect(unwrap<TaskCommentEntity>(response).body).toBe('Edited');
  });

  it('PATCH /projects/:projectId/tasks/:taskId/comments/:id rejects another member', async () => {
    const created = await createComment();

    const response = await request(app.getHttpServer())
      .patch(`/projects/${projectId}/tasks/${taskId}/comments/${created.id}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ body: 'Not mine to edit' });

    expect(response.status).toBe(403);
  });

  it('DELETE /projects/:projectId/tasks/:taskId/comments/:id removes the author own comment', async () => {
    const created = await createComment();

    const deletion = await request(app.getHttpServer())
      .delete(`/projects/${projectId}/tasks/${taskId}/comments/${created.id}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(deletion.status).toBe(200);

    const lookup = await request(app.getHttpServer())
      .get(`/projects/${projectId}/tasks/${taskId}/comments/${created.id}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(lookup.status).toBe(404);
  });

  it('DELETE /projects/:projectId/tasks/:taskId/comments/:id rejects another member', async () => {
    const created = await createComment();

    const response = await request(app.getHttpServer())
      .delete(`/projects/${projectId}/tasks/${taskId}/comments/${created.id}`)
      .set('Authorization', `Bearer ${memberToken}`);

    expect(response.status).toBe(403);
  });

  it('deletes the comments of a task together with the task', async () => {
    const created = await createComment();
    const disposableTaskId = await createTask('Disposable task');

    await request(app.getHttpServer())
      .post(`/projects/${projectId}/tasks/${disposableTaskId}/comments`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send(payload)
      .expect(201);

    await prisma.task.delete({ where: { id: disposableTaskId } });

    const remaining = await prisma.taskComment.findMany({
      where: { taskId: { in: [taskId, disposableTaskId] } },
    });

    expect(remaining.map((comment) => comment.id)).toEqual([created.id]);
  });
});
