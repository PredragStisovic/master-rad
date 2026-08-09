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

/**
 * The listeners run after the emitting request has already responded, so the
 * notification lands shortly after the 200/201. Poll rather than sleep once.
 */
const waitForNotifications = async (
  read: () => Promise<{ id: number }[]>,
  expected: number,
): Promise<{ id: number }[]> => {
  for (let attempt = 0; attempt < 20; attempt++) {
    const notifications = await read();

    if (notifications.length >= expected) {
      return notifications;
    }

    await new Promise((resolve) => setTimeout(resolve, 25));
  }

  return read();
};

describe('Notification events (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let roleId: number;
  let leadToken: string;
  let memberToken: string;
  let leadId: number;
  let memberId: number;
  let projectId: number;
  let taskId: number;

  const leadEmail = 'e2e.events.lead@example.com';
  const memberEmail = 'e2e.events.member@example.com';
  const password = 'S3cretPassw0rd';

  const createUser = async (email: string): Promise<number> => {
    const response = await request(app.getHttpServer())
      .post('/users')
      .send({ email, password, firstName: 'Event', lastName: 'E2e', roleId })
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

  const assign = async (assigneeId: number, token = leadToken) => {
    await request(app.getHttpServer())
      .patch(`/projects/${projectId}/tasks/${taskId}/assignee`)
      .set('Authorization', `Bearer ${token}`)
      .send({ assigneeId })
      .expect(200);
  };

  const comment = async (token: string) => {
    await request(app.getHttpServer())
      .post(`/projects/${projectId}/tasks/${taskId}/comments`)
      .set('Authorization', `Bearer ${token}`)
      .send({ body: 'Ready for review' })
      .expect(201);
  };

  const notificationsOf = (userId: number) => () =>
    prisma.notification.findMany({ where: { userId }, orderBy: { id: 'asc' } });

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
      where: { name: 'e2e-events-role' },
      create: { name: 'e2e-events-role' },
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
            'comments:create',
            'notifications:read',
          ].map((name) => ({ where: { name }, create: { name } })),
        },
      },
    });

    await prisma.user.deleteMany({
      where: { email: { in: [leadEmail, memberEmail] } },
    });

    leadId = await createUser(leadEmail);
    memberId = await createUser(memberEmail);

    leadToken = await login(leadEmail);
    memberToken = await login(memberEmail);

    const projectResponse = await request(app.getHttpServer())
      .post('/projects')
      .set('Authorization', `Bearer ${leadToken}`)
      .send({ name: 'E2e events project' })
      .expect(201);

    projectId = unwrap<ProjectEntity>(projectResponse).id;

    await prisma.projectMember.create({
      data: { projectId, userId: memberId },
    });

    const taskResponse = await request(app.getHttpServer())
      .post(`/projects/${projectId}/tasks`)
      .set('Authorization', `Bearer ${leadToken}`)
      .send({ title: 'Wire up the interceptor' })
      .expect(201);

    taskId = unwrap<TaskEntity>(taskResponse).id;
  });

  beforeEach(async () => {
    await prisma.notification.deleteMany({
      where: { userId: { in: [leadId, memberId] } },
    });
    await prisma.taskComment.deleteMany({ where: { taskId } });
    await prisma.task.update({
      where: { id: taskId },
      data: { assigneeId: null },
    });
  });

  afterAll(async () => {
    await prisma.notification.deleteMany({
      where: { userId: { in: [leadId, memberId] } },
    });
    await prisma.task.deleteMany({ where: { projectId } });
    await prisma.project.deleteMany({ where: { id: projectId } });
    await prisma.user.deleteMany({
      where: { email: { in: [leadEmail, memberEmail] } },
    });
    await prisma.role.deleteMany({ where: { id: roleId } });
    await prisma.$disconnect();
    await app.close();
  });

  it('notifies the assignee when somebody else assigns them a task', async () => {
    await assign(memberId);

    const [notification] = await waitForNotifications(
      notificationsOf(memberId),
      1,
    );

    expect(notification).toMatchObject({
      type: 'TASK_ASSIGNED',
      message: 'You were assigned to "Wire up the interceptor"',
      userId: memberId,
      taskId,
      readAt: null,
    });
  });

  it('notifies nobody when a member assigns the task to themselves', async () => {
    await assign(memberId, memberToken);
    await waitForNotifications(notificationsOf(memberId), 1);

    expect(await notificationsOf(memberId)()).toEqual([]);
  });

  it('notifies the assignee when another member comments on their task', async () => {
    await assign(memberId);
    await waitForNotifications(notificationsOf(memberId), 1);
    await comment(leadToken);

    const notifications = await waitForNotifications(
      notificationsOf(memberId),
      2,
    );

    expect(notifications[1]).toMatchObject({
      type: 'TASK_COMMENTED',
      message: 'New comment on "Wire up the interceptor"',
      userId: memberId,
      taskId,
    });
  });

  it('notifies nobody when the assignee comments on their own task', async () => {
    await assign(memberId);
    const afterAssign = await waitForNotifications(
      notificationsOf(memberId),
      1,
    );
    await comment(memberToken);
    await waitForNotifications(notificationsOf(memberId), 2);

    expect(await notificationsOf(memberId)()).toEqual(afterAssign);
  });

  it('notifies nobody when the commented task has no assignee', async () => {
    await comment(leadToken);
    await waitForNotifications(notificationsOf(leadId), 1);

    expect(await notificationsOf(leadId)()).toEqual([]);
  });
});
