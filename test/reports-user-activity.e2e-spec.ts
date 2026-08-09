import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { AuditAction } from './../generated/prisma/client';
import { UserActivityEntity } from './../src/modules/reports/entities/user-activity.entity';
import { PrismaService } from './../src/prisma/prisma.service';

/** Unwraps the envelope added by the global `TransformInterceptor`. */
const unwrap = <T>(response: { body: unknown }): T =>
  (response.body as { data: T }).data;

const january = new Date('2026-01-10T00:00:00.000Z');
const february = new Date('2026-02-10T00:00:00.000Z');

describe('UserActivityController (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let roleId: number;
  let plainRoleId: number;
  let analystToken: string;
  let plainToken: string;
  let subjectId: number;
  let otherId: number;

  const password = 'S3cretPassw0rd';
  const analystEmail = 'e2e.activity.analyst@example.com';
  const plainEmail = 'e2e.activity.plain@example.com';
  const subjectEmail = 'e2e.activity.subject@example.com';
  const otherEmail = 'e2e.activity.other@example.com';
  const emails = [analystEmail, plainEmail, subjectEmail, otherEmail];

  const createUser = async (email: string, role: number): Promise<number> => {
    const response = await request(app.getHttpServer())
      .post('/users')
      .send({
        email,
        password,
        firstName: 'Activity',
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

  const seedActivity = async (
    userId: number,
    rows: { action: AuditAction; entityType: string; createdAt: Date }[],
  ): Promise<void> => {
    await prisma.auditLog.createMany({
      data: rows.map((row) => ({ ...row, userId })),
    });
  };

  const activityOf = async (
    token: string,
    userId: number | string,
    queryString = '',
  ) =>
    request(app.getHttpServer())
      .get(`/reports/users/${userId}/activity${queryString}`)
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

    const role = await prisma.role.upsert({
      where: { name: 'e2e-activity-role' },
      create: { name: 'e2e-activity-role' },
      update: {},
    });
    roleId = role.id;

    await prisma.role.update({
      where: { id: roleId },
      data: {
        permissions: {
          connectOrCreate: ['reports:read'].map((name) => ({
            where: { name },
            create: { name },
          })),
        },
      },
    });

    // Mirrors the default `user` role, which deliberately has no reports:read.
    const plainRole = await prisma.role.upsert({
      where: { name: 'e2e-activity-plain-role' },
      create: { name: 'e2e-activity-plain-role' },
      update: {},
    });
    plainRoleId = plainRole.id;

    await prisma.role.update({
      where: { id: plainRoleId },
      data: {
        permissions: {
          connectOrCreate: ['users:read'].map((name) => ({
            where: { name },
            create: { name },
          })),
        },
      },
    });

    await prisma.user.deleteMany({ where: { email: { in: emails } } });

    await createUser(analystEmail, roleId);
    await createUser(plainEmail, plainRoleId);
    subjectId = await createUser(subjectEmail, plainRoleId);
    otherId = await createUser(otherEmail, plainRoleId);

    analystToken = await login(analystEmail);
    plainToken = await login(plainEmail);
  });

  beforeEach(async () => {
    await prisma.auditLog.deleteMany({
      where: { userId: { in: [subjectId, otherId] } },
    });
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany({
      where: { userId: { in: [subjectId, otherId] } },
    });
    await prisma.user.deleteMany({ where: { email: { in: emails } } });
    await prisma.role.deleteMany({
      where: { id: { in: [roleId, plainRoleId] } },
    });
    await prisma.$disconnect();
    await app.close();
  });

  it('GET activity counts the audited actions, zero-filling the rest', async () => {
    await seedActivity(subjectId, [
      { action: AuditAction.CREATE, entityType: 'Tasks', createdAt: january },
      { action: AuditAction.CREATE, entityType: 'Tasks', createdAt: february },
      {
        action: AuditAction.UPDATE,
        entityType: 'Projects',
        createdAt: february,
      },
    ]);

    const response = await activityOf(analystToken, subjectId);
    const activity = unwrap<UserActivityEntity>(response);

    expect(response.status).toBe(200);
    expect(activity.totalActions).toBe(3);
    expect(activity.byAction).toEqual({ CREATE: 2, UPDATE: 1, DELETE: 0 });
  });

  it('GET activity orders the entity types by volume', async () => {
    await seedActivity(subjectId, [
      {
        action: AuditAction.CREATE,
        entityType: 'Projects',
        createdAt: january,
      },
      { action: AuditAction.CREATE, entityType: 'Tasks', createdAt: january },
      { action: AuditAction.UPDATE, entityType: 'Tasks', createdAt: january },
    ]);

    const response = await activityOf(analystToken, subjectId);

    expect(response.status).toBe(200);
    expect(unwrap<UserActivityEntity>(response).byEntityType).toEqual([
      { entityType: 'Tasks', count: 2 },
      { entityType: 'Projects', count: 1 },
    ]);
  });

  it('GET activity narrows to the requested window and echoes it back', async () => {
    await seedActivity(subjectId, [
      { action: AuditAction.CREATE, entityType: 'Tasks', createdAt: january },
      { action: AuditAction.DELETE, entityType: 'Tasks', createdAt: february },
    ]);

    const response = await activityOf(
      analystToken,
      subjectId,
      '?from=2026-02-01T00:00:00.000Z',
    );
    const activity = unwrap<UserActivityEntity>(response);

    expect(response.status).toBe(200);
    expect(activity.totalActions).toBe(1);
    expect(activity.byAction).toEqual({ CREATE: 0, UPDATE: 0, DELETE: 1 });
    expect(activity.from).toBe('2026-02-01T00:00:00.000Z');
  });

  it('GET activity bounds the window on both sides inclusively', async () => {
    await seedActivity(subjectId, [
      { action: AuditAction.CREATE, entityType: 'Tasks', createdAt: january },
      { action: AuditAction.CREATE, entityType: 'Tasks', createdAt: february },
    ]);

    const response = await activityOf(
      analystToken,
      subjectId,
      '?from=2026-01-01T00:00:00.000Z&to=2026-01-10T00:00:00.000Z',
    );

    expect(response.status).toBe(200);
    expect(unwrap<UserActivityEntity>(response).totalActions).toBe(1);
  });

  it('GET activity reports an unbounded window as nulls', async () => {
    const response = await activityOf(analystToken, subjectId);
    const activity = unwrap<UserActivityEntity>(response);

    expect(response.status).toBe(200);
    expect(activity.from).toBeNull();
    expect(activity.to).toBeNull();
  });

  it('GET activity reports a silent user as all zeroes', async () => {
    const response = await activityOf(analystToken, subjectId);

    expect(response.status).toBe(200);
    expect(unwrap<UserActivityEntity>(response)).toEqual({
      userId: subjectId,
      from: null,
      to: null,
      totalActions: 0,
      byAction: { CREATE: 0, UPDATE: 0, DELETE: 0 },
      byEntityType: [],
    });
  });

  it('GET activity counts only the subject’s own rows', async () => {
    await seedActivity(otherId, [
      { action: AuditAction.DELETE, entityType: 'Tasks', createdAt: january },
    ]);

    const response = await activityOf(analystToken, subjectId);

    expect(response.status).toBe(200);
    expect(unwrap<UserActivityEntity>(response).totalActions).toBe(0);
  });

  it('GET activity rejects an inverted window', async () => {
    const response = await activityOf(
      analystToken,
      subjectId,
      '?from=2026-02-01T00:00:00.000Z&to=2026-01-01T00:00:00.000Z',
    );

    expect(response.status).toBe(400);
  });

  it('GET activity rejects a window bound that is not a date', async () => {
    const response = await activityOf(
      analystToken,
      subjectId,
      '?from=recently',
    );

    expect(response.status).toBe(400);
  });

  it('GET activity rejects a non-numeric user id', async () => {
    const response = await activityOf(analystToken, 'me');

    expect(response.status).toBe(400);
  });

  it('GET activity 404s on an unknown user rather than reporting zeroes', async () => {
    const response = await activityOf(analystToken, 999999);

    expect(response.status).toBe(404);
  });

  it('GET activity is forbidden without reports:read', async () => {
    const response = await activityOf(plainToken, subjectId);

    expect(response.status).toBe(403);
  });

  it('GET activity rejects an anonymous caller', async () => {
    const response = await request(app.getHttpServer()).get(
      `/reports/users/${subjectId}/activity`,
    );

    expect(response.status).toBe(401);
  });
});
