import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { PaginatedResult } from './../src/common/dto/pagination.dto';
import { AppModule } from './../src/app.module';
import { UserEntity } from './../src/modules/users/entities/user.entity';
import { PrismaService } from './../src/prisma/prisma.service';

/** Unwraps the envelope added by the global `TransformInterceptor`. */
const unwrap = <T>(response: { body: unknown }): T =>
  (response.body as { data: T }).data;

describe('UsersController (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let roleId: number;
  let accessToken: string;

  const adminEmail = 'e2e.admin@example.com';
  const adminPassword = 'S3cretPassw0rd';

  const payload = {
    email: 'e2e.user@example.com',
    password: 'S3cretPassw0rd',
    firstName: 'E2e',
    lastName: 'User',
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
      where: { name: 'e2e-role' },
      create: { name: 'e2e-role' },
      update: {},
    });
    roleId = role.id;

    await prisma.user.deleteMany({ where: { email: adminEmail } });
    await request(app.getHttpServer())
      .post('/users')
      .send({ email: adminEmail, password: adminPassword, firstName: 'Admin', lastName: 'E2e', roleId })
      .expect(201);

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: adminEmail, password: adminPassword })
      .expect(201);

    accessToken = (loginResponse.body as { access_token: string }).access_token;
  });

  beforeEach(async () => {
    await prisma.user.deleteMany({ where: { email: payload.email } });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: payload.email } });
    await prisma.user.deleteMany({ where: { email: adminEmail } });
    await prisma.role.deleteMany({ where: { id: roleId } });
    await prisma.$disconnect();
    await app.close();
  });

  const createUser = async (): Promise<UserEntity> => {
    const response = await request(app.getHttpServer())
      .post('/users')
      .send({ ...payload, roleId })
      .expect(201);

    return unwrap<UserEntity>(response);
  };

  it('POST /users creates a user without leaking the password', async () => {
    const created = await createUser();

    expect(created).toEqual({
      id: expect.any(Number) as unknown,
      email: payload.email,
      firstName: payload.firstName,
      lastName: payload.lastName,
      roleId,
    });
  });

  it('POST /users rejects an invalid payload', () => {
    return request(app.getHttpServer())
      .post('/users')
      .send({ email: 'not-an-email', password: 'short' })
      .expect(400);
  });

  it('POST /users rejects an unknown role', () => {
    return request(app.getHttpServer())
      .post('/users')
      .send({ ...payload, roleId: 0 })
      .expect(400);
  });

  it('POST /users rejects a duplicate email', async () => {
    await createUser();

    return request(app.getHttpServer())
      .post('/users')
      .send({ ...payload, roleId })
      .expect(409);
  });

  it('GET /users returns a paginated list', async () => {
    await createUser();

    const response = await request(app.getHttpServer())
      .get('/users')
      .set('Authorization', `Bearer ${accessToken}`)
      .query({ page: 1, limit: 10, search: payload.email })
      .expect(200);

    const page = unwrap<PaginatedResult<UserEntity>>(response);

    expect(page.data).toHaveLength(1);
    expect(page.meta).toEqual({
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
    });
  });

  it('GET /users/:id returns the user', async () => {
    const created = await createUser();

    const response = await request(app.getHttpServer())
      .get(`/users/${created.id}`)
      .expect(200);

    expect(unwrap<UserEntity>(response).email).toBe(payload.email);
  });

  it('GET /users/:id returns 404 for an unknown user', () => {
    return request(app.getHttpServer()).get('/users/0').expect(404);
  });

  it('PATCH /users/:id updates the user', async () => {
    const created = await createUser();

    const response = await request(app.getHttpServer())
      .patch(`/users/${created.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ firstName: 'Updated' })
      .expect(200);

    expect(unwrap<UserEntity>(response).firstName).toBe('Updated');
  });

  it('DELETE /users/:id removes the user', async () => {
    const created = await createUser();

    await request(app.getHttpServer())
      .delete(`/users/${created.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    return request(app.getHttpServer()).get(`/users/${created.id}`).expect(404);
  });
});
