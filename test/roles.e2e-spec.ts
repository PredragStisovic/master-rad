import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { PaginatedResult } from './../src/common/dto/pagination.dto';
import { AppModule } from './../src/app.module';
import { RoleEntity } from './../src/modules/roles/entities/role.entity';
import { PrismaService } from './../src/prisma/prisma.service';

/** Unwraps the envelope added by the global `TransformInterceptor`. */
const unwrap = <T>(response: { body: unknown }): T =>
  (response.body as { data: T }).data;

describe('RolesController (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let adminRoleId: number;
  let accessToken: string;

  const adminEmail = 'e2e.roles.admin@example.com';
  const adminPassword = 'S3cretPassw0rd';

  const payload = { name: 'e2e-managed-role' };

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

    const adminRole = await prisma.role.upsert({
      where: { name: 'e2e-roles-admin' },
      create: { name: 'e2e-roles-admin' },
      update: {},
    });
    adminRoleId = adminRole.id;

    await prisma.role.update({
      where: { id: adminRoleId },
      data: {
        permissions: {
          connectOrCreate: [
            'roles:create',
            'roles:read',
            'roles:update',
            'roles:delete',
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
        roleId: adminRoleId,
      })
      .expect(201);

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: adminEmail, password: adminPassword })
      .expect(201);

    accessToken = unwrap<{ access_token: string }>(loginResponse).access_token;
  });

  beforeEach(async () => {
    await prisma.role.deleteMany({ where: { name: payload.name } });
  });

  afterAll(async () => {
    await prisma.role.deleteMany({ where: { name: payload.name } });
    await prisma.user.deleteMany({ where: { email: adminEmail } });
    await prisma.role.deleteMany({ where: { id: adminRoleId } });
    await prisma.$disconnect();
    await app.close();
  });

  const createRole = async (): Promise<RoleEntity> => {
    const response = await request(app.getHttpServer())
      .post('/roles')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(payload)
      .expect(201);

    return unwrap<RoleEntity>(response);
  };

  it('POST /roles creates a role', async () => {
    await expect(createRole()).resolves.toEqual({
      id: expect.any(Number) as unknown,
      name: payload.name,
    });
  });

  it('POST /roles rejects an anonymous request', () => {
    return request(app.getHttpServer())
      .post('/roles')
      .send(payload)
      .expect(401);
  });

  it('POST /roles rejects an invalid payload', () => {
    return request(app.getHttpServer())
      .post('/roles')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: '' })
      .expect(400);
  });

  it('POST /roles rejects a duplicate name', async () => {
    await createRole();

    return request(app.getHttpServer())
      .post('/roles')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(payload)
      .expect(409);
  });

  it('GET /roles returns a paginated list', async () => {
    await createRole();

    const response = await request(app.getHttpServer())
      .get('/roles')
      .set('Authorization', `Bearer ${accessToken}`)
      .query({ page: 1, limit: 10, search: payload.name })
      .expect(200);

    const page = unwrap<PaginatedResult<RoleEntity>>(response);

    expect(page.data).toHaveLength(1);
    expect(page.meta).toEqual({ total: 1, page: 1, limit: 10, totalPages: 1 });
  });

  it('GET /roles/:id returns the role', async () => {
    const created = await createRole();

    const response = await request(app.getHttpServer())
      .get(`/roles/${created.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(unwrap<RoleEntity>(response).name).toBe(payload.name);
  });

  it('GET /roles/:id returns 404 for an unknown role', () => {
    return request(app.getHttpServer())
      .get('/roles/0')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(404);
  });

  it('PATCH /roles/:id updates the role', async () => {
    const created = await createRole();

    const response = await request(app.getHttpServer())
      .patch(`/roles/${created.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: payload.name })
      .expect(200);

    expect(unwrap<RoleEntity>(response).name).toBe(payload.name);
  });

  it('DELETE /roles/:id removes an unassigned role', async () => {
    const created = await createRole();

    await request(app.getHttpServer())
      .delete(`/roles/${created.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    return request(app.getHttpServer())
      .get(`/roles/${created.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(404);
  });

  it('DELETE /roles/:id refuses a role that is still assigned', () => {
    return request(app.getHttpServer())
      .delete(`/roles/${adminRoleId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(409);
  });
});
