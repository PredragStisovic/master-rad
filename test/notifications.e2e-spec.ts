import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PaginatedResult } from './../src/common/dto/pagination.dto';
import { NotificationEntity } from './../src/modules/notifications/entities/notification.entity';
import { PrismaService } from './../src/prisma/prisma.service';

/** Unwraps the envelope added by the global `TransformInterceptor`. */
const unwrap = <T>(response: { body: unknown }): T =>
  (response.body as { data: T }).data;

describe('NotificationsController (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let roleId: number;
  let readerRoleId: number;
  let accessToken: string;
  let readerToken: string;
  let ownerId: number;
  let readerId: number;

  const ownerEmail = 'e2e.notifications.owner@example.com';
  const readerEmail = 'e2e.notifications.reader@example.com';
  const password = 'S3cretPassw0rd';

  const message = 'You were assigned to "Wire up the interceptor"';

  const createUser = async (email: string, role: number): Promise<number> => {
    const response = await request(app.getHttpServer())
      .post('/users')
      .send({
        email,
        password,
        firstName: 'Notification',
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

  const createNotification = async (
    userId = ownerId,
  ): Promise<NotificationEntity> => {
    const response = await request(app.getHttpServer())
      .post('/notifications')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ type: 'TASK_ASSIGNED', message, userId })
      .expect(201);

    return unwrap<NotificationEntity>(response);
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
      where: { name: 'e2e-notifications-role' },
      create: { name: 'e2e-notifications-role' },
      update: {},
    });
    roleId = role.id;

    await prisma.role.update({
      where: { id: roleId },
      data: {
        permissions: {
          connectOrCreate: [
            'notifications:read',
            'notifications:create',
            'notifications:update',
          ].map((name) => ({ where: { name }, create: { name } })),
        },
      },
    });

    // A role without `notifications:create`, mirroring the default `user`.
    const readerRole = await prisma.role.upsert({
      where: { name: 'e2e-notifications-reader-role' },
      create: { name: 'e2e-notifications-reader-role' },
      update: {},
    });
    readerRoleId = readerRole.id;

    await prisma.role.update({
      where: { id: readerRoleId },
      data: {
        permissions: {
          connectOrCreate: ['notifications:read', 'notifications:update'].map(
            (name) => ({ where: { name }, create: { name } }),
          ),
        },
      },
    });

    await prisma.user.deleteMany({
      where: { email: { in: [ownerEmail, readerEmail] } },
    });

    ownerId = await createUser(ownerEmail, roleId);
    readerId = await createUser(readerEmail, readerRoleId);

    accessToken = await login(ownerEmail);
    readerToken = await login(readerEmail);
  });

  beforeEach(async () => {
    await prisma.notification.deleteMany({
      where: { userId: { in: [ownerId, readerId] } },
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { in: [ownerEmail, readerEmail] } },
    });
    await prisma.role.deleteMany({
      where: { id: { in: [roleId, readerRoleId] } },
    });
    await prisma.$disconnect();
    await app.close();
  });

  it('POST /notifications creates an unread notification for the recipient', async () => {
    const created = await createNotification();

    expect(created).toEqual({
      id: expect.any(Number) as unknown,
      type: 'TASK_ASSIGNED',
      message,
      userId: ownerId,
      taskId: null,
      readAt: null,
      createdAt: expect.any(String) as unknown,
    });
  });

  it('POST /notifications rejects an unknown recipient', async () => {
    const response = await request(app.getHttpServer())
      .post('/notifications')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ type: 'TASK_ASSIGNED', message, userId: 999999 });

    expect(response.status).toBe(400);
  });

  it('POST /notifications rejects an unknown type', async () => {
    const response = await request(app.getHttpServer())
      .post('/notifications')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ type: 'TASK_EXPLODED', message, userId: ownerId });

    expect(response.status).toBe(400);
  });

  it('POST /notifications is forbidden without notifications:create', async () => {
    const response = await request(app.getHttpServer())
      .post('/notifications')
      .set('Authorization', `Bearer ${readerToken}`)
      .send({ type: 'TASK_ASSIGNED', message, userId: readerId });

    expect(response.status).toBe(403);
  });

  it('GET /notifications returns only the caller’s own notifications', async () => {
    await createNotification(ownerId);
    await createNotification(readerId);

    const response = await request(app.getHttpServer())
      .get('/notifications')
      .set('Authorization', `Bearer ${accessToken}`);

    const page = unwrap<PaginatedResult<NotificationEntity>>(response);

    expect(response.status).toBe(200);
    expect(page.meta.total).toBe(1);
    expect(page.data.map((item) => item.userId)).toEqual([ownerId]);
  });

  it('GET /notifications?read=false keeps the unread ones', async () => {
    const read = await createNotification();
    await createNotification();

    await request(app.getHttpServer())
      .patch(`/notifications/${read.id}/read`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const response = await request(app.getHttpServer())
      .get('/notifications?read=false')
      .set('Authorization', `Bearer ${accessToken}`);

    const page = unwrap<PaginatedResult<NotificationEntity>>(response);

    expect(response.status).toBe(200);
    expect(page.data).toHaveLength(1);
    expect(page.data[0].id).not.toBe(read.id);
  });

  it('GET /notifications rejects a non-boolean read filter', async () => {
    const response = await request(app.getHttpServer())
      .get('/notifications?read=yes')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(400);
  });

  it('PATCH /notifications/:id/read stamps the read time', async () => {
    const created = await createNotification();

    const response = await request(app.getHttpServer())
      .patch(`/notifications/${created.id}/read`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(unwrap<NotificationEntity>(response).readAt).not.toBeNull();
  });

  it('PATCH /notifications/:id/read keeps the first read time', async () => {
    const created = await createNotification();

    const first = await request(app.getHttpServer())
      .patch(`/notifications/${created.id}/read`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const second = await request(app.getHttpServer())
      .patch(`/notifications/${created.id}/read`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(second.status).toBe(200);
    expect(unwrap<NotificationEntity>(second).readAt).toBe(
      unwrap<NotificationEntity>(first).readAt,
    );
  });

  it('PATCH /notifications/:id/read hides somebody else’s notification', async () => {
    const created = await createNotification(ownerId);

    const response = await request(app.getHttpServer())
      .patch(`/notifications/${created.id}/read`)
      .set('Authorization', `Bearer ${readerToken}`);

    expect(response.status).toBe(404);
  });

  it('GET /notifications rejects an anonymous caller', async () => {
    const response = await request(app.getHttpServer()).get('/notifications');

    expect(response.status).toBe(401);
  });
});
