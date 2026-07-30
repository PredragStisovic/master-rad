import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { UserEntity } from './../src/modules/users/entities/user.entity';
import { PrismaService } from './../src/prisma/prisma.service';

/** Unwraps the envelope added by the global `TransformInterceptor`. */
const unwrap = <T>(response: { body: unknown }): T =>
  (response.body as { data: T }).data;

describe('AuthController /auth/me (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let roleId: number;
  let accessToken: string;

  const payload = {
    email: 'e2e.me@example.com',
    password: 'S3cretPassw0rd',
    firstName: 'E2e',
    lastName: 'Me',
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
      where: { name: 'e2e-me-role' },
      create: { name: 'e2e-me-role' },
      update: {},
    });
    roleId = role.id;

    await prisma.user.deleteMany({ where: { email: payload.email } });
    await request(app.getHttpServer())
      .post('/users')
      .send({ ...payload, roleId })
      .expect(201);

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: payload.email, password: payload.password })
      .expect(201);

    accessToken = unwrap<{ access_token: string }>(loginResponse).access_token;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: payload.email } });
    await prisma.role.deleteMany({ where: { id: roleId } });
    await prisma.$disconnect();
    await app.close();
  });

  it('GET /auth/me returns the authenticated user', async () => {
    const response = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(unwrap<UserEntity>(response)).toEqual({
      id: expect.any(Number) as unknown,
      email: payload.email,
      firstName: payload.firstName,
      lastName: payload.lastName,
      roleId,
    });
  });

  it('GET /auth/me rejects a request without a token', () => {
    return request(app.getHttpServer()).get('/auth/me').expect(401);
  });

  it('GET /auth/me rejects an invalid token', () => {
    return request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', 'Bearer not-a-jwt')
      .expect(401);
  });
});
